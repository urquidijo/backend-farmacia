import { IsInt, Min } from 'class-validator'
import { Transform } from 'class-transformer'

export class UpdateCarritoItemDto {
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  cantidad: number
}
