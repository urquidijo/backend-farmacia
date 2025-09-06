import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async createUser(dto: CreateUsuarioDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('El email ya está registrado');

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hash },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    return user;
  }

  async findAllUser() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { id: 'desc' },
    });
  }

  async findOneUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updateUser(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    // Verificamos si existe
    const usuario = await this.prisma.user.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`No se encontró el usuario con id: ${id}`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateUsuarioDto,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!updated) {
      throw new InternalServerErrorException(
        'No se pudo actualizar el usuario',
      );
    }

    return updated;
  }

  async removeUser(id: number) {
    try {
      await this.prisma.user.delete({ where: { id } });
      return { message: 'Usuario eliminado' };
    } catch {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    // En este enfoque simple NO generamos JWT. Retornamos el perfil básico.
    return {
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    };
  }
}
