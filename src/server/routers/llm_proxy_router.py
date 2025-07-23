# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import logging
import httpx
import json
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from src.llms.llm import _get_config_file_path, load_yaml_config, _get_env_llm_conf
from src.config.agents import LLMType
from src.utils.llm_utils import get_llm_config

logger = logging.getLogger(__name__)

INTERNAL_SERVER_ERROR_DETAIL = "Internal Server Error"

router = APIRouter(
    prefix="/api/llm-proxy",
    tags=["llm-proxy"],
    responses={404: {"description": "Not Found"}},
)


class LLMMessage(BaseModel):
    role: str
    content: str


class LLMProxyRequest(BaseModel):
    model: str
    messages: List[LLMMessage]
    temperature: Optional[float] = 1.0
    top_p: Optional[float] = 1.0
    n: Optional[int] = 1
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False
    llm_type: str = Field(
        "basic", 
        description="LLM type to use, matching the configuration keys"
    )


@router.post("/chat/completions")
async def proxy_llm_request(request: LLMProxyRequest, http_request: Request):
    """
    Proxy LLM API requests to the configured LLM provider.
    Keeps API keys secure on the backend.
    """
    try:
        llm_config = await get_llm_config(request.llm_type)
        
        # Extract necessary configuration
        base_url = llm_config.get("base_url")
        api_key = llm_config.get("api_key")
        
        if not base_url or not api_key:
            raise HTTPException(
                status_code=500, 
                detail="Missing LLM configuration (base_url or api_key)"
            )
        
        # Prepare request to LLM provider
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        # Prepare request body, removing llm_type which is only used internally
        request_data = request.model_dump(exclude={"llm_type"})
        
        # Handle streaming responses
        if request.stream:
            # Create a streaming response with SSE format
            async def stream_response():
                async with httpx.AsyncClient() as client:
                    async with client.stream(
                        "POST", 
                        f"{base_url}/chat/completions", 
                        json=request_data,
                        headers=headers,
                        timeout=300.0  # Longer timeout for streaming responses
                    ) as response:
                        if response.status_code != 200:
                            error_detail = await response.text()
                            logger.error(f"LLM provider error: {error_detail}")
                            raise HTTPException(
                                status_code=response.status_code,
                                detail=f"LLM provider error: {error_detail}"
                            )
                        
                        # SSE protocol requires each message to be formatted as "data: {...}\n\n"
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                # Pass through SSE format as-is
                                yield f"{line}\n\n"
                            elif line.strip():
                                # If it's not already in SSE format, convert it
                                try:
                                    # Try to parse as JSON and convert to SSE format
                                    json_data = json.loads(line)
                                    yield f"data: {json.dumps(json_data)}\n\n"
                                except json.JSONDecodeError:
                                    # If it's not valid JSON, send as raw text
                                    yield f"data: {line}\n\n"
                                    
                            # Check if client has disconnected
                            if await http_request.is_disconnected():
                                logger.info("Client disconnected from LLM stream, stopping")
                                break
                                
                # Send a final [DONE] event
                yield "data: [DONE]\n\n"
                                
            return StreamingResponse(
                stream_response(),
                media_type="text/event-stream"
            )
        else:
            # Non-streaming request
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    json=request_data,
                    headers=headers,
                    timeout=60.0  # Default timeout for regular responses
                )
                
                if response.status_code != 200:
                    error_detail = response.text
                    logger.error(f"LLM provider error: {error_detail}")
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"LLM provider error: {error_detail}"
                    )
                
                return response.json()
                
    except HTTPException:
        raise
    except ValueError as e:
        logger.exception(f"LLM configuration error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception(f"Error in LLM proxy: {str(e)}")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR_DETAIL) 