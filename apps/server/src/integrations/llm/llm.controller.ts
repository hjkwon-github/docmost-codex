import { Controller, Get, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LlmService } from './llm.service';
import { ChatDto } from './dto/chat.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Get('models')
  @HttpCode(HttpStatus.OK)
  getModels() {
    return this.llmService.getProviders();
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatDto) {
    const message = await this.llmService.chat(dto.provider, dto.messages);
    return { message };
  }
}
