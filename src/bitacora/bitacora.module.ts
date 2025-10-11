import { Module } from '@nestjs/common';
import { BitacoraService } from './bitacora.service';
import { BitacoraController } from './bitacora.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [BitacoraController],
  providers: [BitacoraService, PrismaService],
  exports: [BitacoraService],
})
export class BitacoraModule {}
