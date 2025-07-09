// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { FileText, Database, Zap, AlertTriangle, TrendingUp, Activity, Users, Clock, CheckCircle, XCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { mockKnowledgeBaseStats, mockKnowledgeBases, mockFileDocuments } from "../../mock-data";

export function OverviewTab() {
  const stats = mockKnowledgeBaseStats;
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // 按知识库分组文件
  const filesByKnowledgeBase = mockFileDocuments.reduce((acc, file) => {
    const kbId = file.knowledgeBaseId;
    if (!acc[kbId]) {
      acc[kbId] = [];
    }
    acc[kbId].push(file);
    return acc;
  }, {} as Record<string, typeof mockFileDocuments>);

  // 计算每个知识库的统计信息
  const knowledgeBaseStats = mockKnowledgeBases.map(kb => {
    const files = filesByKnowledgeBase[kb.id] || [];
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const vectorizedFiles = files.filter(f => f.status === "vectorized").length;
    const processingFiles = files.filter(f => f.status === "processing").length;
    const failedFiles = files.filter(f => f.status === "failed").length;
    const totalVectors = files.reduce((sum, file) => sum + (file.vectorCount || 0), 0);
    
    return {
      ...kb,
      totalSize,
      vectorizedFiles,
      processingFiles,
      failedFiles,
      totalVectors,
      vectorizationRate: files.length > 0 ? (vectorizedFiles / files.length) * 100 : 0,
      avgVectorsPerFile: files.length > 0 ? totalVectors / files.length : 0
    };
  });

  // 最近活动
  const recentFiles = mockFileDocuments
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 知识库概览统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">知识库总数</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockKnowledgeBases.length}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{mockKnowledgeBases.filter(kb => kb.status === "active").length}</span> 个活跃
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总文件数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFiles.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{stats.recentActivity.uploads}</span> 本周新增
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">向量总数</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVectors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{stats.recentActivity.vectorizations}</span> 本周向量化
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">存储空间</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
            <p className="text-xs text-muted-foreground">
              已使用 65% 容量
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 知识库详细统计 */}
        <Card>
          <CardHeader>
            <CardTitle>知识库详细统计</CardTitle>
            <CardDescription>各知识库的文件分布和向量化情况</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {knowledgeBaseStats.map((kb) => (
              <div key={kb.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{kb.name}</h4>
                    <Badge variant={kb.status === "active" ? "default" : kb.status === "processing" ? "secondary" : "destructive"}>
                      {kb.status === "active" ? "活跃" : kb.status === "processing" ? "处理中" : "非活跃"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {kb.embeddingModel}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">文件数</span>
                      <span className="font-medium">{kb.fileCount}</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">向量数</span>
                      <span className="font-medium">{kb.vectorCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">存储大小</span>
                      <span className="font-medium">{formatFileSize(kb.totalSize)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">向量化率</span>
                      <span className="font-medium">{kb.vectorizationRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">平均向量/文件</span>
                      <span className="font-medium">{kb.avgVectorsPerFile.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">分块大小</span>
                      <span className="font-medium">{kb.chunkSize}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>向量化进度</span>
                    <span>{kb.vectorizedFiles}/{kb.fileCount} 文件</span>
                  </div>
                  <Progress value={kb.vectorizationRate} className="h-2" />
                </div>

                {kb.failedFiles > 0 && (
                  <div className="flex items-center gap-2 text-xs text-orange-600">
                    <XCircle className="h-3 w-3" />
                    <span>{kb.failedFiles} 个文件处理失败</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 文件状态分布 */}
        <Card>
          <CardHeader>
            <CardTitle>文件状态分布</CardTitle>
            <CardDescription>按知识库分组的文件处理状态</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {knowledgeBaseStats.map((kb) => {
              const files = filesByKnowledgeBase[kb.id] || [];
              const statusCounts = {
                uploaded: files.filter(f => f.status === "uploaded").length,
                processing: files.filter(f => f.status === "processing").length,
                vectorized: files.filter(f => f.status === "vectorized").length,
                failed: files.filter(f => f.status === "failed").length,
              };

              return (
                <div key={kb.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{kb.name}</h4>
                    <span className="text-xs text-muted-foreground">{files.length} 文件</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="text-lg font-bold text-blue-600">{statusCounts.uploaded}</div>
                      <div className="text-xs text-blue-600">已上传</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded">
                      <div className="text-lg font-bold text-yellow-600">{statusCounts.processing}</div>
                      <div className="text-xs text-yellow-600">处理中</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="text-lg font-bold text-green-600">{statusCounts.vectorized}</div>
                      <div className="text-xs text-green-600">已向量化</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <div className="text-lg font-bold text-red-600">{statusCounts.failed}</div>
                      <div className="text-xs text-red-600">失败</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* 最近活动 */}
      <Card>
        <CardHeader>
          <CardTitle>最近活动</CardTitle>
          <CardDescription>最近上传和处理的文件</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentFiles.map((file) => {
            const kb = mockKnowledgeBases.find(k => k.id === file.knowledgeBaseId);
            return (
              <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="text-2xl">
                  {file.type.includes("pdf") ? "📄" : 
                   file.type.includes("word") ? "📝" : 
                   file.type.includes("excel") ? "📊" : "📁"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {kb?.name}
                      </Badge>
                      <Badge variant={
                        file.status === "vectorized" ? "default" :
                        file.status === "processing" ? "secondary" :
                        file.status === "failed" ? "destructive" : "outline"
                      }>
                        {file.status === "vectorized" ? "已向量化" :
                         file.status === "processing" ? "处理中" :
                         file.status === "failed" ? "失败" : "已上传"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                    {file.vectorCount && <span>{file.vectorCount} 向量</span>}
                    <span>{kb?.embeddingModel}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 系统健康度 */}
      <Card>
        <CardHeader>
          <CardTitle>系统健康度</CardTitle>
          <CardDescription>知识库系统的整体运行状况</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">向量化成功率</span>
                <span className="text-sm">95.2%</span>
              </div>
              <Progress value={95.2} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">查询响应时间</span>
                <span className="text-sm">125ms</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">存储使用率</span>
                <span className="text-sm">65%</span>
              </div>
              <Progress value={65} className="h-2" />
            </div>
          </div>

          {stats.failedFiles > 0 && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  发现 {stats.failedFiles} 个失败文件，建议检查文件格式或重新上传
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 