import { IsDateString, IsOptional } from 'class-validator'

export class FilterClientesByDateDto {
  @IsDateString()
  fechaInicial!: string // Formato: YYYY-MM-DD

  @IsDateString()
  fechaFinal!: string // Formato: YYYY-MM-DD
}
