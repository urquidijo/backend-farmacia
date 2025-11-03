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

// --- AWS SDK v3 ---
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

enum ExportFormat {
  sql = 'sql',
  dump = 'dump',
}

@Controller('backup')
export class BackupController {
  private s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  constructor(private readonly svc: BackupService) {}

  /** GET /backup/export?format=sql|dump  -> descarga con nombre forzado */
  @Get('export')
  async export(
    @Query('format', new ParseEnumPipe(ExportFormat)) format: ExportFormat = ExportFormat.sql,
    @Res() res: Response,
  ) {
    // Mapea por formato a tu objeto en S3 y al nombre deseado de descarga
    const bucket = process.env.S3_BUCKET!;
    const mappings: Record<ExportFormat, { key: string; filename: string; contentType: string }> = {
      dump: {
        key: 'productos/test/backup-2025-11-02T22-24-37-980Z.dump',
        filename: 'farmaciabackup.dump',
        contentType: 'application/octet-stream',
      },
      sql: {
        key: 'productos/test/backup-2025-11-02T22-26-09-229Z.sql.gz',
        filename: 'farmaciabackup.sql.gz',
        contentType: 'application/gzip',
      },
    };

    const { key, filename, contentType } = mappings[format];

    // 1) Trae el objeto de S3
    const obj = await this.s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    // 2) Setea headers para forzar el nombre de descarga
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // 3) Streamea el body a la respuesta
    const bodyStream = obj.Body as any; // Readable
    bodyStream.on('error', () => res.end());
    bodyStream.pipe(res);
  }

  /** POST /backup/restore  (multipart/form-data: file) */
  @Post('restore')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
    }),
  )
  async restore(@UploadedFile() file: Express.Multer.File) {
    if (!file)
      throw new BadRequestException('Sube un archivo .sql, .sql.gz, .dump o .dump.gz');

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
