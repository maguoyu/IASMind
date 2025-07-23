import os
import json
import asyncio
import platform
from typing import Any, Dict, Hashable, List, Optional

from src.config.configuration import get_config

# 检查平台并设置正确的事件循环策略
if platform.system() == 'Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())


class VmindClient:
    """
    VmindClient 类用于调用 vmind 数据可视化功能
    封装了调用 TypeScript 实现的图表生成工具的逻辑
    """
    
    def __init__(self, llm_config):
        """
        初始化 VmindClient
        
        参数:
            llm: LLM 客户端实例，需要有 base_url, model, api_key 属性
        """
        self.llm_config = llm_config
    
    async def invoke_vmind(
            self,
            file_name: str,
            output_type: str,
            task_type: str,
            insights_id: Optional[List[str]] = None,
            dict_data: Optional[List[Dict[Hashable, Any]]] = None,
            chart_description: Optional[str] = None,
            language: str = "zh",
        ):
        """
        调用 VMind 图表生成工具
        
        参数:
            file_name: 输出文件名
            output_type: 输出类型，如 'png' 或 'html'
            task_type: 任务类型，如 'visualization'
            insights_id: 洞察 ID 列表
            dict_data: 数据字典列表
            chart_description: 图表描述
            language: 语言代码，默认为中文 'zh'
            
        返回:
            Dict: 包含生成的图表路径和可能的错误信息
        """
 
        vmind_params = {
            "llm_config": self.llm_config,
            "user_prompt": chart_description,
            "dataset": dict_data,
            "file_name": file_name,
            "output_type": output_type,
            "insights_id": insights_id,
            "task_type": task_type,
            "language": language,
        }
        # build async sub process
        process = await asyncio.create_subprocess_exec(
            "npx",
            "ts-node",
            "src/vmind.ts",
            vmind_params,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=os.path.dirname(__file__),
        )
        input_json = json.dumps(vmind_params, ensure_ascii=False).encode("utf-8")
        try:
            stdout, stderr = await process.communicate(input_json)
            stdout_str = stdout.decode("utf-8")
            stderr_str = stderr.decode("utf-8")
            if process.returncode == 0:
                return json.loads(stdout_str)
            else:
                return {"error": f"Node.js Error: {stderr_str}"}
        except Exception as e:
            return {"error": f"Subprocess Error: {str(e)}"}
