import { IsOptional, IsIn } from 'class-validator'

export class RfmQueryDto {
  @IsOptional()
  @IsIn(['VIP', 'FRECUENTE', 'OCASIONAL', 'INACTIVO', 'NUEVO'])
  segmento?: string
}
