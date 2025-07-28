# API处理工具使用指南

本文档介绍如何使用API处理工具来统一处理API请求和响应，尤其是对403状态码（未授权）的处理，自动将用户重定向到登录页面。

## 背景

在前端应用中，当API请求返回403（Forbidden）或401（Unauthorized）状态码时，通常意味着用户的认证状态已失效，需要重新登录。为了提升用户体验，我们实现了统一处理机制，在检测到这些状态码时自动清除用户认证信息并跳转到登录页面。

## 工具组件

我们提供了两种使用方式：

1. **ApiResponseHandler类**：用于全局处理API响应，位于`api-handler.ts`文件中
2. **useApiHandler Hook**：用于组件内部处理API响应，位于`use-api-handler.tsx`文件中，标记为客户端组件

## 使用方法

### 方法一：直接使用集成了处理工具的apiClient

我们已经在`apiClient`中集成了API响应处理功能，使用`apiClient`发起的所有请求都会自动处理403/401状态码。

```typescript
import { apiClient } from "~/core/api/config";

// 使用apiClient发起请求
const fetchData = async () => {
  try {
    // 自动处理403状态码，无需额外代码
    const response = await apiClient.get('/api/data');
    
    if (response.error) {
      // 处理其他错误
      console.error(response.error);
    } else {
      // 使用返回的数据
      console.log(response.data);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
};
```

### 方法二：使用useApiHandler Hook包装自定义API调用（仅限客户端组件）

对于自定义的API调用，可以使用`useApiHandler` Hook来包装API调用，实现相同的处理逻辑。注意：这个Hook只能在客户端组件中使用。

```typescript
'use client'; // 确保在客户端组件中使用

import { useApiHandler } from "~/core/api/use-api-handler";

function MyComponent() {
  // 获取wrapApiCall方法
  const { wrapApiCall } = useApiHandler();
  
  const fetchData = async () => {
    try {
      // 使用wrapApiCall包装自定义API调用
      const response = await wrapApiCall(async () => {
        // 自定义API调用逻辑
        const res = await fetch('/api/custom');
        
        if (!res.ok) {
          // 处理错误
          return {
            data: null,
            error: '请求失败',
            status: res.status
          };
        }
        
        const data = await res.json();
        return { data };
      });
      
      // 使用响应数据
      console.log(response);
    } catch (error) {
      console.error('请求失败:', error);
    }
  };
  
  // 组件渲染逻辑
}
```

### 方法三：手动处理API响应（服务端和客户端都可用）

如果需要手动处理API响应，可以使用`ApiResponseHandler`类的静态方法：

```typescript
import { ApiResponseHandler } from "~/core/api/api-handler";

// 手动处理API响应
const handleApiResponse = (response) => {
  // 返回处理后的响应，如果是403/401状态码，将会清除认证信息并重定向
  return ApiResponseHandler.handleResponse(response);
};
```

## 文件结构

为了支持服务端和客户端组件的使用，我们将API处理工具拆分为两个文件：

1. **api-handler.ts**: 包含`ApiResponseHandler`类，可在任何地方导入和使用
2. **use-api-handler.tsx**: 包含`useApiHandler` Hook，只能在客户端组件中使用（带有'use client'指令）

## 处理流程

API处理工具的处理流程如下：

1. 检查API响应的状态码
2. 如果状态码为403或401：
   - 清除用户认证信息（从auth-store中）
   - 获取当前路径用于重定向回来
   - 重定向到登录页面，并附加重定向参数
3. 返回原始响应，以便上层代码继续处理其他类型的错误

## 最佳实践

1. **优先使用apiClient**：对于大多数API请求，直接使用`apiClient`即可，无需额外处理。
2. **组件内使用useApiHandler**：在客户端组件内部，使用`useApiHandler` Hook来包装自定义API调用。
3. **服务端组件使用ApiResponseHandler**：在服务端组件中，使用`ApiResponseHandler.wrap`方法包装API调用。
4. **注意处理其他错误**：API处理工具只处理403/401状态码，其他错误仍需在业务代码中处理。
5. **避免循环重定向**：登录页面应避免使用需要认证的API，以防止循环重定向。

## 示例

查看 `web/src/core/api/examples/api-handler-example.tsx` 获取完整使用示例。 