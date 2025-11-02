// src/rx-verify/rx-verify.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RxVerifyService } from './rx-verify.service';
import { RxVerifyController } from './rx-verify.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    // Si ya usas ConfigModule global en AppModule, puedes omitir esta línea:
    ConfigModule,
  ],
  controllers: [RxVerifyController],
  providers: [RxVerifyService, PrismaService],
  exports: [RxVerifyService], // <- para inyectarlo en otros módulos (p.ej. Carrito)
})
export class RxVerifyModule {}
