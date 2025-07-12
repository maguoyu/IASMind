# RBAC 权限控制系统使用示例

## 概述

本项目实现了基于角色的访问控制（RBAC）系统，包含以下核心功能：

- **角色管理**：创建、编辑、删除角色，分配权限
- **权限管理**：定义系统权限，按资源和操作分类
- **权限控制**：通过组件和Hook实现细粒度权限控制
- **测试数据**：使用模拟数据，方便开发和测试

## 核心组件

### 1. 角色管理 (`RolesTab`)

位置：`web/src/app/system/tabs/roles-tab.tsx`

功能：
- 查看所有角色列表
- 创建新角色并分配权限
- 编辑现有角色（系统角色除外）
- 删除自定义角色
- 按资源分组显示权限

### 2. 权限管理 (`PermissionsTab`)

位置：`web/src/app/system/tabs/permissions-tab.tsx`

功能：
- 查看所有权限列表
- 创建新权限（指定资源和操作）
- 编辑现有权限
- 删除权限
- 按资源类型过滤权限

### 3. 权限控制守卫 (`RbacGuard`)

位置：`web/src/components/auth/rbac-guard.tsx`

功能：
- 基于权限和角色的访问控制
- 支持多种检查模式（all/any）
- 自定义无权限时的显示内容
- 提供Hook和高阶组件

## 使用示例

### 1. 在页面中使用权限控制

```tsx
import { RbacGuard } from '~/components/auth/rbac-guard';

function AdminPanel() {
  return (
    <RbacGuard
      requiredPermissions={[
        { resource: 'user', action: 'read' },
        { resource: 'system', action: 'config' }
      ]}
      mode="all"
      showDetails={true}
    >
      <div>管理员面板内容</div>
    </RbacGuard>
  );
}
```

### 2. 使用权限检查Hook

```tsx
import { usePermission } from '~/components/auth/rbac-guard';

function UserManagementButton() {
  const { hasPermission, loading } = usePermission('user', 'create');

  if (loading) return <div>检查权限中...</div>;
  
  if (!hasPermission) return null;

  return (
    <Button onClick={createUser}>
      创建用户
    </Button>
  );
}
```

### 3. 使用角色检查Hook

```tsx
import { useRole } from '~/components/auth/rbac-guard';

function AdminFeature() {
  const { hasRole } = useRole('admin');

  if (!hasRole) return null;

  return <div>管理员专用功能</div>;
}
```

### 4. 使用高阶组件

```tsx
import { WithPermission } from '~/components/auth/rbac-guard';

const UserListComponent = () => {
  return <div>用户列表</div>;
};

// 包装组件，只有有权限的用户才能看到
const ProtectedUserList = WithPermission(
  UserListComponent,
  [{ resource: 'user', action: 'read' }],
  {
    mode: 'all',
    showDetails: true,
    fallback: <div>您没有权限查看用户列表</div>
  }
);
```

## 测试数据

### 预定义角色

1. **超级管理员** (`role_super_admin`)
   - 拥有所有权限
   - 系统角色，不可删除

2. **管理员** (`role_admin`)
   - 用户管理、角色管理、系统配置权限
   - 系统角色，不可删除

3. **用户管理员** (`role_user_manager`)
   - 仅用户管理权限
   - 自定义角色，可编辑删除

4. **数据分析师** (`role_data_analyst`)
   - 数据查看和导出权限
   - 自定义角色，可编辑删除

5. **普通用户** (`role_regular_user`)
   - 仅数据查看权限
   - 系统角色，不可删除

### 预定义权限

#### 用户管理权限
- `perm_user_create`: 创建用户
- `perm_user_read`: 查看用户
- `perm_user_update`: 更新用户
- `perm_user_delete`: 删除用户

#### 角色管理权限
- `perm_role_create`: 创建角色
- `perm_role_read`: 查看角色
- `perm_role_update`: 更新角色
- `perm_role_delete`: 删除角色

#### 系统管理权限
- `perm_system_config`: 系统配置
- `perm_system_monitor`: 系统监控

#### 数据管理权限
- `perm_data_read`: 查看数据
- `perm_data_export`: 导出数据

## API 接口

### RBAC API (`rbacApi`)

位置：`web/src/core/api/rbac.ts`

主要方法：
- `GetRoles()`: 获取所有角色
- `CreateRole()`: 创建角色
- `UpdateRole()`: 更新角色
- `DeleteRole()`: 删除角色
- `GetPermissions()`: 获取所有权限
- `CreatePermission()`: 创建权限
- `UpdatePermission()`: 更新权限
- `DeletePermission()`: 删除权限
- `CheckPermission()`: 检查用户权限
- `AssignRoles()`: 为用户分配角色

## 系统管理页面

访问路径：`/system`

包含以下模块：
1. **用户管理**：管理用户账户
2. **角色管理**：管理角色和权限分配
3. **权限管理**：管理权限定义
4. **通用设置**：系统基础设置
5. **MCP 配置**：模型上下文协议配置

## 权限检查流程

1. **用户登录**：获取用户信息和访问令牌
2. **权限检查**：调用 `rbacApi.CheckPermission()` 检查权限
3. **角色验证**：基于用户角色进行权限验证
4. **访问控制**：根据检查结果显示或隐藏内容

## 扩展指南

### 添加新权限

1. 在 `rbacApi.getTestPermissions()` 中添加权限定义
2. 在相关角色中分配新权限
3. 在需要的组件中使用权限检查

### 添加新角色

1. 在 `rbacApi.getTestRoles()` 中添加角色定义
2. 为角色分配适当的权限
3. 在用户管理中设置角色选项

### 自定义权限检查

```tsx
// 自定义权限检查逻辑
const customPermissionCheck = async (user, resource, action) => {
  // 实现自定义权限检查逻辑
  return { allowed: true, reason: '' };
};
```

## 注意事项

1. **测试数据**：当前使用模拟数据，生产环境需要连接真实API
2. **权限缓存**：考虑实现权限缓存机制提高性能
3. **错误处理**：完善权限检查失败时的错误处理
4. **安全性**：前端权限控制仅用于UI展示，后端必须实现相应的权限验证

## 后续开发建议

1. **后端集成**：将模拟API替换为真实的后端接口
2. **权限缓存**：实现权限信息的客户端缓存
3. **审计日志**：记录权限变更和访问日志
4. **批量操作**：支持批量分配角色和权限
5. **权限继承**：实现角色继承和权限继承机制 