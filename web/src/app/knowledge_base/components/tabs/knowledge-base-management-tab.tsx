// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { useState, useEffect } from "react";
import { Plus, Database, FileText, Trash2, Edit3, Upload } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { knowledgeBaseApi, type KnowledgeBase } from "~/core/api/knowledge-base";
import { CreateKnowledgeBaseDialog } from "../create-knowledge-base-dialog";
import { FileUploadDialog } from "../file-upload-dialog";
import SimpleFileManagement from "../simple-file-management";

export function KnowledgeBaseManagementTab() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      const response = await knowledgeBaseApi.GetKnowledgeBases();
      setKnowledgeBases(response.knowledge_bases || []);
    } catch (error) {
      console.error("加载知识库失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    loadKnowledgeBases();
  };

  const handleUploadSuccess = (files?: File[]) => {
    setShowUploadDialog(false);
    loadKnowledgeBases();
  };

  if (selectedKB) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              onClick={() => setSelectedKB(null)}
              className="mb-2"
            >
              ← 返回知识库列表
            </Button>
            <h2 className="text-2xl font-bold">{selectedKB.name}</h2>
            <p className="text-muted-foreground">{selectedKB.description}</p>
          </div>
          <Button 
            onClick={() => setShowUploadDialog(true)}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            上传文件
          </Button>
        </div>
        
        <SimpleFileManagement 
          selectedKnowledgeBase={selectedKB} 
          onRefresh={loadKnowledgeBases}
        />
        
        <FileUploadDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          onUploadComplete={handleUploadSuccess}
          selectedKnowledgeBase={selectedKB}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">知识库管理</h2>
          <p className="text-muted-foreground">
            创建和管理您的RAG知识库
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          创建知识库
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {knowledgeBases.map((kb) => (
            <Card 
              key={kb.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedKB(kb)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Database className="w-6 h-6 text-primary" />
                  <Badge variant="secondary">
                    {kb.file_count || 0} 文件
                  </Badge>
                </div>
                <CardTitle className="text-lg">{kb.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {kb.description || "暂无描述"}
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <FileText className="w-3 h-3 mr-1" />
                  创建于 {new Date(kb.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {knowledgeBases.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">还没有知识库</h3>
          <p className="text-muted-foreground mb-4">
            创建您的第一个知识库来开始使用RAG功能
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建知识库
          </Button>
        </Card>
      )}

      <CreateKnowledgeBaseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
} 