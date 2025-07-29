import type { ApiResponse } from "./config";
import { useAuthStore } from "~/core/store/auth-store";

/**
 * API响应处理工具
 * 统一处理API响应，特别是处理认证相关错误，如403未授权时自动跳转到登录页
 */
export class ApiResponseHandler {
  /**
   * 处理API响应
   * @param response API响应
   * @returns 处理后的响应
   */
  static handleResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    // 检查是否存在错误状态码
    if (response.status) {
      // 处理403未授权状态码
      if (response.status === 403 || response.status === 401) {
        // 清除认证信息
        const authStore = useAuthStore.getState();
        authStore.clearAuth();
        
        // 在客户端环境中执行重定向
        if (typeof window !== 'undefined') {
          // 获取当前路径用于重定向回来
          const currentPath = encodeURIComponent(window.location.pathname);
          // 跳转到登录页，并带上重定向参数
          window.location.href = `/auth/login?redirect_uri=${currentPath}`;
        }
      }
    }
    
    return response;
  }

  /**
   * 包装API调用
   * 用于包装API调用，自动处理响应
   * @param apiCall API调用函数
   * @returns 包装后的API调用结果
   */
  static async wrap<T>(apiCall: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
    try {
      const response = await apiCall();
      return this.handleResponse(response);
    } catch (error) {
      console.error('API调用失败:', error);
      return {
        data: null as any,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }
} 