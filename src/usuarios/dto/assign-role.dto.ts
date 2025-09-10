import { IsInt } from 'class-validator'
export class AssignRoleDto {
@IsInt() userId: number
@IsInt() roleId: number
}