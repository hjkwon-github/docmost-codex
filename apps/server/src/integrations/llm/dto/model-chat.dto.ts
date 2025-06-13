import { IsArray, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessage {
  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ModelChatDto {
  @IsString()
  @IsNotEmpty()
  modelId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessage)
  messages: ChatMessage[];
}
