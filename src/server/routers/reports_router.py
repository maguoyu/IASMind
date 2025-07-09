from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from uuid import uuid4
from src.server.generator_util import astream_workflow_generator
from src.server.chat_request import ChatRequest
from src.config.report_style import ReportStyle
from src.deep_research.graph.builder import build_graph_with_memory

router = APIRouter(
    prefix="/api/reports",
    tags=["reports"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)
_graph = build_graph_with_memory()


@router.post("/stream")
async def chat_stream(request: ChatRequest, http_request: Request):
    thread_id = request.thread_id
    if thread_id == "__default__":
        thread_id = str(uuid4())
    
    async def stream_with_disconnect_check():
        async for chunk in astream_workflow_generator(
            _graph,
            request.model_dump()["messages"],
            thread_id or str(uuid4()),
            request.resources or [],
            request.max_plan_iterations or 1,
            request.max_step_num or 3,
            request.max_search_results or 3,
            request.auto_accepted_plan or False,
            request.interrupt_feedback or "",
            request.mcp_settings or {},
            request.enable_background_investigation or True,
            request.report_style or ReportStyle.ACADEMIC,
            request.enable_deep_thinking or False,
        ):
            # Check if client has disconnected
            if await http_request.is_disconnected():
                print(f"Client disconnected for thread {thread_id}, stopping backend task")
                break
            yield chunk

    return StreamingResponse(
        stream_with_disconnect_check(),
        media_type="text/event-stream",
    )
