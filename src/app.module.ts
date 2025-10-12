import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { S3Module } from './s3/s3.module'

import { MeController } from './me.controller'
import { UsuariosModule } from './usuarios/usuarios.module'
import { PublicModule } from './public/public.module'
import { RolesModule } from './roles/roles.module'
import { MarcasModule } from './marcas/marcas.module'
import { CategoriasModule } from './categorias/categorias.module'
import { UnidadesModule } from './unidades/unidades.module'
import { ProductosModule } from './productos/productos.module'
import { ClientesModule } from './clientes/clientes.module'
import { CarritoModule } from './carrito/carrito.module'
import { AlertsModule } from './alerts/alerts.module'
import { LotesModule } from './lotes/lotes.module'
import { ChatAiModule } from './chat-ai/chat-ai.module';
import { BitacoraModule } from './bitacora/bitacora.module';
import { PermissionsModule } from './permissions/permissions.module'
import { PagosModule } from './pagos/pagos.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
    CarritoModule,
    AlertsModule,
    LotesModule,
    ChatAiModule,
    BitacoraModule,
    PermissionsModule,
    PagosModule,
  ],
  controllers: [MeController],
})
export class AppModule {}
