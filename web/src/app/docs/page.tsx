// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { GithubOutlined, SaveOutlined, FileTextOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useState } from "react";

import { Button } from "~/components/ui/button";

import { Logo } from "../../components/deer-flow/logo";
import { ThemeToggle } from "../../components/deer-flow/theme-toggle";
import { Tooltip } from "../../components/deer-flow/tooltip";
import { SettingsDialog } from "../settings/dialogs/settings-dialog";

const ReportEditor = dynamic(() => import("../../components/editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      Loading Editor...
    </div>
  ),
});

export default function DocsPage() {
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState("已保存");

  const handleMarkdownChange = (markdown: string) => {
    setContent(markdown);
    setSaveStatus("已保存");
  };

  const handleSave = () => {
    // 这里可以添加保存到本地存储或服务器的逻辑
    setSaveStatus("已保存");
  };

  return (
    <div className="flex h-screen w-screen flex-col overscroll-none">
      {/* Header */}
      <header className="flex h-16 w-full items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <Logo />
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <FileTextOutlined />
            <span className="font-medium">文档编辑器</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {saveStatus}
          </div>
          <Tooltip title="保存文档">
            <Button variant="ghost" size="icon" onClick={handleSave}>
              <SaveOutlined />
            </Button>
          </Tooltip>
          <Tooltip title="Star DeerFlow on GitHub">
            <Button variant="ghost" size="icon" asChild>
              <Link
                href="https://github.com/bytedance/deer-flow"
                target="_blank"
              >
                <GithubOutlined />
              </Link>
            </Button>
          </Tooltip>
          <ThemeToggle />
          <Suspense>
            <SettingsDialog />
          </Suspense>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <div className="h-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <Suspense fallback={<div className="flex h-full items-center justify-center">Loading Editor...</div>}>
              <ReportEditor
                content={content || {
                  type: "doc",
                  content: [
                    {
                      type: "heading",
                      attrs: { level: 1 },
                      content: [{ type: "text", text: "欢迎使用 DeerFlow 文档编辑器" }]
                    },
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "这是一个功能强大的富文本编辑器，支持多种格式和功能。" }
                      ]
                    },
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "您可以在这里创建和编辑文档，支持 Markdown 语法。" }
                      ]
                    }
                  ]
                }}
                onMarkdownChange={handleMarkdownChange}
              />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
} 