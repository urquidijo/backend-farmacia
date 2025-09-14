import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

export class CreateCategoriaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string
}