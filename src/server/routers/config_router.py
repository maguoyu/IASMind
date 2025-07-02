from fastapi import APIRouter

from src.config.tools import SELECTED_RAG_PROVIDER
from src.llms.llm import get_configured_llm_models
from src.server.config_request import ConfigResponse
from src.server.rag_request import RAGConfigResponse

router = APIRouter(
    prefix="/api/config",
    tags=["config"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)


@router.get("", response_model=ConfigResponse)
async def config():
    """Get the config of the server."""
    return ConfigResponse(
        rag=RAGConfigResponse(provider=SELECTED_RAG_PROVIDER),
        models=get_configured_llm_models(),
    ) 