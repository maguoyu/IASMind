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