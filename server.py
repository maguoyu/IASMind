# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
Server script for running the DeerFlow API.
"""

# 在导入任何其他模块前设置 Windows 事件循环策略
import platform
import asyncio
if platform.system() == 'Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import argparse
import logging
import signal
import sys
import uvicorn
import os

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


def handle_shutdown(signum, frame):
    """Handle graceful shutdown on SIGTERM/SIGINT"""
    logger.info("Received shutdown signal. Starting graceful shutdown...")
    sys.exit(0)


# Register signal handlers
signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)

if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Run the DeerFlow API server")
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload (default: True except on Windows)",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="localhost",
        help="Host to bind the server to (default: localhost)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind the server to (default: 8000)",
    )
    parser.add_argument(
        "--log-level",
        type=str,
        default="debug",
        choices=["debug", "info", "warning", "error", "critical"],
        help="Log level (default: info)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=None,
        help="Number of worker processes (default: None, uses single worker)",
    )

    args = parser.parse_args()

    # Determine reload setting
    reload = True
    if args.reload:
        reload = True
    if os.environ.get('DOCKER_CONTAINER', '').lower() == 'true':
        reload = False
        logger.info("检测到 Docker 环境，已禁用自动重载功能")
    try:
        logger.info(f"Starting DeerFlow API server on {args.host}:{args.port}")
        
        # 配置 uvicorn 参数
        uvicorn_config = {
            "app": "src.server:app",
            "host": args.host,
            "port": args.port,
            "reload": reload,
            "log_level": args.log_level,
        }
        
        # 如果指定了 workers，添加到配置中（注意：workers 和 reload 不能同时使用）
        if args.workers and args.workers > 1:
            if reload:
                logger.warning("Workers > 1 时无法使用 reload 模式，已禁用 reload")
                uvicorn_config["reload"] = False
            uvicorn_config["workers"] = args.workers
            logger.info(f"使用 {args.workers} 个 worker 进程")
        
        uvicorn.run(**uvicorn_config)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        sys.exit(1)
