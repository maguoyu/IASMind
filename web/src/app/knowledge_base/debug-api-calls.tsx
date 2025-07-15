"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { knowledgeBaseApi, type KnowledgeBase } from "~/core/api/knowledge-base";
import { toast } from "sonner";

export default function DebugApiCalls() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiCallLog, setApiCallLog] = useState<string[]>([]);

  // 记录API调用
  const logApiCall = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${timestamp}: ${message}`;
    console.log(logMessage);
    setApiCallLog(prev => [...prev, logMessage]);
  };

  // 包装knowledgeBaseApi.GetKnowledgeBases来追踪调用
  const wrappedGetKnowledgeBases = useCallback(async () => {
    logApiCall("调用 knowledgeBaseApi.GetKnowledgeBases()");
    const result = await knowledgeBaseApi.GetKnowledgeBases();
    logApiCall(`GetKnowledgeBases 返回 ${result.knowledge_bases.length} 个知识库`);
    return result;
  }, []);

  // 加载知识库列表
  const LoadKnowledgeBases = useCallback(async () => {
    logApiCall("开始执行 LoadKnowledgeBases");
    setLoading(true);
    try {
      const response = await wrappedGetKnowledgeBases();
      setKnowledgeBases(response.knowledge_bases);
      
      // 如果没有选中的知识库，选择第一个
      setSelectedKnowledgeBase(current => {
        if (!current && response.knowledge_bases.length > 0) {
          logApiCall("自动选择第一个知识库");
          return response.knowledge_bases[0];
        } else if (current) {
          // 更新当前选中的知识库信息
          const updatedKb = response.knowledge_bases.find(kb => kb.id === current.id);
          if (updatedKb) {
            logApiCall("更新当前选中的知识库信息");
            return updatedKb;
          } else {
            logApiCall("当前选中的知识库不存在，清空选择");
            return null;
          }
        }
        return current;
      });
    } catch (error) {
      logApiCall(`LoadKnowledgeBases 失败: ${error}`);
      console.error("加载知识库列表失败:", error);
      toast.error("加载知识库列表失败");
    } finally {
      setLoading(false);
      logApiCall("LoadKnowledgeBases 执行完成");
    }
  }, [wrappedGetKnowledgeBases]);

  // 组件挂载时加载数据
  useEffect(() => {
    logApiCall("组件挂载，执行 useEffect");
    LoadKnowledgeBases();
  }, []);

  // 监听LoadKnowledgeBases变化
  useEffect(() => {
    logApiCall("LoadKnowledgeBases 函数发生变化");
  }, [LoadKnowledgeBases]);

  // 监听selectedKnowledgeBase变化
  useEffect(() => {
    logApiCall(`selectedKnowledgeBase 发生变化: ${selectedKnowledgeBase?.name || 'null'}`);
  }, [selectedKnowledgeBase]);

  // 手动刷新
  const HandleRefresh = () => {
    logApiCall("手动点击刷新按钮");
    LoadKnowledgeBases();
  };

  // 清空日志
  const ClearLog = () => {
    setApiCallLog([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API调用调试页面</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={HandleRefresh} disabled={loading}>
              刷新知识库列表
            </Button>
            <Button onClick={ClearLog} variant="outline">
              清空日志
            </Button>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">当前状态:</h3>
            <p>知识库数量: {knowledgeBases.length}</p>
            <p>选中知识库: {selectedKnowledgeBase?.name || "无"}</p>
            <p>Loading状态: {loading ? "是" : "否"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API调用日志</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded-md max-h-96 overflow-y-auto">
            {apiCallLog.length === 0 ? (
              <p className="text-gray-500">暂无日志</p>
            ) : (
              apiCallLog.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>知识库列表</CardTitle>
        </CardHeader>
        <CardContent>
          {knowledgeBases.length === 0 ? (
            <p>暂无知识库</p>
          ) : (
            <div className="space-y-2">
              {knowledgeBases.map((kb) => (
                <div key={kb.id} className="p-2 border rounded">
                  <div className="font-medium">{kb.name}</div>
                  <div className="text-sm text-gray-500">ID: {kb.id}</div>
                  <div className="text-sm text-gray-500">文件数: {kb.file_count}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 