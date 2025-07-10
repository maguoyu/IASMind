// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

/**
 * 认证状态管理store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  authApi, 
  LoginRequest, 
  LoginResponse, 
  UserInfo, 
  UserUpdateRequest, 
  PasswordChangeRequest,
  RefreshTokenRequest,
  LogoutRequest,
  isTokenExpired,
  getTokenPayload
} from '~/core/api/auth';

interface AuthState {
  // 认证状态
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 用户信息
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;
  
  // 权限信息
  permissions: string[];
  role: 'admin' | 'user' | 'guest' | null;
  
  // 会话信息
  sessionId: string | null;
  loginTime: number | null;
  lastActivity: number | null;
}

interface AuthActions {
  // 登录相关
  login: (request: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  
  // 用户信息相关
  getCurrentUser: () => Promise<UserInfo | null>;
  updateCurrentUser: (request: UserUpdateRequest) => Promise<UserInfo | null>;
  changePassword: (request: PasswordChangeRequest) => Promise<boolean>;
  
  // 权限检查
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  
  // 状态管理
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  
  // 自动刷新
  setupAutoRefresh: () => void;
  clearAutoRefresh: () => void;
  
  // 会话管理
  updateActivity: () => void;
  checkSession: () => boolean;
}

type AuthStore = AuthState & AuthActions;

// 自动刷新定时器
let refreshTimer: NodeJS.Timeout | null = null;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      isAuthenticated: false,
      isLoading: false,
      error: null,
      user: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      permissions: [],
      role: null,
      sessionId: null,
      loginTime: null,
      lastActivity: null,

      // 登录
      login: async (request: LoginRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response: LoginResponse = await authApi.login(request);
          
          const tokenPayload = getTokenPayload(response.access_token);
          const sessionId = tokenPayload?.session_id;
          const expiry = tokenPayload?.exp;
          
          const newState: Partial<AuthState> = {
            isAuthenticated: true,
            isLoading: false,
            error: null,
            user: response.user_info,
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            tokenExpiry: expiry,
            permissions: response.user_info.permissions,
            role: response.user_info.role,
            sessionId,
            loginTime: Date.now(),
            lastActivity: Date.now()
          };
          
          set(newState);
          
          // 设置自动刷新
          get().setupAutoRefresh();
          
          return true;
        } catch (error: any) {
          set({ 
            isLoading: false, 
            error: error.message || '登录失败' 
          });
          return false;
        }
      },

      // 登出
      logout: async () => {
        const { refreshToken: currentRefreshToken, accessToken } = get();
        
        set({ isLoading: true });
        
        try {
          if (currentRefreshToken && accessToken) {
            const logoutRequest: LogoutRequest = {
              refresh_token: currentRefreshToken
            };
            await authApi.logout(logoutRequest, accessToken);
          }
        } catch (error) {
          console.error('登出请求失败:', error);
        } finally {
          get().clearAuth();
        }
      },

      // 刷新访问令牌
      refreshAccessToken: async () => {
        const { refreshToken: currentRefreshToken } = get();
        
        if (!currentRefreshToken) {
          return false;
        }
        
        try {
          const refreshRequest: RefreshTokenRequest = {
            refresh_token: currentRefreshToken
          };
          
          const response: LoginResponse = await authApi.refreshToken(refreshRequest);
          
          const tokenPayload = getTokenPayload(response.access_token);
          const sessionId = tokenPayload?.session_id;
          const expiry = tokenPayload?.exp;
          
          set({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            tokenExpiry: expiry,
            sessionId,
            user: response.user_info,
            permissions: response.user_info.permissions,
            role: response.user_info.role,
            lastActivity: Date.now()
          });
          
          return true;
        } catch (error: any) {
          console.error('刷新令牌失败:', error);
          get().clearAuth();
          return false;
        }
      },

      // 获取当前用户信息
      getCurrentUser: async () => {
        const { accessToken } = get();
        
        if (!accessToken) {
          return null;
        }
        
        try {
          const user = await authApi.getCurrentUser(accessToken);
          set({ user, permissions: user.permissions, role: user.role });
          return user;
        } catch (error: any) {
          console.error('获取用户信息失败:', error);
          return null;
        }
      },

      // 更新用户信息
      updateCurrentUser: async (request: UserUpdateRequest) => {
        const { accessToken } = get();
        
        if (!accessToken) {
          return null;
        }
        
        try {
          const user = await authApi.updateCurrentUser(request, accessToken);
          set({ user });
          return user;
        } catch (error: any) {
          set({ error: error.message });
          return null;
        }
      },

      // 修改密码
      changePassword: async (request: PasswordChangeRequest) => {
        const { accessToken } = get();
        
        if (!accessToken) {
          return false;
        }
        
        try {
          await authApi.changePassword(request, accessToken);
          return true;
        } catch (error: any) {
          set({ error: error.message });
          return false;
        }
      },

      // 检查权限
      hasPermission: (permission: string) => {
        const { permissions, role } = get();
        
        if (role === 'admin') {
          return true;
        }
        
        return permissions.includes(permission);
      },

      // 检查角色
      hasRole: (requiredRole: string) => {
        const { role } = get();
        
        if (!role) {
          return false;
        }
        
        const roleHierarchy = {
          guest: 0,
          user: 1,
          admin: 2,
        };
        
        const userLevel = roleHierarchy[role] || 0;
        const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
        
        return userLevel >= requiredLevel;
      },

      // 设置错误
      setError: (error: string | null) => {
        set({ error });
      },

      // 设置加载状态
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // 清除认证信息
      clearAuth: () => {
        get().clearAutoRefresh();
        
        set({
          isAuthenticated: false,
          isLoading: false,
          error: null,
          user: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null,
          permissions: [],
          role: null,
          sessionId: null,
          loginTime: null,
          lastActivity: null
        });
      },

      // 设置自动刷新
      setupAutoRefresh: () => {
        get().clearAutoRefresh();
        
        const { tokenExpiry } = get();
        
        if (tokenExpiry) {
          const currentTime = Math.floor(Date.now() / 1000); // 转换为秒
          // 在令牌过期前5分钟开始刷新
          const refreshTime = (tokenExpiry - currentTime - 300) * 1000; // 转换为毫秒
          
          if (refreshTime > 0) {
            refreshTimer = setTimeout(async () => {
              const success = await get().refreshAccessToken();
              if (success) {
                get().setupAutoRefresh(); // 设置下次刷新
              }
            }, refreshTime);
          }
        }
      },

      // 清除自动刷新
      clearAutoRefresh: () => {
        if (refreshTimer) {
          clearTimeout(refreshTimer);
          refreshTimer = null;
        }
      },

      // 更新活动时间
      updateActivity: () => {
        set({ lastActivity: Date.now() });
      },

      // 检查会话
      checkSession: () => {
        const { accessToken, tokenExpiry, lastActivity } = get();
        
        if (!accessToken) {
          return false;
        }
        
        // 检查令牌是否过期 - 修复时间戳比较
        if (tokenExpiry) {
          const currentTime = Math.floor(Date.now() / 1000); // 转换为秒
          
          if (currentTime > tokenExpiry) {
            // 尝试自动刷新token
            get().refreshAccessToken().then(success => {
              if (!success) {
                get().clearAuth();
              }
            });
            return false;
          }
        }
        
        // 检查会话是否超时（4小时无活动）
        if (lastActivity && Date.now() - lastActivity > 4 * 60 * 60 * 1000) {
          return false;
        }
        
        return true;
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tokenExpiry: state.tokenExpiry,
        permissions: state.permissions,
        role: state.role,
        sessionId: state.sessionId,
        loginTime: state.loginTime,
        lastActivity: state.lastActivity
      })
    }
  )
);

// 初始化时检查会话
if (typeof window !== 'undefined') {
  const checkInitialSession = () => {
    const store = useAuthStore.getState();
    
    // 只有在有认证信息时才进行检查
    if (store.isAuthenticated && store.accessToken) {
      
      // 检查令牌是否过期 - 修复时间戳比较
      if (store.tokenExpiry) {
        const currentTime = Math.floor(Date.now() / 1000); // 转换为秒
        
        if (currentTime > store.tokenExpiry) {
          store.clearAuth();
        } else {
          // 如果令牌未过期，设置自动刷新
          store.setupAutoRefresh();
        }
      }
    }
  };
  
  // 延迟检查，确保store已经加载
  setTimeout(checkInitialSession, 300);
  
  // 监听页面可见性变化
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(checkInitialSession, 300);
    }
  });
  
  // 监听用户活动
  const updateActivity = () => {
    const store = useAuthStore.getState();
    if (store.isAuthenticated) {
      store.updateActivity();
    }
  };
  
  ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, updateActivity, { passive: true });
  });
} 