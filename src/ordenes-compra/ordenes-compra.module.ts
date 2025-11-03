import { Module } from '@nestjs/common';
import { OrdenesCompraService } from './ordenes-compra.service';
import { OrdenesCompraController } from './ordenes-compra.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrdenesCompraController],
  providers: [OrdenesCompraService],
  exports: [OrdenesCompraService],
})
export class OrdenesCompraModule {}
