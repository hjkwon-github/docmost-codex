import { IsArray, IsEnum } from 'class-validator';
import { LlmProvider } from '../llm.types';

export class ChatMessage {
  role: string;
  content: string;
}

export class ChatDto {
  @IsEnum(LlmProvider)
  provider: LlmProvider;

  @IsArray()
  messages: ChatMessage[];
}
