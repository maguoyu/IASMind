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


def truncate_content_intelligently(content: str, max_chars: int = 600) -> str:
    """
    智能截断内容，在语义边界处截断以保持完整性。
    
    Args:
        content: 要截断的内容
        max_chars: 最大字符数（默认600字符，约300个中文字）
        
    Returns:
        截断后的内容
    """
    if not content or not isinstance(content, str):
        return ""
    
    # 如果内容已经小于限制，直接返回
    if len(content) <= max_chars:
        return content
    
    # 截取内容
    truncated = content[:max_chars]
    
    # 尝试在自然的语义边界处截断（句号、问号、感叹号、换行符等）
    delimiters = ['。', '！', '？', '；', '. ', '! ', '? ', '; ', '\n\n', '\n']
    
    for delimiter in delimiters:
        # 寻找最后一个分隔符的位置
        last_pos = truncated.rfind(delimiter)
        # 确保至少保留60%的内容，避免截断太多
        if last_pos > max_chars * 0.6:
            # 包含分隔符本身
            return truncated[:last_pos + len(delimiter)] + "..."
    
    # 如果找不到合适的分隔符，在最后一个空格处截断
    last_space = truncated.rfind(' ')
    if last_space > max_chars * 0.8:
        return truncated[:last_space] + "..."
    
    # 实在找不到好的截断点，直接截断并添加省略号
    return truncated + "..."


def search_knowledge_base_sync(user_query: str, resources: List) -> List[Dict[str, Any]]:
    """同步搜索本地知识库"""
    try:
        retriever_tool = get_retriever_tool(resources)
        if retriever_tool:
            logger.info(f"正在搜索本地知识库，查询: '{user_query[:50]}...'")
            kb_results = retriever_tool.invoke({"keywords": user_query})
            if isinstance(kb_results, list):
                logger.info(f"从知识库中找到 {len(kb_results)} 条结果")
                return kb_results
            else:
                logger.warning(f"知识库返回的结果类型不是列表: {type(kb_results)}")
        else:
            logger.warning("无法获取知识库检索工具")
    except Exception as e:
        logger.warning(f"搜索知识库时出错: {e}")
    return []


def search_web_sync(user_query: str, max_results: int) -> List[Dict[str, Any]]:
    """同步搜索网络获取最新信息"""
    try:
        web_search_tool = get_web_search_tool(max_results)
        if web_search_tool:
            logger.info(f"正在搜索网络，查询: '{user_query[:50]}...', 最多返回 {max_results} 条结果")
            web_results = web_search_tool.invoke({"query": user_query})
            
            if isinstance(web_results, list):
                logger.info(f"从网络搜索中找到 {len(web_results)} 条结果")
                return web_results
            elif isinstance(web_results, str):
                # 尝试解析JSON字符串
                try:
                    parsed_results = json.loads(web_results)
                    if isinstance(parsed_results, list):
                        logger.info(f"从网络搜索中解析到 {len(parsed_results)} 条结果")
                        return parsed_results
                except json.JSONDecodeError as json_err:
                    logger.warning(f"无法解析网络搜索返回的JSON: {json_err}")
            else:
                logger.warning(f"网络搜索返回的结果类型不支持: {type(web_results)}")
        else:
            logger.warning("无法获取网络搜索工具")
    except Exception as e:
        logger.warning(f"搜索网络时出错: {e}")
    return []


def enhanced_chatbot_node(state: State, config: RunnableConfig):
    """
    增强型聊天机器人节点，支持知识库和网络搜索的并行融合检索。
    
    功能特性：
    1. 智能并行执行：当同时启用知识库和网络搜索时，使用线程池并行执行以提升性能
    2. 智能内容截断：使用语义边界截断算法，保留完整的句子和段落
    3. 检索融合：综合知识库和网络搜索的结果，提供更全面的答案
    4. 降级处理：当并行执行失败时自动降级到顺序执行
    5. 详细日志：提供完整的执行过程日志，便于调试和监控
    
    Args:
        state: 聊天状态，包含消息、配置和资源信息
        config: 运行时配置
        
    Returns:
        包含AI回复消息和检索结果的字典
    """
    logger.info("增强型聊天机器人节点开始处理用户查询，使用并行融合检索...")
    configurable = Configuration.from_runnable_config(config)
    
    # 获取用户消息和配置
    messages = state.get("messages", [])
    enable_online_search = state.get("enable_online_search", False)
    enable_knowledge_retrieval = state.get("enable_knowledge_retrieval", False)

    if not messages:
        return {"response": "你好！我能为你做些什么？"}
    
    # 提取用户查询
    user_query = messages[-1].content if messages else ""
    if not isinstance(user_query, str):
        user_query = str(user_query)
    
    logger.info(f"用户查询: '{user_query[:100]}...', 知识库检索: {enable_knowledge_retrieval}, 网络搜索: {enable_online_search}")
    
    resources = state.get("resources", [])
    max_search_results = configurable.max_search_results or 3
    
    # 并行执行知识库和网络搜索
    knowledge_base_results = []
    web_search_results = []
    
    # 检查是否需要并行执行
    need_parallel = enable_knowledge_retrieval and enable_online_search
    
    try:
        if need_parallel:
            # 两个搜索都需要，使用线程池并行执行
            logger.info("并行执行知识库检索和网络搜索...")
            with ThreadPoolExecutor(max_workers=2) as executor:
                # 同时提交两个任务
                kb_future = executor.submit(search_knowledge_base_sync, user_query, resources)
                web_future = executor.submit(search_web_sync, user_query, max_search_results)
                
                # 等待所有任务完成
                knowledge_base_results = kb_future.result()
                web_search_results = web_future.result()
                
                logger.info(f"并行搜索完成 - 知识库结果: {len(knowledge_base_results)}条, 网络结果: {len(web_search_results)}条")
        else:
            # 只需要一个搜索，顺序执行即可
            if enable_knowledge_retrieval:
                logger.info("执行知识库检索...")
                knowledge_base_results = search_knowledge_base_sync(user_query, resources)
                logger.info(f"知识库检索完成，找到 {len(knowledge_base_results)} 条结果")
            
            if enable_online_search:
                logger.info("执行网络搜索...")
                web_search_results = search_web_sync(user_query, max_search_results)
                logger.info(f"网络搜索完成，找到 {len(web_search_results)} 条结果")
            
    except Exception as e:
        logger.exception(f"搜索执行过程中发生错误: {str(e)}")
        # 降级处理：尝试顺序执行
        try:
            if enable_knowledge_retrieval and not knowledge_base_results:
                logger.info("尝试顺序执行知识库检索...")
                knowledge_base_results = search_knowledge_base_sync(user_query, resources)
            if enable_online_search and not web_search_results:
                logger.info("尝试顺序执行网络搜索...")
                web_search_results = search_web_sync(user_query, max_search_results)
        except Exception as fallback_error:
            logger.exception(f"降级执行也失败了: {str(fallback_error)}")
    
    # 构建增强的上下文信息，使用检索融合的结果
    enhanced_messages = list(messages)
    context_info = []
    
    # 处理知识库检索结果
    if knowledge_base_results:
        context_info.append("**知识库信息：**")
        for i, result in enumerate(knowledge_base_results[:3], 1):  # 限制为前3条
            try:
                if isinstance(result, dict):
                    title = result.get('title', f'结果 {i}')
                    content = result.get('content', str(result))
                    # 使用智能截断函数
                    truncated_content = truncate_content_intelligently(content, max_chars=600)
                    context_info.append(f"{i}. {title}:\n{truncated_content}")
                elif isinstance(result, Document):
                    # 处理Document对象
                    title = result.title if hasattr(result, 'title') else f'文档 {i}'
                    content = result.chunks[0].content if result.chunks else ""
                    truncated_content = truncate_content_intelligently(content, max_chars=600)
                    context_info.append(f"{i}. {title}:\n{truncated_content}")
            except Exception as e:
                logger.warning(f"处理知识库结果 {i} 时出错: {str(e)}")
                continue
    
    # 处理网络搜索结果
    if web_search_results:
        context_info.append("\n**网络搜索信息：**")
        for i, result in enumerate(web_search_results[:3], 1):  # 限制为前3条
            try:
                if isinstance(result, dict):
                    title = result.get('title', f'网络结果 {i}')
                    content = result.get('content', str(result))
                    url = result.get('url', '')
                    # 使用智能截断函数
                    truncated_content = truncate_content_intelligently(content, max_chars=600)
                    source_info = f" (来源: {url})" if url else ""
                    context_info.append(f"{i}. {title}{source_info}:\n{truncated_content}")
            except Exception as e:
                logger.warning(f"处理网络搜索结果 {i} 时出错: {str(e)}")
                continue
    
    # 如果有上下文信息，添加到消息中
    if context_info:
        context_message = f"问题: {user_query}\n\n"
        context_message += "上下文:\n" + "\n\n".join(context_info)
        context_message += "\n\n请基于以上上下文信息回答问题。保持回答简洁、准确，如果内容中有图片，优先以使用markdown格式展示，如果信息有冲突，请优先使用最新或最权威的来源。"
        
        system_context = HumanMessage(
            content=context_message,
            name="system"
        )
        enhanced_messages.append(system_context)
    
    # 使用LLM生成回答
    try:
        llm = get_llm_by_type(AGENT_LLM_MAP.get("chatbot", "basic"))
        
        # 添加融合指令
        fusion_instructions = HumanMessage(
            content="""你是一个AI助手，可以访问知识库和网络搜索结果。
请综合这些信息提供全面、准确的回答。
如果信息有冲突，请优先使用最新或最权威的来源。
回答应该清晰、有条理，并且基于提供的上下文。""",
            name="system"
        )
        enhanced_messages.append(fusion_instructions)
        
        logger.info(f"准备调用LLM，消息数量: {len(enhanced_messages)}")

        response = llm.invoke(enhanced_messages)
        response_content = response.content
        
        logger.info(f"LLM回复生成成功，长度: {len(response_content)} 字符")
        
    except Exception as e:
        logger.exception(f"增强型聊天机器人处理过程中发生错误: {str(e)}")
        response_content = "抱歉，处理您的请求时出现了错误。请稍后再试。"
    
    logger.info(f"增强型聊天机器人回复生成完成: {len(response_content)} 字符")
    
    # 将Document对象转换为字典以便JSON序列化
    def convert_to_dict(obj):
        if hasattr(obj, 'to_dict'):
            res =  obj.to_dict()
            res["content"] = ""
            res["raw_content"] = ""
            res["metadata"]["source"] = ""
            return res
        elif hasattr(obj, 'model_dump'):
             res =  obj.model_dump()
             res["content"] = ""
             res["raw_content"] = ""
             return res
        elif isinstance(obj, dict):
            obj["content"] = ""
            obj["raw_content"] = ""
            return obj

        else:
            return str(obj)
    
    serializable_kb_results = [convert_to_dict(result) for result in knowledge_base_results] if knowledge_base_results else []
    serializable_web_results = [convert_to_dict(result) for result in web_search_results] if web_search_results else []
    
    return {
        "messages": [AIMessage(
            content=response_content, 
            name="chatbot",
            additional_kwargs={
                "knowledge_base_results": serializable_kb_results,
                "web_search_results": serializable_web_results
            }
        )],
   
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