// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Separator } from "~/components/ui/separator";
import { ScrollArea } from "~/components/ui/scroll-area";
import { 
  Plus, 
  Database, 
  FileText, 
  Settings,
  Bug,
  RefreshCw,
  MoreHorizontal,
  Trash2,
  Edit3,
  Upload,
  Calendar,
  File,
  Search,
  Play,
  Download,
  ArrowLeft,
  TestTube,
  Network,
  ChevronDown,
  Eye
} from "lucide-react";
import { knowledgeBaseApi, KnowledgeBase } from "~/core/api/knowledge-base";
import { toast } from "sonner";
import { FileUploadDialog } from "./components/file-upload-dialog";
import FileManagementTab from "./components/tabs/file-management-tab";
import ApiDebugPanel from "./components/api-debug-panel";

type ViewMode = "list" | "detail";
type DetailTab = "dataset" | "retrieval" | "config" | "knowledge-graph";

export default function KnowledgeBasePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [detailTab, setDetailTab] = useState<DetailTab>("dataset");
  const [searchTerm, setSearchTerm] = useState("");
  const [batchMode, setBatchMode] = useState(false);

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
        setViewMode("list");
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

  // 点击知识库卡片进入详情页
  const HandleKnowledgeBaseClick = (kb: KnowledgeBase) => {
    setSelectedKnowledgeBase(kb);
    setViewMode("detail");
    setDetailTab("dataset");
  };

  // 返回列表页
  const HandleBackToList = () => {
    setViewMode("list");
    setSelectedKnowledgeBase(null);
  };

  // 过滤知识库列表
  const filteredKnowledgeBases = knowledgeBases.filter(kb => 
    kb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kb.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 获取解析状态
  const getParseStatus = (kb: KnowledgeBase) => {
    if (kb.file_count === 0) return { status: "未解析", color: "text-green-600" };
    if (kb.vector_count > 0) return { status: "成功", color: "text-blue-600" };
    return { status: "失败", color: "text-red-600" };
  };

  // 列表视图
  if (viewMode === "list") {
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

            {/* 知识库列表 - 栅格卡片布局 */}
            {knowledgeBases.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    知识库列表
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredKnowledgeBases.filter(kb => kb.id && kb.id !== "").map((kb) => (
                      <Card 
                        key={kb.id}
                        className="cursor-pointer transition-all hover:shadow-md"
                        onClick={() => HandleKnowledgeBaseClick(kb)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {kb.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    HandleKnowledgeBaseClick(kb);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  查看详情
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: 编辑知识库
                                  }}
                                >
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    HandleDeleteKnowledgeBase(kb.id);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <h3 className="font-semibold text-base mb-2 line-clamp-2">
                            {kb.name}
                          </h3>
                          
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <File className="h-4 w-4" />
                              <span>{kb.file_count} 文档</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(kb.created_at).toLocaleDateString()} {new Date(kb.created_at).toLocaleTimeString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <Switch size="sm" defaultChecked={kb.status === "active"} />
                              <span className={getParseStatus(kb).color}>
                                {getParseStatus(kb).status}
                              </span>
                            </div>
                          </div>

                          {/* 操作图标 */}
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Play className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Settings className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {/* 没有更多数据提示 */}
                  <div className="text-center py-4 text-muted-foreground">
                    没有更多数据了 😮
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

  // 详情视图
  return (
    <div className="flex h-screen bg-background">
      {/* 左侧导航栏 */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        {/* 返回按钮 */}
        <div className="p-4 border-b">
          <Button
            variant="ghost"
            onClick={HandleBackToList}
            className="w-full justify-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回知识库列表
          </Button>
        </div>

        {/* 知识库信息 */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {selectedKnowledgeBase?.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium text-sm">{selectedKnowledgeBase?.name}</h3>
              <p className="text-xs text-muted-foreground">知识库</p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            <div className="space-y-1">
              <Button
                variant={detailTab === "dataset" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setDetailTab("dataset")}
              >
                <FileText className="h-4 w-4 mr-2" />
                文件管理
              </Button>
              <Button
                variant={detailTab === "retrieval" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setDetailTab("retrieval")}
              >
                <TestTube className="h-4 w-4 mr-2" />
                检索测试
              </Button>
              <Button
                variant={detailTab === "config" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setDetailTab("config")}
              >
                <Settings className="h-4 w-4 mr-2" />
                配置
              </Button>
              <Button
                variant={detailTab === "knowledge-graph" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setDetailTab("knowledge-graph")}
              >
                <Network className="h-4 w-4 mr-2" />
                知识图谱
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* 右侧内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航 */}
        <div className="border-b p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>知识库</span>
            <span>/</span>
            <span>文件管理</span>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 p-6">
          {detailTab === "dataset" && (
            <div className="space-y-6">
              {/* 标题和提示 */}
              <div>
                <h2 className="text-2xl font-bold">文件管理</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  管理知识库中的文档文件，支持上传、解析和向量化
                </p>
              </div>

              {/* 文件管理内容 */}
              <FileManagementTab
                selectedKnowledgeBase={selectedKnowledgeBase}
                onRefresh={HandleRefresh}
              />
            </div>
          )}

          {detailTab === "retrieval" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">检索测试</h2>
              <p className="text-muted-foreground">检索测试功能开发中...</p>
            </div>
          )}

          {detailTab === "config" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">配置</h2>
              <p className="text-muted-foreground">配置功能开发中...</p>
            </div>
          )}

          {detailTab === "knowledge-graph" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">知识图谱</h2>
              <p className="text-muted-foreground">知识图谱功能开发中...</p>
            </div>
          )}
        </div>
      </div>

      {/* 文件上传对话框 */}
      {showUploadDialog && selectedKnowledgeBase && (
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