from typing import Annotated

from fastapi import APIRouter, Query

from src.config.tools import SELECTED_RAG_PROVIDER
from src.rag.builder import build_retriever
from src.server.rag_request import (
    RAGConfigResponse,
    RAGResourceRequest,
    RAGResourcesResponse,
)

router = APIRouter(
    prefix="/api/rag",
    tags=["rag"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)


@router.get("/config", response_model=RAGConfigResponse)
async def rag_config():
    """Get the config of the RAG."""
    return RAGConfigResponse(provider=SELECTED_RAG_PROVIDER)


@router.get("/resources", response_model=RAGResourcesResponse)
async def rag_resources(request: Annotated[RAGResourceRequest, Query()]):
    """Get the resources of the RAG."""
    retriever = build_retriever()
    if retriever:
        return RAGResourcesResponse(resources=retriever.list_resources(request.query))
    return RAGResourcesResponse(resources=[])
