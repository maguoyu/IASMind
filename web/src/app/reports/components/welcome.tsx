// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { motion } from "framer-motion";

import { cn } from "~/lib/utils";

export function Welcome({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("flex flex-col", className)}
      style={{ transition: "all 0.2s ease-out" }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <h3 className="mb-2 text-center text-3xl font-medium">
        📊 智能报告分析
      </h3>
      <div className="text-muted-foreground px-4 text-center text-lg">
        欢迎使用{" "}
        <a
          href="https://github.com/bytedance/deer-flow"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          🧠 IAS_Mind
        </a>
        {" "}智能报告分析系统。基于先进的语言模型，为您提供专业的报告生成服务。
      </div>
      <div className="text-muted-foreground mt-4 px-4 text-center text-base">
        <p className="mb-2">✨ 核心功能：</p>
        <p className="mb-1">• 多源数据整合（知识库、网络搜索、数据库）</p>
        <p className="mb-1">• 智能报告生成与可视化图表</p>
        <p className="mb-1">• 多格式导出（HTML、Markdown、PDF、Word）</p>
        <p>• 结构化报告（目录、标题、段落、结论）</p>
      </div>
    </motion.div>
  );
}
