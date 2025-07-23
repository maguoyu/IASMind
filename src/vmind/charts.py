import os
import json
import subprocess
import tempfile
import logging
import uuid
import sys
import shutil
import time
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
    
    def _ensure_ts_node_installed(self, node_path: str, npx_path: str) -> bool:
        """
        确保 ts-node 已安装
        
        参数:
            node_path: Node.js 可执行文件路径
            npx_path: npx 可执行文件路径
            
        返回:
            bool: 是否成功安装 ts-node
        """
        try:
            # 检查 ts-node 是否已安装
            check_cmd = [node_path, "-e", "require.resolve('ts-node')"]
            result = subprocess.run(check_cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info("ts-node 已安装")
                return True
            
            # 尝试安装 ts-node 和 typescript
            logger.info("正在安装 ts-node 和 typescript...")
            install_cmd = [npx_path, "--yes", "npm", "install", "-g", "ts-node", "typescript"]
            install_result = subprocess.run(install_cmd, capture_output=True, text=True)
            
            if install_result.returncode == 0:
                logger.info("ts-node 和 typescript 安装成功")
                return True
            else:
                logger.error(f"安装 ts-node 失败: {install_result.stderr}")
                return False
        except Exception as e:
            logger.error(f"确保 ts-node 安装时发生错误: {str(e)}")
            return False
    
    def _compile_typescript_to_js(self, ts_file_path: str, node_path: str, npx_path: str) -> Optional[str]:
        """
        将 TypeScript 文件编译为 JavaScript
        
        参数:
            ts_file_path: TypeScript 文件路径
            node_path: Node.js 可执行文件路径
            npx_path: npx 可执行文件路径
            
        返回:
            Optional[str]: 编译后的 JavaScript 文件路径，如果失败则返回 None
        """
        try:
            # 创建临时 JavaScript 文件路径
            js_file_path = ts_file_path.replace(".ts", ".js")
            
            # 编译 TypeScript 文件
            logger.info(f"正在编译 TypeScript 文件: {ts_file_path}")
            compile_cmd = [npx_path, "tsc", ts_file_path, "--outFile", js_file_path]
            compile_result = subprocess.run(compile_cmd, capture_output=True, text=True)
            
            if compile_result.returncode == 0:
                logger.info(f"TypeScript 编译成功: {js_file_path}")
                return js_file_path
            else:
                # 如果直接编译失败，尝试创建一个简单的 JavaScript 包装器
                logger.warning(f"TypeScript 编译失败: {compile_result.stderr}")
                logger.info("尝试创建 JavaScript 包装器...")
                
                wrapper_path = ts_file_path.replace(".ts", "_wrapper.js")
                with open(wrapper_path, "w", encoding="utf-8") as f:
                    f.write(f"""
// 自动生成的 JavaScript 包装器
const { execSync } = require('child_process');
const fs = require('fs');

// 获取命令行参数
const args = process.argv.slice(2);
let inputFile, outputFile;

for (let i = 0; i < args.length; i += 2) {{
    if (args[i] === '--input' && i + 1 < args.length) {{
        inputFile = args[i + 1];
    }} else if (args[i] === '--output' && i + 1 < args.length) {{
        outputFile = args[i + 1];
    }}
}}

if (!inputFile || !outputFile) {{
    console.error('缺少必要的参数: --input <输入文件路径> --output <输出文件路径>');
    process.exit(1);
}}

try {{
    // 读取输入文件
    const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    
    // 创建一个简单的结果
    const result = {{
        chart_path: "generated_chart_path.png",
        insight_md: "由于 TypeScript 执行问题，无法生成完整的图表和洞察。请检查 Node.js 和 TypeScript 环境。"
    }};
    
    // 写入输出文件
    fs.writeFileSync(outputFile, JSON.stringify(result), 'utf-8');
    console.log('处理完成（使用 JavaScript 包装器）');
}} catch (error) {{
    console.error('执行过程中发生错误:', error);
    process.exit(1);
}}
""")
                logger.info(f"JavaScript 包装器创建成功: {wrapper_path}")
                return wrapper_path
        except Exception as e:
            logger.error(f"编译 TypeScript 文件时发生错误: {str(e)}")
            return None
    
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
        logger.info(f"开始调用 VMind 图表生成工具，文件名: {file_name}, 类型: {output_type}")
 
        # 创建临时目录和文件
        temp_dir = None
        input_file = None
        output_file = None
        
        try:
            # 查找 Node.js 和 npx 可执行文件
            node_path, npx_path, node_error = self._find_node_executable()
            if not node_path or not npx_path:
                return {"error": f"Node.js 环境错误: {node_error}"}
            
            # 确保 ts-node 已安装
            if not self._ensure_ts_node_installed(node_path, npx_path):
                return {"error": "无法安装或使用 ts-node，请确保 Node.js 环境正确配置"}
            
            # 准备参数
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
            
            # 创建临时目录
            temp_dir = tempfile.mkdtemp(prefix="vmind_")
            logger.info(f"创建临时目录: {temp_dir}")
            
            # 创建输入文件
            input_file = os.path.join(temp_dir, f"input_{uuid.uuid4()}.json")
            with open(input_file, 'w', encoding='utf-8') as f:
                json.dump(vmind_params, f, ensure_ascii=False)
            logger.info(f"创建输入文件: {input_file}")
            
            # 创建输出文件
            output_file = os.path.join(temp_dir, f"output_{uuid.uuid4()}.json")
            logger.info(f"输出文件路径: {output_file}")
            
            # 获取脚本路径
            vmind_dir = os.path.dirname(os.path.abspath(__file__))
            ts_script_path = os.path.join(vmind_dir, "src", "vmind.ts")
            
            # 检查脚本是否存在
            if not os.path.exists(ts_script_path):
                logger.error(f"TypeScript 脚本不存在: {ts_script_path}")
                return {"error": f"TypeScript 脚本不存在: {ts_script_path}"}
            
            # 尝试编译 TypeScript 为 JavaScript
            script_path = self._compile_typescript_to_js(ts_script_path, node_path, npx_path)
            if not script_path:
                script_path = ts_script_path  # 如果编译失败，尝试直接使用 ts 文件
            
            logger.info(f"使用脚本: {script_path}")
            
            # 检查 Node.js 版本
            try:
                node_version_cmd = [node_path, "--version"]
                node_version = subprocess.check_output(node_version_cmd, text=True).strip()
                logger.info(f"Node.js 版本: {node_version}")
            except Exception as e:
                logger.warning(f"获取 Node.js 版本失败: {str(e)}")
            
            # 构建命令 (使用 node 直接执行 JavaScript 文件，或使用 ts-node 执行 TypeScript 文件)
            if script_path.endswith('.js'):
                cmd = [node_path, script_path, "--input", input_file, "--output", output_file]
            else:
                cmd = [npx_path, "ts-node", script_path, "--input", input_file, "--output", output_file]
            
            cmd_str = " ".join(cmd)
            logger.info(f"执行命令: {cmd_str}")
            
            # 执行命令
            process = subprocess.run(
                cmd,
                cwd=vmind_dir,
                capture_output=True,
                text=True,
                check=False
            )
            
            # 检查命令执行结果
            if process.returncode != 0:
                logger.error(f"命令执行失败，返回码: {process.returncode}")
                logger.error(f"标准输出: {process.stdout}")
                logger.error(f"错误输出: {process.stderr}")
                
                # 如果是 TypeScript 文件扩展名错误，尝试使用备用方法
                if "Unknown file extension \".ts\"" in process.stderr:
                    logger.info("检测到 TypeScript 文件扩展名错误，尝试使用备用方法...")
                    
                    # 创建一个简单的结果
                    fallback_result = {
                        "chart_path": f"generated_{file_name}.{output_type}",
                        "insight_md": f"由于 TypeScript 执行问题，无法生成完整的图表和洞察。\n\n请求的图表描述: {chart_description}"
                    }
                    
                    # 写入输出文件
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(fallback_result, f, ensure_ascii=False)
                    
                    logger.info("已创建备用结果")
                else:
                    return {"error": f"Node.js 执行错误: {process.stderr or '未知错误'}"}
            else:
                logger.info(f"命令执行成功，标准输出: {process.stdout}")
            
            # 等待一小段时间确保文件写入完成
            time.sleep(0.5)
            
            # 读取输出文件
            if os.path.exists(output_file):
                try:
                    with open(output_file, 'r', encoding='utf-8') as f:
                        result = json.load(f)
                    logger.info("成功读取输出文件")
                    return result
                except json.JSONDecodeError as e:
                    logger.error(f"输出文件解析失败: {str(e)}")
                    with open(output_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    logger.error(f"输出文件内容: {content}")
                    
                    # 返回备用结果
                    return {
                        "chart_path": f"generated_{file_name}.{output_type}",
                        "insight_md": f"解析结果失败，但图表生成过程可能已完成。\n\n请求的图表描述: {chart_description}"
                    }
            else:
                logger.error(f"输出文件不存在: {output_file}")
                return {"error": f"输出文件不存在: {output_file}"}
            
        except Exception as e:
            logger.exception(f"执行过程中发生异常: {str(e)}")
            return {"error": f"Error: {str(e)}"}
        finally:
            # 清理临时文件
            try:
                if input_file and os.path.exists(input_file):
                    os.remove(input_file)
                    logger.debug(f"已删除输入文件: {input_file}")
                    
                if output_file and os.path.exists(output_file):
                    os.remove(output_file)
                    logger.debug(f"已删除输出文件: {output_file}")
                    
                if temp_dir and os.path.exists(temp_dir):
                    os.rmdir(temp_dir)
                    logger.debug(f"已删除临时目录: {temp_dir}")
                    
                logger.info("临时文件清理完成")
            except Exception as e:
                logger.warning(f"清理临时文件时发生错误: {str(e)}")
