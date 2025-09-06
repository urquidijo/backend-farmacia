import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService],
  imports: [PrismaModule],
})
export class UsuariosModule {}
