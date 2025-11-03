// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { motion } from "framer-motion";

import { cn } from "~/lib/utils";

import { Welcome } from "./welcome";

const questions = [
  "油温油密对加油量的影响？",
  "虹桥油库紧急疏散现场处置方案如何让启动？",
  "值班经理每日工作记录如何填写？",
  "自控A职责的职责是什么？",
];
export function ConversationStarter({
  className,
  onSend,
}: {
  className?: string;
  onSend?: (
    message: string,
    options?: {
      interruptFeedback?: string;
      resources?: Array<any>;
      enableOnlineSearch?: boolean;
      enableKnowledgeRetrieval?: boolean;
      files?: Array<any>;
    },
  ) => void;
}) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <Welcome className="pointer-events-auto mb-15 w-[75%] -translate-y-24" />
      </div>
      <ul className="flex flex-wrap">
        {questions.map((question, index) => (
          <motion.li
            key={question}
            className="flex w-1/2 shrink-0 p-2 active:scale-105"
            style={{ transition: "all 0.2s ease-out" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              duration: 0.2,
              delay: index * 0.1 + 0.5,
              ease: "easeOut",
            }}
          >
            <div
              className="bg-card text-muted-foreground cursor-pointer rounded-2xl border px-4 py-4 opacity-75 transition-all duration-300 hover:opacity-100 hover:shadow-md"
              onClick={() => {
                // 不传递 enableKnowledgeRetrieval，让父组件根据当前选中的知识库状态决定
                onSend?.(question, {
                  enableOnlineSearch: false,
                });
              }}
            >
              {question}
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
