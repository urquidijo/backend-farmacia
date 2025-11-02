import { Module } from '@nestjs/common';
import { RecsController } from './recs.controller';
import { RecsService } from './recs.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [],
  controllers: [RecsController],
  providers: [RecsService, PrismaService],
  exports: [RecsService],
})
export class RecsModule {}
