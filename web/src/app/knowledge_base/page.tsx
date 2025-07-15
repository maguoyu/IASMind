// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { 
  Plus, 
  Database, 
  FileText, 
  Settings,
  Bug,
  RefreshCw
} from "lucide-react";
import { knowledgeBaseApi, KnowledgeBase } from "~/core/api/knowledge-base";
import { toast } from "sonner";
import { FileUploadDialog } from "./components/file-upload-dialog";
import FileManagementTab from "./components/tabs/file-management-tab";
import ApiDebugPanel from "./components/api-debug-panel";

export default function KnowledgeBasePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // 加载知识库列表
  const LoadKnowledgeBases = async () => {
    setLoading(true);
    try {
      const response = await knowledgeBaseApi.GetKnowledgeBases();
      setKnowledgeBases(response.knowledge_bases);
      
      // 如果没有选中的知识库，选择第一个
      if (!selectedKnowledgeBase && response.knowledge_bases.length > 0) {
        setSelectedKnowledgeBase(response.knowledge_bases[0]);
      }
    } catch (error) {
      console.error("加载知识库列表失败:", error);
      toast.error("加载知识库列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 创建知识库
  const HandleCreateKnowledgeBase = async () => {
    try {
      const response = await knowledgeBaseApi.CreateKnowledgeBase({
        name: `新知识库 ${new Date().toLocaleString()}`,
        description: "这是一个新的知识库",
      });
      
      if (response.success) {
        toast.success("知识库创建成功");
        LoadKnowledgeBases();
      }
    } catch (error) {
      console.error("创建知识库失败:", error);
      toast.error("创建知识库失败");
    }
  };

  // 删除知识库
  const HandleDeleteKnowledgeBase = async (kbId: string) => {
    if (!confirm("确定要删除这个知识库吗？此操作不可撤销。")) {
      return;
    }

    try {
      await knowledgeBaseApi.DeleteKnowledgeBase(kbId);
      toast.success("知识库删除成功");
      LoadKnowledgeBases();
      
      // 如果删除的是当前选中的知识库，清空选择
      if (selectedKnowledgeBase?.id === kbId) {
        setSelectedKnowledgeBase(null);
      }
    } catch (error) {
      console.error("删除知识库失败:", error);
      toast.error("删除知识库失败");
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    LoadKnowledgeBases();
  }, []);

  // 刷新数据
  const HandleRefresh = () => {
    LoadKnowledgeBases();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">知识库管理</h1>
          <p className="text-muted-foreground mt-1">
            管理和组织您的文档知识库
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={HandleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Button onClick={HandleCreateKnowledgeBase} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            创建知识库
          </Button>
        </div>
      </div>

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="files">文件管理</TabsTrigger>
          <TabsTrigger value="debug">API调试</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 知识库选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                选择知识库
              </CardTitle>
            </CardHeader>
            <CardContent>
              {knowledgeBases.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-muted-foreground">暂无知识库</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    创建您的第一个知识库开始管理文档
                  </p>
                  <Button onClick={HandleCreateKnowledgeBase} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    创建知识库
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Select
                    value={selectedKnowledgeBase?.id || ""}
                    onValueChange={(value) => {
                      const kb = knowledgeBases.find(k => k.id === value);
                      setSelectedKnowledgeBase(kb || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择知识库" />
                    </SelectTrigger>
                    <SelectContent>
                      {knowledgeBases.filter(kb => kb.id && kb.id !== "").map((kb) => (
                        <SelectItem key={kb.id} value={kb.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{kb.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {kb.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedKnowledgeBase && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{selectedKnowledgeBase.file_count}</div>
                          <p className="text-xs text-muted-foreground">文件数量</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{selectedKnowledgeBase.vector_count}</div>
                          <p className="text-xs text-muted-foreground">向量数量</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{selectedKnowledgeBase.embedding_model}</div>
                          <p className="text-xs text-muted-foreground">嵌入模型</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 知识库列表 */}
          {knowledgeBases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  知识库列表
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {knowledgeBases.map((kb) => (
                    <div
                      key={kb.id}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedKnowledgeBase?.id === kb.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedKnowledgeBase(kb)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{kb.name}</h3>
                          <Badge variant={kb.status === "active" ? "default" : "secondary"}>
                            {kb.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {kb.description || "暂无描述"}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{kb.file_count} 个文件</span>
                          <span>{kb.vector_count} 个向量</span>
                          <span>创建于 {new Date(kb.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedKnowledgeBase(kb);
                            setActiveTab("files");
                          }}
                        >
                          管理文件
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: 编辑知识库
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            HandleDeleteKnowledgeBase(kb.id);
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 文件管理标签页 */}
        <TabsContent value="files" className="space-y-6">
          {selectedKnowledgeBase ? (
            <>
              {/* 文件管理头部 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {selectedKnowledgeBase.name} - 文件管理
                    </div>
                    <Button onClick={() => setShowUploadDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      上传文件
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedKnowledgeBase.file_count}</div>
                      <div className="text-xs text-muted-foreground">总文件数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedKnowledgeBase.vector_count}</div>
                      <div className="text-xs text-muted-foreground">向量总数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedKnowledgeBase.embedding_model}</div>
                      <div className="text-xs text-muted-foreground">嵌入模型</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedKnowledgeBase.chunk_size}</div>
                      <div className="text-xs text-muted-foreground">分块大小</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 文件管理内容 */}
              <FileManagementTab
                selectedKnowledgeBase={selectedKnowledgeBase}
                onRefresh={HandleRefresh}
              />
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-muted-foreground">请选择知识库</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    选择一个知识库来管理文件
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* API调试标签页 */}
        <TabsContent value="debug" className="space-y-6">
          <ApiDebugPanel />
        </TabsContent>
      </Tabs>

      {/* 文件上传对话框 */}
      {selectedKnowledgeBase && (
        <FileUploadDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          selectedKnowledgeBase={selectedKnowledgeBase}
          onUploadComplete={() => {
            setShowUploadDialog(false);
            HandleRefresh();
          }}
        />
      )}
    </div>
  );
} 