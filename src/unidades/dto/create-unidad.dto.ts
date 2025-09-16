import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

export class CreateUnidadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  codigo: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombre: string
}