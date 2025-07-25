// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT


import {useStore} from "~/core/store";

import type {
  ChatEvent,
  InterruptEvent,
  MessageChunkEvent,
  ToolCallChunksEvent,
  ToolCallResultEvent,
  ToolCallsEvent,
  ReferenceInformationEvent,
} from "../api";
import { deepClone } from "../utils/deep-clone";

import type { Message } from "./types";

export function mergeMessage(message: Message, event: ChatEvent) {
  if (event.type === "message_chunk") {
    mergeTextMessage(message, event);
  } else if (event.type === "tool_calls" || event.type === "tool_call_chunks") {
    mergeToolCallMessage(message, event);
  } else if (event.type === "tool_call_result") {
    mergeToolCallResultMessage(message, event);
  } else if (event.type === "interrupt") {
    mergeInterruptMessage(message, event);
  } else if (event.type === "reference_information") {
    mergeReferenceInformationMessage(event);
  }
  if (event.data.finish_reason) {
    message.finishReason = event.data.finish_reason;
    message.isStreaming = false;
    if (message.toolCalls) {
      message.toolCalls.forEach((toolCall) => {
        if (toolCall.argsChunks?.length) {
          toolCall.args = JSON.parse(toolCall.argsChunks.join(""));
          delete toolCall.argsChunks;
        }
      });
    }
  }
  return deepClone(message);
}

function mergeTextMessage(message: Message, event: MessageChunkEvent) {
  if (event.data.content) {
    message.content += event.data.content;
    message.contentChunks.push(event.data.content);
  }
  if (event.data.reasoning_content) {
    message.reasoningContent = (message.reasoningContent ?? "") + event.data.reasoning_content;
    message.reasoningContentChunks = message.reasoningContentChunks ?? [];
    message.reasoningContentChunks.push(event.data.reasoning_content);
  }
  
  // 处理参考信息字段
  if (event.data.knowledge_base_results) {
    message.knowledgeBaseResults = event.data.knowledge_base_results;
  }
  if (event.data.web_search_results) {
    message.webSearchResults = event.data.web_search_results;
  }
}

function mergeToolCallMessage(
  message: Message,
  event: ToolCallsEvent | ToolCallChunksEvent,
) {
  

  if (event.type === "tool_calls" && event.data.tool_calls[0]?.name) {
    message.toolCalls = event.data.tool_calls.map((raw) => ({
      id: raw.id,
      name: raw.name,
      args: raw.args,
      result: undefined,
    }));
  }

  message.toolCalls ??= [];
  for (const chunk of event.data.tool_call_chunks) {
    if (chunk.id) {
      const toolCall = message.toolCalls.find(
        (toolCall) => toolCall.id === chunk.id,
      );
      if (toolCall) {
        toolCall.argsChunks = [chunk.args];
      }
    } else {
      const streamingToolCall = message.toolCalls.find(
        (toolCall) => toolCall.argsChunks?.length,
      );
      if (streamingToolCall) {
        streamingToolCall.argsChunks!.push(chunk.args);
      }
    }
  }
}

function mergeToolCallResultMessage(
  message: Message,
  event: ToolCallResultEvent,
) {
  const toolCall = message.toolCalls?.find(
    (toolCall) => toolCall.id === event.data.tool_call_id,
  );
  if (toolCall) {
    toolCall.result = event.data.content;
  }
}

function mergeInterruptMessage(message: Message, event: InterruptEvent) {
  message.isStreaming = false;
  message.options = event.data.options;
}

function mergeReferenceInformationMessage(event: ReferenceInformationEvent) {
  const task_id = event.data.task_id
  const message = useStore.getState().messages.get(task_id)
  if (message) {
    // 按 metadata.file_id 去重知识库结果
    if (event.data.knowledge_base_results) {
      const uniqueResults = event.data.knowledge_base_results.filter((result, index, self) => 
        index === self.findIndex(r => r.metadata?.file_id === result.metadata?.file_id)
      );
      message.knowledgeBaseResults = uniqueResults;
    }
    
    // 处理网络搜索结果
    if (event.data.web_search_results) {
      message.webSearchResults = event.data.web_search_results;
    }
  }
}
