import { IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class UpdateOrdenCompraItemDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  cantidadSolic?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cantidadRecib?: number;

  @IsOptional()
  @IsNumber()
  costoUnitario?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notas?: string;
}
