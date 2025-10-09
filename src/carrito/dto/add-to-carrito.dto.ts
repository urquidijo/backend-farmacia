import { IsInt, Min } from 'class-validator'
import { Transform } from 'class-transformer'

export class AddToCarritoDto {
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  productoId: number

  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  cantidad: number
}
