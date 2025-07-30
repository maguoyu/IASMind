// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { MagicWandIcon } from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Lightbulb, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";


import MessageInput, {
  type MessageInputRef,
} from "~/components/deer-flow/message-input";

import { Tooltip } from "~/components/deer-flow/tooltip";
import { BorderBeam } from "~/components/magicui/border-beam";
import { Button } from "~/components/ui/button";
import { enhancePrompt } from "~/core/api";
import { getConfig } from "~/core/api/config";
import type { Option, Resource } from "~/core/messages";
import {
  setEnableDeepThinking,
  useSettingsStore,
} from "~/core/store";
import { cn } from "~/lib/utils";

// 文件类型
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
}

// 数据源类型（简化版本，用于UI显示）
interface LocalDataSource {
  id: string;
  name: string;
  description: string;
  tables: number;
  lastUpdated: Date;
  status: 'connected' | 'disconnected' | 'syncing';
  type: 'system' | 'temporary';
}

export function InputBox({
  className,
  responding,
  feedback,
  onSend,
  onCancel,
  onRemoveFeedback,
  existingFiles = [], // 外部传入的已上传文件（只用于显示）
  // 数据源相关props
  selectedDataSource,
  systemDataSources = [],

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
      files?: Array<UploadedFile>;
    },
  ) => void;
  onCancel?: () => void;
  onRemoveFeedback?: () => void;
  existingFiles?: Array<UploadedFile>; // 已上传文件列表（只用于显示）
  // 数据源相关props
  selectedDataSource?: string;
  systemDataSources?: LocalDataSource[];

}) {
  const enableDeepThinking = useSettingsStore(
    (state) => state.general.enableDeepThinking,
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
  
  // 当外部文件变更时，更新内部状态
  useEffect(() => {
    // setUploadedFiles(existingFiles); // This line is removed as per the edit hint
  }, [existingFiles]);

  // 处理消息发送
  const handleSendMessage = useCallback(
    (message: string) => {
      if (responding) {
        onCancel?.();
      } else {
        if (message.trim() === "" && existingFiles.length === 0) { // Changed from uploadedFiles to existingFiles
          return;
        }

        const resources: Resource[] = [];
        
        onSend?.(message, {
          interruptFeedback: feedback?.option.value,
          resources,
          files: existingFiles, // Changed from uploadedFiles to existingFiles
        });
        // 发送后不清空文件列表，由父组件控制
        // setCurrentPrompt("");
      }
    },
    [responding, onCancel, onSend, feedback, onRemoveFeedback, existingFiles], // Changed from uploadedFiles to existingFiles
  );

  const handleEnhancePrompt = useCallback(async () => {
    if (currentPrompt.trim() === "" || isEnhancing) {
      return;
    }

    setIsEnhancing(true);
    setIsEnhanceAnimating(true);

    try {
      const enhancedPrompt = await enhancePrompt({
        prompt: currentPrompt,
        report_style: reportStyle.toUpperCase(),
      });

      // Add a small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update the input with the enhanced prompt with animation
      if (inputRef.current) {
        inputRef.current.setContent(enhancedPrompt);
        setCurrentPrompt(enhancedPrompt);
      }

      // Keep animation for a bit longer to show the effect
      setTimeout(() => {
        setIsEnhanceAnimating(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to enhance prompt:", error);
      setIsEnhanceAnimating(false);
      // Could add toast notification here
    } finally {
      setIsEnhancing(false);
    }
  }, [currentPrompt, isEnhancing, reportStyle]);
  
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
        </AnimatePresence>

        <MessageInput
          className={cn(
            "h-24 px-4 pt-5",
            feedback && "pt-9",
            isEnhanceAnimating && "transition-all duration-500"
          )}
          ref={inputRef}
          onEnter={handleSendMessage}
          onChange={setCurrentPrompt}
          disableMention={true}
          placeholder="请输入您的航空数据分析问题，例如：上个月B737机型的航油消耗量如何？"
        />
      </div>
      <div className="flex items-center px-4 py-2">
        <div className="flex grow gap-2">
          {reasoningModel && (
            <Tooltip
              className="max-w-60"
              title={
                <div>
                  <h3 className="mb-2 font-bold">
                    Deep Thinking Mode: {enableDeepThinking ? "On" : "Off"}
                  </h3>
                  <p>
                    When enabled, IAS_Mind will use reasoning model (
                    {reasoningModel}) to generate more thoughtful plans.
                  </p>
                </div>
              }
            >
              <Button
                className={cn(
                  "rounded-2xl",
                  enableDeepThinking && "!border-brand !text-brand",
                )}
                variant="outline"
                onClick={() => {
                  setEnableDeepThinking(!enableDeepThinking);
                }}
              >
                <Lightbulb /> Deep Thinking
              </Button>
            </Tooltip>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip title="Enhance prompt with AI">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hover:bg-accent h-10 w-10",
                isEnhancing && "animate-pulse",
              )}
              onClick={handleEnhancePrompt}
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
          <Tooltip title={responding ? "Stop" : "Send"}>
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
            className="from-transparent via-red-500 to-transparent"
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