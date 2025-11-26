import { IsOptional, IsInt, Min, IsIn } from 'class-validator'
import { Type } from 'class-transformer'

export class ForecastQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  productoId?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  dias?: number = 30 // 30, 60 o 90 días

  @IsOptional()
  @IsIn(['regresion_lineal', 'promedio_movil', 'arima'])
  modelo?: string = 'promedio_movil'
}
