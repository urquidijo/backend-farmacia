import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrdenCompraItemDto {
  @IsInt()
  @IsPositive()
  productoId!: number;

  @IsInt()
  @IsPositive()
  cantidad!: number;

  @IsOptional()
  @IsNumber()
  costoUnitario?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notas?: string;
}

export class CreateOrdenCompraDto {
  @IsInt()
  @IsPositive()
  proveedorId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrdenCompraItemDto)
  items!: CreateOrdenCompraItemDto[];
}
