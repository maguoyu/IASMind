# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import logging
from langgraph.graph import StateGraph, START, END
from src.utils.memory import get_redis_memory
from src.chatbot.graph.types import State
from src.chatbot.graph.nodes import initialize_node, chatbot_node, enhanced_chatbot_node, basic_chatbot_node

logger = logging.getLogger(__name__)





def _build_base_graph():
    """Build and return the base chatbot state graph with configurable features using conditional edges."""
    builder = StateGraph(State)
    # Add nodes
    builder.add_node("enhanced_chatbot_node", enhanced_chatbot_node)
    # Add conditional edges from initialize to different chatbot nodes

    builder.add_edge("enhanced_chatbot_node", END)

    # Add START edge
    builder.add_edge(START, "enhanced_chatbot_node")
    return builder



def build_graph_with_memory():
    """Build and return the chatbot workflow graph with memory and configurable features.
    
    Args:
        enable_online_search: Whether to enable web search functionality
        enable_knowledge_retrieval: Whether to enable knowledge base retrieval
    """
    # Use persistent memory to save conversation history
    memory = get_redis_memory()
    
    # Build state graph with specified features
    builder = _build_base_graph()
    return builder.compile(checkpointer=memory)


def build_graph():
    """Build and return the chatbot workflow graph without memory."""
    # Build state graph
    builder = _build_base_graph()
    return builder.compile()




# Default graph instances
graph = build_graph()
