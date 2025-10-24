# 工作流默认参数配置

## 概述

`workflow-defaults.ts` 文件用于维护 n8n 工作流的默认执行参数。这些参数会在执行工作流时自动填充，提高使用效率。

## 配置说明

### 默认参数结构

```typescript
export const workflowDefaults: Record<string, WorkflowDefaultParams> = {
  // 默认参数 - 适用于所有工作流
  default: {
    chatInput: "给我讲个关于加油的笑话",
    sessionId: "user-12345",
  },
  
  // 可以为特定工作流名称配置专属参数
  // "我的聊天机器人": {
  //   chatInput: "自定义消息",
  //   sessionId: "custom-session",
  // },
};
```

### 参数说明

- **chatInput**: 聊天输入内容，传递给工作流的消息
- **sessionId**: 会话ID，用于标识用户会话
- 可以添加任何自定义字段

### 为特定工作流配置参数

如果需要为某个特定工作流配置不同的默认参数，使用**工作流名称**作为 key：

```typescript
export const workflowDefaults: Record<string, WorkflowDefaultParams> = {
  default: {
    chatInput: "给我讲个关于加油的笑话",
    sessionId: "user-12345",
  },
  
  // 为工作流名称为 "我的聊天机器人" 的工作流配置专属参数
  "我的聊天机器人": {
    chatInput: "你好，请介绍一下你自己",
    sessionId: "chatbot-session",
    customField: "自定义值",
  },
  
  // 为工作流名称为 "数据处理流程" 的工作流配置专属参数
  "数据处理流程": {
    action: "process",
    data: {
      source: "api",
      format: "json",
    },
  },
};
```

**注意**：配置的 key 必须与工作流的名称完全匹配（区分大小写）。

## 使用方式

### 在页面中使用

默认参数会在以下场景自动使用：

1. **打开执行对话框时**：点击"带参数执行"时，参数输入框会自动填充默认参数

2. **手动加载默认参数**：在执行对话框中点击"使用默认参数"按钮

3. **查看工作流详情**：在工作流详情页面会显示当前配置的默认参数

### API 函数

```typescript
// 获取工作流的默认参数（使用工作流名称）
const params = getWorkflowDefaults(workflowName);

// 设置工作流的默认参数（使用工作流名称）
setWorkflowDefaults(workflowName, {
  chatInput: "新的默认消息",
  sessionId: "new-session",
});

// 格式化参数为 JSON 字符串
const jsonString = formatParamsToJson(params);

// 解析 JSON 字符串为参数对象
const params = parseJsonToParams(jsonString);
```

## 最佳实践

1. **使用有意义的默认值**：设置常用的、有代表性的参数值
2. **保持参数简洁**：只包含必要的字段
3. **定期更新**：根据实际使用情况调整默认参数
4. **添加注释**：为复杂的参数配置添加说明注释

## 示例

### 聊天机器人工作流

```typescript
default: {
  chatInput: "你好，请介绍一下你自己",
  sessionId: "demo-user-001",
  language: "zh-CN",
}
```

### 数据处理工作流

```typescript
default: {
  action: "process",
  data: {
    source: "api",
    format: "json",
  },
  options: {
    timeout: 30,
    retries: 3,
  },
}
```

### 通知工作流

```typescript
default: {
  message: "测试通知消息",
  recipients: ["admin@example.com"],
  priority: "normal",
}
```

