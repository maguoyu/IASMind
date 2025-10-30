# n8n AI Agent Tool 正确格式说明（最终版）

## 🎯 关键发现

n8n AI Agent 的 Python Code Tool 使用的是 **直接 `return` 字符串** 的模式，而不是设置 `_result`！

## ✅ 正确的代码模式

### 官方示例
```python
# Example: convert the incoming query to uppercase and return it
return query.upper()
```

### 我们的实现

```python
# 合同风险评估工具
import json
import re

def assess_contract_risks(contract_text, contract_amount):
    """评估合同风险"""
    risks = {
        "总体风险评分": 70,
        "价格风险": {"评分": 60, "说明": "..."}
    }
    return risks  # 函数返回字典

# n8n AI Agent Tool 调用接口
# 获取输入数据（AI Agent 会传入 contractText 和 contractAmount）
contract_text = _input.first().json.get('contractText', '')
contract_amount = _input.first().json.get('contractAmount', 0)

# 执行风险评估
result = assess_contract_risks(contract_text, contract_amount)

# AI Agent Tool 直接返回字符串（JSON 格式）
return json.dumps(result, ensure_ascii=False, indent=2)
```

## 📊 完整对照

| 元素 | ❌ 错误做法 | ✅ 正确做法 |
|------|-----------|-----------|
| **输入方式** | `for item in _input.all():` | `_input.first().json.get('field')` |
| **输出方式** | `_result = {...}` | `return "字符串"` |
| **循环处理** | `for item in _input.all():` | 不需要循环 |
| **返回格式** | `{"response": "..."}` | 直接返回字符串 |

## 🔑 核心要点

### 1. 输入数据访问

```python
# ✅ 正确：使用 _input.first().json.get()
contract_text = _input.first().json.get('contractText', '')
contract_amount = _input.first().json.get('contractAmount', 0)

# ❌ 错误：不要用 _input.all() 循环
for item in _input.all():
    contract_text = item.get('contractText', '')
```

**原因**: AI Agent Tool 每次调用只处理一个输入项，使用 `first()` 即可。

### 2. 输出方式

```python
# ✅ 正确：直接 return 字符串
return json.dumps(result, ensure_ascii=False, indent=2)

# ❌ 错误：不要设置 _result
_result = {"response": json.dumps(result)}
```

**原因**: AI Agent Tool 期望函数直接返回字符串结果。

### 3. 返回的字符串格式

```python
# ✅ 推荐：返回格式化的 JSON 字符串
return json.dumps(result, ensure_ascii=False, indent=2)

# ✅ 也可以：返回普通文本
return "合同风险评分：70分，属于中等风险"

# ✅ 也可以：返回 Markdown 格式
return "## 风险评估结果\n\n总体风险：70分"
```

**为什么用 JSON 字符串？**
- 结构化数据易于 AI 理解
- `indent=2` 提供良好的可读性
- `ensure_ascii=False` 保留中文字符

## 🔄 完整的执行流程

```
1. AI Agent 调用工具
   ↓
2. 工具接收输入：_input.first().json.get('field')
   ↓
3. 执行处理逻辑：result = process_data(...)
   ↓
4. 返回字符串：return json.dumps(result, ensure_ascii=False, indent=2)
   ↓
5. AI Agent 接收并理解返回的字符串
```

## 📝 三个工具的正确实现

### 1. 合同风险评估工具

```python
# 获取输入
contract_text = _input.first().json.get('contractText', '')
contract_amount = _input.first().json.get('contractAmount', 0)

# 处理
result = assess_contract_risks(contract_text, contract_amount)

# 返回
return json.dumps(result, ensure_ascii=False, indent=2)
```

### 2. 合规检查工具

```python
# 获取输入
contract_text = _input.first().json.get('contractText', '')

# 处理
result = check_compliance(contract_text)

# 返回
return json.dumps(result, ensure_ascii=False, indent=2)
```

### 3. 条款提取工具

```python
# 获取输入
contract_text = _input.first().json.get('contractText', '')

# 处理
result = extract_contract_terms(contract_text)

# 返回
return json.dumps(result, ensure_ascii=False, indent=2)
```

## 🚫 常见错误

### 错误 1: 使用 _result

```python
# ❌ 错误
_result = {"response": json.dumps(result)}

# ✅ 正确
return json.dumps(result, ensure_ascii=False, indent=2)
```

### 错误 2: 使用循环处理

```python
# ❌ 错误
for item in _input.all():
    contract_text = item.get('contractText', '')
    result = process(contract_text)
    return json.dumps(result)  # return 在循环内

# ✅ 正确
contract_text = _input.first().json.get('contractText', '')
result = process(contract_text)
return json.dumps(result, ensure_ascii=False, indent=2)
```

### 错误 3: 返回字典对象

```python
# ❌ 错误：返回字典
result = {"key": "value"}
return result  # 这是字典，不是字符串

# ✅ 正确：转换为 JSON 字符串
result = {"key": "value"}
return json.dumps(result, ensure_ascii=False, indent=2)
```

## 🧪 测试你的代码

在 n8n AI Agent Tool 中测试：

```python
# 添加调试输出
contract_text = _input.first().json.get('contractText', '')
print(f"输入文本: {contract_text[:50]}...")  # 打印前50个字符

result = assess_contract_risks(contract_text, 1000000)
print(f"结果类型: {type(result)}")  # 应该是 <class 'dict'>

output = json.dumps(result, ensure_ascii=False, indent=2)
print(f"输出类型: {type(output)}")  # 应该是 <class 'str'>
print(f"输出内容:\n{output}")

return output
```

## ✅ 验证清单

在部署前确认：

- [ ] 使用 `_input.first().json.get()` 获取输入
- [ ] 不使用 `for` 循环遍历 `_input.all()`
- [ ] 使用 `return` 语句返回结果
- [ ] 不设置 `_result` 变量
- [ ] 返回的是字符串，不是字典或其他对象
- [ ] 如果返回结构化数据，使用 `json.dumps()` 转换
- [ ] 使用 `ensure_ascii=False` 保留中文
- [ ] 使用 `indent=2` 提高可读性

## 🎉 总结

**AI Agent Tool 的三个黄金规则**:

1. **输入**: 使用 `_input.first().json.get('field')`
2. **处理**: 调用你的函数处理数据
3. **输出**: `return json.dumps(result, ensure_ascii=False, indent=2)`

就这么简单！🚀

---

**最后更新**: 2025-10-30  
**适用版本**: n8n 1.116.2  
**节点类型**: `@n8n/n8n-nodes-langchain.toolCode`  
**状态**: ✅ 已验证正确


