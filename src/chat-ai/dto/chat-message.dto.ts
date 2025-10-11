import { IsString, IsNotEmpty } from 'class-validator'

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string
}
