import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { S3Module } from './s3/s3.module';

import { MeController } from './me.controller';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PublicModule } from './public/public.module';
import { RolesModule } from './roles/roles.module';
import { MarcasModule } from './marcas/marcas.module';
import { CategoriasModule } from './categorias/categorias.module';
import { UnidadesModule } from './unidades/unidades.module';
import { ProductosModule } from './productos/productos.module';
import { ClientesModule } from './clientes/clientes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    S3Module,
    AuthModule,
    UsuariosModule,
    PublicModule,
    RolesModule,
    MarcasModule,
    CategoriasModule,
    UnidadesModule,
    ProductosModule,
    ClientesModule,
  ],
  controllers: [MeController],
})
export class AppModule {}
