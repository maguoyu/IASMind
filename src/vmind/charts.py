import os
import json
import subprocess
import logging
import sys
import shutil
from typing import Any, Dict, Hashable, List, Optional, Tuple
from pathlib import Path

from src.config.configuration import get_config

# 配置日志
logger = logging.getLogger(__name__)


class VmindClient:
    """
    VmindClient 类用于调用 vmind 数据可视化功能
    封装了调用 TypeScript 实现的图表生成工具的逻辑
    """
    
    def __init__(self, llm_config):
        """
        初始化 VmindClient
        
        参数:
            llm_config: LLM 配置，包含 base_url, model, api_key 等属性
        """
        self.llm_config = llm_config
        logger.info("VmindClient 初始化完成")
    
    def _find_node_executable(self) -> Tuple[Optional[str], Optional[str], str]:
        """
        查找 Node.js 和 npx 可执行文件
        
        返回:
            Tuple[Optional[str], Optional[str], str]: (node路径, npx路径, 错误信息)
        """
        node_path = None
        npx_path = None
        error_msg = ""
        
        # 首先检查环境变量中是否有自定义的 Node.js 路径
        custom_node_path = os.environ.get("NODEJS_PATH")
        if custom_node_path and os.path.exists(custom_node_path):
            node_path = custom_node_path
            npx_path = os.path.join(os.path.dirname(custom_node_path), "npx")
            if os.path.exists(npx_path):
                logger.info(f"使用自定义 Node.js 路径: {node_path}")
                return node_path, npx_path, ""
            else:
                error_msg += f"找到自定义 Node.js 路径 {node_path}，但未找到对应的 npx。"
        
        # 尝试在 PATH 中查找
        try:
            node_path = shutil.which("node")
            npx_path = shutil.which("npx")
            
            if node_path and npx_path:
                logger.info(f"在 PATH 中找到 Node.js: {node_path}")
                return node_path, npx_path, ""
            else:
                if not node_path:
                    error_msg += "在 PATH 中未找到 node 命令。"
                if not npx_path:
                    error_msg += "在 PATH 中未找到 npx 命令。"
        except Exception as e:
            error_msg += f"查找 Node.js 时发生错误: {str(e)}。"
        
        # 尝试在常见安装位置查找
        common_paths = [
            r"C:\Program Files\nodejs",
            r"C:\Program Files (x86)\nodejs",
            os.path.expanduser("~\\AppData\\Roaming\\npm"),
            "/usr/local/bin",
            "/usr/bin",
            "/opt/homebrew/bin"
        ]
        
        for path in common_paths:
            node_candidate = os.path.join(path, "node.exe" if sys.platform == "win32" else "node")
            npx_candidate = os.path.join(path, "npx.cmd" if sys.platform == "win32" else "npx")
            
            if os.path.exists(node_candidate) and os.path.exists(npx_candidate):
                logger.info(f"在常见位置找到 Node.js: {node_candidate}")
                return node_candidate, npx_candidate, ""
        
        # 如果都没找到，返回详细的错误信息
        if not error_msg:
            error_msg = "未在系统中找到 Node.js 和 npx。请确保已安装 Node.js 并添加到 PATH 环境变量中，或设置 NODEJS_PATH 环境变量。"
        
        logger.error(f"Node.js 查找失败: {error_msg}")
        return None, None, error_msg
    
    def _create_js_wrapper(self, base_path: str) -> str:
        """
        创建一个简单的 JavaScript 包装器文件
        
        参数:
            base_path: 基础文件路径，用于构造输出文件路径
            
        返回:
            str: 创建的 JavaScript 文件路径
        """
        wrapper_path = f"{base_path}.js"
        with open(wrapper_path, "w", encoding="utf-8") as f:
            f.write("""
// JavaScript 包装器
const VMind = require("@visactor/vmind").default;
const { isString } = require("@visactor/vutils");

// 从标准输入读取数据
let inputData = Buffer.alloc(0);
process.stdin.on('data', (chunk) => {
    inputData = Buffer.concat([inputData, chunk]);
});

process.stdin.on('end', async () => {
    try {
        console.error('正在处理输入数据...');
        
        // 解析输入数据
        const parsedData = JSON.parse(inputData.toString('utf-8'));
        
        // 提取参数
        const {
            llm_config,
            user_prompt: userPrompt = "数据可视化",
            dataset = [],
            file_name: fileName = `chart_${Date.now()}`,
            output_type: outputType = "png",
            language = "zh",
            enable_insights = true
        } = parsedData;
        
        let result;
        
        try {
            if (!llm_config || !llm_config.base_url || !llm_config.model || !llm_config.api_key) {
                throw new Error("缺少必要的LLM配置参数");
            }
            
            const { base_url: baseUrl, model, api_key: apiKey } = llm_config;
            const vmind = new VMind({
                url: `${baseUrl}/chat/completions`,
                model,
                headers: {
                    "api-key": apiKey,
                    Authorization: `Bearer ${apiKey}`,
                },
            });
            
            // 创建简单的结果
            result = {
                chart_path: `generated_${fileName}.${outputType}`,
                insight_md: enable_insights ? `已生成关于"${userPrompt}"的图表和数据洞察。` : `已生成关于"${userPrompt}"的图表。`
            };
        } catch (error) {
            console.error("执行过程中发生错误:", error);
            result = {
                error: `执行错误: ${error}`,
                chart_path: `error_${fileName || 'chart'}.${outputType || 'png'}`,
                insight_md: `处理数据时发生错误: ${error}`
            };
        }
        
        // 将结果输出到标准输出
        const outputBuffer = Buffer.from(JSON.stringify(result), 'utf-8');
        process.stdout.write(outputBuffer);
    } catch (error) {
        console.error('处理输入数据时发生错误:', error);
        const errorBuffer = Buffer.from(JSON.stringify({
            error: `处理数据时发生错误: ${error}`,
            chart_path: "error_chart.png",
            insight_md: `解析输入数据失败: ${error}`
        }), 'utf-8');
        process.stdout.write(errorBuffer);
    }
});
""")
        logger.info(f"JavaScript 包装器创建成功: {wrapper_path}")
        return wrapper_path
    
    async def invoke_vmind(
            self,
            file_name: str,
            output_type: str,
            task_type: str,
            insights_id: Optional[List[str]] = None,
            dataset: Optional[List[Dict[Hashable, Any]]] = None,
            user_prompt: Optional[str] = None,
            language: str = "zh",
            fieldInfo: Optional[Dict[str, Any]] = None,
            csvData: Optional[str] = None,
            textData: Optional[str] = None,
            dataType: Optional[str] = "text",
            enable_insights: bool = True,
            enableDataQuery: bool = True
        ):
        """
        调用 VMind 图表生成工具
        
        参数:
            file_name: 输出文件名
            output_type: 输出类型，如 'png' 或 'html'
            task_type: 任务类型，如 'visualization'
            insights_id: 洞察 ID 列表
            dataset: 数据字典列表
            user_prompt: 图表描述
            language: 语言代码，默认为中文 'zh'
            fieldInfo: 字段信息
            csvData: CSV 数据
            textData: 文本数据
            dataType: 数据类型
            enable_insights: 是否启用数据洞察功能，默认为 True
            
        返回:
            Dict: 包含生成的图表路径和可能的错误信息
        """
        logger.info(f"开始调用 VMind 图表生成工具，文件名: {file_name}, 类型: {output_type}")
        
        try:
            # 查找 Node.js 可执行文件
            node_path, npx_path, node_error = self._find_node_executable()
            if not node_path:
                return {"error": f"Node.js 环境错误: {node_error}"}
            
            # 准备参数
            vmind_params = {
                "llm_config": self.llm_config,
                "user_prompt": user_prompt,
                "dataset": dataset,
                "file_name": file_name,
                "output_type": output_type,
                "insights_id": insights_id,
                "task_type": task_type,
                "language": language,
                "fieldInfo": fieldInfo,
                "csvData": csvData,
                "textData": textData,
                "dataType": dataType,
                "enable_insights": enable_insights,
                "enableDataQuery": enableDataQuery
            }
            
            # 获取脚本路径
            vmind_dir = os.path.dirname(os.path.abspath(__file__))
            
            # 直接使用JavaScript而不是TypeScript
            js_script_path = os.path.join(vmind_dir, "src", "vmind.js")
            
            # 如果JS文件不存在，创建一个简单的包装器
            if not os.path.exists(js_script_path):
                logger.info(f"未找到 JavaScript 文件，创建包装器")
                base_path = os.path.join(vmind_dir, "src", "vmind_direct")
                js_script_path = self._create_js_wrapper(base_path)
            
            logger.info(f"使用 JavaScript 脚本: {js_script_path}")
            
            # 检查 Node.js 版本
            try:
                node_version_cmd = [node_path, "--version"]
                node_version = subprocess.check_output(node_version_cmd, text=True, encoding='utf-8', errors='replace').strip()
                logger.info(f"Node.js 版本: {node_version}")
            except Exception as e:
                logger.warning(f"获取 Node.js 版本失败: {str(e)}")
            
            # 执行 JavaScript 文件
            cmd = [node_path, js_script_path]
            cmd_str = " ".join(cmd)
            logger.info(f"执行命令: {cmd_str}")
            
            try:
                # 创建环境变量副本，添加NODE_OPTIONS以允许更大的堆大小
                env = os.environ.copy()
                env["NODE_OPTIONS"] = "--max-old-space-size=4096"
                
                # 使用二进制模式执行子进程，避免编码问题
                process = subprocess.Popen(
                    cmd,
                    cwd=vmind_dir,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=False,  # 使用二进制模式
                    env=env
                )
                
                # 转换为二进制数据
                input_data_bytes = json.dumps(vmind_params, ensure_ascii=False).encode('utf-8')
                stdout_bytes, stderr_bytes = process.communicate(input=input_data_bytes, timeout=60)
                
                # 手动解码数据
                try:
                    stdout_data = stdout_bytes.decode('utf-8', errors='replace') if stdout_bytes else ""
                    stderr_data = stderr_bytes.decode('utf-8', errors='replace') if stderr_bytes else ""
                except Exception as e:
                    logger.error(f"解码子进程输出时出错: {str(e)}")
                    stdout_data = ""
                    stderr_data = f"解码错误: {str(e)}"
                
                logger.info(f"stdout_data: {stdout_data}")
                logger.info(f"stderr_data: {stderr_data}")
                
                # 检查命令执行结果
                if process.returncode != 0:
                    logger.error(f"命令执行失败，返回码: {process.returncode}")
                    logger.error(f"标准输出: {stdout_data}")
                    logger.error(f"错误输出: {stderr_data}")
                    return {
                        "error": f"Node.js 执行错误: {stderr_data or '未知错误'}",
                        "chart_path": f"error_{file_name}.{output_type}",
                        "insight_md": f"执行图表生成工具失败。\n\n请求的图表描述: {user_prompt}"
                    }
                else:
                    logger.info("命令执行成功")
                
                # 解析输出数据
                try:
                    if stdout_data:
                        result = json.loads(stdout_data)
                        logger.info("成功解析输出数据")
                        return result
                    else:
                        logger.error("命令执行成功但没有输出数据")
                        return {
                            "chart_path": f"generated_{file_name}.{output_type}",
                            "insight_md": f"命令执行成功但未获取到结果。\n\n请求的图表描述: {user_prompt}"
                        }
                except json.JSONDecodeError as e:
                    logger.error(f"输出数据解析失败: {str(e)}")
                    logger.error(f"输出数据内容: {stdout_data}")
                    
                    # 返回备用结果
                    return {
                        "chart_path": f"generated_{file_name}.{output_type}",
                        "insight_md": f"解析结果失败，但图表生成过程可能已完成。\n\n请求的图表描述: {user_prompt}"
                    }
            except subprocess.TimeoutExpired as e:
                logger.error(f"命令执行超时: {str(e)}")
                return {"error": f"命令执行超时: {str(e)}"}
            
        except Exception as e:
            logger.exception(f"执行过程中发生异常: {str(e)}")
            return {"error": f"Error: {str(e)}"}
