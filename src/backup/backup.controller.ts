// src/backup/backup.controller.ts
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
import type { Response, Express } from 'express'; // 👈 importa Express para el tipo Multer.File
import { FileInterceptor } from '@nestjs/platform-express';
import { BackupService } from './backup.service';

@Controller('backup')
export class BackupController {
  constructor(private readonly svc: BackupService) {}

  // GET /backup/export?format=sql|dump
  @Get('export')
  async export(
    @Query('format') format: 'sql' | 'dump' = 'sql',
    @Res() res: Response,
  ) {
    const { stream, filename, contentType } = await this.svc.export(format);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.flushHeaders?.(); // opcional

    // Manejo de errores del stream: si hay error, responde 500 y cierra
    stream.on('error', (err: any) => {
      if (!res.headersSent) {
        res.status(500).send(
          typeof err?.message === 'string' ? err.message : 'Error generando backup',
        );
      } else {
        res.end(); // por si ya se enviaban datos
      }
    });

    // Pipe del stream al response
    stream.pipe(res);
  }

  // POST /backup/restore (multipart form-data: file)
  @Post('restore')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1024 * 1024 * 1024 } }), // 1GB
  )
  async restore(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Sube un archivo .sql o .dump');
    }
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
