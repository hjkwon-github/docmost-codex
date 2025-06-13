import { Controller, Get, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LlmService } from './llm.service';
import { ChatDto } from './dto/chat.dto';
import { ModelChatDto } from './dto/model-chat.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Get('models')
  @HttpCode(HttpStatus.OK)
  async getModels() {
    return await this.llmService.getModels();
  }

  @Get('providers')
  @HttpCode(HttpStatus.OK)
  getProviders() {
    return this.llmService.getProviders();
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatDto) {
    const message = await this.llmService.chat(dto.provider, dto.messages);
    return { message };
  }

  @Post('chat/model')
  @HttpCode(HttpStatus.OK)
  async chatWithModel(@Body() dto: ModelChatDto) {
    const message = await this.llmService.chatWithModel(dto.modelId, dto.messages);
    return { message };
  }
}
