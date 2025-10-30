# 航油合同审查 API 输出示例

## API 端点
```
POST http://your-n8n-domain/webhook/contract-review
```

## 输入格式
```json
{
  "contractId": "HY-2024-001",
  "supplierName": "中国航油集团公司",
  "contractAmount": 50000000,
  "contractText": "合同全文内容..."
}
```

## 输出格式

### 成功响应示例

```json
{
  "success": true,
  "timestamp": "2024-10-30T08:30:00.000Z",
  
  "contractInfo": {
    "contractId": "HY-2024-001",
    "partyA": "中国航油集团公司",
    "partyB": "XX航空股份有限公司",
    "amount": "5000万元",
    "signDate": "2024-10-15",
    "duration": "2024-11-01 至 2025-10-31",
    "quantity": "10000吨",
    "deliveryLocation": "北京首都国际机场油库"
  },
  
  "summary": {
    "totalScore": 81,
    "scoreGrade": "良好",
    "riskLevel": "中低风险",
    "recommendation": "建议签署（需修改部分条款后再签）",
    "keyIssues": [
      "价格调整机制需要进一步明确",
      "争议解决条款缺失，必须补充",
      "建议增加供应保障的具体违约责任"
    ],
    "nextActions": [
      "与供应商协商补充争议解决条款",
      "明确价格调整的触发条件和计算方式",
      "要求供应商提供资质证明和业绩案例",
      "建议购买货物运输保险"
    ]
  },
  
  "reviewDetails": {
    "compliantClauses": [
      "✅ 明确标注为航空燃油产品",
      "✅ 包含质量标准条款（ASTM D1655）",
      "✅ 价格条款明确，与国际油价挂钩",
      "✅ 包含安全管理条款"
    ],
    "attentionClauses": [
      "⚠️ 价格调整机制需进一步明确触发条件",
      "⚠️ 建议补充延迟交付的具体违约金比例",
      "⚠️ 付款账期较长，建议增加保障措施"
    ],
    "problematicClauses": [
      "❌ 缺少明确的争议解决条款",
      "❌ 未约定质量争议的仲裁机构",
      "❌ 不可抗力条款不够完整"
    ],
    "optimizationSuggestions": [
      "💡 建议增加价格保护条款，设定价格波动上限为±10%",
      "💡 建议补充不可抗力的具体情形和责任分担",
      "💡 建议增加供应商的履约保证金条款",
      "💡 建议明确油品储存和运输的安全责任"
    ]
  },
  
  "riskAssessment": {
    "价格风险": {
      "评分": 65,
      "等级": "中等",
      "说明": "价格与国际油价挂钩，存在一定波动风险，建议增加价格保护机制"
    },
    "供应风险": {
      "评分": 40,
      "等级": "低",
      "说明": "供应商具备充足供应能力和应急机制"
    },
    "质量风险": {
      "评分": 35,
      "等级": "低",
      "说明": "质量标准明确，采用国际标准ASTM D1655"
    },
    "法律风险": {
      "评分": 55,
      "等级": "中等",
      "说明": "部分法律条款不够完整，需补充争议解决和不可抗力条款"
    },
    "财务风险": {
      "评分": 50,
      "等级": "中等",
      "说明": "付款方式为30天账期，金额较大，建议增加账期保护机制"
    }
  },
  
  "complianceCheck": {
    "总体合规性": "基本合规",
    "合规项数量": 5,
    "不合规项数量": 2,
    "建议补充项数量": 3,
    "关键问题": [
      "缺少争议解决条款",
      "未明确质量标准检测机构"
    ]
  },
  
  "modificationSuggestions": [
    {
      "条款": "第三条 价格条款",
      "问题": "价格调整机制不够明确",
      "建议": "建议增加：'当国际油价（以布伦特原油期货价格为准）波动超过±10%时，双方协商调整价格，调整幅度不超过基准价的±8%，每季度调整一次'"
    },
    {
      "条款": "第七条 争议解决",
      "问题": "缺少争议解决条款",
      "建议": "建议增加：'因本合同引起的或与本合同有关的任何争议，均提交中国国际经济贸易仲裁委员会（CIETAC），按照申请仲裁时该会现行有效的仲裁规则进行仲裁，仲裁地点为北京'"
    },
    {
      "条款": "第五条 交付条款",
      "问题": "延迟交付违约责任不明确",
      "建议": "建议补充：'如供应商延迟交付，每延迟一天，按延迟交付部分合同金额的0.5%支付违约金，累计不超过延迟交付部分合同金额的10%'"
    }
  ],
  
  "fullReport": {
    "合同基本信息": { "...": "完整的原始JSON数据" },
    "详细审查意见": { "...": "..." },
    "风险评估": { "...": "..." },
    "合规性检查": { "...": "..." },
    "修改建议": [ "..." ],
    "总体评估": { "...": "..." }
  },
  
  "message": "合同审查完成 - 评分: 81分, 风险: 中低风险"
}
```

## 字段说明

### 1. `contractInfo` - 合同基本信息
从合同中提取的关键信息，包括合同编号、甲乙方、金额、日期等。

### 2. `summary` - 总体评估（快速访问）
- `totalScore`: 综合评分（0-100）
- `scoreGrade`: 评分等级（优秀/良好/一般/较差/不合格）
- `riskLevel`: 风险等级（低风险/中低风险/中风险/中高风险/高风险）
- `recommendation`: 建议操作
- `keyIssues`: 关键问题列表（数组）
- `nextActions`: 后续建议列表（数组）

### 3. `reviewDetails` - 详细审查意见
- `compliantClauses`: 合规条款（✅ 标记）
- `attentionClauses`: 需要注意的条款（⚠️ 标记）
- `problematicClauses`: 问题条款（❌ 标记）
- `optimizationSuggestions`: 优化建议（💡 标记）

### 4. `riskAssessment` - 风险评估
包含五个维度的风险评分：
- 价格风险
- 供应风险
- 质量风险
- 法律风险
- 财务风险

每个风险维度包含：评分（0-100）、等级、说明

### 5. `complianceCheck` - 合规性检查
- 总体合规性（合规/基本合规/不合规）
- 合规项、不合规项、建议补充项的数量
- 关键问题列表

### 6. `modificationSuggestions` - 修改建议
数组，每个建议包含：
- `条款`: 需要修改的条款名称
- `问题`: 存在的问题描述
- `建议`: 具体的修改建议

### 7. `fullReport` - 完整报告
AI 输出的完整 JSON 数据，包含所有原始信息，供前端完整展示。

## 评分标准

### 综合评分
- **90-100分**: 优秀 - 建议签署
- **70-89分**: 良好 - 可签署
- **50-69分**: 一般 - 需改进后签署
- **30-49分**: 较差 - 建议重新谈判
- **0-29分**: 不合格 - 不建议签署

### 风险等级
- **低风险**: 风险评分 < 30
- **中低风险**: 风险评分 30-45
- **中风险**: 风险评分 45-60
- **中高风险**: 风险评分 60-75
- **高风险**: 风险评分 > 75

## 错误响应

```json
{
  "success": false,
  "timestamp": "2024-10-30T08:30:00.000Z",
  "error": "JSON 解析失败",
  "rawOutput": "AI的原始输出内容...",
  "message": "AI 输出格式错误，请检查"
}
```

## 前端使用建议

### 1. 首页展示卡片
```javascript
// 显示关键指标
const { totalScore, scoreGrade, riskLevel, recommendation } = response.summary;

// 可以用不同颜色标识风险等级
const getRiskColor = (level) => {
  if (level.includes('低')) return 'green';
  if (level.includes('中')) return 'yellow';
  if (level.includes('高')) return 'red';
};
```

### 2. 合同信息展示
```javascript
const { contractId, partyA, partyB, amount, signDate } = response.contractInfo;
```

### 3. 审查意见列表
```javascript
const { compliantClauses, attentionClauses, problematicClauses } = response.reviewDetails;

// 分类展示，用不同图标和颜色区分
```

### 4. 风险雷达图
```javascript
const risks = response.riskAssessment;
// 绘制五维雷达图：价格、供应、质量、法律、财务
```

### 5. 修改建议表格
```javascript
response.modificationSuggestions.map(suggestion => ({
  clause: suggestion.条款,
  issue: suggestion.问题,
  recommendation: suggestion.建议
}));
```

## 注意事项

1. **JSON 解析**：AI 输出可能包含 Markdown 代码块，格式化节点会自动提取并解析
2. **容错处理**：如果 AI 输出格式不正确，会返回 `success: false` 和错误信息
3. **中文字段**：fullReport 保留中文字段名，其他字段使用英文驼峰命名便于前端使用
4. **数组字段**：所有数组字段都保证非空，至少包含 1-2 条内容
5. **评分范围**：综合评分和各项风险评分均为 0-100 的整数

## 测试建议

使用 Postman 或 curl 测试：

```bash
curl -X POST http://your-n8n-domain/webhook/contract-review \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "TEST-001",
    "supplierName": "测试供应商",
    "contractAmount": 1000000,
    "contractText": "这是一份测试合同..."
  }'
```

