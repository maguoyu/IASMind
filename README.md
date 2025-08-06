# 数据洞察框架 (Data Insight Framework)

一个统一的数据洞察框架，封装了多种经典的数据分析算法，为业务数据分析提供标准化的洞察能力。

## 🚀 快速开始

```python
from src.data_insight import DataInsightFramework
import pandas as pd
import numpy as np

# 准备数据
data = pd.read_csv('your_data.csv')

# 创建框架实例
framework = DataInsightFramework()

# 一键分析
insights = framework.analyze(data, column='your_column')

# 查看结果
for insight in insights:
    print(f"[{insight.algorithm}] {insight.description}")
```

## 📋 支持的算法

### 异常检测算法
- **Z-Score**: 全局异常点检测，适用于正态分布数据
- **IQR**: 四分位距异常检测，对数据分布要求较少，稳健性好
- **LOF**: 局部异常因子，擅长发现局部密度异常
- **DBSCAN**: 基于密度的聚类，可识别噪声点作为异常

### 时序分析算法
- **Mann-Kendall Test**: 非参数趋势检测，判断时序数据的单调趋势
- **Page-Hinkley Test**: 时序数据变化点检测（通过ruptures库实现）
- **Bayesian Inference**: 贝叶斯推断转折点检测

### 关系分析算法
- **Pearson Correlation**: 线性相关性检测
- **Spearman Correlation**: 单调相关性检测（等级相关）

### 模式识别算法
- **Coefficient of Variation**: 基于变异系数的周期性检测

### 基础统计分析
- 最大/最小值异常检测
- 均值、方差异常检测
- 占比异常检测

## 🛠️ 安装依赖

```bash
pip install pandas numpy scikit-learn scipy matplotlib ruptures pymannkendall
```

## 📖 详细使用指南

### 1. 基本用法

```python
from src.data_insight import DataInsightFramework
import pandas as pd

# 创建框架实例
framework = DataInsightFramework()

# 分析DataFrame的某一列
df = pd.DataFrame({'sales': [100, 110, 105, 2000, 108]})  # 包含异常值
insights = framework.analyze(df, column='sales')

# 分析numpy数组
import numpy as np
data = np.random.randn(1000)
insights = framework.analyze(data)
```

### 2. 自定义配置

```python
# 自定义算法参数
config = {
    'zscore_threshold': 2.0,        # Z-Score阈值（默认2.5）
    'iqr_multiplier': 1.5,          # IQR倍数（默认1.5）
    'lof_neighbors': 20,            # LOF邻居数（默认20）
    'correlation_threshold': 0.7,    # 相关性阈值（默认0.7）
    'trend_alpha': 0.05             # 趋势检测显著性水平（默认0.05）
}

framework = DataInsightFramework(config=config)
insights = framework.analyze(data)
```

### 3. 选择特定算法

```python
# 只运行特定算法
algorithms = ['zscore', 'iqr', 'mann_kendall']
insights = framework.analyze(data, algorithms=algorithms)

# 可选的算法名称
available_algorithms = [
    'basic_stats',      # 基础统计分析
    'zscore',          # Z-Score异常检测
    'iqr',             # IQR异常检测
    'lof',             # LOF局部异常检测
    'dbscan',          # DBSCAN聚类异常检测
    'mann_kendall',    # Mann-Kendall趋势检测
    'correlation',     # 相关性分析
    'cv_periodicity'   # 周期性检测
]
```

### 4. 结果解析

每个洞察结果包含以下信息：

```python
for insight in insights:
    print(f"算法: {insight.algorithm}")
    print(f"洞察类型: {insight.insight_type}")
    print(f"严重程度: {insight.severity}")  # low, medium, high, critical
    print(f"置信度: {insight.confidence}")   # 0-1之间
    print(f"描述: {insight.description}")
    print(f"建议: {insight.recommendations}")
    print(f"受影响的数据: {insight.affected_data}")  # 异常点索引
    print("---")
```

### 5. 获取分析摘要

```python
# 获取整体分析摘要
summary = framework.get_summary()
print(f"总洞察数: {summary['total_insights']}")
print(f"洞察类型分布: {summary['by_type']}")
print(f"严重程度分布: {summary['by_severity']}")
print(f"关键发现: {summary['key_findings']}")
```

### 6. 导出结果

```python
# 导出为JSON格式
json_results = framework.export_results('json')
with open('insights.json', 'w', encoding='utf-8') as f:
    f.write(json_results)

# 导出为字典格式
dict_results = framework.export_results('dict')
```

## 🎯 应用场景

### 业务数据监控
```python
# 监控销售数据异常
sales_data = pd.read_csv('daily_sales.csv')
framework = DataInsightFramework()
insights = framework.analyze(sales_data, column='revenue')

# 筛选高严重程度的异常
critical_insights = [i for i in insights if i.severity in ['high', 'critical']]
```

### 用户行为分析
```python
# 分析用户活跃度趋势
user_data = pd.read_csv('user_activity.csv')
insights = framework.analyze(user_data, column='daily_active_users')

# 查找趋势变化
trend_insights = [i for i in insights if i.insight_type == 'trend']
```

### 系统性能监控
```python
# 监控系统响应时间
perf_data = pd.read_csv('system_metrics.csv')
insights = framework.analyze(perf_data, column='response_time')

# 识别性能异常
anomaly_insights = [i for i in insights if i.insight_type == 'anomaly']
```

## 📊 完整示例

查看 `usage_example.py` 了解完整的业务场景使用示例，包括：
- 模拟电商业务数据分析
- 多指标关联性分析
- 洞察结果可视化
- 业务建议生成

查看 `quick_start.py` 了解快速开始示例。

## 🔧 扩展框架

### 添加新算法

```python
class DataInsightFramework:
    def _analyze_your_algorithm(self, data: np.ndarray):
        """添加您自己的算法"""
        # 实现您的算法逻辑
        result = your_algorithm(data)
        
        # 创建洞察结果
        insight = InsightResult(
            algorithm='your_algorithm',
            insight_type='your_type',
            severity='medium',
            confidence=0.8,
            description="您的算法描述",
            details={'your_details': result},
            recommendations=["您的建议"]
        )
        
        self.results.append(insight)
```

### 自定义洞察类型

支持的洞察类型：
- `anomaly`: 异常检测
- `trend`: 趋势分析
- `relationship`: 关系分析
- `periodicity`: 周期性分析
- `statistical_summary`: 统计摘要

## 📁 项目结构

```
src/data_insight/
├── __init__.py                    # 主模块导入
├── data_insight_framework.py      # 核心框架代码
└── examples/                      # 示例代码
    ├── __init__.py
    ├── quick_start.py             # 快速开始示例
    ├── smart_insight_demo.py      # 智能洞察演示
    ├── llm_optimized_example.py   # LLM优化示例
    ├── usage_example.py           # 详细使用示例
    └── integration_example.py     # 集成示例
```

## 🚀 快速运行

```bash
# 运行快速开始示例
python data_insight_quickstart.py

# 或直接运行示例文件
python src/data_insight/examples/quick_start.py
```

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个框架！

## 📄 许可证

MIT License

## 📞 联系

如有问题或建议，请创建Issue或联系开发者。
