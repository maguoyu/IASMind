# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import logging

from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.runnables import RunnableConfig

from src.agents import create_agent
from src.tools import get_retriever_tool
from src.config.configuration import Configuration
from src.config.agents import AGENT_LLM_MAP
from src.llms.llm import get_llm_by_type

from src.chatbot.graph.types import State

logger = logging.getLogger(__name__)


def chatbot_node(state: State, config: RunnableConfig):
    """Main chatbot node that handles conversation with RAG support."""
    logger.info("Chatbot node is processing user query.")
    configurable = Configuration.from_runnable_config(config)
    
    # Get the latest user message
    messages = state.get("messages", [])
    if not messages:
        return {"response": "Hello! How can I help you today?"}
    
    # Setup tools including RAG retriever if available
    tools = []
    retriever_tool = get_retriever_tool(state.get("resources", []))
    if retriever_tool:
        tools.append(retriever_tool)
        logger.info("RAG retriever tool added to chatbot")
    
    # Add reminder about knowledge base usage if resources are available
    enhanced_messages = list(messages)
    if state.get("resources"):
        resources_info = "**Available knowledge base resources:**\n\n"
        for resource in state.get("resources"):
            resources_info += f"- {resource.title}: {resource.description}\n"
        
        resources_reminder = HumanMessage(
            content=resources_info + "\n\nPlease use the **local_search_tool** to search for relevant information from these resources when answering user questions.",
            name="system"
        )
        enhanced_messages.append(resources_reminder)
    
    try:
        if tools:
            # Create agent with tools (including RAG)
            agent = create_agent("chatbot", "chatbot", tools, "chatbot")
            
            # Set recursion limit
            recursion_limit = 10  # Lower limit for chatbot compared to researcher
            
            logger.info(f"Chatbot agent input: {len(enhanced_messages)} messages")
            result = agent.invoke(
                {"messages": enhanced_messages}, 
                config={"recursion_limit": recursion_limit}
            )
            
            # Extract response
            response_content = result["messages"][-1].content
        else:
            # Use LLM directly without tools for basic conversation
            logger.info("No tools available, using LLM directly for conversation")
            llm = get_llm_by_type(AGENT_LLM_MAP.get("chatbot", "basic"))
            
            # Create a simple conversation context
            conversation_messages = enhanced_messages
            
            response = llm.invoke(conversation_messages)
            response_content = response.content
    
    except Exception as e:
        logger.exception(f"Error in chatbot processing: {str(e)}")
        response_content = f"抱歉，处理您的请求时出现了错误。请稍后再试。"
    
    logger.info(f"Chatbot response generated: {len(response_content)} characters")
    
    return {
        "messages": [AIMessage(content=response_content, name="chatbot")],
        "response": response_content
    }


def initialize_node(state: State, config: RunnableConfig):
    """Initialize the chatbot conversation."""
    configurable = Configuration.from_runnable_config(config)
    
    # Extract user query from the latest message
    messages = state.get("messages", [])
    user_query = ""
    if messages:
        user_query = messages[-1].content if hasattr(messages[-1], 'content') else str(messages[-1])
    
    return {
        "locale": state.get("locale", "zh-CN"),
        "resources": configurable.resources or [],
        "user_query": user_query,
    } 