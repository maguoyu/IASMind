// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { knowledgeBaseApi, type FileDocument } from "~/core/api/knowledge-base";
import { toast } from "sonner";

export function FileIdsExample() {
  const [fileIds, setFileIds] = useState<string>("");
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [loading, setLoading] = useState(false);

  const HandleSearchByFileIds = async () => {
    if (!fileIds.trim()) {
      toast.error("请输入文件ID");
      return;
    }

    setLoading(true);
    try {
      // 将逗号分隔的字符串转换为数组
      const ids = fileIds.split(",").map(id => id.trim()).filter(id => id);
      
      const response = await knowledgeBaseApi.GetFiles({
        file_ids: ids
      });

      setFiles(response.files);
      toast.success(`找到 ${response.files.length} 个文件`);
    } catch (error) {
      console.error("查询失败:", error);
      toast.error("查询失败");
    } finally {
      setLoading(false);
    }
  };

  const HandleClear = () => {
    setFileIds("");
    setFiles([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>通过文件ID列表查询文件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileIds">文件ID列表（用逗号分隔）</Label>
            <Input
              id="fileIds"
              placeholder="例如: file-id-1,file-id-2,file-id-3"
              value={fileIds}
              onChange={(e) => setFileIds(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              输入多个文件ID，用逗号分隔，系统将返回这些ID对应的文件
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={HandleSearchByFileIds} disabled={loading}>
              {loading ? "查询中..." : "查询文件"}
            </Button>
            <Button variant="outline" onClick={HandleClear}>
              清空
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 查询结果 */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>查询结果 ({files.length} 个文件)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <span className="text-lg">
                    {knowledgeBaseApi.utils.getFileIcon(file.type)}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{file.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {file.id} | 大小: {knowledgeBaseApi.utils.formatFileSize(file.size)} | 状态: {knowledgeBaseApi.utils.getStatusText(file.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 