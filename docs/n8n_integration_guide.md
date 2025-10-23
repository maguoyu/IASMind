# n8n 工作流集成指南

## 概述

本系统已完整集成 n8n 工作流自动化平台，提供了完整的工作流管理和执行功能。

## 功能特性

### 1. 工作流管理
- ✅ 查看所有工作流列表
- ✅ 查看工作流详细信息
- ✅ 激活/停用工作流
- ✅ 手动执行工作流
- ✅ 删除工作流

### 2. 执行记录管理
- ✅ 查看所有执行记录
- ✅ 按工作流过滤执行记录
- ✅ 查看执行详情和数据
- ✅ 实时状态显示（成功/失败/等待/运行中）

### 3. 健康监控
- ✅ n8n 服务健康状态检查
- ✅ API 连接状态显示

## 配置说明

### 1. 环境变量配置

#### 后端配置

在项目根目录创建 `.env` 文件（可以复制 `env.example`），添加以下配置：

```bash
# n8n 工作流配置
N8N_API_URL=http://172.20.0.113:15678/api/v1
N8N_API_KEY=your_n8n_api_key
```

**配置说明：**
- `N8N_API_URL`: n8n API 地址，格式为 `http://host:port/api/v1`
- `N8N_API_KEY`: n8n API 密钥，在 n8n 设置中获取

#### 前端配置

在 `web` 目录创建 `.env.local` 文件（可选）：

```bash
# API 基础 URL（可选，默认为 http://localhost:8000）
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**注意：**
- `NEXT_PUBLIC_API_URL` 不要包含 `/api` 后缀
- 如果后端运行在其他地址，需要修改此配置

### 2. 获取 n8n API 密钥

1. 登录 n8n 管理界面
2. 进入 Settings（设置）→ API
3. 点击 "Create API Key"（创建 API 密钥）
4. 复制生成的密钥到 `.env` 文件中

## 架构设计

### 后端架构

```
┌─────────────────┐
│   前端页面      │
│  /app/n8n       │
└────────┬────────┘
         │
         ↓ HTTP 请求
┌─────────────────┐
│  Python API     │
│  /api/n8n/*     │
└────────┬────────┘
         │
         ↓ 代理请求
┌─────────────────┐
│  n8n API        │
│  http://...     │
└─────────────────┘
```

### 文件结构

```
├── src/server/routers/
│   └── n8n_router.py          # 后端 API 路由
├── web/src/
│   ├── core/api/
│   │   └── n8n.ts             # API 客户端
│   └── app/n8n/
│       └── page.tsx           # 前端页面组件
└── env.example                # 环境变量示例
```

## API 接口说明

### 1. 工作流接口

#### 获取工作流列表
```
GET /api/n8n/workflows?limit=100&active=true
```

#### 获取工作流详情
```
GET /api/n8n/workflows/{workflow_id}
```

#### 激活/停用工作流
```
POST /api/n8n/workflows/{workflow_id}/activate
Content-Type: application/json

{
  "active": true
}
```

#### 执行工作流
```
POST /api/n8n/workflows/{workflow_id}/execute
Content-Type: application/json

{
  "workflow_data": {}
}
```

#### 删除工作流
```
DELETE /api/n8n/workflows/{workflow_id}
```

### 2. 执行记录接口

#### 获取执行记录列表
```
GET /api/n8n/executions?limit=100&workflow_id=xxx&status=success
```

#### 获取执行详情
```
GET /api/n8n/executions/{execution_id}
```

#### 删除执行记录
```
DELETE /api/n8n/executions/{execution_id}
```

### 3. 健康检查接口

```
GET /api/n8n/health
```

返回示例：
```json
{
  "status": "healthy",
  "api_url": "http://172.20.0.113:15678/api/v1",
  "api_key_configured": true
}
```

## 使用指南

### 1. 启动服务

#### 后端服务
```bash
# 确保已配置 .env 文件
python server.py --host 0.0.0.0 --port 8000
```

#### 前端服务
```bash
cd web
pnpm install
pnpm dev
```

### 2. 访问页面

打开浏览器访问：`http://localhost:3000/n8n`

### 3. 功能使用

#### 查看工作流
1. 在左侧"工作流"标签页查看所有工作流
2. 点击工作流卡片查看详情
3. 右侧显示工作流基本信息和执行记录

#### 执行工作流
1. 点击工作流卡片右侧的菜单按钮
2. 选择"执行"
3. 或在详情页点击"执行工作流"按钮

#### 激活/停用工作流
1. 点击工作流卡片右侧的菜单按钮
2. 选择"激活"或"停用"

#### 查看执行记录
1. 切换到"执行记录"标签页
2. 点击执行记录查看详情
3. 查看执行状态、时间和数据

## 状态说明

### 工作流状态
- 🟢 **已激活**: 工作流处于运行状态，可被触发器自动执行
- ⚪ **未激活**: 工作流处于停用状态，只能手动执行

### 执行状态
- ✅ **成功**: 执行完成，所有节点成功
- ❌ **失败**: 执行失败，有节点出错
- ⏳ **等待**: 执行等待中
- 🔄 **运行中**: 正在执行

## 技术栈

### 后端
- **FastAPI**: Python Web 框架
- **httpx**: HTTP 客户端（异步）
- **Pydantic**: 数据验证

### 前端
- **Next.js 14**: React 框架
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **shadcn/ui**: UI 组件库
- **Lucide React**: 图标库

## API 参考文档

完整的 n8n API 文档请参考：
- [n8n API 官方文档](https://docs.n8n.io/api/api-reference/)

## 故障排查

### 1. 连接失败

**问题**: 无法连接到 n8n API

**解决方案**:
1. 检查 `.env` 文件中的 `N8N_API_URL` 是否正确
2. 确认 n8n 服务是否正在运行
3. 检查网络连接和防火墙设置
4. 访问 `/api/n8n/health` 检查连接状态

### 2. 认证失败

**问题**: API 返回 401 错误

**解决方案**:
1. 检查 `.env` 文件中的 `N8N_API_KEY` 是否正确
2. 在 n8n 管理界面重新生成 API 密钥
3. 确保密钥没有过期或被删除

### 3. 执行失败

**问题**: 工作流执行失败

**解决方案**:
1. 查看执行详情中的错误信息
2. 在 n8n 界面中检查工作流配置
3. 确认工作流的所有凭证都已配置

### 4. 页面加载慢

**问题**: 工作流列表加载缓慢

**解决方案**:
1. 使用分页参数限制返回数量（默认 100）
2. 考虑添加缓存机制
3. 检查网络延迟

## 安全建议

1. **API 密钥保护**: 不要将 API 密钥提交到版本控制系统
2. **网络隔离**: 建议在内网环境使用，或通过 VPN 访问
3. **权限控制**: 使用 n8n 的用户管理功能控制访问权限
4. **HTTPS**: 生产环境建议使用 HTTPS 加密传输

## 扩展功能

### 未来可扩展的功能
- 工作流创建和编辑
- 工作流导入/导出
- 执行记录统计和分析
- Webhook 管理
- 凭证管理
- 工作流模板库
- 批量操作
- 定时任务管理

## 更新日志

### v1.0.0 (2025-10-23)
- ✅ 初始版本发布
- ✅ 完整的工作流管理功能
- ✅ 执行记录查看
- ✅ 健康监控
- ✅ Python API 代理
- ✅ 现代化 UI 界面

