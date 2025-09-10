import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'


@Injectable()
export class AuthService {
constructor(private prisma: PrismaService) {}


async validateUser(email: string, pass: string) {
const user = await this.prisma.user.findUnique({ where: { email } })
if (!user) throw new UnauthorizedException('Credenciales inválidas')
const ok = await bcrypt.compare(pass, user.passwordHash)
if (!ok) throw new UnauthorizedException('Credenciales inválidas')
return user
}


signToken(userId: number, email: string) {
const payload = { sub: userId, email }
return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' })
}
}