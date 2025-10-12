import { IsInt, IsNumber, IsString } from 'class-validator'

export class CrearPagoDto {
  @IsInt()
  ordenId: number

  @IsNumber()
  monto: number

  @IsString()
  moneda: string
}
