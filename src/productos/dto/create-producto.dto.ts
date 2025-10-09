import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, Min, MaxLength, IsNumber } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  precio: number

  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  stockMinimo: number

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  activo?: boolean

  @IsInt()
  @Transform(({ value }) => parseInt(value))
  marcaId: number

  @IsInt()
  @Transform(({ value }) => parseInt(value))
  categoriaId: number

  @IsInt()
  @Transform(({ value }) => parseInt(value))
  unidadId: number

  @IsOptional()
  @IsString()
  imageKey?: string

  @IsOptional()
  @IsString()
  imageUrl?: string
}