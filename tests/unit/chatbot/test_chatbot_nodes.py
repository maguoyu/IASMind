# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import pytest
from unittest.mock import Mock, patch
from langchain_core.messages import HumanMessage

from src.chatbot.graph.nodes import initialize_node, chatbot_node
from src.chatbot.graph.types import State
from src.rag.retriever import Resource


class TestChatbotNodes:
    """Test chatbot graph nodes."""

    def test_initialize_node_basic(self):
        """Test basic initialization without resources."""
        state = {
            "messages": [HumanMessage(content="Hello")],
            "locale": "en-US"
        }
        config = Mock()
        config.configurable = {"resources": []}
        
        with patch('src.chatbot.graph.nodes.Configuration') as mock_config:
            mock_config.from_runnable_config.return_value.resources = []
            
            result = initialize_node(state, config)
            
            assert result["locale"] == "en-US"
            assert result["resources"] == []
            assert result["user_query"] == "Hello"

    def test_initialize_node_with_resources(self):
        """Test initialization with RAG resources."""
        resources = [
            Resource(
                uri="rag://dataset/test",
                title="Test Document",
                description="Test description"
            )
        ]
        
        state = {
            "messages": [HumanMessage(content="What is this?")],
        }
        config = Mock()
        
        with patch('src.chatbot.graph.nodes.Configuration') as mock_config:
            mock_config.from_runnable_config.return_value.resources = resources
            
            result = initialize_node(state, config)
            
            assert result["resources"] == resources
            assert result["user_query"] == "What is this?"

    def test_chatbot_node_no_messages(self):
        """Test chatbot node with no messages."""
        state = {"messages": []}
        config = Mock()
        
        with patch('src.chatbot.graph.nodes.Configuration') as mock_config:
            mock_config.from_runnable_config.return_value.resources = []
            
            result = chatbot_node(state, config)
            
            assert result["response"] == "Hello! How can I help you today?"

    @patch('src.chatbot.graph.nodes.get_retriever_tool')
    @patch('src.chatbot.graph.nodes.create_agent')
    def test_chatbot_node_with_rag(self, mock_create_agent, mock_get_retriever_tool):
        """Test chatbot node with RAG functionality."""
        # Setup mocks
        mock_retriever_tool = Mock()
        mock_get_retriever_tool.return_value = mock_retriever_tool
        
        mock_agent = Mock()
        mock_result = {
            "messages": [Mock(content="Based on the knowledge base, the answer is...")]
        }
        mock_agent.invoke.return_value = mock_result
        mock_create_agent.return_value = mock_agent
        
        # Setup test data
        resources = [
            Resource(
                uri="rag://dataset/test",
                title="Test Document", 
                description="Test description"
            )
        ]
        
        state = {
            "messages": [HumanMessage(content="What is this product?")],
            "resources": resources
        }
        config = Mock()
        
        with patch('src.chatbot.graph.nodes.Configuration') as mock_config:
            mock_config.from_runnable_config.return_value.resources = resources
            
            result = chatbot_node(state, config)
            
            # Verify RAG tool was created
            mock_get_retriever_tool.assert_called_once_with(resources)
            
            # Verify agent was created with tools
            mock_create_agent.assert_called_once()
            args = mock_create_agent.call_args
            assert args[0] == ("chatbot", "chatbot")  # name, type
            assert mock_retriever_tool in args[1]  # tools list
            assert args[2] == "chatbot"  # prompt template
            
            # Verify response
            assert "Based on the knowledge base" in result["response"]

    @patch('src.chatbot.graph.nodes.get_retriever_tool')
    def test_chatbot_node_fallback_no_tools(self, mock_get_retriever_tool):
        """Test chatbot node fallback when no tools are available."""
        mock_get_retriever_tool.return_value = None
        
        state = {
            "messages": [HumanMessage(content="Hello")],
            "resources": []
        }
        config = Mock()
        
        with patch('src.chatbot.graph.nodes.Configuration') as mock_config:
            mock_config.from_runnable_config.return_value.resources = []
            
            result = chatbot_node(state, config)
            
            assert "I received your message: Hello" in result["response"]
            assert "don't have access to additional tools" in result["response"] 