import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificacionesService } from './notificaciones.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('notificaciones')
@UseGuards(AuthGuard('jwt'))
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  /**
   * Registra el token de dispositivo del usuario actual
   * POST /api/notificaciones/register-token
   */
  @Post('register-token')
  async registerToken(
    @GetUser('id') userId: number,
    @Body() dto: RegisterTokenDto,
  ) {
    const deviceToken = await this.notificacionesService.registerToken(
      userId,
      dto,
    );

    return {
      message: 'Token registrado exitosamente',
      deviceToken: {
        id: deviceToken.id,
        platform: deviceToken.platform,
        active: deviceToken.active,
      },
    };
  }

  /**
   * Desactiva un token específico
   * DELETE /api/notificaciones/token/:token
   */
  @Delete('token/:token')
  async deactivateToken(@Param('token') token: string) {
    await this.notificacionesService.deactivateToken(token);
    return {
      message: 'Token desactivado exitosamente',
    };
  }

  /**
   * Desactiva todos los tokens del usuario actual (logout)
   * POST /api/notificaciones/deactivate-all
   */
  @Post('deactivate-all')
  async deactivateAllTokens(@GetUser('id') userId: number) {
    await this.notificacionesService.deactivateUserTokens(userId);
    return {
      message: 'Todos los tokens del usuario han sido desactivados',
    };
  }

  /**
   * Obtiene los tokens activos del usuario actual
   * GET /api/notificaciones/my-tokens
   */
  @Get('my-tokens')
  async getMyTokens(@GetUser('id') userId: number) {
    const tokens = await this.notificacionesService.getUserTokens(userId);
    return {
      count: tokens.length,
      tokens: tokens.map((t) => ({
        id: t.id,
        platform: t.platform,
        active: t.active,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    };
  }

  /**
   * Envía una notificación de prueba al usuario actual
   * POST /api/notificaciones/test
   */
  @Post('test')
  async sendTestNotification(@GetUser('id') userId: number) {
    const result = await this.notificacionesService.sendTestNotification(userId);
    return {
      message: 'Notificación de prueba enviada',
      ...result,
    };
  }

  /**
   * Envía una notificación a un usuario específico (solo admin)
   * POST /api/notificaciones/send/:userId
   */
  @Post('send/:userId')
  @UseGuards(PermissionsGuard)
  @Permissions('user.read') // Solo admin/vendedor
  async sendToUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: SendNotificationDto,
  ) {
    const result = await this.notificacionesService.sendToUser(userId, dto);
    return {
      message: 'Notificación enviada',
      ...result,
    };
  }

  /**
   * Obtiene estadísticas de tokens (solo admin)
   * GET /api/notificaciones/stats
   */
  @Get('stats')
  @UseGuards(PermissionsGuard)
  @Permissions('user.read')
  async getStats() {
    return await this.notificacionesService.getTokenStats();
  }
}
