import { PartialType } from '@nestjs/mapped-types'
import { CreateLoteDto } from './create-lote.dto'
import { IsInt, Min, IsOptional } from 'class-validator'
import { Transform } from 'class-transformer'

export class UpdateLoteDto extends PartialType(CreateLoteDto) {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : parseInt(value, 10),
  )
  cantidad?: number
}
