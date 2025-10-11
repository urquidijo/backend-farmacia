import { IsEnum, IsIP, IsInt, IsString, MinLength } from 'class-validator';

export enum EstadoBitacora {
  EXITOSO = 'EXITOSO',
  FALLIDO = 'FALLIDO',
}

export class CreateBitacoraDto {
  @IsInt()
  userId: number;

  @IsIP()
  ip: string;

  @IsString()
  @MinLength(3)
  acciones: string;

  @IsEnum(EstadoBitacora)
  estado: EstadoBitacora;
}
