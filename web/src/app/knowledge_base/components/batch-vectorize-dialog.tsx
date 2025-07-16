// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import React, { useState, useEffect } from "react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { knowledgeBaseApi, type FileDocument, type KnowledgeBase } from "~/core/api/knowledge-base";
import { toast } from "sonner";

interface BatchVectorizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: FileDocument[];
  selectedKnowledgeBase?: KnowledgeBase;
  onComplete: () => void;
}

interface VectorizeResult {
  file_id: string;
  status: "success" | "failed" | "skipped";
  message: string;
  vector_count?: number;
}

export function BatchVectorizeDialog({
  open,
  onOpenChange,
  files,
  selectedKnowledgeBase,
  onComplete,
}: BatchVectorizeDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<VectorizeResult[]>([]);
  const [currentFile, setCurrentFile] = useState<string>("");

  // 当对话框打开时重置状态
  useEffect(() => {
    if (open) {
      setIsProcessing(false);
      setProgress(0);
      setResults([]);
      setCurrentFile("");
    }
  }, [open]);

  const canVectorizeFiles = files.filter(file => file.status === "uploaded");

  const HandleStartVectorize = async () => {
    if (canVectorizeFiles.length === 0) {
      toast.error("没有可以向量化的文件");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const response = await knowledgeBaseApi.BatchVectorizeFiles({
        file_ids: canVectorizeFiles.map(f => f.id),
        knowledge_base_id: selectedKnowledgeBase?.id
      });

      if (response.success) {
        setResults(response.results);
        
        const successCount = response.results.filter(r => r.status === "success").length;
        const skippedCount = response.results.filter(r => r.status === "skipped").length;
        const failedCount = response.results.filter(r => r.status === "failed").length;

        let message = `批量向量化完成: ${successCount} 个成功`;
        if (skippedCount > 0) message += `, ${skippedCount} 个跳过`;
        if (failedCount > 0) message += `, ${failedCount} 个失败`;

        toast.success(message);
        onComplete();
      } else {
        toast.error("批量向量化失败");
      }
    } catch (error) {
      console.error("批量向量化失败:", error);
      toast.error("批量向量化失败");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const GetStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "skipped":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const GetStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "default";
      case "failed":
        return "destructive";
      case "skipped":
        return "secondary";
      default:
        return "outline";
    }
  };

  const GetStatusText = (status: string) => {
    switch (status) {
      case "success":
        return "成功";
      case "failed":
        return "失败";
      case "skipped":
        return "跳过";
      default:
        return "未知";
    }
  };

  const successCount = results.filter(r => r.status === "success").length;
  const failedCount = results.filter(r => r.status === "failed").length;
  const skippedCount = results.filter(r => r.status === "skipped").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量向量化文件</DialogTitle>
          <DialogDescription>
            将对选中的 {canVectorizeFiles.length} 个文件进行向量化处理
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 文件列表 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">待向量化文件 ({canVectorizeFiles.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {canVectorizeFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <span className="text-lg">
                    {knowledgeBaseApi.utils.getFileIcon(file.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {knowledgeBaseApi.utils.formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 处理进度 */}
          {isProcessing && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">处理进度</h4>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                正在处理文件...
              </p>
            </div>
          )}

          {/* 处理结果 */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">处理结果</h4>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>成功: {successCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>失败: {failedCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span>跳过: {skippedCount}</span>
                </div>
              </div>
              
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {results.map((result, index) => {
                    const file = files.find(f => f.id === result.file_id);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 border rounded"
                      >
                        {GetStatusIcon(result.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file?.name || result.file_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {result.message}
                            {result.vector_count && ` (${result.vector_count} 个向量)`}
                          </p>
                        </div>
                        <Badge variant={GetStatusColor(result.status) as any}>
                          {GetStatusText(result.status)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          {!isProcessing && (
            <div className="flex gap-2">
              <Button onClick={HandleStartVectorize}>
                {results.length > 0 ? "重新向量化" : "开始向量化"}
              </Button>
              {results.length > 0 && (
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  完成
                </Button>
              )}
            </div>
          )}
          {isProcessing && (
            <Button disabled>
              处理中...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 