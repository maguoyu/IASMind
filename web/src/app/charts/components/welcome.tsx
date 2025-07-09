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
        📊 欢迎使用 Chat BI
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
        {" "}的智能商业分析功能，基于先进的语言模型，帮助您通过自然语言查询数据，
        获得即时的可视化分析结果和商业洞察。
      </div>
    </motion.div>
  );
}
