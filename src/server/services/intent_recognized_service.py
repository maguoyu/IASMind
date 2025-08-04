from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class Intent:
    entities: List[str]
    intent_types: List[str]
    requires_relations: bool
    complexity_level: str
    valid: bool
    confidence_score: float = 0.0

class IntentRecognized:
    """业务实体识别器"""
    
    def __init__(self):
        # 业务领域关键词映射
        self.domain_keywords = {
            "用户管理": {
                "keywords": ["用户", "user", "customer", "member", "account", "人员", "员工"],
                "related_concepts": ["权限", "角色", "登录", "注册", "资料"]
            },
            "订单系统": {
                "keywords": ["订单", "order", "purchase", "transaction", "交易", "买卖"],
                "related_concepts": ["商品", "支付", "物流", "发货", "收货"]
            },
            "商品管理": {
                "keywords": ["商品", "product", "item", "goods", "merchandise", "产品"],
                "related_concepts": ["库存", "价格", "分类", "品牌", "规格"]
            },
            "支付财务": {
                "keywords": ["支付", "payment", "pay", "billing", "财务", "金额", "费用"],
                "related_concepts": ["账单", "发票", "退款", "优惠", "折扣"]
            },
            "车辆管理": {
                "keywords": ["车辆", "vehicle", "car", "truck", "汽车", "货车"],
                "related_concepts": ["司机", "加油", "维修", "保险", "运输"]
            },
            "物流运输": {
                "keywords": ["物流", "logistics", "运输", "transport", "配送", "发货"],
                "related_concepts": ["仓库", "路线", "司机", "车辆", "收货"]
            },
            "航空管理": {
                "keywords": ["航空", "aviation", "aircraft", "airplane", "飞机", "机场", "airport"],
                "related_concepts": ["起降", "跑道", "候机楼", "塔台", "航站楼", "机坪"]
            },
            "航班运营": {
                "keywords": ["航班", "flight", "班次", "航线", "route", "起飞", "降落"],
                "related_concepts": ["时刻表", "延误", "取消", "准点率", "机型", "座位"]
            },
            "航油管理": {
                "keywords": ["航油", "fuel", "燃油", "油料", "加油", "航空煤油"],
                "related_concepts": ["油耗", "消耗", "效率", "成本", "油箱", "补给"]
            },
            "机型设备": {
                "keywords": ["机型", "aircraft_type", "boeing", "airbus", "B737", "A320", "设备"],
                "related_concepts": ["维修", "保养", "检修", "零件", "性能", "配置"]
            },
            "航空数据": {
                "keywords": ["架次", "frequency", "passenger", "乘客", "载客", "货运"],
                "related_concepts": ["客座率", "载重", "里程", "飞行时间", "统计", "分析"]
            }
        }
        
        # 查询意图模式
        self.intent_patterns = {
            "统计分析": ["统计", "分析", "汇总", "报表", "趋势", "对比"],
            "详细查询": ["详细", "明细", "列表", "记录", "信息"],
            "关联查询": ["关联", "关系", "相关", "对应", "匹配"],
            "时间查询": ["时间", "日期", "期间", "最近", "当前", "年", "月", "日", "周", "季度", "小时", "分钟", "秒", "历史"]
        }
    
    def recognize_entities(self, query: str, table_name: str) -> List[str]:
        """识别查询中的业务实体"""
        recognized = []
        query_lower = query.lower()
        if table_name:
            # 如果指定了表名，将表名作为实体
            recognized.append(table_name)
        for domain, info in self.domain_keywords.items():
            # 检查主关键词
            if any(keyword in query for keyword in info["keywords"]):
                recognized.append(domain)
            # 检查相关概念
            elif any(concept in query for concept in info["related_concepts"]):
                recognized.append(domain)
        
        return recognized
    
    def analyze_query_intent(self, query: str, table_name: str) -> Intent:
        """分析查询意图"""
        # 识别实体
        entities = self.recognize_entities(query, table_name)
        
        # 分析意图类型
        intent_types = []
        for intent_type, patterns in self.intent_patterns.items():
            if any(pattern in query for pattern in patterns):
                intent_types.append(intent_type)
        
        # 判断是否需要关联查询
        relation_indicators = ["关联", "相关", "统计", "分析", "明细", "对应"]
        requires_relations = any(indicator in query for indicator in relation_indicators)
        
        # 判断复杂度
        if len(entities) > 1 or requires_relations:
            complexity_level = "complex"
        elif intent_types:
            complexity_level = "medium"
        else:
            complexity_level = "simple"
            
        # 判断是否有效
        valid = bool(entities and intent_types)
        
        # 创建Intent对象
        intent = Intent(
            entities=entities,
            intent_types=intent_types,
            requires_relations=requires_relations,
            complexity_level=complexity_level,
            valid=valid,
            confidence_score=0.8 if valid else 0.2
        )
        
        return intent

    
