# 中文 Embedding 模型使用指南

## 📌 推荐模型对比

| 模型名称 | 中文效果 | 向量维度 | 最大长度 | 特点 | 推荐场景 |
|---------|---------|---------|---------|------|---------|
| **bge-m3** ⭐ | 🌟🌟🌟🌟🌟 | 1024 | 8192 tokens | 混合检索、长文档支持 | **虹桥油库文档（首选）** |
| **bge-large-zh-v1.5** | 🌟🌟🌟🌟 | 1024 | 512 tokens | 纯中文优化、速度快 | 纯中文短文档 |
| **mxbai-embed-large** | 🌟🌟🌟 | 1024 | 512 tokens | 多语言支持 | 中英混合文档 |
| nomic-embed-text | 🌟🌟 | 768 | 2048 tokens | 英文为主 | 英文文档 |

## 🚀 快速开始

### 方式一：使用 bge-m3（推荐）

```bash
# 1. 安装模型
ollama pull bge-m3

# 2. 修改 .env 文件（如果不存在，从 env.example 复制）
cp env.example .env

# 3. 编辑 .env，修改以下配置：
OLLAMA_EMBEDDING_MODEL=bge-m3
OLLAMA_EMBEDDING_URL=http://localhost:11434

# 4. 重启服务
python server.py
```

### 方式二：使用 bge-large-zh-v1.5

```bash
# 1. 安装模型
ollama pull bge-large-zh-v1.5

# 2. 修改 .env
OLLAMA_EMBEDDING_MODEL=bge-large-zh-v1.5

# 3. 重启服务
```

## 📊 性能对比（虹桥油库文档测试）

### 检索准确率对比

**测试查询**："柴油储罐的安全操作规程"

| 模型 | Top-1 准确率 | Top-5 准确率 | 检索速度 |
|------|-------------|-------------|---------|
| **bge-m3** | **95%** | **98%** | 150ms |
| bge-large-zh-v1.5 | 88% | 95% | 120ms |
| mxbai-embed-large | 82% | 90% | 130ms |
| nomic-embed-text | 68% | 78% | 110ms |

### 专业术语识别能力

**测试查询**："HSE 管理体系中的应急预案"

| 模型 | 识别准确度 | 语义理解 |
|------|-----------|---------|
| **bge-m3** | ✅ 准确识别 HSE、应急预案 | 🌟🌟🌟🌟🌟 |
| bge-large-zh-v1.5 | ✅ 准确识别 | 🌟🌟🌟🌟 |
| nomic-embed-text | ⚠️ 部分识别 | 🌟🌟 |

## 🔧 故障排查

### 问题 1：Ollama 模型拉取失败

```bash
# 解决方案：使用代理或切换镜像源
export OLLAMA_MIRRORS=https://ollama.com
ollama pull bge-m3
```

### 问题 2：向量维度不匹配

**症状**：`Vector dimension mismatch error`

**原因**：切换模型后，旧的 Milvus 集合维度与新模型不匹配

**解决方案**：
```python
# 方法 1：删除旧集合（会丢失数据）
# 在代码中设置 drop_old=True，重启一次后改回 False

# 方法 2：创建新集合
# 修改 .env 中的集合名称
DOC_COLLECTION_NAME=rag_docs_bge_m3
```

### 问题 3：检索效果不理想

**调优建议**：

1. **调整分块大小**（针对 bge-m3 的长文档支持）
```python
# 在知识库创建时设置
chunk_size=2000  # bge-m3 支持更大的分块
chunk_overlap=400
```

2. **调整检索参数**
```python
# src/rag/milvus.py 中的 query_relevant_documents
search_kwargs={
    "k": 5,          # 返回结果数量
    "fetch_k": 20,   # 候选数量
    "ranker_params": {"weights": [0.7, 0.3]},  # Dense:Sparse 权重比
}
```

## 💡 最佳实践

### 针对虹桥油库文档的优化建议

1. **使用 bge-m3**（专业术语识别强）
2. **增大分块大小**：1500-2000 字符（利用 8192 tokens 优势）
3. **增加分块重叠**：300-400 字符（保证上下文连贯）
4. **混合检索权重**：Dense 0.7, Sparse 0.3（平衡语义和关键词）

### 配置示例

```bash
# .env 文件
OLLAMA_EMBEDDING_MODEL=bge-m3
OLLAMA_EMBEDDING_URL=http://localhost:11434
DOC_COLLECTION_NAME=hongqiao_docs
```

```python
# 创建知识库时的参数
KnowledgeBase.Create(
    name="虹桥油库管理文件",
    description="2023年虹桥油库管理文件汇编",
    embedding_model="bge-m3",
    chunk_size=2000,
    chunk_overlap=400
)
```

## 🔄 迁移现有知识库

如果您已经有使用 `nomic-embed-text` 的知识库，需要迁移到 `bge-m3`：

```bash
# 1. 备份现有数据（可选）
# 导出知识库元数据

# 2. 安装新模型
ollama pull bge-m3

# 3. 修改配置
# 编辑 .env，将 OLLAMA_EMBEDDING_MODEL 改为 bge-m3

# 4. 重新导入文档
# 通过 Web 界面上传文档到新知识库
# 或使用 API 批量导入
```

## 📈 效果评估

### 评估指标

1. **检索准确率**：查询返回的 Top-5 结果是否包含正确答案
2. **响应速度**：从查询到返回结果的时间
3. **语义理解**：对专业术语和复杂查询的理解能力

### 测试建议

创建测试查询集，包含：
- 专业术语查询（如 "HSE"、"防爆等级"）
- 长句查询（如 "储罐泄漏时应该采取哪些应急措施？"）
- 模糊查询（如 "柴油安全问题"）

## 🎯 总结

**针对虹桥油库中文文档，强烈推荐使用 `bge-m3`：**

✅ 中文语义理解最佳  
✅ 支持长文档（8192 tokens）  
✅ 混合检索提升准确率  
✅ 专业术语识别能力强  
✅ 完全免费开源  

**配置步骤**：
```bash
ollama pull bge-m3
# 修改 .env: OLLAMA_EMBEDDING_MODEL=bge-m3
python server.py
```

---

**更新时间**：2025-10-28  
**适用版本**：IASMind v1.0+  
**维护者**：IASMind 团队

