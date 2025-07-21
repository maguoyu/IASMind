# LLM 代理服务使用指南

## 概述

LLM 代理服务是一个安全的代理层，允许前端应用安全地使用大语言模型（LLM）服务，同时将 API 密钥安全地存储在后端。本指南介绍如何使用此功能，以及它的优势。

## 优势

1. **API 密钥安全性**：API 密钥永远不会暴露给客户端，有效防止密钥泄露
2. **中央化配置**：所有 LLM 配置在服务器端统一管理，便于更新和维护
3. **请求验证**：服务器可以验证和过滤请求，防止滥用
4. **流量控制**：可以实现速率限制和使用配额管理
5. **一致性接口**：为前端提供统一的 API 接口，不依赖特定的 LLM 提供商

## API 端点

代理服务提供以下 API 端点：

### `/api/llm-proxy/chat/completions`

此端点模仿 OpenAI 兼容的聊天完成 API，接受 POST 请求，支持普通请求和流式响应。

#### 请求参数

```json
{
  "model": "模型名称",
  "messages": [
    {"role": "system", "content": "你是一个有用的AI助手。"},
    {"role": "user", "content": "帮我写一个简短的故事。"}
  ],
  "temperature": 0.7,
  "top_p": 1.0,
  "n": 1,
  "max_tokens": 2000,
  "stream": false,
  "llm_type": "basic"
}
```

| 参数 | 类型 | 描述 |
|------|------|------|
| model | string | 要使用的模型名称 |
| messages | array | 对话消息数组，包含 role 和 content |
| temperature | float | 采样温度 (0-2) |
| top_p | float | 核采样 (0-1) |
| n | integer | 生成结果数量 |
| max_tokens | integer | 最大生成 token 数 |
| stream | boolean | 是否使用流式响应 |
| llm_type | string | 使用的 LLM 类型 ("basic", "reasoning", "vision") |

#### 响应格式

非流式响应示例：

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1678938833,
  "model": "doubao-1-5-pro-32k-250115",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "从前有座山，山上有座庙..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 100,
    "total_tokens": 120
  }
}
```

流式响应使用 Server-Sent Events (SSE) 格式。

## 前端集成

### 基本使用方法

```typescript
import { callLLMProxy } from "~/core/api/llm-proxy";

// 发送请求到LLM
const response = await callLLMProxy({
  model: "doubao-1-5-pro-32k-250115",
  messages: [
    { role: "user", content: "你好，请介绍一下自己。" }
  ],
  temperature: 0.7,
  llm_type: "basic",
});

console.log(response.choices[0].message.content);
```

### 流式响应使用方法

```typescript
import { streamLLMProxy } from "~/core/api/llm-proxy";

// 创建一个流式请求
const stream = streamLLMProxy({
  model: "doubao-1-5-pro-32k-250115",
  messages: [
    { role: "user", content: "编写一个简短的故事。" }
  ],
  temperature: 0.7,
  stream: true,
  llm_type: "basic",
});

// 处理流式响应
let fullResponse = "";
for await (const chunk of stream) {
  if (chunk.choices?.[0]?.delta?.content) {
    const content = chunk.choices[0].delta.content;
    fullResponse += content;
    // 更新UI
    updateUI(fullResponse);
  }
}
```

## 配置说明

LLM 代理服务使用与其他 LLM 功能相同的配置系统。配置来源：

1. `conf.yaml` 文件中的配置
2. 环境变量（优先级高于配置文件）

### 配置示例

在 `conf.yaml` 中配置：

```yaml
BASIC_MODEL:
  base_url: "https://api.openai.com/v1"
  model: "gpt-4"
  api_key: "sk-your-api-key"

REASONING_MODEL:
  base_url: "https://api.anthropic.com/v1"
  model: "claude-3-sonnet-20240229"
  api_key: "sk-your-anthropic-api-key"
```

或者通过环境变量：

```
BASIC_MODEL__BASE_URL=https://api.openai.com/v1
BASIC_MODEL__MODEL=gpt-4
BASIC_MODEL__API_KEY=sk-your-api-key
```

## 演示页面

可以访问 `/llm-demo` 页面来测试和体验 LLM 代理功能。该页面提供了一个简单的界面，用于向 LLM 发送请求并查看响应。

## 安全考量

1. **API密钥保护**：API 密钥仅存储在服务器端，不会暴露给客户端
2. **请求验证**：所有请求都经过服务器验证，确保请求格式和内容正确
3. **错误处理**：错误信息被适当处理，不会泄露敏感信息
4. **超时设置**：请求有适当的超时设置，防止长时间阻塞

## 疑难解答

如果您遇到问题，请检查：

1. 确认后端配置中包含正确的 API 密钥和基础 URL
2. 检查网络连接和请求日志
3. 验证所请求的模型是否在配置中可用
4. 检查前端请求格式是否正确

## 限制

1. 当前代理主要支持 OpenAI 兼容的 API 格式
2. 某些高级功能（如函数调用）可能需要额外配置
3. 性能取决于底层 LLM 服务的响应时间 