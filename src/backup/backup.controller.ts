import {
  Controller,
  Get,
  Query,
  Res,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseEnumPipe,
} from '@nestjs/common';
import type { Response, Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { BackupService } from './backup.service';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';

enum ExportFormat {
  sql = 'sql',
  dump = 'dump',
}

@Controller('backup')
export class BackupController {
  constructor(private readonly svc: BackupService) {}

  /** GET /backup/export?format=sql|dump */
  @Get('export')
  async export(
    @Query('format', new ParseEnumPipe(ExportFormat)) format: ExportFormat = ExportFormat.sql,
    @Res() res: Response,
  ) {
    try {
      const { stream, filename, contentType } = await this.svc.export(format);

      // 1) No enviamos headers todavía; primero esperamos el primer chunk o un error
      const tee = new PassThrough();

      let headersSent = false;
      let firstChunkWritten = false;

      const onErrorEarly = (err: any) => {
        if (!headersSent) {
          // Error antes de enviar headers -> respondemos 500 (evita archivo 0B)
          res.status(500).send(
            typeof err?.message === 'string' ? err.message : 'Error generando backup',
          );
        } else {
          // Si ya mandamos headers, cerramos
          try { res.end(); } catch {}
        }
      };

      stream.once('error', onErrorEarly);

      stream.once('data', async (chunk: Buffer) => {
        try {
          // 2) Ahora sí es seguro fijar headers (hay datos reales)
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('X-Accel-Buffering', 'no');
          res.flushHeaders?.();
          headersSent = true;

          // Escribimos ese primer chunk manualmente y luego pipe del resto
          firstChunkWritten = true;
          tee.write(chunk);

          // Propagamos errores posteriores (ya con headers enviados)
          stream.on('error', (e) => {
            console.error('❌ Stream error tardío:', e);
            try { res.end(); } catch {}
          });

          // Pipea el resto
          stream.pipe(tee);

          // pipeline gestiona backpressure y cierre
          await pipeline(tee, res);
          res.end();
        } catch (err) {
          onErrorEarly(err);
        }
      });

      // Si el stream termina sin emitir ni un byte (DB vacía o error silencioso)
      stream.once('end', async () => {
        if (!headersSent) {
          // Si terminó sin data, revisamos si alcanzó a escribir algo
          if (!firstChunkWritten) {
            res.status(500).send('No se generó contenido de backup (stream vacío).');
          }
        }
      });

      // Arranca el flujo (necesario para disparar 'data'/'end')
      stream.resume();
    } catch (err: any) {
      console.error('❌ Error en export:', err);
      if (!res.headersSent) {
        res
          .status(500)
          .send(typeof err?.message === 'string' ? err.message : 'Error generando backup');
      } else {
        try { res.end(); } catch {}
      }
    }
  }

  /** POST /backup/restore  (multipart/form-data: file) */
  @Post('restore')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
    }),
  )
  async restore(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Sube un archivo .sql, .sql.gz, .dump o .dump.gz');
    }

    const name = (file.originalname || '').toLowerCase();
    const valid =
      name.endsWith('.sql') ||
      name.endsWith('.sql.gz') ||
      name.endsWith('.dump') ||
      name.endsWith('.dump.gz') ||
      name.endsWith('.custom');

    if (!valid) {
      throw new BadRequestException(
        'Extensiones válidas: .sql, .sql.gz, .dump, .dump.gz, .custom',
      );
    }

    return this.svc.restore(file.buffer, { filename: name });
  }
}
