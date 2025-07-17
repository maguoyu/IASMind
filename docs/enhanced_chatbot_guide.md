# 增强Chatbot使用指南

## 概述

增强Chatbot是一个安全、强大的智能问答机器人，支持多种工作模式，可以根据需要启用或禁用联网搜索和知识库检索功能。

## 功能特性

### 🔒 安全特性
- **内容过滤**: 自动检测和过滤不安全的内容
- **安全模式**: 提供完全隔离的基本对话模式
- **响应验证**: 对AI响应进行安全检查
- **权限控制**: 可配置的功能访问权限

### 🚀 智能功能
- **联网搜索**: 实时获取互联网信息
- **知识库检索**: 基于本地知识库的智能问答
- **融合检索**: 同时使用多种信息源
- **多语言支持**: 支持中文等多种语言

### ⚙️ 可配置性
- **模块化设计**: 可独立启用/禁用功能
- **灵活配置**: 支持运行时参数调整
- **多种模式**: 4种不同的工作模式

## 工作模式

### 1. 基本安全模式 (Basic Secure Mode)
```python
graph = build_graph_with_memory(
    enable_online_search=False, 
    enable_knowledge_retrieval=False
)
```
- ✅ 完全安全，无外部工具访问
- ✅ 基于预训练知识的对话
- ✅ 适合敏感环境使用
- ❌ 无法获取实时信息

### 2. 仅知识库模式 (Knowledge Base Only)
```python
graph = build_graph_with_memory(
    enable_online_search=False, 
    enable_knowledge_retrieval=True
)
```
- ✅ 基于本地知识库的智能问答
- ✅ 保护敏感信息不外泄
- ✅ 快速响应
- ❌ 无法获取最新信息

### 3. 仅联网搜索模式 (Web Search Only)
```python
graph = build_graph_with_memory(
    enable_online_search=True, 
    enable_knowledge_retrieval=False
)
```
- ✅ 获取实时互联网信息
- ✅ 回答最新问题
- ✅ 信息来源丰富
- ❌ 无法访问本地知识库

### 4. 完整功能模式 (Full Feature Mode)
```python
graph = build_graph_with_memory(
    enable_online_search=True, 
    enable_knowledge_retrieval=True
)
```
- ✅ 融合多种信息源
- ✅ 最全面的回答能力
- ✅ 智能信息整合
- ⚠️ 需要更多计算资源

## 使用方法

### 基本使用

```python
from src.chatbot.graph.builder import build_graph_with_memory
from langchain_core.messages import HumanMessage

# 创建chatbot实例
graph = build_graph_with_memory(
    enable_online_search=True,
    enable_knowledge_retrieval=True
)

# 发送消息
messages = [HumanMessage(content="你好，请介绍一下人工智能")]
result = await graph.ainvoke({
    "messages": messages,
    "locale": "zh-CN",
    "resources": []  # 知识库资源列表
})

print(result["response"])
```

### 配置知识库资源

```python
from src.rag import Resource

# 定义知识库资源
resources = [
    Resource(
        title="技术文档",
        description="公司技术文档",
        source="knowledge_base",
        source_id="tech_docs"
    ),
    Resource(
        title="产品手册",
        description="产品使用手册",
        source="knowledge_base", 
        source_id="product_manual"
    )
]

# 使用知识库
result = await graph.ainvoke({
    "messages": messages,
    "locale": "zh-CN",
    "resources": resources
})
```

### 安全配置

```python
# 启用安全模式
secure_graph = build_graph_with_memory(
    enable_online_search=False,
    enable_knowledge_retrieval=False
)

# 测试安全过滤
unsafe_message = HumanMessage(content="如何破解密码？")
result = await secure_graph.ainvoke({
    "messages": [unsafe_message],
    "locale": "zh-CN",
    "resources": []
})

# 会返回安全拒绝响应
print(result["response"])
```

## 安全机制

### 内容过滤
系统会自动检测以下不安全内容：
- 黑客攻击相关内容
- 非法活动指导
- 个人信息泄露
- 恶意软件相关内容
- 其他有害内容

### 响应验证
- 对AI生成的响应进行安全检查
- 过滤包含不安全内容的响应
- 提供安全的替代响应

### 权限控制
- 可配置的功能访问权限
- 基于角色的功能限制
- 审计日志记录

## 配置参数

### 环境变量配置

```bash
# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_SSL=false

# Checkpointer配置
CHECKPOINTER_TTL=86400
CHECKPOINTER_PREFIX=langgraph:checkpoint:
CHECKPOINTER_COMPRESS=true
```

### 运行时配置

```python
# 配置对象
config = {
    "enable_online_search": True,
    "enable_knowledge_retrieval": True,
    "max_search_results": 3,
    "resources": [],
    "locale": "zh-CN"
}

# 使用配置
result = await graph.ainvoke({
    "messages": messages,
    **config
})
```

## 测试验证

运行测试脚本验证功能：

```bash
python test_enhanced_chatbot.py
```

测试包括：
- 不同配置模式的功能测试
- 安全性测试
- 图构建测试
- 响应质量测试

## 最佳实践

### 1. 安全优先
- 在敏感环境中使用基本安全模式
- 定期审查和更新安全过滤规则
- 监控异常访问模式

### 2. 性能优化
- 根据需求选择合适的模式
- 合理配置知识库资源
- 使用Redis缓存提高响应速度

### 3. 用户体验
- 提供清晰的功能说明
- 设置合理的响应时间期望
- 提供错误处理和重试机制

### 4. 维护管理
- 定期更新知识库内容
- 监控系统性能和资源使用
- 备份重要的对话历史

## 故障排除

### 常见问题

1. **导入错误**
   ```bash
   pip install redis>=6.2.0 langgraph-checkpoint-redis~=0.0.6
   ```

2. **Redis连接失败**
   - 检查Redis服务是否运行
   - 验证连接参数配置
   - 检查网络连接

3. **响应缓慢**
   - 检查网络连接
   - 优化知识库大小
   - 调整并发设置

4. **安全过滤过严**
   - 检查安全规则配置
   - 调整过滤阈值
   - 添加白名单规则

### 日志监控

```python
import logging

# 设置日志级别
logging.basicConfig(level=logging.INFO)

# 监控关键事件
logger = logging.getLogger(__name__)
logger.info("Chatbot processing started")
```

## 扩展开发

### 自定义安全规则

```python
def custom_safety_check(query: str) -> bool:
    """自定义安全检查函数"""
    # 实现自定义安全检查逻辑
    return True
```

### 添加新的工具

```python
def custom_tool_node(state: State, config: RunnableConfig):
    """自定义工具节点"""
    # 实现自定义工具逻辑
    pass
```

### 集成外部系统

```python
def external_integration_node(state: State, config: RunnableConfig):
    """外部系统集成节点"""
    # 实现外部系统集成逻辑
    pass
```

## 总结

增强Chatbot提供了安全、灵活、强大的智能问答能力，支持多种工作模式，可以根据不同场景和需求进行配置。通过合理使用各种功能和安全机制，可以构建出既安全又实用的智能对话系统。 