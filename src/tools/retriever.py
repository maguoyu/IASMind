# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import logging
from typing import List, Optional, Type
from langchain_core.tools import BaseTool
from langchain_core.callbacks import (
    AsyncCallbackManagerForToolRun,
    CallbackManagerForToolRun,
)
from pydantic import BaseModel, Field

from src.config.tools import SELECTED_RAG_PROVIDER
from src.rag import Document, Retriever, Resource, build_retriever, Chunk
from src.config.tools import RAGProvider
logger = logging.getLogger(__name__)


class RetrieverInput(BaseModel):
    keywords: str = Field(description="search keywords to look up")


class RagFlowRetrieverTool(BaseTool):
    name: str = "local_search_tool"
    description: str = (
        "Useful for retrieving information from the file with `rag://` uri prefix, it should be higher priority than the web search or writing code. Input should be a search keywords."
    )
    args_schema: Type[BaseModel] = RetrieverInput

    retriever: Retriever = Field(default_factory=Retriever)
    resources: list[Resource] = Field(default_factory=list)

    def _run(
        self,
        keywords: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> list[Document]:
        logger.info(
            f"Retriever tool query: {keywords}", extra={"resources": self.resources}
        )
        documents = self.retriever.query_relevant_documents(keywords, self.resources)
        if not documents:
            return []
        return self._parse_documents(documents)

    def _parse_documents(self, documents: list) -> list[Document]:
        return [Document(id=doc.id, title=doc.page_content, chunks=[Chunk(content=doc.page_content, similarity=1.0)]) for doc in documents]

    async def _arun(
        self,
        keywords: str,
        run_manager: Optional[AsyncCallbackManagerForToolRun] = None,
    ) -> list[Document]:
        sync_manager = run_manager.get_sync() if run_manager else None
        return self._run(keywords, sync_manager)


class LocalMilvusRetrieverTool(BaseTool):
    name: str = "local_search_tool"
    description: str = (
        "it should be higher priority than the web search or writing code. Input should be a search keywords."
    )
    args_schema: Type[BaseModel] = RetrieverInput

    retriever: Retriever = Field(default_factory=Retriever)
    resources: list[Resource] = Field(default_factory=list)

    def _run(
        self,
        keywords: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> list[Document]:
        logger.info(
            f"Retriever LocalMilvusRetrieverTool query: {keywords}", extra={"resources": self.resources}
        )
        documents = self.retriever.query_relevant_documents(keywords, self.resources)
        if not documents:
            return []
        return [Document(id=doc.id,metadata=doc.metadata,chunks=[Chunk(content=doc.page_content, similarity=1.0)]) for doc in documents]

    async def _arun(
        self,
        keywords: str,
        run_manager: Optional[AsyncCallbackManagerForToolRun] = None,
    ) -> list[Document]:
        sync_manager = run_manager.get_sync() if run_manager else None
        return self._run(keywords, sync_manager)


def get_retriever_tool(resources: List[Resource]) -> BaseTool | None:
    if not resources:
        return None
    logger.info(f"create retriever tool: {SELECTED_RAG_PROVIDER}")
    retriever = build_retriever()

    if not retriever:
        return None
    if SELECTED_RAG_PROVIDER == RAGProvider.RAGFLOW.value:
        return RagFlowRetrieverTool(retriever=retriever, resources=resources)
    elif SELECTED_RAG_PROVIDER == RAGProvider.LOCAL_Milvus.value:
        return LocalMilvusRetrieverTool(retriever=retriever, resources=resources)
    return None
