#!/usr/bin/env python3
"""
数据洞察框架 - 快速开始示例
只需几行代码即可获得数据洞察
"""

import pandas as pd
import numpy as np
from src.data_insight import DataInsightFramework

def quick_start_example():
    """快速开始示例"""
    
    # 1. 准备数据（可以是pandas DataFrame、Series或numpy array）
    # 示例：创建一些包含异常点和趋势的销售数据
    np.random.seed(42)
    dates = pd.date_range('2023-01-01', periods=100, freq='D')
    sales = 1000 + np.linspace(0, 200, 100) + np.random.normal(0, 30, 100)
    sales[20] = 2000  # 异常高值
    sales[50] = 200   # 异常低值
    
    data = pd.DataFrame({
        'date': dates,
        'sales': sales,
        'advertising': sales * 0.1 + np.random.normal(0, 10, 100)
    })
    
    print("数据预览:")
    print(data.head())
    
    # 2. 创建洞察框架
    framework = DataInsightFramework()
    
    # 3. 一键分析（自动运行所有算法）
    print("\n正在分析数据...")
    insights = framework.analyze(data, column='sales')
    
    # 4. 查看结果
    print(f"\n发现 {len(insights)} 个洞察:")
    for i, insight in enumerate(insights, 1):
        print(f"{i}. [{insight.algorithm}] {insight.description}")
        print(f"   严重程度: {insight.severity}, 置信度: {insight.confidence:.2f}")
        
        if insight.affected_data:
            print(f"   异常数据点索引: {insight.affected_data[:5]}...")  # 只显示前5个
        print()
    
    # 5. 获取摘要报告
    summary = framework.get_summary_report()
    print("分析摘要:")
    print(f"  总洞察数: {summary['total_insights']}")
    print(f"  洞察类型: {summary['by_type']}")
    print(f"  严重程度: {summary['by_severity']}")
    
    # 6. 导出结果（可选）
    # json_results = framework.export_results('json')
    # print("结果已导出为JSON格式")
    
    return insights

def analyze_your_data(data, column_name=None):
    """
    分析您自己的数据
    
    Args:
        data: 您的数据 (pandas DataFrame, Series, 或 numpy array)
        column_name: 如果是DataFrame，指定要分析的列名
    """
    
    framework = DataInsightFramework()
    insights = framework.analyze(data, column=column_name)
    
    print(f"数据洞察结果 ({len(insights)} 个):")
    for insight in insights:
        print(f"• [{insight.algorithm}] {insight.description}")
        if insight.severity in ['high', 'critical']:
            print(f"  ⚠️  需要关注: {insight.recommendations[0] if insight.recommendations else '建议进一步调查'}")
    
    return insights

if __name__ == "__main__":
    print("=" * 50)
    print("数据洞察框架 - 快速开始")
    print("=" * 50)
    
    # 运行快速示例
    insights = quick_start_example()
    
    print("\n" + "=" * 50)
    print("如何分析您自己的数据:")
    print("=" * 50)
    print("""
# 方法1: 分析pandas DataFrame的某一列
import pandas as pd
from src.data_insight import DataInsightFramework

df = pd.read_csv('your_data.csv')
framework = DataInsightFramework()
insights = framework.analyze(df, column='your_column_name')

# 方法2: 分析numpy数组
import numpy as np
data = np.random.randn(1000)  # 您的数据
insights = framework.analyze(data)

# 方法3: 自定义配置
config = {
    'zscore_threshold': 2.0,     # Z-Score阈值
    'correlation_threshold': 0.7  # 相关性阈值
}
framework = DataInsightFramework(config=config)
insights = framework.analyze(your_data)
    """)
    
    print("\n支持的洞察类型:")
    print("• 异常检测: Z-Score, IQR, LOF, DBSCAN")
    print("• 趋势分析: Mann-Kendall趋势检测")
    print("• 相关性分析: Pearson, Spearman相关系数")
    print("• 周期性检测: 基于变异系数的周期性分析")
    print("• 基础统计: 最大/最小值、均值、方差异常") 