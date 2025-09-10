// src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../../prisma/prisma.service'

type JwtPayload = { sub: number; email: string }

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.access_token || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!, // asegúrate de tenerla en .env
    })
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true }, // RolePermission -> Permission
                },
              },
            },
          },
        },
      },
    })

    // si no existe, lanza 401 implícito (deja que Nest lo maneje)
    if (!user) return null

    const permissions = new Set<string>()
    for (const ur of user.roles) {
      for (const rp of ur.role.permissions) {
        permissions.add(rp.permission.key)
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      permissions: Array.from(permissions),
    }
  }
}
