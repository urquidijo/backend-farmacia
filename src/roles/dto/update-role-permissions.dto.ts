import { IsArray, ArrayNotEmpty, IsInt } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  permissionIds: number[];
}
