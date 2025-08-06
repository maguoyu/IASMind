#!/usr/bin/env python3
"""
智能数据洞察演示
展示如何使用集成了项目LLM配置的数据洞察框架
"""

import pandas as pd
import numpy as np
from src.data_insight import DataInsightFramework, SmartLLMOptimizer

def create_business_scenario_data():
    """创建真实的业务场景数据"""
    np.random.seed(42)
    
    # 电商平台6个月的运营数据
    dates = pd.date_range('2023-07-01', periods=180, freq='D')
    
    # 基础销售趋势（夏季到冬季的自然变化）
    base_sales = 1200 + np.linspace(0, 300, 180)  # 基础增长
    seasonal_factor = 100 * np.sin(2 * np.pi * np.arange(180) / 365 * 2)  # 季节性
    weekly_pattern = 50 * np.sin(2 * np.pi * np.arange(180) / 7)  # 周期性
    noise = np.random.normal(0, 80, 180)
    
    sales = base_sales + seasonal_factor + weekly_pattern + noise
    
    # 添加真实的业务事件
    # 七夕节促销 (8月22日, 第52天)
    sales[52] = 2800
    
    # 双11预热和正式活动 (11月1-11日, 第123-133天)
    for i in range(123, 134):
        sales[i] = sales[i] * 1.5 + np.random.normal(500, 100)
    
    # 系统故障导致的异常低值 (9月15日, 第76天)
    sales[76] = 200
    
    # 供应链问题 (10月8日, 第99天)  
    sales[99] = 300
    
    # 黑五促销 (11月24日, 第146天)
    sales[146] = 3200
    
    # 年末清仓 (12月20日开始, 第172天后)
    for i in range(172, 180):
        sales[i] = sales[i] * 1.3
    
    # 相关业务指标
    # 广告投入 - 与销售额相关但有滞后
    advertising = []
    for i in range(180):
        if i == 0:
            advertising.append(sales[i] * 0.08)
        else:
            # 广告投入基于前一天的销售表现调整
            advertising.append(sales[i-1] * 0.08 + np.random.normal(0, 15))
    
    # 用户访问量 - 与销售高度相关
    user_visits = sales * 2.5 + np.random.normal(0, 200, 180)
    
    # 转化率 - 受多种因素影响
    conversion_rate = np.random.beta(2, 18, 180) * 5  # 基础转化率 0-5%
    # 促销期间转化率提升
    conversion_rate[52] *= 1.5  # 七夕
    conversion_rate[123:134] *= 1.8  # 双11
    conversion_rate[146] *= 2.0  # 黑五
    conversion_rate[172:180] *= 1.4  # 年末清仓
    
    # 客户满意度评分 - 受服务质量影响
    satisfaction = np.random.normal(4.2, 0.3, 180)  # 基础4.2分
    satisfaction[76] = 2.1  # 系统故障导致满意度下降
    satisfaction[99] = 2.8  # 供应链问题
    
    return pd.DataFrame({
        'date': dates,
        'sales': sales,
        'advertising': advertising,
        'user_visits': user_visits,
        'conversion_rate': conversion_rate,
        'satisfaction': satisfaction
    })

def analyze_sales_performance():
    """分析销售表现"""
    print("🛒 电商平台销售表现分析")
    print("=" * 50)
    
    data = create_business_scenario_data()
    
    # 使用智能LLM优化器
    llm_optimizer = SmartLLMOptimizer()
    framework = DataInsightFramework(llm_optimizer=llm_optimizer)
    
    # 分析销售数据
    print("正在分析销售数据...")
    insights = framework.analyze(data, column='sales')
    
    # 分析关键业务关系
    print("正在分析业务指标关系...")
    framework.analyze_correlation_pair(data, 'sales', 'advertising', ['pearson'])
    framework.analyze_correlation_pair(data, 'sales', 'user_visits', ['pearson'])
    framework.analyze_correlation_pair(data, 'advertising', 'conversion_rate', ['spearman'])
    
    # 生成业务报告
    context = """
    这是某电商平台2023年7月至12月的运营数据分析。

    业务背景：
    - 平台主要销售消费电子产品和日用品
    - 重点关注七夕、双11、黑五等促销节点
    - 目标用户群体为25-40岁的都市消费者
    - 公司正处于快速扩张期，重点关注销售增长和用户体验

    关键业务指标：
    - 日销售额：核心业务指标，直接反映平台表现
    - 广告投入：获客成本控制的重要指标
    - 用户访问量：流量健康度的体现
    - 转化率：运营效率的关键指标
    - 客户满意度：用户体验和服务质量的反映

    分析目的：
    为业务团队提供数据驱动的洞察，优化运营策略，提升业务表现。
    """
    
    report = framework.get_summary_report(context)
    print("\n📊 智能业务洞察报告")
    print("=" * 50)
    print(report)
    
    return data, framework

def analyze_user_experience():
    """分析用户体验"""
    print("\n👥 用户体验数据分析")
    print("=" * 50)
    
    data = create_business_scenario_data()
    
    # 专门分析用户体验相关指标
    framework = DataInsightFramework(llm_optimizer=SmartLLMOptimizer())
    
    # 分析满意度数据
    print("正在分析用户满意度...")
    framework.analyze(data, column='satisfaction')
    
    # 分析转化率
    print("正在分析转化率...")
    framework.analyze(data, column='conversion_rate')
    
    # 分析满意度与业务指标的关系
    framework.analyze_correlation_pair(data, 'satisfaction', 'sales')
    framework.analyze_correlation_pair(data, 'satisfaction', 'conversion_rate')
    
    context = """
    用户体验分析专项报告

    分析重点：
    - 用户满意度评分变化趋势
    - 转化率的波动情况
    - 用户体验与业务表现的关联性

    业务目标：
    - 识别影响用户体验的关键因素
    - 发现用户体验改善的机会点
    - 制定提升用户满意度的行动计划
    """
    
    report = framework.get_summary_report(context)
    print(report)

def compare_output_styles():
    """对比不同输出风格"""
    print("\n📋 输出风格对比")
    print("=" * 50)
    
    data = create_business_scenario_data()
    
    # 1. 技术风格输出
    print("1️⃣ 技术分析输出:")
    print("-" * 30)
    
    basic_framework = DataInsightFramework()
    insights = basic_framework.analyze(data, column='sales', algorithms=['zscore', 'mann_kendall', 'lof'])
    
    for insight in insights:
        print(f"算法: {insight.algorithm}")
        print(f"类型: {insight.insight_type}")
        print(f"严重程度: {insight.severity}")
        print(f"置信度: {insight.confidence:.3f}")
        print(f"详情: {insight.details}")
        print()
    
    # 2. 业务友好输出  
    print("2️⃣ 业务友好输出:")
    print("-" * 30)
    
    for insight in insights:
        print(insight.to_friendly_description())
        if insight.recommendations:
            print(f"💡 建议: {'; '.join(insight.recommendations[:2])}")
        print()
    
    # 3. LLM优化输出
    print("3️⃣ LLM优化输出:")
    print("-" * 30)
    
    smart_framework = DataInsightFramework(llm_optimizer=SmartLLMOptimizer())
    smart_framework.results = insights  # 复用之前的分析结果
    
    optimized_report = smart_framework.get_summary_report(
        "电商平台销售数据，需要为非技术背景的业务管理层提供清晰的洞察"
    )
    print(optimized_report)

def main():
    """主函数"""
    print("🚀 智能数据洞察框架演示")
    print("集成项目LLM配置，提供业务友好的数据分析")
    print()
    
    try:
        # 销售表现分析
        data, framework = analyze_sales_performance()
        
        # 用户体验分析
        analyze_user_experience()
        
        # 输出风格对比
        compare_output_styles()
        
        print("\n✅ 演示完成！")
        print("\n💡 框架特点:")
        print("1. 🤖 智能LLM优化 - 自动将技术分析转换为业务洞察")
        print("2. 📊 多维度分析 - 支持异常检测、趋势分析、相关性分析等")
        print("3. 🎯 业务导向 - 提供具体可行的业务建议")
        print("4. 🔧 灵活配置 - 支持不同LLM后端和自定义参数")
        print("5. 📈 可视化友好 - 结构化输出便于进一步处理")
        
        print("\n📋 数据概览:")
        print(f"分析期间: {data['date'].min().strftime('%Y-%m-%d')} 至 {data['date'].max().strftime('%Y-%m-%d')}")
        print(f"平均日销售额: ¥{data['sales'].mean():.0f}")
        print(f"最高日销售额: ¥{data['sales'].max():.0f}")
        print(f"销售额增长趋势: {'上升' if data['sales'].iloc[-30:].mean() > data['sales'].iloc[:30].mean() else '下降'}")
        
    except Exception as e:
        print(f"❌ 演示过程中出现错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 