import { PartialType } from '@nestjs/mapped-types'
import { CreateProductoDto } from './create-producto.dto'
import { IsOptional, IsBoolean } from 'class-validator'
import { Transform } from 'class-transformer'

export class UpdateProductoDto extends PartialType(CreateProductoDto) {
  // se asegura que funcione también en formularios donde viene como string
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  requiereReceta?: boolean
}
