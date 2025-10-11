import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

export class PublicRegisterDto {
  @IsEmail() email!: string
  @IsString() firstName!: string
  @IsString() lastName!: string
  @IsOptional() @IsString() telefono?: string
  @IsString() @MinLength(6) password!: string
}
