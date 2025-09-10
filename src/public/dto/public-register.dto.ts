import { IsEmail, IsString, MinLength } from 'class-validator'

export class PublicRegisterDto {
  @IsEmail() email!: string
  @IsString() firstName!: string
  @IsString() lastName!: string
  @IsString() @MinLength(6) password!: string
}
