#!/usr/bin/env python3
"""
数据洞察框架 - 项目快速开始脚本
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.data_insight.examples.quick_start import quick_start_example, analyze_your_data

if __name__ == "__main__":
    print("🚀 数据洞察框架 - 快速开始")
    print("=" * 50)
    
    # 运行快速开始示例
    quick_start_example()
    
    print("\n" + "=" * 50)
    print("📖 更多示例请查看: src/data_insight/examples/")
    print("   - smart_insight_demo.py: 智能洞察演示")
    print("   - llm_optimized_example.py: LLM优化示例")
    print("   - usage_example.py: 详细使用示例")
    print("   - integration_example.py: 集成示例") 