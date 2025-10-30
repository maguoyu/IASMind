# n8n AI Agent Tool 输出格式说明

## 🎯 关键要点

当 Python Code Tool 被 **AI Agent** 调用时，输出格式必须是：

```python
_result = {
    "response": "字符串内容"
}
```

## 🔴 错误信息解析

### 错误 1: `Wrong output type returned`
**原因**: `_result` 不是字典对象

### 错误 2: `The response property should be a string, but it is an undefined`
**原因**: `_result` 缺少 `response` 字段，或 `response` 的值不是字符串

## 📊 正确 vs 错误的对照

### ❌ 错误做法 1：直接返回字典对象

```python
# 这是给普通 Code 节点用的，不是给 AI Agent Tool 用的
for item in _input.all():
    result = {"key": "value"}
    _result = result  # ❌ AI Agent 无法理解
```

**问题**: AI Agent 需要一个字符串来理解工具的执行结果

### ❌ 错误做法 2：返回 JSON 字符串但没有 response 字段

```python
for item in _input.all():
    result = {"key": "value"}
    _result = json.dumps(result)  # ❌ 缺少 response 字段
```

**问题**: 没有 `response` 字段，n8n 会报错

### ✅ 正确做法：返回带 response 字段的字典

```python
for item in _input.all():
    result = {"key": "value"}
    # ✅ 正确格式
    _result = {
        "response": json.dumps(result, ensure_ascii=False, indent=2)
    }
```

**为什么正确**:
1. `_result` 是一个字典对象 ✅
2. 字典有 `response` 字段 ✅
3. `response` 的值是字符串（JSON 格式） ✅
4. AI 可以读取和理解这个字符串 ✅

## 🔧 完整的代码模式

### 模式 1: 返回结构化数据

```python
import json

def my_tool_function(input_data):
    """处理逻辑"""
    result = {
        "status": "success",
        "data": {
            "field1": "value1",
            "field2": 123
        }
    }
    return result  # 返回字典

# n8n AI Agent Tool 接口
for item in _input.all():
    input_data = item.get('someField', '')
    
    result = my_tool_function(input_data)
    
    # 关键：包装成 {"response": "字符串"} 格式
    _result = {
        "response": json.dumps(result, ensure_ascii=False, indent=2)
    }
```

### 模式 2: 返回描述性文本

```python
import json

def my_tool_function(input_data):
    """处理逻辑"""
    # 如果结果本身就是描述性的
    description = "处理完成，共发现 5 个问题"
    data = {
        "summary": description,
        "count": 5
    }
    return data

# n8n AI Agent Tool 接口
for item in _input.all():
    input_data = item.get('someField', '')
    
    result = my_tool_function(input_data)
    
    # 将结构化数据转换为格式化的 JSON 字符串
    _result = {
        "response": json.dumps(result, ensure_ascii=False, indent=2)
    }
```

### 模式 3: 返回纯文本（如果工具输出就是文本）

```python
def my_tool_function(input_data):
    """处理逻辑"""
    # 如果工具就是要返回一段文本
    return "这是分析结果：风险等级为中等"

# n8n AI Agent Tool 接口
for item in _input.all():
    input_data = item.get('someField', '')
    
    result = my_tool_function(input_data)
    
    # 直接使用文本字符串
    _result = {
        "response": result
    }
```

## 📋 航油合同审查工具的实现

### 风险评估工具

```python
# 函数返回字典
def assess_contract_risks(contract_text, contract_amount):
    risks = {
        "总体风险评分": 70,
        "价格风险": {"评分": 60, "说明": "..."}
    }
    return risks  # 字典对象

# n8n 接口
for item in _input.all():
    contract_text = item.get('contractText', '')
    contract_amount = item.get('contractAmount', 0)
    
    result = assess_contract_risks(contract_text, contract_amount)
    
    # 转换为 JSON 字符串供 AI 阅读
    _result = {
        "response": json.dumps(result, ensure_ascii=False, indent=2)
    }
```

**AI 会看到**:
```json
{
  "总体风险评分": 70,
  "价格风险": {
    "评分": 60,
    "说明": "..."
  }
}
```

## 🔍 为什么要用 JSON 字符串？

AI Agent 使用工具时，需要理解工具的输出结果：

1. **AI 读取 `response` 字段** - 这是工具返回给 AI 的信息
2. **字符串格式便于 AI 理解** - JSON 字符串结构清晰，AI 容易解析
3. **`indent=2` 提高可读性** - 格式化的 JSON 让 AI 更容易理解层级关系
4. **`ensure_ascii=False`** - 保留中文字符，不转义成 `\uxxxx`

## 🎯 输出格式决策树

```
开始
  │
  ├─ 你的代码在 AI Agent 的 Tool 节点中？
  │   │
  │   ├─ 是 → 使用 {"response": "字符串"} 格式
  │   │        │
  │   │        ├─ 数据是结构化的（字典/列表）？
  │   │        │   └─ 使用 json.dumps() 转成字符串
  │   │        │
  │   │        └─ 数据本身就是文本？
  │   │            └─ 直接使用字符串
  │   │
  │   └─ 否 → 使用普通 Code 节点的输出方式
  │            └─ _result = your_data  （字典、列表等）
  │
结束
```

## ✅ 验证清单

使用 AI Agent Tool 前，请确认：

- [ ] `_result` 是一个字典对象
- [ ] 字典包含 `response` 键
- [ ] `response` 的值是字符串类型
- [ ] 如果数据是结构化的，使用了 `json.dumps()` 转换
- [ ] 使用了 `ensure_ascii=False` 保留中文
- [ ] 使用了 `indent=2` 提高可读性
- [ ] 函数本身返回字典对象（不要在函数内使用 `json.dumps()`）

## 🧪 测试方法

在 n8n 中测试你的 AI Agent Tool：

```python
# 添加调试输出
for item in _input.all():
    result = my_function(...)
    
    response_string = json.dumps(result, ensure_ascii=False, indent=2)
    
    # 调试：查看输出
    print(f"Type of _result: {type({'response': response_string})}")
    print(f"Type of response: {type(response_string)}")
    print(f"Response content:\n{response_string}")
    
    _result = {
        "response": response_string
    }
```

**正确的输出应该显示**:
```
Type of _result: <class 'dict'>
Type of response: <class 'str'>
Response content:
{
  "key": "value"
}
```

## 📚 常见错误及解决方案

### 错误: `The response property should be a string, but it is an undefined`

**原因**: 没有 `response` 字段

```python
# ❌ 错误
_result = result

# ✅ 修复
_result = {"response": json.dumps(result, ensure_ascii=False)}
```

### 错误: `The response property should be a string, but it is an object`

**原因**: `response` 的值是字典而不是字符串

```python
# ❌ 错误
_result = {"response": result}  # result 是字典

# ✅ 修复
_result = {"response": json.dumps(result, ensure_ascii=False)}
```

### 错误: AI 无法理解工具输出

**原因**: 返回的字符串格式混乱或没有结构

```python
# ❌ 不好
_result = {"response": str(result)}  # 类似: "{'key': 'value'}"

# ✅ 更好
_result = {"response": json.dumps(result, ensure_ascii=False, indent=2)}
```

## 🎉 总结

**三个关键点**:

1. **`_result` 必须是字典**: `{"response": ...}`
2. **`response` 的值必须是字符串**: 使用 `json.dumps()` 转换
3. **保持格式化和中文**: `ensure_ascii=False, indent=2`

遵循这个模式，你的 AI Agent Tool 就能正常工作！🚀

---

**最后更新**: 2025-10-30  
**适用于**: n8n 1.116.2 AI Agent 的 Python Code Tool  
**节点类型**: `@n8n/n8n-nodes-langchain.toolCode`


