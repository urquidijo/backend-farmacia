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

type Tool = 'pg_restore' | 'psql';

@Injectable()
export class BackupService {
  /** Resuelve DB URL con sslmode=require */
  private dbUrl(): string {
    const raw = process.env.BACKUP_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
    if (!raw) throw new InternalServerErrorException('Falta BACKUP_DATABASE_URL o DATABASE_URL');
    if (!/(\?|&)sslmode=/.test(raw)) {
      return raw + (raw.includes('?') ? '&' : '?') + 'sslmode=require';
    }
    return raw;
  }

  /** Permite ruta alternativa a binarios via PGCLIENT_BIN */
  private resolveBin(tool: Tool): string {
    const base = process.env.PGCLIENT_BIN?.replace(/\/+$/, '') || '';
    return base ? `${base}/${tool}` : tool;
  }

  /** Verifica que el binario exista/sea ejecutable si es ruta absoluta/relativa */
  private async ensureTool(tool: Tool) {
    const bin = this.resolveBin(tool);
    if (bin.includes('/') || bin.includes('\\')) {
      try {
        await access(bin, fsConstants.X_OK);
      } catch {
        throw new ServiceUnavailableException(
          `No se encontró ${tool} en ${bin}. Instala "postgresql-client" o configura PGCLIENT_BIN.`,
        );
      }
    }
    return bin;
  }

  /** Ejecuta un proceso con timeout y captura errores */
  private runWithTimeout(
    bin: string,
    args: string[],
    options: { env?: NodeJS.ProcessEnv; timeoutMs?: number; stdinBuffer?: Buffer | Readable },
  ) {
    const { env = process.env, timeoutMs = 10 * 60 * 1000, stdinBuffer } = options || {};
    const child = spawn(bin, args, { env });

    const errs: Buffer[] = [];
    child.stderr.on('data', (c) => errs.push(Buffer.from(c)));

    if (stdinBuffer instanceof Readable) {
      stdinBuffer.pipe(child.stdin);
    } else if (stdinBuffer) {
      child.stdin.write(stdinBuffer);
      child.stdin.end();
    }

    const done = new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        if (code && code !== 0) {
          return reject(
            new InternalServerErrorException(
              `${bin} falló: ${Buffer.concat(errs).toString() || 'error desconocido'}`,
            ),
          );
        }
        resolve();
      });
      child.on('error', (err) =>
        reject(
          new InternalServerErrorException(
            `${bin} no se pudo ejecutar: ${String(err?.message || err)}`,
          ),
        ),
      );
    });

    const killer = (async () => {
      await wait(timeoutMs);
      try {
        child.kill('SIGKILL');
      } catch {}
    })();

    return {
      promise: Promise.race([
        done,
        killer.then(() => Promise.reject(
          new ServiceUnavailableException(`${bin} excedió el timeout de ${timeoutMs / 1000}s`),
        )),
      ]) as Promise<void>,
    };
  }

  /* ===================== Restore ===================== */

  async restore(file: Buffer, opts: { filename: string }) {
    const db = this.dbUrl();

    const isDump = /\.dump(\.gz)?$|\.custom$/i.test(opts.filename);
    const isGz = /\.gz$/i.test(opts.filename);
    const isSql = /\.sql(\.gz)?$/i.test(opts.filename);

    if (!isDump && !isSql) {
      throw new BadRequestException('Formato no soportado. Usa .dump(.gz|.custom) o .sql(.gz)');
    }

    if (isDump) {
      const pg_restore = await this.ensureTool('pg_restore');
      const stdin = isGz ? Readable.from(file).pipe(zlib.createGunzip()) : Readable.from(file);
      const { promise } = this.runWithTimeout(
        pg_restore,
        ['--dbname', db, '--clean', '--if-exists', '--no-owner'],
        { stdinBuffer: stdin, timeoutMs: 20 * 60_000 },
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
      { stdinBuffer: sqlStream, timeoutMs: 20 * 60_000 },
    );
    await promise;

    return { ok: true, restoredFrom: opts.filename, format: 'sql' as const };
  }
}
