// AI related TypeScript types

export interface AIModel {
  id: string;
  name: string;
  provider: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  id: string;
}

export interface ChatRequest {
  provider: string;
  messages: Array<{ role: string; content: string }>;
}

export interface ModelChatRequest {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  message: string;
}

export type MessageRole = "user" | "assistant" | "system";

export interface MessageAction {
  type: "copy" | "apply" | "replace";
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}
