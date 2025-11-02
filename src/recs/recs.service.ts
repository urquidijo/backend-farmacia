import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

type RecItem = { productoId: number; reason: string; score?: number };

@Injectable()
export class RecsService {
  constructor(private prisma: PrismaService) {}

  // Estados válidos para considerar una compra efectiva
  private readonly VALID_ORDER_STATES = [
    'PAGADA',
    'ENVIADA',
    'ENTREGADA',
  ] as const;

  /** Utilidad: fecha desde N días atrás */
  private fromDaysAgo(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }

  /** ====== 1) TOP CATEGORÍAS DEL USUARIO ====== */
  async getUserTopCategories(userId: number, days = 180, limit = 5) {
    const desde = this.fromDaysAgo(days);

    const rows = await this.prisma.$queryRaw<
      { categoriaId: number; compras: number }[]
    >`
      SELECT p."categoriaId", SUM(oi."cantidad") AS compras
      FROM "OrdenItem" oi
      JOIN "Orden" o ON o.id = oi."ordenId"
      LEFT JOIN "Pago" pg ON pg."ordenId" = o.id
      JOIN "Producto" p ON p.id = oi."productoId"
      WHERE o."userId" = ${userId}
        AND (
          o."estado" = ANY(ARRAY['PAGADA'::"EstadoOrden",'ENVIADA'::"EstadoOrden",'ENTREGADA'::"EstadoOrden"])
          OR pg.id IS NOT NULL
        )
        AND COALESCE(pg."createdAt", o."updatedAt", o."createdAt") >= ${desde}
      GROUP BY p."categoriaId"
      ORDER BY compras DESC
      LIMIT ${limit};
    `;

    return rows.map((r) => r.categoriaId);
  }

  /** ====== 2) TOP CATEGORÍAS GLOBALES ====== */
  async getGlobalTopCategories(days = 180, limit = 5) {
    const desde = this.fromDaysAgo(days);

    const rows = await this.prisma.$queryRaw<
      { categoriaId: number; compras: number }[]
    >`
      SELECT p."categoriaId", SUM(oi."cantidad") AS compras
      FROM "OrdenItem" oi
      JOIN "Orden" o ON o.id = oi."ordenId"
      LEFT JOIN "Pago" pg ON pg."ordenId" = o.id
      JOIN "Producto" p ON p.id = oi."productoId"
      WHERE (
        o."estado" = ANY(ARRAY['PAGADA'::"EstadoOrden",'ENVIADA'::"EstadoOrden",'ENTREGADA'::"EstadoOrden"])
        OR pg.id IS NOT NULL
      )
      AND COALESCE(pg."createdAt", o."updatedAt", o."createdAt") >= ${desde}
      GROUP BY p."categoriaId"
      ORDER BY compras DESC
      LIMIT ${limit};
    `;
    return rows.map((r) => r.categoriaId);
  }

  /** ====== 3) TOP PRODUCTOS EN CATEGORÍAS (con score y bonus de marca) ====== */
  async getTopProductsInCategories(
    categoriaIds: number[],
    options?: {
      days?: number;
      takePerCat?: number;
      exclude?: number[];
      preferBrandsOf?: number[];
      ignoreWindow?: boolean;
      allowNoSalesFallback?: boolean;
    },
  ) {
    if (!categoriaIds.length) return [];

    const days = options?.days ?? 180;
    const takePerCat = options?.takePerCat ?? 8;
    const exclude = new Set(options?.exclude ?? []);
    const desde = this.fromDaysAgo(days);

    // marcas preferidas para dar bonus
    let preferredBrandIds: number[] = [];
    if (options?.preferBrandsOf?.length) {
      const brands = await this.prisma.producto.findMany({
        where: { id: { in: options.preferBrandsOf } },
        select: { marcaId: true },
      });
      preferredBrandIds = [...new Set(brands.map((b) => b.marcaId))];
    }

    const results: RecItem[] = [];

    for (const catId of categoriaIds) {
      // —— fragmento condicional de ventana de tiempo ——
      const windowFilter = options?.ignoreWindow
        ? Prisma.sql`` // vacío
        : Prisma.sql`AND COALESCE(pg."createdAt", o."updatedAt", o."createdAt") >= ${desde}`;

      const rows = await this.prisma.$queryRaw<
        { productoId: number; ventas: number; marcaId: number }[]
      >(Prisma.sql`
        SELECT p.id AS "productoId",
               COALESCE(SUM(oi."cantidad"), 0) AS ventas,
               p."marcaId" AS "marcaId"
        FROM "Producto" p
        LEFT JOIN "OrdenItem" oi ON oi."productoId" = p.id
        LEFT JOIN "Orden" o ON o.id = oi."ordenId"
        LEFT JOIN "Pago" pg ON pg."ordenId" = o.id
        WHERE p."categoriaId" = ${catId}
          AND p."activo" = true
          AND p."stockActual" > 0
          AND (
            oi.id IS NULL
            OR (
              (
                o."estado" = ANY(ARRAY['PAGADA'::"EstadoOrden",'ENVIADA'::"EstadoOrden",'ENTREGADA'::"EstadoOrden"])
                OR pg.id IS NOT NULL
              )
              ${windowFilter}
            )
          )
        GROUP BY p.id, p."marcaId"
        ORDER BY ventas DESC
        LIMIT ${takePerCat * 2};
      `);

      let scored = rows
        .filter((r) => !exclude.has(r.productoId))
        .map((r) => {
          let score = Number(r.ventas) || 0;
          if (preferredBrandIds.includes(r.marcaId)) score += 0.5;
          return { productoId: r.productoId, reason: 'categoria_top', score };
        });

      if (!scored.length && options?.allowNoSalesFallback) {
        const fallback = await this.prisma.producto.findMany({
          where: { categoriaId: catId, activo: true, stockActual: { gt: 0 } },
          orderBy: { actualizadoEn: 'desc' },
          take: takePerCat * 2,
          select: { id: true, marcaId: true },
        });
        scored = fallback
          .filter((p) => !exclude.has(p.id))
          .map((p) => ({
            productoId: p.id,
            reason: 'categoria_reciente',
            score: preferredBrandIds.includes(p.marcaId) ? 0.5 : 0,
          }));
      }

      scored = scored
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, takePerCat);

      results.push(...scored);
    }

    const map = new Map<number, RecItem>();
    for (const r of results) {
      const prev = map.get(r.productoId);
      if (!prev || (r.score ?? 0) > (prev.score ?? 0)) map.set(r.productoId, r);
    }
    return [...map.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  // === NEW === Cuenta compras efectivas del usuario (ventana configurable)
  private async countUserEffectivePurchases(userId: number, days = 365) {
    const desde = this.fromDaysAgo(days);
    const rows = await this.prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*)::bigint AS cnt
      FROM "Orden" o
      LEFT JOIN "Pago" pg ON pg."ordenId" = o.id
      WHERE o."userId" = ${userId}
        AND (
          o."estado" = ANY(ARRAY['PAGADA'::"EstadoOrden",'ENVIADA'::"EstadoOrden",'ENTREGADA'::"EstadoOrden"])
          OR pg.id IS NOT NULL
        )
        AND COALESCE(pg."createdAt", o."updatedAt", o."createdAt") >= ${desde};
    `;
    return Number(rows[0]?.cnt ?? 0);
  }

  // === NEW === Top productos globales (recientes) con opción de excluir Rx
  async getGlobalTopProducts(options?: {
    days?: number;
    limit?: number;
    excludeRx?: boolean;
  }) {
    const days = options?.days ?? 30;
    const limit = options?.limit ?? 5;
    const desde = this.fromDaysAgo(days);

    const extraWhere = options?.excludeRx
      ? Prisma.sql`AND p."requiereReceta" = false`
      : Prisma.sql``;

    const rows = await this.prisma.$queryRaw<
      { productoId: number; ventas: number }[]
    >(Prisma.sql`
      SELECT p.id AS "productoId",
             COALESCE(SUM(oi."cantidad"), 0) AS ventas
      FROM "Producto" p
      LEFT JOIN "OrdenItem" oi ON oi."productoId" = p.id
      LEFT JOIN "Orden" o ON o.id = oi."ordenId"
      LEFT JOIN "Pago" pg ON pg."ordenId" = o.id
      WHERE p."activo" = true
        AND p."stockActual" > 0
        ${extraWhere}
        AND (
          oi.id IS NULL
          OR (
            (
              o."estado" = ANY(ARRAY['PAGADA'::"EstadoOrden",'ENVIADA'::"EstadoOrden",'ENTREGADA'::"EstadoOrden"])
              OR pg.id IS NOT NULL
            )
            AND COALESCE(pg."createdAt", o."updatedAt", o."createdAt") >= ${desde}
          )
        )
      GROUP BY p.id
      ORDER BY ventas DESC, p."actualizadoEn" DESC
      LIMIT ${limit};
    `);

    return rows.map(r => ({ productoId: r.productoId, reason: 'top_global', score: Number(r.ventas) || 0 }));
  }

  // === NEW === Barajado estable con semilla (para no verse “fijo”)
  private seededShuffle<T>(arr: T[], seed: number) {
    const a = arr.slice();
    let s = seed || 1;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) % 0xffffffff;
      const j = s % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** ====== 4) RECOMENDACIONES PARA HOME (con fallbacks escalonados) ====== */
  // === CHANGED === ahora soporta cold-start y límites diferenciados
  async recsForHome(userId?: number, opts?: { fullLimit?: number; coldLimit?: number }) {
    const fullLimit = opts?.fullLimit ?? 20;  // cuando ya hay señales
    const coldLimit = opts?.coldLimit ?? 5;   // MUY poco para que no “parezca fake”
    const windowDays = 180;

    // visitante anónimo => top global reducido
    if (!userId) {
      const globals = await this.getGlobalTopProducts({ days: 30, limit: coldLimit, excludeRx: true });
      return globals;
    }

    // cold-start si no tiene compras efectivas
    const purchases = await this.countUserEffectivePurchases(userId, 365);
    const isColdStart = purchases < 1;

    if (isColdStart) {
      const globals = await this.getGlobalTopProducts({ days: 30, limit: coldLimit, excludeRx: true });
      return this.seededShuffle(globals, userId).slice(0, coldLimit);
    }

    // === Ya hay señales -> usar pipeline completo
    const userCats = await this.getUserTopCategories(userId, windowDays);
    const preferBrandsOf = await this.prisma.ordenItem
      .findMany({
        where: {
          orden: { userId, estado: { in: this.VALID_ORDER_STATES as any } },
        },
        orderBy: { orden: { createdAt: 'desc' } },
        take: 12,
        select: { productoId: true },
      })
      .then((r) => r.map((x) => x.productoId));

    const primaryCats = userCats.length
      ? userCats
      : await this.getGlobalTopCategories(windowDays);

    // intento 1: con ventana y ventas recientes
    let items = await this.getTopProductsInCategories(primaryCats, {
      days: windowDays,
      takePerCat: Math.ceil(fullLimit / Math.max(1, primaryCats.length)),
      preferBrandsOf,
    });

    // intento 2: sin ventana temporal (ventas históricas)
    if (!items.length) {
      items = await this.getTopProductsInCategories(primaryCats, {
        takePerCat: Math.ceil(fullLimit / Math.max(1, primaryCats.length)),
        preferBrandsOf,
        ignoreWindow: true,
      });
    }

    // intento 3: por actualización reciente (sin ventas)
    if (!items.length) {
      items = await this.getTopProductsInCategories(primaryCats, {
        takePerCat: Math.ceil(fullLimit / Math.max(1, primaryCats.length)),
        allowNoSalesFallback: true,
        preferBrandsOf,
      });
    }

    // intento 4: categorías globales (si veníamos del user) + fallback
    if (!items.length && userCats.length) {
      const globalCats = await this.getGlobalTopCategories(windowDays);
      items = await this.getTopProductsInCategories(globalCats, {
        takePerCat: Math.ceil(fullLimit / Math.max(1, globalCats.length)),
        preferBrandsOf: [],
        allowNoSalesFallback: true,
      });
    }

    // Barajado leve del “tail” para no verse idéntico siempre
    const head = items.slice(0, 6);
    const tail = items.slice(6);
    const shuffledTail = this.seededShuffle(tail, userId);
    return [...head, ...shuffledTail].slice(0, fullLimit);
  }

  /** ====== 5) SIMILARES POR PRODUCTO ====== */
  async recsForProduct(productoId: number, take = 12) {
    const base = await this.prisma.producto.findUnique({
      where: { id: productoId },
      select: { categoriaId: true, marcaId: true },
    });
    if (!base) return [];

    const items = await this.getTopProductsInCategories([base.categoriaId], {
      takePerCat: take * 2,
      exclude: [productoId],
      preferBrandsOf: [productoId],
      allowNoSalesFallback: true,
    });

    // Prioriza misma marca
    const withBrand = await Promise.all(
      items.map(async (it) => {
        const p = await this.prisma.producto.findUnique({
          where: { id: it.productoId },
          select: { marcaId: true },
        });
        const sameBrand = p?.marcaId === base.marcaId ? 1 : 0;
        return {
          ...it,
          reason: sameBrand ? 'misma_marca' : 'misma_categoria',
          bonus: sameBrand,
        };
      }),
    );

    return withBrand
      .sort(
        (a, b) =>
          (b.bonus ?? 0) - (a.bonus ?? 0) || (b.score ?? 0) - (a.score ?? 0),
      )
      .slice(0, take)
      .map(({ bonus, ...rest }) => rest);
  }

  /** ====== 6) RECS PARA CARRITO ====== */
  async recsForCart(productIds: number[], take = 16) {
    if (!productIds?.length) return [];

    const bases = await this.prisma.producto.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoriaId: true },
    });
    const catIds = [...new Set(bases.map((b) => b.categoriaId))];

    let items = await this.getTopProductsInCategories(catIds, {
      takePerCat: Math.ceil(take / Math.max(1, catIds.length)),
      exclude: productIds,
      preferBrandsOf: productIds,
    });

    if (!items.length) {
      items = await this.getTopProductsInCategories(catIds, {
        takePerCat: Math.ceil(take / Math.max(1, catIds.length)),
        exclude: productIds,
        preferBrandsOf: productIds,
        allowNoSalesFallback: true,
      });
    }

    return items.slice(0, take);
  }

  // === NEW (Opcional) === “Trending” por delta 7d vs. 7d previos
  async getTrendingProducts(limit = 5) {
    const d7 = this.fromDaysAgo(7);
    const d14 = this.fromDaysAgo(14);

    const rows = await this.prisma.$queryRaw<
      { productoId: number; v7: number; vprev: number; delta: number }[]
    >`
      WITH v AS (
        SELECT p.id AS "productoId",
               SUM(CASE WHEN COALESCE(pg."createdAt", o."updatedAt", o."createdAt") >= ${d7} THEN oi."cantidad" ELSE 0 END) AS v7,
               SUM(CASE WHEN COALESCE(pg."createdAt", o."updatedAt", o."createdAt") >= ${d14}
                         AND COALESCE(pg."createdAt", o."updatedAt", o."createdAt") < ${d7} THEN oi."cantidad" ELSE 0 END) AS vprev
        FROM "Producto" p
        LEFT JOIN "OrdenItem" oi ON oi."productoId" = p.id
        LEFT JOIN "Orden" o ON o.id = oi."ordenId"
        LEFT JOIN "Pago" pg ON pg."ordenId" = o.id
        WHERE p."activo" = true AND p."stockActual" > 0
          AND (
            oi.id IS NULL OR (
              o."estado" = ANY(ARRAY['PAGADA'::"EstadoOrden",'ENVIADA'::"EstadoOrden",'ENTREGADA'::"EstadoOrden"])
              OR pg.id IS NOT NULL
            )
          )
        GROUP BY p.id
      )
      SELECT "productoId", v7, vprev, (COALESCE(v7,0) - COALESCE(vprev,0))::numeric AS delta
      FROM v
      ORDER BY delta DESC, v7 DESC
      LIMIT ${limit};
    `;
    return rows.map(r => ({ productoId: r.productoId, reason: 'trending_7d', score: Number(r.delta) }));
  }
}
