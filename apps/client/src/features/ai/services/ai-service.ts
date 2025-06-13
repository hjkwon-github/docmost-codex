import api from "@/lib/api-client";
import { AIModel, ChatRequest, ChatResponse, ModelChatRequest } from "../types/ai.types";

// Re-export types for convenience
export type { AIModel, ChatRequest, ChatResponse, ModelChatRequest };

export async function fetchModels(): Promise<AIModel[]> {
  try {
    const response = await api.get("/ai/models");
    
    if (!response.data) {
      console.warn('fetchModels: received empty response');
      return [];
    }
    
    if (Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn('fetchModels: expected array, got:', typeof response.data);
      return [];
    }
  } catch (error: any) {
    console.warn('AI models endpoint not available:', error?.message || error);
    return [];
  }
}

export async function fetchProviders(): Promise<string[]> {
  try {
    const response = await api.get("/ai/providers");
    
    if (!response.data) {
      console.warn('fetchProviders: received empty response');
      return [];
    }
    
    if (Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn('fetchProviders: expected array, got:', typeof response.data);
      return [];
    }
  } catch (error: any) {
    console.warn('AI providers endpoint not available:', error?.message || error);
    return [];
  }
}

export async function sendChat(data: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await api.post("/ai/chat", data);
    
    if (!response.data?.message) {
      throw new Error('Invalid response format: missing message');
    }
    
    return response.data;
  } catch (error: any) {
    console.error('AI chat endpoint error:', error?.message || error);
    throw new Error('AI chat is not available. Please check your configuration.');
  }
}

export async function sendModelChat(modelId: string, messages: { role: string; content: string }[]): Promise<ChatResponse> {
  if (!modelId?.trim()) {
    throw new Error('Model ID is required');
  }
  
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages array is required and cannot be empty');
  }
  
  try {
    const payload: ModelChatRequest = { modelId, messages };
    const response = await api.post("/ai/chat/model", payload);
    
    if (!response.data?.message) {
      throw new Error('Invalid response format: missing message');
    }
    
    return response.data;
  } catch (error: any) {
    console.error('AI model chat endpoint error:', error?.message || error);
    
    if (error?.response?.status === 404) {
      throw new Error('AI service is not configured or available');
    } else if (error?.response?.status === 429) {
      throw new Error('Too many requests. Please wait and try again.');
    } else if (error?.response?.status >= 500) {
      throw new Error('AI service is temporarily unavailable');
    }
    
    throw new Error('Failed to get response from AI. Please try again.');
  }
}
