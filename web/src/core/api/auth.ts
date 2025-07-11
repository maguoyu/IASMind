// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

/**
 * 认证相关API接口
 */

import { env } from '~/env';

// 确保API_BASE_URL不包含/api路径，避免重复
const API_BASE_URL = (env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '');

// 类型定义
export interface LoginRequest {
  username: string;
  password: string;
  captcha?: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user_info: UserInfo;
}

export interface UserInfo {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  role: 'admin' | 'user' | 'guest';
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[];
  created_at: string;
  last_login?: string;
  profile?: Record<string, any>;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token?: string;
}

export interface UserUpdateRequest {
  email?: string;
  avatar?: string;
  profile?: Record<string, any>;
}

export interface PasswordChangeRequest {
  old_password: string;
  new_password: string;
}

export interface CaptchaResponse {
  captcha_id: string;
  captcha_image: string;
  expires_in: number;
}

export interface PermissionRequest {
  resource: string;
  action: string;
}

export interface PermissionResponse {
  allowed: boolean;
  reason?: string;
}

export interface ApiErrorResponse {
  error: string;
  error_description?: string;
  detail?: string;
}

// 认证API类
export class AuthApi {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 创建请求头
   */
  private createHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      // 清理token，去除可能存在的头尾引号
      let cleanToken = token;
      if ((cleanToken.startsWith("'") && cleanToken.endsWith("'")) || 
          (cleanToken.startsWith('"') && cleanToken.endsWith('"'))) {
        cleanToken = cleanToken.slice(1, -1);
      }
      
      headers.Authorization = `Bearer ${cleanToken}`;
    }

    return headers;
  }

  /**
   * 处理API响应
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || errorData.error_description || errorData.error || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * 用户登录
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: this.createHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse<LoginResponse>(response);
  }

  /**
   * 用户登出
   */
  async logout(request: LogoutRequest, token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: this.createHeaders(token),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || '登出失败');
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(request: RefreshTokenRequest): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: this.createHeaders(),
      body: JSON.stringify(request),
    });

    return this.handleResponse<LoginResponse>(response);
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(token: string): Promise<UserInfo> {
    const response = await fetch(`${this.baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: this.createHeaders(token),
    });

    return this.handleResponse<UserInfo>(response);
  }

  /**
   * 更新用户信息
   */
  async updateCurrentUser(request: UserUpdateRequest, token: string): Promise<UserInfo> {
    const response = await fetch(`${this.baseUrl}/api/auth/me`, {
      method: 'PUT',
      headers: this.createHeaders(token),
      body: JSON.stringify(request),
    });

    return this.handleResponse<UserInfo>(response);
  }

  /**
   * 修改密码
   */
  async changePassword(request: PasswordChangeRequest, token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: this.createHeaders(token),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || '密码修改失败');
    }
  }

  /**
   * 获取验证码
   */
  async getCaptcha(): Promise<CaptchaResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/captcha`, {
      method: 'GET',
      headers: this.createHeaders(),
    });

    return this.handleResponse<CaptchaResponse>(response);
  }

  /**
   * 检查用户权限
   */
  async checkPermission(request: PermissionRequest, token: string): Promise<PermissionResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/check-permission`, {
      method: 'POST',
      headers: this.createHeaders(token),
      body: JSON.stringify(request),
    });

    return this.handleResponse<PermissionResponse>(response);
  }

  /**
   * 获取用户列表（管理员）
   */
  async getUserList(token: string): Promise<{ users: UserInfo[] }> {
    const response = await fetch(`${this.baseUrl}/api/auth/admin/users`, {
      method: 'GET',
      headers: this.createHeaders(token),
    });

    return this.handleResponse<{ users: UserInfo[] }>(response);
  }

  /**
   * 创建用户（管理员）
   */
  async createUser(request: LoginRequest, token: string): Promise<UserInfo> {
    const response = await fetch(`${this.baseUrl}/api/auth/admin/users`, {
      method: 'POST',
      headers: this.createHeaders(token),
      body: JSON.stringify(request),
    });

    return this.handleResponse<UserInfo>(response);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; service: string }> {
    const response = await fetch(`${this.baseUrl}/api/auth/health`, {
      method: 'GET',
      headers: this.createHeaders(),
    });

    return this.handleResponse<{ status: string; service: string }>(response);
  }

  /**
   * 测试接口
   */
  async testEndpoint(): Promise<{ message: string; test_users: Record<string, string> }> {
    const response = await fetch(`${this.baseUrl}/api/auth/test`, {
      method: 'GET',
      headers: this.createHeaders(),
    });

    return this.handleResponse<{ message: string; test_users: Record<string, string> }>(response);
  }
}

// 默认实例
export const authApi = new AuthApi();

// 工具函数
export const isTokenExpired = (token: string): boolean => {
  try {
    if (!token) return true;
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return true;
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

export const getTokenPayload = (token: string): Record<string, unknown> | null => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    return JSON.parse(atob(parts[1]));
  } catch (error) {
    return null;
  }
};

export const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin');
};

export const hasRole = (userRole: string, requiredRole: string): boolean => {
  const roleHierarchy = {
    guest: 0,
    user: 1,
    admin: 2,
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}; 