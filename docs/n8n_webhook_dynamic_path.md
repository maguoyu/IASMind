# n8n Webhook 动态路径提取功能

## 概述

本文档介绍如何从 n8n 工作流中自动提取 Webhook 路径，并在前端执行对话框中动态显示。

## 功能特性

### 1. 后端自动提取 Webhook 路径

后端在返回工作流列表和详情时，会自动从工作流的 `nodes` 数组中提取 Webhook 节点的路径信息，并添加到响应数据中。

#### 实现原理

在 `n8n_router.py` 中添加了两个辅助函数：

```python
def extract_webhook_path(workflow: Dict[str, Any]) -> Optional[str]:
    """从工作流的 nodes 中提取 webhook 路径"""
    nodes = workflow.get("nodes", [])
    for node in nodes:
        # 查找 Webhook 类型的节点
        if node.get("type") == "n8n-nodes-base.webhook":
            parameters = node.get("parameters", {})
            path = parameters.get("path")
            if path:
                # 确保路径以 / 开头
                return path if path.startswith("/") else f"/{path}"
    return None


def enrich_workflow_with_webhook(workflow: Dict[str, Any]) -> Dict[str, Any]:
    """为工作流数据添加 webhookPath 字段"""
    webhook_path = extract_webhook_path(workflow)
    if webhook_path:
        workflow["webhookPath"] = webhook_path
    return workflow
```

#### 应用到 API 端点

两个端点都进行了更新：

1. **获取工作流列表** (`GET /api/n8n/workflows`)：
   ```python
   result = await make_n8n_request("GET", "/workflows", params=params)
   
   # 为每个工作流添加 webhookPath 字段
   if "data" in result and isinstance(result["data"], list):
       result["data"] = [enrich_workflow_with_webhook(workflow) for workflow in result["data"]]
   
   return result
   ```

2. **获取单个工作流** (`GET /api/n8n/workflows/{workflow_id}`)：
   ```python
   workflow = await make_n8n_request("GET", f"/workflows/{workflow_id}")
   return enrich_workflow_with_webhook(workflow)
   ```

### 2. 前端动态显示

前端在执行对话框中动态显示当前选中工作流的 Webhook 路径。

#### Placeholder 动态化

输入框的 placeholder 会根据当前选中的工作流动态变化：

```typescript
<input
  id="webhook-path"
  type="text"
  placeholder={
    workflows.find(w => w.id === executeWorkflowId)?.webhookPath || 
    "/webhook-test/example-webhook"
  }
  value={webhookPath}
  onChange={(e) => {
    setWebhookPath(e.target.value);
    setWebhookError("");
  }}
  className="w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

#### 快捷按钮智能化

"使用示例"按钮会根据是否有工作流路径智能调整：

```typescript
<Button
  type="button"
  variant="ghost"
  size="sm"
  onClick={() => {
    const currentWorkflow = workflows.find(w => w.id === executeWorkflowId);
    const examplePath = currentWorkflow?.webhookPath || "/webhook-test/example-webhook";
    setWebhookPath(examplePath);
    setWebhookError("");
  }}
  className="h-8 text-xs"
>
  {workflows.find(w => w.id === executeWorkflowId)?.webhookPath ? "使用工作流路径" : "使用示例"}
</Button>
```

- 如果当前工作流有 webhook 路径，按钮显示"使用工作流路径"，点击填充实际路径
- 如果没有，按钮显示"使用示例"，点击填充默认示例路径

#### 自动填充

当打开执行对话框时，会自动填充当前工作流的 webhook 路径：

```typescript
const handleOpenExecuteDialog = (workflowId: string) => {
  const workflow = workflows.find((w) => w.id === workflowId);
  setExecuteWorkflowId(workflowId);
  setWorkflowParams("{}");
  setParamsError("");
  setWebhookPath(workflow?.webhookPath || "");
  setWebhookError("");
  setExecuteDialogOpen(true);
};
```

## 数据流程

```
n8n API
  ↓ 返回工作流数据（包含 nodes 数组）
后端 n8n_router.py
  ↓ extract_webhook_path() 提取 webhook 路径
  ↓ enrich_workflow_with_webhook() 添加 webhookPath 字段
  ↓ 返回增强后的工作流数据
前端 API 客户端
  ↓ 接收包含 webhookPath 的工作流数据
前端 UI 组件
  ↓ 动态显示在 placeholder 中
  ↓ 自动填充到输入框
  ↓ 快捷按钮一键填充
用户
  ↓ 执行工作流
```

## 数据模型

### 后端响应示例

```json
{
  "data": [
    {
      "id": "workflow_123",
      "name": "Test Webhook Workflow",
      "active": true,
      "nodes": [
        {
          "type": "n8n-nodes-base.webhook",
          "parameters": {
            "path": "/webhook-test/joke-webhook-sse",
            "httpMethod": "POST"
          }
        }
      ],
      "webhookPath": "/webhook-test/joke-webhook-sse"  // ← 自动提取并添加
    }
  ]
}
```

### 前端接口定义

```typescript
export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes?: any[];
  connections?: any;
  settings?: any;
  tags?: string[];
  webhookPath?: string; // webhook 路径，从 nodes 中提取
}
```

## 用户体验改进

### 之前

- 用户需要手动输入或复制粘贴 Webhook 路径
- 容易输错或忘记路径格式
- 需要在 n8n 界面和 IASMind 界面之间切换

### 现在

1. **自动识别**：系统自动从工作流中提取 Webhook 路径
2. **智能提示**：Placeholder 显示当前工作流的实际路径
3. **一键填充**：点击按钮即可填充路径
4. **自动填充**：打开对话框时自动预填充路径
5. **降低错误**：减少手动输入错误的可能性

## 技术细节

### Webhook 节点识别

系统通过以下方式识别 Webhook 节点：

1. 遍历工作流的 `nodes` 数组
2. 查找 `type` 为 `"n8n-nodes-base.webhook"` 的节点
3. 从节点的 `parameters.path` 中提取路径
4. 确保路径格式正确（以 `/` 开头）

### 路径规范化

提取的路径会自动规范化：

```python
# 确保路径以 / 开头
return path if path.startswith("/") else f"/{path}"
```

### 容错处理

- 如果工作流没有 Webhook 节点，`webhookPath` 字段不会出现
- 前端使用可选链操作符 `?.` 安全访问
- 提供默认值避免错误

## 总结

通过后端自动提取和前端动态显示，用户可以：

1. ✅ 无需手动查找 Webhook 路径
2. ✅ 一键填充当前工作流的实际路径
3. ✅ 减少输入错误
4. ✅ 提高执行效率
5. ✅ 改善整体用户体验

这个功能使得 Webhook 执行变得更加简单和可靠！

