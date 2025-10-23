# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.server.routers.deep_research_router import router as deep_research_router
from src.server.routers.chatbot_router import router as chatbot_router
from src.server.routers.tts_router import router as tts_router
from src.server.routers.podcast_router import router as podcast_router
from src.server.routers.ppt_router import router as ppt_router
from src.server.routers.prose_router import router as prose_router
from src.server.routers.prompt_router import router as prompt_router
from src.server.routers.mcp_router import router as mcp_router
from src.server.routers.rag_router import router as rag_router
from src.server.routers.config_router import router as config_router
from src.server.routers.sales_forecast_router import router as sales_forecast_router
from src.server.routers.reports_router import router as reports_router
from src.server.routers.auth_router import router as auth_router
from src.server.routers.knowledge_base_router import router as knowledge_base_router
from src.server.routers.llm_proxy_router import router as llm_proxy_router
from src.server.routers.data_exploration_router import router as data_exploration_router
from src.server.routers.datasource_router import router as datasource_router
from src.server.routers.database_analysis_router import router as database_analysis_router
from src.server.routers.charts_router import router as charts_router
from src.server.routers.file_router import router as file_router
from src.server.routers.n8n_router import router as n8n_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="DeerFlow API",
    description="API for Deer",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include all routers
app.include_router(deep_research_router)
app.include_router(chatbot_router)
app.include_router(tts_router)
app.include_router(podcast_router)
app.include_router(ppt_router)
app.include_router(prose_router)
app.include_router(prompt_router)
app.include_router(mcp_router)
app.include_router(rag_router)
app.include_router(config_router)
app.include_router(sales_forecast_router)
app.include_router(reports_router)
app.include_router(auth_router)
app.include_router(knowledge_base_router)
app.include_router(llm_proxy_router)
app.include_router(data_exploration_router)
app.include_router(charts_router)
app.include_router(datasource_router)
app.include_router(database_analysis_router)
app.include_router(file_router)
app.include_router(n8n_router)