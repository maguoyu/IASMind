// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { 
  Upload, 
  Search, 
  MoreHorizontal, 
  Download, 
  Trash2, 
  RefreshCw,
  FileText,
  Eye,
  Zap,
  Loader2,
  Settings,
  BookOpen,
  Code
} from "lucide-react";

import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { FileUploadDialog } from "../file-upload-dialog";
import type { FileDocument, FileFilter } from "../../types";
import { mockFileDocuments, mockKnowledgeBases } from "../../mock-data";

// 向量化配置类型
interface VectorizationConfig {
  chunkSize: number;
  chunkOverlap: number;
  separators: string[];
  embeddingModel: string;
  customSeparators: string;
  useCustomSeparators: boolean;
}

// 向量化模板类型
interface VectorizationTemplate {
  id: string;
  name: string;
  description: string;
  config: VectorizationConfig;
  icon: React.ComponentType<{ className?: string }>;
}

export function FileManagementTab() {
  const [files, setFiles] = useState<FileDocument[]>(mockFileDocuments);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showVectorizationDialog, setShowVectorizationDialog] = useState(false);
  const [filter, setFilter] = useState<FileFilter>({});
  const [sortBy, setSortBy] = useState<"name" | "uploadedAt" | "size">("uploadedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [vectorizingFiles, setVectorizingFiles] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [vectorizationConfig, setVectorizationConfig] = useState<VectorizationConfig>({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", "。", "！", "？", ".", "!", "?"],
    embeddingModel: "text-embedding-3-small",
    customSeparators: "",
    useCustomSeparators: false,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("word")) return "📝";
    if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
    if (type.includes("text")) return "📄";
    return "📁";
  };

  const getStatusBadge = (status: FileDocument["status"]) => {
    const variants = {
      uploaded: "secondary",
      processing: "default",
      vectorized: "default",
      failed: "destructive",
    } as const;

    const labels = {
      uploaded: "已上传",
      processing: "处理中",
      vectorized: "已向量化",
      failed: "失败",
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const filteredAndSortedFiles = files
    .filter((file) => {
      if (filter.status && file.status !== filter.status) return false;
      if (filter.type && !file.type.includes(filter.type)) return false;
      if (filter.knowledgeBaseId && file.knowledgeBaseId !== filter.knowledgeBaseId) return false;
      if (filter.search && !file.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "uploadedAt":
          aValue = new Date(a.uploadedAt).getTime();
          bValue = new Date(b.uploadedAt).getTime();
          break;
        case "size":
          aValue = a.size;
          bValue = b.size;
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const handleDeleteFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleRetryProcessing = (fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: "processing", errorMessage: undefined } : f
    ));
  };

  const handleVectorizeFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    // 检查文件状态是否可以进行向量化
    if (file.status === "vectorized") {
      console.log("文件已经向量化完成");
      return;
    }

    if (file.status === "processing") {
      console.log("文件正在处理中");
      return;
    }

    // 添加到向量化队列
    setVectorizingFiles(prev => new Set(prev).add(fileId));

    // 更新文件状态为处理中
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: "processing", errorMessage: undefined } : f
    ));

    try {
      // 模拟向量化处理过程
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

      // 模拟成功或失败的概率
      const isSuccess = Math.random() > 0.1; // 90% 成功率

      if (isSuccess) {
        // 向量化成功
        const vectorCount = Math.floor(Math.random() * 200) + 50; // 50-250个向量
        setFiles(prev => prev.map(f => 
          f.id === fileId ? {
            ...f,
            status: "vectorized",
            vectorCount,
            lastVectorizedAt: new Date().toISOString(),
            errorMessage: undefined
          } : f
        ));
      } else {
        // 向量化失败
        setFiles(prev => prev.map(f => 
          f.id === fileId ? {
            ...f,
            status: "failed",
            errorMessage: "向量化处理失败，请检查文件格式或重新尝试"
          } : f
        ));
      }
    } catch {
      // 处理异常
      setFiles(prev => prev.map(f => 
        f.id === fileId ? {
          ...f,
          status: "failed",
          errorMessage: "向量化过程中发生错误"
        } : f
      ));
    } finally {
      // 从向量化队列中移除
      setVectorizingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };



  // 选择相关函数
  const handleSelectFile = (fileId: string, checked: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // 选择所有可选择的文件（已上传或失败状态）
      const selectableFiles = filteredAndSortedFiles.filter(f => 
        f.status === "uploaded" || f.status === "failed"
      );
      setSelectedFiles(new Set(selectableFiles.map(f => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const getSelectableFilesCount = () => {
    return filteredAndSortedFiles.filter(f => 
      f.status === "uploaded" || f.status === "failed"
    ).length;
  };

  const getSelectedCount = () => selectedFiles.size;

  // 向量化模板定义
  const vectorizationTemplates: VectorizationTemplate[] = [
    {
      id: "default",
      name: "默认模板",
      description: "适用于大多数文档的通用向量化配置",
      icon: Settings,
      config: {
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ["\n\n", "\n", "。", "！", "？", ".", "!", "?"],
        embeddingModel: "text-embedding-3-small",
        customSeparators: "",
        useCustomSeparators: false,
      }
    },
    {
      id: "technical",
      name: "技术文档",
      description: "针对技术文档、API文档等结构化内容优化",
      icon: Code,
      config: {
        chunkSize: 800,
        chunkOverlap: 150,
        separators: ["\n\n", "\n", "```", "##", "###", "####", ".", "。", "！", "？"],
        embeddingModel: "text-embedding-3-large",
        customSeparators: "",
        useCustomSeparators: false,
      }
    },
    {
      id: "literature",
      name: "文学文档",
      description: "适用于小说、散文等文学类文档",
      icon: BookOpen,
      config: {
        chunkSize: 1200,
        chunkOverlap: 100,
        separators: ["\n\n", "\n", "。", "！", "？", "；", "：", ".", "!", "?", ";", ":"],
        embeddingModel: "text-embedding-3-small",
        customSeparators: "",
        useCustomSeparators: false,
      }
    },
    {
      id: "legal",
      name: "法律文档",
      description: "针对法律条文、合同等正式文档优化",
      icon: FileText,
      config: {
        chunkSize: 1500,
        chunkOverlap: 300,
        separators: ["\n\n", "\n", "。", "；", "：", "第", "条", ".", ";", ":", "Article", "Section"],
        embeddingModel: "text-embedding-3-large",
        customSeparators: "",
        useCustomSeparators: false,
      }
    }
  ];

  const handleTemplateSelect = (template: VectorizationTemplate) => {
    setVectorizationConfig(template.config);
  };

  const handleCustomSeparatorsChange = (value: string) => {
    const separators = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    setVectorizationConfig(prev => ({
      ...prev,
      customSeparators: value,
      separators: prev.useCustomSeparators ? separators : prev.separators
    }));
  };

  const handleUseCustomSeparatorsChange = (useCustom: boolean) => {
    setVectorizationConfig(prev => ({
      ...prev,
      useCustomSeparators: useCustom,
      separators: useCustom 
        ? prev.customSeparators.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : ["\n\n", "\n", "。", "！", "？", ".", "!", "?"]
    }));
  };

  const handleBatchVectorizeWithConfig = async () => {
    // 获取选中的可以向量化的文件
    const filesToVectorize = files.filter(f => 
      selectedFiles.has(f.id) && 
      (f.status === "uploaded" || f.status === "failed") && 
      !vectorizingFiles.has(f.id)
    );

    if (filesToVectorize.length === 0) {
      console.log("没有选中的可向量化文件");
      return;
    }

    console.log("使用配置进行批量向量化:", vectorizationConfig);

    // 批量向量化
    for (const file of filesToVectorize) {
      await handleVectorizeFile(file.id);
      // 添加延迟避免同时处理太多文件
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 关闭对话框
    setShowVectorizationDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索文件名..."
              className="pl-10 w-64"
              value={filter.search ?? ""}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          
          <Select value={filter.status ?? "all"} onValueChange={(value) => setFilter(prev => ({ ...prev, status: value === "all" ? undefined : value as FileDocument["status"] }))}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="uploaded">已上传</SelectItem>
              <SelectItem value="processing">处理中</SelectItem>
              <SelectItem value="vectorized">已向量化</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filter.knowledgeBaseId ?? "all"} onValueChange={(value) => setFilter(prev => ({ ...prev, knowledgeBaseId: value === "all" ? undefined : value }))}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="知识库筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部知识库</SelectItem>
              {mockKnowledgeBases.map((kb) => (
                <SelectItem key={kb.id} value={kb.id}>
                  {kb.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowVectorizationDialog(true)}
            disabled={selectedFiles.size === 0}
          >
            <Zap className="h-4 w-4 mr-2" />
            批量向量化 ({getSelectedCount()})
          </Button>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          上传文件
        </Button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredAndSortedFiles.length}</div>
            <p className="text-xs text-muted-foreground">当前显示文件</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {filteredAndSortedFiles.filter(f => f.status === "vectorized").length}
            </div>
            <p className="text-xs text-muted-foreground">已向量化</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {filteredAndSortedFiles.filter(f => f.status === "processing").length}
            </div>
            <p className="text-xs text-muted-foreground">处理中</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {filteredAndSortedFiles.filter(f => f.status === "uploaded").length}
            </div>
            <p className="text-xs text-muted-foreground">待向量化</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatFileSize(filteredAndSortedFiles.reduce((sum, f) => sum + f.size, 0))}
            </div>
            <p className="text-xs text-muted-foreground">总大小</p>
          </CardContent>
        </Card>
      </div>

      {/* 排序选项和选择状态 */}
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">排序:</span>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="uploadedAt">上传时间</SelectItem>
            <SelectItem value="name">文件名</SelectItem>
            <SelectItem value="size">文件大小</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
        >
          {sortOrder === "asc" ? "升序" : "降序"}
        </Button>
        </div>
        
        {getSelectedCount() > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>已选择 {getSelectedCount()} 个文件</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFiles(new Set())}
            >
              取消选择
            </Button>
          </div>
        )}
      </div>

      {/* 文件列表 */}
      <Card>
        <CardHeader>
          <CardTitle>文件列表</CardTitle>
          <CardDescription>
            管理您上传的文件，查看处理状态和向量化进度
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={getSelectedCount() > 0 && getSelectedCount() === getSelectableFilesCount()}
                    onCheckedChange={handleSelectAll}
                    aria-label="选择全部"
                  />
                </TableHead>
                <TableHead>文件</TableHead>
                <TableHead>知识库</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>大小</TableHead>
                <TableHead>上传时间</TableHead>
                <TableHead>向量数</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedFiles.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={(checked) => handleSelectFile(file.id, checked as boolean)}
                      disabled={file.status === "processing" || file.status === "vectorized"}
                      aria-label={`选择 ${file.name}`}
                    />
                  </TableCell>
                  <TableCell className="flex items-center gap-3">
                    <span className="text-lg">{getFileIcon(file.type)}</span>
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {file.metadata?.pageCount && `${file.metadata.pageCount} 页 • `}
                        {file.metadata?.wordCount && `${file.metadata.wordCount} 字`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {mockKnowledgeBases.find(kb => kb.id === file.knowledgeBaseId)?.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                    {getStatusBadge(file.status)}
                      {vectorizingFiles.has(file.id) && (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                      )}
                    </div>
                    {file.errorMessage && (
                      <div className="text-xs text-red-600 mt-1">
                        {file.errorMessage}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{formatFileSize(file.size)}</TableCell>
                  <TableCell>
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {file.vectorCount ? `${file.vectorCount} 个` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end"
                        sideOffset={8}
                        avoidCollisions={true}
                      >
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        
                        {/* 向量化选项 - 放在最前面 */}
                        {(file.status === "uploaded" || file.status === "failed") && (
                          <DropdownMenuItem 
                            onClick={() => handleVectorizeFile(file.id)}
                            disabled={vectorizingFiles.has(file.id)}
                          >
                            {vectorizingFiles.has(file.id) ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Zap className="mr-2 h-4 w-4" />
                            )}
                            {vectorizingFiles.has(file.id) ? "向量化中..." : "开始向量化"}
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          预览
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          下载
                        </DropdownMenuItem>
                        
                        {file.status === "failed" && (
                            <DropdownMenuItem onClick={() => handleRetryProcessing(file.id)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              重新处理
                            </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteFile(file.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredAndSortedFiles.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无文件</h3>
              <p className="text-muted-foreground mb-4">
                {Object.keys(filter).length > 0 ? "没有找到符合条件的文件" : "开始上传您的第一个文件"}
              </p>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                上传文件
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 上传对话框 */}
      <FileUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUploadComplete={(uploadedFiles) => {
          // 这里可以添加上传完成后的处理逻辑
          console.log("上传完成:", uploadedFiles);
        }}
      />

      {/* 向量化配置对话框 */}
      <Dialog open={showVectorizationDialog} onOpenChange={setShowVectorizationDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批量向量化配置</DialogTitle>
            <DialogDescription>
              为选中的 {getSelectedCount()} 个文件配置向量化参数
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">预设模板</TabsTrigger>
              <TabsTrigger value="custom">自定义配置</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vectorizationTemplates.map((template) => {
                  const Icon = template.icon;
                  const isSelected = 
                    vectorizationConfig.chunkSize === template.config.chunkSize &&
                    vectorizationConfig.chunkOverlap === template.config.chunkOverlap &&
                    vectorizationConfig.embeddingModel === template.config.embeddingModel;

                  return (
                    <Card 
                      key={template.id} 
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                        </div>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">分块大小:</span>
                            <span className="font-medium">{template.config.chunkSize}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">重叠大小:</span>
                            <span className="font-medium">{template.config.chunkOverlap}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">嵌入模型:</span>
                            <span className="font-medium">{template.config.embeddingModel}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="chunkSize">分块大小</Label>
                    <Input
                      id="chunkSize"
                      type="number"
                      value={vectorizationConfig.chunkSize}
                      onChange={(e) => setVectorizationConfig(prev => ({
                        ...prev,
                        chunkSize: parseInt(e.target.value) ?? 1000
                      }))}
                      min="100"
                      max="5000"
                      step="100"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      每个文本块的最大字符数 (100-5000)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="chunkOverlap">重叠大小</Label>
                    <Input
                      id="chunkOverlap"
                      type="number"
                      value={vectorizationConfig.chunkOverlap}
                      onChange={(e) => setVectorizationConfig(prev => ({
                        ...prev,
                        chunkOverlap: parseInt(e.target.value) ?? 200
                      }))}
                      min="0"
                      max={vectorizationConfig.chunkSize}
                      step="50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      相邻文本块之间的重叠字符数
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="embeddingModel">嵌入模型</Label>
                    <Select 
                      value={vectorizationConfig.embeddingModel}
                      onValueChange={(value) => setVectorizationConfig(prev => ({
                        ...prev,
                        embeddingModel: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text-embedding-3-small">text-embedding-3-small (1536维)</SelectItem>
                        <SelectItem value="text-embedding-3-large">text-embedding-3-large (3072维)</SelectItem>
                        <SelectItem value="text-embedding-ada-002">text-embedding-ada-002 (1536维)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox 
                        id="useCustomSeparators"
                        checked={vectorizationConfig.useCustomSeparators}
                        onCheckedChange={handleUseCustomSeparatorsChange}
                      />
                      <Label htmlFor="useCustomSeparators">使用自定义分隔符</Label>
                    </div>
                    
                    {vectorizationConfig.useCustomSeparators ? (
                      <div>
                        <Label htmlFor="customSeparators">自定义分隔符</Label>
                        <Textarea
                          id="customSeparators"
                          placeholder="输入分隔符，用逗号分隔，例如: \n\n, \n, 。, ！, ？"
                          value={vectorizationConfig.customSeparators}
                          onChange={(e) => handleCustomSeparatorsChange(e.target.value)}
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          用逗号分隔多个分隔符，支持转义字符
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Label>默认分隔符</Label>
                        <div className="p-3 bg-muted rounded-md text-sm">
                          {vectorizationConfig.separators.map((sep, index) => (
                            <Badge key={index} variant="secondary" className="mr-1 mb-1">
                              {sep === '\n' ? '\\n' : sep === '\n\n' ? '\\n\\n' : sep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>配置预览</Label>
                    <Card className="p-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">分块大小:</span>
                          <span>{vectorizationConfig.chunkSize}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">重叠大小:</span>
                          <span>{vectorizationConfig.chunkOverlap}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">嵌入模型:</span>
                          <span>{vectorizationConfig.embeddingModel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">分隔符数量:</span>
                          <span>{vectorizationConfig.separators.length}</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVectorizationDialog(false)}>
              取消
            </Button>
            <Button onClick={handleBatchVectorizeWithConfig}>
              <Zap className="h-4 w-4 mr-2" />
              开始向量化 ({getSelectedCount()} 个文件)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 