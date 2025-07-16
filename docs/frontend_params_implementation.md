# 前端参数传递实现说明

## 概述

本次修改仅涉及前端代码，实现了智能对话功能中联网搜索和知识库检索参数的传递，以及知识库ID通过resources参数传递给后台。

## 修改内容

### 1. InputBox组件 (`web/src/app/chatbot/components/input-box.tsx`)

#### 主要变更：
- 更新onSend回调函数类型定义，支持新的参数
- 在发送消息时构建知识库资源对象
- 将联网搜索和知识库检索状态传递给onSend回调

#### 核心逻辑：
```typescript
// 构建知识库资源
const knowledgeBaseResources: Array<Resource> = selectedKnowledgeBases.map(kbId => {
  const kb = knowledgeBases.find(kb => kb.id === kbId);
  return {
    uri: `rag://knowledge_base/${kbId}`,
    title: kb?.name ?? `知识库 ${kbId}`,
    description: kb?.description ?? "知识库资源",
    type: "knowledge_base"
  };
});

// 合并用户提供的资源和知识库资源
const allResources = [...resources, ...knowledgeBaseResources];

onSend(message, {
  interruptFeedback: feedback?.option.value,
  resources: allResources,
  enableOnlineSearch: enableOnlineSearch,
  enableKnowledgeRetrieval: selectedKnowledgeBases.length > 0,
});
```

### 2. MessagesBlock组件 (`web/src/app/chatbot/components/messages-block.tsx`)

#### 主要变更：
- 更新handleSend函数签名，支持新的参数
- 将参数传递给sendMessage函数

```typescript
const handleSend = useCallback(
  async (
    message: string,
    options?: {
      interruptFeedback?: string;
      resources?: Array<Resource>;
      enableOnlineSearch?: boolean;
      enableKnowledgeRetrieval?: boolean;
    },
  ) => {
    await sendMessage(
      "chatbot/stream",
      message,
      {
        interruptFeedback: options?.interruptFeedback ?? feedback?.option.value,
        resources: options?.resources,
        enableOnlineSearch: options?.enableOnlineSearch,
        enableKnowledgeRetrieval: options?.enableKnowledgeRetrieval,
      },
      { abortSignal: abortController.signal }
    );
  },
  [feedback],
);
```

### 3. Store状态管理 (`web/src/core/store/store.ts`)

#### 主要变更：
- 更新sendMessage函数签名，支持新的参数
- 将参数传递给chatStream函数

```typescript
export async function sendMessage(
  agentPath?: string,
  content?: string,
  {
    interruptFeedback,
    resources,
    enableOnlineSearch,
    enableKnowledgeRetrieval,
  }: {
    interruptFeedback?: string;
    resources?: Array<Resource>;
    enableOnlineSearch?: boolean;
    enableKnowledgeRetrieval?: boolean;
  } = {},
  options: { abortSignal?: AbortSignal } = {},
) {
  const stream = chatStream(
    agentPath ?? "chatbot/stream",
    content ?? "[REPLAY]",
    {
      // ... 其他参数
      enable_online_search: enableOnlineSearch,
      enable_knowledge_retrieval: enableKnowledgeRetrieval,
    },
    options,
  );
}
```

### 4. Chat API (`web/src/core/api/chat.ts`)

#### 主要变更：
- 更新chatStream函数参数类型定义
- 支持新的enable_online_search和enable_knowledge_retrieval参数

```typescript
export async function* chatStream(
  agentPath: string,
  userMessage: string,
  params: {
    // ... 其他参数
    enable_online_search?: boolean;
    enable_knowledge_retrieval?: boolean;
  },
  options: { abortSignal?: AbortSignal } = {},
) {
  // ... 实现逻辑
}
```

## 数据流

### 参数传递流程

```
用户界面选择 → InputBox组件 → MessagesBlock组件 → Store → Chat API → 后台接口
```

1. **用户界面**: 用户勾选联网搜索和选择知识库
2. **InputBox**: 构建知识库资源对象和参数
3. **MessagesBlock**: 接收参数并传递给sendMessage
4. **Store**: 将参数传递给chatStream
5. **Chat API**: 发送请求到后台

### 知识库资源格式

```typescript
interface Resource {
  uri: string;        // 格式: "rag://knowledge_base/{kb_id}"
  title: string;      // 知识库名称
  description: string; // 知识库描述
  type: string;       // "knowledge_base"
}
```

## 使用场景

### 1. 只启用联网搜索
```typescript
{
  resources: [],
  enableOnlineSearch: true,
  enableKnowledgeRetrieval: false,
}
```

### 2. 只启用知识库检索
```typescript
{
  resources: [
    {
      uri: "rag://knowledge_base/kb-123",
      title: "产品文档库",
      description: "产品相关文档",
      type: "knowledge_base"
    }
  ],
  enableOnlineSearch: false,
  enableKnowledgeRetrieval: true,
}
```

### 3. 同时启用两种功能
```typescript
{
  resources: [
    {
      uri: "rag://knowledge_base/kb-123",
      title: "产品文档库",
      description: "产品相关文档",
      type: "knowledge_base"
    }
  ],
  enableOnlineSearch: true,
  enableKnowledgeRetrieval: true,
}
```

### 4. 都不启用
```typescript
{
  resources: [],
  enableOnlineSearch: false,
  enableKnowledgeRetrieval: false,
}
```

## 测试验证

### 测试场景

1. **只选择知识库，不启用联网搜索**
   - 联网搜索: false
   - 知识库检索: true
   - 资源包含选中的知识库

2. **只启用联网搜索，不选择知识库**
   - 联网搜索: true
   - 知识库检索: false
   - 资源为空

3. **同时启用两种功能**
   - 联网搜索: true
   - 知识库检索: true
   - 资源包含选中的知识库

4. **都不启用**
   - 联网搜索: false
   - 知识库检索: false
   - 资源为空

### 验证要点

- ✅ 知识库资源正确构建
- ✅ 参数正确传递
- ✅ 资源合并逻辑正确
- ✅ 不同场景参数设置正确

## 兼容性说明

### 向后兼容

- 保持现有API接口的兼容性
- 新参数为可选参数，不影响现有功能
- 默认值保持原有行为

### 默认行为

- `enableOnlineSearch`: 默认为 `true`（保持原有行为）
- `enableKnowledgeRetrieval`: 默认为 `true`（保持原有行为）
- 当参数未传递时，使用默认值

## 总结

本次修改成功实现了前端参数传递功能，主要改进包括：

- ✅ 联网搜索和知识库检索的独立控制
- ✅ 知识库ID通过resources参数传递
- ✅ 完整的参数传递链路
- ✅ 向后兼容性保证
- ✅ 多种使用场景支持

用户现在可以通过界面灵活控制智能对话的功能组合，参数会正确传递给后台接口进行处理。 