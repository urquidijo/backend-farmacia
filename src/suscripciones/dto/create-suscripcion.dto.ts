import { Transform } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'
import { FrecuenciaSuscripcion } from '@prisma/client'

export class CreateSuscripcionDto {
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  productoId: number

  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  cantidad: number

  @IsEnum(FrecuenciaSuscripcion)
  frecuencia: FrecuenciaSuscripcion

  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(90)
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  diasPersonalizado?: number // Solo para PERSONALIZADA

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  @Transform(({ value }) => (value !== undefined ? parseInt(value) : undefined))
  diaSemana?: number // 0-6 (Domingo-Sábado), solo para SEMANAL

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  @Transform(({ value }) => (value !== undefined ? parseInt(value) : undefined))
  diaMes?: number // 1-31, solo para MENSUAL
}
