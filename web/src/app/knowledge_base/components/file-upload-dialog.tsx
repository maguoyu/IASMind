// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import React, { useState, useCallback } from "react";
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import type { UploadProgress } from "~/app/knowledge_base/types";
import { knowledgeBaseApi, type KnowledgeBase } from "~/core/api/knowledge-base";

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedKnowledgeBase?: KnowledgeBase;
  onUploadComplete?: (files: File[]) => void;
}

export function FileUploadDialog({
  open,
  onOpenChange,
  selectedKnowledgeBase: propSelectedKnowledgeBase,
  onUploadComplete,
}: FileUploadDialogProps) {
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<string>("");
  const [uploadFiles, setUploadFiles] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("word")) return "📝";
    if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
    if (type.includes("text")) return "📄";
    return "📁";
  };

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newUploadFiles: UploadProgress[] = fileArray.map((file) => ({
      file,
      progress: 0,
      status: "pending",
    }));
    setUploadFiles((prev) => [...prev, ...newUploadFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 加载知识库列表
  const loadKnowledgeBases = async () => {
    try {
      const response = await knowledgeBaseApi.GetKnowledgeBases({ page_size: 100 });
      setKnowledgeBases(response.knowledge_bases);
    } catch (error) {
      console.error("加载知识库列表失败:", error);
    }
  };

  // 当对话框打开时加载知识库列表
  React.useEffect(() => {
    if (open) {
      loadKnowledgeBases();
      // 如果有传入的知识库，设置它
      if (propSelectedKnowledgeBase) {
        setSelectedKnowledgeBase(propSelectedKnowledgeBase.id);
      }
    }
  }, [open, propSelectedKnowledgeBase]);

  const handleUpload = async () => {
    if (!selectedKnowledgeBase || uploadFiles.length === 0) return;

    setIsLoading(true);

    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        
        // 更新状态为上传中
        setUploadFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "uploading" } : f
          )
        );

        try {
          // 实际上传文件
          const response = await knowledgeBaseApi.UploadFile(
            file.file,
            selectedKnowledgeBase,
            file.file.name
          );

          if (response.success) {
            // 上传成功
            setUploadFiles((prev) =>
              prev.map((f, idx) =>
                idx === i ? { ...f, status: "completed", progress: 100 } : f
              )
            );
          } else {
            // 上传失败
            setUploadFiles((prev) =>
              prev.map((f, idx) =>
                idx === i ? { ...f, status: "failed", error: response.message } : f
              )
            );
          }
        } catch (error) {
          // 上传出错
          setUploadFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "failed", error: error instanceof Error ? error.message : "上传失败" } : f
            )
          );
        }
      }

      // 通知上传完成
      if (onUploadComplete) {
        onUploadComplete(uploadFiles.map((f) => f.file));
      }

      // 延迟关闭对话框
      setTimeout(() => {
        onOpenChange(false);
        setUploadFiles([]);
        setSelectedKnowledgeBase("");
      }, 1000);

    } catch (error) {
      console.error("上传过程中发生错误:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: UploadProgress["status"]) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "uploading":
        return "default";
      case "processing":
        return "default";
      case "completed":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusText = (status: UploadProgress["status"]) => {
    switch (status) {
      case "pending":
        return "等待上传";
      case "uploading":
        return "上传中";
      case "processing":
        return "处理中";
      case "completed":
        return "已完成";
      case "failed":
        return "上传失败";
      default:
        return "未知状态";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>上传文件到知识库</DialogTitle>
          <DialogDescription>
            选择要上传的文件，支持 PDF、Word、Excel、TXT 等格式
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 知识库选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">选择目标知识库</label>
            <Select value={selectedKnowledgeBase} onValueChange={setSelectedKnowledgeBase}>
              <SelectTrigger>
                <SelectValue placeholder="请选择知识库" />
              </SelectTrigger>
              <SelectContent>
                {knowledgeBases.map((kb) => (
                  <SelectItem key={kb.id} value={kb.id}>
                    <div className="flex flex-col">
                      <span>{kb.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {kb.file_count} 个文件 • {kb.vector_count} 个向量
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 文件拖拽区域 */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">拖拽文件到此处或点击选择</p>
              <p className="text-sm text-muted-foreground">
                支持 PDF、Word、Excel、TXT 格式，单文件最大 50MB
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.multiple = true;
                  input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.md";
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) handleFileSelect(files);
                  };
                  input.click();
                }}
              >
                选择文件
              </Button>
            </div>
          </div>

          {/* 上传文件列表 */}
          {uploadFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">待上传文件 ({uploadFiles.length})</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {uploadFiles.map((uploadFile, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <span className="text-2xl">{getFileIcon(uploadFile.file.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {uploadFile.file.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(uploadFile.status)}>
                            {getStatusText(uploadFile.status)}
                          </Badge>
                          {uploadFile.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {formatFileSize(uploadFile.file.size)}
                      </p>
                      {uploadFile.status !== "pending" && (
                        <Progress value={uploadFile.progress} className="h-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedKnowledgeBase || uploadFiles.length === 0 || isLoading}
          >
            {isLoading ? "上传中..." : "开始上传"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 