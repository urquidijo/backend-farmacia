import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'


@Injectable()
export class PermissionsGuard implements CanActivate {
constructor(private reflector: Reflector) {}
canActivate(ctx: ExecutionContext): boolean {
const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
ctx.getHandler(), ctx.getClass(),
])
if (!required || required.length === 0) return true


const req = ctx.switchToHttp().getRequest()
const user: any = req.user // inyectado por JWT Strategy
const userPerms: string[] = user?.permissions || []


return required.every(p => userPerms.includes(p))
}
}