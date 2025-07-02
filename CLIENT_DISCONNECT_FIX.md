# 客户端断开检测修复

## 问题描述
在 deep_research、chatbot、prose 等页面的流式接口中，当前端用户中断请求（如切换页面、关闭浏览器等）时，后端任务仍在继续执行，造成资源浪费。

## 解决方案
在所有流式接口中添加客户端断开检测，当检测到客户端断开时，立即停止后端任务执行。

## 修改的文件

### 1. `src/server/routers/deep_research_router.py`
- 添加 `Request` 导入
- 修改 `chat_stream` 函数，添加 `http_request: Request` 参数
- 在流式生成器中添加 `await http_request.is_disconnected()` 检查
- 当检测到客户端断开时，打印日志并 break 循环

### 2. `src/server/routers/chatbot_router.py`
- 添加 `Request` 导入
- 修改 `chatbot_stream` 函数，添加 `http_request: Request` 参数
- 在流式生成器中添加客户端断开检测

### 3. `src/server/routers/prose_router.py`
- 添加 `Request` 导入
- 修改 `generate_prose` 函数，添加 `http_request: Request` 参数
- 在流式生成器中添加客户端断开检测

## 核心修改模式

```python
@router.post("/stream")
async def stream_endpoint(request: ChatRequest, http_request: Request):
    async def stream_with_disconnect_check():
        async for chunk in your_stream_generator():
            # 检查客户端是否断开
            if await http_request.is_disconnected():
                print(f"Client disconnected, stopping backend task")
                break
            yield chunk
    
    return StreamingResponse(
        stream_with_disconnect_check(),
        media_type="text/event-stream",
    )
```

## 测试方法

1. 启动后端服务器
2. 运行测试脚本：`python test_disconnect_detection.py`
3. 观察服务器日志，应该能看到类似以下的断开检测消息：
   ```
   Client disconnected for thread xxx, stopping backend task
   ```

## 效果
- 前端中断请求后，后端任务会立即停止
- 避免资源浪费
- 提高系统响应性
- 减少不必要的计算开销

## 注意事项
- 这个修复只影响流式接口，不影响普通的同步接口
- 断开检测是在每个数据块发送前进行的，可能会有轻微的延迟
- 对于长时间运行的任务，建议在任务内部也添加定期检查 