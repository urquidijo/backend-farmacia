import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'


@Module({
imports: [PrismaModule, PassportModule],
controllers: [AuthController],
providers: [AuthService, JwtStrategy],
})
export class AuthModule {}