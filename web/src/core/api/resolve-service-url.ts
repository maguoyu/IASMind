// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { env } from "~/env";

export function resolveServiceURL(path: string) {
  let BASE_URL = env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/";
  
  // 确保 BASE_URL 不为空
  if (!BASE_URL || BASE_URL.trim() === "") {
    BASE_URL = "http://localhost:8000/api/";
  }
  
  // 判断 BASE_URL 是相对路径还是绝对 URL
  const isRelativePath = BASE_URL.startsWith("/");
  
  if (isRelativePath) {
    // 处理相对路径 BASE_URL
    // 如果 path 已经是绝对路径（以 / 开头），直接返回 path
    // 因为绝对路径通常已经是完整的 API 路径
    if (path.startsWith("/")) {
      return path;
    }
    
    // 对于相对路径，拼接 BASE_URL
    // 确保 BASE_URL 以 / 结尾
    if (!BASE_URL.endsWith("/")) {
      BASE_URL += "/";
    }
    
    return `${BASE_URL}${path}`;
  } else {
    // 处理绝对 URL
    // 确保 BASE_URL 以 / 结尾
    if (!BASE_URL.endsWith("/")) {
      BASE_URL += "/";
    }
    
    // 简单验证 BASE_URL 格式（不使用 URL 对象）
    // 检查是否包含协议（http:// 或 https://）
    const hasProtocol = BASE_URL.startsWith("http://") || BASE_URL.startsWith("https://");
    if (!hasProtocol) {
      // 如果无效，使用默认值
      BASE_URL = "http://localhost:8000/api/";
    }
    
    // 处理相对路径和绝对路径（使用字符串拼接）
    if (path.startsWith("http://") || path.startsWith("https://")) {
      // path 已经是完整的绝对 URL，直接返回
      return path;
    } else if (path.startsWith("/")) {
      // path 是绝对路径（以 / 开头），需要与 BASE_URL 的域名部分拼接
      // 提取 BASE_URL 的协议和域名部分
      const urlMatch = BASE_URL.match(/^(https?:\/\/[^\/]+)/);
      if (urlMatch) {
        return `${urlMatch[1]}${path}`;
      }
      // 如果无法解析，直接拼接
      const cleanBase = BASE_URL.replace(/\/+$/, ""); // 移除末尾的斜杠
      return `${cleanBase}${path}`;
    } else {
      // path 是相对路径，直接拼接
      return `${BASE_URL}${path}`;
    }
  }
}
