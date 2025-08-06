#!/usr/bin/env python3
"""
数据洞察框架集成示例
展示如何将数据洞察框架与其他功能模块结合使用
"""

import pandas as pd
import numpy as np
import json
from typing import Dict, List, Any
from datetime import datetime, timedelta
from src.data_insight import DataInsightFramework, InsightResult

class BusinessIntelligenceSystem:
    """
    业务智能系统 - 集成数据洞察框架
    """
    
    def __init__(self):
        self.insight_framework = DataInsightFramework()
        self.data_sources = {}
        self.insights_history = []
        self.alerts = []
    
    def register_data_source(self, name: str, data: pd.DataFrame):
        """注册数据源"""
        self.data_sources[name] = data
        print(f"✓ 数据源 '{name}' 已注册，包含 {len(data)} 行数据")
    
    def analyze_data_source(self, source_name: str, column: str = None) -> List[InsightResult]:
        """分析指定数据源"""
        if source_name not in self.data_sources:
            raise ValueError(f"数据源 '{source_name}' 不存在")
        
        data = self.data_sources[source_name]
        insights = self.insight_framework.analyze(data, column=column)
        
        # 记录洞察历史
        analysis_record = {
            'timestamp': datetime.now().isoformat(),
            'source_name': source_name,
            'column': column,
            'insights_count': len(insights),
            'insights': [insight.to_dict() for insight in insights]
        }
        self.insights_history.append(analysis_record)
        
        # 生成告警
        self._generate_alerts(insights, source_name, column)
        
        return insights
    
    def _generate_alerts(self, insights: List[InsightResult], source_name: str, column: str):
        """基于洞察生成告警"""
        high_severity_insights = [i for i in insights if i.severity in ['high', 'critical']]
        
        for insight in high_severity_insights:
            alert = {
                'timestamp': datetime.now().isoformat(),
                'source': source_name,
                'column': column,
                'type': insight.insight_type,
                'severity': insight.severity,
                'description': insight.description,
                'recommendations': insight.recommendations,
                'alert_id': f"ALERT_{len(self.alerts) + 1:04d}"
            }
            self.alerts.append(alert)
    
    def get_dashboard_summary(self) -> Dict[str, Any]:
        """获取仪表盘摘要"""
        total_insights = sum(len(record['insights']) for record in self.insights_history)
        active_alerts = len([a for a in self.alerts if self._is_alert_active(a)])
        
        # 按类型统计洞察
        insight_types = {}
        severity_counts = {}
        
        for record in self.insights_history:
            for insight_data in record['insights']:
                itype = insight_data['insight_type']
                severity = insight_data['severity']
                
                insight_types[itype] = insight_types.get(itype, 0) + 1
                severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        return {
            'summary': {
                'total_data_sources': len(self.data_sources),
                'total_insights': total_insights,
                'active_alerts': active_alerts,
                'analysis_runs': len(self.insights_history)
            },
            'insight_distribution': {
                'by_type': insight_types,
                'by_severity': severity_counts
            },
            'recent_alerts': self.alerts[-5:] if self.alerts else [],
            'data_sources': list(self.data_sources.keys())
        }
    
    def _is_alert_active(self, alert: Dict) -> bool:
        """判断告警是否仍然活跃"""
        alert_time = datetime.fromisoformat(alert['timestamp'])
        return datetime.now() - alert_time < timedelta(hours=24)
    
    def export_insights_report(self, filename: str = None) -> str:
        """导出洞察报告"""
        if not filename:
            filename = f"insights_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report = {
            'generated_at': datetime.now().isoformat(),
            'dashboard_summary': self.get_dashboard_summary(),
            'insights_history': self.insights_history,
            'alerts': self.alerts
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False, default=str)
        
        return filename

class ChatBIAgent:
    """
    Chat BI 代理 - 与数据洞察框架集成
    """
    
    def __init__(self, bi_system: BusinessIntelligenceSystem):
        self.bi_system = bi_system
        self.conversation_history = []
    
    def process_query(self, user_query: str) -> str:
        """处理用户查询"""
        query_lower = user_query.lower()
        
        # 记录对话历史
        self.conversation_history.append({
            'timestamp': datetime.now().isoformat(),
            'user_query': user_query,
            'response': None
        })
        
        response = ""
        
        # 解析查询意图
        if "异常" in query_lower or "anomaly" in query_lower:
            response = self._handle_anomaly_query(user_query)
        elif "趋势" in query_lower or "trend" in query_lower:
            response = self._handle_trend_query(user_query)
        elif "相关" in query_lower or "correlation" in query_lower:
            response = self._handle_correlation_query(user_query)
        elif "摘要" in query_lower or "summary" in query_lower:
            response = self._handle_summary_query(user_query)
        elif "告警" in query_lower or "alert" in query_lower:
            response = self._handle_alert_query(user_query)
        else:
            response = self._handle_general_query(user_query)
        
        # 更新对话历史
        self.conversation_history[-1]['response'] = response
        
        return response
    
    def _handle_anomaly_query(self, query: str) -> str:
        """处理异常检测查询"""
        anomaly_insights = []
        
        for record in self.bi_system.insights_history:
            for insight_data in record['insights']:
                if insight_data['insight_type'] == 'anomaly':
                    anomaly_insights.append({
                        'source': record['source_name'],
                        'column': record['column'],
                        'algorithm': insight_data['algorithm'],
                        'description': insight_data['description'],
                        'severity': insight_data['severity']
                    })
        
        if not anomaly_insights:
            return "当前没有检测到异常数据。"
        
        response = f"检测到 {len(anomaly_insights)} 个异常情况：\n\n"
        for i, anomaly in enumerate(anomaly_insights[-5:], 1):  # 显示最近5个
            response += f"{i}. 【{anomaly['source']} - {anomaly['column']}】\n"
            response += f"   算法: {anomaly['algorithm']}\n"
            response += f"   描述: {anomaly['description']}\n"
            response += f"   严重程度: {anomaly['severity']}\n\n"
        
        return response
    
    def _handle_trend_query(self, query: str) -> str:
        """处理趋势分析查询"""
        trend_insights = []
        
        for record in self.bi_system.insights_history:
            for insight_data in record['insights']:
                if insight_data['insight_type'] == 'trend':
                    trend_insights.append({
                        'source': record['source_name'],
                        'column': record['column'],
                        'description': insight_data['description'],
                        'details': insight_data.get('details', {})
                    })
        
        if not trend_insights:
            return "当前没有检测到显著趋势。"
        
        response = f"检测到 {len(trend_insights)} 个趋势：\n\n"
        for i, trend in enumerate(trend_insights, 1):
            response += f"{i}. 【{trend['source']} - {trend['column']}】\n"
            response += f"   {trend['description']}\n"
            if 'trend' in trend['details']:
                response += f"   趋势方向: {trend['details']['trend']}\n"
            if 'slope' in trend['details']:
                response += f"   变化斜率: {trend['details']['slope']:.4f}\n"
            response += "\n"
        
        return response
    
    def _handle_correlation_query(self, query: str) -> str:
        """处理相关性分析查询"""
        correlation_insights = []
        
        for record in self.bi_system.insights_history:
            for insight_data in record['insights']:
                if insight_data['insight_type'] == 'relationship':
                    correlation_insights.append({
                        'source': record['source_name'],
                        'description': insight_data['description'],
                        'details': insight_data.get('details', {})
                    })
        
        if not correlation_insights:
            return "当前没有发现显著的变量相关性。"
        
        response = "发现以下相关性：\n\n"
        for i, corr in enumerate(correlation_insights, 1):
            response += f"{i}. 【{corr['source']}】{corr['description']}\n"
            
            if 'strong_correlations' in corr['details']:
                for sc in corr['details']['strong_correlations']:
                    response += f"   • {sc['col1']} ↔ {sc['col2']}\n"
                    response += f"     Pearson: {sc['pearson']:.3f}, Spearman: {sc['spearman']:.3f}\n"
            response += "\n"
        
        return response
    
    def _handle_summary_query(self, query: str) -> str:
        """处理摘要查询"""
        summary = self.bi_system.get_dashboard_summary()
        
        response = "📊 数据洞察摘要报告\n"
        response += "=" * 30 + "\n\n"
        
        response += f"数据源数量: {summary['summary']['total_data_sources']}\n"
        response += f"总洞察数: {summary['summary']['total_insights']}\n"
        response += f"活跃告警: {summary['summary']['active_alerts']}\n"
        response += f"分析次数: {summary['summary']['analysis_runs']}\n\n"
        
        if summary['insight_distribution']['by_type']:
            response += "洞察类型分布:\n"
            for itype, count in summary['insight_distribution']['by_type'].items():
                response += f"  • {itype}: {count}\n"
            response += "\n"
        
        if summary['insight_distribution']['by_severity']:
            response += "严重程度分布:\n"
            for severity, count in summary['insight_distribution']['by_severity'].items():
                response += f"  • {severity}: {count}\n"
        
        return response
    
    def _handle_alert_query(self, query: str) -> str:
        """处理告警查询"""
        active_alerts = [a for a in self.bi_system.alerts if self.bi_system._is_alert_active(a)]
        
        if not active_alerts:
            return "当前没有活跃的告警。"
        
        response = f"🚨 活跃告警 ({len(active_alerts)} 个):\n\n"
        for alert in active_alerts:
            response += f"• {alert['alert_id']} - {alert['type'].upper()}\n"
            response += f"  数据源: {alert['source']} - {alert['column']}\n"
            response += f"  严重程度: {alert['severity']}\n"
            response += f"  描述: {alert['description']}\n"
            if alert['recommendations']:
                response += f"  建议: {alert['recommendations'][0]}\n"
            response += "\n"
        
        return response
    
    def _handle_general_query(self, query: str) -> str:
        """处理一般查询"""
        return f"""我可以帮您分析以下内容：

• 异常检测 - 询问 "有什么异常？"
• 趋势分析 - 询问 "数据趋势如何？"  
• 相关性分析 - 询问 "变量之间有什么相关性？"
• 摘要报告 - 询问 "给我一个摘要"
• 告警信息 - 询问 "有什么告警？"

您的问题: {query}

如果您想分析特定数据，请先确保数据源已注册到系统中。
当前可用数据源: {', '.join(self.bi_system.data_sources.keys())}"""

def main():
    """主函数 - 演示完整的集成流程"""
    print("=" * 60)
    print("数据洞察框架集成示例")
    print("=" * 60)
    
    # 1. 创建业务智能系统
    bi_system = BusinessIntelligenceSystem()
    
    # 2. 创建模拟业务数据
    np.random.seed(42)
    
    # 销售数据
    dates = pd.date_range('2023-01-01', periods=100, freq='D')
    sales = 1000 + np.cumsum(np.random.randn(100) * 10)
    sales[20] = 2000  # 异常点
    sales[80] = 300   # 异常点
    
    sales_data = pd.DataFrame({
        'date': dates,
        'revenue': sales,
        'orders': sales / 50 + np.random.randn(100) * 5,
        'customers': sales / 100 + np.random.randn(100) * 2
    })
    
    # 用户活跃度数据
    user_activity = pd.DataFrame({
        'date': dates,
        'daily_active_users': sales * 0.8 + np.random.randn(100) * 20,
        'session_duration': 300 + np.random.randn(100) * 50,
        'page_views': sales * 2 + np.random.randn(100) * 100
    })
    
    # 3. 注册数据源
    bi_system.register_data_source('sales', sales_data)
    bi_system.register_data_source('user_activity', user_activity)
    
    # 4. 执行数据分析
    print("\n执行数据分析...")
    sales_insights = bi_system.analyze_data_source('sales', 'revenue')
    user_insights = bi_system.analyze_data_source('user_activity', 'daily_active_users')
    
    print(f"销售数据洞察: {len(sales_insights)} 个")
    print(f"用户活跃度洞察: {len(user_insights)} 个")
    
    # 5. 创建Chat BI代理
    chat_agent = ChatBIAgent(bi_system)
    
    # 6. 模拟用户对话
    print("\n" + "=" * 60)
    print("Chat BI 对话模拟")
    print("=" * 60)
    
    queries = [
        "给我一个数据摘要",
        "有什么异常情况吗？",
        "数据趋势如何？",
        "有什么告警吗？",
        "变量之间有相关性吗？"
    ]
    
    for query in queries:
        print(f"\n用户: {query}")
        print("-" * 40)
        response = chat_agent.process_query(query)
        print(f"助手: {response}")
    
    # 7. 生成仪表盘摘要
    print("\n" + "=" * 60)
    print("仪表盘摘要")
    print("=" * 60)
    dashboard = bi_system.get_dashboard_summary()
    print(json.dumps(dashboard, indent=2, ensure_ascii=False, default=str))
    
    # 8. 导出报告
    print("\n" + "=" * 60)
    print("导出报告")
    print("=" * 60)
    report_file = bi_system.export_insights_report()
    print(f"✓ 洞察报告已导出到: {report_file}")
    
    print(f"\n分析完成！系统共:")
    print(f"  • 处理了 {len(bi_system.data_sources)} 个数据源")
    print(f"  • 生成了 {sum(len(record['insights']) for record in bi_system.insights_history)} 个洞察")
    print(f"  • 产生了 {len(bi_system.alerts)} 个告警")
    print(f"  • 进行了 {len(chat_agent.conversation_history)} 轮对话")

if __name__ == "__main__":
    main() 