from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from uuid import uuid4
from src.server.generator_util import _astream_workflow_generator
from src.server.chat_request import ChatRequest
from src.config.report_style import ReportStyle
from src.graph.builder import build_graph_with_memory

router = APIRouter(
    prefix="/api/deep_research",
    tags=["deep_research"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    thread_id = request.thread_id
    if thread_id == "__default__":
        thread_id = str(uuid4())
    
    graph = build_graph_with_memory()
    
    return StreamingResponse(
        _astream_workflow_generator(
            graph,
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
        ),
        media_type="text/event-stream",
    )
