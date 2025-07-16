import logging
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request
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
async def chatbot_stream(request: ChatRequest, http_request: Request):
    """Stream chatbot responses with RAG support."""
    try:
        thread_id = request.thread_id
        if thread_id == "__default__":
            thread_id = str(uuid4())

        async def stream_with_disconnect_check():
            async for chunk in astream_chatbot_generator(
                _graph,
                request.model_dump()["messages"],
                thread_id or str(uuid4()),
                request.resources or [],
            ):
                # Check if client has disconnected
                if await http_request.is_disconnected():
                    print(f"Client disconnected for chatbot thread {thread_id}, stopping backend task")
                    break
                yield chunk

        return StreamingResponse(
            stream_with_disconnect_check(),
            media_type="text/event-stream",
        )
    except Exception as e:
        logger.exception(f"Error in chatbot stream endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_DETAIL)


async def astream_chatbot_generator(graph, messages, thread_id: str, resources):
    """Streaming generator for chatbot responses using graph.astream."""
    import json
    from typing import cast, Any
    from langchain_core.messages import AIMessageChunk, BaseMessage
    
    input_ = {
        "messages": messages,
        "locale": "zh-CN",
        "resources": resources,
        "user_query": messages[-1]["content"] if messages else "",
    }
    
    try:
        async for agent, _, event_data in graph.astream(
            input_,
            config={
                "thread_id": thread_id,
                "resources": resources,
            },
            stream_mode=["messages", "updates"],
            subgraphs=True,
        ):
            if isinstance(event_data, dict):
                # Handle any dictionary events (like interrupts)
                continue
            
            message_chunk, message_metadata = cast(
                tuple[BaseMessage, dict[str, Any]], event_data
            )
            
            event_stream_message: dict[str, Any] = {
                "thread_id": thread_id,
                "agent": "chatbot",
                "id": message_chunk.id,
                "role": "assistant",
                "content": message_chunk.content,
            }
            
            if message_chunk.response_metadata.get("finish_reason"):
                event_stream_message["finish_reason"] = message_chunk.response_metadata.get(
                    "finish_reason"
                )
            
            if isinstance(message_chunk, AIMessageChunk):
                # AI Message - Raw message tokens
                yield f"event: message_chunk\ndata: {json.dumps(event_stream_message, ensure_ascii=False)}\n\n"
            else:
                # Tool Message - Tool call results
                event_stream_message["role"] = "tool"
                if hasattr(message_chunk, 'name'):
                    event_stream_message["tool_name"] = message_chunk.name
                tool_input = getattr(message_chunk, 'tool_input', None)
                if tool_input is not None:
                    event_stream_message["tool_input"] = tool_input
                tool_output = getattr(message_chunk, 'tool_output', None)
                if tool_output is not None:
                    event_stream_message["tool_output"] = tool_output
                yield f"event: tool_call\ndata: {json.dumps(event_stream_message, ensure_ascii=False)}\n\n"
    
    except Exception as e:
        logger.exception(f"Error in chatbot streaming: {str(e)}")
        error_message = {
            "thread_id": thread_id,
            "agent": "chatbot",
            "error": str(e),
        }
        yield f"event: error\ndata: {json.dumps(error_message, ensure_ascii=False)}\n\n"


async def astream_enhanced_chatbot_generator(graph, messages, thread_id: str, resources):
    """Streaming generator for enhanced chatbot responses with fusion retrieval."""
    import json
    from typing import cast, Any
    from langchain_core.messages import AIMessageChunk, BaseMessage
    
    input_ = {
        "messages": messages,
        "locale": "zh-CN",
        "resources": resources,
        "user_query": messages[-1]["content"] if messages else "",
        "fusion_enabled": True,
    }
    
    try:
        async for agent, _, event_data in graph.astream(
            input_,
            config={
                "thread_id": thread_id,
                "resources": resources,
            },
            stream_mode=["messages", "updates"],
            subgraphs=True,
        ):
            if isinstance(event_data, dict):
                # Handle any dictionary events (like interrupts)
                continue
            
            message_chunk, message_metadata = cast(
                tuple[BaseMessage, dict[str, Any]], event_data
            )
            
            event_stream_message: dict[str, Any] = {
                "thread_id": thread_id,
                "agent": "enhanced_chatbot",
                "id": message_chunk.id,
                "role": "assistant",
                "content": message_chunk.content,
            }
            
            if message_chunk.response_metadata.get("finish_reason"):
                event_stream_message["finish_reason"] = message_chunk.response_metadata.get(
                    "finish_reason"
                )
            
            if isinstance(message_chunk, AIMessageChunk):
                # AI Message - Raw message tokens
                yield f"event: message_chunk\ndata: {json.dumps(event_stream_message, ensure_ascii=False)}\n\n"
            else:
                # Tool Message - Tool call results
                event_stream_message["role"] = "tool"
                if hasattr(message_chunk, 'name'):
                    event_stream_message["tool_name"] = message_chunk.name
                tool_input = getattr(message_chunk, 'tool_input', None)
                if tool_input is not None:
                    event_stream_message["tool_input"] = tool_input
                tool_output = getattr(message_chunk, 'tool_output', None)
                if tool_output is not None:
                    event_stream_message["tool_output"] = tool_output
                yield f"event: tool_call\ndata: {json.dumps(event_stream_message, ensure_ascii=False)}\n\n"
    
    except Exception as e:
        logger.exception(f"Error in enhanced chatbot streaming: {str(e)}")
        error_message = {
            "thread_id": thread_id,
            "agent": "enhanced_chatbot",
            "error": str(e),
        }
        yield f"event: error\ndata: {json.dumps(error_message, ensure_ascii=False)}\n\n"
