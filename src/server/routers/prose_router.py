import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from src.prose.graph.builder import build_graph as build_prose_graph
from src.server.chat_request import GenerateProseRequest

logger = logging.getLogger(__name__)

INTERNAL_SERVER_ERROR_DETAIL = "Internal Server Error"

router = APIRouter(
    prefix="/api/prose",
    tags=["prose"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)


@router.post("/generate")
async def generate_prose(request: GenerateProseRequest, http_request: Request):
    """Generate prose content with streaming response."""
    try:
        sanitized_prompt = request.prompt.replace("\r\n", "").replace("\n", "")
        logger.info(f"Generating prose for prompt: {sanitized_prompt}")
        workflow = build_prose_graph()
        events = workflow.astream(
            {
                "content": request.prompt,
                "option": request.option,
                "command": request.command,
            },
            stream_mode="messages",
            subgraphs=True,
        )
        
        async def stream_with_disconnect_check():
            async for _, event in events:
                # Check if client has disconnected
                if await http_request.is_disconnected():
                    print(f"Client disconnected for prose generation, stopping backend task")
                    break
                yield f"data: {event[0].content}\n\n"
        
        return StreamingResponse(
            stream_with_disconnect_check(),
            media_type="text/event-stream",
        )
    except Exception as e:
        logger.exception(f"Error occurred during prose generation: {str(e)}")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_DETAIL) 