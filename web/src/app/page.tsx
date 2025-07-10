// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { MessageOutlined, BarChartOutlined, BulbOutlined, BookOutlined, FileTextOutlined, DatabaseOutlined, LineChartOutlined } from "@ant-design/icons";
import { Settings } from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Layout } from "~/components/layout";

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
      title: "系统管理",
      description: "个人设置、用户管理、系统配置等管理功能",
      icon: <Settings className="text-2xl" />,
      href: "/system",
      color: "bg-gradient-to-br from-violet-500 to-purple-600"
    },
  ], []);

  return (
    <Layout>
      <div className="container mx-auto px-6 pb-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            欢迎使用 IAS_Mind
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            一个强大的AI工作平台，集成了智能对话、数据分析、思维导图等多种功能，提升您的工作效率
          </p>
        </div>

        {/* Work Panel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {workPanelItems.map((item, index) => (
            <Link key={index} href={item.href} className="group">
              <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {item.icon}
                  </div>
                  <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      点击进入
                    </span>
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center group-hover:bg-slate-300 dark:group-hover:bg-slate-600 transition-colors duration-300">
                      <svg className="w-3 h-3 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="text-center border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">100+</div>
              <div className="text-slate-600 dark:text-slate-400">活跃用户</div>
            </CardContent>
          </Card>
          <Card className="text-center border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">50+</div>
              <div className="text-slate-600 dark:text-slate-400">功能模块</div>
            </CardContent>
          </Card>
          <Card className="text-center border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">99.9%</div>
              <div className="text-slate-600 dark:text-slate-400">系统稳定性</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
