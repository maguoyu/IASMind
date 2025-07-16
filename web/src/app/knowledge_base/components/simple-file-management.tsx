// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { RefreshCw, FileText, Download, Trash2, Settings, Search, X, Zap } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { knowledgeBaseApi, FileDocument, KnowledgeBase } from "~/core/api/knowledge-base";
import { toast } from "sonner";

import { BatchVectorizeDialog } from "./batch-vectorize-dialog";

interface SimpleFileManagementProps {
  selectedKnowledgeBase: KnowledgeBase | null;
  onRefresh: () => void;
  refreshTrigger?: number; // 添加刷新触发器
}

export default function SimpleFileManagement({ selectedKnowledgeBase, onRefresh, refreshTrigger }: SimpleFileManagementProps) {
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalFiles, setTotalFiles] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [showBatchVectorizeDialog, setShowBatchVectorizeDialog] = useState(false);

  // 加载文件列表
  const LoadFiles = useCallback(async () => {
    if (!selectedKnowledgeBase?.id) return;
    
    setLoading(true);
    try {
      const response = await knowledgeBaseApi.GetFiles({
        knowledge_base_id: selectedKnowledgeBase.id,
        page: currentPage,
        page_size: pageSize,
        search: searchTerm.trim() || undefined, // 添加搜索参数
      });
      
      setFiles(response.files);
      setTotalFiles(response.total);
    } catch (error) {
      console.error("加载文件列表失败:", error);
      toast.error("加载文件列表失败");
    } finally {
      setLoading(false);
    }
  }, [selectedKnowledgeBase?.id, currentPage, pageSize, searchTerm]);

  // 处理搜索输入
  const HandleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    
    // 清除之前的定时器
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // 重置到第一页
    setCurrentPage(1);
    
    // 设置新的定时器，延迟搜索
    const timeout = setTimeout(() => {
      LoadFiles();
    }, 500); // 500ms 延迟
    
    setSearchTimeout(timeout);
  }, [searchTimeout, LoadFiles]);

  // 清除搜索
  const HandleClearSearch = useCallback(() => {
    setSearchTerm("");
    setCurrentPage(1);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    LoadFiles();
  }, [searchTimeout, LoadFiles]);

  // 删除文件
  const HandleDeleteFile = async (fileId: string) => {
    if (!confirm("确定要删除这个文件吗？")) return;
    
    try {
      await knowledgeBaseApi.DeleteFile(fileId);
      toast.success("文件删除成功");
      LoadFiles();
      // 通知父组件更新知识库信息（文件数量等）
      onRefresh();
    } catch (error) {
      console.error("删除文件失败:", error);
      toast.error("删除文件失败");
    }
  };

  // 向量化文件
  const HandleVectorizeFile = async (fileId: string) => {
    try {
      await knowledgeBaseApi.VectorizeFile(fileId, selectedKnowledgeBase?.id);
      toast.success("文件向量化成功");
      LoadFiles();
      // 通知父组件更新知识库信息（向量数量等）
      onRefresh();
    } catch (error) {
      console.error("向量化文件失败:", error);
      toast.error("向量化文件失败");
    }
  };

  // 批量向量化文件
  const HandleBatchVectorize = () => {
    if (selectedFiles.size === 0) {
      toast.error("请选择要向量化的文件");
      return;
    }

    const fileIds = Array.from(selectedFiles);
    const canVectorizeFiles = files.filter(file => 
      fileIds.includes(file.id) && file.status === "uploaded"
    );

    if (canVectorizeFiles.length === 0) {
      toast.error("选中的文件中没有可以向量化的文件");
      return;
    }

    setShowBatchVectorizeDialog(true);
  };

  // 批量向量化完成回调
  const HandleBatchVectorizeComplete = () => {
    setSelectedFiles(new Set());
    LoadFiles();
    onRefresh();
  };

  // 选择/取消选择文件
  const HandleToggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  // 全选/取消全选
  const HandleToggleSelectAll = () => {
    const canSelectFiles = files.filter(file => file.status === "uploaded");
    if (selectedFiles.size === canSelectFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(canSelectFiles.map(f => f.id)));
    }
  };

  // 下载文件
  const HandleDownloadFile = async (file: FileDocument) => {
    try {
      const blob = await knowledgeBaseApi.DownloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("文件下载成功");
    } catch (error) {
      console.error("下载文件失败:", error);
      toast.error("下载文件失败");
    }
  };

  // 监听知识库变化、分页变化和外部刷新触发器
  useEffect(() => {
    LoadFiles();
  }, [LoadFiles, refreshTrigger]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  if (!selectedKnowledgeBase) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-muted-foreground">请选择知识库</h3>
          <p className="mt-1 text-sm text-muted-foreground">选择一个知识库来管理文件</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalFiles / pageSize);

  return (
    <div className="space-y-6">
      {/* 统计信息 */}


      {/* 文件列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>文件列表</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={LoadFiles}
                disabled={loading}
                title="刷新文件列表"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <span className="text-sm text-muted-foreground">
                {totalFiles} 个文件
              </span>
            </div>
          </CardTitle>
          {/* 搜索框和批量操作 */}
          <div className="flex items-center justify-between gap-2 mt-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索文件名称..."
                  value={searchTerm}
                  onChange={(e) => HandleSearchChange(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={HandleClearSearch}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {searchTerm && (
                <span className="text-sm text-muted-foreground">
                  搜索: &ldquo;{searchTerm}&rdquo; - 找到 {totalFiles} 个文件
                </span>
              )}
            </div>
            
            {/* 批量操作按钮 */}
            {selectedFiles.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  已选择 {selectedFiles.size} 个文件
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={HandleBatchVectorize}
                  disabled={batchLoading}
                >
                  {batchLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  批量向量化
                </Button>
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-muted-foreground">
                {searchTerm ? "未找到匹配的文件" : "暂无文件"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm 
                  ? `没有找到包含"${searchTerm}"的文件，请尝试其他关键词`
                  : "上传文件到知识库开始管理"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={files.filter(f => f.status === "uploaded").length > 0 && 
                                   selectedFiles.size === files.filter(f => f.status === "uploaded").length}
                          onChange={HandleToggleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </div>
                    </TableHead>
                    <TableHead>文件</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>向量数</TableHead>
                    <TableHead>上传时间</TableHead>
                    <TableHead className="w-32">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="w-12">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedFiles.has(file.id)}
                            onChange={() => HandleToggleFileSelection(file.id)}
                            disabled={file.status !== "uploaded"}
                            className="rounded border-gray-300"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {knowledgeBaseApi.utils.getFileIcon(file.type)}
                          </span>
                          <div>
                            <div className="font-medium">{file.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {file.metadata?.description || "无描述"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {knowledgeBaseApi.utils.formatFileSize(file.size)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={knowledgeBaseApi.utils.getStatusColor(file.status) as any}>
                          {knowledgeBaseApi.utils.getStatusText(file.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {file.vector_count ? (
                          <span className="font-medium">{file.vector_count}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(file.uploaded_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(file.uploaded_at).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => HandleDownloadFile(file)}
                            title="下载文件"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {file.status === "uploaded" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => HandleVectorizeFile(file.id)}
                              title="向量化文件"
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => HandleDeleteFile(file.id)}
                            title="删除文件"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页信息 */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  第 {currentPage} 页，共 {totalPages} 页，总计 {totalFiles} 个文件
                </div>
                <div className="flex items-center space-x-2">
                  <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 批量向量化对话框 */}
              <BatchVectorizeDialog
          open={showBatchVectorizeDialog}
          onOpenChange={setShowBatchVectorizeDialog}
          files={files.filter(file => selectedFiles.has(file.id))}
          selectedKnowledgeBase={selectedKnowledgeBase}
          onComplete={HandleBatchVectorizeComplete}
        />
    </div>
  );
} 