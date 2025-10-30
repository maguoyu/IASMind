# 合同条款提取工具 - 优化版（精简输出）
import json
import re

def extract_contract_terms(contract_text):
    """
    提取合同关键条款
    """
    terms = {
        "商务条款": {},
        "质量条款": {},
        "交付条款": {},
        "付款条款": {},
        "法律条款": {}
    }
    
    # 提取价格信息
    price_pattern = r'(\d+\.?\d*)\s*(元|美元|USD|CNY)\s*[/／](吨|升|L)'
    price_match = re.search(price_pattern, contract_text)
    if price_match:
        terms["商务条款"]["单价"] = price_match.group(0)
    
    # 提取数量信息
    quantity_pattern = r'(\d+\.?\d*)\s*(吨|升|L|千升)'
    quantity_matches = re.findall(quantity_pattern, contract_text)
    if quantity_matches:
        terms["商务条款"]["采购数量"] = quantity_matches[0][0] + quantity_matches[0][1]
    
    # 提取合同金额
    amount_pattern = r'(\d+,?\d*\.?\d*)\s*(万元|元|美元|USD)'
    amount_match = re.search(amount_pattern, contract_text)
    if amount_match:
        terms["商务条款"]["合同金额"] = amount_match.group(0)
    
    # 提取质量标准
    quality_keywords = ["ASTM D1655", "GB 6537", "国标", "质量标准"]
    for kw in quality_keywords:
        if kw in contract_text:
            terms["质量条款"]["质量标准"] = kw
            break
    
    # 提取交付地点
    location_pattern = r'交付地点[：:](.*?)([。\n，]|$)'
    location_match = re.search(location_pattern, contract_text)
    if location_match:
        terms["交付条款"]["交付地点"] = location_match.group(1).strip()
    
    # 提取付款方式
    payment_keywords = {
        "账期": r'(\d+)天?账期',
        "预付": r'预付(\d+)%',
        "信用证": "信用证"
    }
    for key, pattern in payment_keywords.items():
        match = re.search(pattern, contract_text)
        if match:
            terms["付款条款"]["付款方式"] = match.group(0)
            break
    
    # 提取违约金条款
    penalty_pattern = r'违约金.{0,20}(\d+\.?\d*)%'
    penalty_match = re.search(penalty_pattern, contract_text)
    if penalty_match:
        terms["法律条款"]["违约金"] = penalty_match.group(1) + "%"
    
    # 提取仲裁条款
    if "仲裁" in contract_text:
        arbitration_pattern = r'仲裁.{0,30}?([\u4e00-\u9fa5]+仲裁)'
        arb_match = re.search(arbitration_pattern, contract_text)
        if arb_match:
            terms["法律条款"]["争议解决"] = arb_match.group(1)
    
    return terms

# n8n AI Agent Tool 调用接口
contract_text = _input.first().json.get('contractText', '')

# 执行条款提取
result = extract_contract_terms(contract_text)

# 生成精简的文字摘要
def get_value(d, *keys):
    """安全获取嵌套字典的值"""
    for key in keys:
        if isinstance(d, dict):
            d = d.get(key, '')
        else:
            return '未提取'
    return d or '未提取'

summary = f"""【关键条款】
• 单价：{get_value(result, '商务条款', '单价')}
• 数量：{get_value(result, '商务条款', '采购数量')}
• 金额：{get_value(result, '商务条款', '合同金额')}
• 质量：{get_value(result, '质量条款', '质量标准')}
• 交付：{get_value(result, '交付条款', '交付地点')}
• 付款：{get_value(result, '付款条款', '付款方式')}
• 违约金：{get_value(result, '法律条款', '违约金')}
• 争议：{get_value(result, '法律条款', '争议解决')}"""

# 返回精简文字
return summary.strip()


