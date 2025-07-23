#!/usr/bin/env python3
# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
开发服务器脚本，用于启动带有热部署功能的开发环境
提供更高级的监视和重新加载功能
"""

# 在导入任何其他模块前设置 Windows 事件循环策略
import platform
import asyncio
if platform.system() == 'Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import os
import sys
import argparse
import logging
import subprocess
import time
import uvicorn
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("dev-server")

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent

def install_dependencies():
    """安装开发依赖"""
    try:
        # 检查是否已安装 watchdog
        try:
            import watchdog
            logger.info("✅ watchdog 已安装")
        except ImportError:
            logger.info("📦 正在安装 watchdog...")
            subprocess.run([sys.executable, "-m", "pip", "install", "watchdog"], check=True)
            logger.info("✅ watchdog 安装完成")
            
        # 检查 uvicorn[standard]
        try:
            import uvicorn.logging
            logger.info("✅ uvicorn[standard] 已安装")
        except ImportError:
            logger.info("📦 正在安装 uvicorn[standard]...")
            subprocess.run([sys.executable, "-m", "pip", "install", "uvicorn[standard]"], check=True)
            logger.info("✅ uvicorn[standard] 安装完成")
        
        return True
    except Exception as e:
        logger.error(f"❌ 安装依赖失败: {e}")
        return False

def start_dev_server(host, port, log_level, use_watchdog):
    """启动开发服务器"""
    logger.info(f"🚀 启动开发服务器: {host}:{port}")
    
    # 构建 uvicorn 命令参数
    uvicorn_args = {
        "app": "src.server:app",
        "host": host,
        "port": port,
        "reload": True,
        "log_level": log_level,
    }
    
    # 如果使用 watchdog，添加相关参数
    if use_watchdog:
        try:
            import watchdog
            uvicorn_args["reload_dirs"] = [str(PROJECT_ROOT / "src")]
            uvicorn_args["reload_excludes"] = ["*.pyc", "*.pyo", "*.pyd", "*/__pycache__/*"]
            uvicorn_args["reload_delay"] = 0.25
            uvicorn_args["reload"] = True
            uvicorn_args["reload_includes"] = ["*.py", "*.md"]
            logger.info("🔍 使用 watchdog 进行高效热部署")
        except ImportError:
            logger.warning("⚠️ watchdog 未安装，使用默认监视器")
    
    # 启动 uvicorn
    logger.info("⚡ 服务器启动中...")
    uvicorn.run(**uvicorn_args)

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="启动开发服务器，支持热部署")
    parser.add_argument(
        "--host", 
        type=str, 
        default="localhost", 
        help="服务器主机地址 (默认: localhost)"
    )
    parser.add_argument(
        "--port", 
        type=int, 
        default=8000, 
        help="服务器端口 (默认: 8000)"
    )
    parser.add_argument(
        "--log-level",
        type=str,
        default="info",
        choices=["debug", "info", "warning", "error", "critical"],
        help="日志级别 (默认: info)",
    )
    parser.add_argument(
        "--no-watchdog",
        action="store_true",
        help="不使用 watchdog 进行热部署 (默认使用)"
    )
    
    args = parser.parse_args()
    
    # 安装依赖
    if not args.no_watchdog and not install_dependencies():
        logger.warning("⚠️ 依赖安装失败，继续使用默认配置")
    
    # 启动开发服务器
    try:
        start_dev_server(
            host=args.host,
            port=args.port,
            log_level=args.log_level,
            use_watchdog=not args.no_watchdog
        )
    except KeyboardInterrupt:
        logger.info("👋 开发服务器已停止")
    except Exception as e:
        logger.error(f"❌ 开发服务器错误: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 