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

  async getModels(): Promise<{ id: string; name: string; provider: string }[]> {
    const models: { id: string; name: string; provider: string }[] = [];
    
    if (this.environmentService.getOpenaiApiKey()) {
      models.push(
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: LlmProvider.OpenAI },
        { id: 'gpt-4', name: 'GPT-4', provider: LlmProvider.OpenAI },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: LlmProvider.OpenAI }
      );
    }
    
    if (this.environmentService.getHuggingfaceApiKey()) {
      models.push({ id: 'huggingface-default', name: 'Hugging Face Model', provider: LlmProvider.HuggingFace });
    }
    
    if (this.environmentService.getLocalLlmApiBase()) {
      try {
        const localModels = await this.getLocalModels();
        models.push(...localModels);
      } catch (error: any) {
        console.log('Failed to fetch local models:', error?.message || 'Unknown error');
        // Fallback to configured model
        const configuredModel = this.environmentService.getLocalLlmModel();
        if (configuredModel) {
          models.push({ id: configuredModel, name: configuredModel, provider: LlmProvider.Local });
        }
      }
    }
    
    return models;
  }

  private async getLocalModels(): Promise<{ id: string; name: string; provider: string }[]> {
    const base = this.environmentService.getLocalLlmApiBase();
    try {
      const response = await fetch(`${base}/v1/models`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((model: any) => ({
          id: model.id,
          name: model.id || model.name || 'Unknown Model',
          provider: LlmProvider.Local
        }));
      }
    } catch (error: any) {
      console.log('Local LLM models API not available:', error.message);
    }
    
    // Fallback to configured model
    const configuredModel = this.environmentService.getLocalLlmModel();
    return configuredModel ? [{ id: configuredModel, name: configuredModel, provider: LlmProvider.Local }] : [];
  }

  async chatWithModel(modelId: string, messages: any[]): Promise<string> {
    // Determine provider based on model ID
    let provider: LlmProvider;
    
    if (['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'].includes(modelId)) {
      provider = LlmProvider.OpenAI;
      return this.callOpenAI(messages, modelId);
    } else if (modelId === 'huggingface-default') {
      provider = LlmProvider.HuggingFace;
      return this.callHuggingFace(messages);
    } else {
      // Assume all other models are local
      return this.callLocal(messages, modelId);
    }
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

  private async callOpenAI(messages: any[], modelId?: string): Promise<string> {
    const apiKey = this.environmentService.getOpenaiApiKey();
    const base = this.environmentService.getOpenaiApiBase();
    
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    
    const model = modelId || 'gpt-3.5-turbo';
    
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          model, 
          messages,
          max_tokens: 2000,
          temperature: 0.7
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          `OpenAI API error (${res.status}): ${errorData.error?.message || res.statusText}`
        );
      }

      const data = await res.json();
      
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from OpenAI API');
      }
      
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error('OpenAI API call failed:', error);
      throw new Error(`OpenAI service error: ${error.message}`);
    }
  }

  private async callHuggingFace(messages: any[]): Promise<string> {
    const apiKey = this.environmentService.getHuggingfaceApiKey();
    const base = this.environmentService.getHuggingfaceApiBase();
    
    if (!apiKey || !base) {
      throw new Error('Hugging Face API key or base URL is not configured');
    }
    
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
    
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inputs: prompt,
          parameters: {
            max_new_tokens: 2000,
            temperature: 0.7,
            do_sample: true,
            top_p: 0.9
          }
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          `Hugging Face API error (${res.status}): ${errorData.error || res.statusText}`
        );
      }

      const data = await res.json();
      
      if (typeof data === 'string') {
        return data;
      }
      
      if (Array.isArray(data) && data[0]?.generated_text) {
        return data[0].generated_text;
      }
      
      if (data.generated_text) {
        return data.generated_text;
      }
      
      throw new Error('Invalid response format from Hugging Face API');
    } catch (error: any) {
      console.error('Hugging Face API call failed:', error);
      throw new Error(`Hugging Face service error: ${error.message}`);
    }
  }

  private async callLocal(messages: any[], modelId?: string): Promise<string> {
    const base = this.environmentService.getLocalLlmApiBase();
    
    if (!base) {
      throw new Error('Local LLM API base URL is not configured');
    }
    
    const model = modelId || this.environmentService.getLocalLlmModel() || 'default';
    
    try {
      const res = await fetch(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          model, 
          messages,
          max_tokens: 2000,
          temperature: 0.7,
          stream: false
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          `Local LLM API error (${res.status}): ${errorData.error?.message || res.statusText}`
        );
      }

      const data = await res.json();
      
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from Local LLM API');
      }
      
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error('Local LLM API call failed:', error);
      
      if (error.message.includes('fetch')) {
        throw new Error(`Cannot connect to Local LLM service at ${base}. Please check if the service is running.`);
      }
      
      throw new Error(`Local LLM service error: ${error.message}`);
    }
  }
}
