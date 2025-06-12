import api from "@/lib/api-client";

export interface ChatRequest {
  provider: string;
  messages: { role: string; content: string }[];
}

export async function fetchModels(): Promise<string[]> {
  return api.get("/ai/models");
}

export async function sendChat(data: ChatRequest): Promise<{ message: string }> {
  return api.post("/ai/chat", data);
}
