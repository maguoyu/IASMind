import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from src.ppt.graph.builder import build_graph as build_ppt_graph
from src.server.chat_request import GeneratePPTRequest

logger = logging.getLogger(__name__)

INTERNAL_SERVER_ERROR_DETAIL = "Internal Server Error"

router = APIRouter(
    prefix="/api/ppt",
    tags=["ppt"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)


@router.post("/generate")
async def generate_ppt(request: GeneratePPTRequest):
    """Generate PowerPoint presentation from content."""
    try:
        report_content = request.content
        print(report_content)
        workflow = build_ppt_graph()
        final_state = workflow.invoke({"input": report_content})
        generated_file_path = final_state["generated_file_path"]
        with open(generated_file_path, "rb") as f:
            ppt_bytes = f.read()
        return Response(
            content=ppt_bytes,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
    except Exception as e:
        logger.exception(f"Error occurred during ppt generation: {str(e)}")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_DETAIL) 