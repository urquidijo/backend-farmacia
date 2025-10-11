// dto/query-bitacora.dto.ts
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoBitacora } from './create-bitacora.dto';

export class QueryBitacoraDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsEnum(EstadoBitacora)
  estado?: EstadoBitacora;

  // NEW: búsqueda por nombre/apellido/email
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  // rango ISO (con offset -04:00 del front). Ej: 2025-10-01T00:00:00-04:00
  @IsOptional()
  @IsISO8601()
  desde?: string;

  @IsOptional()
  @IsISO8601()
  hasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number; // 1-based

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  perPage?: number; // máx 100
}
