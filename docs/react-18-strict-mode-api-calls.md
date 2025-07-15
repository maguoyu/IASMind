# React 18 严格模式与API重复调用

## 问题现象

在开发环境下，可能会观察到API接口被连续调用两次的现象，特别是在组件挂载时。

## 根本原因

这是React 18严格模式（StrictMode）的预期行为。在开发环境下，React会故意：

1. **双重执行Effect**：每个useEffect会被执行两次
2. **双重执行构造函数**：组件构造函数会被调用两次
3. **双重执行事件处理器**：事件处理器会被调用两次

## 目的

这种双重执行行为是为了帮助开发者：
- 检测副作用问题
- 发现状态管理错误
- 识别不纯的函数

## 解决方案

### 1. 生产环境无影响
严格模式只在开发环境下生效，生产环境不会出现此问题。

### 2. 代码优化建议
- 确保useEffect的依赖数组正确
- 使用useCallback和useMemo优化性能
- 避免在Effect中产生副作用

### 3. 调试技巧
如果需要在开发环境下避免重复调用，可以：
- 使用AbortController取消重复请求
- 添加请求去重逻辑
- 使用React DevTools观察组件生命周期

## 示例代码

```typescript
// 正确的做法：使用AbortController
useEffect(() => {
  const abortController = new AbortController();
  
  const fetchData = async () => {
    try {
      const response = await fetch('/api/data', {
        signal: abortController.signal
      });
      // 处理响应
    } catch (error) {
      if (error.name === 'AbortError') {
        // 请求被取消，忽略错误
        return;
      }
      // 处理其他错误
    }
  };
  
  fetchData();
  
  return () => {
    abortController.abort();
  };
}, []);
```

## 结论

API重复调用是React 18严格模式的正常行为，不是bug。这有助于提高代码质量和稳定性。在生产环境中不会出现此问题。 