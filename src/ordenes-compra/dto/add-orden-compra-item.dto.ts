import { IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class AddOrdenCompraItemDto {
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
