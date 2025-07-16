# 知识库选择框API集成说明

## 概述

本次修改将智能对话和分析报告功能中的知识库选择框从使用mock数据改为使用真实的知识库管理API数据，确保用户看到的是实际维护的知识库信息。

## 修改内容

### 1. 智能对话组件 (`web/src/app/chatbot/components/input-box.tsx`)

#### 主要变更：
- 移除mock数据导入：`mockKnowledgeBases`
- 添加真实API导入：`knowledgeBaseApi, type KnowledgeBase`
- 添加知识库数据状态管理
- 添加加载状态和错误处理
- 更新UI以支持加载状态和空数据状态

#### 新增功能：
```typescript
// 知识库数据状态
const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
const [loadingKnowledgeBases, setLoadingKnowledgeBases] = useState(false);

// 加载知识库数据
const LoadKnowledgeBases = useCallback(async () => {
  setLoadingKnowledgeBases(true);
  try {
    const response = await knowledgeBaseApi.GetKnowledgeBases();
    setKnowledgeBases(response.knowledge_bases);
  } catch (error) {
    console.error("加载知识库列表失败:", error);
    toast.error("加载知识库列表失败");
  } finally {
    setLoadingKnowledgeBases(false);
  }
}, []);
```

#### UI改进：
- 加载时显示旋转图标
- 空数据时显示提示信息
- 知识库名称和描述支持截断显示
- 错误时显示toast通知

### 2. 分析报告组件 (`web/src/app/reports/components/input-box.tsx`)

#### 主要变更：
- 与智能对话组件保持一致的修改
- 使用相同的API调用和状态管理逻辑
- 保持UI风格统一

### 3. 测试脚本 (`test_knowledge_base_integration.ts`)

创建了测试脚本来验证API集成：
- 健康检查测试
- 知识库列表获取测试
- 统计信息获取测试

## API接口使用

### 获取知识库列表
```typescript
const response = await knowledgeBaseApi.GetKnowledgeBases();
// 返回: { knowledge_bases: KnowledgeBase[], total: number }
```

### 知识库数据结构
```typescript
interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  file_count: number;
  vector_count: number;
  status: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
}
```

## 用户体验改进

### 1. 加载状态
- 按钮显示旋转图标
- 弹出框显示加载提示
- 防止重复点击

### 2. 空数据状态
- 友好的提示信息
- 引导用户创建知识库

### 3. 错误处理
- 网络错误时显示toast通知
- 控制台记录详细错误信息

### 4. 数据展示
- 知识库名称和描述支持长文本截断
- 保持界面整洁

## 兼容性说明

### 向后兼容
- 保持原有的多选功能
- 保持原有的UI交互方式
- 不影响现有的选择逻辑

### 数据一致性
- 与知识库管理页面显示的数据完全一致
- 实时反映知识库的创建、更新、删除操作

## 部署注意事项

### 1. 后端服务
确保后端服务正常运行：
```bash
python -m uvicorn src.server.app:app --host 0.0.0.0 --port 8000 --reload
```

### 2. 数据库连接
确保MySQL数据库连接正常，知识库表结构完整。

### 3. 前端配置
确保API地址配置正确：
```typescript
// web/src/core/api/config.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
```

## 测试验证

### 1. 运行测试脚本
```bash
# 在web目录下运行
node test_knowledge_base_integration.ts
```

### 2. 手动测试
1. 启动前端和后端服务
2. 访问智能对话页面
3. 点击"知识库检索"按钮
4. 验证显示的是真实知识库数据
5. 测试多选功能
6. 测试加载状态和错误处理

### 3. 测试场景
- 正常数据加载
- 网络错误处理
- 空数据状态
- 大量数据性能
- 多选功能

## 故障排除

### 常见问题

1. **知识库列表为空**
   - 检查后端服务是否运行
   - 检查数据库连接
   - 检查知识库表是否有数据

2. **加载失败**
   - 检查网络连接
   - 检查API地址配置
   - 查看浏览器控制台错误信息

3. **数据不同步**
   - 刷新页面重新加载
   - 检查后端缓存设置
   - 验证数据库事务

### 调试方法

1. **浏览器开发者工具**
   - 查看Network标签页的API请求
   - 查看Console标签页的错误信息

2. **后端日志**
   - 查看后端服务的运行日志
   - 检查数据库查询日志

3. **API测试**
   - 使用Postman或curl测试API接口
   - 运行测试脚本验证功能

## 总结

本次修改成功将知识库选择框从mock数据迁移到真实API数据，提供了更好的用户体验和数据一致性。主要改进包括：

- ✅ 使用真实知识库数据
- ✅ 添加加载状态和错误处理
- ✅ 保持UI一致性
- ✅ 提供完整的测试验证
- ✅ 向后兼容现有功能

用户现在可以在智能对话和分析报告功能中看到与知识库管理页面完全一致的知识库信息，确保数据的一致性和准确性。 