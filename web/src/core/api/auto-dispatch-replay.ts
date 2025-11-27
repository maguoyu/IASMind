// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { fetchStream } from "~/core/sse/fetch-stream";

export interface ReplayRequest {
  airport_id: string;
  start_time: string;
  end_time: string;
  playback_speed: number;
  vehicle_id?: string;
  driver_id?: string;
  task_id?: string;
}

export interface VehicleUpdate {
  vehicle_id: string;
  vehicle_number: string;
  driver_name: string;
  longitude: number;
  latitude: number;
  status: string;
  timestamp: string;
}

export interface TaskUpdate {
  task_id: string;
  task_number: string;
  flight_number: string;
  status: string;
  timestamp: string;
}

export interface FlightUpdate {
  flight_id: string;
  flight_number: string;
  parking_spot_id: string;
  status: string;
  longitude: number;
  latitude: number;
  timestamp: string;
}

export interface ReplayEvent {
  type: "start" | "vehicle_update" | "task_update" | "flight_update" | "done" | "error";
  data?: any;
  message?: string;
  error?: string;
}

/**
 * 连接回放数据流
 */
export async function* connectReplayStream(
  request: ReplayRequest
): AsyncGenerator<ReplayEvent> {
  const stream = fetchStream("/api/auto_dispatch/replay/stream", {
    method: "POST",
    body: JSON.stringify(request),
  });

  for await (const event of stream) {
    try {
      const data = event.data ? JSON.parse(event.data) : null;
      
      yield {
        type: event.event as ReplayEvent["type"],
        data,
        message: data?.message,
        error: data?.error,
      };
    } catch (error) {
      console.error("解析 SSE 事件失败:", error);
      yield {
        type: "error",
        error: `解析事件失败: ${error}`,
      };
    }
  }
}

