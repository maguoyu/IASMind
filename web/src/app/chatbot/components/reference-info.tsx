// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { ExternalLink, FileText, Globe, Eye } from "lucide-react";
import React, { useState } from "react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

interface ReferenceInfoProps {
  className?: string;
  knowledgeBaseResults?: Array<{
    id?: string | null;
    content?: string;
    metadata?: {
      file_name?: string;
      source?: string;
      [key: string]: any;
    };
  }>;
  webSearchResults?: Array<{
    type?: string;
    title?: string;
    url?: string;
    content?: string;
  }>;
}

export function ReferenceInfo({
  className,
  knowledgeBaseResults = [],
  webSearchResults = [],
}: ReferenceInfoProps) {
  const hasKnowledgeBase = knowledgeBaseResults.length > 0;
  const hasWebSearch = webSearchResults.length > 0;

  if (!hasKnowledgeBase && !hasWebSearch) {
    return null;
  }

  const totalReferences = (hasKnowledgeBase ? knowledgeBaseResults.length : 0) + 
                         (hasWebSearch ? webSearchResults.length : 0);

  return (
    <div className={cn("mt-3", className)}>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Eye size={14} />
            查看参考信息 ({totalReferences})
          </Button>
        </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold">参考信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 知识库文件参考 */}
            {hasKnowledgeBase && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
                  <FileText size={18} />
                  知识库文件 ({knowledgeBaseResults.length})
                </h3>
                <div className="space-y-2">
                  {knowledgeBaseResults.map((result, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 rounded p-3 border-l-4 border-blue-500"
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        📄 {result.metadata?.file_name || `文件 ${index + 1}`}
                      </div>
                      {result.content && (
                        <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          {result.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 网络搜索结果参考 */}
            {hasWebSearch && (
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-green-800 dark:text-green-200 mb-3">
                  <Globe size={18} />
                  网络搜索结果 ({webSearchResults.length})
                </h3>
                <div className="space-y-2">
                  {webSearchResults.map((result, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 rounded p-3 border-l-4 border-green-500"
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        🌐 {result.title || `搜索结果 ${index + 1}`}
                      </div>
                      {result.url && (
                        <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline break-all"
                          >
                            {result.url}
                          </a>
                        </div>
                      )}
                      {result.content && (
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {result.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 