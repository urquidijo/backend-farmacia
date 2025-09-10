import { Module } from '@nestjs/common'
import { RolesController } from './roles.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({ imports: [PrismaModule], controllers: [RolesController] })
export class RolesModule {}