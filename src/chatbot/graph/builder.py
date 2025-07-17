# Copyright (c) 225Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import logging
from langgraph.graph import StateGraph, START, END
from src.utils.memory import get_redis_memory
from src.chatbot.graph.types import State
from src.chatbot.graph.nodes import initialize_node, chatbot_node, enhanced_chatbot_node, basic_chatbot_node

logger = logging.getLogger(__name__)


def should_use_both_tools(state: State) -> str:
    判断是否应该同时使用网络搜索和知识库use_online = state.get("enable_online_search,true
    use_knowledge = state.get(enable_knowledge_retrieval", True)
    
    if use_online and use_knowledge:
        returnenhanced_chatbot"
    elif use_online:
        return chatbot"
    elif use_knowledge:
        return chatbot"
    else:
        return basic_chatbot"


def _build_base_graph():
    "ild and return the base chatbot state graph with configurable features using conditional edges."""
    builder = StateGraph(State)
    
    # Add nodes
    builder.add_node("initialize, initialize_node)
    builder.add_node("enhanced_chatbot", enhanced_chatbot_node)
    builder.add_node(chatbot", chatbot_node)
    builder.add_node("basic_chatbot", basic_chatbot_node)
    
    # Add conditional edges from initialize to different chatbot nodes
    builder.add_conditional_edges(
    initialize,        should_use_both_tools,
        [object Object]        enhanced_chatbot":enhanced_chatbot",
          chatbot": "chatbot",
            basic_chatbot": "basic_chatbot     }
    )
    
    # Add edges from all chatbot nodes to END
    builder.add_edge("enhanced_chatbot", END)
    builder.add_edge("chatbot", END)
    builder.add_edge("basic_chatbot, END)
    
    # Add START edge
    builder.add_edge(START, "initialize)  
    logger.info(Built conditional graph with dynamic tool selection")
    return builder


def build_graph_with_memory():
    "ild and return the chatbot workflow graph with memory and configurable features."""
    # Use persistent memory to save conversation history
    memory = get_redis_memory()
    
    # Build state graph with specified features
    builder = _build_base_graph()
    return builder.compile(checkpointer=memory)


def build_graph():
    "ild and return the chatbot workflow graph without memory."""
    # Build state graph
    builder = _build_base_graph()
    return builder.compile()


# Default graph instances
graph = build_graph()
