// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { 
  Plus, 
  Database, 
  Settings,
  Loader2
} from "lucide-react";
import { knowledgeBaseApi } from "~/core/api/knowledge-base";
import { toast } from "sonner";

interface CreateKnowledgeBaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function CreateKnowledgeBaseDialog({
  open,
  onOpenChange,
  onSuccess,
  trigger
}: CreateKnowledgeBaseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    embedding_model: "text-embedding-3-small",
    chunk_size: 1000,
    chunk_overlap: 200
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("请输入知识库名称");
      return;
    }

    setLoading(true);
    try {
      const response = await knowledgeBaseApi.CreateKnowledgeBase({
        name: formData.name.trim(),
        description: formData.description.trim(),
        embedding_model: formData.embedding_model,
        chunk_size: formData.chunk_size,
        chunk_overlap: formData.chunk_overlap,
      });

      if (response.success) {
        toast.success("知识库创建成功");
        // 重置表单
        setFormData({
          name: "",
          description: "",
          embedding_model: "text-embedding-3-small",
          chunk_size: 1000,
          chunk_overlap: 200
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("知识库创建失败");
      }
    } catch (error) {
      console.error("创建知识库失败:", error);
      toast.error("创建知识库失败");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            创建知识库
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">知识库名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="请输入知识库名称"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">知识库描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="请输入知识库描述"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 配置信息 */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-4 w-4" />
                <Label className="text-base font-medium">向量化配置</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="embedding_model">嵌入模型</Label>
                  <Select 
                    value={formData.embedding_model} 
                    onValueChange={(value) => handleInputChange("embedding_model", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="text-embedding-3-small">bge-m3</SelectItem>
                      <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                      <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chunk_size">分块大小</Label>
                  <Input
                    id="chunk_size"
                    type="number"
                    min={100}
                    max={5000}
                    value={formData.chunk_size}
                    onChange={(e) => handleInputChange("chunk_size", parseInt(e.target.value))}
                    placeholder="1000"
                  />
                  <p className="text-xs text-muted-foreground">字符数，范围：100-5000</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chunk_overlap">分块重叠</Label>
                <Input
                  id="chunk_overlap"
                  type="number"
                  min={0}
                  max={1000}
                  value={formData.chunk_overlap}
                  onChange={(e) => handleInputChange("chunk_overlap", parseInt(e.target.value))}
                  placeholder="200"
                />
                <p className="text-xs text-muted-foreground">字符数，范围：0-1000</p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  创建知识库
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 