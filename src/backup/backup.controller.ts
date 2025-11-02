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

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      // Evita buffering en proxies como Nginx/Cloudflare
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      await pipeline(stream, res);
    } catch (err: any) {
      if (!res.headersSent) {
        res
          .status(500)
          .send(typeof err?.message === 'string' ? err.message : 'Error generando backup');
      } else {
        res.end();
      }
    }
  }

  /** POST /backup/restore  (multipart/form-data: file) */
  @Post('restore')
  @UseInterceptors(
    FileInterceptor('file', {
      // Multer en memoria (por defecto con FileInterceptor)
      limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
    }),
  )
  async restore(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Sube un archivo .sql, .sql.gz, .dump o .dump.gz');

    const name = (file.originalname || '').toLowerCase();
    const valid =
      name.endsWith('.sql') ||
      name.endsWith('.sql.gz') ||
      name.endsWith('.dump') ||
      name.endsWith('.dump.gz') ||
      name.endsWith('.custom');

    if (!valid) {
      throw new BadRequestException('Extensiones válidas: .sql, .sql.gz, .dump, .dump.gz, .custom');
    }

    // El servicio detecta internamente si es dump o sql (comprimido o no)
    return this.svc.restore(file.buffer, { filename: name });
  }
}
