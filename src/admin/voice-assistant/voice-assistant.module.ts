import { Module } from '@nestjs/common';
import { VoiceAssistantService } from './voice-assistant.service';
import { VoiceAssistantController } from './voice-assistant.controller';
import { ReportesService } from './reportes.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [VoiceAssistantController],
  providers: [VoiceAssistantService, ReportesService, PrismaService],
})
export class VoiceAssistantModule {}
