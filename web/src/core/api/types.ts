// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import type { Option } from "../messages";

// Tool Calls

export interface ToolCall {
  type: "tool_call";
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolCallChunk {
  type: "tool_call_chunk";
  index: number;
  id: string;
  name: string;
  args: string;
}

// Events

interface GenericEvent<T extends string, D extends object> {
  type: T;
  data: {
    id: string;
    thread_id: string;
    task_id: string;
    agent: "coordinator" | "planner" | "researcher" | "coder" | "reporter";
    role: "user" | "assistant" | "tool";
    finish_reason?: "stop" | "tool_calls" | "interrupt";
  } & D;
}

export interface MessageChunkEvent
  extends GenericEvent<
    "message_chunk",
    {
      content?: string;
      reasoning_content?: string;
      knowledge_base_results?: Array<{
        id?: string | null;
        content?: string;
        metadata?: {
          file_name?: string;
          source?: string;
          [key: string]: string | undefined;
        };
      }>;
      web_search_results?: Array<{
        type?: string;
        title?: string;
        url?: string;
        content?: string;
      }>;
    }
  > {}

export interface ToolCallsEvent
  extends GenericEvent<
    "tool_calls",
    {
      tool_calls: ToolCall[];
      tool_call_chunks: ToolCallChunk[];
    }
  > {}

export interface ToolCallChunksEvent
  extends GenericEvent<
    "tool_call_chunks",
    {
      tool_call_chunks: ToolCallChunk[];
    }
  > {}

export interface ToolCallResultEvent
  extends GenericEvent<
    "tool_call_result",
    {
      tool_call_id: string;
      content?: string;
    }
  > {}

export interface InterruptEvent
  extends GenericEvent<
    "interrupt",
    {
      options: Option[];
    }
  > {}

export interface ReferenceInformationEvent
  extends GenericEvent<
    "reference_information",
    {
      knowledge_base_results?: Array<{
        id?: string | null;
        content?: string;
        metadata?: {
          file_name?: string;
          source?: string;
          [key: string]: string | undefined;
        };
        raw_content?: string;
      }>;
      web_search_results?: Array<{
        type?: string;
        title?: string;
        url?: string;
        content?: string;
        engines?: string[];
        category?: string;
        raw_content?: string;
      }>;
      tool_name?: string;
    }
  > {}

export type ChatEvent =
  | MessageChunkEvent
  | ToolCallsEvent
  | ToolCallChunksEvent
  | ToolCallResultEvent
  | InterruptEvent
  | ReferenceInformationEvent;
