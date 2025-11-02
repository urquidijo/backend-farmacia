import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { Platform } from '@prisma/client';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);
  private expo: Expo;

  constructor(private prisma: PrismaService) {
    this.expo = new Expo();
  }

  /**
   * Registra o actualiza un token de dispositivo para un usuario
   */
  async registerToken(userId: number, dto: RegisterTokenDto) {
    const { token, platform } = dto;

    // Validar que el token sea válido para Expo
    if (!Expo.isExpoPushToken(token)) {
      throw new Error(`El token ${token} no es un token válido de Expo Push`);
    }

    try {
      // Buscar si el token ya existe
      const existingToken = await this.prisma.deviceToken.findUnique({
        where: { token },
      });

      if (existingToken) {
        // Si existe pero es de otro usuario, actualizar el userId
        // Esto puede pasar si el usuario desinstaló y reinstalo en otro dispositivo
        if (existingToken.userId !== userId) {
          this.logger.warn(
            `Token ${token} ya existía para userId ${existingToken.userId}, actualizando a userId ${userId}`,
          );
        }

        // Actualizar el token (activarlo si estaba desactivado y actualizar userId)
        return await this.prisma.deviceToken.update({
          where: { token },
          data: {
            userId,
            platform,
            active: true,
            updatedAt: new Date(),
          },
        });
      }

      // Si no existe, crearlo
      return await this.prisma.deviceToken.create({
        data: {
          userId,
          token,
          platform,
          active: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error al registrar token: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Desactiva un token específico (cuando el usuario hace logout)
   */
  async deactivateToken(token: string) {
    try {
      return await this.prisma.deviceToken.update({
        where: { token },
        data: { active: false },
      });
    } catch (error) {
      this.logger.error(`Error al desactivar token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Desactiva todos los tokens de un usuario
   */
  async deactivateUserTokens(userId: number) {
    try {
      return await this.prisma.deviceToken.updateMany({
        where: { userId, active: true },
        data: { active: false },
      });
    } catch (error) {
      this.logger.error(`Error al desactivar tokens del usuario ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene todos los tokens activos de un usuario
   */
  async getUserTokens(userId: number) {
    return await this.prisma.deviceToken.findMany({
      where: { userId, active: true },
    });
  }

  /**
   * Envía una notificación push a un usuario específico
   */
  async sendToUser(userId: number, notification: SendNotificationDto) {
    // Obtener todos los tokens activos del usuario
    const deviceTokens = await this.getUserTokens(userId);

    if (deviceTokens.length === 0) {
      this.logger.warn(`Usuario ${userId} no tiene tokens de dispositivo activos`);
      return { sent: 0, errors: [], message: 'No hay tokens activos' };
    }

    // Enviar a todos los dispositivos del usuario
    return await this.sendToTokens(
      deviceTokens.map((dt) => dt.token),
      notification,
    );
  }

  /**
   * Envía una notificación push a múltiples usuarios
   */
  async sendToUsers(userIds: number[], notification: SendNotificationDto) {
    // Obtener todos los tokens activos de los usuarios
    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: {
        userId: { in: userIds },
        active: true,
      },
    });

    if (deviceTokens.length === 0) {
      this.logger.warn(`Ninguno de los usuarios especificados tiene tokens activos`);
      return { sent: 0, errors: [], message: 'No hay tokens activos' };
    }

    return await this.sendToTokens(
      deviceTokens.map((dt) => dt.token),
      notification,
    );
  }

  /**
   * Envía notificaciones a una lista de tokens
   */
  private async sendToTokens(
    tokens: string[],
    notification: SendNotificationDto,
  ): Promise<{
    sent: number;
    errors: Array<{ token: string; error: string }>;
  }> {
    // Crear mensajes para Expo
    const messages: ExpoPushMessage[] = tokens
      .filter((token) => Expo.isExpoPushToken(token))
      .map((token) => ({
        to: token,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: notification.sound || 'default',
        badge: notification.badge ? parseInt(notification.badge) : undefined,
        priority: 'high',
      }));

    if (messages.length === 0) {
      this.logger.warn('No hay tokens válidos para enviar notificaciones');
      return { sent: 0, errors: [] };
    }

    // Dividir en chunks (Expo recomienda max 100 notificaciones por request)
    const chunks = this.expo.chunkPushNotifications(messages);
    const errors: Array<{ token: string; error: string }> = [];
    let sentCount = 0;

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);

        // Procesar resultados
        ticketChunk.forEach((ticket: ExpoPushTicket, index: number) => {
          if (ticket.status === 'error') {
            const token = chunk[index].to as string;
            this.logger.error(
              `Error enviando a ${token}: ${ticket.message}`,
            );
            errors.push({
              token,
              error: ticket.message || 'Error desconocido',
            });

            // Si el token es inválido, desactivarlo
            if (
              ticket.details?.error === 'DeviceNotRegistered' ||
              ticket.message?.includes('not registered')
            ) {
              this.deactivateToken(token).catch((err) =>
                this.logger.error(`Error desactivando token inválido: ${err.message}`),
              );
            }
          } else {
            sentCount++;
            this.logger.log(
              `Notificación enviada exitosamente. Ticket ID: ${ticket.id}`,
            );
          }
        });
      } catch (error) {
        this.logger.error(`Error enviando chunk de notificaciones: ${error.message}`);
        chunk.forEach((msg) => {
          errors.push({
            token: msg.to as string,
            error: error.message,
          });
        });
      }
    }

    this.logger.log(
      `Notificaciones enviadas: ${sentCount}/${messages.length}. Errores: ${errors.length}`,
    );

    return { sent: sentCount, errors };
  }

  /**
   * Envía una notificación de prueba a un usuario
   */
  async sendTestNotification(userId: number) {
    return await this.sendToUser(userId, {
      title: '🔔 Notificación de Prueba',
      body: 'Esta es una notificación de prueba desde el backend',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Envía notificación de pago exitoso
   */
  async sendPaymentSuccessNotification(
    userId: number,
    ordenId: number,
    monto: number,
  ) {
    return await this.sendToUser(userId, {
      title: '💳 ¡Pago Exitoso!',
      body: `Tu pedido de Bs. ${monto.toFixed(2)} ha sido procesado correctamente`,
      data: {
        type: 'payment_success',
        ordenId: ordenId.toString(),
        screen: 'invoices',
      },
    });
  }

  /**
   * Envía notificación de carrito abandonado
   */
  async sendAbandonedCartNotification(userId: number, itemCount: number) {
    return await this.sendToUser(userId, {
      title: '🛒 ¡Tienes productos esperándote!',
      body: `Tu carrito tiene ${itemCount} producto${itemCount > 1 ? 's' : ''}. ¡Completa tu compra!`,
      data: {
        type: 'abandoned_cart',
        screen: 'cart',
      },
    });
  }

  /**
   * Envía notificación diaria (recordatorio)
   */
  async sendDailyReminder(userId: number, message?: string) {
    const defaultMessages = [
      '¡Buenos días! Descubre nuevos productos en nuestra farmacia',
      '¿Necesitas medicamentos? Estamos aquí para ti',
      'Ofertas especiales te esperan hoy',
      'Tu salud es importante. Visítanos hoy',
      'Nuevos productos disponibles en nuestra farmacia',
    ];

    const randomMessage =
      message || defaultMessages[Math.floor(Math.random() * defaultMessages.length)];

    return await this.sendToUser(userId, {
      title: '🏥 Farmacia App',
      body: randomMessage,
      data: {
        type: 'daily_reminder',
        screen: 'home',
      },
    });
  }

  /**
   * Obtiene estadísticas de tokens
   */
  async getTokenStats() {
    const [total, active, byPlatform] = await Promise.all([
      this.prisma.deviceToken.count(),
      this.prisma.deviceToken.count({ where: { active: true } }),
      this.prisma.deviceToken.groupBy({
        by: ['platform'],
        _count: true,
        where: { active: true },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      byPlatform: byPlatform.map((p) => ({
        platform: p.platform,
        count: p._count,
      })),
    };
  }
}
