import { Module } from '@nestjs/common';
import { UsersService } from './usuarios.service';
import { UsersController } from './usuarios.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [PrismaModule],
})
export class UsuariosModule {}
