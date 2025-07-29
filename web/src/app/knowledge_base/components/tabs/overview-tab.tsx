// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { Database, FileText, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function OverviewTab() {
  const stats = [
    {
      title: "知识库总数",
      value: "12",
      icon: Database,
      description: "活跃知识库"
    },
    {
      title: "文档总数", 
      value: "1,248",
      icon: FileText,
      description: "已索引文档"
    },
    {
      title: "用户数量",
      value: "45",
      icon: Users,
      description: "活跃用户"
    },
    {
      title: "查询次数",
      value: "3,567",
      icon: TrendingUp,
      description: "本月查询"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">知识库概览</h2>
        <p className="text-muted-foreground">
          查看您的知识库系统的整体状态和使用情况
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>系统状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">向量化服务</span>
              <span className="text-sm text-green-600">正常运行</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">搜索服务</span>
              <span className="text-sm text-green-600">正常运行</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">数据库连接</span>
              <span className="text-sm text-green-600">连接正常</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 