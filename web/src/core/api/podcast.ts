// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { resolveServiceURL } from "./resolve-service-url";

export async function generatePodcast(content: string) {
  const response = await fetch(resolveServiceURL("podcast/generate"), {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    // 如果是401未授权，跳转到登录页
    if (response.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: "audio/mp3" });
  const audioUrl = URL.createObjectURL(blob);
  return audioUrl;
}
