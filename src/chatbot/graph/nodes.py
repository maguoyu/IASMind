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
from src.rag import Document
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
    enable_online_search = state.get("enable_online_search", False)
    enable_knowledge_retrieval = state.get("enable_knowledge_retrieval", False)

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
            if enable_knowledge_retrieval:
                kb_future = executor.submit(search_knowledge_base_sync, user_query, resources)
                knowledge_base_results = kb_future.result()
            if enable_online_search:
                web_future = executor.submit(search_web_sync, user_query, max_search_results)
                web_search_results = web_future.result()

            
            # Wait for both tasks to complete
      
            
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
            elif isinstance(result, Document):
                context_info.append(f"{i}. {result.title}: {result.chunks[0].content[:200]}...")
    if web_search_results:
        context_info.append("\n**Web Search Information:**")
        for i, result in enumerate(web_search_results[:3], 1):  # Limit to top 3
            if isinstance(result, dict):
                title = result.get('title', f'Web Result {i}')
                content = result.get('content', str(result))
                url = result.get('url', '')
                context_info.append(f"{i}. {title}: {content[:200]}... (Source: {url})")
    
    if context_info:
        context_message = f"Question: {user_query}\n"
        context_message += "Context:".join(context_info)
        context_message += "\n\nUse the following context to answer the question. Keep the answer concise and accurate"
        
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
    
    # Convert Document objects to dictionaries for JSON serialization
    def convert_to_dict(obj):
        if hasattr(obj, 'to_dict'):
            return obj.to_dict()
        elif hasattr(obj, 'model_dump'):
            return obj.model_dump()
        elif isinstance(obj, dict):
            return obj
        else:
            return str(obj)
    
    serializable_kb_results = [convert_to_dict(result) for result in knowledge_base_results] if knowledge_base_results else []
    serializable_web_results = [convert_to_dict(result) for result in web_search_results] if web_search_results else []
    
    return {
        "messages": [AIMessage(content=response_content, name="chatbot")],
        "response": response_content,
        "knowledge_base_results": serializable_kb_results,
        "web_search_results": serializable_web_results
    }


def basic_chatbot_node(state: State, config: RunnableConfig):
    """Basic secure chatbot node without external tools for safe conversations."""
    logger.info("Basic secure chatbot node is processing user query.")
    
    # Get the latest user message
    messages = state.get("messages", [])
    if not messages:
        return {"response": "Hello! I'm a secure AI assistant. How can I help you today?"}
    
    # Security check - filter sensitive content
    user_query = messages[-1].content if messages else ""
    if not isinstance(user_query, str):
        user_query = str(user_query)
    
    # Security validation
    if not is_safe_query(user_query):
        return {
            "response": "I apologize, but I cannot process that type of request for security reasons. Please ask a different question.",
            "messages": [AIMessage(content="I apologize, but I cannot process that type of request for security reasons. Please ask a different question.", name="chatbot")]
        }
    
    try:
        # Use LLM directly without external tools for maximum security
        llm = get_llm_by_type(AGENT_LLM_MAP.get("chatbot", "basic"))
        
        # Create secure conversation context
        secure_messages = [
            HumanMessage(content="""You are a secure AI assistant. Follow these guidelines:
1. Provide helpful, accurate information
2. Do not access external tools or databases
3. Do not generate harmful, illegal, or inappropriate content
4. If asked about sensitive topics, politely decline
5. Focus on general knowledge and safe topics
6. Be conversational and friendly while maintaining security""", name="system"),
            *messages
        ]
        
        response = llm.invoke(secure_messages)
        response_content = response.content
        
        # Additional security check on response
        if isinstance(response_content, str) and not is_safe_response(response_content):
            response_content = "I apologize, but I cannot provide that type of response. Please ask a different question."
        
    except Exception as e:
        logger.exception(f"Error in basic chatbot processing: {str(e)}")
        response_content = "抱歉，处理您的请求时出现了错误。请稍后再试。"
    
    logger.info(f"Basic chatbot response generated: {len(response_content)} characters")
    
    return {
        "messages": [AIMessage(content=response_content, name="chatbot")],
        "response": response_content
    }


def is_safe_query(query: str) -> bool:
    """Check if the user query is safe to process."""
    if not query or not isinstance(query, str):
        return False
    
    # Convert to lowercase for case-insensitive matching
    query_lower = query.lower()
    
    # Define unsafe patterns
    unsafe_patterns = [
        "hack", "exploit", "bypass", "crack", "steal", "illegal", "weapon", "bomb",
        "kill", "harm", "attack", "virus", "malware", "phishing", "scam", "fraud",
        "password", "credit card", "ssn", "social security", "personal data",
        "private key", "encryption key", "admin", "root access", "privilege escalation"
    ]
    
    # Check for unsafe patterns
    for pattern in unsafe_patterns:
        if pattern in query_lower:
            logger.warning(f"Unsafe query detected: {pattern} in '{query}'")
            return False
    
    return True


def is_safe_response(response: str) -> bool:
    """Check if the AI response is safe to return."""
    if not response or not isinstance(response, str):
        return False
    
    # Convert to lowercase for case-insensitive matching
    response_lower = response.lower()
    
    # Define unsafe response patterns
    unsafe_patterns = [
        "hack", "exploit", "bypass", "crack", "steal", "illegal", "weapon", "bomb",
        "kill", "harm", "attack", "virus", "malware", "phishing", "scam", "fraud",
        "password", "credit card", "ssn", "social security", "personal data",
        "private key", "encryption key", "admin", "root access", "privilege escalation"
    ]
    
    # Check for unsafe patterns
    for pattern in unsafe_patterns:
        if pattern in response_lower:
            logger.warning(f"Unsafe response detected: {pattern} in response")
            return False
    
    return True


def initialize_node(state: State, config: RunnableConfig):
    """Initialize the chatbot conversation with configurable features."""
    configurable = Configuration.from_runnable_config(config)
    
    # Extract user query from the latest message
    messages = state.get("messages", [])
    user_query = ""
    if messages:
        user_query = messages[-1].content if hasattr(messages[-1], 'content') else str(messages[-1])
    
    # Get feature flags from config or use defaults
    enable_online_search = state.get("enable_online_search", False)
    enable_knowledge_retrieval = state.get("enable_knowledge_retrieval", False)
    
    return {
        "locale": state.get("locale", "zh-CN"),
        "resources": configurable.resources or [],
        "user_query": user_query,
        "enable_online_search": enable_online_search,
        "enable_knowledge_retrieval": enable_knowledge_retrieval,
    } 