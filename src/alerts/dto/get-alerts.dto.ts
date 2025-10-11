import { Transform } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator'

const TYPES = ['all', 'stock', 'expiry'] as const
const SEVERITIES = ['info', 'warning', 'critical'] as const

export class GetAlertsQueryDto {
  @IsOptional()
  @IsIn(TYPES)
  type?: (typeof TYPES)[number]

  @IsOptional()
  @IsIn(SEVERITIES)
  severity?: (typeof SEVERITIES)[number]

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined
    const num = Number(value)
    return Number.isNaN(num) ? undefined : Math.round(num)
  })
  @IsInt()
  @Min(1)
  @Max(90)
  windowDays?: number

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  unreadOnly?: boolean

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  search?: string

  @IsOptional()
  @Transform(({ value }) => {
    const num = parseInt(value, 10)
    return Number.isNaN(num) ? 1 : num
  })
  @IsPositive()
  page?: number = 1

  @IsOptional()
  @Transform(({ value }) => {
    const num = parseInt(value, 10)
    if (Number.isNaN(num)) return 20
    return Math.min(Math.max(num, 5), 100)
  })
  @IsInt()
  pageSize?: number = 20
}
