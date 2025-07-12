// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

/**
 * RBAC (Role-Based Access Control) 相关API接口
 */

import { env } from '~/env';

// 确保API_BASE_URL不包含/api路径，避免重复
const API_BASE_URL = (env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/api\/?$/, '');

// 权限类型定义
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;  // 资源类型，如 'user', 'role', 'system'
  action: string;    // 操作类型，如 'create', 'read', 'update', 'delete'
  created_at: string;
  updated_at: string;
}

// 角色类型定义
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  is_system: boolean;  // 是否为系统角色（不可删除）
  created_at: string;
  updated_at: string;
}

// 用户角色关联
export interface UserRole {
  user_id: string;
  role_id: string;
  assigned_by: string;
  assigned_at: string;
}

// 请求类型
export interface CreateRoleRequest {
  name: string;
  description: string;
  permission_ids: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permission_ids?: string[];
}

export interface CreatePermissionRequest {
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface UpdatePermissionRequest {
  name?: string;
  description?: string;
  resource?: string;
  action?: string;
}

export interface AssignRoleRequest {
  user_id: string;
  role_ids: string[];
}

export interface CheckPermissionRequest {
  user_id: string;
  resource: string;
  action: string;
}

export interface CheckPermissionResponse {
  allowed: boolean;
  reason?: string;
}

// RBAC API类
export class RbacApi {
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

  // ===================
  // 权限管理API
  // ===================

  /**
   * 获取所有权限
   */
  async GetPermissions(token: string): Promise<Permission[]> {
    // 使用测试数据
    return this.getTestPermissions();
  }

  /**
   * 创建权限
   */
  async CreatePermission(request: CreatePermissionRequest, token: string): Promise<Permission> {
    // 模拟创建权限
    const newPermission: Permission = {
      id: `perm_${Date.now()}`,
      name: request.name,
      description: request.description,
      resource: request.resource,
      action: request.action,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return newPermission;
  }

  /**
   * 更新权限
   */
  async UpdatePermission(id: string, request: UpdatePermissionRequest, token: string): Promise<Permission> {
    // 模拟更新权限
    const permissions = await this.GetPermissions(token);
    const permission = permissions.find(p => p.id === id);
    if (!permission) {
      throw new Error('权限不存在');
    }

    return {
      ...permission,
      ...request,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * 删除权限
   */
  async DeletePermission(id: string, token: string): Promise<void> {
    // 模拟删除权限
    console.log(`删除权限: ${id}`);
  }

  // ===================
  // 角色管理API
  // ===================

  /**
   * 获取所有角色
   */
  async GetRoles(token: string): Promise<Role[]> {
    // 使用测试数据
    return this.getTestRoles();
  }

  /**
   * 创建角色
   */
  async CreateRole(request: CreateRoleRequest, token: string): Promise<Role> {
    const permissions = await this.GetPermissions(token);
    const rolePermissions = permissions.filter(p => request.permission_ids.includes(p.id));
    
    const newRole: Role = {
      id: `role_${Date.now()}`,
      name: request.name,
      description: request.description,
      permissions: rolePermissions,
      is_system: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return newRole;
  }

  /**
   * 更新角色
   */
  async UpdateRole(id: string, request: UpdateRoleRequest, token: string): Promise<Role> {
    const roles = await this.GetRoles(token);
    const role = roles.find(r => r.id === id);
    if (!role) {
      throw new Error('角色不存在');
    }

    if (role.is_system) {
      throw new Error('系统角色不能修改');
    }

    let permissions = role.permissions;
    if (request.permission_ids) {
      const allPermissions = await this.GetPermissions(token);
      permissions = allPermissions.filter(p => request.permission_ids!.includes(p.id));
    }

    return {
      ...role,
      name: request.name ?? role.name,
      description: request.description ?? role.description,
      permissions,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * 删除角色
   */
  async DeleteRole(id: string, token: string): Promise<void> {
    const roles = await this.GetRoles(token);
    const role = roles.find(r => r.id === id);
    if (!role) {
      throw new Error('角色不存在');
    }

    if (role.is_system) {
      throw new Error('系统角色不能删除');
    }

    console.log(`删除角色: ${id}`);
  }

  /**
   * 为用户分配角色
   */
  async AssignRoles(request: AssignRoleRequest, token: string): Promise<void> {
    console.log(`为用户 ${request.user_id} 分配角色:`, request.role_ids);
  }

  /**
   * 检查用户权限
   */
  async CheckPermission(request: CheckPermissionRequest, token: string): Promise<CheckPermissionResponse> {
    // 模拟权限检查
    const isAllowed = Math.random() > 0.3; // 70%的概率允许
    return {
      allowed: isAllowed,
      reason: isAllowed ? undefined : '权限不足',
    };
  }

  // ===================
  // 测试数据
  // ===================

  private getTestPermissions(): Permission[] {
    return [
      // 用户管理权限
      {
        id: 'perm_user_create',
        name: '创建用户',
        description: '允许创建新用户',
        resource: 'user',
        action: 'create',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'perm_user_read',
        name: '查看用户',
        description: '允许查看用户信息',
        resource: 'user',
        action: 'read',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'perm_user_update',
        name: '更新用户',
        description: '允许更新用户信息',
        resource: 'user',
        action: 'update',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'perm_user_delete',
        name: '删除用户',
        description: '允许删除用户',
        resource: 'user',
        action: 'delete',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      // 角色管理权限
      {
        id: 'perm_role_create',
        name: '创建角色',
        description: '允许创建新角色',
        resource: 'role',
        action: 'create',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'perm_role_read',
        name: '查看角色',
        description: '允许查看角色信息',
        resource: 'role',
        action: 'read',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'perm_role_update',
        name: '更新角色',
        description: '允许更新角色信息',
        resource: 'role',
        action: 'update',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'perm_role_delete',
        name: '删除角色',
        description: '允许删除角色',
        resource: 'role',
        action: 'delete',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      // 系统管理权限
      {
        id: 'perm_system_config',
        name: '系统配置',
        description: '允许修改系统配置',
        resource: 'system',
        action: 'config',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'perm_system_monitor',
        name: '系统监控',
        description: '允许查看系统监控信息',
        resource: 'system',
        action: 'monitor',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      // 数据管理权限
      {
        id: 'perm_data_read',
        name: '查看数据',
        description: '允许查看业务数据',
        resource: 'data',
        action: 'read',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'perm_data_export',
        name: '导出数据',
        description: '允许导出业务数据',
        resource: 'data',
        action: 'export',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];
  }

  private getTestRoles(): Role[] {
    const permissions = this.getTestPermissions();
    
    return [
      {
        id: 'role_super_admin',
        name: '超级管理员',
        description: '拥有所有权限的超级管理员',
        permissions: permissions,
        is_system: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'role_admin',
        name: '管理员',
        description: '拥有用户管理和系统配置权限',
        permissions: permissions.filter(p => 
          p.resource === 'user' || 
          p.resource === 'role' || 
          (p.resource === 'system' && p.action === 'config')
        ),
        is_system: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'role_user_manager',
        name: '用户管理员',
        description: '负责用户管理的角色',
        permissions: permissions.filter(p => p.resource === 'user'),
        is_system: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'role_data_analyst',
        name: '数据分析师',
        description: '负责数据分析的角色',
        permissions: permissions.filter(p => p.resource === 'data'),
        is_system: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'role_regular_user',
        name: '普通用户',
        description: '普通用户角色，只能查看数据',
        permissions: permissions.filter(p => p.action === 'read' && p.resource === 'data'),
        is_system: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];
  }
}

// 导出API实例
export const rbacApi = new RbacApi();

// 权限检查辅助函数
export const HasPermission = (userPermissions: string[], resource: string, action: string): boolean => {
  const permissionKey = `${resource}:${action}`;
  return userPermissions.includes(permissionKey) || userPermissions.includes('*:*');
};

// 角色检查辅助函数
export const HasRole = (userRoles: string[], requiredRole: string): boolean => {
  return userRoles.includes(requiredRole) || userRoles.includes('super_admin');
}; 