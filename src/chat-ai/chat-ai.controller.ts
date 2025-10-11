import { Controller, Post, Body } from '@nestjs/common'
import { ChatAiService, ProductoSimplificado } from './chat-ai.service'
import { ChatMessageDto } from './dto/chat-message.dto'

@Controller('chat-ai')
export class ChatAiController {
  constructor(private readonly chatAiService: ChatAiService) {}

  @Post()
  async sendMessage(@Body() chatMessageDto: ChatMessageDto): Promise<{ response: string; productos?: ProductoSimplificado[] }> {
    return this.chatAiService.chat(chatMessageDto.message)
  }
}
