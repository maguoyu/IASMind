"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { callLLMProxy, streamLLMProxy, type LLMResponseChoice } from "~/core/api/llm-proxy";
import { Loader2 } from "lucide-react";

export default function LLMDemoPage() {
  const [userInput, setUserInput] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmType, setLlmType] = useState("basic");
  const [model, setModel] = useState(""); 
  const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});
  
  const streamRef = useRef<AbortController | null>(null);

  // Load available models from config
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/config");
        if (response.ok) {
          const data = await response.json();
          if (data.models) {
            setAvailableModels(data.models);
            // Set default model as the first one in the selected LLM type
            if (data.models[llmType]?.length > 0) {
              setModel(data.models[llmType][0]);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load models:", error);
      }
    };
    
    loadModels();
  }, []);
  
  // Update model when LLM type changes
  useEffect(() => {
    const models = availableModels[llmType];
    if (models && models.length > 0) {
      const firstModel = models[0];
      setModel(firstModel || "");
    } else {
      setModel("");
    }
  }, [llmType, availableModels]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    if (!model) {
      setError("请先选择模型");
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await callLLMProxy({
        model,
        messages: [
          { role: "user", content: userInput }
        ],
        temperature: 0.7,
        llm_type: llmType,
      });
      
      const firstChoice = result.choices?.[0];
      const content = firstChoice?.message?.content;
      setResponse(content || "没有返回内容");
    } catch (err) {
      setError(`请求失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStreamMessage = async () => {
    if (!userInput.trim()) return;
    if (!model) {
      setError("请先选择模型");
      return;
    }
    
    setError(null);
    setResponse("");
    setIsStreaming(true);
    
    // Create abort controller for cancellation
    streamRef.current = new AbortController();
    
    try {
      const stream = streamLLMProxy({
        model,
        messages: [
          { role: "user", content: userInput }
        ],
        temperature: 0.7,
        stream: true,
        llm_type: llmType,
      });
      
      let fullResponse = "";
      
      for await (const chunk of stream) {
        // Extract content from the chunk based on streaming format
        if (chunk.choices?.[0]?.delta?.content) {
          const content = chunk.choices[0].delta.content;
          fullResponse += content;
          setResponse(fullResponse);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Ignore abort errors
      } else {
        setError(`流式请求失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      streamRef.current = null;
      setIsStreaming(false);
    }
  };
  
  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.abort();
      setIsStreaming(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">LLM 代理演示</h1>
      <p className="mb-6 text-muted-foreground">
        此页面演示如何使用后端代理调用大型语言模型，确保API密钥仅存储在服务器端。
      </p>
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/2">
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">输入</h2>
            
            <div className="flex gap-4 mb-4">
              <Select
                value={llmType}
                onValueChange={(value) => setLlmType(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择LLM类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">基础模型</SelectItem>
                  <SelectItem value="reasoning">推理模型</SelectItem>
                  <SelectItem value="vision">视觉模型</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={model}
                onValueChange={(value) => setModel(value)}
                disabled={!availableModels[llmType]?.length}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels[llmType]?.map((modelName) => (
                    <SelectItem key={modelName} value={modelName}>
                      {modelName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Textarea
              placeholder="输入您的问题..."
              className="min-h-[200px] mb-4"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={isLoading || isStreaming}
            />
            
            <div className="flex space-x-4">
              <Button 
                onClick={handleSendMessage}
                disabled={isLoading || isStreaming || !userInput.trim() || !model}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                发送
              </Button>
              
              <Button 
                onClick={handleStreamMessage}
                disabled={isLoading || isStreaming || !userInput.trim() || !model}
                variant="secondary"
              >
                {isStreaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                流式请求
              </Button>
              
              {isStreaming && (
                <Button 
                  onClick={handleCancel}
                  variant="destructive"
                >
                  取消
                </Button>
              )}
            </div>
          </Card>
        </div>
        
        <div className="w-full md:w-1/2">
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">响应</h2>
            {error ? (
              <div className="p-4 bg-red-50 text-red-500 rounded mb-4">
                {error}
              </div>
            ) : null}
            
            <div className="whitespace-pre-wrap bg-muted p-4 rounded min-h-[200px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>加载中...</span>
                </div>
              ) : response ? (
                response
              ) : (
                <span className="text-muted-foreground">响应将显示在这里...</span>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 