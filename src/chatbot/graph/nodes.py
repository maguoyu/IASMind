# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import logging
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any

from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.runnables import RunnableConfig

from src.agents import create_agent
from src.tools import get_retriever_tool, get_web_search_tool
from src.config.configuration import Configuration
from src.config.agents import AGENT_LLM_MAP
from src.llms.llm import get_llm_by_type

from src.chatbot.graph.types import State

logger = logging.getLogger(__name__)


def chatbot_node(state: State, config: RunnableConfig):
    """Main chatbot node that handles conversation with RAG and web search support."""
    logger.info("Chatbot node is processing user query.")
    configurable = Configuration.from_runnable_config(config)
    
    # Get the latest user message
    messages = state.get("messages", [])
    if not messages:
        return {"response": "Hello! How can I help you today?"}
    
    # Setup tools including RAG retriever and web search
    tools = []
    
    # Add RAG retriever tool if resources are available
    retriever_tool = get_retriever_tool(state.get("resources", []))
    if retriever_tool:
        tools.append(retriever_tool)
        logger.info("RAG retriever tool added to chatbot")
    
    # Add web search tool for online information
    web_search_tool = get_web_search_tool(configurable.max_search_results or 3)
    if web_search_tool:
        tools.append(web_search_tool)
        logger.info("Web search tool added to chatbot")
    
    # Add reminder about available tools
    enhanced_messages = list(messages)
    tool_instructions = []
    
    if state.get("resources"):
        resources_info = "**Available knowledge base resources:**\n\n"
        for resource in state.get("resources"):
            resources_info += f"- {resource.title}: {resource.description}\n"
        tool_instructions.append(resources_info + "\nPlease use the **local_search_tool** to search for relevant information from these resources when answering user questions.")
    
    if web_search_tool:
        tool_instructions.append("You also have access to **web_search** tool to search for current information from the internet when needed.")
    
    if tool_instructions:
        combined_instructions = "\n\n".join(tool_instructions)
        system_reminder = HumanMessage(
            content=combined_instructions,
            name="system"
        )
        enhanced_messages.append(system_reminder)
    
    try:
        if tools:
            # Create agent with tools (including RAG and web search)
            agent = create_agent("chatbot", "chatbot", tools, "chatbot")
            
            # Set recursion limit
            recursion_limit = 10  # Lower limit for chatbot compared to researcher
            
            logger.info(f"Chatbot agent input: {len(enhanced_messages)} messages with {len(tools)} tools")
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


def search_knowledge_base_sync(user_query: str, resources: List) -> List[Dict[str, Any]]:
    """Synchronous function to search local knowledge base."""
    try:
        retriever_tool = get_retriever_tool(resources)
        if retriever_tool:
            logger.info("Searching local knowledge base...")
            kb_results = retriever_tool.invoke({"keywords": user_query})
            if isinstance(kb_results, list):
                logger.info(f"Found {len(kb_results)} results from knowledge base")
                return kb_results
    except Exception as e:
        logger.warning(f"Error searching knowledge base: {e}")
    return []


def search_web_sync(user_query: str, max_results: int) -> List[Dict[str, Any]]:
    """Synchronous function to search web for current information."""
    try:
        web_search_tool = get_web_search_tool(max_results)
        if web_search_tool:
            logger.info("Searching web for current information...")
            web_results = web_search_tool.invoke({"query": user_query})
            if isinstance(web_results, list):
                logger.info(f"Found {len(web_results)} results from web search")
                return web_results
    except Exception as e:
        logger.warning(f"Error searching web: {e}")
    return []


def enhanced_chatbot_node(state: State, config: RunnableConfig):
    """Enhanced chatbot node with parallel fusion of local knowledge base and web search."""
    logger.info("Enhanced chatbot node is processing user query with parallel fusion retrieval.")
    configurable = Configuration.from_runnable_config(config)
    
    # Get the latest user message
    messages = state.get("messages", [])
    if not messages:
        return {"response": "Hello! How can I help you today?"}
    
    user_query = messages[-1].content if messages else ""
    if not isinstance(user_query, str):
        user_query = str(user_query)
    
    resources = state.get("resources", [])
    max_search_results = configurable.max_search_results or 3
    
    # Run parallel searches using ThreadPoolExecutor
    knowledge_base_results = []
    web_search_results = []
    
    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            # Submit both search tasks
            kb_future = executor.submit(search_knowledge_base_sync, user_query, resources)
            web_future = executor.submit(search_web_sync, user_query, max_search_results)
            
            # Wait for both tasks to complete
            knowledge_base_results = kb_future.result()
            web_search_results = web_future.result()
            
    except Exception as e:
        logger.exception(f"Error in parallel search execution: {str(e)}")
        # Fallback to sequential execution if parallel fails
        try:
            knowledge_base_results = search_knowledge_base_sync(user_query, resources)
            web_search_results = search_web_sync(user_query, max_search_results)
        except Exception as fallback_error:
            logger.exception(f"Error in fallback sequential execution: {str(fallback_error)}")
    
    # Create enhanced context with fusion results
    enhanced_messages = list(messages)
    context_info = []
    
    if knowledge_base_results:
        context_info.append("**Knowledge Base Information:**")
        for i, result in enumerate(knowledge_base_results[:3], 1):  # Limit to top 3
            if isinstance(result, dict):
                title = result.get('title', f'Result {i}')
                content = result.get('content', str(result))
                context_info.append(f"{i}. {title}: {content[:200]}...")
    
    if web_search_results:
        context_info.append("\n**Web Search Information:**")
        for i, result in enumerate(web_search_results[:3], 1):  # Limit to top 3
            if isinstance(result, dict):
                title = result.get('title', f'Web Result {i}')
                content = result.get('content', str(result))
                url = result.get('url', '')
                context_info.append(f"{i}. {title}: {content[:200]}... (Source: {url})")
    
    if context_info:
        context_message = "\n".join(context_info)
        context_message += "\n\nPlease synthesize this information to provide a comprehensive answer to the user's question."
        
        system_context = HumanMessage(
            content=context_message,
            name="system"
        )
        enhanced_messages.append(system_context)
    
    # Generate response using LLM
    try:
        llm = get_llm_by_type(AGENT_LLM_MAP.get("chatbot", "basic"))
        
        # Add fusion instructions
        fusion_instructions = HumanMessage(
            content="""You are an AI assistant with access to both knowledge base and web search results. 
            Please synthesize this information to provide a comprehensive, accurate answer. 
            When appropriate, mention the sources of your information (knowledge base vs. web search).
            If the information conflicts, prioritize the most recent or authoritative source.""",
            name="system"
        )
        enhanced_messages.append(fusion_instructions)
        
        response = llm.invoke(enhanced_messages)
        response_content = response.content
        
    except Exception as e:
        logger.exception(f"Error in enhanced chatbot processing: {str(e)}")
        response_content = f"抱歉，处理您的请求时出现了错误。请稍后再试。"
    
    logger.info(f"Enhanced chatbot response generated: {len(response_content)} characters")
    
    return {
        "messages": [AIMessage(content=response_content, name="chatbot")],
        "response": response_content,
        "knowledge_base_results": knowledge_base_results,
        "web_search_results": web_search_results
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