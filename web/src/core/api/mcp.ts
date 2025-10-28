// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import type { SimpleMCPServerMetadata } from "../mcp";

import { resolveServiceURL } from "./resolve-service-url";

export async function queryMCPServerMetadata(config: SimpleMCPServerMetadata, signal?: AbortSignal) {
  const response = await fetch(resolveServiceURL("mcp/server/metadata"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
    signal,
  });
  if (!response.ok) {
    // 如果是401未授权，跳转到登录页
    if (response.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}
