import { type IASMindConfig } from "../config/types";

import { resolveServiceURL } from "./resolve-service-url";
import { ApiResponseHandler } from "./api-handler";

declare global {
  interface Window {
    __iasmindConfig: IASMindConfig;
  }
}

// API响应类型
export interface ApiResponse<T = any> {
  data: T;
  error?: string;
  message?: string;
  status?: number;
}

// 从auth-store获取访问令牌
const getAccessToken = () => {
  // 避免在服务端渲染时报错
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    // 从localStorage直接获取，避免循环依赖
    const authStore = JSON.parse(localStorage.getItem('auth-store') || '{}');
    const state = authStore?.state;
    return state?.accessToken || null;
  } catch (error) {
    console.error('获取访问令牌失败:', error);
    return null;
  }
};

// 通用API客户端
export const apiClient = {
  async get<T = any>(endpoint: string, options: { params?: Record<string, any> } = {}): Promise<ApiResponse<T>> {
    return ApiResponseHandler.wrap(async () => {
      try {
        const url = new URL(resolveServiceURL(endpoint));
        if (options.params) {
          Object.entries(options.params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.append(key, String(value));
            }
          });
        }

        // 添加认证令牌
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        const token = getAccessToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            data: null as any,
            error: errorData.detail || response.statusText,
            status: response.status,
          };
        }

        const data = await response.json();
        return { data };
      } catch (error) {
        console.error('API请求失败:', error);
        return { 
          data: null as any,
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    });
  },

  async post<T = any>(endpoint: string, body?: any, options: { headers?: Record<string, string> } = {}): Promise<ApiResponse<T>> {
    return ApiResponseHandler.wrap(async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...options.headers,
        };

        // 添加认证令牌
        const token = getAccessToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        // 如果是FormData，不设置Content-Type，让浏览器自动处理
        if (body instanceof FormData) {
          delete headers['Content-Type'];
        }

        const response = await fetch(resolveServiceURL(endpoint), {
          method: 'POST',
          headers,
          body: body instanceof FormData ? body : JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            data: null as any,
            error: errorData.detail || response.statusText,
            status: response.status,
          };
        }

        const data = await response.json();
        return { data };
      } catch (error) {
        console.error('API请求失败:', error);
        return {
          data: null as any,
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    });
  },

  async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return ApiResponseHandler.wrap(async () => {
      try {
        // 添加认证令牌
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        const token = getAccessToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        
        const response = await fetch(resolveServiceURL(endpoint), {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            data: null as any,
            error: errorData.detail || response.statusText,
            status: response.status,
          };
        }

        const data = await response.json();
        return { data };
      } catch (error) {
        console.error('API请求失败:', error);
        return {
          data: null as any,
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    });
  },

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return ApiResponseHandler.wrap(async () => {
      try {
        // 添加认证令牌
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        const token = getAccessToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        
        const response = await fetch(resolveServiceURL(endpoint), {
          method: 'DELETE',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            data: null as any,
            error: errorData.detail || response.statusText,
            status: response.status,
          };
        }

        const data = await response.json();
        return { data };
      } catch (error) {
        console.error('API请求失败:', error);
        return {
          data: null as any,
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    });
  },
};

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
