# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

from typing import Any, Dict
import os

from src.llms.llm import _get_config_file_path, _get_env_llm_conf
from src.config import load_yaml_config

async def get_llm_config(llm_type: str) -> Dict[str, Any]:
    """
    获取 LLM 配置，从配置文件和环境变量中组合获取
    
    参数:
        llm_type: LLM 类型，如 'basic', 'reasoning', 'vision'
        
    返回:
        Dict[str, Any]: 合并后的 LLM 配置
    """
    conf = load_yaml_config(_get_config_file_path())
    
    # Map LLM type to config key
    llm_type_config_keys = {
        "basic": "BASIC_MODEL",
        "reasoning": "REASONING_MODEL",
        "vision": "VISION_MODEL",
    }
    
    config_key = llm_type_config_keys.get(llm_type)
    if not config_key:
        raise ValueError(f"未知的 LLM 类型: {llm_type}")
    
    llm_conf = conf.get(config_key, {})
    if not isinstance(llm_conf, dict):
        raise ValueError(f"无效的 LLM 配置，类型: {llm_type}, 配置: {llm_conf}")
    
    # Get configuration from environment variables
    env_conf = _get_env_llm_conf(llm_type)
    
    # Merge configurations, with environment variables taking precedence
    merged_conf = {**llm_conf, **env_conf}
    
    if not merged_conf:
        raise ValueError(f"未找到 LLM 类型的配置: {llm_type}")
        
    return merged_conf 