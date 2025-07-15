#!/usr/bin/env python3
# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
快速启动脚本
启动知识库管理系统的后端和前端服务
"""

import os
import sys
import subprocess
import time
import signal
import threading
from pathlib import Path

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent


def CheckEnvironment():
    """检查环境"""
    print("🔍 检查环境...")
    
    # 检查Python版本
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
        print("❌ Python版本过低，需要Python 3.8+")
        return False
    
    print(f"✅ Python版本: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    # 检查Node.js
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js版本: {result.stdout.strip()}")
        else:
            print("❌ Node.js未安装")
            return False
    except FileNotFoundError:
        print("❌ Node.js未安装")
        return False
    
    # 检查pnpm
    try:
        result = subprocess.run(["pnpm", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ pnpm版本: {result.stdout.strip()}")
        else:
            print("❌ pnpm未安装")
            return False
    except FileNotFoundError:
        print("❌ pnpm未安装")
        return False
    
    return True


def CheckDependencies():
    """检查依赖"""
    print("\n📦 检查依赖...")
    
    # 检查Python依赖
    try:
        import fastapi
        import uvicorn
        import pymysql
        print("✅ Python依赖已安装")
    except ImportError as e:
        print(f"❌ Python依赖缺失: {e}")
        print("请运行: pip install -r requirements.txt")
        return False
    
    # 检查前端依赖
    web_dir = PROJECT_ROOT / "web"
    node_modules = web_dir / "node_modules"
    
    if not node_modules.exists():
        print("⚠️  前端依赖未安装")
        response = input("是否安装前端依赖？(y/N): ")
        if response.lower() == 'y':
            print("安装前端依赖...")
            subprocess.run(["pnpm", "install"], cwd=web_dir, check=True)
            print("✅ 前端依赖安装完成")
        else:
            print("❌ 请先安装前端依赖")
            return False
    else:
        print("✅ 前端依赖已安装")
    
    return True


def InitializeDatabase():
    """初始化数据库"""
    print("\n🗄️  初始化数据库...")
    
    try:
        # 运行数据库初始化脚本
        subprocess.run([sys.executable, "scripts/init_database.py"], 
                      cwd=PROJECT_ROOT, check=True)
        print("✅ 数据库初始化完成")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 数据库初始化失败: {e}")
        return False


def StartBackend():
    """启动后端服务"""
    print("\n🚀 启动后端服务...")
    
    try:
        # 启动FastAPI服务
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", 
            "src.server.app:app", 
            "--host", "0.0.0.0", 
            "--port", "8000",
            "--reload"
        ], cwd=PROJECT_ROOT)
        
        print("✅ 后端服务启动成功")
        print("📍 后端地址: http://localhost:8000")
        print("📚 API文档: http://localhost:8000/docs")
        
        return process
    except Exception as e:
        print(f"❌ 后端服务启动失败: {e}")
        return None


def StartFrontend():
    """启动前端服务"""
    print("\n🌐 启动前端服务...")
    
    try:
        web_dir = PROJECT_ROOT / "web"
        process = subprocess.Popen([
            "pnpm", "dev"
        ], cwd=web_dir)
        
        print("✅ 前端服务启动成功")
        print("📍 前端地址: http://localhost:3000")
        
        return process
    except Exception as e:
        print(f"❌ 前端服务启动失败: {e}")
        return None


def WaitForServices():
    """等待服务启动"""
    print("\n⏳ 等待服务启动...")
    
    import requests
    import time
    
    # 等待后端服务
    backend_ready = False
    for i in range(30):  # 最多等待30秒
        try:
            response = requests.get("http://localhost:8000/api/knowledge_base/health", timeout=2)
            if response.status_code == 200:
                backend_ready = True
                print("✅ 后端服务就绪")
                break
        except:
            pass
        time.sleep(1)
    
    if not backend_ready:
        print("⚠️  后端服务启动超时，请检查日志")
    
    # 等待前端服务
    frontend_ready = False
    for i in range(30):  # 最多等待30秒
        try:
            response = requests.get("http://localhost:3000", timeout=2)
            if response.status_code == 200:
                frontend_ready = True
                print("✅ 前端服务就绪")
                break
        except:
            pass
        time.sleep(1)
    
    if not frontend_ready:
        print("⚠️  前端服务启动超时，请检查日志")


def ShowUsage():
    """显示使用说明"""
    print("\n" + "="*60)
    print("🎉 知识库管理系统启动完成！")
    print("="*60)
    print("\n📋 访问地址:")
    print("  前端界面: http://localhost:3000")
    print("  后端API:  http://localhost:8000")
    print("  API文档:  http://localhost:8000/docs")
    print("  健康检查: http://localhost:8000/api/knowledge_base/health")
    
    print("\n🔧 功能说明:")
    print("  1. 访问前端界面进行知识库管理")
    print("  2. 使用API调试面板测试接口")
    print("  3. 查看API文档了解接口详情")
    
    print("\n⚠️  注意事项:")
    print("  - 按 Ctrl+C 停止所有服务")
    print("  - 确保MySQL服务正在运行")
    print("  - 检查.env文件中的数据库配置")
    
    print("\n📚 测试数据:")
    print("  - 已创建6个测试知识库")
    print("  - 已上传24个测试文件")
    print("  - 包含不同状态的文件用于测试")


def SignalHandler(signum, frame):
    """信号处理函数"""
    print("\n\n🛑 正在停止服务...")
    sys.exit(0)


def main():
    """主函数"""
    print("🚀 知识库管理系统快速启动")
    print("="*40)
    
    # 注册信号处理
    signal.signal(signal.SIGINT, SignalHandler)
    signal.signal(signal.SIGTERM, SignalHandler)
    
    # 检查环境
    if not CheckEnvironment():
        return
    
    # 检查依赖
    if not CheckDependencies():
        return
    
    # 初始化数据库
    if not InitializeDatabase():
        return
    
    # 启动服务
    backend_process = StartBackend()
    if not backend_process:
        return
    
    frontend_process = StartFrontend()
    if not frontend_process:
        backend_process.terminate()
        return
    
    # 等待服务启动
    WaitForServices()
    
    # 显示使用说明
    ShowUsage()
    
    try:
        # 保持程序运行
        while True:
            time.sleep(1)
            
            # 检查进程是否还在运行
            if backend_process.poll() is not None:
                print("❌ 后端服务已停止")
                break
            
            if frontend_process.poll() is not None:
                print("❌ 前端服务已停止")
                break
                
    except KeyboardInterrupt:
        print("\n\n🛑 收到停止信号")
    finally:
        # 停止服务
        print("正在停止服务...")
        if backend_process:
            backend_process.terminate()
            backend_process.wait()
        if frontend_process:
            frontend_process.terminate()
            frontend_process.wait()
        print("✅ 所有服务已停止")


if __name__ == "__main__":
    main() 