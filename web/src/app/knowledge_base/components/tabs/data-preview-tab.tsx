// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { useState, useEffect } from "react";
import { Search, FileText, Database, Eye, Download } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { knowledgeBaseApi, type KnowledgeBase } from "~/core/api/knowledge-base";

interface PreviewData {
  id: string;
  filename: string;
  content: string;
  type: string;
  size: number;
  created_at: string;
}

export function DataPreviewTab() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  const loadKnowledgeBases = async () => {
    try {
      const response = await knowledgeBaseApi.GetKnowledgeBases();
      setKnowledgeBases(response.knowledge_bases || []);
    } catch (error) {
      console.error("加载知识库失败:", error);
    }
  };

  const loadPreviewData = async (kbId: string) => {
    try {
      setLoading(true);
      // 这里应该调用实际的API来获取预览数据
      // 目前使用模拟数据
      const mockData: PreviewData[] = [
        {
          id: "1",
          filename: "技术文档.pdf",
          content: "这是一个关于人工智能技术的详细文档，包含了机器学习、深度学习等相关内容...",
          type: "PDF",
          size: 2048576,
          created_at: "2024-01-15T10:30:00Z"
        },
        {
          id: "2", 
          filename: "产品需求.docx",
          content: "产品需求文档包含了详细的功能规格说明，用户故事和验收标准...",
          type: "Word",
          size: 1024000,
          created_at: "2024-01-14T15:45:00Z"
        },
        {
          id: "3",
          filename: "数据分析报告.xlsx",
          content: "本报告分析了过去一年的用户行为数据，包括访问量、转化率等关键指标...",
          type: "Excel", 
          size: 512000,
          created_at: "2024-01-13T09:15:00Z"
        }
      ];
      
      setPreviewData(mockData);
    } catch (error) {
      console.error("加载预览数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKBChange = (value: string) => {
    setSelectedKB(value);
    if (value) {
      loadPreviewData(value);
    } else {
      setPreviewData([]);
    }
  };

  const filteredData = previewData.filter(item =>
    item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">数据预览</h2>
        <p className="text-muted-foreground">
          预览和搜索知识库中的文档内容
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedKB} onValueChange={handleKBChange}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="选择知识库" />
          </SelectTrigger>
          <SelectContent>
            {knowledgeBases.map((kb) => (
              <SelectItem key={kb.id} value={kb.id.toString()}>
                <div className="flex items-center">
                  <Database className="w-4 h-4 mr-2" />
                  {kb.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索文档内容..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {!selectedKB ? (
        <Card className="p-8 text-center">
          <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">选择知识库</h3>
          <p className="text-muted-foreground">
            请先选择一个知识库来预览其中的数据内容
          </p>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredData.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{item.filename}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{item.type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(item.size)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      预览
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      下载
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-20">
                  <p className="text-sm text-muted-foreground">
                    {item.content}
                  </p>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}

          {filteredData.length === 0 && previewData.length > 0 && (
            <Card className="p-8 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">未找到匹配内容</h3>
              <p className="text-muted-foreground">
                尝试使用不同的搜索关键词
              </p>
            </Card>
          )}

          {previewData.length === 0 && !loading && (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无数据</h3>
              <p className="text-muted-foreground">
                该知识库中还没有任何文档数据
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
} 