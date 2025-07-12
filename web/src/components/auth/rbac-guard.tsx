"use client";

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '~/core/store/auth-store';
import { rbacApi, HasPermission, HasRole } from '~/core/api/rbac';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { Shield, AlertTriangle, Lock } from 'lucide-react';

interface RbacGuardProps {
  children: React.ReactNode;
  // 权限检查
  requiredPermissions?: Array<{
    resource: string;
    action: string;
  }>;
  // 角色检查
  requiredRoles?: string[];
  // 检查模式：'all' 需要所有权限/角色，'any' 需要任一权限/角色
  mode?: 'all' | 'any';
  // 无权限时的显示内容
  fallback?: React.ReactNode;
  // 是否显示详细的权限错误信息
  showDetails?: boolean;
}

export function RbacGuard({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  mode = 'all',
  fallback,
  showDetails = false
}: RbacGuardProps) {
  const { user, accessToken } = useAuthStore();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    CheckAccess();
  }, [user, accessToken, requiredPermissions, requiredRoles, mode]);

  const CheckAccess = async () => {
    if (!user || !accessToken) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 如果没有指定任何权限或角色要求，则允许访问
      if (requiredPermissions.length === 0 && requiredRoles.length === 0) {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      let permissionCheck = true;
      let roleCheck = true;

      // 检查权限
      if (requiredPermissions.length > 0) {
        const permissionResults = await Promise.all(
          requiredPermissions.map(async (permission) => {
            try {
              const result = await rbacApi.CheckPermission(
                {
                  user_id: user.id,
                  resource: permission.resource,
                  action: permission.action
                },
                accessToken
              );
              return result.allowed;
            } catch (error) {
              console.error('权限检查失败:', error);
              return false;
            }
          })
        );

        if (mode === 'all') {
          permissionCheck = permissionResults.every(result => result);
        } else {
          permissionCheck = permissionResults.some(result => result);
        }
      }

      // 检查角色
      if (requiredRoles.length > 0) {
        const userRoles = [user.role]; // 简化处理，实际可能需要从用户信息中获取多个角色
        
        if (mode === 'all') {
          roleCheck = requiredRoles.every(role => HasRole(userRoles, role));
        } else {
          roleCheck = requiredRoles.some(role => HasRole(userRoles, role));
        }
      }

      // 最终访问权限
      const finalAccess = permissionCheck && roleCheck;
      setHasAccess(finalAccess);

    } catch (error: any) {
      console.error('权限检查出错:', error);
      setError(error.message || '权限检查失败');
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  // 加载中
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">权限检查中...</span>
      </div>
    );
  }

  // 检查出错
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          权限检查失败: {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={CheckAccess}
          >
            重试
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // 无权限访问
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          访问被拒绝
        </h3>
        <p className="text-gray-600 mb-4">
          您没有足够的权限访问此内容
        </p>
        
        {showDetails && (
          <div className="text-sm text-gray-500 space-y-2">
            {requiredPermissions.length > 0 && (
              <div>
                <p className="font-medium">需要的权限:</p>
                <ul className="list-disc list-inside">
                  {requiredPermissions.map((permission, index) => (
                    <li key={index}>
                      {permission.resource}:{permission.action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {requiredRoles.length > 0 && (
              <div>
                <p className="font-medium">需要的角色:</p>
                <ul className="list-disc list-inside">
                  {requiredRoles.map((role, index) => (
                    <li key={index}>{role}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <p className="text-xs">
              检查模式: {mode === 'all' ? '需要所有权限' : '需要任一权限'}
            </p>
          </div>
        )}
        
        <Button 
          variant="outline" 
          onClick={() => window.history.back()}
          className="mt-4"
        >
          返回上一页
        </Button>
      </div>
    );
  }

  // 有权限，渲染子组件
  return <>{children}</>;
}

// 简化的权限检查Hook
export function usePermission(resource: string, action: string) {
  const { user, accessToken } = useAuthStore();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CheckPermission();
  }, [user, accessToken, resource, action]);

  const CheckPermission = async () => {
    if (!user || !accessToken) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await rbacApi.CheckPermission(
        {
          user_id: user.id,
          resource,
          action
        },
        accessToken
      );
      setHasPermission(result.allowed);
    } catch (error) {
      console.error('权限检查失败:', error);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasPermission, loading, CheckPermission };
}

// 简化的角色检查Hook
export function useRole(requiredRole: string) {
  const { user } = useAuthStore();
  
  const hasRole = user ? HasRole([user.role], requiredRole) : false;
  
  return { hasRole };
}

// 权限控制的高阶组件
export function WithPermission<T extends {}>(
  Component: React.ComponentType<T>,
  requiredPermissions: Array<{ resource: string; action: string }>,
  options: {
    mode?: 'all' | 'any';
    fallback?: React.ReactNode;
    showDetails?: boolean;
  } = {}
) {
  return function PermissionWrappedComponent(props: T) {
    return (
      <RbacGuard
        requiredPermissions={requiredPermissions}
        mode={options.mode}
        fallback={options.fallback}
        showDetails={options.showDetails}
      >
        <Component {...props} />
      </RbacGuard>
    );
  };
}

// 角色控制的高阶组件
export function WithRole<T extends {}>(
  Component: React.ComponentType<T>,
  requiredRoles: string[],
  options: {
    mode?: 'all' | 'any';
    fallback?: React.ReactNode;
    showDetails?: boolean;
  } = {}
) {
  return function RoleWrappedComponent(props: T) {
    return (
      <RbacGuard
        requiredRoles={requiredRoles}
        mode={options.mode}
        fallback={options.fallback}
        showDetails={options.showDetails}
      >
        <Component {...props} />
      </RbacGuard>
    );
  };
} 