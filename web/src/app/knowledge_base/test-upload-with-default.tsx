// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { FileUploadDialog } from "./components/file-upload-dialog";

export default function TestUploadWithDefault() {
  const [showUploadDialog, setShowUploadDialog] = React.useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">文件上传测试 - 简化版</h1>
        <p className="text-muted-foreground mb-6">
          测试简化后的文件上传功能，直接使用当前数据库
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 测试：简化上传 */}
        <Card>
          <CardHeader>
            <CardTitle>简化文件上传</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              无需选择知识库，系统将自动使用当前数据库存储文件
            </p>
            <Button 
              onClick={() => setShowUploadDialog(true)}
              className="w-full"
            >
              开始上传文件
            </Button>
          </CardContent>
        </Card>

        {/* 功能说明 */}
        <Card>
          <CardHeader>
            <CardTitle>功能说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">简化功能：</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 移除了知识库选择界面</li>
                <li>• 直接使用当前数据库存储文件</li>
                <li>• 系统自动选择或创建默认知识库</li>
                <li>• 界面更加简洁，操作更便捷</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">测试步骤：</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. 点击"开始上传文件"按钮</li>
                <li>2. 选择要上传的文件</li>
                <li>3. 点击"开始上传"</li>
                <li>4. 观察文件是否成功上传到当前数据库</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 文件上传对话框 */}
      <FileUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUploadComplete={(files) => {
          console.log("文件上传完成:", files);
          alert(`成功上传 ${files.length} 个文件到当前数据库！`);
        }}
      />
    </div>
  );
} 