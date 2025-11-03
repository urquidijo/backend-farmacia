import { EstadoOrdenCompra } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateOrdenCompraEstadoDto {
  @IsEnum(EstadoOrdenCompra)
  estado!: EstadoOrdenCompra;
}
