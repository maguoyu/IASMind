"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '~/core/store/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'admin' | 'user' | 'guest';
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
}

/**
 * 认证守卫组件
 * 用于保护需要认证的页面
 */
export function AuthGuard({ 
  children, 
  requireAuth = true, 
  requiredRole,
  requiredPermissions = [],
  fallback = <LoadingSpinner />
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    hasRole, 
    hasPermission, 
    checkSession 
  } = useAuthStore();
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    // 客户端初始化后检查认证状态
    if (typeof window !== 'undefined') {
      setIsInitialized(true);
      
      // 检查会话是否有效
      if (isAuthenticated && !checkSession()) {
        // 会话无效，重定向到登录页
        router.push(`/auth/login?redirect_uri=${encodeURIComponent(pathname)}`);
        return;
      }
    }
  }, [isAuthenticated, checkSession, router, pathname]);
  
  // 如果未初始化，显示加载状态
  if (!isInitialized) {
    return fallback;
  }
  
  // 如果不需要认证，直接渲染子组件
  if (!requireAuth) {
    return <>{children}</>;
  }
  
  // 如果正在加载，显示加载状态
  if (isLoading) {
    return fallback;
  }
  
  // 如果未认证，重定向到登录页
  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      router.push(`/auth/login?redirect_uri=${encodeURIComponent(pathname)}`);
    }
    return fallback;
  }
  
  // 检查角色权限
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">访问被拒绝</h2>
          <p className="text-gray-600">您没有足够的权限访问此页面</p>
          <p className="text-sm text-gray-500 mt-2">
            需要角色: {requiredRole}，当前角色: {user?.role}
          </p>
        </div>
      </div>
    );
  }
  
  // 检查具体权限
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => hasPermission(permission));
    
    if (!hasAllPermissions) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">权限不足</h2>
            <p className="text-gray-600">您没有足够的权限访问此页面</p>
            <p className="text-sm text-gray-500 mt-2">
              需要权限: {requiredPermissions.join(', ')}
            </p>
          </div>
        </div>
      );
    }
  }
  
  // 认证通过，渲染子组件
  return <>{children}</>;
}

/**
 * 加载状态组件
 */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">正在验证身份...</p>
      </div>
    </div>
  );
}

/**
 * 角色保护组件
 */
interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: 'admin' | 'user' | 'guest';
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, requiredRole, fallback }: RoleGuardProps) {
  return (
    <AuthGuard 
      requireAuth={true} 
      requiredRole={requiredRole}
      fallback={fallback}
    >
      {children}
    </AuthGuard>
  );
}

/**
 * 权限保护组件
 */
interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermissions: string[];
  fallback?: React.ReactNode;
}

export function PermissionGuard({ children, requiredPermissions, fallback }: PermissionGuardProps) {
  return (
    <AuthGuard 
      requireAuth={true} 
      requiredPermissions={requiredPermissions}
      fallback={fallback}
    >
      {children}
    </AuthGuard>
  );
}

/**
 * 管理员保护组件
 */
interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminGuard({ children, fallback }: AdminGuardProps) {
  return (
    <RoleGuard requiredRole="admin" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/**
 * 条件渲染组件 - 根据权限显示/隐藏内容
 */
interface ConditionalRenderProps {
  children: React.ReactNode;
  condition: 'authenticated' | 'unauthenticated' | 'role' | 'permission';
  role?: 'admin' | 'user' | 'guest';
  permissions?: string[];
}

export function ConditionalRender({ 
  children, 
  condition, 
  role, 
  permissions = [] 
}: ConditionalRenderProps) {
  const { isAuthenticated, hasRole, hasPermission } = useAuthStore();
  
  let shouldRender = false;
  
  switch (condition) {
    case 'authenticated':
      shouldRender = isAuthenticated;
      break;
    case 'unauthenticated':
      shouldRender = !isAuthenticated;
      break;
    case 'role':
      shouldRender = isAuthenticated && role ? hasRole(role) : false;
      break;
    case 'permission':
      shouldRender = isAuthenticated && permissions.every(permission => hasPermission(permission));
      break;
  }
  
  return shouldRender ? <>{children}</> : null;
} 