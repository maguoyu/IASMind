"use client";

import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { knowledgeBaseApi } from "~/core/api/knowledge-base";

export default function TestApiDuplicate() {
  const [apiCallCount, setApiCallCount] = useState(0);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const log = `${timestamp}: ${message}`;
    console.log(log);
    setLogs(prev => [...prev, log]);
  };

  const loadKnowledgeBases = async () => {
    const callNumber = apiCallCount + 1;
    setApiCallCount(callNumber);
    addLog(`第${callNumber}次调用 knowledgeBaseApi.GetKnowledgeBases()`);
    
    try {
      const response = await knowledgeBaseApi.GetKnowledgeBases();
      setKnowledgeBases(response.knowledge_bases);
      addLog(`第${callNumber}次调用成功，返回${response.knowledge_bases.length}个知识库`);
    } catch (error) {
      addLog(`第${callNumber}次调用失败: ${error}`);
    }
  };

  // 组件挂载时执行
  useEffect(() => {
    addLog("组件挂载，useEffect执行");
    loadKnowledgeBases();
  }, []);

  const handleManualLoad = () => {
    addLog("手动点击加载按钮");
    loadKnowledgeBases();
  };

  const clearLogs = () => {
    setLogs([]);
    setApiCallCount(0);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API重复调用测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleManualLoad}>
              手动加载知识库
            </Button>
            <Button onClick={clearLogs} variant="outline">
              清空日志
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">统计信息</h3>
              <p>API调用次数: {apiCallCount}</p>
              <p>知识库数量: {knowledgeBases.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>调用日志</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded-md max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">暂无日志</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 