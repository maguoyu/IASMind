# 🎯 Cursor 提示词：基于LangGraph的Text2SQL智能查询系统

## 📋 项目概述

请帮我创建一个完整的基于LangGraph的Text2SQL智能查询系统。这个系统需要将用户的自然语言查询转换为准确的SQL语句，并执行获取结果。系统应该具备高性能、高准确性，并且易于维护和扩展。

## 🏗️ 技术栈要求

### 核心框架
- **LangGraph**: 用于构建状态图工作流
- **FastAPI**: Web API框架
- **Pydantic**: 数据验证和序列化
- **SQLAlchemy**: 数据库ORM
- **Langchain**: LLM集成和向量存储
- **Milvus**: 向量数据库（用于元数据检索）

### 支持组件
- **Redis**: 缓存和会话存储
- **MySQL/PostgreSQL**: 关系数据库支持
- **Python 3.9+**: 基础运行环境
- **asyncio**: 异步编程支持

## 🎯 系统架构要求

### 1. 总体流程设计
```
用户查询 → 查询预处理 → 实体识别 → 元数据检索 → SQL生成 → SQL验证 → SQL执行 → 结果返回
```

### 2. LangGraph状态图结构
```python
# 状态节点定义
START → query_preprocessing → entity_recognition → metadata_retrieval → 
sql_generation → sql_validation → sql_execution → END

# 条件分支
- 需要澄清 → clarification_node → END
- 验证失败 → sql_generation (重试)
- 执行失败 → error_handling → END
```

### 3. 目录结构要求
```
src/text2sql/
├── graph/
│   ├── __init__.py
│   ├── types.py          # 状态类型定义
│   ├── nodes.py          # 图节点实现
│   ├── builder.py        # 图构建器
│   └── conditions.py     # 条件判断函数
├── services/
│   ├── entity_recognizer.py    # 混合实体识别器
│   ├── metadata_retriever.py   # 元数据检索服务
│   ├── sql_generator.py        # SQL生成服务
│   ├── sql_validator.py        # SQL验证服务
│   └── sql_executor.py         # SQL执行服务
├── models/
│   ├── requests.py       # API请求模型
│   ├── responses.py      # API响应模型
│   └── state_models.py   # 状态数据模型
├── routers/
│   └── text2sql_router.py # FastAPI路由
├── utils/
│   ├── performance.py    # 性能监控
│   ├── cache.py         # 缓存管理
│   └── error_handling.py # 错误处理
└── tests/
    ├── test_graph.py     # 图测试
    ├── test_services.py  # 服务测试
    └── test_integration.py # 集成测试
```

## 🔧 核心功能要求

### 1. 状态管理 (src/text2sql/graph/types.py)

```python
class Text2SQLState(MessagesState):
    """完整的Text2SQL状态定义，包含以下字段："""
    
    # 输入信息
    user_query: str = ""
    datasource_id: str = ""
    user_id: Optional[str] = None
    session_id: str = ""
    
    # 查询处理阶段
    cleaned_query: str = ""
    entities: List[str] = []
    query_intent: Dict[str, Any] = {}
    complexity_level: Literal["simple", "medium", "complex"] = "simple"
    
    # 元数据检索阶段
    relevant_tables: List[Dict[str, Any]] = []
    table_schemas: Dict[str, Any] = {}
    retrieval_confidence: float = 0.0
    
    # SQL生成阶段
    generated_sql: str = ""
    sql_explanation: str = ""
    generation_confidence: float = 0.0
    
    # 验证和执行阶段
    is_sql_valid: bool = False
    validation_errors: List[str] = []
    execution_result: Optional[Dict] = None
    result_rows: Optional[List[Dict]] = None
    
    # 流程控制
    retry_count: int = 0
    max_retries: int = 3
    need_clarification: bool = False
    clarification_message: str = ""
    
    # 性能和调试
    processing_times: Dict[str, float] = {}
    debug_steps: List[Dict[str, Any]] = []
    
    # 最终结果
    final_result: Optional[Dict] = None
    success: bool = False
    error_message: Optional[str] = None
```

### 2. 混合实体识别器 (src/text2sql/services/entity_recognizer.py)

**要求实现三种识别策略：**

1. **RULE_ONLY**: 纯规则识别（快速，低成本）
2. **LLM_ONLY**: 纯大模型识别（准确，高成本）
3. **HYBRID_FAST**: 混合快速模式（推荐，平衡性能和准确性）

**核心功能：**
- 业务实体识别（用户管理、订单系统、车辆管理等）
- 查询意图分析（统计分析、详细查询、关联查询、时间查询）
- 复杂度评估（simple/medium/complex）
- 智能策略选择

**性能要求：**
- 规则识别：< 10ms
- 混合识别：< 200ms
- 准确率：> 85%

### 3. 元数据检索服务 (src/text2sql/services/metadata_retriever.py)

**智能检索策略：**
- 基础向量搜索
- 关系感知扩展（基于表关系图）
- 关键词扩展
- 多策略结果合并和重排序

**功能要求：**
- 支持业务域过滤
- 支持表名精确匹配
- 支持相关表自动发现
- 返回结构化的表元数据

### 4. SQL生成服务 (src/text2sql/services/sql_generator.py)

**生成策略：**
- 基于检索到的表结构
- 结合查询意图和实体信息
- 使用专门优化的SQL生成提示词
- 支持复杂查询（多表关联、聚合、排序）

**质量要求：**
- SQL语法正确率 > 95%
- 支持主流数据库（MySQL, PostgreSQL）
- 生成可解释的SQL说明
- 提供置信度评分

### 5. SQL验证和执行 (src/text2sql/services/sql_validator.py & sql_executor.py)

**验证功能：**
- 语法验证（使用sqlparse）
- 语义验证（表名、字段名检查）
- 安全性检查（防止危险操作）
- 智能错误修正

**执行功能：**
- 多数据库支持
- 连接池管理
- 结果集限制
- 执行超时控制
- 详细的错误信息

## 🎯 图节点实现要求

### 1. 查询预处理节点
```python
async def query_preprocessing_node(state: Text2SQLState, config: RunnableConfig) -> Command:
    """
    功能：
    - 查询清理和标准化
    - 基础语法检查
    - 输入验证
    
    输出：
    - cleaned_query
    - 基础验证结果
    """
```

### 2. 实体识别节点
```python
async def entity_recognition_node(state: Text2SQLState, config: RunnableConfig) -> Command:
    """
    功能：
    - 使用混合识别策略
    - 业务实体提取
    - 查询意图分析
    - 复杂度评估
    
    输出：
    - entities
    - query_intent
    - complexity_level
    """
```

### 3. 元数据检索节点
```python
async def metadata_retrieval_node(state: Text2SQLState, config: RunnableConfig) -> Command:
    """
    功能：
    - 智能多策略检索
    - 相关表发现
    - 表结构组装
    - 置信度计算
    
    输出：
    - relevant_tables
    - table_schemas
    - retrieval_confidence
    """
```

### 4. SQL生成节点
```python
async def sql_generation_node(state: Text2SQLState, config: RunnableConfig) -> Command:
    """
    功能：
    - 构建上下文提示词
    - 调用LLM生成SQL
    - 解析和清理结果
    - 生成说明文档
    
    输出：
    - generated_sql
    - sql_explanation
    - generation_confidence
    """
```

### 5. SQL验证节点
```python
async def sql_validation_node(state: Text2SQLState, config: RunnableConfig) -> Command:
    """
    功能：
    - 多层验证检查
    - 错误诊断
    - 智能修正建议
    - 安全性检查
    
    输出：
    - is_sql_valid
    - validation_errors
    - corrected_sql（如果需要）
    """
```

### 6. SQL执行节点
```python
async def sql_execution_node(state: Text2SQLState, config: RunnableConfig) -> Command:
    """
    功能：
    - 安全执行SQL
    - 结果格式化
    - 性能监控
    - 错误处理
    
    输出：
    - execution_result
    - result_rows
    - final_result
    """
```

### 7. 澄清处理节点
```python
async def clarification_node(state: Text2SQLState, config: RunnableConfig) -> Command:
    """
    功能：
    - 生成澄清提示
    - 提供查询建议
    - 错误原因说明
    
    输出：
    - clarification_message
    - 建议列表
    """
```

## 🚀 API接口要求

### 1. 主查询接口
```python
@router.post("/query")
async def text_to_sql(request: Text2SQLRequest, user: User = Depends(get_current_user)):
    """
    主要的Text2SQL查询接口
    
    请求参数：
    - query: 自然语言查询
    - datasource_id: 数据源ID
    - strategy: 识别策略（可选）
    - max_retries: 最大重试次数（可选）
    
    响应：
    - success: 是否成功
    - result: 查询结果或澄清信息
    - debug_info: 调试信息（开发模式）
    - performance_metrics: 性能指标
    """
```

### 2. 流式查询接口
```python
@router.post("/query/stream")
async def text_to_sql_stream(request: Text2SQLRequest, user: User = Depends(get_current_user)):
    """
    流式Text2SQL接口，实时返回处理进度
    
    返回SSE流：
    - step_started: 步骤开始
    - step_completed: 步骤完成
    - final_result: 最终结果
    """
```

### 3. 状态查询接口
```python
@router.get("/status/{session_id}")
async def get_query_status(session_id: str):
    """查询处理状态"""
```

## 📊 性能和质量要求

### 1. 性能指标
- **总体响应时间**: < 3秒（95%的查询）
- **简单查询**: < 1秒
- **复杂查询**: < 5秒
- **并发支持**: 100+ 并发用户
- **吞吐量**: 500+ 查询/分钟

### 2. 准确性要求
- **实体识别准确率**: > 85%
- **SQL语法正确率**: > 95%
- **查询结果正确率**: > 90%
- **系统可用性**: > 99.5%

### 3. 缓存策略
- **查询结果缓存**: 相同查询1小时内复用
- **元数据缓存**: 表结构信息缓存24小时
- **LLM结果缓存**: 相似查询结果缓存
- **会话状态缓存**: Redis存储30分钟

## 🔧 配置和环境

### 1. 环境变量配置
```python
# LLM配置
LLM_MODEL="gpt-3.5-turbo"
LLM_API_KEY="your-api-key"
LLM_BASE_URL="https://api.openai.com/v1"

# 向量数据库配置
MILVUS_HOST="localhost"
MILVUS_PORT="19530"
MILVUS_DATABASE="text2sql"

# Redis配置
REDIS_URL="redis://localhost:6379"

# 数据库配置
DATABASE_URL="postgresql://user:pass@localhost/dbname"

# 性能配置
MAX_RETRIES=3
QUERY_TIMEOUT=30
MAX_RESULT_ROWS=1000
ENABLE_DEBUG=false
```

### 2. 日志和监控
```python
# 日志配置
LOG_LEVEL="INFO"
LOG_FORMAT="structured"  # json, structured, simple

# 监控指标
- 查询成功率
- 平均响应时间
- LLM调用次数和成本
- 缓存命中率
- 错误类型分布
```

## 🧪 测试要求

### 1. 单元测试
- 每个服务模块的独立测试
- 覆盖率要求 > 80%
- 包含边界条件和异常情况

### 2. 集成测试
- 完整工作流测试
- 多数据源兼容性测试
- 并发性能测试

### 3. 测试用例示例
```python
# 简单查询测试
test_cases = [
    {
        "query": "查询所有用户信息",
        "expected_entities": ["用户管理"],
        "expected_complexity": "simple",
        "should_succeed": True
    },
    {
        "query": "统计每个月的销售额和订单数量",
        "expected_entities": ["订单系统", "支付财务"],
        "expected_complexity": "complex",
        "should_succeed": True
    },
    {
        "query": "查询车辆加油记录，包括司机信息",
        "expected_entities": ["车辆管理", "用户管理"],
        "expected_complexity": "complex",
        "should_succeed": True
    }
]
```

## 📝 代码质量要求

### 1. 代码规范
- 使用Python类型注解
- 遵循PEP 8规范
- 使用有意义的变量和函数名
- 添加详细的文档字符串

### 2. 错误处理
- 完整的异常处理机制
- 详细的错误信息
- 优雅的降级策略
- 用户友好的错误提示

### 3. 安全要求
- SQL注入防护
- 输入验证和清理
- 权限控制
- 敏感信息保护

## 🎯 实现优先级

### Phase 1: 核心功能（优先）
1. 状态类型定义
2. 基础图节点实现
3. 规则实体识别器
4. 基础SQL生成和验证
5. 简单查询支持

### Phase 2: 智能增强
1. 混合实体识别器
2. 智能元数据检索
3. 复杂查询支持
4. 缓存和性能优化

### Phase 3: 高级功能
1. 流式接口
2. 完整监控系统
3. 多数据库支持
4. 高级错误处理

## 📚 请提供完整的实现

请基于以上要求，生成完整的、可直接运行的Text2SQL系统代码。确保：

1. **代码结构清晰**：按照指定目录结构组织
2. **功能完整**：实现所有核心功能模块
3. **可扩展性**：设计支持后续功能扩展
4. **生产就绪**：包含错误处理、日志、监控
5. **文档完善**：每个模块都有清晰的说明

特别注意：
- 重点实现混合实体识别策略
- 确保LangGraph状态流转正确
- 提供完整的API接口
- 包含基础的测试用例
- 添加性能监控点

谢谢！ 

## 📚 具体代码示例

### 1. 核心提示词模板示例

```python
# SQL生成提示词模板
SQL_GENERATION_PROMPT = """
你是一个专业的SQL生成专家。请基于用户查询和数据库schema生成准确的SQL语句。

## 用户查询信息
- 原始查询: {user_query}
- 清理后查询: {cleaned_query}
- 识别的业务实体: {entities}
- 查询意图: {intent_types}
- 复杂度级别: {complexity_level}

## 可用数据库Schema
{schema_info}

## 生成要求
1. SQL语法必须正确且符合{database_type}规范
2. 表名和字段名必须完全匹配schema
3. 对于聚合查询，使用适当的GROUP BY子句
4. 对于多表查询，使用正确的JOIN关系
5. 添加合理的ORDER BY排序
6. 限制结果集大小（使用LIMIT）

## 输出格式
请返回JSON格式：
{{
    "sql": "生成的SQL语句",
    "explanation": "SQL的详细说明，包括每个部分的作用",
    "confidence": 0.95,
    "complexity": "simple|medium|complex",
    "tables_used": ["表名列表"],
    "reasoning": "为什么生成这个SQL的详细推理过程"
}}

注意：
- 如果查询不够明确，在explanation中说明需要澄清的地方
- 如果涉及敏感操作（DELETE/UPDATE），设置confidence < 0.5
- 优先使用SELECT查询，避免修改数据的操作
"""
```

### 2. 实体识别提示词示例

```python
# 实体识别提示词模板  
ENTITY_RECOGNITION_PROMPT = """
你是业务实体识别专家。请分析用户查询，识别其中的业务领域和查询意图。

## 业务领域定义
{business_domains}

## 查询意图类型
{intent_types}

## 用户查询
"{query}"

## 上下文信息
{context}

## 分析要求
1. 仔细理解查询的语义含义，不仅仅是关键词匹配
2. 识别隐含的业务逻辑关系
3. 考虑查询的完整性和复杂度
4. 如果查询模糊，在reasoning中说明

## 输出格式
{{
    "entities": ["识别到的业务领域"],
    "intent_types": ["查询意图类型"],
    "complexity_level": "simple|medium|complex",
    "requires_relations": true|false,
    "confidence": 0.0-1.0,
    "keywords": ["关键词列表"],
    "reasoning": "详细的识别推理过程"
}}

## 示例分析
- "查询用户信息" → entities: ["用户管理"], intent: ["详细查询"], complexity: "simple"
- "统计每月订单金额" → entities: ["订单系统", "支付财务"], intent: ["统计分析", "时间查询"], complexity: "medium"
- "车辆加油记录和司机信息" → entities: ["车辆管理", "用户管理"], intent: ["关联查询"], complexity: "complex"
"""
```

### 3. 图构建完整示例

```python
# src/text2sql/graph/builder.py 完整示例
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from typing import Literal
import logging

logger = logging.getLogger(__name__)

def should_continue_to_execution(state: Text2SQLState) -> Literal["sql_execution", "clarification", "sql_generation"]:
    """决定SQL验证后的下一步"""
    if state["is_sql_valid"]:
        return "sql_execution"
    elif state["retry_count"] < state["max_retries"]:
        return "sql_generation"
    else:
        return "clarification"

def should_retry_or_clarify(state: Text2SQLState) -> Literal["entity_recognition", "clarification"]:
    """决定是否重试实体识别或需要澄清"""
    if not state["entities"] and state["retry_count"] < 2:
        return "entity_recognition"
    else:
        return "clarification"

def _build_text2sql_graph():
    """构建完整的Text2SQL状态图"""
    
    builder = StateGraph(Text2SQLState)
    
    # 添加所有节点
    builder.add_node("query_preprocessing", query_preprocessing_node)
    builder.add_node("entity_recognition", entity_recognition_node)
    builder.add_node("metadata_retrieval", metadata_retrieval_node)
    builder.add_node("sql_generation", sql_generation_node)
    builder.add_node("sql_validation", sql_validation_node)
    builder.add_node("sql_execution", sql_execution_node)
    builder.add_node("clarification", clarification_node)
    builder.add_node("error_handling", error_handling_node)
    
    # 设置起始点
    builder.add_edge(START, "query_preprocessing")
    
    # 主流程边
    builder.add_edge("query_preprocessing", "entity_recognition")
    
    # 条件分支：实体识别后
    builder.add_conditional_edges(
        "entity_recognition",
        lambda state: "metadata_retrieval" if state["entities"] else should_retry_or_clarify(state),
        ["metadata_retrieval", "entity_recognition", "clarification"]
    )
    
    # 条件分支：元数据检索后
    builder.add_conditional_edges(
        "metadata_retrieval",
        lambda state: "sql_generation" if state["relevant_tables"] else "clarification",
        ["sql_generation", "clarification"]
    )
    
    # SQL生成到验证
    builder.add_edge("sql_generation", "sql_validation")
    
    # 条件分支：SQL验证后
    builder.add_conditional_edges(
        "sql_validation",
        should_continue_to_execution,
        ["sql_execution", "clarification", "sql_generation"]
    )
    
    # 结束节点
    builder.add_edge("sql_execution", END)
    builder.add_edge("clarification", END)
    builder.add_edge("error_handling", END)
    
    return builder

# 创建不同配置的图实例
def create_text2sql_graph(enable_memory: bool = False, enable_debug: bool = False):
    """创建配置化的Text2SQL图"""
    builder = _build_text2sql_graph()
    
    if enable_memory:
        memory = MemorySaver()
        graph = builder.compile(checkpointer=memory)
    else:
        graph = builder.compile()
    
    if enable_debug:
        # 添加调试中间件
        graph = add_debug_middleware(graph)
    
    return graph
```

### 4. 性能监控示例

```python
# src/text2sql/utils/performance.py
import time
import asyncio
from functools import wraps
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """性能监控器"""
    
    def __init__(self):
        self.metrics = {
            "total_queries": 0,
            "successful_queries": 0,
            "failed_queries": 0,
            "average_response_time": 0,
            "llm_calls": 0,
            "cache_hits": 0,
            "cache_misses": 0
        }
        self.step_times = {}
    
    def record_query_start(self, session_id: str):
        """记录查询开始"""
        self.step_times[session_id] = {
            "start_time": time.time(),
            "steps": {}
        }
        self.metrics["total_queries"] += 1
    
    def record_step_start(self, session_id: str, step_name: str):
        """记录步骤开始"""
        if session_id in self.step_times:
            self.step_times[session_id]["steps"][step_name] = {
                "start_time": time.time()
            }
    
    def record_step_end(self, session_id: str, step_name: str, success: bool = True):
        """记录步骤结束"""
        if session_id in self.step_times and step_name in self.step_times[session_id]["steps"]:
            step_info = self.step_times[session_id]["steps"][step_name]
            step_info["end_time"] = time.time()
            step_info["duration"] = step_info["end_time"] - step_info["start_time"]
            step_info["success"] = success
    
    def record_query_end(self, session_id: str, success: bool):
        """记录查询结束"""
        if session_id in self.step_times:
            query_info = self.step_times[session_id]
            query_info["end_time"] = time.time()
            query_info["total_duration"] = query_info["end_time"] - query_info["start_time"]
            
            if success:
                self.metrics["successful_queries"] += 1
            else:
                self.metrics["failed_queries"] += 1
            
            # 更新平均响应时间
            total_queries = self.metrics["total_queries"]
            current_avg = self.metrics["average_response_time"]
            new_duration = query_info["total_duration"]
            self.metrics["average_response_time"] = (current_avg * (total_queries - 1) + new_duration) / total_queries
            
            # 清理旧数据
            del self.step_times[session_id]
    
    def get_performance_report(self) -> Dict[str, Any]:
        """获取性能报告"""
        success_rate = 0
        if self.metrics["total_queries"] > 0:
            success_rate = self.metrics["successful_queries"] / self.metrics["total_queries"]
        
        return {
            "total_queries": self.metrics["total_queries"],
            "success_rate": success_rate,
            "average_response_time_ms": self.metrics["average_response_time"] * 1000,
            "llm_calls": self.metrics["llm_calls"],
            "cache_hit_rate": self._calculate_cache_hit_rate(),
            "current_active_queries": len(self.step_times)
        }
    
    def _calculate_cache_hit_rate(self) -> float:
        """计算缓存命中率"""
        total_cache_requests = self.metrics["cache_hits"] + self.metrics["cache_misses"]
        if total_cache_requests == 0:
            return 0.0
        return self.metrics["cache_hits"] / total_cache_requests

# 全局性能监控实例
performance_monitor = PerformanceMonitor()

def monitor_performance(step_name: str):
    """性能监控装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(state: Text2SQLState, config=None, *args, **kwargs):
            session_id = state.get("session_id", "unknown")
            
            performance_monitor.record_step_start(session_id, step_name)
            
            try:
                result = await func(state, config, *args, **kwargs)
                performance_monitor.record_step_end(session_id, step_name, True)
                return result
            except Exception as e:
                performance_monitor.record_step_end(session_id, step_name, False)
                raise
        
        return wrapper
    return decorator
```

### 5. 完整使用示例

```python
# 完整的Text2SQL使用示例
async def complete_text2sql_example():
    """完整的Text2SQL系统使用示例"""
    
    # 1. 初始化系统
    from src.text2sql.graph.builder import create_text2sql_graph
    from src.text2sql.models.requests import Text2SQLRequest
    from src.text2sql.utils.performance import performance_monitor
    
    # 创建图实例
    text2sql_graph = create_text2sql_graph(enable_memory=True, enable_debug=True)
    
    # 2. 准备测试用例
    test_cases = [
        {
            "description": "简单用户查询",
            "query": "查询所有用户的基本信息",
            "datasource_id": "ds_001",
            "expected_complexity": "simple",
            "expected_entities": ["用户管理"]
        },
        {
            "description": "复杂统计查询",
            "query": "统计每个月车辆的加油总费用，按照司机分组",
            "datasource_id": "ds_002", 
            "expected_complexity": "complex",
            "expected_entities": ["车辆管理", "支付财务", "用户管理"]
        },
        {
            "description": "关联查询",
            "query": "查询最近一周的订单详情，包括商品信息和用户信息",
            "datasource_id": "ds_001",
            "expected_complexity": "complex",
            "expected_entities": ["订单系统", "商品管理", "用户管理"]
        }
    ]
    
    # 3. 执行测试
    results = []
    
    for i, test_case in enumerate(test_cases):
        print(f"\n{'='*50}")
        print(f"测试用例 {i+1}: {test_case['description']}")
        print(f"查询: {test_case['query']}")
        print(f"{'='*50}")
        
        # 创建初始状态
        initial_state = Text2SQLState(
            user_query=test_case["query"],
            datasource_id=test_case["datasource_id"],
            user_id="test_user",
            session_id=f"test_session_{i+1}",
            max_retries=3
        )
        
        # 开始性能监控
        performance_monitor.record_query_start(initial_state["session_id"])
        
        try:
            # 执行Text2SQL工作流
            config = {
                "configurable": {
                    "thread_id": f"test_thread_{i+1}",
                    "enable_debug": True
                }
            }
            
            final_state = await text2sql_graph.ainvoke(initial_state, config)
            
            # 记录成功
            performance_monitor.record_query_end(initial_state["session_id"], final_state["success"])
            
            # 输出结果
            if final_state["success"]:
                print("✅ 查询成功!")
                print(f"生成的SQL: {final_state['generated_sql']}")
                print(f"SQL说明: {final_state['sql_explanation']}")
                print(f"返回行数: {len(final_state.get('result_rows', []))}")
                print(f"处理时间: {sum(final_state['processing_times'].values()):.2f}ms")
                
                # 验证预期结果
                if final_state["complexity_level"] == test_case["expected_complexity"]:
                    print("✅ 复杂度评估正确")
                else:
                    print(f"⚠️ 复杂度评估不符: 预期{test_case['expected_complexity']}, 实际{final_state['complexity_level']}")
                
                actual_entities = set(final_state["entities"])
                expected_entities = set(test_case["expected_entities"])
                if expected_entities.issubset(actual_entities):
                    print("✅ 实体识别正确")
                else:
                    print(f"⚠️ 实体识别不完整: 预期{expected_entities}, 实际{actual_entities}")
                
            else:
                print("❌ 查询失败!")
                print(f"错误信息: {final_state['error_message']}")
                if final_state.get("need_clarification"):
                    print(f"需要澄清: {final_state['clarification_message']}")
            
            results.append({
                "test_case": test_case,
                "result": final_state,
                "success": final_state["success"]
            })
            
        except Exception as e:
            performance_monitor.record_query_end(initial_state["session_id"], False)
            print(f"❌ 执行异常: {str(e)}")
            results.append({
                "test_case": test_case,
                "result": None,
                "success": False,
                "error": str(e)
            })
    
    # 4. 生成性能报告
    print(f"\n{'='*50}")
    print("性能报告")
    print(f"{'='*50}")
    
    report = performance_monitor.get_performance_report()
    print(f"总查询数: {report['total_queries']}")
    print(f"成功率: {report['success_rate']:.2%}")
    print(f"平均响应时间: {report['average_response_time_ms']:.1f}ms")
    print(f"LLM调用次数: {report['llm_calls']}")
    print(f"缓存命中率: {report['cache_hit_rate']:.2%}")
    
    # 5. 总结测试结果
    successful_tests = sum(1 for r in results if r["success"])
    print(f"\n测试总结: {successful_tests}/{len(test_cases)} 个测试用例通过")
    
    return results

# 运行示例
if __name__ == "__main__":
    import asyncio
    asyncio.run(complete_text2sql_example())
```

### 6. 部署和配置示例

```python
# docker-compose.yml 示例
version: '3.8'
services:
  text2sql-api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/text2sql
      - REDIS_URL=redis://redis:6379
      - MILVUS_HOST=milvus
      - LLM_API_KEY=${LLM_API_KEY}
    depends_on:
      - postgres
      - redis
      - milvus

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: text2sql
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    
  milvus:
    image: milvusdb/milvus:latest
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
    depends_on:
      - etcd
      - minio

volumes:
  postgres_data:
```

```python
# 环境配置示例 (.env)
# LLM配置
LLM_MODEL=gpt-3.5-turbo
LLM_API_KEY=sk-your-openai-api-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_TIMEOUT=30

# 向量数据库
MILVUS_HOST=localhost
MILVUS_PORT=19530
MILVUS_DATABASE=text2sql

# 缓存
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# 数据库
DATABASE_URL=postgresql://user:pass@localhost/text2sql

# 性能配置
MAX_RETRIES=3
QUERY_TIMEOUT=30
MAX_RESULT_ROWS=1000
MAX_CONCURRENT_QUERIES=100

# 日志
LOG_LEVEL=INFO
LOG_FORMAT=json
ENABLE_DEBUG=false

# 监控
METRICS_ENABLED=true
METRICS_PORT=9090
```

这个完整的Cursor提示词包含了：

1. **详细的系统架构设计**
2. **完整的技术栈要求**
3. **具体的代码实现模板**
4. **性能监控和测试框架**
5. **部署和配置指南**
6. **实际可运行的示例代码**

你可以直接将这个提示词复制给Cursor，它将生成一个功能完整、结构清晰、可直接部署的基于LangGraph的Text2SQL系统！

谢谢！ 