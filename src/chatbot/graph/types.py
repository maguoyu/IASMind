# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

from typing import Optional
from langgraph.graph import MessagesState

from src.rag import Resource


class State(MessagesState):
    """State for the chatbot system, extends MessagesState for conversational AI."""

    # Runtime Variables
    locale: str
    resources: list[Resource]
    user_query: str
    response: Optional[str] 