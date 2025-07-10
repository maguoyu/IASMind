# IAS_Mind 认证系统使用指南

## 概述

IAS_Mind 系统已成功集成了基于 OAuth2 的用户认证系统，采用国密加密技术（SM2、SM3、SM4）保护数据安全。本系统提供完整的用户管理、权限控制和会话管理功能。

## 功能特性

### 🔐 安全特性
- **国密加密**：采用 SM2、SM3、SM4 国密算法
- **JWT 令牌**：基于 JWT 的访问令牌和刷新令牌机制
- **会话管理**：支持会话超时和活动监控
- **密码保护**：密码采用加盐哈希存储
- **访问控制**：基于角色和权限的访问控制

### 👥 用户管理
- **多角色支持**：管理员、用户、访客三种角色
- **权限细化**：支持读取、写入、删除等细粒度权限
- **用户状态**：活跃、不活跃、已停用状态管理
- **用户信息**：支持用户名、邮箱、头像等信息

### 🛡️ 认证流程
- **OAuth2 兼容**：支持标准 OAuth2 授权码流程
- **自动刷新**：令牌过期前自动刷新
- **路由保护**：未认证用户自动重定向到登录页
- **验证码**：支持图形验证码防止暴力破解

## 测试用户

系统预设了三个测试用户供开发和测试使用：

| 用户名 | 密码 | 角色 | 权限 |
|--------|------|------|------|
| admin | admin123 | 管理员 | 全部权限 |
| testuser | user123 | 用户 | 读取、写入 |
| guest | guest123 | 访客 | 仅读取 |

## API 接口

### 认证接口

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123",
  "captcha": "1234",
  "remember_me": false
}
```

#### 用户登出
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refresh_token": "<refresh_token>"
}
```

#### 刷新令牌
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "<refresh_token>"
}
```

#### 获取用户信息
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

#### 获取验证码
```http
GET /api/auth/captcha
```

### 管理员接口

#### 获取用户列表
```http
GET /api/auth/admin/users
Authorization: Bearer <admin_access_token>
```

#### 创建用户
```http
POST /api/auth/admin/users
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com",
  "role": "user"
}
```

### OAuth2 接口

#### 授权页面
```http
GET /api/auth/oauth2/authorize?client_id=iasmind-client&response_type=code&redirect_uri=http://localhost:3000/callback&scope=read
```

#### 令牌交换
```http
POST /api/auth/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=<authorization_code>&redirect_uri=http://localhost:3000/callback&client_id=iasmind-client
```

## 前端组件

### 认证组件

#### AuthGuard - 路由保护
```tsx
import { AuthGuard } from '~/components/auth/auth-guard';

// 保护整个页面
<AuthGuard>
  <YourComponent />
</AuthGuard>

// 带角色要求
<AuthGuard requiredRole="admin">
  <AdminComponent />
</AuthGuard>

// 带权限要求
<AuthGuard requiredPermissions={['read', 'write']}>
  <ProtectedComponent />
</AuthGuard>
```

#### ConditionalRender - 条件渲染
```tsx
import { ConditionalRender } from '~/components/auth/auth-guard';

// 仅登录用户可见
<ConditionalRender condition="authenticated">
  <UserMenu />
</ConditionalRender>

// 仅管理员可见
<ConditionalRender condition="role" role="admin">
  <AdminPanel />
</ConditionalRender>

// 基于权限显示
<ConditionalRender condition="permission" permissions={['delete']}>
  <DeleteButton />
</ConditionalRender>
```

### 状态管理

#### 使用 AuthStore
```tsx
import { useAuthStore } from '~/core/store/auth-store';

function MyComponent() {
  const { 
    user, 
    isAuthenticated, 
    login, 
    logout, 
    hasPermission, 
    hasRole 
  } = useAuthStore();

  const handleLogin = async () => {
    const success = await login({
      username: 'admin',
      password: 'admin123'
    });
    
    if (success) {
      // 登录成功
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>欢迎，{user?.username}!</p>
          <button onClick={logout}>登出</button>
        </div>
      ) : (
        <button onClick={handleLogin}>登录</button>
      )}
    </div>
  );
}
```

## 页面路由

### 认证相关页面

- `/auth/login` - 登录页面
- `/auth/users` - 用户管理页面（需要管理员权限）
- `/dashboard` - 用户仪表板（需要登录）

### 访问控制

- **公共页面**：登录页面、健康检查、文档等
- **受保护页面**：需要登录才能访问
- **管理员页面**：需要管理员角色才能访问

## 部署配置

### 环境变量

#### 后端环境变量
```bash
# JWT 配置
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth2 配置
OAUTH2_CLIENT_ID=iasmind-client
OAUTH2_CLIENT_SECRET=iasmind-secret
OAUTH2_REDIRECT_URI=http://localhost:3000/auth/callback
```

#### 前端环境变量
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 依赖包

#### Python 依赖
```bash
pip install pycryptodome pyjwt python-jose[cryptography] pillow
```

#### Node.js 依赖
```bash
npm install zustand
```

## 安全建议

### 生产环境配置
1. **密钥管理**：使用强随机密钥，定期轮换
2. **HTTPS**：强制使用 HTTPS 传输
3. **令牌过期**：设置合理的令牌过期时间
4. **密码策略**：实施强密码策略
5. **审计日志**：记录认证和授权事件

### 国密加密
- SM2：用于数字签名和密钥交换
- SM3：用于数据摘要和完整性校验
- SM4：用于对称加密和数据保护

## 故障排除

### 常见问题

#### 1. 登录失败
- 检查用户名和密码是否正确
- 验证验证码是否有效
- 确认用户状态是否为活跃

#### 2. 权限不足
- 检查用户角色和权限
- 确认令牌是否有效
- 验证路由保护配置

#### 3. 会话过期
- 检查令牌是否过期
- 确认自动刷新机制是否正常
- 验证会话超时设置

#### 4. 验证码问题
- 刷新页面重新获取验证码
- 检查验证码接口是否正常
- 确认验证码图片加载正常

## 开发指南

### 添加新角色
1. 在 `UserRole` 枚举中添加新角色
2. 更新角色层级关系
3. 配置角色对应的权限
4. 更新前端组件的角色检查

### 添加新权限
1. 在权限列表中添加新权限标识
2. 更新权限检查逻辑
3. 在用户创建时分配权限
4. 更新前端权限检查

### 自定义加密算法
1. 实现新的加密类
2. 更新 `GuoMiCrypto` 类
3. 测试加密和解密功能
4. 更新配置文件

## 更新日志

### v1.0.0 (2025-01-XX)
- ✅ 实现基于 OAuth2 的认证系统
- ✅ 集成国密加密算法（SM2、SM3、SM4）
- ✅ 完成用户管理和权限控制
- ✅ 创建前端登录界面和仪表板
- ✅ 实现路由保护和状态管理
- ✅ 添加测试用户和示例数据

---

## 联系信息

如有问题或建议，请联系开发团队或查看项目文档。

© 2025 IAS_Mind. 采用国密加密技术保护您的数据安全。 