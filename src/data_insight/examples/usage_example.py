#!/usr/bin/env python3
"""
数据洞察框架使用示例
展示如何在实际业务场景中使用DataInsightFramework
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# 导入我们的数据洞察框架
from src.data_insight import DataInsightFramework, InsightResult

def create_business_data():
    """创建模拟的业务数据"""
    np.random.seed(42)
    
    # 创建时间序列
    dates = pd.date_range('2023-01-01', periods=365, freq='D')
    
    # 模拟电商业务数据
    # 1. 销售额 - 有趋势、季节性和异常点
    base_sales = 1000 + np.linspace(0, 500, 365)  # 基础趋势
    seasonal = 200 * np.sin(2 * np.pi * np.arange(365) / 365 * 4)  # 季节性
    noise = np.random.normal(0, 50, 365)  # 噪声
    sales = base_sales + seasonal + noise
    
    # 添加一些异常点（促销活动、系统故障等）
    sales[50] = 2500  # 春节促销
    sales[180] = 2800  # 618促销
    sales[310] = 3000  # 双11
    sales[200] = 200   # 系统故障，销售额异常低
    
    # 2. 广告投入 - 与销售额相关
    advertising = sales * 0.1 + np.random.normal(0, 20, 365)
    
    # 3. 用户活跃度 - 与销售额强相关
    user_activity = sales * 0.8 + np.random.normal(0, 30, 365)
    
    # 4. 客服咨询量 - 与销售额弱相关
    customer_service = sales * 0.3 + np.random.normal(100, 50, 365)
    
    # 5. 网站响应时间 - 独立变量
    response_time = np.random.lognormal(1, 0.5, 365)
    
    # 创建DataFrame
    business_data = pd.DataFrame({
        'date': dates,
        'sales': sales,
        'advertising': advertising,
        'user_activity': user_activity,
        'customer_service': customer_service,
        'response_time': response_time
    })
    
    return business_data

def analyze_single_metric(framework, data, metric_name):
    """分析单个指标"""
    print(f"\n{'='*60}")
    print(f"分析指标: {metric_name}")
    print('='*60)
    
    # 分析指定指标
    results = framework.analyze(data, column=metric_name)
    
    if not results:
        print("未发现显著洞察")
        return
    
    # 按严重程度排序
    results.sort(key=lambda x: {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}[x.severity], reverse=True)
    
    for i, result in enumerate(results, 1):
        print(f"\n{i}. 【{result.algorithm.upper()}】 {result.description}")
        print(f"   严重程度: {result.severity} | 置信度: {result.confidence:.2f}")
        
        if result.affected_data:
            print(f"   影响的数据点: {len(result.affected_data)} 个")
        
        if result.recommendations:
            print(f"   建议: {result.recommendations[0]}")
        
        # 显示关键详细信息
        if result.algorithm == 'zscore' and result.details:
            print(f"   详情: 检测阈值={result.details['threshold']}, 最大Z值={result.details.get('max_zscore', 'N/A'):.2f}")
        elif result.algorithm == 'mann_kendall' and result.details:
            print(f"   详情: 趋势={result.details['trend']}, p值={result.details['p_value']:.4f}")
        elif result.algorithm == 'correlation' and result.details:
            correlations = result.details['strong_correlations']
            if correlations:
                print(f"   详情: 发现{len(correlations)}对强相关变量")

def analyze_multi_metrics(framework, data):
    """分析多个指标的关联性"""
    print(f"\n{'='*60}")
    print("多指标关联性分析")
    print('='*60)
    
    # 只分析相关性
    results = framework.analyze(data, algorithms=['correlation'])
    
    if not results:
        print("未发现显著的变量关联")
        return
    
    for result in results:
        if result.insight_type == 'relationship':
            print(f"\n发现 {len(result.details['strong_correlations'])} 对强相关变量:")
            
            for corr in result.details['strong_correlations']:
                print(f"  • {corr['col1']} ↔ {corr['col2']}")
                print(f"    Pearson相关系数: {corr['pearson']:.3f}")
                print(f"    Spearman相关系数: {corr['spearman']:.3f}")

def generate_insight_report(framework, data, output_file="insight_report.json"):
    """生成完整的洞察报告"""
    print(f"\n{'='*60}")
    print("生成完整洞察报告")
    print('='*60)
    
    all_insights = []
    metrics = ['sales', 'advertising', 'user_activity', 'customer_service', 'response_time']
    
    # 分析每个指标
    for metric in metrics:
        print(f"正在分析 {metric}...")
        results = framework.analyze(data, column=metric)
        all_insights.extend(results)
    
    # 分析多变量关系
    print("正在分析变量关系...")
    correlation_results = framework.analyze(data, algorithms=['correlation'])
    all_insights.extend(correlation_results)
    
    # 更新框架结果
    framework.results = all_insights
    
    # 生成摘要
    summary = framework.get_summary()
    
    print(f"\n报告摘要:")
    print(f"  总洞察数: {summary['total_insights']}")
    print(f"  洞察类型分布: {summary['by_type']}")
    print(f"  严重程度分布: {summary['by_severity']}")
    print(f"  使用算法: {', '.join(summary['algorithms_used'])}")
    
    # 关键发现
    if summary['key_findings']:
        print(f"\n关键发现 ({len(summary['key_findings'])} 个):")
        for i, finding in enumerate(summary['key_findings'], 1):
            print(f"  {i}. [{finding['algorithm']}] {finding['description']}")
            print(f"     严重程度: {finding['severity']}, 置信度: {finding['confidence']:.2f}")
    
    # 导出结果
    json_report = framework.export_results('json')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(json_report)
    
    print(f"\n完整报告已导出到: {output_file}")
    return summary

def visualize_insights(data, insights):
    """可视化洞察结果"""
    plt.rcParams['font.sans-serif'] = ['SimHei']
    plt.rcParams['axes.unicode_minus'] = False
    
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle('业务数据洞察可视化', fontsize=16)
    
    # 1. 销售额时序图 + 异常点标注
    ax1 = axes[0, 0]
    ax1.plot(data['date'], data['sales'], label='销售额', alpha=0.7)
    
    # 标注异常点
    sales_insights = [r for r in insights if 'sales' in str(r.details) and r.insight_type == 'anomaly']
    if sales_insights:
        for insight in sales_insights:
            if insight.affected_data:
                anomaly_dates = data.iloc[insight.affected_data]['date']
                anomaly_values = data.iloc[insight.affected_data]['sales']
                ax1.scatter(anomaly_dates, anomaly_values, color='red', s=50, zorder=5, label='异常点')
    
    ax1.set_title('销售额趋势及异常点')
    ax1.set_xlabel('日期')
    ax1.set_ylabel('销售额')
    ax1.legend()
    ax1.tick_params(axis='x', rotation=45)
    
    # 2. 相关性热力图
    ax2 = axes[0, 1]
    numeric_cols = data.select_dtypes(include=[np.number]).columns
    corr_matrix = data[numeric_cols].corr()
    
    im = ax2.imshow(corr_matrix, cmap='coolwarm', vmin=-1, vmax=1)
    ax2.set_xticks(range(len(numeric_cols)))
    ax2.set_yticks(range(len(numeric_cols)))
    ax2.set_xticklabels(numeric_cols, rotation=45)
    ax2.set_yticklabels(numeric_cols)
    ax2.set_title('变量相关性矩阵')
    
    # 添加数值标注
    for i in range(len(numeric_cols)):
        for j in range(len(numeric_cols)):
            ax2.text(j, i, f'{corr_matrix.iloc[i, j]:.2f}', 
                    ha='center', va='center', color='black' if abs(corr_matrix.iloc[i, j]) < 0.5 else 'white')
    
    # 3. 洞察类型分布
    ax3 = axes[1, 0]
    insight_types = {}
    for insight in insights:
        if insight.insight_type not in insight_types:
            insight_types[insight.insight_type] = 0
        insight_types[insight.insight_type] += 1
    
    if insight_types:
        ax3.pie(insight_types.values(), labels=insight_types.keys(), autopct='%1.1f%%')
        ax3.set_title('洞察类型分布')
    
    # 4. 严重程度分布
    ax4 = axes[1, 1]
    severities = {}
    for insight in insights:
        if insight.severity not in severities:
            severities[insight.severity] = 0
        severities[insight.severity] += 1
    
    if severities:
        colors = {'low': 'green', 'medium': 'orange', 'high': 'red', 'critical': 'darkred'}
        bar_colors = [colors.get(sev, 'gray') for sev in severities.keys()]
        ax4.bar(severities.keys(), severities.values(), color=bar_colors)
        ax4.set_title('洞察严重程度分布')
        ax4.set_ylabel('数量')
    
    plt.tight_layout()
    plt.savefig('business_insights_visualization.png', dpi=300, bbox_inches='tight')
    plt.show()

def main():
    """主函数 - 完整的使用流程演示"""
    print("数据洞察框架使用示例")
    print("="*60)
    
    # 1. 创建业务数据
    print("1. 创建模拟业务数据...")
    business_data = create_business_data()
    print(f"   数据维度: {business_data.shape}")
    print(f"   时间范围: {business_data['date'].min()} 到 {business_data['date'].max()}")
    print(f"   包含指标: {list(business_data.columns[1:])}")
    
    # 2. 初始化洞察框架
    print("\n2. 初始化数据洞察框架...")
    
    # 自定义配置
    custom_config = {
        'zscore_threshold': 2.0,  # 降低Z-Score阈值，更敏感
        'correlation_threshold': 0.6,  # 降低相关性阈值
        'trend_alpha': 0.05  # 趋势检测显著性水平
    }
    
    framework = DataInsightFramework(config=custom_config)
    print("   框架初始化完成")
    
    # 3. 分析关键业务指标
    analyze_single_metric(framework, business_data, 'sales')
    analyze_single_metric(framework, business_data, 'user_activity')
    analyze_single_metric(framework, business_data, 'response_time')
    
    # 4. 分析变量关联性
    analyze_multi_metrics(framework, business_data)
    
    # 5. 生成完整报告
    summary = generate_insight_report(framework, business_data)
    
    # 6. 可视化结果
    print("\n6. 生成可视化图表...")
    visualize_insights(business_data, framework.results)
    print("   可视化图表已保存为 'business_insights_visualization.png'")
    
    # 7. 业务建议
    print(f"\n{'='*60}")
    print("业务建议")
    print('='*60)
    
    high_severity_insights = [r for r in framework.results if r.severity in ['high', 'critical']]
    
    if high_severity_insights:
        print("基于高严重程度洞察的建议:")
        for i, insight in enumerate(high_severity_insights, 1):
            print(f"\n{i}. 【{insight.insight_type.upper()}】")
            print(f"   问题: {insight.description}")
            if insight.recommendations:
                print(f"   建议: {insight.recommendations[0]}")
            
            # 针对不同类型给出具体建议
            if insight.insight_type == 'anomaly' and 'sales' in insight.description:
                print("   业务建议: 调查异常销售点的原因，可能是促销活动或系统问题")
            elif insight.insight_type == 'trend':
                print("   业务建议: 关注趋势变化，制定相应的业务策略")
            elif insight.insight_type == 'relationship':
                print("   业务建议: 利用变量关系优化业务决策和资源配置")
    else:
        print("数据质量良好，未发现需要紧急处理的问题")
    
    print(f"\n分析完成！共发现 {len(framework.results)} 个洞察，其中 {len(high_severity_insights)} 个需要重点关注。")

if __name__ == "__main__":
    main() 