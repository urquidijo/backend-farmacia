import { EstadoOrden } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdatePedidoStatusDto {
  @IsEnum(EstadoOrden)
  estado!: EstadoOrden;
}
