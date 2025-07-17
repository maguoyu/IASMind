# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

from typing import Optional, List, Dict, Any
from langgraph.graph import MessagesState

from src.rag import Resource


class State(MessagesState):
    """State for the chatbot system, extends MessagesState for conversational AI."""

    # Runtime Variables
    locale: str
    resources: list[Resource]
    user_query: str
    response: Optional[str]
    
    # Feature flags
    enable_online_search: bool
    enable_knowledge_retrieval: bool
    
    # Enhanced retrieval results
    knowledge_base_results: Optional[List[Dict[str, Any]]]
    web_search_results: Optional[List[Dict[str, Any]]]
    fusion_enabled: bool 