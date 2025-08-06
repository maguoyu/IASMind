import pandas as pd
import numpy as np
import warnings
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass, field
from sklearn.neighbors import LocalOutlierFactor
from sklearn.cluster import DBSCAN
from scipy.stats import zscore, pearsonr, spearmanr
from scipy.signal import find_peaks
import pymannkendall as mk
import ruptures as rpt
from datetime import datetime
import json
import requests
from abc import ABC, abstractmethod
try:
    from src.llms.llm import get_llm_by_type
    from src.config.agents import AGENT_LLM_MAP
    HAS_LLM_CONFIG = True
except ImportError:
    HAS_LLM_CONFIG = False
    print("警告: 未找到LLM配置，将使用简化版本")
warnings.filterwarnings('ignore')

@dataclass
class InsightResult:
    """数据洞察结果的标准化结构"""
    algorithm: str  # 算法名称
    insight_type: str  # 洞察类型：anomaly, trend, correlation, etc.
    severity: str  # 严重程度：low, medium, high, critical
    confidence: float  # 置信度 0-1
    description: str  # 洞察描述
    details: Dict[str, Any]  # 详细结果
    affected_data: List[int] = field(default_factory=list)  # 受影响的数据索引
    recommendations: List[str] = field(default_factory=list)  # 建议
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'algorithm': self.algorithm,
            'insight_type': self.insight_type,
            'severity': self.severity,
            'confidence': self.confidence,
            'description': self.description,
            'details': self.details,
            'affected_data': self.affected_data,
            'recommendations': self.recommendations
        }
    
    def to_friendly_description(self) -> str:
        """生成通俗易懂的描述"""
        friendly_names = {
            'lof': '局部异常检测',
            'zscore': '数值异常检测',
            'iqr': '四分位异常检测',
            'mann_kendall': '趋势分析',
            'page_hinkley': '变化点检测',
            'bayesian': '转折点分析',
            'pearson': '线性相关分析',
            'spearman': '排序相关分析',
            'dbscan': '聚类分析',
            'cv_periodicity': '周期性分析',
            'basic_stats': '基础统计'
        }
        
        severity_icons = {
            'low': '🟢',
            'medium': '🟡', 
            'high': '🟠',
            'critical': '🔴'
        }
        
        confidence_text = {
            (0.9, 1.0): '非常确定',
            (0.7, 0.9): '比较确定',
            (0.5, 0.7): '一般确定',
            (0.0, 0.5): '不太确定'
        }
        
        # 获取置信度文本
        conf_text = '不确定'
        for (low, high), text in confidence_text.items():
            if low <= self.confidence < high:
                conf_text = text
                break
        
        algorithm_name = friendly_names.get(self.algorithm, self.algorithm)
        severity_icon = severity_icons.get(self.severity, '⚪')
        
        return f"{severity_icon} [{algorithm_name}] {self.description} (置信度: {conf_text})"

class LLMOptimizer(ABC):
    """大模型优化器基类"""
    
    @abstractmethod
    def optimize_report(self, insights: List[InsightResult], context: str = "") -> str:
        """优化报告输出"""
        pass

class SmartLLMOptimizer(LLMOptimizer):
    """智能大模型优化器 - 使用项目配置的LLM"""
    
    def __init__(self):
        if HAS_LLM_CONFIG:
            try:
                self.llm = get_llm_by_type(AGENT_LLM_MAP.get("chatbot", "basic"))
                self.has_llm = True
            except Exception as e:
                print(f"LLM初始化失败: {e}")
                self.has_llm = False
        else:
            self.has_llm = False
    
    def optimize_report(self, insights: List[InsightResult], context: str = "") -> str:
        """使用配置的LLM优化报告"""
        if not self.has_llm:
            return self._generate_fallback_report(insights, context)
        
        try:
            # 准备洞察数据
            insights_text = "\n".join([
                f"- {insight.to_friendly_description()}\n  详情: {insight.details}\n  建议: {', '.join(insight.recommendations)}"
                for insight in insights
            ])
            
            prompt = f"""
请将以下数据分析结果转换为通俗易懂的业务报告，面向非技术背景的业务人员：

背景信息: {context}

数据洞察结果:
{insights_text}

请按以下要求输出:
1. 用简单易懂的语言解释发现的问题
2. 说明这些问题对业务的潜在影响  
3. 提供具体可行的改进建议
4. 避免使用技术术语，多用比喻和实例
5. 按重要性排序展示结果

输出格式要求:
- 使用中文
- 结构清晰，有标题和要点
- 突出关键信息
- 语言亲和，便于理解
"""
            response = self.llm.invoke(prompt)
            return response.content if hasattr(response, 'content') else str(response)
                
        except Exception as e:
            print(f"大模型优化失败: {str(e)}")
            return self._generate_fallback_report(insights, context)
    
    def _generate_fallback_report(self, insights: List[InsightResult], context: str = "") -> str:
        """生成备用报告（不使用LLM）"""
        return f"""
📊 数据洞察分析报告

📋 分析背景: {context}

🔍 主要发现:
{chr(10).join([f"• {insight.to_friendly_description()}" for insight in insights[:5]])}

💡 关键建议:
{chr(10).join([f"• {rec}" for insight in insights for rec in insight.recommendations[:2]][:5])}

注: 此报告为简化版本，建议配置LLM获得更详细的分析。
"""

class LocalLLMOptimizer(LLMOptimizer):
    """本地大模型优化器（支持Ollama等）"""
    
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "qwen2.5"):
        self.base_url = base_url
        self.model = model
    
    def optimize_report(self, insights: List[InsightResult], context: str = "") -> str:
        """使用本地大模型优化报告"""
        try:
            insights_text = "\n".join([
                f"- {insight.to_friendly_description()}\n  详情: {insight.details}\n  建议: {', '.join(insight.recommendations)}"
                for insight in insights
            ])
            
            prompt = f"""
请将以下数据分析结果转换为通俗易懂的业务报告：

背景: {context}

发现的问题:
{insights_text}

请用简单的语言解释这些发现，说明对业务的影响，并提供改进建议。避免技术术语，多用生活中的例子来解释。
"""
            
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False
            }
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json().get('response', '优化失败')
            else:
                raise Exception(f"API调用失败: {response.status_code}")
                
        except Exception as e:
            return f"本地大模型优化失败: {str(e)}\n\n原始报告:\n" + "\n".join([
                insight.to_friendly_description() for insight in insights
            ])

class DataInsightFramework:
    """数据洞察框架 - 统一的数据分析工具"""
    
    def __init__(self, llm_optimizer: Optional[LLMOptimizer] = None):
        self.results = []
        self.llm_optimizer = SmartLLMOptimizer()
        
        # 算法配置
        self.config = {
            'zscore_threshold': 3.0,
            'iqr_multiplier': 1.5,
            'lof_contamination': 0.1,
            'dbscan_eps': 0.5,
            'dbscan_min_samples': 5,
            'correlation_threshold': 0.7,
            'cv_threshold': 0.3,
            'trend_alpha': 0.05
        }
    
    def clear_results(self):
        """清空之前的结果"""
        self.results = []
    
    def _get_friendly_recommendations(self, algorithm: str, details: Dict) -> List[str]:
        """生成通俗易懂的建议"""
        recommendations = []
        
        if algorithm == 'zscore':
            if details.get('outliers_count', 0) > 0:
                recommendations.extend([
                    "检查异常数据点是否为录入错误",
                    "确认是否有特殊业务事件导致数值异常",
                    "考虑设置数据验证规则避免极端值"
                ])
        
        elif algorithm == 'lof':
            if details.get('outliers_count', 0) > 0:
                recommendations.extend([
                    "关注局部异常的业务场景",
                    "分析异常数据的共同特征",
                    "建立异常监控机制"
                ])
        
        elif algorithm == 'mann_kendall':
            if details.get('trend') == 'increasing':
                recommendations.extend([
                    "数据呈上升趋势，可考虑扩大投入",
                    "分析上升原因，制定增长策略",
                    "预测未来发展，做好资源准备"
                ])
            elif details.get('trend') == 'decreasing':
                recommendations.extend([
                    "数据呈下降趋势，需要关注",
                    "分析下降原因，制定改进措施",
                    "及时调整策略避免进一步恶化"
                ])
        
        elif algorithm in ['pearson', 'spearman']:
            corr_value = details.get('correlation', 0)
            if abs(corr_value) > 0.7:
                if corr_value > 0:
                    recommendations.extend([
                        "两个指标强正相关，可以相互预测",
                        "优化其中一个指标可能带动另一个",
                        "建立联动管理机制"
                    ])
                else:
                    recommendations.extend([
                        "两个指标强负相关，存在制约关系",
                        "需要平衡两个指标的发展",
                        "避免过度优化单一指标"
                    ])
        
        return recommendations
    
    def _create_friendly_description(self, algorithm: str, details: Dict, severity: str) -> str:
        """生成通俗易懂的描述"""
        
        if algorithm == 'zscore':
            outliers_count = details.get('outliers_count', 0)
            if outliers_count > 0:
                return f"发现 {outliers_count} 个数值异常的数据点，这些数据明显偏离正常范围"
            else:
                return "数据数值都在正常范围内，没有发现明显异常"
        
        elif algorithm == 'iqr':
            outliers_count = details.get('outliers_count', 0)
            if outliers_count > 0:
                return f"通过四分位分析，发现 {outliers_count} 个可能的异常值"
            else:
                return "数据分布均匀，没有发现异常值"
        
        elif algorithm == 'lof':
            outliers_count = details.get('outliers_count', 0)
            if outliers_count > 0:
                return f"发现 {outliers_count} 个局部异常点，这些数据在其周围环境中显得不寻常"
            else:
                return "数据的局部密度正常，没有发现孤立异常"
        
        elif algorithm == 'mann_kendall':
            trend = details.get('trend', 'no trend')
            p_value = details.get('p_value', 1.0)
            if trend == 'increasing':
                return f"数据整体呈现上升趋势，统计显著性很高"
            elif trend == 'decreasing':
                return f"数据整体呈现下降趋势，需要关注"
            else:
                return "数据没有明显的上升或下降趋势，相对稳定"
        
        elif algorithm in ['pearson', 'spearman']:
            corr_value = details.get('correlation', 0)
            corr_type = "线性" if algorithm == 'pearson' else "排序"
            if abs(corr_value) > 0.7:
                direction = "正相关" if corr_value > 0 else "负相关"
                return f"两个指标之间存在强{direction}关系（{corr_type}相关系数: {corr_value:.3f}）"
            elif abs(corr_value) > 0.3:
                direction = "正相关" if corr_value > 0 else "负相关"
                return f"两个指标之间存在中等程度的{direction}关系"
            else:
                return "两个指标之间相关性较弱，基本独立"
        
        elif algorithm == 'dbscan':
            clusters = details.get('n_clusters', 0)
            noise_points = details.get('noise_points', 0)
            if clusters > 1:
                return f"数据可以分为 {clusters} 个不同的群组，另有 {noise_points} 个异常点"
            else:
                return f"数据比较分散，难以形成明显的群组，有 {noise_points} 个异常点"
        
        elif algorithm == 'cv_periodicity':
            cv = details.get('cv', 0)
            if cv > 0.5:
                return f"数据波动较大，变异系数为 {cv:.3f}，可能存在周期性模式"
            else:
                return f"数据相对稳定，变异系数为 {cv:.3f}"
        
        elif algorithm == 'basic_stats':
            stats = details
            return f"数据概况：平均值 {stats.get('mean', 0):.2f}，最大值 {stats.get('max', 0):.2f}，最小值 {stats.get('min', 0):.2f}"
        
        return f"通过{algorithm}算法分析完成"

    def analyze_zscore(self, data: np.ndarray, threshold: float = None) -> InsightResult:
        """Z-Score异常检测"""
        if threshold is None:
            threshold = self.config['zscore_threshold']
        
        z_scores = np.abs(zscore(data, nan_policy='omit'))
        outliers = np.where(z_scores > threshold)[0]
        
        details = {
            'threshold': threshold,
            'outliers_count': len(outliers),
            'outlier_indices': outliers.tolist(),
            'max_zscore': float(np.max(z_scores)) if len(z_scores) > 0 else 0,
            'mean_zscore': float(np.mean(z_scores)) if len(z_scores) > 0 else 0
        }
        
        severity = 'high' if len(outliers) > len(data) * 0.1 else 'medium' if len(outliers) > 0 else 'low'
        confidence = min(0.9, 0.5 + len(outliers) * 0.1)
        
        description = self._create_friendly_description('zscore', details, severity)
        recommendations = self._get_friendly_recommendations('zscore', details)
        
        return InsightResult(
            algorithm='zscore',
            insight_type='anomaly',
            severity=severity,
            confidence=confidence,
            description=description,
            details=details,
            affected_data=outliers.tolist(),
            recommendations=recommendations
        )

    def analyze_iqr(self, data: np.ndarray, multiplier: float = None) -> InsightResult:
        """IQR异常检测"""
        if multiplier is None:
            multiplier = self.config['iqr_multiplier']
        
        q1, q3 = np.percentile(data, [25, 75])
        iqr = q3 - q1
        lower_bound = q1 - multiplier * iqr
        upper_bound = q3 + multiplier * iqr
        
        outliers = np.where((data < lower_bound) | (data > upper_bound))[0]
        
        details = {
            'q1': float(q1),
            'q3': float(q3),
            'iqr': float(iqr),
            'lower_bound': float(lower_bound),
            'upper_bound': float(upper_bound),
            'outliers_count': len(outliers),
            'outlier_indices': outliers.tolist()
        }
        
        severity = 'high' if len(outliers) > len(data) * 0.05 else 'medium' if len(outliers) > 0 else 'low'
        confidence = 0.8 if len(outliers) > 0 else 0.6
        
        description = self._create_friendly_description('iqr', details, severity)
        recommendations = self._get_friendly_recommendations('iqr', details)
        
        return InsightResult(
            algorithm='iqr',
            insight_type='anomaly',
            severity=severity,
            confidence=confidence,
            description=description,
            details=details,
            affected_data=outliers.tolist(),
            recommendations=recommendations
        )

    def analyze_lof(self, data: np.ndarray, contamination: float = None) -> InsightResult:
        """LOF局部异常因子检测"""
        if contamination is None:
            contamination = self.config['lof_contamination']
        
        if len(data.shape) == 1:
            data = data.reshape(-1, 1)
        
        lof = LocalOutlierFactor(contamination=contamination, n_neighbors=min(20, len(data)-1))
        outlier_labels = lof.fit_predict(data)
        outliers = np.where(outlier_labels == -1)[0]
        
        details = {
            'contamination': contamination,
            'outliers_count': len(outliers),
            'outlier_indices': outliers.tolist(),
            'negative_outlier_factor': lof.negative_outlier_factor_.tolist()
        }
        
        severity = 'high' if len(outliers) > len(data) * 0.1 else 'medium' if len(outliers) > 0 else 'low'
        confidence = 0.85 if len(outliers) > 0 else 0.7
        
        description = self._create_friendly_description('lof', details, severity)
        recommendations = self._get_friendly_recommendations('lof', details)
        
        return InsightResult(
            algorithm='lof',
            insight_type='anomaly',
            severity=severity,
            confidence=confidence,
            description=description,
            details=details,
            affected_data=outliers.tolist(),
            recommendations=recommendations
        )

    def analyze_mann_kendall(self, data: np.ndarray, alpha: float = None) -> InsightResult:
        """Mann-Kendall趋势检测"""
        if alpha is None:
            alpha = self.config['trend_alpha']
        
        result = mk.original_test(data, alpha=alpha)
        
        details = {
            'trend': result.trend,
            'h': result.h,
            'p_value': float(result.p),
            'z_score': float(result.z),
            'tau': float(result.Tau),
            'slope': float(result.slope) if hasattr(result, 'slope') else None
        }
        
        severity = 'high' if result.h and abs(result.z) > 2.5 else 'medium' if result.h else 'low'
        confidence = 1 - result.p if result.h else 0.5
        
        description = self._create_friendly_description('mann_kendall', details, severity)
        recommendations = self._get_friendly_recommendations('mann_kendall', details)
        
        return InsightResult(
            algorithm='mann_kendall',
            insight_type='trend',
            severity=severity,
            confidence=confidence,
            description=description,
            details=details,
            recommendations=recommendations
        )

    def analyze_page_hinkley(self, data: np.ndarray) -> InsightResult:
        """Page-Hinkley变化点检测"""
        try:
            algo = rpt.Pelt(model="rbf").fit(data)
            change_points = algo.predict(pen=10)
            
            # 移除最后一个点（总是数据长度）
            if change_points and change_points[-1] == len(data):
                change_points = change_points[:-1]
            
            details = {
                'change_points': change_points,
                'change_points_count': len(change_points)
            }
            
            severity = 'high' if len(change_points) > 3 else 'medium' if len(change_points) > 0 else 'low'
            confidence = 0.8 if len(change_points) > 0 else 0.6
            
            if len(change_points) > 0:
                description = f"检测到 {len(change_points)} 个数据变化点，数据在这些位置发生了显著变化"
            else:
                description = "数据相对稳定，没有检测到明显的变化点"
            
            recommendations = []
            if len(change_points) > 0:
                recommendations.extend([
                    "分析变化点对应的时间和业务事件",
                    "确认变化是否符合预期",
                    "建立变化监控机制"
                ])
            
            return InsightResult(
                algorithm='page_hinkley',
                insight_type='changepoint',
                severity=severity,
                confidence=confidence,
                description=description,
                details=details,
                affected_data=change_points,
                recommendations=recommendations
            )
        except Exception as e:
            return InsightResult(
                algorithm='page_hinkley',
                insight_type='changepoint',
                severity='low',
                confidence=0.3,
                description=f"变化点检测失败: {str(e)}",
                details={'error': str(e)},
                recommendations=["数据可能不适合变化点检测"]
            )

    def analyze_bayesian_changepoint(self, data: np.ndarray) -> InsightResult:
        """贝叶斯转折点检测"""
        try:
            algo = rpt.Dynp(model="normal", min_size=3, jump=5).fit(data)
            change_points = algo.predict(n_bkps=5)
            
            if change_points and change_points[-1] == len(data):
                change_points = change_points[:-1]
            
            details = {
                'change_points': change_points,
                'change_points_count': len(change_points),
                'method': 'bayesian_inference'
            }
            
            severity = 'high' if len(change_points) > 2 else 'medium' if len(change_points) > 0 else 'low'
            confidence = 0.85 if len(change_points) > 0 else 0.6
            
            if len(change_points) > 0:
                description = f"通过贝叶斯推断发现 {len(change_points)} 个转折点，数据模式在这些位置发生改变"
            else:
                description = "数据模式相对稳定，没有发现明显的转折点"
            
            recommendations = []
            if len(change_points) > 0:
                recommendations.extend([
                    "重点关注转折点附近的业务变化",
                    "分析转折原因，总结经验教训",
                    "预测下一个可能的转折点"
                ])
            
            return InsightResult(
                algorithm='bayesian',
                insight_type='changepoint',
                severity=severity,
                confidence=confidence,
                description=description,
                details=details,
                affected_data=change_points,
                recommendations=recommendations
            )
        except Exception as e:
            return InsightResult(
                algorithm='bayesian',
                insight_type='changepoint',
                severity='low',
                confidence=0.3,
                description=f"贝叶斯转折点检测失败: {str(e)}",
                details={'error': str(e)},
                recommendations=["数据可能不适合转折点检测"]
            )

    def analyze_correlation(self, data1: np.ndarray, data2: np.ndarray, method: str = 'pearson') -> InsightResult:
        """相关性分析"""
        try:
            if method == 'pearson':
                corr, p_value = pearsonr(data1, data2)
            else:  # spearman
                corr, p_value = spearmanr(data1, data2)
            
            details = {
                'correlation': float(corr),
                'p_value': float(p_value),
                'method': method,
                'significant': p_value < 0.05
            }
            
            abs_corr = abs(corr)
            if abs_corr > 0.7:
                severity = 'high'
            elif abs_corr > 0.3:
                severity = 'medium'
            else:
                severity = 'low'
            
            confidence = 1 - p_value if p_value < 0.05 else 0.5
            
            description = self._create_friendly_description(method, details, severity)
            recommendations = self._get_friendly_recommendations(method, details)
            
            return InsightResult(
                algorithm=method,
                insight_type='correlation',
                severity=severity,
                confidence=confidence,
                description=description,
                details=details,
                recommendations=recommendations
            )
        except Exception as e:
            return InsightResult(
                algorithm=method,
                insight_type='correlation',
                severity='low',
                confidence=0.3,
                description=f"相关性分析失败: {str(e)}",
                details={'error': str(e)},
                recommendations=["检查数据质量和格式"]
            )

    def analyze_dbscan(self, data: np.ndarray, eps: float = None, min_samples: int = None) -> InsightResult:
        """DBSCAN聚类分析"""
        if eps is None:
            eps = self.config['dbscan_eps']
        if min_samples is None:
            min_samples = self.config['dbscan_min_samples']
        
        if len(data.shape) == 1:
            data = data.reshape(-1, 1)
        
        clustering = DBSCAN(eps=eps, min_samples=min_samples).fit(data)
        labels = clustering.labels_
        
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        noise_points = list(labels).count(-1)
        
        details = {
            'n_clusters': n_clusters,
            'noise_points': noise_points,
            'eps': eps,
            'min_samples': min_samples,
            'labels': labels.tolist()
        }
        
        severity = 'high' if noise_points > len(data) * 0.1 else 'medium' if noise_points > 0 else 'low'
        confidence = 0.8 if n_clusters > 0 else 0.6
        
        description = self._create_friendly_description('dbscan', details, severity)
        recommendations = []
        if noise_points > 0:
            recommendations.extend([
                "检查异常点是否为数据错误",
                "分析异常点的业务含义",
                "考虑调整聚类参数"
            ])
        
        noise_indices = [i for i, label in enumerate(labels) if label == -1]
        
        return InsightResult(
            algorithm='dbscan',
            insight_type='clustering',
            severity=severity,
            confidence=confidence,
            description=description,
            details=details,
            affected_data=noise_indices,
            recommendations=recommendations
        )

    def analyze_cv_periodicity(self, data: np.ndarray) -> InsightResult:
        """变异系数周期性检测"""
        cv = np.std(data) / np.mean(data) if np.mean(data) != 0 else float('inf')
        
        details = {
            'cv': float(cv),
            'mean': float(np.mean(data)),
            'std': float(np.std(data))
        }
        
        if cv > 0.5:
            severity = 'high'
        elif cv > 0.3:
            severity = 'medium'
        else:
            severity = 'low'
        
        confidence = 0.7
        
        description = self._create_friendly_description('cv_periodicity', details, severity)
        
        recommendations = []
        if cv > 0.3:
            recommendations.extend([
                "数据波动较大，分析波动原因",
                "考虑是否存在周期性模式",
                "建立波动监控机制"
            ])
        
        return InsightResult(
            algorithm='cv_periodicity',
            insight_type='periodicity',
            severity=severity,
            confidence=confidence,
            description=description,
            details=details,
            recommendations=recommendations
        )

    def analyze_basic_stats(self, data: np.ndarray) -> InsightResult:
        """基础统计分析"""
        stats = {
            'count': len(data),
            'mean': float(np.mean(data)),
            'median': float(np.median(data)),
            'std': float(np.std(data)),
            'min': float(np.min(data)),
            'max': float(np.max(data)),
            'range': float(np.max(data) - np.min(data)),
            'q1': float(np.percentile(data, 25)),
            'q3': float(np.percentile(data, 75))
        }
        
        # 检查是否有异常的统计特征
        cv = stats['std'] / stats['mean'] if stats['mean'] != 0 else float('inf')
        range_ratio = stats['range'] / stats['mean'] if stats['mean'] != 0 else float('inf')
        
        severity = 'medium' if cv > 1 or range_ratio > 5 else 'low'
        confidence = 0.9
        
        description = self._create_friendly_description('basic_stats', stats, severity)
        
        recommendations = []
        if cv > 1:
            recommendations.append("数据变异较大，需要深入分析原因")
        if range_ratio > 5:
            recommendations.append("数据范围很大，检查是否有极端值")
        
        return InsightResult(
            algorithm='basic_stats',
            insight_type='descriptive',
            severity=severity,
            confidence=confidence,
            description=description,
            details=stats,
            recommendations=recommendations
        )

    def analyze(self, data: Union[pd.DataFrame, pd.Series, np.ndarray], 
                column: str = None, 
                algorithms: List[str] = None,
                **kwargs) -> List[InsightResult]:
        """统一分析接口"""
        self.clear_results()
        
        # 数据预处理
        if isinstance(data, pd.DataFrame):
            if column is None:
                # 选择第一个数值列
                numeric_cols = data.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) == 0:
                    raise ValueError("DataFrame中没有数值列")
                column = numeric_cols[0]
            analysis_data = data[column].dropna().values
        elif isinstance(data, pd.Series):
            analysis_data = data.dropna().values
        else:
            analysis_data = np.array(data)
            analysis_data = analysis_data[~np.isnan(analysis_data)]
        
        if len(analysis_data) == 0:
            raise ValueError("没有有效的数据进行分析")
        
        # 默认算法列表
        if algorithms is None:
            algorithms = ['basic_stats', 'zscore', 'iqr', 'mann_kendall']
            if len(analysis_data) > 10:
                algorithms.extend(['lof', 'cv_periodicity'])
            if len(analysis_data) > 20:
                algorithms.extend(['page_hinkley', 'bayesian', 'dbscan'])
        
        # 运行分析算法
        for algorithm in algorithms:
            try:
                if algorithm == 'zscore':
                    result = self.analyze_zscore(analysis_data, **kwargs)
                elif algorithm == 'iqr':
                    result = self.analyze_iqr(analysis_data, **kwargs)
                elif algorithm == 'lof':
                    result = self.analyze_lof(analysis_data, **kwargs)
                elif algorithm == 'mann_kendall':
                    result = self.analyze_mann_kendall(analysis_data, **kwargs)
                elif algorithm == 'page_hinkley':
                    result = self.analyze_page_hinkley(analysis_data)
                elif algorithm == 'bayesian':
                    result = self.analyze_bayesian_changepoint(analysis_data)
                elif algorithm == 'dbscan':
                    result = self.analyze_dbscan(analysis_data, **kwargs)
                elif algorithm == 'cv_periodicity':
                    result = self.analyze_cv_periodicity(analysis_data)
                elif algorithm == 'basic_stats':
                    result = self.analyze_basic_stats(analysis_data)
                else:
                    continue
                
                self.results.append(result)
            except Exception as e:
                print(f"算法 {algorithm} 执行失败: {str(e)}")
        
        return self.results

    def analyze_correlation_pair(self, data: pd.DataFrame, col1: str, col2: str, 
                                methods: List[str] = None) -> List[InsightResult]:
        """分析两个变量的相关性"""
        if methods is None:
            methods = ['pearson', 'spearman']
        
        data1 = data[col1].dropna().values
        data2 = data[col2].dropna().values
        
        # 确保数据长度一致
        min_len = min(len(data1), len(data2))
        data1 = data1[:min_len]
        data2 = data2[:min_len]
        
        results = []
        for method in methods:
            result = self.analyze_correlation(data1, data2, method)
            results.append(result)
            self.results.append(result)
        
        return results

    def get_summary_report(self, context: str = "") -> str:
        """生成通俗易懂的摘要报告"""
        if not self.results:
            return "暂无分析结果"
        
        # 按严重程度排序
        severity_order = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}
        sorted_results = sorted(self.results, 
                              key=lambda x: (severity_order.get(x.severity, 0), x.confidence), 
                              reverse=True)
        
        # 如果配置了大模型优化器，使用它来优化报告
        if self.llm_optimizer:
            try:
                return self.llm_optimizer.optimize_report(sorted_results, context)
            except Exception as e:
                print(f"大模型优化失败: {e}")
                # 继续使用默认报告
        
        # 默认报告格式
        report = ["📊 数据洞察报告", "=" * 50, ""]
        
        if context:
            report.extend([f"📋 分析背景: {context}", ""])
        
        # 重要发现
        high_severity = [r for r in sorted_results if r.severity in ['critical', 'high']]
        if high_severity:
            report.extend(["🚨 重要发现:", ""])
            for i, result in enumerate(high_severity, 1):
                report.append(f"{i}. {result.to_friendly_description()}")
                if result.recommendations:
                    report.append(f"   💡 建议: {'; '.join(result.recommendations[:2])}")
                report.append("")
        
        # 一般发现
        medium_severity = [r for r in sorted_results if r.severity == 'medium']
        if medium_severity:
            report.extend(["📈 一般发现:", ""])
            for i, result in enumerate(medium_severity, 1):
                report.append(f"{i}. {result.to_friendly_description()}")
                report.append("")
        
        # 基础信息
        low_severity = [r for r in sorted_results if r.severity == 'low']
        if low_severity:
            report.extend(["📋 基础信息:", ""])
            for i, result in enumerate(low_severity, 1):
                report.append(f"{i}. {result.to_friendly_description()}")
                report.append("")
        
        # 总结建议
        all_recommendations = []
        for result in high_severity + medium_severity:
            all_recommendations.extend(result.recommendations)
        
        if all_recommendations:
            unique_recommendations = list(dict.fromkeys(all_recommendations))[:5]  # 去重并限制数量
            report.extend(["💡 总体建议:", ""])
            for i, rec in enumerate(unique_recommendations, 1):
                report.append(f"{i}. {rec}")
            report.append("")
        
        report.extend(["", f"📅 分析时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
        
        return "\n".join(report)

    def export_results(self, format: str = 'json') -> Union[str, Dict]:
        """导出结果"""
        if format == 'json':
            return json.dumps([result.to_dict() for result in self.results], 
                            indent=2, ensure_ascii=False, default=str)
        elif format == 'dict':
            return [result.to_dict() for result in self.results]
        else:
            raise ValueError("支持的格式: 'json', 'dict'")

# 测试代码
if __name__ == "__main__":
    # 创建测试数据
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
    
    # 测试基础框架
    print("=== 测试基础数据洞察框架 ===")
    framework = DataInsightFramework()
    insights = framework.analyze(data, column='sales')
    
    print(framework.get_summary_report("电商平台日销售额分析"))
    
    # 测试相关性分析
    print("\n=== 测试相关性分析 ===")
    corr_insights = framework.analyze_correlation_pair(data, 'sales', 'advertising')
    
    for insight in corr_insights:
        print(insight.to_friendly_description()) 