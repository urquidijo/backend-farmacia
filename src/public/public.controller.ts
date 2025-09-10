import { Body, Controller, Post } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PublicRegisterDto } from './dto/public-register.dto'
import * as bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'

@Controller('public')
export class PublicController {
  constructor(private prisma: PrismaService) {}

  @Post('register')
  async register(@Body() dto: PublicRegisterDto) {
    // asegura rol CLIENTE
    let cliente = await this.prisma.role.findUnique({ where: { name: 'CLIENTE' } })
    if (!cliente) {
      cliente = await this.prisma.role.create({
        data: { name: 'CLIENTE', description: 'Cliente e-commerce' },
      })
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          roles: {
            create: [{ roleId: cliente.id }], // asigna rol CLIENTE
          },
        },
        select: { id: true, email: true },
      })
      // No inicia sesión aquí (tu UI redirige a /login)
      return { message: 'registered', user }
    } catch (e) {
      // Email duplicado
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return new Response('Email ya registrado', { status: 409 }) as any
      }
      throw e
    }
  }
}
