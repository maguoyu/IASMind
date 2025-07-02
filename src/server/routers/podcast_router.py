import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from src.podcast.graph.builder import build_graph as build_podcast_graph
from src.server.chat_request import GeneratePodcastRequest

logger = logging.getLogger(__name__)

INTERNAL_SERVER_ERROR_DETAIL = "Internal Server Error"

router = APIRouter(
    prefix="/api/podcast",
    tags=["podcast"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)


@router.post("/generate")
async def generate_podcast(request: GeneratePodcastRequest):
    """Generate podcast from content."""
    try:
        report_content = request.content
        print(report_content)
        workflow = build_podcast_graph()
        final_state = workflow.invoke({"input": report_content})
        audio_bytes = final_state["output"]
        return Response(content=audio_bytes, media_type="audio/mp3")
    except Exception as e:
        logger.exception(f"Error occurred during podcast generation: {str(e)}")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_DETAIL) 