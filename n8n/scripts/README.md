# n8n 航油采购合同审查工作流 - Python 脚本

这个目录包含了工作流中使用的三个 Python 工具脚本。

## 📁 文件列表

### 1. contract_risk_assessment.py
**合同风险评估工具**
- 评估5类风险：价格、供应、质量、法律、财务
- 输出量化风险评分（0-100）

### 2. compliance_checker.py
**航油采购合规检查工具**
- 检查民航法规、安全、环保等合规性
- 输出合规性报告和建议

### 3. terms_extractor.py
**合同条款提取工具**
- 使用正则表达式提取关键条款
- 输出结构化的合同信息

## 🔧 使用方法

### 方法1：在 n8n 中直接使用（推荐）

1. 在 n8n 中导入 `aviation-fuel-contract-review.json`
2. Python 代码已经嵌入在工作流中
3. 直接激活工作流即可使用

### 方法2：从独立文件复制代码

如果需要修改代码：

1. **编辑 Python 文件**
   ```bash
   cd /home/magy/IASMind/n8n/scripts
   vim contract_risk_assessment.py  # 或使用其他编辑器
   ```

2. **复制到 n8n**
   - 打开 n8n 工作流
   - 找到对应的 Code Tool 节点
   - 复制整个 Python 文件内容
   - 粘贴到节点的代码编辑器中

3. **保存并测试**

## 📋 代码说明

### n8n 特殊语法

在这些脚本中，以下是 n8n 特有的语法（**已修复为正确的 Python 语法**）：

```python
# 获取输入数据（n8n Python Code Tool 正确语法）
for item in _input.all():
    contract_text = item.get('contractText', '')
    contract_amount = item.get('contractAmount', 0)
    
    result = assess_contract_risks(contract_text, contract_amount)
    # 返回结果给 n8n
    _result = {'riskAssessment': result}
```

⚠️ **重要说明**:
- `_input.all()` - 获取所有输入项（注意是下划线开头）
- `item.get('key', default)` - 从输入项获取数据
- `_result = {...}` - 设置输出结果（注意是下划线开头）
- ❌ **不要使用** JavaScript 语法如 `$input.first().json.get()`
- ✅ **AI Agent Tool 专用格式**: `_result = {"response": json.dumps(data)}`
- 这些文件只能在 n8n 的 Code Tool 节点中使用，不能直接在标准 Python 环境运行

## 🧪 本地测试

如果想在本地测试逻辑（不包含 n8n 语法），可以修改为：

```python
# 测试用的标准 Python 代码
if __name__ == "__main__":
    test_contract = "航油采购合同，采购数量5000吨，单价8500元/吨"
    test_amount = 42500000
    
    result = assess_contract_risks(test_contract, test_amount)
    print(result)
```

## 🔧 n8n Python vs JavaScript 语法对照

| 操作 | ❌ JavaScript 语法（错误） | ✅ Python 语法（正确） |
|------|--------------------------|----------------------|
| 获取输入 | `$input.first()` | `_input.all()` |
| 访问数据 | `$json.body.field` | `item.get('field')` |
| 返回结果（普通） | `return {'json': data}` | `_result = data` |
| 返回结果（AI Agent） | - | `_result = {"response": json.dumps(data)}` |
| 循环输入 | `$input.all()` | `for item in _input.all():` |

## 🎯 AI Agent Tool 输出格式（重要！）

这三个工具是为 **AI Agent** 设计的，必须使用特定的输出格式：

```python
# ✅ 正确的 AI Agent Tool 输出格式
for item in _input.all():
    result = my_function(...)  # 函数返回字典对象
    
    # 包装成 AI Agent 可以理解的格式
    _result = {
        "response": json.dumps(result, ensure_ascii=False, indent=2)
    }
```

**为什么这样？**
- AI Agent 需要读取工具的执行结果
- `response` 字段包含字符串形式的结果
- `json.dumps()` 将字典转换为格式化的 JSON 字符串
- AI 可以理解和解析这个字符串

**详细说明**: 查看 `AI_Agent_Tool输出格式说明.md`

## 🔄 从 JSON 导入到 n8n

**正确的导入流程：**

1. 打开 n8n Web 界面
2. 点击右上角 **"菜单"** → **"Import from File"**
3. 选择 `/home/magy/IASMind/n8n/workflow/aviation-fuel-contract-review.json`
4. 点击 **"Import"**
5. n8n 会自动解析 JSON 中的转义字符，还原多行代码

**❌ 不要这样做：**
- 不要直接复制 JSON 文本到节点
- 不要手动编辑 JSON 中的 `\n` 转义字符
- 不要使用文本编辑器打开 JSON 后再粘贴

## 📊 JSON 中的代码格式

在 JSON 文件中，Python 代码是这样存储的：

```json
{
  "parameters": {
    "name": "ContractRiskAssessment",
    "code": "# 合同风险评估工具\nimport json\nimport re\n\ndef assess_contract_risks..."
  }
}
```

这是正常的 JSON 格式：
- `\n` 代表换行符
- `\"` 代表双引号
- 代码被压缩成一行

当通过 n8n UI 导入时，会自动解析成多行格式！

## 🆘 常见问题

### Q: 为什么我复制 JSON 后代码丢失了？
**A**: 你可能直接复制了 JSON 文本。正确方法是使用 n8n 的 "Import from File" 功能。

### Q: 如何修改代码？
**A**: 
1. 在 n8n 中导入工作流
2. 双击对应的 Code Tool 节点
3. 直接在代码编辑器中修改
4. 或者修改这里的 .py 文件，然后复制到 n8n

### Q: 代码可以在 IDE 中编辑吗？
**A**: 可以！你可以在 IDE 中编辑这些 .py 文件，但要注意 n8n 的特殊语法（`$input` 等）。

## 📚 相关资源

- [n8n 官方文档](https://docs.n8n.io/)
- [n8n Code Node 文档](https://docs.n8n.io/code/builtin/code-node/)
- [工作流 JSON 位置](../workflow/aviation-fuel-contract-review.json)

