import { IsDateString, IsOptional, IsString, MaxLength, IsNumber } from 'class-validator';

export class UpdateOrdenCompraDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;

  @IsOptional()
  @IsDateString()
  fechaEnvio?: string;

  @IsOptional()
  @IsDateString()
  fechaRecepcion?: string;

  @IsOptional()
  @IsNumber()
  totalEstimado?: number;
}
