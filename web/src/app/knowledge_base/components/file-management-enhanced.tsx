// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import { Pagination } from "~/components/ui/pagination";
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
  Play,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio
} from "lucide-react";
import { knowledgeBaseApi, FileDocument, KnowledgeBase } from "~/core/api/knowledge-base";
import { toast } from "sonner";

interface FileManagementEnhancedProps {
  selectedKnowledgeBase: KnowledgeBase | null;
  onRefresh: () => void;
}

type ViewMode = "table" | "grid";
type SortField = "uploaded_at" | "name" | "size" | "vector_count" | "status";
type SortOrder = "asc" | "desc";

export default function FileManagementEnhanced({ selectedKnowledgeBase, onRefresh }: FileManagementEnhancedProps) {
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalFiles, setTotalFiles] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>("uploaded_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // 计算总页数
  const totalPages = useMemo(() => Math.ceil(totalFiles / pageSize), [totalFiles, pageSize]);

  // 获取文件图标
  const GetFileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("word") || type.includes("document")) return "📝";
    if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
    if (type.includes("image")) return "🖼️";
    if (type.includes("video")) return "🎥";
    if (type.includes("audio")) return "🎵";
    if (type.includes("text") || type.includes("plain")) return "📄";
    if (type.includes("markdown")) return "📝";
    return "📁";
  };

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
        sort_by: sortBy,
        sort_order: sortOrder,
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
    if (!confirm("确定要删除这个文件吗？")) return;
    
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
      toast.success("文件向量化成功");
      LoadFiles();
      onRefresh();
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
      
      toast.success(`批量向量化完成，成功处理 ${response.results.filter(r => r.status === 'success').length} 个文件`);
      setSelectedFiles([]);
      LoadFiles();
      onRefresh();
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
    setSortBy("uploaded_at");
    setSortOrder("desc");
  };

  // 切换排序
  const ToggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
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
  }, [currentPage, pageSize, statusFilter, typeFilter, sortBy, sortOrder]);

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
              <div className="text-2xl font-bold">{stats?.total_files || 0}</div>
              <div className="text-xs text-muted-foreground">总文件数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.total_vectors || 0}</div>
              <div className="text-xs text-muted-foreground">总向量数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.total_size || 0}</div>
              <div className="text-xs text-muted-foreground">总大小(MB)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.knowledge_bases || 0}</div>
              <div className="text-xs text-muted-foreground">知识库数</div>
            </div>
          </div>
          
          {showStats && stats && (
            <div className="mt-4 space-y-2">
              <Separator />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium">文件状态分布</div>
                  <div className="text-muted-foreground">
                    已上传: {stats.status_counts?.uploaded || 0}<br />
                    处理中: {stats.status_counts?.processing || 0}<br />
                    已向量化: {stats.status_counts?.vectorized || 0}<br />
                    失败: {stats.status_counts?.failed || 0}
                  </div>
                </div>
                <div>
                  <div className="font-medium">文件类型分布</div>
                  <div className="text-muted-foreground">
                    PDF: {stats.type_counts?.pdf || 0}<br />
                    Word: {stats.type_counts?.docx || 0}<br />
                    Excel: {stats.type_counts?.xlsx || 0}<br />
                    文本: {stats.type_counts?.txt || 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 搜索和过滤 */}
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
              
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortField)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="排序" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uploaded_at">上传时间</SelectItem>
                  <SelectItem value="name">文件名</SelectItem>
                  <SelectItem value="size">文件大小</SelectItem>
                  <SelectItem value="vector_count">向量数</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                title={`当前排序: ${sortOrder === "asc" ? "升序" : "降序"}`}
              >
                {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "table" ? "grid" : "table")}
              >
                {viewMode === "table" ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
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
          ) : viewMode === "table" ? (
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
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => ToggleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        文件
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => ToggleSort("size")}
                    >
                      <div className="flex items-center gap-1">
                        大小
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => ToggleSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        状态
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => ToggleSort("vector_count")}
                    >
                      <div className="flex items-center gap-1">
                        向量数
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => ToggleSort("uploaded_at")}
                    >
                      <div className="flex items-center gap-1">
                        上传时间
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
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
                            {GetFileIcon(file.type)}
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
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                showPageInfo={true}
                showPageSize={true}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                totalItems={totalFiles}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {files.map((file) => (
                  <Card key={file.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={() => ToggleFileSelection(file.id)}
                          className="rounded mt-1"
                        />
                        <div className="text-2xl">
                          {GetFileIcon(file.type)}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="font-medium text-sm truncate" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {knowledgeBaseApi.utils.formatFileSize(file.size)}
                        </div>
                        <Badge variant={knowledgeBaseApi.utils.getStatusColor(file.status) as any} className="text-xs">
                          {knowledgeBaseApi.utils.getStatusText(file.status)}
                        </Badge>
                        {file.vector_count && (
                          <div className="text-xs text-muted-foreground">
                            向量数: {file.vector_count}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(file.uploaded_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => HandleDownloadFile(file)}
                            title="下载文件"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          {file.status === "uploaded" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => HandleVectorizeFile(file.id)}
                              title="向量化文件"
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => HandleDeleteFile(file.id)}
                            title="删除文件"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 分页 */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                showPageInfo={true}
                showPageSize={true}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                totalItems={totalFiles}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 