// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { DownloadIcon, FileTextIcon } from "lucide-react";

export function SampleTemplate() {
  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/sales_forecast/download_template');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sales_sample_template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('模板下载失败:', error);
      alert('模板下载失败，请稍后重试');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileTextIcon className="w-5 h-5" />
          数据模板
        </CardTitle>
        <CardDescription>
          下载Excel模板文件，了解样本数据的标准格式
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={downloadTemplate} variant="outline" className="w-full">
            <DownloadIcon className="w-4 h-4 mr-2" />
            下载Excel模板
          </Button>
          
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
            <p><strong>必要字段：</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><code>date</code> - 日期 (格式: YYYY-MM-DD)</li>
              <li><code>sales_volume</code> - 销量 (万升)</li>
              <li><code>price</code> - 价格 (元/升)</li>
              <li><code>region</code> - 地区</li>
              <li><code>season</code> - 季节</li>
            </ul>
            
            <p className="mt-3"><strong>可选字段：</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><code>weather</code> - 天气状况</li>
              <li><code>events</code> - 特殊事件</li>
              <li><code>notes</code> - 备注信息</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 