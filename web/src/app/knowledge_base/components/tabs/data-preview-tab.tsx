// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { useState } from "react";
import { Search, FileText, Filter, MoreHorizontal, Eye, Copy, Zap } from "lucide-react";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import type { VectorData } from "../../types";
import { mockVectorData, mockKnowledgeBases, mockFileDocuments } from "../../mock-data";

export function DataPreviewTab() {
  const [vectorData, setVectorData] = useState<VectorData[]>(mockVectorData);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<string>("all");
  const [testQuery, setTestQuery] = useState("");
  const [similarityResults, setSimilarityResults] = useState<VectorData[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const filteredVectorData = vectorData.filter((vector) => {
    // 搜索过滤
    if (searchQuery && !vector.content.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !vector.metadata.source.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // 知识库过滤
    if (selectedKnowledgeBase !== "all") {
      const fileDocument = mockFileDocuments.find(file => file.name === vector.metadata.source);
      if (!fileDocument || fileDocument.knowledgeBaseId !== selectedKnowledgeBase) {
        return false;
      }
    }
    
    return true;
  });

  const handleSimilaritySearch = async () => {
    if (!testQuery.trim()) return;
    
    setIsSearching(true);
    
    // 模拟相似度搜索
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 模拟返回匹配的向量数据
    const results = mockVectorData
      .map(v => ({
        ...v,
        similarity: Math.random() * 0.5 + 0.5 // 0.5-1.0的相似度
      }))
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, 5);
    
    setSimilarityResults(results);
    setIsSearching(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatSimilarity = (similarity?: number) => {
    if (!similarity) return "-";
    return (similarity * 100).toFixed(1) + "%";
  };

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索向量内容或来源文件..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select value={selectedKnowledgeBase} onValueChange={setSelectedKnowledgeBase}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="选择知识库" />
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

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredVectorData.length}</div>
            <p className="text-xs text-muted-foreground">向量片段</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {new Set(filteredVectorData.map(v => v.metadata.source)).size}
            </div>
            <p className="text-xs text-muted-foreground">来源文件</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {filteredVectorData.reduce((sum, v) => sum + v.content.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">总字符数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">1536</div>
            <p className="text-xs text-muted-foreground">向量维度</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 相似度搜索测试 */}
        <Card>
          <CardHeader>
            <CardTitle>相似度搜索测试</CardTitle>
            <CardDescription>
              测试向量搜索功能，输入查询内容查看相似的文档片段
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-query">测试查询</Label>
              <Textarea
                id="test-query"
                placeholder="输入您要搜索的内容..."
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                rows={3}
              />
            </div>
            
            <Button 
              onClick={handleSimilaritySearch} 
              disabled={!testQuery.trim() || isSearching}
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              {isSearching ? "搜索中..." : "开始搜索"}
            </Button>

            {similarityResults.length > 0 && (
              <div className="space-y-3 mt-4">
                <h4 className="font-medium">搜索结果</h4>
                {similarityResults.map((result, index) => (
                  <div key={result.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        相似度: {formatSimilarity(result.similarity)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        来源: {result.metadata.source}
                      </span>
                    </div>
                    <p className="text-sm">{result.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 向量数据分布 */}
        <Card>
          <CardHeader>
            <CardTitle>数据分布</CardTitle>
            <CardDescription>
              向量数据在不同文件中的分布情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from(new Set(filteredVectorData.map(v => v.metadata.source)))
                .map(source => {
                  const count = filteredVectorData.filter(v => v.metadata.source === source).length;
                  const percentage = (count / filteredVectorData.length) * 100;
                  
                  return (
                    <div key={source} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">{source}</span>
                        <span className="text-muted-foreground">{count} 片段</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 向量数据列表 */}
      <Card>
        <CardHeader>
          <CardTitle>向量数据预览</CardTitle>
          <CardDescription>
            浏览和管理已向量化的文档片段
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>内容预览</TableHead>
                <TableHead>来源文件</TableHead>
                <TableHead>位置信息</TableHead>
                <TableHead>相似度</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVectorData.map((vector) => (
                <TableRow key={vector.id}>
                  <TableCell className="max-w-md">
                    <div className="truncate">
                      {vector.content.substring(0, 100)}
                      {vector.content.length > 100 && "..."}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{vector.metadata.source}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {vector.metadata.page && `第 ${vector.metadata.page} 页`}
                      {vector.metadata.chunk && ` • 片段 ${vector.metadata.chunk}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    {vector.similarity ? (
                      <Badge variant="outline">
                        {formatSimilarity(vector.similarity)}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => copyToClipboard(vector.content)}>
                          <Copy className="mr-2 h-4 w-4" />
                          复制内容
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          查看详情
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredVectorData.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无向量数据</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "没有找到匹配的向量数据" : "开始上传文件进行向量化"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 