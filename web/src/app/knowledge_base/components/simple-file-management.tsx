// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { RefreshCw, FileText, Download, Trash2, Settings } from "lucide-react";
import { knowledgeBaseApi, FileDocument, KnowledgeBase } from "~/core/api/knowledge-base";
import { toast } from "sonner";

interface SimpleFileManagementProps {
  selectedKnowledgeBase: KnowledgeBase | null;
  onRefresh: () => void;
}

export default function SimpleFileManagement({ selectedKnowledgeBase, onRefresh }: SimpleFileManagementProps) {
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalFiles, setTotalFiles] = useState(0);

  // 加载文件列表
  const LoadFiles = useCallback(async () => {
    if (!selectedKnowledgeBase?.id) return;
    
    setLoading(true);
    try {
      const response = await knowledgeBaseApi.GetFiles({
        knowledge_base_id: selectedKnowledgeBase.id,
        page: currentPage,
        page_size: pageSize,
      });
      
      setFiles(response.files);
      setTotalFiles(response.total);
    } catch (error) {
      console.error("加载文件列表失败:", error);
      toast.error("加载文件列表失败");
    } finally {
      setLoading(false);
    }
  }, [selectedKnowledgeBase?.id, currentPage, pageSize]);

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
      await knowledgeBaseApi.VectorizeFile(fileId);
      toast.success("文件向量化成功");
      LoadFiles();
      // 通知父组件更新知识库信息（向量数量等）
      onRefresh();
    } catch (error) {
      console.error("向量化文件失败:", error);
      toast.error("向量化文件失败");
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

  // 监听知识库变化和分页变化
  useEffect(() => {
    LoadFiles();
  }, [LoadFiles]);

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>文件统计</span>
            <Button
              variant="outline"
              size="sm"
              onClick={LoadFiles}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalFiles}</div>
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

      {/* 文件列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>文件列表</span>
            <span className="text-sm text-muted-foreground">
              {totalFiles} 个文件
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-muted-foreground">暂无文件</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                上传文件到知识库开始管理
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
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
                              <Settings className="h-4 w-4" />
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
    </div>
  );
} 