# n8n 工作流文档

本目录包含 IASMind 项目中使用的 n8n 工作流配置文件。

## 📋 工作流列表

### 1. 智能问答机器人 (`intelligent-qa-bot.json`)

**功能描述**：提供智能问答服务，支持多轮对话、上下文理解和知识库查询。

**核心特性**：
- ✅ 多轮对话支持（带会话记忆）
- ✅ 上下文理解和连续对话
- ✅ 知识库集成
- ✅ 网络搜索能力
- ✅ 代码执行和数据处理
- ✅ 结构化 JSON 响应

**节点架构**：
```
Webhook 接收 → 数据提取 → AI 智能体 → 格式化结果 → 返回响应
                              ↓
                    OpenAI 模型 + 对话记忆
                              ↓
            搜索工具 + 代码工具 + 知识库工具
```

**API 接口**：
- **URL**: `POST /webhook/qa-bot`
- **请求体**:
```json
{
  "question": "你的问题",
  "sessionId": "用户会话ID（可选）",
  "context": "额外上下文信息（可选）",
  "userId": "用户ID（可选）"
}
```

- **响应体**:
```json
{
  "success": true,
  "timestamp": "2025-10-30T12:00:00.000Z",
  "sessionId": "session-123",
  "question": "你的问题",
  "answer": "AI的回答",
  "metadata": {
    "responseTime": 1234567890,
    "answerLength": 150,
    "hasContext": true
  },
  "message": "问答完成"
}
```

**配置要求**：
- OpenAI API 凭证（已配置）
- 模型：`qwen3-max-preview`
- 温度：`0.7`（适中创造性）
- 最大 Token：`2000`

**工具说明**：

1. **网络搜索工具**
   - 用途：搜索实时信息、最新数据
   - 触发：AI 判断需要外部信息时自动调用
   - 配置：需要配置搜索 API URL

2. **代码处理工具**
   - 用途：数据处理、计算、文本分析
   - 语言：Python
   - 能力：JSON 处理、数学计算、字符串操作

3. **知识库查询工具**
   - 用途：查询企业内部知识库
   - 配置：环境变量 `KNOWLEDGE_BASE_URL`
   - 默认：`http://localhost:8000/api/knowledge/search`

**使用场景**：
- 💬 客户服务问答
- 📚 知识库查询
- 💡 技术支持
- 📝 文档检索
- 🔍 信息查询

**最佳实践**：
- 为每个用户使用唯一的 `sessionId` 以维持对话上下文
- 提供 `context` 可以获得更准确的答案
- 对话记忆保留最近的对话历史（窗口记忆）

---

### 2. 航油采购合同审查 (`aviation-fuel-contract-review.json`)

**功能描述**：智能审查航空燃油采购合同，识别风险、评估合规性。

**核心特性**：
- ✅ 合同条款自动提取
- ✅ 多维度风险评估（价格、供应、质量、法律、财务）
- ✅ 合规性检查
- ✅ 结构化审查报告
- ✅ 修改建议生成

**API 接口**：
- **URL**: `POST /webhook/contract-review`
- **请求体**:
```json
{
  "contractText": "合同全文",
  "contractId": "合同编号",
  "supplierName": "供应商名称",
  "contractAmount": 1000000,
  "sessionId": "会话ID（可选）"
}
```

**配置要求**：
- 模型：`qwen3-next-80b-a3b-instruct`
- 温度：`0.3`（低温度，更严谨）
- 最大 Token：`4000`

**工具说明**：
1. **Terms Extractor**：提取合同关键条款
2. **Risk Assessment Tool**：量化风险评估
3. **Compliance Checker**：合规性检查

---

### 3. 聊天 Webhook (`chat-webhook.json`)

**功能描述**：笑话机器人示例，展示 AI Agent 与外部 API 集成。

**核心特性**：
- ✅ Chat Trigger 和 Webhook 双触发器
- ✅ 调用 Joke API 获取笑话
- ✅ Code Tool 集成
- ✅ 简单对话记忆

**API 接口**：
- **URL**: `POST /webhook/joke-webhook`
- **请求体**:
```json
{
  "chatInput": "Tell me a joke",
  "sessionId": "session-id"
}
```

---

## 🚀 工作流导入指南

### 方法 1: 通过 n8n UI 导入

1. 登录 n8n 管理界面
2. 点击右上角 **"+"** 按钮
3. 选择 **"Import from File"**
4. 选择对应的 `.json` 文件
5. 点击 **"Import"** 导入

### 方法 2: 通过 API 导入

使用项目提供的 Python API 接口：

```python
import requests

# 读取工作流文件
with open('n8n/workflow/intelligent-qa-bot.json', 'r') as f:
    workflow_data = json.load(f)

# 导入工作流
response = requests.post(
    'http://localhost:8000/api/n8n/workflows',
    json=workflow_data
)
```

### 方法 3: 通过前端界面导入

1. 访问 `http://localhost:3000/n8n`
2. 点击 **"导入工作流"** 按钮
3. 选择 JSON 文件或粘贴 JSON 内容
4. 点击 **"导入"** 完成

---

## ⚙️ 配置要求

### 必需的凭证

所有工作流需要配置 OpenAI API 凭证：

1. 在 n8n 中打开 **"Credentials"**
2. 添加 **"OpenAI API"** 凭证
3. 输入 API Key
4. 保存为 **"OpenAi account"**（ID: `9LqVI8o5oytd2Z4c`）

### 环境变量（可选）

```bash
# 知识库 URL（用于知识库查询工具）
KNOWLEDGE_BASE_URL=http://localhost:8000/api/knowledge/search

# 搜索 API URL（用于网络搜索工具）
SEARCH_API_URL=https://api.example.com/search
```

---

## 🔧 自定义和扩展

### 修改 AI 模型

在工作流的 **"OpenAI Chat Model"** 节点中修改：

```json
{
  "model": "qwen3-max-preview",  // 修改为其他模型
  "temperature": 0.7,             // 调整创造性
  "maxTokens": 2000               // 调整最大输出长度
}
```

### 添加新工具

1. 在工作流编辑器中添加新节点
2. 选择工具类型：
   - **HTTP Request Tool**：调用外部 API
   - **Code Tool**：Python/JavaScript 代码
   - **其他 AI Tools**
3. 配置工具描述（AI 会根据描述判断是否使用）
4. 连接到 AI Agent 节点的 `ai_tool` 输入

### 自定义 System Prompt

修改 AI Agent 节点的 `systemMessage` 参数，定制 AI 的行为和输出格式。

---

## 📊 监控和日志

### 查看执行历史

1. 在 n8n UI 中打开工作流
2. 点击 **"Executions"** 标签
3. 查看每次执行的详细日志

### API 监控

通过项目 API 获取执行记录：

```bash
GET /api/n8n/workflows/{workflowId}/executions
```

---

## 🐛 故障排查

### 常见问题

**问题 1**：工作流导入失败
- **原因**：JSON 格式错误或版本不兼容
- **解决**：验证 JSON 格式，检查 n8n 版本（需 1.116.2+）

**问题 2**：AI 不调用工具
- **原因**：工具描述不清晰
- **解决**：优化工具的 `description` 字段，明确说明使用场景

**问题 3**：超时错误
- **原因**：AI 处理时间过长
- **解决**：已配置 5 分钟超时（参考 `n8n_router.py`）

**问题 4**：对话记忆不工作
- **原因**：sessionId 未正确传递
- **解决**：确保每次请求使用相同的 `sessionId`

---

## 📚 参考资源

- [n8n 官方文档](https://docs.n8n.io/)
- [n8n AI 节点文档](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain/)
- [OpenAI API 文档](https://platform.openai.com/docs)
- [项目开发规范](../../.cursor/README.md)

---

## 🔄 版本历史

| 日期 | 工作流 | 版本 | 变更说明 |
|------|--------|------|----------|
| 2025-10-30 | intelligent-qa-bot.json | 1.0 | 初始版本，支持智能问答 |
| 2025-10-30 | aviation-fuel-contract-review.json | 1.0 | 合同审查工作流 |
| 2025-10-30 | chat-webhook.json | 1.0 | 笑话机器人示例 |

---

## 📝 贡献指南

### 添加新工作流

1. 在 n8n UI 中设计并测试工作流
2. 导出为 JSON 文件
3. 保存到 `n8n/workflow/` 目录
4. 使用中文节点命名
5. 更新本 README 文档
6. 提交代码审查

### 命名规范

- 文件名：`功能-描述.json`（使用英文，小写，连字符分隔）
- 节点名：使用中文，描述功能
- Webhook 路径：简洁、语义化

---

**最后更新**：2025-10-30
**维护者**：IASMind 开发团队

