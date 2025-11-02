import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { spawn } from 'node:child_process';
import * as zlib from 'node:zlib';
import { Readable } from 'node:stream';

type Format = 'sql' | 'dump';

@Injectable()
export class BackupService {
  /** Obtiene la URL de conexión priorizando BACKUP_DATABASE_URL y luego DATABASE_URL */
  private dbUrl(): string {
    const raw =
      process.env.BACKUP_DATABASE_URL?.trim() ||
      process.env.DATABASE_URL?.trim();

    if (!raw) {
      throw new InternalServerErrorException(
        'Falta BACKUP_DATABASE_URL o DATABASE_URL'
      );
    }

    // Asegurar sslmode=require si no está presente
    if (!/(\?|&)sslmode=/.test(raw)) {
      const hasQ = raw.includes('?');
      return raw + (hasQ ? '&' : '?') + 'sslmode=require';
    }
    return raw;
  }

  /** =============== EXPORTACIÓN =============== */
  async export(format: Format) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const db = this.dbUrl();

    if (format === 'dump') {
      const args = ['--dbname', db, '-Fc'];
      const proc = spawn('pg_dump', args, { env: process.env });

      const errs: Buffer[] = [];
      proc.stderr.on('data', (c) => errs.push(Buffer.from(c)));
      proc.on('close', (code) => {
        if (code && code !== 0) {
          throw new InternalServerErrorException(
            `pg_dump falló: ${Buffer.concat(errs).toString() || 'error desconocido'}`
          );
        }
      });

      return {
        stream: proc.stdout,
        filename: `backup-${ts}.dump`,
        contentType: 'application/octet-stream',
      };
    }

    // SQL plano comprimido
    const args = ['--dbname', db];
    const proc = spawn('pg_dump', args, { env: process.env });
    const gzip = zlib.createGzip();

    const errs: Buffer[] = [];
    proc.stderr.on('data', (c) => errs.push(Buffer.from(c)));
    proc.on('close', (code) => {
      if (code && code !== 0) {
        gzip.destroy(
          new InternalServerErrorException(
            `pg_dump falló: ${Buffer.concat(errs).toString() || 'error desconocido'}`
          ) as any
        );
      }
    });

    proc.stdout.pipe(gzip);

    return {
      stream: gzip,
      filename: `backup-${ts}.sql.gz`,
      contentType: 'application/gzip',
    };
  }

  /** =============== RESTAURACIÓN =============== */
  async restore(
    buffer: Buffer,
    opts: { isDump: boolean; isSql: boolean; filename: string }
  ) {
    const db = this.dbUrl();

    if (opts.isDump) {
      const proc = spawn('pg_restore', ['--dbname', db, '-c'], {
        env: process.env,
      });
      proc.stdin.write(buffer);
      proc.stdin.end();
      await this.awaitExit(proc, 'pg_restore');
      return { ok: true, restoredFrom: opts.filename, format: 'dump' };
    }

    let sqlStream: Readable;
    if (opts.filename.endsWith('.gz')) {
      const gunzip = zlib.createGunzip();
      sqlStream = Readable.from(buffer).pipe(gunzip);
    } else {
      sqlStream = Readable.from(buffer);
    }

    const proc = spawn(
      'psql',
      ['--dbname', db, '-v', 'ON_ERROR_STOP=1', '-f', '-'],
      { env: process.env }
    );

    sqlStream.pipe(proc.stdin);
    await this.awaitExit(proc, 'psql');

    return { ok: true, restoredFrom: opts.filename, format: 'sql' };
  }

  /** =============== Utilidades =============== */
  private awaitExit(proc: ReturnType<typeof spawn>, name: string) {
    return new Promise<void>((resolve, reject) => {
      const errs: Buffer[] = [];
      proc.stderr!.on('data', (c) => errs.push(Buffer.from(c)));
      proc.on('close', (code) => {
        if (code && code !== 0) {
          return reject(
            new InternalServerErrorException(
              `${name} falló: ${Buffer.concat(errs).toString() || 'error desconocido'}`
            )
          );
        }
        resolve();
      });
    });
  }
}
