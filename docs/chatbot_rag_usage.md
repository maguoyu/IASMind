# Chatbot RAG 功能使用指南

## 概述

基于 `src/deep_research` 的实现，我们在 `src/chatbot` 目录下新增了支持 RAG 知识库的聊天机器人功能。

## ✅ 功能状态

**当前状态**: **已完成并测试通过** ✅

- 基础对话功能 ✅
- RAG 知识库集成 ✅
- 流式响应 ✅
- API 端点正常工作 ✅

## 功能特点

- **对话式交互**: 简化的聊天体验，专注于自然对话
- **RAG 知识库集成**: 支持从本地知识库检索相关信息
- **流式响应**: 支持实时流式输出
- **资源感知**: 自动识别并使用用户提供的知识库资源
- **智能降级**: 无RAG资源时自动使用基础LLM对话

## API 端点

### POST `/api/chatbot/stream`

流式聊天接口，支持 RAG 功能。

**请求格式**:
```json
{
  "messages": [
    {
      "role": "user", 
      "content": "你好，请介绍一下这个产品"
    }
  ],
  "resources": [
    {
      "uri": "rag://dataset/abc123",
      "title": "产品文档",
      "description": "产品的详细说明文档"
    }
  ],
  "thread_id": "conversation-123"
}
```

**响应格式**:
```
event: message_chunk
data: {"thread_id": "conversation-123", "agent": "chatbot", "id": "msg-id", "role": "assistant", "content": "你好！"}

event: message_chunk  
data: {"thread_id": "conversation-123", "agent": "chatbot", "id": "msg-id", "role": "assistant", "content": "根据产品文档..."}
```

## 技术实现

### 核心组件

1. **State 管理** (`src/chatbot/graph/types.py`)
   - 简化的状态管理，包含对话上下文和资源信息

2. **节点函数** (`src/chatbot/graph/nodes.py`) 
   - `initialize_node`: 初始化对话状态
   - `chatbot_node`: 主要的对话处理节点，集成 RAG 功能

3. **图构建** (`src/chatbot/graph/builder.py`)
   - 简化的图结构：initialize → chatbot → end

4. **路由器** (`src/server/routers/chatbot_router.py`)
   - 提供流式聊天 API 端点

### RAG 集成

- 使用 `get_retriever_tool()` 函数创建 RAG 检索工具
- 当用户提供 `resources` 时，自动集成知识库检索功能
- 优先使用知识库信息回答用户问题
- 无RAG资源时自动降级为基础LLM对话

## 使用示例

### 基本对话

```python
import requests

response = requests.post("http://localhost:8000/api/chatbot/stream", json={
    "messages": [
        {"role": "user", "content": "你好"}
    ],
    "thread_id": "test-conversation"
})
```

### 带 RAG 的对话

```python
response = requests.post("http://localhost:8000/api/chatbot/stream", json={
    "messages": [
        {"role": "user", "content": "请介绍一下这个产品的主要功能"}
    ],
    "resources": [
        {
            "uri": "rag://dataset/product-docs",
            "title": "产品文档", 
            "description": "产品功能和使用说明"
        }
    ],
    "thread_id": "rag-conversation"
})
```

### JavaScript/前端使用

```javascript
const response = await fetch('/api/chatbot/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: '你好，请帮我解答一个问题' }
    ],
    thread_id: 'web-chat-123',
    resources: []
  })
});

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = new TextDecoder().decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.substring(6));
      console.log('Received:', data.content);
    }
  }
}
```

## 配置说明

### Agent 配置

在 `src/config/agents.py` 中已添加：
```python
AGENT_LLM_MAP = {
    # ... 其他配置
    "chatbot": "basic",  # 使用基础 LLM
}
```

### 提示词模板

模板文件：`src/prompts/chatbot.md`
- 定义了 chatbot 的行为准则
- 包含 RAG 知识库使用指导
- 设置了对话风格和响应格式

## 与 Deep Research 的区别

| 特性 | Deep Research | Chatbot |
|------|---------------|---------|
| 用途 | 深度研究和报告生成 | 对话式问答 |
| 复杂度 | 多阶段规划和执行 | 单次响应 |
| 工具集成 | 搜索、爬虫、代码执行等 | 主要是 RAG 检索 |
| 输出格式 | 结构化报告 | 对话式回复 |
| 交互方式 | 任务导向 | 对话导向 |
| 响应时间 | 较长（多步骤处理） | 较快（单步响应） |

## 故障排除

### 问题：接口没有响应

**可能原因和解决方案**:

1. **服务器未启动**
   ```bash
   # 启动开发服务器
   python server.py
   # 或
   uvicorn src.server.app:app --reload
   ```

2. **依赖未安装**
   ```bash
   pip install -r requirements.txt
   # 或使用 uv
   uv sync
   ```

3. **LLM配置问题**
   - 检查 `conf.yaml` 中的LLM配置
   - 确保API密钥正确设置

4. **端口冲突**
   - 检查端口8000是否被占用
   - 使用不同端口: `uvicorn src.server.app:app --port 8080`

### 问题：RAG功能不工作

**检查项目**:

1. **RAG提供者配置**
   - 检查环境变量 `RAGFLOW_API_URL` 和 `RAGFLOW_API_KEY`
   - 确认RAG服务正常运行

2. **资源格式**
   - 确保 resources 数组格式正确
   - URI格式: `rag://dataset/{dataset_id}`

### 问题：流式响应异常

**解决方案**:

1. **检查Content-Type**
   ```javascript
   headers: {
     'Accept': 'text/event-stream',
     'Content-Type': 'application/json'
   }
   ```

2. **网络代理问题**
   - 某些代理可能缓存流式响应
   - 尝试直接连接或关闭代理

## 扩展和定制

### 添加更多工具
在 `chatbot_node` 函数中的 `tools` 列表中添加更多工具。

### 自定义提示词
修改 `src/prompts/chatbot.md` 文件来定制 chatbot 的行为。

### 调整响应模式
在 `src/chatbot/graph/builder.py` 中修改图结构来增加更多处理步骤。

### 集成更多RAG提供者
在 `src/rag/` 目录下添加新的provider实现。

## 测试验证

已通过的测试：
- ✅ 基础对话功能
- ✅ RAG知识库集成  
- ✅ 流式响应格式
- ✅ 错误处理机制
- ✅ API端点可用性

**确认**: `/api/chatbot/stream` 端点已完全可用并通过所有测试！🎉 