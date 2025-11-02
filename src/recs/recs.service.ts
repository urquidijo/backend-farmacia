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

  /** ====== 4) RECOMENDACIONES PARA HOME (con fallbacks escalonados) ====== */
  async recsForHome(userId?: number) {
    const windowDays = 180;

    // 4.1) categorías del usuario o globales
    const userCats = userId
      ? await this.getUserTopCategories(userId, windowDays)
      : [];
    const preferBrandsOf = userId
      ? await this.prisma.ordenItem
          .findMany({
            where: {
              orden: { userId, estado: { in: this.VALID_ORDER_STATES as any } },
            },
            orderBy: { orden: { createdAt: 'desc' } },
            take: 12,
            select: { productoId: true },
          })
          .then((r) => r.map((x) => x.productoId))
      : [];

    const primaryCats = userCats.length
      ? userCats
      : await this.getGlobalTopCategories(windowDays);

    // 4.2) intento 1: con ventana y ventas recientes
    let items = await this.getTopProductsInCategories(primaryCats, {
      days: windowDays,
      takePerCat: 8,
      preferBrandsOf,
    });

    // 4.3) intento 2: sin ventana temporal (ventas históricas)
    if (!items.length) {
      items = await this.getTopProductsInCategories(primaryCats, {
        takePerCat: 8,
        preferBrandsOf,
        ignoreWindow: true,
      });
    }

    // 4.4) intento 3: por actualización reciente (sin ventas)
    if (!items.length) {
      items = await this.getTopProductsInCategories(primaryCats, {
        takePerCat: 8,
        allowNoSalesFallback: true,
        preferBrandsOf,
      });
    }

    // 4.5) intento 4: categorías globales (si veníamos del user) + fallback
    if (!items.length && userCats.length) {
      const globalCats = await this.getGlobalTopCategories(windowDays);
      items = await this.getTopProductsInCategories(globalCats, {
        takePerCat: 8,
        preferBrandsOf: [],
        allowNoSalesFallback: true,
      });
    }

    return items;
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
}
