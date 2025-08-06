#!/usr/bin/env python3
"""
大模型优化数据洞察报告示例
展示如何使用OpenAI或本地大模型来优化报告输出
"""

import pandas as pd
import numpy as np
from src.data_insight import (
    DataInsightFramework, 
    LLMOptimizer, 
    SmartLLMOptimizer
)

def create_sample_business_data():
    """创建示例业务数据"""
    np.random.seed(42)
    
    # 模拟电商数据
    dates = pd.date_range('2023-01-01', periods=180, freq='D')
    
    # 基础销售趋势 + 季节性 + 噪声
    base_trend = np.linspace(1000, 1500, 180)  # 上升趋势
    seasonal = 200 * np.sin(2 * np.pi * np.arange(180) / 30)  # 月度季节性
    noise = np.random.normal(0, 50, 180)
    
    sales = base_trend + seasonal + noise
    
    # 添加一些业务异常事件
    sales[30] = 2500   # 春节促销
    sales[90] = 2800   # 618大促
    sales[120] = 3200  # 周年庆
    sales[45] = 300    # 系统故障导致的异常低值
    sales[75] = 250    # 供应链问题
    
    # 相关指标
    advertising = sales * 0.08 + np.random.normal(0, 20, 180)
    user_visits = sales * 1.2 + np.random.normal(0, 100, 180)
    conversion_rate = np.random.beta(2, 8, 180) * 10  # 转化率 0-10%
    
    return pd.DataFrame({
        'date': dates,
        'sales': sales,
        'advertising': advertising,
        'user_visits': user_visits,
        'conversion_rate': conversion_rate
    })

def demo_basic_framework():
    """演示基础框架输出"""
    print("=" * 60)
    print("📊 基础数据洞察框架输出")
    print("=" * 60)
    
    data = create_sample_business_data()
    framework = DataInsightFramework()
    
    # 分析销售数据
    insights = framework.analyze(data, column='sales')
    
    # 分析相关性
    framework.analyze_correlation_pair(data, 'sales', 'advertising')
    framework.analyze_correlation_pair(data, 'sales', 'user_visits')
    
    # 生成基础报告
    report = framework.get_summary_report("电商平台半年度销售数据分析")
    print(report)
    
    return framework

def demo_openai_optimization(api_key: str):
    """演示OpenAI优化输出"""
    print("\n" + "=" * 60)
    print("🤖 OpenAI优化报告输出")
    print("=" * 60)
    
    data = create_sample_business_data()
    
    # 使用OpenAI优化器
    openai_optimizer = OpenAIOptimizer(api_key=api_key, model="gpt-3.5-turbo")
    framework = DataInsightFramework(llm_optimizer=openai_optimizer)
    
    # 分析数据
    insights = framework.analyze(data, column='sales')
    framework.analyze_correlation_pair(data, 'sales', 'advertising')
    framework.analyze_correlation_pair(data, 'sales', 'user_visits')
    
    # 生成优化报告
    context = """
    这是一个电商平台的销售数据分析。我们关注的关键指标包括：
    - 日销售额：直接反映业务表现
    - 广告投入：营销成本
    - 用户访问量：流量指标
    - 转化率：效率指标
    
    业务背景：
    - 公司处于快速增长期
    - 春节、618、周年庆是重要促销节点
    - 偶尔会遇到技术故障或供应链问题
    
    目标受众：非技术背景的业务管理层
    """
    
    optimized_report = framework.get_summary_report(context)
    print(optimized_report)

def demo_local_llm_optimization():
    """演示本地大模型优化输出（需要本地运行Ollama等）"""
    print("\n" + "=" * 60)
    print("🏠 本地大模型优化报告输出")
    print("=" * 60)
    
    data = create_sample_business_data()
    
    # 使用本地大模型优化器
    local_optimizer = LocalLLMOptimizer(
        base_url="http://localhost:11434",  # Ollama默认地址
        model="qwen2.5"  # 或者其他支持的模型
    )
    framework = DataInsightFramework(llm_optimizer=local_optimizer)
    
    # 分析数据
    insights = framework.analyze(data, column='sales')
    framework.analyze_correlation_pair(data, 'sales', 'advertising')
    
    # 生成优化报告
    context = "电商平台销售数据分析，需要为业务团队提供通俗易懂的洞察"
    optimized_report = framework.get_summary_report(context)
    print(optimized_report)

def demo_comparison():
    """对比不同输出方式"""
    print("\n" + "=" * 60)
    print("📊 输出方式对比")
    print("=" * 60)
    
    data = create_sample_business_data()
    
    # 1. 原始技术输出
    print("1️⃣ 原始技术输出（程序员视角）:")
    print("-" * 40)
    framework = DataInsightFramework()
    insights = framework.analyze(data, column='sales', algorithms=['zscore', 'mann_kendall'])
    
    for insight in insights:
        print(f"Algorithm: {insight.algorithm}")
        print(f"Details: {insight.details}")
        print(f"Confidence: {insight.confidence}")
        print()
    
    # 2. 优化后的友好输出
    print("2️⃣ 优化后的友好输出（业务人员视角）:")
    print("-" * 40)
    
    for insight in insights:
        print(insight.to_friendly_description())
        if insight.recommendations:
            print(f"💡 建议: {'; '.join(insight.recommendations[:2])}")
        print()

def main():
    """主函数"""
    print("🚀 数据洞察框架 - 大模型优化演示")
    print()
    
    # 基础框架演示
    framework = demo_basic_framework()
    
    # 输出对比演示
    demo_comparison()
    
    # OpenAI优化演示（需要API密钥）
    openai_api_key = input("\n请输入OpenAI API密钥（可选，按回车跳过）: ").strip()
    if openai_api_key:
        try:
            demo_openai_optimization(openai_api_key)
        except Exception as e:
            print(f"OpenAI优化失败: {e}")
    
    # 本地大模型优化演示（需要本地服务）
    use_local = input("\n是否尝试本地大模型优化？(y/N): ").strip().lower()
    if use_local == 'y':
        try:
            demo_local_llm_optimization()
        except Exception as e:
            print(f"本地大模型优化失败: {e}")
            print("请确保已启动Ollama服务并安装了qwen2.5模型")
    
    print("\n✅ 演示完成！")
    print("\n💡 使用建议:")
    print("1. 对于技术团队：使用基础框架输出，获得详细的技术信息")
    print("2. 对于业务团队：使用大模型优化输出，获得通俗易懂的业务洞察")
    print("3. 对于报告生成：结合上下文信息，让大模型生成更贴合业务的分析报告")

if __name__ == "__main__":
    main() 