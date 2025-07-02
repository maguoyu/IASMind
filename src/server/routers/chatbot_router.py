import logging
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from src.chatbot.graph.builder import build_graph_with_memory
from src.server.chat_request import ChatRequest

logger = logging.getLogger(__name__)

INTERNAL_SERVER_ERROR_DETAIL = "Internal Server Error"

router = APIRouter(
    prefix="/api/chatbot",
    tags=["chatbot"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)

_graph = build_graph_with_memory()


@router.post("/stream")
async def chatbot_stream(request: ChatRequest):
    """Stream chatbot responses with RAG support."""
    try:
        thread_id = request.thread_id
        if thread_id == "__default__":
            thread_id = str(uuid4())

        return StreamingResponse(
            astream_chatbot_generator(
                _graph,
                request.model_dump()["messages"],
                thread_id or str(uuid4()),
                request.resources or [],
            ),
            media_type="text/event-stream",
        )
    except Exception as e:
        logger.exception(f"Error in chatbot stream endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_DETAIL)


async def astream_chatbot_generator(graph, messages, thread_id: str, resources):
    """Simplified streaming generator for chatbot responses."""
    import json
    from uuid import uuid4
    
    input_ = {
        "messages": messages,
        "locale": "zh-CN",
        "resources": resources,
        "user_query": messages[-1]["content"] if messages else "",
    }
    
    try:
        # Use invoke for simpler non-streaming response first
        result = await graph.ainvoke(
            input_,
            config={
                "thread_id": thread_id,
                "resources": resources,
            }
        )
        
        # Extract response from result
        response_content = ""
        if "response" in result:
            response_content = result["response"]
        elif "messages" in result and result["messages"]:
            # Get the last message content
            last_message = result["messages"][-1]
            if hasattr(last_message, 'content'):
                response_content = last_message.content
            elif isinstance(last_message, dict) and 'content' in last_message:
                response_content = last_message['content']
        
        if not response_content:
            response_content = "抱歉，我无法生成回复。"
        
        # Create unique message ID for each response to avoid content accumulation
        message_id = f"chatbot-msg-{uuid4().hex[:8]}"
        
        # Stream the response in chunks for better UX
        chunk_size = 20
        for i in range(0, len(response_content), chunk_size):
            chunk = response_content[i:i+chunk_size]
            event_stream_message = {
                "thread_id": thread_id,
                "agent": "chatbot",
                "id": message_id,  # 使用唯一的ID
                "role": "assistant", 
                "content": chunk,
            }
            yield f"event: message_chunk\ndata: {json.dumps(event_stream_message, ensure_ascii=False)}\n\n"
            
            # Add small delay for streaming effect
            import asyncio
            await asyncio.sleep(0.05)
        
        # Send final message with finish_reason to indicate completion
        final_message = {
            "thread_id": thread_id,
            "agent": "chatbot",
            "id": message_id,
            "role": "assistant",
            "content": "",
            "finish_reason": "stop",
        }
        yield f"event: message_chunk\ndata: {json.dumps(final_message, ensure_ascii=False)}\n\n"
    
    except Exception as e:
        logger.exception(f"Error in chatbot stream generator: {str(e)}")
        # Create unique error message ID
        error_message_id = f"chatbot-error-{uuid4().hex[:8]}"
        error_message = {
            "thread_id": thread_id,
            "agent": "chatbot",
            "id": error_message_id,
            "role": "assistant",
            "content": f"抱歉，处理您的请求时出现了错误：{str(e)}",
            "finish_reason": "stop",
        }
        yield f"event: message_chunk\ndata: {json.dumps(error_message, ensure_ascii=False)}\n\n"
