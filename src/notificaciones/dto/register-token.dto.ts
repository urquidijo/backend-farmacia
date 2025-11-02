import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Platform } from '@prisma/client';

export class RegisterTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsEnum(Platform)
  @IsNotEmpty()
  platform!: Platform;
}
