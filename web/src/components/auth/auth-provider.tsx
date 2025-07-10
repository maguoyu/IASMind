"use client";

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '~/core/store/auth-store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { 
    isAuthenticated, 
    accessToken, 
    user, 
    checkSession, 
    setupAutoRefresh, 
    clearAuth,
    getCurrentUser 
  } = useAuthStore();
  
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthProvider: Starting initialization...');
      console.log('AuthProvider: Current state - isAuthenticated:', isAuthenticated, 'accessToken:', !!accessToken, 'user:', !!user);
      
      try {
        // 检查是否有持久化的认证信息
        if (isAuthenticated && accessToken) {
          console.log('AuthProvider: Found persisted auth state, validating...');
          
          // 如果有用户信息，直接设置自动刷新
          if (user) {
            console.log('AuthProvider: User info found, setting up auto refresh');
            setupAutoRefresh();
          } else {
            // 如果没有用户信息，尝试获取
            console.log('AuthProvider: No user info, trying to get current user');
            try {
              await getCurrentUser();
              setupAutoRefresh();
              console.log('AuthProvider: Successfully got current user');
            } catch (error) {
              console.error('AuthProvider: Failed to get current user:', error);
              // 只有在明确失败时才清除认证状态
              if (error instanceof Error && error.message.includes('401')) {
                console.log('AuthProvider: Clearing auth due to 401 error');
                clearAuth();
              }
            }
          }
        } else {
          console.log('AuthProvider: No persisted auth state found');
        }
      } catch (error) {
        console.error('AuthProvider: Auth initialization error:', error);
        // 不要在这里清除认证状态，让用户自己决定
      } finally {
        console.log('AuthProvider: Initialization complete');
        setIsInitialized(true);
      }
    };

    // 延迟初始化，确保store已经加载
    const timer = setTimeout(initializeAuth, 200);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, accessToken, user, checkSession, setupAutoRefresh, clearAuth, getCurrentUser]);

  // 在初始化完成前显示加载状态
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在初始化...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 