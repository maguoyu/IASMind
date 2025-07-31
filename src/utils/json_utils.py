# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import logging
import json
import json_repair
from typing import Any, Optional

logger = logging.getLogger(__name__)


def safe_json_loads(json_str: str, default: Any = None) -> Any:
    """
    安全地解析JSON字符串
    
    Args:
        json_str (str): JSON字符串
        default (Any): 解析失败时的默认值
        
    Returns:
        Any: 解析后的对象，或默认值
    """
    if not json_str or not isinstance(json_str, str):
        return default if default is not None else {}
    
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError, ValueError) as e:
        logger.warning(f"JSON解析失败: {e}, 内容: {json_str[:100]}...")
        return default if default is not None else {}


def safe_json_dumps(obj: Any, default: Optional[str] = None, ensure_ascii: bool = False) -> str:
    """
    安全地序列化对象为JSON字符串
    
    Args:
        obj (Any): 要序列化的对象
        default (Optional[str]): 序列化失败时的默认值
        ensure_ascii (bool): 是否确保ASCII编码
        
    Returns:
        str: JSON字符串，或默认值
    """
    if obj is None:
        return default if default is not None else "{}"
    
    try:
        return json.dumps(obj, ensure_ascii=ensure_ascii, separators=(',', ':'))
    except (TypeError, ValueError, OverflowError) as e:
        logger.warning(f"JSON序列化失败: {e}, 对象类型: {type(obj)}")
        return default if default is not None else "{}"


def repair_json_output(content: str) -> str:
    """
    Repair and normalize JSON output.

    Args:
        content (str): String content that may contain JSON

    Returns:
        str: Repaired JSON string, or original content if not JSON
    """
    content = content.strip()
    if content.startswith(("{", "[")) or "```json" in content or "```ts" in content:
        try:
            # If content is wrapped in ```json code block, extract the JSON part
            if content.startswith("```json"):
                content = content.removeprefix("```json")

            if content.startswith("```ts"):
                content = content.removeprefix("```ts")

            if content.endswith("```"):
                content = content.removesuffix("```")

            # Try to repair and parse JSON
            repaired_content = json_repair.loads(content)
            return json.dumps(repaired_content, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"JSON repair failed: {e}")
    return content
