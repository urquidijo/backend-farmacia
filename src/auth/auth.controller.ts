import { Body, Controller, Post, Res, Req, UnauthorizedException } from '@nestjs/common';
import type { Response, Request } from 'express';
import * as requestIp from 'request-ip';
import { AuthService } from './auth.service';
import { LoginDto } from '../usuarios/dto/login.dto';
import { normalizeIp } from 'src/common/ip.util';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const user = await this.auth.validateUser(dto.email, dto.password).catch(() => null);
    const rawIp = requestIp.getClientIp(req); // puede venir X-Forwarded-For
    const ip = normalizeIp(rawIp);

    if (!user) {
      // Opcional: incluir ip también en fallo para que el front pueda registrarlo
      res.status(401);
      return { message: 'Credenciales inválidas', ip };
    }

    const token = this.auth.signToken(user.id, user.email);
    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });

    // También puedes adjuntar header si quieres
    res.setHeader('x-client-ip', ip);

    return {
      message: 'ok',
      ip, // <-- importante para el front
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    return { message: 'bye' };
  }
}
