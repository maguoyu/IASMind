// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import { ScrollArea } from "~/components/ui/scroll-area";
import { 
  Upload, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  RefreshCw, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  MoreHorizontal,
  Eye,
  Settings,
  Play
} from "lucide-react";
import { knowledgeBaseApi, FileDocument, KnowledgeBase } from "~/core/api/knowledge-base";
import { toast } from "sonner";

interface FileManagementTabProps {
  selectedKnowledgeBase: KnowledgeBase | null;
  onRefresh: () => void;
}

export default function FileManagementTab({ selectedKnowledgeBase, onRefresh }: FileManagementTabProps) {
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);

  const pageSize = 20;

  // 加载文件列表
  const LoadFiles = async () => {
    if (!selectedKnowledgeBase) return;
    
    setLoading(true);
    try {
      const response = await knowledgeBaseApi.GetFiles({
        knowledge_base_id: selectedKnowledgeBase.id,
        status: statusFilter || undefined,
        file_type: typeFilter || undefined,
        search: searchTerm || undefined,
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
  };

  // 加载统计信息
  const LoadStats = async () => {
    try {
      const response = await knowledgeBaseApi.GetStats();
      setStats(response.stats);
    } catch (error) {
      console.error("加载统计信息失败:", error);
    }
  };

  // 删除文件
  const HandleDeleteFile = async (fileId: string) => {
    if (!confirm("确定要删除这个文件吗？此操作不可撤销。")) {
      return;
    }

    try {
      await knowledgeBaseApi.DeleteFile(fileId);
      toast.success("文件删除成功");
      LoadFiles();
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
      toast.success("文件向量化已开始");
      LoadFiles();
    } catch (error) {
      console.error("向量化文件失败:", error);
      toast.error("向量化文件失败");
    }
  };

  // 批量向量化
  const HandleBatchVectorize = async () => {
    if (selectedFiles.length === 0) {
      toast.error("请选择要向量化的文件");
      return;
    }

    setBatchProcessing(true);
    try {
      const response = await knowledgeBaseApi.BatchVectorizeFiles({
        file_ids: selectedFiles,
      });
      
      const successCount = response.results.filter(r => r.status === "success").length;
      const skippedCount = response.results.filter(r => r.status === "skipped").length;
      const failedCount = response.results.filter(r => r.status === "failed").length;
      
      toast.success(`批量向量化完成: ${successCount}个成功, ${skippedCount}个跳过, ${failedCount}个失败`);
      setSelectedFiles([]);
      LoadFiles();
    } catch (error) {
      console.error("批量向量化失败:", error);
      toast.error("批量向量化失败");
    } finally {
      setBatchProcessing(false);
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

  // 选择/取消选择文件
  const ToggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  // 全选/取消全选
  const ToggleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map(f => f.id));
    }
  };

  // 搜索和过滤
  const HandleSearch = () => {
    setCurrentPage(1);
    LoadFiles();
  };

  // 重置过滤
  const ResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setTypeFilter("");
    setCurrentPage(1);
    setSelectedFiles([]);
  };

  // 监听知识库变化
  useEffect(() => {
    if (selectedKnowledgeBase) {
      setCurrentPage(1);
      setSelectedFiles([]);
      LoadFiles();
      LoadStats();
    }
  }, [selectedKnowledgeBase]);

  // 监听过滤条件变化
  useEffect(() => {
    if (selectedKnowledgeBase) {
      LoadFiles();
    }
  }, [currentPage, statusFilter, typeFilter]);

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
      {/* 统计信息卡片 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">文件统计</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? "隐藏详情" : "显示详情"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalFiles}</div>
              <div className="text-xs text-muted-foreground">总文件数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {files.filter(f => f.status === "vectorized").length}
              </div>
              <div className="text-xs text-muted-foreground">已向量化</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {files.filter(f => f.status === "processing").length}
              </div>
              <div className="text-xs text-muted-foreground">处理中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {files.reduce((sum, f) => sum + (f.vector_count || 0), 0)}
              </div>
              <div className="text-xs text-muted-foreground">总向量数</div>
            </div>
          </div>
          
          {showStats && stats && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">文件状态分布</h4>
                  {Object.entries(stats.file_status).map(([status, count]) => (
                    <div key={status} className="flex justify-between text-sm">
                      <span>{knowledgeBaseApi.utils.getStatusText(status as any)}</span>
                      <span className="font-medium">{count as number}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">文件类型分布</h4>
                  {Object.entries(stats.file_type_stats).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span>{type}</span>
                      <span className="font-medium">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 操作栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索文件..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && HandleSearch()}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="uploaded">已上传</SelectItem>
                  <SelectItem value="processing">处理中</SelectItem>
                  <SelectItem value="vectorized">已向量化</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="application/pdf">PDF</SelectItem>
                  <SelectItem value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word</SelectItem>
                  <SelectItem value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">Excel</SelectItem>
                  <SelectItem value="text/plain">文本</SelectItem>
                  <SelectItem value="text/markdown">Markdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={ResetFilters}
              >
                重置
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={LoadFiles}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* 批量操作 */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  已选择 {selectedFiles.length} 个文件
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={HandleBatchVectorize}
                    disabled={batchProcessing}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    {batchProcessing ? "处理中..." : "批量向量化"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFiles([])}
                  >
                    取消选择
                  </Button>
                </div>
              </div>
            </div>
          )}
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
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedFiles.length === files.length && files.length > 0}
                        onChange={ToggleSelectAll}
                        className="rounded"
                      />
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
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={() => ToggleFileSelection(file.id)}
                          className="rounded"
                        />
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
                          {file.status === "processing" && <Clock className="h-3 w-3 mr-1" />}
                          {file.status === "vectorized" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {file.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
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

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    第 {currentPage} 页，共 {totalPages} 页
                  </div>
                  <div className="flex items-center space-x-2">
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
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 