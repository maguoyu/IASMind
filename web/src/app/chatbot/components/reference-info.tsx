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
        <DialogContent className="max-w-[98vw] max-h-[99vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>参考信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 知识库文件参考 */}
            {hasKnowledgeBase && (
              <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-medium text-blue-700 dark:text-blue-300">
                    <FileText size={18} />
                    知识库文件 ({knowledgeBaseResults.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {knowledgeBaseResults.map((result, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-lg border border-blue-200 bg-white p-2 dark:border-blue-800 dark:bg-blue-950/10"
                      >
                        <FileText size={16} className="mt-0.5 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                            {result.metadata?.file_name || `文件 ${index + 1}`}
                          </div>
                          {result.content && (
                            <div className="text-sm text-blue-600 dark:text-blue-300 leading-relaxed">
                              {result.content}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 网络搜索结果参考 */}
            {hasWebSearch && (
              <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-medium text-green-700 dark:text-green-300">
                    <Globe size={18} />
                    网络搜索结果 ({webSearchResults.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {webSearchResults.map((result, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-lg border border-green-200 bg-white p-2 dark:border-green-800 dark:bg-green-950/10"
                      >
                        <Globe size={16} className="mt-0.5 text-green-600 dark:text-green-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                            {result.title || `搜索结果 ${index + 1}`}
                          </div>
                          {result.url && (
                            <div className="mb-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-sm text-green-600 hover:text-green-700 dark:text-green-300 dark:hover:text-green-200"
                                onClick={() => window.open(result.url, '_blank')}
                              >
                                <ExternalLink size={14} className="mr-1" />
                                {result.url}
                              </Button>
                            </div>
                          )}
                          {result.content && (
                            <div className="text-sm text-green-600 dark:text-green-300 leading-relaxed">
                              {result.content}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 