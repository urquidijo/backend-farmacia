// src/roles/dto/update-role.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class UpdateRoleDto {
  @IsString() @IsOptional()
  name?: string;

  @IsString() @IsOptional()
  description?: string;
}