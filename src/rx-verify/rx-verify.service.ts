import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { nanoid } from 'nanoid';

type RxCheckResult = {
  ok: boolean;
  matched: Array<{
    productoId: number;
    nombreDetectado: string;
    score: number;
  }>;
  missing: Array<{ productoId: number; productoNombre: string }>;
  ocr?: any;
};

type Ticket = {
  userId: number;
  ok: boolean;
  matched: RxCheckResult['matched'];
  missing: RxCheckResult['missing'];
  createdAt: number;
  expiresAt: number;
};

const RX_TICKETS = new Map<string, Ticket>();

@Injectable()
export class RxVerifyService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  // === sinónimos genérico ↔ marca (extiende según tu catálogo) ===
  private brandSynonyms: Record<string, string[]> = {
    diazepam: ['valium'],
    paracetamol: ['acetaminofen', 'tylenol', 'panadol'],
    ibuprofeno: ['advil', 'motrin'],
    amoxicilina: ['clamoxil', 'amoxil'],
    losartan: ['losartán', 'cozaar', 'losartan'], // normalizamos igual
  };

  constructor(
    private readonly cfg: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.cfg.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  // 1) Verificar si el carrito requiere receta
  async cartNeedsRx(userId: number): Promise<{ needsRx: boolean }> {
    const items = await this.prisma.carritoItem.findMany({
      where: { userId },
      include: { producto: true },
    });
    const needsRx = items.some((i) => i.producto.requiereReceta === true);
    return { needsRx };
  }

  // 2) Verificar receta contra el carrito actual
  async verifyPrescription(
    userId: number,
    imageBase64: string,
  ): Promise<{ verificationId: string } & RxCheckResult> {
    if (!imageBase64?.startsWith('data:image/')) {
      throw new BadRequestException('Imagen inválida');
    }

    const items = await this.prisma.carritoItem.findMany({
      where: { userId },
      include: { producto: true },
    });

    const rxItems = items.filter((i) => i.producto.requiereReceta === true);
    if (rxItems.length === 0) {
      const verificationId = this.issueTicket({
        userId,
        ok: true,
        matched: [],
        missing: [],
      });
      return { ok: true, matched: [], missing: [], verificationId };
    }

    // Prompt robusto para OCR estructurado (normaliza minúsculas y sin acentos)
    const prompt = `
Devuélveme SOLO este JSON (sin comentarios ni texto adicional). Normaliza a minúsculas y sin acentos.

{
  "medicamentos": [
    { "generico": "string?", "marca": "string?", "detectado": "string?", "fuerzaMg": number? }
  ],
  "ocr_text": "string?"
}

Reglas:
- Extrae tantos medicamentos como encuentres, uno por línea si aplica.
- Si no ves nada, devuelve {"medicamentos":[],"ocr_text":""}.
`.trim();

    const parts = [
      { text: prompt },
      {
        inline_data: {
          mime_type: this.mimeFromDataUrl(imageBase64),
          data: this.stripDataUrl(imageBase64),
        },
      } as any,
    ];

    const res = await this.model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const raw = res.response?.text?.() ?? '';

    // === Parseo robusto con fallback ===
    let ocrJson: any =
      this.safeParseJson(raw) ?? this.extractFirstJson(raw) ?? null;

    if (!ocrJson) {
      // fallback a texto crudo si no hay JSON válido
      ocrJson = { medicamentos: [], ocr_text: raw?.trim?.() ?? '' };
    }
    if (!Array.isArray(ocrJson.medicamentos)) ocrJson.medicamentos = [];
    if (typeof ocrJson.ocr_text !== 'string') ocrJson.ocr_text = '';

    const result = this.matchAgainstCart(
      ocrJson,
      rxItems.map((i) => i.producto),
    );
    const verificationId = this.issueTicket({ userId, ...result });

    return { ...result, ocr: ocrJson, verificationId };
  }

  // 3) Validar ticket en checkout
  requireApproved(userId: number, verificationId?: string) {
    if (!verificationId) throw new BadRequestException('Falta verificationId');
    const t = RX_TICKETS.get(verificationId);
    if (!t) throw new UnauthorizedException('verificationId inválido');
    if (t.userId !== userId)
      throw new UnauthorizedException('verificationId de otro usuario');
    if (Date.now() > t.expiresAt)
      throw new UnauthorizedException('verificationId expirado');
    if (!t.ok) throw new BadRequestException('Receta rechazada');
    return true;
  }

  // === helpers ===
  private issueTicket(data: {
    userId: number;
    ok: boolean;
    matched: Ticket['matched'];
    missing: Ticket['missing'];
  }): string {
    const id = nanoid(21);
    const now = Date.now();
    RX_TICKETS.set(id, {
      userId: data.userId,
      ok: data.ok,
      matched: data.matched,
      missing: data.missing,
      createdAt: now,
      expiresAt: now + 15 * 60 * 1000,
    });
    return id;
  }

  private stripDataUrl(dataUrl: string): string {
    return dataUrl.split(',')[1] ?? '';
  }

  private mimeFromDataUrl(dataUrl: string): string {
    const m = /^data:(.*?);base64,/.exec(dataUrl);
    return m?.[1] ?? 'image/png';
  }

  private normalize(s: string) {
    return (s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  // Quitamos formas farmacéuticas, unidades y TODOS los números,
  // para que el nombre del fármaco pese más que mg/cantidad.
  private stripNoise(s: string) {
    return s
      .replace(
        /\b(comprimidos?|tabletas?|caps?ulas?|jarabe|soluci[oó]n|gotas|ampollas?|viales?)\b/gi,
        ' ',
      )
      .replace(/\bmg\b|\bmcg\b|\bµg\b|\bml\b|\bgr?\b/gi, ' ')
      .replace(/x\s?\d+\b/gi, ' ')
      .replace(/\d+\s?(tabs?|comp|cap(s)?)/gi, ' ')
      .replace(/\b\d+(?:[.,]\d+)?\b/g, ' ') // ⬅️ quita números sueltos
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeDrug(s: string) {
    return this.normalize(this.stripNoise(s));
  }

  private parseStrengthMg(s: string): number | null {
    const m = s.match(/(\d+(?:[.,]\d+)?)\s*mg\b/i);
    return m ? Number(m[1].replace(',', '.')) : null;
  }

  private jaroWinkler(a: string, b: string): number {
    if (a === b) return 1;
    const m = (s: string) => s.length;
    const mt = Math.floor(Math.max(m(a), m(b)) / 2) - 1;
    const A = a.split(''),
      B = b.split('');
    const AM: boolean[] = Array(m(a)).fill(false);
    const BM: boolean[] = Array(m(b)).fill(false);
    let matches = 0,
      transpositions = 0;

    for (let i = 0; i < m(a); i++) {
      const start = Math.max(0, i - mt),
        end = Math.min(i + mt + 1, m(b));
      for (let j = start; j < end; j++) {
        if (BM[j]) continue;
        if (A[i] === B[j]) {
          AM[i] = true;
          BM[j] = true;
          matches++;
          break;
        }
      }
    }
    if (matches === 0) return 0;

    let k = 0;
    for (let i = 0; i < m(a); i++) {
      if (!AM[i]) continue;
      while (!BM[k]) k++;
      if (A[i] !== B[k]) transpositions++;
      k++;
    }
    const jaro =
      (matches / m(a) +
        matches / m(b) +
        (matches - transpositions / 2) / matches) /
      3;
    let l = 0;
    for (; l < Math.min(4, m(a), m(b)) && a[l] === b[l]; l++);
    return jaro + l * 0.1 * (1 - jaro);
  }

  private tokenSetRatio(a: string, b: string): number {
    const ta = Array.from(
      new Set(this.stripNoise(a).toLowerCase().split(/\s+/).filter(Boolean)),
    );
    const tb = Array.from(
      new Set(this.stripNoise(b).toLowerCase().split(/\s+/).filter(Boolean)),
    );
    const sa = ta.sort().join(' ');
    const sb = tb.sort().join(' ');
    const s1 = this.jaroWinkler(sa, sb);
    const s2 = this.jaroWinkler(a.toLowerCase(), b.toLowerCase());
    return Math.max(s1, s2);
  }

  // === Núcleo: misma molécula (genérico o sinónimo de marca) ===
  private sameMolecule(a: string, b: string): boolean {
    const na = this.normalizeDrug(a);
    const nb = this.normalizeDrug(b);

    // si alguno contiene claramente el otro (post-normalización), ya sirve
    if (na.includes(nb) || nb.includes(na)) return true;

    // busca por catálogo de genéricos y sinónimos
    for (const g of Object.keys(this.brandSynonyms)) {
      const gNorm = this.normalizeDrug(g);
      const syns = this.brandSynonyms[g].map((s) => this.normalizeDrug(s));
      const tokens = [gNorm, ...syns];

      const aHas = tokens.some((t) => na.includes(t));
      const bHas = tokens.some((t) => nb.includes(t));
      if (aHas && bHas) return true;
    }

    // Fallback muy conservador: intersección de tokens alfabéticos "largos" (>=5)
    const toks = (s: string) =>
      this.stripNoise(s)
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => /^[a-zñáéíóú]{5,}$/i.test(t));
    const A = new Set(toks(a).map((t) => this.normalizeDrug(t)));
    const B = new Set(toks(b).map((t) => this.normalizeDrug(t)));
    for (const t of A) if (B.has(t)) return true;

    return false;
  }

  private boostWithSynonyms(a: string, b: string): number {
    const na = this.normalizeDrug(a);
    const nb = this.normalizeDrug(b);
    const base = this.tokenSetRatio(na, nb);

    for (const g of Object.keys(this.brandSynonyms)) {
      const syns = this.brandSynonyms[g].map((s) => this.normalizeDrug(s));
      const gNorm = this.normalizeDrug(g);
      const hasG = na.includes(gNorm) || nb.includes(gNorm);
      const anySyn = syns.some((s) => na.includes(s) || nb.includes(s));
      if (hasG && anySyn) return Math.max(base, base + 0.06);
    }
    return base;
  }

  private matchAgainstCart(
    ocrJson: any,
    rxProducts: Array<{ id: number; nombre: string }>,
  ): RxCheckResult {
    const meds = Array.isArray(ocrJson?.medicamentos)
      ? ocrJson.medicamentos
      : [];
    const ocrText: string = String(ocrJson?.ocr_text ?? '');

    const candidates: { raw: string; fuerzaMg?: number | null }[] = [];

    // candidatos desde JSON del OCR
    for (const m of meds) {
      const raw = String(m?.detectado ?? m?.generico ?? m?.marca ?? '').trim();
      if (!raw) continue;
      candidates.push({
        raw,
        fuerzaMg:
          typeof m?.fuerzaMg === 'number'
            ? m.fuerzaMg
            : this.parseStrengthMg(raw),
      });
    }

    // fallback por líneas (si el JSON vino vacío)
    if (!candidates.length && ocrText) {
      const lines = ocrText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const ln of lines) {
        if (
          /\b(rx|prescription|receta)\b/i.test(ln) ||
          /\b([a-záéíóúñ]{5,})\b/i.test(ln)
        ) {
          candidates.push({
            raw: ln,
            fuerzaMg: this.parseStrengthMg(ln),
          });
        }
      }
    }

    const matched: RxCheckResult['matched'] = [];
    const missing: RxCheckResult['missing'] = [];

    // más estricto: queremos nombre por encima de mg
    const MATCH_THRESHOLD = 0.88;

    for (const p of rxProducts) {
      const pName = this.stripNoise(p.nombre);
      const productStrength = this.parseStrengthMg(p.nombre);

      let bestScore = 0;
      let bestLabel = '';

      // 1) Filtra candidatos que NO compartan molécula/marca
      const sameMolCandidates = candidates.filter((c) =>
        this.sameMolecule(c.raw, pName),
      );

      if (!sameMolCandidates.length) {
        // no hay ningún candidato con la misma molécula → missing directo
        missing.push({ productoId: p.id, productoNombre: p.nombre });
        continue;
      }

      // 2) Entre los que sí comparten molécula, aplica score borroso
      for (const c of sameMolCandidates) {
        let score = this.boostWithSynonyms(c.raw, pName);

        // fuerza (mg) pesa MUY poco y solo si ya hay misma molécula
        if (c.fuerzaMg && productStrength) {
          const diff = Math.abs(c.fuerzaMg - productStrength) / productStrength;
          if (diff <= 0.15) score += 0.03; // tolerancia ±15%, bonus pequeño
        }

        if (score > bestScore) {
          bestScore = score;
          bestLabel = c.raw;
        }
      }

      if (bestScore >= MATCH_THRESHOLD) {
        matched.push({
          productoId: p.id,
          nombreDetectado: bestLabel || p.nombre,
          score: Number(bestScore.toFixed(3)),
        });
      } else {
        missing.push({ productoId: p.id, productoNombre: p.nombre });
      }
    }

    const ok = missing.length === 0;
    return { ok, matched, missing };
  }

  // === parseo robusto de JSON ===
  private safeParseJson(raw: string): any | null {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private extractFirstJson(raw: string): any | null {
    // quita fences ```json ... ```
    const fenced = raw.replace(/```(?:json)?/gi, '```');
    const mFence = fenced.match(/```([\s\S]*?)```/);
    if (mFence) {
      const parsed = this.safeParseJson(mFence[1].trim());
      if (parsed) return parsed;
    }
    // busca primer bloque {...}
    const mObj = raw.match(/\{[\s\S]*\}$/m) || raw.match(/\{[\s\S]*?\}/m);
    if (mObj) {
      const parsed = this.safeParseJson(mObj[0]);
      if (parsed) return parsed;
    }
    return null;
  }
}
