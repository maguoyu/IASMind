# 数据分析接口性能优化指南

## 问题分析

接口 `/api/data-exploration/analyze` 使用参数 `use_llm=true` 时存在性能瓶颈。主要问题包括：

### 1. **多次调用大模型（主要原因）**
- 第一次调用：生成图表配置（最耗时）
- 第二次调用：优化 Markdown 文档（附加耗时）
- 单次 LLM 调用可能需要 15-30 秒

### 2. **同步阻塞式处理**
- 图表生成→数据洞察→Markdown优化 严格按顺序执行
- 洞察生成和 Markdown 优化会阻塞接口响应

### 3. **缺少缓存机制**
- 相同数据的重复分析会重新调用 LLM
- 无法利用之前的计算结果

### 4. **缺少超时和降级机制**
- LLM 响应缓慢时，整个接口卡顿
- 没有自动降级到传统模式的机制

---

## 优化方案

### 方案 1: 响应快速化（立即实施）

#### 1.1 异步生成洞察和 Markdown

**问题**: 生成 Markdown 需要再调用一次 LLM，这是主要瓶颈

**优化**:
- 先返回图表配置给前端
- 后续异步生成洞察和 Markdown
- 前端可使用 WebSocket 或轮询获取更新

```python
# 修改后的流程
async def generate_chart(use_llm=True):
    # 步骤1: 调用LLM生成图表配置（必需）- ~15-20秒
    chart_spec = await llm_generate_chart()
    
    # 步骤2: 回填数据（快速）- ~100ms
    chart_spec = populate_data(chart_spec)
    
    # 立即返回第一阶段结果
    return {
        "spec": chart_spec,
        "status": "generating_insights",  # 标记状态
        "insights_md": None
    }
    
    # 步骤3-4: 异步执行（不阻塞返回）
    asyncio.create_task(generate_insights_async(chart_spec))
```

**预期效果**: 首次响应时间从 40-60 秒减少到 20-25 秒

---

#### 1.2 添加响应缓存

**问题**: 相同数据文件多次分析时重复调用 LLM

**优化**:
```python
# 基于数据内容计算哈希值
cache_key = hash(data_shape + column_names + sample_rows + user_prompt)

# 缓存 LLM 响应
if cache_key in response_cache:
    return cached_response  # 直接返回
else:
    response = await call_llm(prompt)
    response_cache[cache_key] = response
    return response
```

**配置**:
- 缓存最多 100 个结果
- 使用 LRU 策略自动清理旧缓存
- 缓存时间: 24 小时（可配置）

**预期效果**: 缓存命中时响应时间 < 1 秒

---

#### 1.3 添加超时和降级

**问题**: LLM 响应缓慢时整个接口超时

**优化**:
```python
try:
    response = await asyncio.wait_for(
        llm_call(prompt),
        timeout=30  # 30秒超时
    )
except asyncio.TimeoutError:
    logger.warning("LLM超时，自动降级到传统模式")
    return traditional_chart_generation(df)  # 回退方案
```

**预期效果**: 
- 99% 的请求在 30 秒内完成
- 超时时自动降级到传统模式（无 LLM）

---

### 方案 2: 提示工程优化（中期）

#### 2.1 精简提示信息

**现状**: 提示包含完整的数据样本和统计信息

**优化**:
```python
# 原始
"数据样本:\n" + json.dumps(full_sample_data)  # 可能 2KB+

# 优化后
"数据样本 (前3行): " + json.dumps(sample_data[:3])  # ~500B
"关键统计: 行数{rows}, 列数{cols}, 数值列{numeric_cols}"
```

**预期效果**: 
- 提示长度减少 50-70%
- LLM 处理速度提升 10-15%

---

#### 2.2 使用流式响应

**实现**:
```python
# 使用 Server-Sent Events (SSE)
async def analyze_data_stream(request):
    async def event_generator():
        # 步骤1: 生成图表
        yield f"data: {json.dumps({'status': 'generating', 'phase': 'chart'})}\n\n"
        chart = await llm_generate_chart()
        yield f"data: {json.dumps({'status': 'done', 'phase': 'chart', 'spec': chart})}\n\n"
        
        # 步骤2: 生成洞察
        yield f"data: {json.dumps({'status': 'generating', 'phase': 'insights'})}\n\n"
        insights = await generate_insights(chart)
        yield f"data: {json.dumps({'status': 'done', 'phase': 'insights', 'data': insights})}\n\n"
    
    return StreamingResponse(event_generator())
```

**前端处理**:
```typescript
const eventSource = new EventSource('/api/data-exploration/analyze?stream=true');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.phase === 'chart') {
    setChart(data.spec);  // 立即显示图表
  } else if (data.phase === 'insights') {
    setInsights(data.data);  // 显示洞察
  }
};
```

**预期效果**: 用户可逐步看到结果，感知更快

---

### 方案 3: 架构级优化（长期）

#### 3.1 使用更快的模型

**比较**:
| 模型 | 响应时间 | 成本 | 质量 |
|------|---------|------|------|
| GPT-4 | 20-30s | 高 | 最优 |
| Claude-3.5 | 15-20s | 高 | 优秀 |
| Llama-2 | 8-12s | 低 | 良好 |
| Doubao Pro | 10-15s | 中 | 优秀 |

**优化**:
```python
# 根据数据大小和复杂度选择模型
if data_size < 1MB:
    model = "fast_model"  # 快速但低成本
elif data_complexity < "medium":
    model = "balanced_model"  # 折衷方案
else:
    model = "premium_model"  # 最优质量
```

---

#### 3.2 使用本地模型（Ollama）

**优点**:
- 响应时间 < 5 秒（取决于硬件）
- 完全离线，无延迟
- 成本零（仅硬件成本）

**缺点**:
- 质量可能低于云模型
- 需要本地 GPU 支持

**实现**:
```python
if use_local_model:
    llm = Ollama(model="mistral", base_url="http://localhost:11434")
else:
    llm = OpenAI(model="gpt-4")
```

---

#### 3.3 构建图表模板库

**思路**: 预制常见图表类型的 JSON 模板

```python
CHART_TEMPLATES = {
    "bar_chart": {
        "xAxis": {"type": "category", "data": []},
        "yAxis": {"type": "value"},
        "series": [{"type": "bar", "data": []}]
    },
    "line_chart": { ... }
}

# 使用
if user_prompt in PREDEFINED_CHARTS:
    return CHART_TEMPLATES[user_prompt]  # 无需调用LLM
```

**预期效果**: 常见图表零延迟返回

---

## 实施优先级

### 第一阶段（立即）- 收益最大，工作量小
1. ✅ 异步生成洞察和 Markdown（20-30% 性能提升）
2. ✅ 添加响应缓存（缓存命中时 >90% 性能提升）
3. ✅ 添加超时和降级（稳定性提升）

### 第二阶段（1-2 周）- 持续优化
4. 精简提示信息（10-15% 性能提升）
5. 实现流式响应（UX 显著提升）
6. 根据数据复杂度选择模型

### 第三阶段（长期）- 架构升级
7. 集成本地模型选项
8. 构建图表模板库
9. 实现智能预缓存

---

## 性能基准测试

### 优化前
```
小文件 (< 10KB)：45-60 秒
中等文件 (10-100KB)：60-80 秒
大文件 (> 100KB)：90+ 秒
缓存命中：不存在
```

### 优化后（第一阶段）
```
小文件 (< 10KB)：15-20 秒 (首次返回)
中等文件 (10-100KB)：20-25 秒 (首次返回)
大文件 (> 100KB)：30-35 秒 (首次返回)
缓存命中：< 1 秒

洞察&Markdown：后台异步生成 (20-30秒)
```

### 优化后（全部阶段）
```
小文件：8-12 秒 (使用快速模型/缓存)
中等文件：12-15 秒
大文件：15-20 秒
缓存命中：< 100ms
预定义图表：< 50ms
```

---

## 配置参数

在 `conf.yaml` 中添加：

```yaml
DATA_ANALYSIS:
  # LLM 设置
  LLM_TIMEOUT: 30  # 秒
  LLM_CACHE_SIZE: 100  # 最多缓存条数
  LLM_CACHE_TTL: 86400  # 缓存时间（秒），24小时
  
  # 降级模型配置
  USE_FALLBACK_MODEL: true  # 超时时是否降级
  FALLBACK_MODEL: "traditional"  # traditional 或 fast_llm
  
  # 流式响应
  ENABLE_STREAMING: true
  STREAM_UPDATE_INTERVAL: 2  # 秒
  
  # 模型选择策略
  AUTO_MODEL_SELECTION: true
  FAST_MODEL_SIZE_THRESHOLD: 1000000  # 1MB
```

---

## 前端适配

### 处理异步更新

```typescript
interface AnalysisResponse {
  spec: any;
  status: 'generating' | 'done';
  insights_md?: string;
  insights?: any[];
}

const handleAnalyze = async (fileId: string) => {
  const response = await analyzeData({ file_id: fileId, use_llm: true });
  
  // 立即显示图表
  setChart(response.spec);
  setAnalysisStatus(response.status);
  
  // 如果状态是生成中，定期轮询更新
  if (response.status === 'generating') {
    const pollInterval = setInterval(async () => {
      const updated = await getAnalysisStatus(fileId);
      if (updated.status === 'done') {
        setInsightsMd(updated.insights_md);
        setInsights(updated.insights);
        clearInterval(pollInterval);
      }
    }, 2000);
  }
};
```

---

## 监控指标

添加以下指标到监控系统：

```python
# Prometheus 指标
llm_chart_generation_seconds = Histogram(
    'llm_chart_generation_seconds', 
    '图表生成耗时'
)

llm_cache_hits = Counter(
    'llm_cache_hits_total',
    '缓存命中次数'
)

llm_cache_misses = Counter(
    'llm_cache_misses_total',
    '缓存未命中次数'
)

llm_timeout_errors = Counter(
    'llm_timeout_errors_total',
    'LLM 超时错误'
)
```

---

## 测试清单

- [ ] 缓存机制正常工作
- [ ] 超时自动降级
- [ ] 异步任务不影响首次响应
- [ ] 相同数据的缓存命中
- [ ] 大文件处理性能
- [ ] 流式响应前端兼容
- [ ] 降级模式图表生成
- [ ] WebSocket 连接稳定性

---

## 常见问题

**Q: 为什么首次返回时洞察是空的？**
A: 为了快速返回，洞察和 Markdown 在后台异步生成。您可以通过轮询或 WebSocket 获取更新。

**Q: 缓存会一直增长吗？**
A: 不会，使用 LRU 策略，最多保留 100 个缓存条目。

**Q: 超时后能重试吗？**
A: 超时自动降级到传统模式，无需重试。

**Q: 本地模型和云模型如何选择？**
A: 可根据数据大小和对质量的要求配置，或在请求时指定。

---

## 参考资源

- LangChain Async: https://python.langchain.com/docs/guides/async
- ECharts 文档: https://echarts.apache.org/
- Server-Sent Events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
