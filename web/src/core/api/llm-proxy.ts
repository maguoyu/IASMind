// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { resolveServiceURL } from "./resolve-service-url";

// Define types for the LLM API
export interface LLMMessage {
  role: string;
  content: string;
}

export interface LLMRequestOptions {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  max_tokens?: number;
  stream?: boolean;
  llm_type?: string;
}

export interface LLMResponseChoice {
  index: number;
  message: LLMMessage;
  finish_reason: string;
}

export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: LLMResponseChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Makes a request to the LLM proxy endpoint
 * @param options - LLM request options
 * @returns Promise with LLM response
 */
export async function callLLMProxy(
  options: LLMRequestOptions
): Promise<LLMResponse> {
  // Ensure we have a model and messages
  if (!options.model) {
    throw new Error("Model is required");
  }
  
  if (!options.messages || options.messages.length === 0) {
    throw new Error("At least one message is required");
  }
  
  try {
    const response = await fetch(resolveServiceURL("./llm-proxy/chat/completions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...options,
        llm_type: options.llm_type || "basic", // Default to basic model
      }),
    });

    if (!response.ok) {
      // 如果是401未授权，跳转到登录页
      if (response.status === 401 && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling LLM API:", error);
    throw error;
  }
}

/**
 * Stream responses from the LLM proxy endpoint
 * @param options - LLM request options
 * @returns Async generator yielding response chunks
 */
export async function* streamLLMProxy(
  options: LLMRequestOptions
): AsyncGenerator<any> {
  // Ensure we have a model and messages
  if (!options.model) {
    throw new Error("Model is required");
  }
  
  if (!options.messages || options.messages.length === 0) {
    throw new Error("At least one message is required");
  }
  
  try {
    const response = await fetch(resolveServiceURL("./llm-proxy/chat/completions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...options,
        stream: true, // Ensure streaming is enabled
        llm_type: options.llm_type || "basic", // Default to basic model
      }),
    });

    if (!response.ok) {
      // 如果是401未授权，跳转到登录页
      if (response.status === 401 && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    // Process the streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader");
    }
    
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Convert the Uint8Array to text
      const chunk = decoder.decode(value, { stream: true });
      
      // Parse the SSE data format
      // Each SSE event is prefixed with "data: " and ends with two newlines
      const lines = chunk
        .split("\n\n")
        .filter(line => line.trim() !== "");
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6);
          if (jsonStr === "[DONE]") {
            return; // Stream is complete
          }
          try {
            const data = JSON.parse(jsonStr);
            yield data;
          } catch (e) {
            console.warn("Failed to parse SSE data:", e);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error streaming from LLM API:", error);
    throw error;
  }
} 