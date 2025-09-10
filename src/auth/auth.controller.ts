import { Body, Controller, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from '../usuarios/dto/login.dto'


@Controller('auth')
export class AuthController {
constructor(private auth: AuthService) {}


@Post('login')
async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
const user = await this.auth.validateUser(dto.email, dto.password)
const token = this.auth.signToken(user.id, user.email)
res.cookie('access_token', token, { httpOnly: true, sameSite: 'lax', secure: false, path: '/' })
return { message: 'ok' }
}


@Post('logout')
logout(@Res({ passthrough: true }) res: Response) {
res.clearCookie('access_token', { path: '/' })
return { message: 'bye' }
}
}