// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { FileUploadDialog } from "./components/file-upload-dialog";
import SimpleFileManagement from "./components/simple-file-management";
import { knowledgeBaseApi } from "~/core/api/knowledge-base";
import { toast } from "sonner";

export default function TestUploadRefresh() {
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = React.useState<any>(null);
  const [knowledgeBases, setKnowledgeBases] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showUploadDialog, setShowUploadDialog] = React.useState(false);

  // 加载知识库列表
  const LoadKnowledgeBases = async () => {
    setLoading(true);
    try {
      const response = await knowledgeBaseApi.GetKnowledgeBases();
      setKnowledgeBases(response.knowledge_bases);
      
      // 选择第一个知识库作为测试
      if (response.knowledge_bases.length > 0) {
        setSelectedKnowledgeBase(response.knowledge_bases[0]);
      }
    } catch (error) {
      console.error("加载知识库列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const HandleRefresh = () => {
    LoadKnowledgeBases();
  };

  // 文件上传完成回调
  const HandleUploadComplete = (files: File[]) => {
    console.log("文件上传完成:", files);
    toast.success(`成功上传 ${files.length} 个文件！`);
    
    // 延迟刷新，确保后端数据已更新
    setTimeout(() => {
      HandleRefresh();
    }, 1000);
  };

  React.useEffect(() => {
    LoadKnowledgeBases();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">文件上传刷新测试</h1>
        <p className="text-muted-foreground mb-6">
          测试文件上传成功后文件列表自动刷新功能
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 测试控制面板 */}
        <Card>
          <CardHeader>
            <CardTitle>测试控制</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">当前测试知识库：</h4>
              {selectedKnowledgeBase ? (
                <div className="text-sm space-y-1">
                  <p><strong>名称：</strong>{selectedKnowledgeBase.name}</p>
                  <p><strong>文件数：</strong>{selectedKnowledgeBase.file_count}</p>
                  <p><strong>向量数：</strong>{selectedKnowledgeBase.vector_count}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">未选择知识库</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={() => setShowUploadDialog(true)}
                className="w-full"
                disabled={!selectedKnowledgeBase}
              >
                开始上传文件测试
              </Button>
              
              <Button 
                onClick={HandleRefresh}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                手动刷新数据
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">测试步骤：</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. 点击"开始上传文件测试"</li>
                <li>2. 选择要上传的文件</li>
                <li>3. 点击"开始上传"</li>
                <li>4. 观察文件列表是否自动刷新</li>
                <li>5. 检查文件数量和统计信息是否更新</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* 功能说明 */}
        <Card>
          <CardHeader>
            <CardTitle>功能说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">自动刷新机制：</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 文件上传完成后触发刷新回调</li>
                <li>• 更新知识库列表和当前选中知识库信息</li>
                <li>• 文件管理组件监听知识库信息变化</li>
                <li>• 自动重新加载文件列表</li>
                <li>• 更新统计信息和文件数量</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">预期效果：</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 上传成功后显示成功提示</li>
                <li>• 文件列表自动显示新上传的文件</li>
                <li>• 知识库文件数量统计更新</li>
                <li>• 无需手动刷新页面</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 文件管理组件 */}
      {selectedKnowledgeBase && (
        <Card>
          <CardHeader>
            <CardTitle>文件管理测试</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleFileManagement
              selectedKnowledgeBase={selectedKnowledgeBase}
              onRefresh={HandleRefresh}
            />
          </CardContent>
        </Card>
      )}

      {/* 文件上传对话框 */}
      <FileUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        selectedKnowledgeBase={selectedKnowledgeBase}
        onUploadComplete={HandleUploadComplete}
      />
    </div>
  );
} 