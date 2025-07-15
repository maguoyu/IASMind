# 知识库文件管理分页功能使用指南

## 功能概述

知识库文件管理功能提供了完善的分页显示功能，支持高效的文件列表浏览、搜索、筛选和批量操作。

## 主要特性

### 1. 智能分页系统
- **动态分页**: 支持10、20、50、100条/页的灵活配置
- **页码导航**: 支持首页、末页、上一页、下一页快速跳转
- **页码跳转**: 支持直接输入页码快速跳转
- **页码显示**: 智能显示当前页码周围的页码，避免页码过多时的显示问题

### 2. 高级筛选功能
- **状态筛选**: 按文件状态筛选（已上传、处理中、已向量化、失败）
- **类型筛选**: 按文件类型筛选（PDF、Word、Excel、文本、Markdown等）
- **关键词搜索**: 支持文件名搜索
- **组合筛选**: 支持多个筛选条件组合使用

### 3. 智能排序系统
- **多字段排序**: 支持按上传时间、文件名、文件大小、向量数、状态排序
- **排序方向**: 支持升序和降序切换
- **表头排序**: 点击表头可直接排序
- **排序状态显示**: 清晰显示当前排序字段和方向

### 4. 双视图模式
- **表格视图**: 详细信息展示，适合大量数据管理
- **网格视图**: 卡片式展示，适合文件预览和快速操作

### 5. 批量操作
- **批量选择**: 支持单个选择和全选
- **批量向量化**: 支持批量处理文件向量化
- **操作反馈**: 实时显示操作进度和结果

## 界面组件

### 分页组件 (Pagination)

```typescript
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={setCurrentPage}
  showPageInfo={true}
  showPageSize={true}
  pageSize={pageSize}
  onPageSizeChange={setPageSize}
  pageSizeOptions={[10, 20, 50, 100]}
/>
```

**功能特性:**
- 页码导航按钮（首页、上一页、下一页、末页）
- 智能页码显示（当前页±2页范围）
- 每页条数选择器
- 页码跳转输入框
- 页码信息显示

### 文件管理增强组件 (FileManagementEnhanced)

```typescript
<FileManagementEnhanced
  selectedKnowledgeBase={selectedKnowledgeBase}
  onRefresh={onRefresh}
/>
```

**功能特性:**
- 统计信息展示
- 搜索和筛选控件
- 排序控制
- 视图模式切换
- 批量操作面板
- 文件列表展示
- 分页控制

## 使用流程

### 1. 基本浏览
1. 选择知识库
2. 文件列表自动加载第一页
3. 使用分页控件浏览不同页面
4. 调整每页显示数量

### 2. 搜索和筛选
1. 在搜索框输入关键词
2. 选择状态筛选条件
3. 选择文件类型筛选条件
4. 点击搜索或按回车键执行搜索
5. 使用重置按钮清除所有筛选条件

### 3. 排序操作
1. 选择排序字段（上传时间、文件名、大小、向量数）
2. 点击排序方向按钮切换升序/降序
3. 在表格视图中可直接点击表头排序

### 4. 批量操作
1. 选择要操作的文件（单个或全选）
2. 点击批量向量化按钮
3. 等待操作完成
4. 查看操作结果反馈

### 5. 视图切换
1. 点击视图切换按钮
2. 在表格视图和网格视图间切换
3. 不同视图保持相同的分页和筛选状态

## 技术实现

### 后端API

#### 文件列表接口
```http
GET /api/knowledge_base/files
```

**查询参数:**
- `knowledge_base_id`: 知识库ID
- `status`: 文件状态筛选
- `file_type`: 文件类型筛选
- `search`: 搜索关键词
- `page`: 页码（从1开始）
- `page_size`: 每页数量
- `sort_by`: 排序字段
- `sort_order`: 排序方向（asc/desc）

**响应格式:**
```json
{
  "files": [
    {
      "id": "file-uuid",
      "name": "文件名.pdf",
      "type": "application/pdf",
      "size": 1024000,
      "status": "vectorized",
      "vector_count": 150,
      "uploaded_at": "2024-01-01T00:00:00Z",
      "metadata": {
        "description": "文件描述"
      }
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 20
}
```

### 前端状态管理

```typescript
// 分页状态
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(20);
const [totalFiles, setTotalFiles] = useState(0);

// 筛选状态
const [searchTerm, setSearchTerm] = useState("");
const [statusFilter, setStatusFilter] = useState<string>("");
const [typeFilter, setTypeFilter] = useState<string>("");

// 排序状态
const [sortBy, setSortBy] = useState<SortField>("uploaded_at");
const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

// 视图状态
const [viewMode, setViewMode] = useState<ViewMode>("table");
```

### 数据库查询优化

```sql
-- 支持排序和分页的文件查询
SELECT * FROM file_documents 
WHERE knowledge_base_id = %s 
  AND (status = %s OR %s IS NULL)
  AND (type LIKE %s OR %s IS NULL)
  AND (name LIKE %s OR %s IS NULL)
ORDER BY uploaded_at DESC 
LIMIT %s OFFSET %s
```

## 性能优化

### 1. 分页查询优化
- 使用 `LIMIT` 和 `OFFSET` 实现分页
- 避免全表扫描，只查询当前页数据
- 使用索引优化排序和筛选查询

### 2. 前端优化
- 使用 `useMemo` 缓存计算结果
- 防抖处理搜索输入
- 虚拟滚动支持（大量数据时）

### 3. 缓存策略
- 缓存统计信息
- 缓存筛选结果
- 智能预加载下一页数据

## 错误处理

### 1. 网络错误
- 自动重试机制
- 友好的错误提示
- 离线状态处理

### 2. 数据验证
- 页码范围验证
- 排序字段验证
- 筛选条件验证

### 3. 用户体验
- 加载状态指示
- 空数据状态处理
- 操作反馈提示

## 扩展功能

### 1. 高级筛选
- 日期范围筛选
- 文件大小范围筛选
- 向量数范围筛选

### 2. 导出功能
- 导出当前页数据
- 导出筛选结果
- 批量导出选中文件

### 3. 批量操作
- 批量删除
- 批量下载
- 批量状态更新

## 最佳实践

### 1. 分页设置
- 默认每页20条，平衡性能和用户体验
- 根据数据量动态调整分页大小
- 提供合理的页码跳转范围

### 2. 筛选设计
- 提供常用的筛选条件
- 支持筛选条件组合
- 记住用户的筛选偏好

### 3. 排序优化
- 默认按上传时间倒序排列
- 支持多字段排序
- 提供排序状态指示

### 4. 响应式设计
- 移动端友好的分页控件
- 自适应表格和网格布局
- 触摸友好的操作按钮

## 总结

知识库文件管理分页功能提供了完整的数据浏览和管理解决方案，通过智能的分页、筛选、排序和批量操作功能，大大提升了文件管理的效率和用户体验。该功能具有良好的扩展性和可维护性，为后续功能增强奠定了坚实的基础。 