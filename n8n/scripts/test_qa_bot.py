#!/usr/bin/env python3
"""
智能问答机器人测试脚本
用于测试 intelligent-qa-bot 工作流
"""

import requests
import json
from datetime import datetime
from typing import Optional, Dict, Any


class QABotTester:
    """智能问答机器人测试类"""
    
    def __init__(self, base_url: str = 'http://localhost:5678'):
        self.base_url = base_url
        self.webhook_url = f"{base_url}/webhook/qa-bot"
        self.session_id = f"test-session-{datetime.now().timestamp()}"
        
    def ask(
        self, 
        question: str, 
        session_id: Optional[str] = None,
        user_id: str = "test-user",
        context: str = ""
    ) -> Dict[str, Any]:
        """
        发送问题到智能问答机器人
        
        Args:
            question: 问题内容
            session_id: 会话ID（可选，默认使用测试会话ID）
            user_id: 用户ID
            context: 额外上下文
            
        Returns:
            API 响应结果
        """
        payload = {
            "question": question,
            "sessionId": session_id or self.session_id,
            "userId": user_id,
            "context": context
        }
        
        print(f"\n{'='*60}")
        print(f"📤 发送问题: {question}")
        print(f"🔑 Session ID: {payload['sessionId']}")
        if context:
            print(f"📝 Context: {context[:100]}...")
        print(f"{'='*60}\n")
        
        try:
            response = requests.post(
                self.webhook_url,
                json=payload,
                timeout=60
            )
            response.raise_for_status()
            result = response.json()
            
            # 打印响应
            if result.get('success'):
                print(f"✅ 回答成功")
                print(f"📊 元数据:")
                print(f"   - 响应时间: {result.get('metadata', {}).get('responseTime')}")
                print(f"   - 答案长度: {result.get('metadata', {}).get('answerLength')}")
                print(f"\n💬 答案:\n{'-'*60}")
                print(result.get('answer', ''))
                print(f"{'-'*60}\n")
            else:
                print(f"❌ 请求失败: {result}")
                
            return result
            
        except requests.exceptions.Timeout:
            print("⏱️  请求超时（60秒）")
            return {"success": False, "error": "timeout"}
        except requests.exceptions.RequestException as e:
            print(f"❌ 请求错误: {e}")
            return {"success": False, "error": str(e)}
        except json.JSONDecodeError:
            print(f"❌ 响应解析失败: {response.text}")
            return {"success": False, "error": "invalid json response"}
    
    def chat(self, question: str, context: str = "") -> str:
        """简化的聊天接口，直接返回答案"""
        result = self.ask(question, context=context)
        if result.get('success'):
            return result.get('answer', '')
        else:
            return f"错误: {result.get('error', '未知错误')}"


def test_basic_qa():
    """测试1: 基础问答"""
    print("\n" + "🧪 测试1: 基础问答".center(60, "="))
    bot = QABotTester()
    bot.ask("Python 中如何读取 CSV 文件？")


def test_technical_support():
    """测试2: 技术支持问题"""
    print("\n" + "🧪 测试2: 技术支持".center(60, "="))
    bot = QABotTester()
    bot.ask(
        "我的代码报错 'ModuleNotFoundError: No module named pandas'，怎么解决？",
        context="我在 Python 3.9 环境中运行代码"
    )


def test_multi_turn_conversation():
    """测试3: 多轮对话"""
    print("\n" + "🧪 测试3: 多轮对话".center(60, "="))
    bot = QABotTester()
    
    # 第一轮
    print("\n📍 第一轮对话")
    bot.ask("什么是 Docker？")
    
    # 第二轮（追问）
    print("\n📍 第二轮对话（追问）")
    bot.ask("那它和虚拟机有什么区别？")
    
    # 第三轮（继续追问）
    print("\n📍 第三轮对话（继续追问）")
    bot.ask("我应该什么时候使用 Docker？")


def test_code_debug():
    """测试4: 代码调试"""
    print("\n" + "🧪 测试4: 代码调试".center(60, "="))
    bot = QABotTester()
    
    code_context = """
代码：
import pandas as pd
df = pd.read_csv('data.csv', encoding='gbk')
print(df.head())

错误信息：
UnicodeDecodeError: 'gbk' codec can't decode byte 0xff in position 0
"""
    
    bot.ask("这段代码有什么问题？如何解决？", context=code_context)


def test_knowledge_query():
    """测试5: 知识查询"""
    print("\n" + "🧪 测试5: 知识查询".center(60, "="))
    bot = QABotTester()
    bot.ask("n8n 工作流中如何使用 AI Agent？")


def test_calculation():
    """测试6: 计算问题（测试代码工具）"""
    print("\n" + "🧪 测试6: 计算问题".center(60, "="))
    bot = QABotTester()
    bot.ask("计算从 1 加到 100 的和是多少？")


def test_complex_question():
    """测试7: 复杂咨询问题"""
    print("\n" + "🧪 测试7: 复杂咨询".center(60, "="))
    bot = QABotTester()
    bot.ask(
        "我想搭建一个电商网站，需要使用什么技术栈？",
        context="预算有限，团队只有2个开发人员，希望快速上线"
    )


def test_minimal_input():
    """测试8: 最小输入"""
    print("\n" + "🧪 测试8: 最小输入".center(60, "="))
    bot = QABotTester()
    bot.ask("你好")


def test_session_isolation():
    """测试9: 会话隔离"""
    print("\n" + "🧪 测试9: 会话隔离".center(60, "="))
    
    # 会话1
    print("\n📍 会话 A")
    bot_a = QABotTester()
    bot_a.session_id = "session-A"
    bot_a.ask("我的名字是张三")
    bot_a.ask("我叫什么名字？")
    
    # 会话2（不应该知道会话1的信息）
    print("\n📍 会话 B（应该不知道会话A的信息）")
    bot_b = QABotTester()
    bot_b.session_id = "session-B"
    bot_b.ask("我叫什么名字？")


def run_all_tests():
    """运行所有测试"""
    print("\n" + "🚀 开始智能问答机器人测试".center(60, "="))
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tests = [
        ("基础问答", test_basic_qa),
        ("技术支持", test_technical_support),
        ("多轮对话", test_multi_turn_conversation),
        ("代码调试", test_code_debug),
        ("知识查询", test_knowledge_query),
        ("计算问题", test_calculation),
        ("复杂咨询", test_complex_question),
        ("最小输入", test_minimal_input),
        ("会话隔离", test_session_isolation),
    ]
    
    print(f"\n共 {len(tests)} 个测试用例\n")
    
    for i, (name, test_func) in enumerate(tests, 1):
        try:
            print(f"\n{'▶️  ' + f'测试 {i}/{len(tests)}: {name}'.center(58, ' ')}")
            test_func()
            print(f"✅ 测试 {i} 完成: {name}")
        except Exception as e:
            print(f"❌ 测试 {i} 失败: {name}")
            print(f"错误: {e}")
        
        # 测试之间的间隔
        if i < len(tests):
            import time
            time.sleep(2)
    
    print("\n" + "🎉 所有测试完成".center(60, "=") + "\n")


def interactive_mode():
    """交互模式：持续对话"""
    print("\n" + "💬 交互式问答模式".center(60, "="))
    print("输入问题开始对话，输入 'exit' 或 'quit' 退出")
    print("输入 'new' 开始新会话")
    print("=" * 60 + "\n")
    
    bot = QABotTester()
    
    while True:
        try:
            question = input("\n👤 您: ").strip()
            
            if not question:
                continue
                
            if question.lower() in ['exit', 'quit', '退出']:
                print("\n👋 再见！")
                break
                
            if question.lower() in ['new', '新会话']:
                bot.session_id = f"test-session-{datetime.now().timestamp()}"
                print(f"✅ 已开始新会话: {bot.session_id}")
                continue
            
            answer = bot.chat(question)
            
        except KeyboardInterrupt:
            print("\n\n👋 再见！")
            break
        except Exception as e:
            print(f"❌ 错误: {e}")


def main():
    """主函数"""
    import sys
    
    if len(sys.argv) > 1:
        mode = sys.argv[1]
        
        if mode == "all":
            run_all_tests()
        elif mode == "interactive" or mode == "chat":
            interactive_mode()
        elif mode == "basic":
            test_basic_qa()
        elif mode == "multi":
            test_multi_turn_conversation()
        elif mode == "debug":
            test_code_debug()
        else:
            print(f"未知模式: {mode}")
            print_usage()
    else:
        print_usage()


def print_usage():
    """打印使用说明"""
    print("""
智能问答机器人测试脚本

使用方法:
    python test_qa_bot.py [模式]

可用模式:
    all          - 运行所有测试用例
    interactive  - 交互式对话模式（或使用 chat）
    basic        - 仅运行基础问答测试
    multi        - 仅运行多轮对话测试
    debug        - 仅运行代码调试测试

示例:
    python test_qa_bot.py all           # 运行所有测试
    python test_qa_bot.py interactive   # 进入对话模式
    python test_qa_bot.py chat          # 进入对话模式（简写）
    
如果不指定模式，将显示此帮助信息。

环境要求:
    - n8n 服务运行在 http://localhost:5678
    - intelligent-qa-bot 工作流已激活
    - OpenAI API 凭证已配置
""")


if __name__ == "__main__":
    main()

