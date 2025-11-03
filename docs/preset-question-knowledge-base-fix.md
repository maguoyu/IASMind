# 预置问题知识库参数传递问题修复

## 问题描述

当用户在页面勾选了知识库后，点击预置问题时，后端收到的 `enable_knowledge_retrieval` 参数却是 `false`，导致即使选择了知识库也不会启用知识库检索。

## 根本原因分析

### 问题链路

1. **知识库状态存储位置**：`selectedKnowledgeBases` 状态存储在 `InputBox` 组件中
2. **预置问题处理逻辑**：`ConversationStarter` 组件点击预置问题时直接调用 `handleSend`
3. **参数硬编码问题**：`ConversationStarter` 在调用 `onSend` 时硬编码传递 `enableKnowledgeRetrieval: false`
4. **状态隔离问题**：`ConversationStarter` 无法访问 `InputBox` 中的 `selectedKnowledgeBases` 状态

### 代码问题示例

**修复前** (`conversation-starter.tsx` 第 54-59 行)：

```typescript
onClick={() => {
  onSend?.(question, {
    enableOnlineSearch: false,
    enableKnowledgeRetrieval: false, // ❌ 硬编码为 false，忽略用户选择
  });
}}
```

**修复前** (`input-box.tsx` 第 69 行)：

```typescript
const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([]);
// ❌ 状态在 InputBox 内部，ConversationStarter 无法访问
```

## 修复方案：状态提升（Lifting State Up）

### 架构调整

将 `selectedKnowledgeBases` 状态从 `InputBox` 提升到 `MessagesBlock`（共同父组件），使得：

1. **`ConversationStarter`** 和 **`InputBox`** 都可以访问同一个知识库选择状态
2. 父组件 `MessagesBlock` 统一处理知识库资源的构建和参数传递
3. 预置问题点击时，自动应用用户当前选择的知识库

### 修复内容

#### 1. 修改 `messages-block.tsx`

**状态提升**（第 40-56 行）：

```typescript
// 知识库状态提升到父组件，供 ConversationStarter 和 InputBox 共享
const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([]);
const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);

// 加载知识库数据
useEffect(() => {
  const loadKnowledgeBases = async () => {
    try {
      const response = await knowledgeBaseApi.GetKnowledgeBases();
      setKnowledgeBases(response.knowledge_bases);
    } catch (error) {
      console.error("加载知识库列表失败:", error);
      toast.error("加载知识库列表失败");
    }
  };
  void loadKnowledgeBases();
}, []);
```

**统一处理知识库逻辑**（第 57-120 行）：

```typescript
const handleSend = useCallback(
  async (
    message: string,
    options?: {
      interruptFeedback?: string;
      resources?: Array<Resource>;
      enableOnlineSearch?: boolean;
      enableKnowledgeRetrieval?: boolean;
      files?: Array<any>;
    },
  ) => {
    const abortController = getGlobalAbortController();
    
    // 如果 options 中没有显式设置 enableKnowledgeRetrieval，则根据当前选中的知识库状态来设置
    const shouldEnableKnowledgeRetrieval = options?.enableKnowledgeRetrieval !== undefined 
      ? options.enableKnowledgeRetrieval 
      : selectedKnowledgeBases.length > 0;
    
    // 构建知识库资源
    let knowledgeBaseResources: Array<Resource> = [];
    if (shouldEnableKnowledgeRetrieval && selectedKnowledgeBases.length > 0) {
      knowledgeBaseResources = selectedKnowledgeBases.map(kbId => {
        const kb = knowledgeBases.find(kb => kb.id === kbId);
        return {
          uri: `rag://knowledge_base/${kbId}`,
          title: kb?.name ?? `知识库 ${kbId}`,
          description: kb?.description ?? "知识库资源",
          type: "knowledge_base"
        };
      });
    }
    
    // 合并用户提供的资源和知识库资源
    const allResources = [...(options?.resources ?? []), ...knowledgeBaseResources];
    
    console.log('handleSend 发送参数:', {
      message,
      selectedKnowledgeBases,
      shouldEnableKnowledgeRetrieval,
      knowledgeBaseResources,
      allResources,
      originalOptions: options
    });
    
    try {
      await sendMessage(
        "chatbot/stream",
        message,
        {
          interruptFeedback: options?.interruptFeedback ?? feedback?.option.value,
          resources: allResources,
          enableOnlineSearch: options?.enableOnlineSearch,
          enableKnowledgeRetrieval: shouldEnableKnowledgeRetrieval,
          files: options?.files,
        },
        {
          abortSignal: abortController.signal,
        },
      );
    } catch {}
  },
  [feedback, selectedKnowledgeBases, knowledgeBases],
);
```

**传递状态到子组件**（第 157-167 行）：

```typescript
<InputBox
  className="h-full w-full"
  responding={responding}
  feedback={feedback}
  onSend={handleSend}
  onCancel={handleCancel}
  onRemoveFeedback={handleRemoveFeedback}
  selectedKnowledgeBases={selectedKnowledgeBases}  // ✅ 传递状态
  onSelectedKnowledgeBasesChange={setSelectedKnowledgeBases}  // ✅ 传递更新函数
  knowledgeBases={knowledgeBases}  // ✅ 传递知识库数据
/>
```

#### 2. 修改 `input-box.tsx`

**接收外部状态**（第 31-99 行）：

```typescript
export function InputBox({
  className,
  responding,
  feedback,
  onSend,
  onCancel,
  onRemoveFeedback,
  selectedKnowledgeBases: externalSelectedKnowledgeBases,  // ✅ 接收外部状态
  onSelectedKnowledgeBasesChange,  // ✅ 接收更新函数
  knowledgeBases: externalKnowledgeBases,  // ✅ 接收知识库数据
}: {
  className?: string;
  size?: "large" | "normal";
  responding?: boolean;
  feedback?: { option: Option } | null;
  onSend?: (
    message: string,
    options?: {
      interruptFeedback?: string;
      resources?: Array<Resource>;
      enableOnlineSearch?: boolean;
      enableKnowledgeRetrieval?: boolean;
    },
  ) => void;
  onCancel?: () => void;
  onRemoveFeedback?: () => void;
  selectedKnowledgeBases?: string[];  // ✅ 新增 prop
  onSelectedKnowledgeBasesChange?: (knowledgeBases: string[]) => void;  // ✅ 新增 prop
  knowledgeBases?: KnowledgeBase[];  // ✅ 新增 prop
}) {
  // 知识库状态：优先使用外部传入的，否则使用内部状态（向后兼容）
  const [internalSelectedKnowledgeBases, setInternalSelectedKnowledgeBases] = useState<string[]>([]);
  const [internalKnowledgeBases, setInternalKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loadingKnowledgeBases, setLoadingKnowledgeBases] = useState(false);
  
  const selectedKnowledgeBases = externalSelectedKnowledgeBases ?? internalSelectedKnowledgeBases;
  const setSelectedKnowledgeBases = onSelectedKnowledgeBasesChange ?? setInternalSelectedKnowledgeBases;
  const knowledgeBases = externalKnowledgeBases ?? internalKnowledgeBases;

  // 加载知识库数据（仅在没有外部数据时）
  const LoadKnowledgeBases = useCallback(async () => {
    if (externalKnowledgeBases) return; // ✅ 如果有外部数据，不需要加载
    
    setLoadingKnowledgeBases(true);
    try {
      const response = await knowledgeBaseApi.GetKnowledgeBases();
      setInternalKnowledgeBases(response.knowledge_bases);
    } catch (error) {
      console.error("加载知识库列表失败:", error);
      toast.error("加载知识库列表失败");
    } finally {
      setLoadingKnowledgeBases(false);
    }
  }, [externalKnowledgeBases]);
}
```

**简化发送逻辑**（第 108-138 行）：

```typescript
const handleSendMessage = useCallback(
  (message: string, resources: Array<Resource>) => {
    if (responding) {
      onCancel?.();
    } else {
      if (message.trim() === "") {
        return;
      }
      if (onSend) {
        console.log('InputBox 发送消息:', { 
          message,
          selectedKnowledgeBases,
          resources,
          enableOnlineSearch: enableOnlineSearch ?? false,
        });

        // ✅ 父组件会处理知识库资源的构建，这里只传递用户资源
        onSend(message, {
          interruptFeedback: feedback?.option.value,
          resources: resources,
          enableOnlineSearch: enableOnlineSearch ?? false,
          // ✅ 不设置 enableKnowledgeRetrieval，让父组件根据 selectedKnowledgeBases 决定
        });
        onRemoveFeedback?.();
        setIsEnhanceAnimating(false);
      }
    }
  },
  [responding, onCancel, onSend, feedback, onRemoveFeedback, selectedKnowledgeBases, enableOnlineSearch],
);
```

#### 3. 修改 `conversation-starter.tsx`

**移除硬编码参数**（第 54-59 行）：

```typescript
onClick={() => {
  // ✅ 不传递 enableKnowledgeRetrieval，让父组件根据当前选中的知识库状态决定
  onSend?.(question, {
    enableOnlineSearch: false,
  });
}}
```

## 修复效果

### 修复前

```
用户勾选知识库 → selectedKnowledgeBases = ["kb1"]
点击预置问题 → ConversationStarter 硬编码传递 enableKnowledgeRetrieval: false
后端收到 → enable_knowledge_retrieval: false ❌
```

### 修复后

```
用户勾选知识库 → selectedKnowledgeBases = ["kb1"] (在 MessagesBlock)
点击预置问题 → ConversationStarter 不传递 enableKnowledgeRetrieval
MessagesBlock.handleSend → 检测到 selectedKnowledgeBases.length > 0
                         → 构建知识库资源
                         → enableKnowledgeRetrieval: true ✅
后端收到 → enable_knowledge_retrieval: true ✅
          → resources: [{ uri: "rag://knowledge_base/kb1", ... }] ✅
```

## 数据流图

```
┌─────────────────────────────────────────────────────────┐
│              MessagesBlock (父组件)                       │
│                                                           │
│  • selectedKnowledgeBases: string[]  (状态)              │
│  • knowledgeBases: KnowledgeBase[]   (数据)              │
│  • handleSend(message, options)      (统一处理)          │
│                                                           │
│    ├─ 检查 options.enableKnowledgeRetrieval             │
│    ├─ 如果未设置，则根据 selectedKnowledgeBases 决定     │
│    ├─ 构建知识库资源                                     │
│    └─ 调用 sendMessage 发送到后端                        │
│                                                           │
└───────────────┬────────────────────────┬─────────────────┘
                │                        │
                ▼                        ▼
    ┌───────────────────┐    ┌───────────────────┐
    │ ConversationStarter│    │     InputBox      │
    │                    │    │                   │
    │ • 点击预置问题      │    │ • 选择知识库       │
    │ • onSend(q, {      │    │ • 输入消息         │
    │     enableOnline.. │    │ • onSend(msg, {   │
    │   })               │    │     resources,    │
    │                    │    │     enableOnline..│
    └────────────────────┘    │   })              │
                              │                   │
                              │ Props:            │
                              │ • selectedKnowledgeBases    │
                              │ • onSelectedKnowledgeBasesChange │
                              │ • knowledgeBases  │
                              └───────────────────┘
```

## 向后兼容性

`InputBox` 组件保持向后兼容：

- 如果父组件传递了 `selectedKnowledgeBases`、`onSelectedKnowledgeBasesChange`、`knowledgeBases` props，则使用外部状态
- 如果没有传递这些 props，则使用内部状态（原有行为）

这确保了其他使用 `InputBox` 的地方（如 `reports`、`charts`、`deep_research`）不会受到影响。

## 测试步骤

### 1. 测试预置问题应用知识库

1. 打开浏览器控制台（F12）
2. 打开 Chatbot 页面
3. 勾选一个或多个知识库
4. 点击任意预置问题
5. 查看控制台日志：
   ```
   知识库选择更新: { id: "xxx", prev: [], newSelection: ["xxx"] }
   handleSend 发送参数: {
     message: "油温油密对加油量的影响？",
     selectedKnowledgeBases: ["xxx"],
     shouldEnableKnowledgeRetrieval: true,
     knowledgeBaseResources: [{ uri: "rag://knowledge_base/xxx", ... }],
     ...
   }
   chatStream 参数: { enable_knowledge_retrieval: true, ... }
   发送到后端的请求体: { enable_knowledge_retrieval: true, ... }
   ```

### 2. 测试手动输入应用知识库

1. 勾选知识库
2. 手动输入消息并发送
3. 查看控制台日志，应显示 `enableKnowledgeRetrieval: true`

### 3. 测试不选知识库

1. 取消勾选所有知识库
2. 点击预置问题或手动输入
3. 查看控制台日志，应显示 `enableKnowledgeRetrieval: false`

## 相关文件

### 主要修改

- `/home/magy/IASMind/web/src/app/chatbot/components/messages-block.tsx` - 状态提升和统一处理
- `/home/magy/IASMind/web/src/app/chatbot/components/input-box.tsx` - 支持外部状态
- `/home/magy/IASMind/web/src/app/chatbot/components/conversation-starter.tsx` - 移除硬编码参数

### 调试日志

- `/home/magy/IASMind/web/src/core/store/store.ts` - chatStream 参数日志
- `/home/magy/IASMind/web/src/core/api/chat.ts` - 请求体日志

## 总结

通过状态提升（Lifting State Up）模式，我们解决了组件间状态隔离的问题，使得：

1. ✅ **预置问题尊重用户选择**：点击预置问题时会自动应用用户选中的知识库
2. ✅ **代码逻辑清晰**：知识库资源构建逻辑集中在父组件，避免重复
3. ✅ **向后兼容**：现有代码不受影响
4. ✅ **易于维护**：单一数据源（Single Source of Truth）

这是 React 状态管理的最佳实践之一。

