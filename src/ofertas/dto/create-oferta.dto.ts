import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Min,
  IsDateString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOfertaProductoDto {
  @IsInt()
  @IsNotEmpty()
  productoId: number;
}

export class CreateOfertaCategoriaDto {
  @IsInt()
  @IsNotEmpty()
  categoriaId: number;
}

export class CreateOfertaMarcaDto {
  @IsInt()
  @IsNotEmpty()
  marcaId: number;
}

export class CreateOfertaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  descripcion?: string;

  @IsEnum(['PORCENTAJE', 'FIJO'])
  @IsNotEmpty()
  tipoDescuento: 'PORCENTAJE' | 'FIJO';

  // ✅ Corregido: reemplaza @IsDecimal por @IsNumber
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor del descuento debe tener hasta 2 decimales.' })
  @Min(0, { message: 'El valor del descuento no puede ser negativo.' })
  @IsNotEmpty()
  valorDescuento: number;

  @IsDateString()
  @IsNotEmpty()
  fechaInicio: string;

  @IsDateString()
  @IsNotEmpty()
  fechaFin: string;

  @IsEnum(['PENDIENTE', 'ACTIVA', 'FINALIZADA', 'CANCELADA'])
  @IsOptional()
  estado?: 'PENDIENTE' | 'ACTIVA' | 'FINALIZADA' | 'CANCELADA';

  @IsInt()
  @IsOptional()
  maxUsos?: number;

  @IsBoolean()
  @IsOptional()
  activa?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateOfertaProductoDto)
  ofertaProductos?: CreateOfertaProductoDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateOfertaCategoriaDto)
  ofertaCategorias?: CreateOfertaCategoriaDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateOfertaMarcaDto)
  ofertaMarcas?: CreateOfertaMarcaDto[];
}
