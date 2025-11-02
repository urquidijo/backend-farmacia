import {
  Controller,
  Get,
  Query,
  Res,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import type { Response, Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { BackupService } from './backup.service';
import { pipeline } from 'node:stream/promises';

@Controller('backup')
export class BackupController {
  constructor(private readonly svc: BackupService) {}

  // GET /backup/export?format=sql|dump
  @Get('export')
  async export(
    @Query('format') format: 'sql' | 'dump' = 'sql',
    @Res() res: Response,
  ) {
    try {
      const { stream, filename, contentType } = await this.svc.export(format);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.flushHeaders?.();

      // pipeline maneja backpressure y errores del stream de extremo a extremo
      await pipeline(stream, res);
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).send(typeof err?.message === 'string' ? err.message : 'Error generando backup');
      } else {
        res.end();
      }
    }
  }

  // POST /backup/restore (multipart form-data: file)
  @Post('restore')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1024 * 1024 * 1024 } }), // 1GB
  )
  async restore(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Sube un archivo .sql o .dump');

    const name = (file.originalname || '').toLowerCase();
    const isDump =
      name.endsWith('.dump') || name.endsWith('.dump.gz') || name.endsWith('.custom');
    const isSql = name.endsWith('.sql') || name.endsWith('.sql.gz');

    if (!isDump && !isSql) {
      throw new BadRequestException('Extensiones válidas: .sql, .sql.gz, .dump, .dump.gz');
    }

    return this.svc.restore(file.buffer, { isDump, isSql, filename: name });
  }
}
