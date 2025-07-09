// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { useState, useMemo } from "react";
import { Database, FileText, BarChart3, Settings } from "lucide-react";
import { HomeOutlined } from "@ant-design/icons";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { Logo } from "~/components/deer-flow/logo";
import { ThemeToggle } from "~/components/deer-flow/theme-toggle";
import { Tooltip } from "~/components/deer-flow/tooltip";
import { FileManagementTab } from "./components/tabs/file-management-tab";
import { KnowledgeBaseManagementTab } from "./components/tabs/knowledge-base-management-tab";
import { DataPreviewTab } from "./components/tabs/data-preview-tab";
import { OverviewTab } from "./components/tabs/overview-tab";
import { SettingsDialog } from "../settings/dialogs/settings-dialog";

type MenuItem = "overview" | "files" | "knowledge-bases" | "preview";

interface MenuItemType {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function KnowledgeBaseMain() {
  const [activeMenu, setActiveMenu] = useState<MenuItem>("overview");

  // 菜单项配置 - 一级菜单结构
  const menuItems: MenuItemType[] = [
    { id: "overview", label: "概览", icon: BarChart3 },
    { id: "files", label: "文件管理", icon: FileText },
    { id: "knowledge-bases", label: "知识库管理", icon: Database },
    { id: "preview", label: "数据预览", icon: Settings },
  ];



  // 渲染菜单项
  const renderMenuItem = (item: MenuItemType) => {
    const Icon = item.icon;
    const isActive = activeMenu === item.id;
    
    return (
      <Button
        key={item.id}
        variant={isActive ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => setActiveMenu(item.id as MenuItem)}
      >
        <Icon className="w-4 h-4 mr-2" />
        <span className="truncate max-w-[160px] block">{item.label}</span>
      </Button>
    );
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "overview":
        return <OverviewTab />;
      case "files":
        return <FileManagementTab />;
      case "knowledge-bases":
        return <KnowledgeBaseManagementTab />;
      case "preview":
        return <DataPreviewTab />;
      default:
        return <OverviewTab />;
    }
  };

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
      <div className="flex h-full w-full pt-16">
        {/* 左侧菜单 */}
        <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 p-4">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground mb-2">知识库管理</h1>
            <p className="text-sm text-muted-foreground">
              管理您的RAG知识库
            </p>
          </div>
          <div className="space-y-2">
            {menuItems.map((item) => renderMenuItem(item))}
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </div>

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
        <p>&copy; {year} IAS_Mind</p>
      </div>
    </footer>
  );
} 