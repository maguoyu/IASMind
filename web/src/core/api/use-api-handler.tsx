'use client';

import { useRouter } from "next/navigation";
import type { ApiResponse } from "./config";
import { useAuthStore } from "~/core/store/auth-store";

/**
 * API响应处理Hook返回类型
 */
export interface ApiHandlerHook {
  handleResponse: <T,>(response: ApiResponse<T>) => ApiResponse<T>;
  wrapApiCall: <T,>(apiCall: () => Promise<ApiResponse<T>>) => Promise<ApiResponse<T>>;
}

/**
 * API响应处理Hook
 * 用于在组件内部统一处理API响应
 */
export function useApiHandler(): ApiHandlerHook {
  const router = useRouter();

  /**
   * 处理API响应
   * @param response API响应
   * @returns 处理后的响应
   */
  const handleResponse = <T,>(response: ApiResponse<T>): ApiResponse<T> => {
    // 检查是否存在错误状态码
    if (response.status) {
      // 处理403未授权状态码
      if (response.status === 403 || response.status === 401) {
        // 清除认证信息
        const authStore = useAuthStore.getState();
        authStore.clearAuth();
        
        // 获取当前路径用于重定向回来
        const currentPath = encodeURIComponent(window.location.pathname);
        // 使用Next.js路由跳转到登录页
        router.push(`/auth/login?redirect_uri=${currentPath}`);
      }
    }
    
    return response;
  };

  /**
   * 包装API调用
   * 用于包装API调用，自动处理响应
   * @param apiCall API调用函数
   * @returns 包装后的API调用结果
   */
  const wrapApiCall = async <T,>(apiCall: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> => {
    try {
      const response = await apiCall();
      return handleResponse(response);
    } catch (error) {
      console.error('API调用失败:', error);
      return {
        data: null as any,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  };

  return {
    handleResponse,
    wrapApiCall
  };
} 