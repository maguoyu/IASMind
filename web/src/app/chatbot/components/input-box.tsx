// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { MagicWandIcon } from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Search, BookOpen, X, Globe, Loader2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { toast } from "sonner";

import { Detective } from "~/components/deer-flow/icons/detective";
import MessageInput, {
  type MessageInputRef,
} from "~/components/deer-flow/message-input";
import { ReportStyleDialog } from "~/components/deer-flow/report-style-dialog";
import { Tooltip } from "~/components/deer-flow/tooltip";
import { BorderBeam } from "~/components/magicui/border-beam";
import { Button } from "~/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { enhancePrompt } from "~/core/api";
import { getConfig } from "~/core/api/config";
import { knowledgeBaseApi, type KnowledgeBase } from "~/core/api/knowledge-base";
import type { Option, Resource } from "~/core/messages";
import {
  setEnableOnlineSearch,
  useSettingsStore,
} from "~/core/store";
import { cn } from "~/lib/utils";

export function InputBox({
  className,
  responding,
  feedback,
  onSend,
  onCancel,
  onRemoveFeedback,
}: {
  className?: string;
  size?: "large" | "normal";
  responding?: boolean;
  feedback?: { option: Option } | null;
  onSend?: (
    message: string,
    options?: {
      interruptFeedback?: string;
      resources?: Array<Resource>;
      enableOnlineSearch?: boolean;
      enableKnowledgeRetrieval?: boolean;
    },
  ) => void;
  onCancel?: () => void;
  onRemoveFeedback?: () => void;
}) {
  const enableOnlineSearch = useSettingsStore(
    (state) => state.general.enableOnlineSearch,
  );

  const reasoningModel = useMemo(() => getConfig().models?.reasoning?.[0] ?? "", []);
  const reportStyle = useSettingsStore((state) => state.general.reportStyle);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<MessageInputRef>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Enhancement state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEnhanceAnimating, setIsEnhanceAnimating] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([]);

  // 知识库数据状态
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loadingKnowledgeBases, setLoadingKnowledgeBases] = useState(false);

  // 加载知识库数据
  const LoadKnowledgeBases = useCallback(async () => {
    setLoadingKnowledgeBases(true);
    try {
      const response = await knowledgeBaseApi.GetKnowledgeBases();
      setKnowledgeBases(response.knowledge_bases);
    } catch (error) {
      console.error("加载知识库列表失败:", error);
      toast.error("加载知识库列表失败");
    } finally {
      setLoadingKnowledgeBases(false);
    }
  }, []);

  // 组件挂载时加载知识库数据
  useEffect(() => {
    void LoadKnowledgeBases();
  }, [LoadKnowledgeBases]);

  const handleSendMessage = useCallback(
    (message: string, resources: Array<Resource>) => {
      if (responding) {
        onCancel?.();
      } else {
        if (message.trim() === "") {
          return;
        }
        if (onSend) {
          // 构建知识库资源
          const knowledgeBaseResources: Array<Resource> = selectedKnowledgeBases.map(kbId => {
            const kb = knowledgeBases.find(kb => kb.id === kbId);
            return {
              uri: `rag://knowledge_base/${kbId}`,
              title: kb?.name ?? `知识库 ${kbId}`,
              description: kb?.description ?? "知识库资源",
              type: "knowledge_base"
            };
          });

          // 合并用户提供的资源和知识库资源
          const allResources = [...resources, ...knowledgeBaseResources];

          onSend(message, {
            interruptFeedback: feedback?.option.value,
            resources: allResources,
            enableOnlineSearch: enableOnlineSearch,
            enableKnowledgeRetrieval: selectedKnowledgeBases.length > 0,
          });
          onRemoveFeedback?.();
          // Clear enhancement animation after sending
          setIsEnhanceAnimating(false);
        }
      }
    },
    [responding, onCancel, onSend, feedback, onRemoveFeedback, selectedKnowledgeBases, knowledgeBases, enableOnlineSearch],
  );

  const handleEnhanceQuery = useCallback(async () => {
    if (currentPrompt.trim() === "" || isEnhancing) {
      return;
    }

    setIsEnhancing(true);
    setIsEnhanceAnimating(true);

    try {
      const enhancedQuery = await enhancePrompt({
        prompt: `将以下查询优化为更精确的知识库检索问题：${currentPrompt}`,
        report_style: "STRUCTURED",
      });

      // Add a small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update the input with the enhanced query with animation
      if (inputRef.current) {
        inputRef.current.setContent(enhancedQuery);
        setCurrentPrompt(enhancedQuery);
      }

      // Keep animation for a bit longer to show the effect
      setTimeout(() => {
        setIsEnhanceAnimating(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to enhance query:", error);
      setIsEnhanceAnimating(false);
      // Could add toast notification here
    } finally {
      setIsEnhancing(false);
    }
  }, [currentPrompt, isEnhancing]);

  const handleOnlineSearchToggle = useCallback(() => {
    setEnableOnlineSearch(!enableOnlineSearch);
  }, [enableOnlineSearch]);

  // 知识库多选切换
  const handleToggleKnowledgeBase = (id: string) => {
    setSelectedKnowledgeBases((prev) =>
      prev.includes(id) ? prev.filter((kb) => kb !== id) : [...prev, id],
    );
  };

  return (
    <div
      className={cn(
        "bg-card relative flex h-full w-full flex-col rounded-[24px] border overflow-hidden",
        className,
      )}
      ref={containerRef}
    >
      <div className="w-full">
        <AnimatePresence>
          {feedback && (
            <motion.div
              ref={feedbackRef}
              className="bg-background border-brand absolute top-0 left-0 mt-2 ml-4 flex items-center justify-center gap-1 rounded-2xl border px-2 py-0.5"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="text-brand flex h-full w-full items-center justify-center text-sm opacity-90">
                {feedback.option.text}
              </div>
              <X
                className="cursor-pointer opacity-60"
                size={16}
                onClick={onRemoveFeedback}
              />
            </motion.div>
          )}
          {isEnhanceAnimating && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative h-full w-full overflow-hidden">
                {/* Knowledge enhancement effect overlay */}
                <motion.div
                  className="absolute inset-0 rounded-[24px] bg-gradient-to-r from-green-500/10 via-blue-500/10 to-green-500/10"
                  animate={{
                    background: [
                      "linear-gradient(45deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1), rgba(34, 197, 94, 0.1))",
                      "linear-gradient(225deg, rgba(59, 130, 246, 0.1), rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))",
                      "linear-gradient(45deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1), rgba(34, 197, 94, 0.1))",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {/* Floating knowledge particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-2 w-2 rounded-full bg-green-400"
                    style={{
                      left: `${20 + i * 12}%`,
                      top: `${30 + (i % 2) * 40}%`,
                    }}
                    animate={{
                      y: [-5, -10, -5],
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <MessageInput
          className={cn(
            "h-24 px-4 pt-5",
            feedback && "pt-9",
            isEnhanceAnimating && "transition-all duration-500",
          )}
          ref={inputRef}
          onEnter={handleSendMessage}
          onChange={setCurrentPrompt}
          placeholder="请输入您想要查询的问题或关键词..."
        />
      </div>
      <div className="flex items-center px-4 py-2">
        <div className="flex grow gap-2">
          <Tooltip
            className="max-w-60"
            title={
              <div>
                <h3 className="mb-2 font-bold">
                  联网检索: {enableOnlineSearch ? "开启" : "关闭"}
                </h3>
                <p>
                  开启后，系统将通过互联网搜索获取最新信息，
                  为您提供更及时、更全面的答案和数据。
                </p>
              </div>
            }
          >
            <Button
              className={cn(
                "rounded-2xl",
                enableOnlineSearch && "!border-brand !text-brand bg-brand/5",
              )}
              variant="outline"
              onClick={handleOnlineSearchToggle}
            >
              <Globe size={16} /> 联网检索
            </Button>
          </Tooltip>

          {/* 知识库检索多选 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className={cn(
                  "rounded-2xl",
                  selectedKnowledgeBases.length > 0 && "!border-brand !text-brand bg-brand/5"
                )}
                variant="outline"
                disabled={loadingKnowledgeBases}
              >
                {loadingKnowledgeBases ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <BookOpen size={16} />
                )}
                知识库检索
                {selectedKnowledgeBases.length > 0 && (
                  <span className="ml-1 text-xs text-primary font-medium">
                    {selectedKnowledgeBases.length}个已选
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3">
              <div className="font-medium mb-2 text-sm text-muted-foreground">选择知识库（可多选）</div>
              {loadingKnowledgeBases ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">加载知识库中...</span>
                </div>
              ) : knowledgeBases.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  暂无知识库，请先创建知识库
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {knowledgeBases.map((kb) => (
                    <label key={kb.id} className="flex items-center gap-2 cursor-pointer rounded hover:bg-accent/40 px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedKnowledgeBases.includes(kb.id)}
                        onChange={() => handleToggleKnowledgeBase(kb.id)}
                        className="accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{kb.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{kb.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip title="优化查询语句">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hover:bg-accent h-10 w-10",
                isEnhancing && "animate-pulse",
              )}
              onClick={handleEnhanceQuery}
              disabled={isEnhancing || currentPrompt.trim() === ""}
            >
              {isEnhancing ? (
                <div className="flex h-10 w-10 items-center justify-center">
                  <div className="bg-foreground h-3 w-3 animate-bounce rounded-full opacity-70" />
                </div>
              ) : (
                <MagicWandIcon className="text-brand" />
              )}
            </Button>
          </Tooltip>
          <Tooltip title={responding ? "停止" : "发送"}>
            <Button
              variant="outline"
              size="icon"
              className={cn("h-10 w-10 rounded-full")}
              onClick={() => inputRef.current?.submit()}
            >
              {responding ? (
                <div className="flex h-10 w-10 items-center justify-center">
                  <div className="bg-foreground h-4 w-4 rounded-sm opacity-70" />
                </div>
              ) : (
                <ArrowUp />
              )}
            </Button>
          </Tooltip>
        </div>
      </div>
      {isEnhancing && (
        <>
          <BorderBeam
            duration={5}
            size={250}
            className="from-transparent via-green-500 to-transparent"
          />
          <BorderBeam
            duration={5}
            delay={3}
            size={250}
            className="from-transparent via-blue-500 to-transparent"
          />
        </>
      )}
    </div>
  );
}
