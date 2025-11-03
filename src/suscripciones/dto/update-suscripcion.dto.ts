import { Transform } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'
import { FrecuenciaSuscripcion } from '@prisma/client'

export class UpdateSuscripcionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  cantidad?: number

  @IsOptional()
  @IsEnum(FrecuenciaSuscripcion)
  frecuencia?: FrecuenciaSuscripcion

  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(90)
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  diasPersonalizado?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  @Transform(({ value }) => (value !== undefined ? parseInt(value) : undefined))
  diaSemana?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  @Transform(({ value }) => (value !== undefined ? parseInt(value) : undefined))
  diaMes?: number
}
