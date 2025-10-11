import { Module } from '@nestjs/common'
import { ChatAiController } from './chat-ai.controller'
import { ChatAiService } from './chat-ai.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [ChatAiController],
  providers: [ChatAiService],
})
export class ChatAiModule {}
