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
        👋 欢迎您!
      </h3>
      <div className="text-muted-foreground px-4 text-center text-lg">
       使用{" "}

         智航AI平台，智能对话
       
        , 依托企业知识库，与AI助手进行自然语言对话，获取智能回答和建议
      </div>
    </motion.div>
  );
}
