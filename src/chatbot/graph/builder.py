# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from src.chatbot.graph.types import State
from src.chatbot.graph.nodes import initialize_node, chatbot_node, enhanced_chatbot_node


def _build_base_graph():
    """Build and return the base chatbot state graph."""
    builder = StateGraph(State)
    
    # Add nodes
    builder.add_node("initialize", initialize_node)
    builder.add_node("chatbot", chatbot_node)
    
    # Add edges
    builder.add_edge(START, "initialize")
    builder.add_edge("initialize", "chatbot")
    builder.add_edge("chatbot", END)
    
    return builder


def _build_enhanced_graph():
    """Build and return the enhanced chatbot state graph with fusion retrieval."""
    builder = StateGraph(State)
    
    # Add nodes
    builder.add_node("initialize", initialize_node)
    builder.add_node("enhanced_chatbot", enhanced_chatbot_node)
    
    # Add edges
    builder.add_edge(START, "initialize")
    builder.add_edge("initialize", "enhanced_chatbot")
    builder.add_edge("enhanced_chatbot", END)
    
    return builder


def build_graph_with_memory():
    """Build and return the chatbot workflow graph with memory."""
    # Use persistent memory to save conversation history
    memory = MemorySaver()
    
    # Build state graph
    builder = _build_base_graph()
    return builder.compile(checkpointer=memory)


def build_enhanced_graph_with_memory():
    """Build and return the enhanced chatbot workflow graph with memory and fusion retrieval."""
    # Use persistent memory to save conversation history
    memory = MemorySaver()
    
    # Build enhanced state graph
    builder = _build_enhanced_graph()
    return builder.compile(checkpointer=memory)


def build_graph():
    """Build and return the chatbot workflow graph without memory."""
    # Build state graph
    builder = _build_base_graph()
    return builder.compile()


def build_enhanced_graph():
    """Build and return the enhanced chatbot workflow graph without memory."""
    # Build enhanced state graph
    builder = _build_enhanced_graph()
    return builder.compile()


# Default graph instances
graph = build_graph()
enhanced_graph = build_enhanced_graph() 