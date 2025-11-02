import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { spawn } from 'node:child_process';
import * as zlib from 'node:zlib';
import { Readable } from 'node:stream';
import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { setTimeout as wait } from 'node:timers/promises';

type Format = 'sql' | 'dump';

type Tool = 'pg_dump' | 'pg_restore' | 'psql';

@Injectable()
export class BackupService {
  /* ===================== Helpers ===================== */

  /** Resuelve la DB URL (prioriza BACKUP_DATABASE_URL). Asegura sslmode=require. */
  private dbUrl(): string {
    const raw = process.env.BACKUP_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
    if (!raw) {
      throw new InternalServerErrorException('Falta BACKUP_DATABASE_URL o DATABASE_URL');
    }
    if (!/(\?|&)sslmode=/.test(raw)) {
      return raw + (raw.includes('?') ? '&' : '?') + 'sslmode=require';
    }
    return raw;
  }

  /** Permite configurar una ruta alternativa para binarios si lo deseas (PGCLIENT_BIN). */
  private resolveBin(tool: Tool): string {
    const base = process.env.PGCLIENT_BIN?.replace(/\/+$/, '') || '';
    return base ? `${base}/${tool}` : tool;
  }

  /** Verifica que el binario exista/sea ejecutable. */
  private async ensureTool(tool: Tool) {
    const bin = this.resolveBin(tool);
    // Si es un nombre simple (ej. "pg_dump"), confiamos en el PATH. Si es ruta, validamos acceso.
    if (bin.includes('/') || bin.includes('\\')) {
      try {
        await access(bin, fsConstants.X_OK);
      } catch {
        throw new ServiceUnavailableException(
          `No se encontró ${tool} en ${bin}. Instala "postgresql-client" o configura PGCLIENT_BIN.`
        );
      }
    }
    return bin;
  }

  /** Ejecuta un proceso con timeout y captura de errores. */
  private runWithTimeout(
    bin: string,
    args: string[],
    options: { env?: NodeJS.ProcessEnv; timeoutMs?: number; stdinBuffer?: Buffer | Readable }
  ) {
    const { env = process.env, timeoutMs = 10 * 60 * 1000, stdinBuffer } = options || {};
    const child = spawn(bin, args, { env });

    const errs: Buffer[] = [];
    child.stderr.on('data', (c) => errs.push(Buffer.from(c)));

    // Manejo de stdin si corresponde
    if (stdinBuffer instanceof Readable) {
      stdinBuffer.pipe(child.stdin);
    } else if (stdinBuffer) {
      child.stdin.write(stdinBuffer);
      child.stdin.end();
    }

    // Timeout: si se excede, matamos el proceso
    const done = new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        if (code && code !== 0) {
          return reject(
            new InternalServerErrorException(
              `${bin} falló: ${Buffer.concat(errs).toString() || 'error desconocido'}`
            )
          );
        }
        resolve();
      });
      child.on('error', (err) =>
        reject(
          new InternalServerErrorException(`${bin} no se pudo ejecutar: ${String(err?.message || err)}`)
        )
      );
    });

    const killer = (async () => {
      await wait(timeoutMs);
      try {
        child.kill('SIGKILL');
      } catch {}
    })();

    return { child, promise: Promise.race([done, killer.then(() => Promise.reject(
      new ServiceUnavailableException(`${bin} excedió el timeout de ${timeoutMs / 1000}s`)
    ))]) as Promise<void> };
  }

  /* ===================== Export ===================== */

  async export(format: Format) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const db = this.dbUrl();

    const pg_dump = await this.ensureTool('pg_dump');

    if (format === 'dump') {
      // Formato custom (-Fc): recomendado para restaurar con pg_restore
      const args = [
        '--dbname', db,
        '-Fc',
        '--no-owner',
        '--no-privileges',
      ];
      const { child, promise } = this.runWithTimeout(pg_dump, args, { timeoutMs: 15 * 60_000 });

      // Importante: no consumimos stdout aquí; lo devolvemos como stream
      // pero propagamos errores de fondo
      promise.catch((e) => child.stdout.destroy(e as any));

      return {
        stream: child.stdout,
        filename: `backup-${ts}.dump`,
        contentType: 'application/octet-stream',
      };
    }

    // SQL plano comprimido (pg_dump → gzip)
    const args = [
      '--dbname', db,
      '--no-owner',
      '--no-privileges',
    ];
    const gzip = zlib.createGzip();
    const { child, promise } = this.runWithTimeout(pg_dump, args, { timeoutMs: 15 * 60_000 });
    child.stdout.pipe(gzip);

    promise.catch((e) => gzip.destroy(e as any));

    return {
      stream: gzip,
      filename: `backup-${ts}.sql.gz`,
      contentType: 'application/gzip',
    };
  }

  /* ===================== Restore ===================== */

  async restore(file: Buffer, opts: { filename: string }) {
    const db = this.dbUrl();

    const isDump = /\.dump$/i.test(opts.filename);
    const isGz = /\.gz$/i.test(opts.filename);
    const isSql = /\.sql(\.gz)?$/i.test(opts.filename);

    if (!isDump && !isSql) {
      throw new BadRequestException('Formato no soportado. Usa .dump o .sql(.gz)');
    }

    if (isDump) {
      const pg_restore = await this.ensureTool('pg_restore');
      const { promise } = this.runWithTimeout(
        pg_restore,
        ['--dbname', db, '--clean', '--if-exists', '--no-owner'],
        { stdinBuffer: file, timeoutMs: 20 * 60_000 }
      );
      await promise;
      return { ok: true, restoredFrom: opts.filename, format: 'dump' as const };
    }

    // SQL (posiblemente .gz)
    const psql = await this.ensureTool('psql');

    const sqlStream = isGz ? Readable.from(file).pipe(zlib.createGunzip()) : Readable.from(file);

    const { promise } = this.runWithTimeout(
      psql,
      ['--dbname', db, '-v', 'ON_ERROR_STOP=1', '-f', '-'],
      { stdinBuffer: sqlStream, timeoutMs: 20 * 60_000 }
    );
    await promise;

    return { ok: true, restoredFrom: opts.filename, format: 'sql' as const };
  }
}
