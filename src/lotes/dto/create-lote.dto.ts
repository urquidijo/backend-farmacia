import { Transform } from 'class-transformer'
import { IsDate, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateLoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  codigo?: string

  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  cantidad: number

  @IsDate()
  @Transform(({ value }) => new Date(value))
  fechaVenc: Date
}
