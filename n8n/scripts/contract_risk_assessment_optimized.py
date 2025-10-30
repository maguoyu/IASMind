# 合同风险评估工具 - 优化版（精简输出，减少 Token）
import json
import re

def assess_contract_risks(contract_text, contract_amount):
    """
    评估合同风险
    """
    risks = {
        "总体风险评分": 0,
        "价格风险": {"评分": 0, "说明": ""},
        "供应风险": {"评分": 0, "说明": ""},
        "质量风险": {"评分": 0, "说明": ""},
        "法律风险": {"评分": 0, "说明": ""},
        "财务风险": {"评分": 0, "说明": ""}
    }
    
    # 价格风险评估
    price_keywords = ["价格调整", "浮动", "国际油价", "市场价", "价格保护"]
    price_risk = 70  # 默认中等风险
    if any(kw in contract_text for kw in price_keywords):
        price_risk = 50  # 有价格保护机制，降低风险
    if "固定价格" in contract_text:
        price_risk = 30  # 固定价格，低风险
    risks["价格风险"]["评分"] = price_risk
    risks["价格风险"]["说明"] = f"{'低' if price_risk < 40 else '中' if price_risk < 70 else '高'}风险"
    
    # 供应风险评估
    supply_keywords = ["保证供应", "备用供应", "供应保障", "紧急供应"]
    supply_risk = 60
    if any(kw in contract_text for kw in supply_keywords):
        supply_risk = 40
    risks["供应风险"]["评分"] = supply_risk
    risks["供应风险"]["说明"] = f"{'低' if supply_risk < 40 else '中' if supply_risk < 70 else '高'}风险"
    
    # 质量风险评估
    quality_keywords = ["ASTM", "GB", "国标", "质量标准", "检测", "质检"]
    quality_risk = 80
    if any(kw in contract_text for kw in quality_keywords):
        quality_risk = 35
    risks["质量风险"]["评分"] = quality_risk
    risks["质量风险"]["说明"] = f"{'低' if quality_risk < 40 else '中' if quality_risk < 70 else '高'}风险"
    
    # 法律风险评估
    legal_keywords = ["仲裁", "管辖", "适用法律", "违约责任", "赔偿"]
    legal_risk = 70
    legal_count = sum(1 for kw in legal_keywords if kw in contract_text)
    if legal_count >= 4:
        legal_risk = 30
    elif legal_count >= 2:
        legal_risk = 50
    risks["法律风险"]["评分"] = legal_risk
    risks["法律风险"]["说明"] = f"条款完整性{legal_count}/5"
    
    # 财务风险评估
    payment_keywords = ["账期", "付款", "预付", "信用证", "保证金"]
    financial_risk = 60
    if "预付" in contract_text and contract_amount > 10000000:  # 大额预付高风险
        financial_risk = 80
    elif "账期" in contract_text or "信用证" in contract_text:
        financial_risk = 40
    risks["财务风险"]["评分"] = financial_risk
    risks["财务风险"]["说明"] = f"{'低' if financial_risk < 40 else '中' if financial_risk < 70 else '高'}风险"
    
    # 计算总体风险
    total_risk = (price_risk + supply_risk + quality_risk + legal_risk + financial_risk) / 5
    risks["总体风险评分"] = round(total_risk, 1)
    
    return risks

# n8n AI Agent Tool 调用接口
# 获取输入数据
contract_text = _input.first().json.get('contractText', '')
contract_amount = _input.first().json.get('contractAmount', 0)

# 执行风险评估
result = assess_contract_risks(contract_text, contract_amount)

# 生成精简的文字摘要（减少 Token 使用）
total = result['总体风险评分']
level = "低风险" if total < 40 else "中等风险" if total < 70 else "高风险"

summary = f"""【风险评估】总体：{total}分（{level}）
• 价格：{result['价格风险']['评分']}分-{result['价格风险']['说明']}
• 供应：{result['供应风险']['评分']}分-{result['供应风险']['说明']}
• 质量：{result['质量风险']['评分']}分-{result['质量风险']['说明']}
• 法律：{result['法律风险']['评分']}分-{result['法律风险']['说明']}
• 财务：{result['财务风险']['评分']}分-{result['财务风险']['说明']}"""

# 返回精简文字（而非完整 JSON）
return summary.strip()


