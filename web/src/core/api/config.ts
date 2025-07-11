import { type IASMindConfig } from "../config/types";

import { resolveServiceURL } from "./resolve-service-url";

declare global {
  interface Window {
    __iasmindConfig: IASMindConfig;
  }
}

export async function loadConfig() {
  // 在构建时或服务器端渲染时返回默认配置
  if (typeof window === 'undefined') {
    return {
      rag: {
        provider: 'local_milvus'
      },
      llm: {
        models: {
          basic: ['doubao-1-5-pro-32k-250115'],
          reasoning: ['doubao-1-5-thinking-pro-m-250428']
        }
      }
    };
  }

  try {
    const res = await fetch(resolveServiceURL("./config"));
    const config = await res.json();
    return config;
  } catch (error) {
    console.error('Failed to load config:', error);
    // 返回默认配置作为后备
    return {
      rag: {
        provider: 'local_milvus'
      },
      llm: {
        models: {
          basic: ['doubao-1-5-pro-32k-250115'],
          reasoning: ['doubao-1-5-thinking-pro-m-250428']
        }
      }
    };
  }
}

export function getConfig(): IASMindConfig {
  if (
    typeof window === "undefined" ||
    typeof window.__iasmindConfig === "undefined"
  ) {
    throw new Error("Config not loaded");
  }
  return window.__iasmindConfig;
}
