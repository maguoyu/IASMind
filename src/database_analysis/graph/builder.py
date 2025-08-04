# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from .state import DatabaseAnalysisState
from .nodes import DatabaseAnalysisNodes
from src.utils.memory import get_redis_memory

def create_database_analysis_graph():
    """创建数据库分析图"""
    
    # 初始化节点
    nodes = DatabaseAnalysisNodes()
    
    # 创建状态图
    workflow = StateGraph(DatabaseAnalysisState)
    
    # 添加节点
    workflow.add_node("intent_recognized", nodes.intent_recognized)
    workflow.add_node("metadata_retrieval", nodes.metadata_retrieval)
    workflow.add_node("sql_generation", nodes.sql_generation)
    workflow.add_node("sql_validation", nodes.sql_validation)
    workflow.add_node("sql_execution", nodes.sql_execution)
    workflow.add_node("result_type_determination", nodes.result_type_determination)
    
    # 设置入口点
    workflow.set_entry_point("intent_recognized")
    
    # 添加边（定义流程）
    workflow.add_edge("metadata_retrieval", "sql_generation")
    workflow.add_edge("sql_generation", "sql_validation")
    # 添加条件边：意图识别成功则执行，失败则结束
    workflow.add_conditional_edges(
        "intent_recognized",
        validate_intent,
        {
            "execute": "metadata_retrieval",
            "end": END
        }
    )
    # 添加条件边：验证成功则执行，失败则结束
    workflow.add_conditional_edges(
        "sql_validation",
        should_execute_sql,
        {
            "execute": "sql_execution",
            "end": END
        }
    )
    
    workflow.add_edge("sql_execution", "result_type_determination")
    workflow.add_edge("result_type_determination", END)
    
    # 添加内存检查点
    memory = get_redis_memory()
    
    # 编译图
    graph = workflow.compile(checkpointer=memory)
    
    return graph

def validate_intent(state: DatabaseAnalysisState) -> str:
    """验证意图"""
    intent = state.get("intent")
    if intent and intent.valid:
        return "execute"
    return "end"

def should_execute_sql(state: DatabaseAnalysisState) -> str:
    """判断是否应该执行SQL"""
    validation_result = state.get("validation_result", {})
    
    # 如果有错误，直接结束
    if state.get("error"):
        return "end"
    
    # 如果验证通过，执行SQL
    if validation_result.get("is_valid", False):
        return "execute"
    
    # 验证失败，结束流程
    return "end"


async def run_database_analysis(
    user_query: str,
    datasource_id: str,
    table_name: str = None,
    thread_id: str = "default"
):
    """运行数据库分析"""
    
    # 创建图
    graph = create_database_analysis_graph()
    
    # 初始状态
    initial_state = DatabaseAnalysisState(
        user_query=user_query,
        datasource_id=datasource_id,
        table_name=table_name,
        intent=None,
        entities=[],
        metadata={},
        sql_query="",
        validation_result={},
        query_result=None,
        result_type="table",
        chart_config=None,
        error=None,
        retry_count=0
    )
    
    # 配置
    config = {
        "configurable": {
            "thread_id": thread_id
        }
    }
    
    try:
        # 执行图并保存最终状态
        final_state = initial_state
        last_message_cnt = 0
        
        async for s in graph.astream(
            input=initial_state, config=config, stream_mode="values"
        ):
            if isinstance(s, dict) and "messages" in s:
                if len(s["messages"]) <= last_message_cnt:
                    continue
                last_message_cnt = len(s["messages"])
                message = s["messages"][-1]
                if isinstance(message, tuple):
                    print(message)
                else:
                    message.pretty_print()
            else:
                # For any other output format
                print(f"Output: {s}")
                # 更新最终状态
                if isinstance(s, dict):
                    final_state.update(s)
        
        # 返回最终状态
        return final_state
        
    except Exception as e:
        return {
            **initial_state,
            "error": f"分析执行失败: {str(e)}"
        } 