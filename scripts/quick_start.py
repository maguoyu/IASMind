#!/usr/bin/env python3
# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
IASMind知识库功能快速启动脚本
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def PrintBanner():
    """打印启动横幅"""
    print("=" * 60)
    print("🚀 IASMind 知识库功能快速启动")
    print("=" * 60)
    print()

def CheckEnvironment():
    """检查环境配置"""
    print("📋 检查环境配置...")
    
    # 检查Python版本
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
        print("❌ Python版本过低，需要Python 3.8+")
        return False
    print(f"✅ Python版本: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    # 检查.env文件
    env_file = Path(".env")
    if not env_file.exists():
        print("⚠️  未找到.env文件，将使用默认配置")
        print("   建议复制env.example为.env并配置数据库连接信息")
    else:
        print("✅ 找到.env配置文件")
    
    # 检查uploads目录
    uploads_dir = Path("uploads")
    if not uploads_dir.exists():
        uploads_dir.mkdir(exist_ok=True)
        print("✅ 创建uploads目录")
    else:
        print("✅ uploads目录已存在")
    
    return True

def CheckDependencies():
    """检查依赖包"""
    print("\n📦 检查依赖包...")
    
    required_packages = [
        "pymysql",
        "fastapi",
        "uvicorn"
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - 未安装")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n⚠️  缺少依赖包: {', '.join(missing_packages)}")
        print("请运行以下命令安装:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    return True

def InitializeDatabase():
    """初始化数据库"""
    print("\n🗄️  初始化数据库...")
    
    try:
        # 运行数据库初始化脚本
        result = subprocess.run([
            sys.executable, "scripts/init_database.py"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ 数据库初始化成功")
            return True
        else:
            print("❌ 数据库初始化失败")
            print("错误信息:", result.stderr)
            return False
            
    except FileNotFoundError:
        print("❌ 未找到数据库初始化脚本")
        return False
    except Exception as e:
        print(f"❌ 数据库初始化异常: {e}")
        return False

def StartBackend():
    """启动后端服务"""
    print("\n🔧 启动后端服务...")
    
    try:
        # 检查main.py是否存在
        if not Path("main.py").exists():
            print("❌ 未找到main.py文件")
            return False
        
        print("✅ 后端服务启动中...")
        print("   访问地址: http://localhost:8000")
        print("   API文档: http://localhost:8000/docs")
        print("\n   按 Ctrl+C 停止服务")
        
        # 启动后端服务
        subprocess.run([sys.executable, "main.py"])
        
    except KeyboardInterrupt:
        print("\n🛑 后端服务已停止")
        return True
    except Exception as e:
        print(f"❌ 后端服务启动失败: {e}")
        return False

def StartFrontend():
    """启动前端服务"""
    print("\n🌐 启动前端服务...")
    
    web_dir = Path("web")
    if not web_dir.exists():
        print("❌ 未找到web目录")
        return False
    
    try:
        # 检查package.json
        package_json = web_dir / "package.json"
        if not package_json.exists():
            print("❌ 未找到package.json文件")
            return False
        
        print("✅ 前端服务启动中...")
        print("   访问地址: http://localhost:3000")
        print("\n   按 Ctrl+C 停止服务")
        
        # 切换到web目录并启动服务
        os.chdir(web_dir)
        subprocess.run(["pnpm", "dev"])
        
    except KeyboardInterrupt:
        print("\n🛑 前端服务已停止")
        return True
    except FileNotFoundError:
        print("❌ 未找到pnpm，请先安装pnpm")
        return False
    except Exception as e:
        print(f"❌ 前端服务启动失败: {e}")
        return False

def ShowUsage():
    """显示使用说明"""
    print("\n📖 使用说明:")
    print("1. 确保MySQL服务正在运行")
    print("2. 配置.env文件中的数据库连接信息")
    print("3. 运行以下命令之一:")
    print("   python scripts/quick_start.py backend  # 启动后端")
    print("   python scripts/quick_start.py frontend  # 启动前端")
    print("   python scripts/quick_start.py full      # 启动完整服务")
    print("\n📚 更多信息请查看: docs/knowledge_base_integration.md")

def main():
    """主函数"""
    PrintBanner()
    
    # 检查命令行参数
    if len(sys.argv) > 1:
        mode = sys.argv[1].lower()
    else:
        mode = "check"
    
    # 环境检查
    if not CheckEnvironment():
        ShowUsage()
        return
    
    if not CheckDependencies():
        ShowUsage()
        return
    
    # 根据模式执行不同操作
    if mode == "check":
        print("\n✅ 环境检查完成")
        ShowUsage()
        
    elif mode == "init":
        if InitializeDatabase():
            print("\n✅ 初始化完成")
        else:
            print("\n❌ 初始化失败")
            
    elif mode == "backend":
        if InitializeDatabase():
            StartBackend()
        else:
            print("\n❌ 无法启动后端服务")
            
    elif mode == "frontend":
        StartFrontend()
        
    elif mode == "full":
        print("\n🚀 启动完整服务...")
        if InitializeDatabase():
            print("\n⚠️  注意: 完整模式需要手动启动前端服务")
            print("   在另一个终端中运行: cd web && pnpm dev")
            StartBackend()
        else:
            print("\n❌ 无法启动完整服务")
            
    else:
        print(f"❌ 未知模式: {mode}")
        ShowUsage()

if __name__ == "__main__":
    main() 