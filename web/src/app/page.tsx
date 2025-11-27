// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import {
  ApartmentOutlined,
  BarChartOutlined,
  BookOutlined,
  BulbOutlined,
  CarOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  LineChartOutlined,
  MessageOutlined,
  PieChartOutlined
} from "@ant-design/icons";
import { Settings } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Layout } from "~/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

interface WorkPanelItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

export default function HomePage() {
  const workPanelItems: WorkPanelItem[] = useMemo(() => [
    {
      title: "智能对话",
      description: "与AI助手进行自然语言对话，获取智能回答和建议",
      icon: <MessageOutlined className="text-2xl" />,
      href: "/chatbot",
      color: "bg-gradient-to-br from-blue-500 to-purple-600"
    },
    {
      title: "Chat BI",
      description: "通过对话方式进行商业智能分析和数据洞察",
      icon: <BarChartOutlined className="text-2xl" />,
      href: "/charts",
      color: "bg-gradient-to-br from-green-500 to-teal-600"
    },
    {
      title: "数据探索",
      description: "上传数据文件，进行可视化分析和智能洞察",
      icon: <DatabaseOutlined className="text-2xl" />,
      href: "/data_exploration",
      color: "bg-gradient-to-br from-cyan-500 to-blue-600"
    },

    {
      title: "分析报告",
      description: "生成和查看数据分析报告，支持多种图表展示",
      icon: <FileTextOutlined className="text-2xl" />,
      href: "/reports",
      color: "bg-gradient-to-br from-gray-500 to-slate-600"
    },
    {
      title: "Deep Research",
      description: "多智能体深度调研与知识梳理",
      icon: <BulbOutlined className="text-2xl" />,
      href: "/deep_research",
      color: "bg-gradient-to-br from-orange-500 to-red-600"
    },
    {
      title: "知识库",
      description: "构建和管理知识库，支撑文档检索和智能问答",
      icon: <BookOutlined className="text-2xl" />,
      href: "/knowledge_base",
      color: "bg-gradient-to-br from-indigo-500 to-blue-600"
    },
    {
      title: "销售预测",
      description: "预测航空汽油的销售情况，为航油采购提供数据支撑",
      icon: <LineChartOutlined className="text-2xl" />,
      href: "/sales_forecast",
      color: "bg-gradient-to-br from-pink-500 to-rose-600"
    },
    {
      title: "智能工作流",
      description: "通过可视化智能工作流编排自动化任务和业务流程",
      icon: <ApartmentOutlined className="text-2xl" />,
      href: "/n8n",
      color: "bg-gradient-to-br from-purple-500 to-violet-600"
    },
    {
      title: "自动派工",
      description: "航油加油车自动派工系统",
      icon: <CarOutlined className="text-2xl" />,
      href: "/auto_dispatch",
      color: "bg-gradient-to-br from-purple-500 to-violet-600"
    },
    {
    title: "系统管理",
    description: "个人设置、用户管理、系统配置等管理功能",
    icon: <Settings className="text-2xl" />,
    href: "/system",
    color: "bg-gradient-to-br from-violet-500 to-purple-600"
  }
  ], []);

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">欢迎使用 IAS Mind</h1>
          <p className="text-lg text-muted-foreground">
            选择以下任意功能开始您的智能分析之旅
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {workPanelItems.map((item, index) => (
            <Link href={item.href} key={index}>
              <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="pb-2">
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center text-white mb-4`}>
                    {item.icon}
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{item.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
