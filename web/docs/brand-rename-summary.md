# 品牌重命名汇总 - DeerFlow → IAS_Mind

## 概述

本文档记录了项目中所有从"DeerFlow"更名为"IAS_Mind"的更改。此次重命名涉及用户界面、配置文件、API接口等多个层面。

## 图标变更

- **原图标**: 🦌 (鹿)
- **新图标**: 🧠 (大脑) 
- **寓意**: 从"鹿流"改为"智能思维"，更好地体现AI智能平台的特性

## 主要更改文件

### 1. 核心配置文件

#### `web/src/core/config/types.ts`
- `DeerFlowConfig` → `IASMindConfig`

#### `web/src/core/api/config.ts`
- `__deerflowConfig` → `__iasmindConfig`
- 导入类型更新为 `IASMindConfig`
- 全局变量和函数名称更新

#### `web/src/core/store/settings-store.ts`
- 设置存储键: `"deerflow.settings"` → `"iasmind.settings"`

### 2. 页面标题和布局

#### `web/src/app/layout.tsx`
- 页面标题: `"🦌 DeerFlow"` → `"🧠 IAS_Mind"`
- 全局配置脚本变量更新

#### `web/src/app/page.tsx`
- 欢迎标题: `"欢迎使用 DeerFlow"` → `"欢迎使用 IAS_Mind"`
- 版权信息: `"© {year} DeerFlow"` → `"© {year} IAS_Mind"`

### 3. 组件和品牌标识

#### `web/src/components/deer-flow/logo.tsx`
- Logo文本: `"🦌 DeerFlow"` → `"🧠 IAS_Mind"`

#### `web/src/core/api/hooks.ts`
- 页面标题: `"{title} - DeerFlow"` → `"{title} - IAS_Mind"`
- 默认标题: `"DeerFlow"` → `"IAS_Mind"`

### 4. 用户界面组件

#### 站点头部组件 (多个文件)
- `web/src/app/deep_research/components/site-header.tsx`
- `web/src/app/data_analysis/components/site-header.tsx`
- `web/src/app/chat/components/site-header.tsx`
- `web/src/app/charts/components/site-header.tsx`

**更改内容:**
- 图标: `🦌` → `🧠`
- 品牌名: `"DeerFlow"` → `"IAS_Mind"`

#### 欢迎页面组件 (多个文件)
- `web/src/app/deep_research/components/welcome.tsx`
- `web/src/app/data_analysis/components/welcome.tsx`
- `web/src/app/charts/components/welcome.tsx`

**更改内容:**
- 链接文本: `"🦌 DeerFlow"` → `"🧠 IAS_Mind"`

### 5. 加载和消息组件

#### 页面加载文本 (多个文件)
- `web/src/app/deep_research/page.tsx`
- `web/src/app/data_analysis/page.tsx`
- `web/src/app/chat/page.tsx`
- `web/src/app/charts/page.tsx`
- `web/src/app/data_exploration/page.tsx`

**更改内容:**
- 加载文本: `"Loading DeerFlow..."` → `"Loading IAS_Mind..."`

#### 消息回放组件 (多个文件)
- `web/src/app/deep_research/components/messages-block.tsx`
- `web/src/app/data_analysis/components/messages-block.tsx`
- `web/src/app/chat/components/messages-block.tsx`
- `web/src/app/charts/components/messages-block.tsx`

**更改内容:**
- 回放消息: `"DeerFlow is now replaying..."` → `"IAS_Mind is now replaying..."`
- 回放提示: `"You're now in DeerFlow's replay mode..."` → `"You're now in IAS_Mind's replay mode..."`

### 6. 设置和配置界面

#### `web/src/app/settings/dialogs/settings-dialog.tsx`
- 对话框标题: `"DeerFlow Settings"` → `"IAS_Mind Settings"`
- 描述文本: `"Manage your DeerFlow settings here."` → `"Manage your IAS_Mind settings here."`

#### `web/src/app/settings/dialogs/add-mcp-server-dialog.tsx`
- 描述文本: `"DeerFlow uses the standard JSON..."` → `"IAS_Mind uses the standard JSON..."`

#### `web/src/app/settings/tabs/mcp-tab.tsx`
- 说明文本: `"The Model Context Protocol boosts DeerFlow..."` → `"The Model Context Protocol boosts IAS_Mind..."`

### 7. 功能提示和帮助文本

#### 输入框组件 (多个文件)
- `web/src/app/deep_research/components/input-box.tsx`
- `web/src/app/data_analysis/components/input-box.tsx`
- `web/src/app/charts/components/input-box.tsx`

**更改内容:**
- 功能说明: `"When enabled, DeerFlow will use..."` → `"When enabled, IAS_Mind will use..."`
- 搜索提示: `"When enabled, DeerFlow will perform..."` → `"When enabled, IAS_Mind will perform..."`

### 8. 文档和编辑器

#### `web/src/app/docs/page.tsx`
- 编辑器欢迎文本: `"欢迎使用 DeerFlow 文档编辑器"` → `"欢迎使用 IAS_Mind 文档编辑器"`

## 技术影响

### 配置变更
1. **全局配置对象**: `window.__deerflowConfig` → `window.__iasmindConfig`
2. **TypeScript接口**: `DeerFlowConfig` → `IASMindConfig`
3. **本地存储键**: `"deerflow.settings"` → `"iasmind.settings"`

### 用户体验变更
1. **品牌识别**: 统一更新为IAS_Mind品牌
2. **视觉标识**: 鹿图标(🦌)改为大脑图标(🧠)
3. **页面标题**: 所有页面标题统一更新
4. **用户提示**: 所有用户可见文本更新

## 验证检查项

### 界面检查
- [ ] 首页标题和Logo正确显示
- [ ] 所有子页面Logo和标题更新
- [ ] 浏览器标签页标题正确
- [ ] 设置页面标题和描述更新

### 功能检查  
- [ ] 配置加载正常
- [ ] 设置保存和读取正常
- [ ] 页面导航正常
- [ ] 所有提示文本正确显示

### 技术检查
- [ ] TypeScript类型定义正确
- [ ] 没有遗留的DeerFlow引用
- [ ] 构建过程正常
- [ ] 运行时无错误

## 注意事项

1. **向后兼容**: 旧的设置存储键需要迁移逻辑
2. **缓存清理**: 用户可能需要清除浏览器缓存
3. **文档更新**: 相关技术文档需要同步更新
4. **API接口**: 后端API如有相关引用也需更新

## 完成状态

✅ **已完成**
- 前端界面文本更新
- 配置文件变量重命名  
- 组件品牌标识更新
- 用户提示文本修改

⏳ **待处理**
- 后端代码更新
- API文档更新
- 部署配置调整
- 用户迁移指南

---

**更新时间**: 2025年7月1日  
**负责人**: 开发团队  
**版本**: v1.0.0 