# 航油采购合规检查工具 - 优化版（精简输出）
import json
import re

def check_compliance(contract_text):
    """
    合规性检查
    """
    compliance_report = {
        "总体合规性": "待评估",
        "合规项": [],
        "不合规项": [],
        "建议补充项": []
    }
    
    # 民航法规检查
    if "航空燃油" in contract_text or "航油" in contract_text:
        compliance_report["合规项"].append("明确航油产品类型")
    else:
        compliance_report["不合规项"].append("未标注航油产品")
    
    # 质量标准检查
    quality_standards = ["ASTM", "D1655", "GB", "国标", "质量标准"]
    if any(std in contract_text for std in quality_standards):
        compliance_report["合规项"].append("包含质量标准")
    else:
        compliance_report["不合规项"].append("缺少质量标准")
    
    # 安全条款检查
    safety_keywords = ["安全", "危险品", "消防", "应急"]
    if any(kw in contract_text for kw in safety_keywords):
        compliance_report["合规项"].append("包含安全条款")
    else:
        compliance_report["建议补充项"].append("安全生产条款")
    
    # 环保要求检查
    env_keywords = ["环保", "排放", "环境保护"]
    if any(kw in contract_text for kw in env_keywords):
        compliance_report["合规项"].append("包含环保要求")
    else:
        compliance_report["建议补充项"].append("环保条款")
    
    # 保险条款检查
    if "保险" in contract_text:
        compliance_report["合规项"].append("包含保险条款")
    else:
        compliance_report["建议补充项"].append("保险条款")
    
    # 争议解决检查
    dispute_keywords = ["仲裁", "诉讼", "管辖", "争议解决"]
    if any(kw in contract_text for kw in dispute_keywords):
        compliance_report["合规项"].append("明确争议解决")
    else:
        compliance_report["不合规项"].append("缺少争议解决条款")
    
    # 反商业贿赂检查
    if "反商业贿赂" in contract_text or "廉洁" in contract_text:
        compliance_report["合规项"].append("包含廉洁条款")
    else:
        compliance_report["建议补充项"].append("反商业贿赂条款")
    
    # 评估总体合规性
    total_items = len(compliance_report["合规项"]) + len(compliance_report["不合规项"])
    compliance_rate = len(compliance_report["合规项"]) / total_items if total_items > 0 else 0
    
    if compliance_rate >= 0.8:
        compliance_report["总体合规性"] = "合规"
    elif compliance_rate >= 0.6:
        compliance_report["总体合规性"] = "基本合规"
    else:
        compliance_report["总体合规性"] = "不合规"
    
    return compliance_report

# n8n AI Agent Tool 调用接口
contract_text = _input.first().json.get('contractText', '')

# 执行合规检查
result = check_compliance(contract_text)

# 生成精简的文字摘要
合规项列表 = "、".join(result['合规项'][:5]) if result['合规项'] else "无"
不合规项列表 = "、".join(result['不合规项']) if result['不合规项'] else "无"
建议项列表 = "、".join(result['建议补充项'][:3]) if result['建议补充项'] else "无"

summary = f"""【合规检查】{result['总体合规性']}
✓ 合规项：{合规项列表}
✗ 不合规：{不合规项列表}
⚠ 建议补充：{建议项列表}"""

# 返回精简文字
return summary.strip()


