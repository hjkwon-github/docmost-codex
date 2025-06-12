import { Injectable } from '@nestjs/common';
import { EnvironmentService } from '../environment/environment.service';
import { LlmProvider } from './llm.types';

@Injectable()
export class LlmService {
  constructor(private readonly environmentService: EnvironmentService) {}

  getProviders(): string[] {
    const providers: string[] = [];
    if (this.environmentService.getOpenaiApiKey()) {
      providers.push(LlmProvider.OpenAI);
    }
    if (this.environmentService.getHuggingfaceApiKey()) {
      providers.push(LlmProvider.HuggingFace);
    }
    if (this.environmentService.getLocalLlmApiBase()) {
      providers.push(LlmProvider.Local);
    }
    return providers;
  }

  async chat(provider: LlmProvider, messages: any[]): Promise<string> {
    switch (provider) {
      case LlmProvider.OpenAI:
        return this.callOpenAI(messages);
      case LlmProvider.HuggingFace:
        return this.callHuggingFace(messages);
      case LlmProvider.Local:
        return this.callLocal(messages);
      default:
        throw new Error('Unknown provider');
    }
  }

  private async callOpenAI(messages: any[]): Promise<string> {
    const apiKey = this.environmentService.getOpenaiApiKey();
    const base = this.environmentService.getOpenaiApiBase();
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'gpt-3.5-turbo', messages }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private async callHuggingFace(messages: any[]): Promise<string> {
    const apiKey = this.environmentService.getHuggingfaceApiKey();
    const base = this.environmentService.getHuggingfaceApiBase();
    const prompt = messages.map((m) => m.content).join('\n');
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    });
    const data = await res.json();
    if (typeof data === 'string') {
      return data;
    }
    return data.generated_text || '';
  }

  private async callLocal(messages: any[]): Promise<string> {
    const base = this.environmentService.getLocalLlmApiBase();
    const model = this.environmentService.getLocalLlmModel() || 'default';
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
