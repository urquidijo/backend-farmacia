import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VoiceAssistantService } from './voice-assistant.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { IsOptional, IsString } from 'class-validator';

export class ProcessCommandDto {
  @IsOptional()
  @IsString()
  command?: string;

  @IsOptional()
  @IsString()
  audio?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

@Controller('admin/voice-assistant')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class VoiceAssistantController {
  constructor(private readonly voiceAssistantService: VoiceAssistantService) {}

  @Post()
  @Permissions('user.read')
  async processCommand(@Body() dto: ProcessCommandDto, @Request() req) {
    try {
      console.log('[NestJS Controller] Received DTO:', {
        command: dto.command,
        commandType: typeof dto.command,
        commandLength: dto.command?.length,
        hasAudio: !!dto.audio,
        mimeType: dto.mimeType,
      });

      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw new HttpException('Usuario no autenticado', HttpStatus.UNAUTHORIZED);
      }

      // Handle audio input
      if (dto.audio && dto.mimeType) {
        const result = await this.voiceAssistantService.processAudio(
          dto.audio,
          dto.mimeType,
          userId,
        );
        return result;
      }

      // Handle text command input - trim whitespace
      const commandText = dto.command?.trim();
      if (commandText && typeof commandText === 'string' && commandText.length > 0) {
        console.log('[NestJS Controller] Processing text command:', commandText);
        const result = await this.voiceAssistantService.processCommand(
          commandText,
          userId,
        );
        return result;
      }

      console.log('[NestJS Controller] Validation failed - no valid command or audio');
      throw new HttpException(
        'Debe proporcionar un comando de texto o audio',
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      console.error('Error in voice assistant controller:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Error al procesar el comando',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
