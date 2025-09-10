import { IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator'
import { UserStatus } from '@prisma/client'

export class UpdateUserDto {
  @IsOptional() @IsString() firstName?: string
  @IsOptional() @IsString() lastName?: string
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus
  @IsOptional() @IsString() @MinLength(6) password?: string
  @IsOptional() @IsInt() roleId?: number // si se envía, sustituye el rol actual
}
