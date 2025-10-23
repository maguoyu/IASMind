# n8n Webhook 执行功能

## 概述

本文档介绍如何使用 Webhook 方式执行 n8n 工作流。Webhook 方式是执行 n8n 工作流的推荐方法，相比 API 执行方式更加灵活和强大。

## 功能特性

### 双重执行模式

系统支持两种工作流执行方式：

1. **Webhook 执行（推荐）**
   - 通过 HTTP POST 请求直接调用工作流的 Webhook 端点
   - 更灵活、响应更快
   - 支持 SSE（Server-Sent Events）等高级特性
   - 适合生产环境使用

2. **API 执行**
   - 通过 n8n API 执行工作流
   - 返回执行记录 ID
   - 适合需要跟踪执行历史的场景

## 配置说明

### 环境变量

在 `.env` 文件中添加以下配置：

```bash
# n8n 工作流配置
N8N_API_URL=http://172.20.0.113:15678/api/v1
N8N_API_KEY=your_n8n_api_key
N8N_WEBHOOK_URL=http://172.20.0.113:15678
```

**参数说明：**
- `N8N_API_URL`: n8n API 地址
- `N8N_API_KEY`: n8n API 密钥
- `N8N_WEBHOOK_URL`: n8n Webhook 基础 URL（不包含路径）

## 使用方法

### 1. 在 n8n 中创建 Webhook

首先在 n8n 工作流中添加 Webhook 触发器节点：

1. 创建或编辑工作流
2. 添加"Webhook"触发器节点
3. 配置 Webhook 设置：
   - **Path**: 例如 `/webhook-test/joke-webhook-sse`
   - **Method**: POST
   - **Response Mode**: 根据需要选择（例如 "On Received" 或 "Last Node"）

4. 激活工作流

### 2. 在前端执行工作流

#### 方式一：通过带参数执行

1. 打开工作流列表或详情页
2. 点击"执行工作流" → "带参数执行"
3. 在对话框中：
   - **Webhook 路径**：填写 Webhook 路径，例如 `/webhook-test/joke-webhook-sse`
   - **工作流参数**：填写 JSON 格式的参数

4. 点击"提交执行"

#### 方式二：通过 API 调用

```typescript
import { n8nApi } from "~/core/api/n8n";

// Webhook 执行
await n8nApi.executeWorkflow("workflow_id", {
  webhook_path: "/webhook-test/joke-webhook-sse",
  workflow_data: {
    message: "Hello World",
    config: {
      timeout: 30
    }
  }
});
```

## API 接口

### 后端接口

#### 执行工作流

```
POST /api/n8n/workflows/{workflow_id}/execute
Content-Type: application/json

{
  "webhook_path": "/webhook-test/joke-webhook-sse",  // 可选，使用 Webhook 方式
  "workflow_data": {                                   // 可选，执行参数
    "key": "value"
  }
}
```

**参数说明：**
- `workflow_id`: 工作流 ID（使用 Webhook 时可以是任意值，仅用于日志）
- `webhook_path`: Webhook 路径（可选）
  - 如果提供，使用 Webhook 方式执行
  - 如果不提供，使用 n8n API 方式执行
- `workflow_data`: 工作流执行参数（可选）

**返回值：**

使用 Webhook 方式时：
```json
{
  "success": true,
  "webhook_url": "http://172.20.0.113:15678/webhook-test/joke-webhook-sse",
  "data": {
    // Webhook 返回的数据
  }
}
```

使用 API 方式时：
```json
{
  "id": "execution_id",
  "workflowId": "workflow_id",
  "status": "running",
  // ... 其他执行记录信息
}
```

## 前端组件

### ExecuteWorkflowRequest 接口

```typescript
export interface ExecuteWorkflowRequest {
  workflow_data?: Record<string, any>;  // 执行参数
  webhook_path?: string;                 // Webhook 路径
}
```

### N8nWorkflow 接口

```typescript
export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  // ... 其他字段
  webhookPath?: string;  // 可选的 Webhook 路径
}
```

## 执行对话框

执行对话框包含两个主要部分：

### 1. Webhook 路径输入

- **标签**: "Webhook 路径 (可选)"
- **占位符**: `/webhook-test/joke-webhook-sse`
- **验证规则**: 必须以 `/` 开头
- **快捷按钮**: "使用示例" - 一键填充示例路径

### 2. 参数输入

- **标签**: "工作流参数 (JSON)"
- **格式**: JSON
- **实时验证**: 自动检查 JSON 格式
- **快捷按钮**: "使用模板" - 一键填充参数模板

## 使用示例

### 示例 1: 简单消息

```json
{
  "message": "测试消息"
}
```

Webhook 路径: `/webhook-test/joke-webhook-sse`

### 示例 2: 复杂参数

```json
{
  "user_id": "12345",
  "action": "process",
  "data": {
    "name": "张三",
    "email": "zhangsan@example.com"
  },
  "options": {
    "async": true,
    "priority": "high"
  }
}
```

Webhook 路径: `/webhook-test/user-webhook`

### 示例 3: 数组参数

```json
{
  "items": [
    {"id": 1, "name": "Item 1"},
    {"id": 2, "name": "Item 2"}
  ],
  "config": {
    "batch_size": 10
  }
}
```

Webhook 路径: `/webhook-test/batch-webhook`

## 后端实现

### 执行逻辑

```python
@router.post("/workflows/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, request: WorkflowExecuteRequest):
    # 如果提供了 webhook 路径，使用 webhook 方式执行
    if request.webhook_path:
        webhook_url = f"{N8N_WEBHOOK_URL}{request.webhook_path}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                webhook_url,
                json=request.workflow_data if request.workflow_data else {},
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            
            return {
                "success": True,
                "webhook_url": webhook_url,
                "data": response.json(),
            }
    
    # 否则使用 API 方式执行
    json_data = request.workflow_data if request.workflow_data else {}
    return await make_n8n_request("POST", f"/workflows/{workflow_id}/execute", json_data=json_data)
```

## 错误处理

### Webhook 路径验证

- 路径必须以 `/` 开头
- 前端实时验证并显示错误提示

### 执行错误

- HTTP 状态错误：显示状态码和错误信息
- 网络错误：显示连接失败信息
- 超时错误：30 秒超时限制

### 用户提示

- 成功执行：显示 toast 提示
- 失败执行：显示详细错误信息
- Webhook 执行：特别标注使用了 Webhook 方式

## Webhook vs API 执行对比

| 特性 | Webhook 执行 | API 执行 |
|------|-------------|---------|
| 速度 | ⚡ 更快 | 🐌 较慢 |
| 灵活性 | ✅ 高 | ⚠️ 中 |
| SSE 支持 | ✅ 支持 | ❌ 不支持 |
| 执行记录 | ⚠️ 不自动记录 | ✅ 自动记录 |
| 适用场景 | 生产环境、实时响应 | 测试环境、历史追踪 |

## 最佳实践

1. **生产环境优先使用 Webhook**
   - 响应更快
   - 支持 SSE 等高级特性
   - 更适合实时场景

2. **开发测试使用 API 执行**
   - 可以查看执行历史
   - 便于调试和追踪

3. **参数格式规范**
   - 始终使用有效的 JSON 格式
   - 使用描述性的键名
   - 添加必要的注释（在开发环境）

4. **错误处理**
   - 捕获并处理所有可能的错误
   - 提供友好的用户提示
   - 记录详细的错误日志

5. **安全考虑**
   - Webhook 路径不要包含敏感信息
   - 使用 HTTPS（生产环境）
   - 验证输入参数

## 故障排查

### Webhook 执行失败

1. **检查 Webhook 路径**
   - 确保路径以 `/` 开头
   - 检查路径是否与 n8n 中配置的一致

2. **检查工作流状态**
   - 确保工作流已激活
   - 检查 Webhook 节点配置

3. **检查网络连接**
   - 确保可以访问 `N8N_WEBHOOK_URL`
   - 检查防火墙设置

4. **查看日志**
   - 后端日志：查看详细错误信息
   - n8n 日志：查看工作流执行情况

### JSON 解析错误

1. **使用 JSON 验证工具**
   - 在线工具：jsonlint.com
   - IDE 插件：JSON Validator

2. **常见错误**
   - 缺少引号
   - 多余的逗号
   - 括号不匹配

## 总结

Webhook 执行功能为 n8n 工作流提供了更加灵活和强大的执行方式。通过前端友好的界面和后端可靠的实现，用户可以轻松选择最适合的执行方式，满足不同场景的需求。

## 相关文档

- [n8n 集成指南](./n8n_integration_guide.md)
- [n8n 快速启动](./n8n_quickstart.md)
- [n8n API 文档](https://docs.n8n.io/api/)

