// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { HomeOutlined, MessageOutlined, BarChartOutlined, SettingOutlined, BulbOutlined, BookOutlined, FileTextOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useMemo } from "react";

import { Logo } from "~/components/deer-flow/logo";
import { ThemeToggle } from "~/components/deer-flow/theme-toggle";
import { Tooltip } from "~/components/deer-flow/tooltip";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

import { SettingsDialog } from "./settings/dialogs/settings-dialog";

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
      href: "/chat",
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
      description: "构建和管理知识库，支持文档检索和智能问答",
      icon: <BookOutlined className="text-2xl" />,
      href: "/knowledge",
      color: "bg-gradient-to-br from-indigo-500 to-blue-600"
    }
  ], []);

  return (
    <div className="min-h-screen bg-app">
      {/* Header */}
      <header className="fixed top-0 left-0 flex h-16 w-full items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 z-50">
        <Logo />
        <div className="flex items-center gap-2">
          <Tooltip title="返回首页">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <HomeOutlined />
              </Link>
            </Button>
          </Tooltip>
          <ThemeToggle />
          <SettingsDialog />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 pt-24 pb-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            欢迎使用 DeerFlow
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
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function Footer() {
  const year = useMemo(() => new Date().getFullYear(), []);
  return (
    <footer className="container mx-auto px-6 mt-16">
      <hr className="from-border/0 via-border/70 to-border/0 m-0 h-px w-full border-none bg-gradient-to-r" />
      <div className="text-muted-foreground flex h-20 flex-col items-center justify-center text-sm">
        <p className="text-center font-serif text-lg md:text-xl">
          &quot;Originated from Open Source, give back to Open Source.&quot;
        </p>
      </div>
      <div className="text-muted-foreground mb-8 flex flex-col items-center justify-center text-xs">
        <p>Licensed under MIT License</p>
        <p>&copy; {year} DeerFlow</p>
      </div>
    </footer>
  );
}
