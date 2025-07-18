// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { MagicWandIcon } from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Lightbulb, X, FileText, TrendingUp, BarChart3, Settings, Globe, Loader2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { toast } from "sonner";

import { knowledgeBaseApi, type KnowledgeBase } from "~/core/api/knowledge-base";
import { Detective } from "~/components/deer-flow/icons/detective";
import MessageInput, {
  type MessageInputRef,
} from "~/components/deer-flow/message-input";
import { ReportStyleDialog } from "~/components/deer-flow/report-style-dialog";
import { Tooltip } from "~/components/deer-flow/tooltip";
import { BorderBeam } from "~/components/magicui/border-beam";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { enhancePrompt } from "~/core/api";
import { getConfig } from "~/core/api/config";
import type { Option, Resource } from "~/core/messages";
import {
  setEnableDeepThinking,
  setEnableBackgroundInvestigation,
  useSettingsStore,
} from "~/core/store";
import { cn } from "~/lib/utils";

// 报告模板定义
const REPORT_TEMPLATES = [
  {
    id: "business_meeting_report",
    title: "生产经营会汇报报告",
    description: "用于定期生产经营会议的经营数据、重点工作、问题与建议等综合性汇报。",
    icon: BarChart3,
    category: "经营汇报",
    prompt: "请生成一份生产经营会汇报报告，内容包括本期经营数据、重点工作进展、存在问题及改进建议。",
  },
  {
    id: "sasac_assessment_report",
    title: "国资委定期提升考核报告",
    description: "面向国资委的定期考核、指标提升、整改措施等专项报告。",
    icon: TrendingUp,
    category: "考核提升",
    prompt: "请生成一份国资委定期提升考核报告，内容包括主要考核指标完成情况、提升措施、存在问题及后续计划。",
  },
  {
    id: "internal_work_report",
    title: "内部工作汇报报告",
    description: "适用于部门/团队内部的工作进展、任务总结、下步计划等日常汇报。",
    icon: FileText,
    category: "内部汇报",
    prompt: "请生成一份内部工作汇报报告，内容包括本阶段工作完成情况、存在问题、下阶段工作计划。",
  },
  {
    id: "financial_statistics_report",
    title: "财务统计汇报报告",
    description: "用于财务数据统计、收支分析、预算执行等相关内容的汇报。",
    icon: Settings,
    category: "财务统计",
    prompt: "请生成一份财务统计汇报报告，内容包括本期财务数据、收支分析、预算执行情况及财务建议。",
  },
];

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
    },
  ) => void;
  onCancel?: () => void;
  onRemoveFeedback?: () => void;
}) {
  const enableDeepThinking = useSettingsStore(
    (state) => state.general.enableDeepThinking,
  );
  const backgroundInvestigation = useSettingsStore(
    (state) => state.general.enableBackgroundInvestigation,
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
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof REPORT_TEMPLATES[0] | null>(null);
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
          onSend(message, {
            interruptFeedback: feedback?.option.value,
            resources,
          });
          onRemoveFeedback?.();
          // Clear enhancement animation after sending
          setIsEnhanceAnimating(false);
          // Clear selected template after sending
          setSelectedTemplate(null);
        }
      }
    },
    [responding, onCancel, onSend, feedback, onRemoveFeedback],
  );

  const handleTemplateSelect = useCallback((template: typeof REPORT_TEMPLATES[0]) => {
    if (inputRef.current) {
      inputRef.current.setContent(template.prompt);
      setCurrentPrompt(template.prompt);
      setSelectedTemplate(template);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
    setShowTemplates(false);
  }, []);

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
      {/* 模板选择按钮和气泡浮层 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">报告模板</span>
          {selectedTemplate && (
            <span className="flex items-center">
              <span
                className="ml-1 flex items-center rounded-full border bg-primary/10 px-3 py-1 text-xs text-primary shadow-sm"
                style={{ lineHeight: 1.6 }}
              >
                {selectedTemplate.title}
                <button
                  className="ml-2 text-xs text-muted-foreground hover:text-destructive focus:outline-none"
                  aria-label="移除模板"
                  onClick={() => setSelectedTemplate(null)}
                  type="button"
                  style={{ fontWeight: "bold", fontSize: "1.1em" }}
                >
                  ×
                </button>
              </span>
            </span>
          )}
        </div>
        <Popover open={showTemplates} onOpenChange={setShowTemplates}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-3"
              onClick={() => setShowTemplates(true)}
            >
              选择模板
            </Button>
          </PopoverTrigger>
          <PopoverContent className="max-w-lg w-96 p-3">
            <div className="font-medium mb-2 text-sm text-muted-foreground">选择报告模板</div>
            <div className="grid grid-cols-1 gap-2">
              {REPORT_TEMPLATES.map((template, index) => {
                const Icon = template.icon;
                return (
                  <motion.button
                    key={template.id}
                    className="flex items-start gap-3 rounded-lg border bg-background p-3 text-left transition-all hover:border-primary hover:bg-accent/50 hover:shadow-sm"
                    onClick={() => handleTemplateSelect(template)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1, ease: "easeOut" }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">{template.title}</h4>
                        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{template.category}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 输入框部分 */}
      <div className="w-full flex-1 flex flex-col">
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
                {/* Sparkle effect overlay */}
                <motion.div
                  className="absolute inset-0 rounded-[24px] bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10"
                  animate={{
                    background: [
                      "linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1), rgba(59, 130, 246, 0.1))",
                      "linear-gradient(225deg, rgba(147, 51, 234, 0.1), rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))",
                      "linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1), rgba(59, 130, 246, 0.1))",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {/* Floating sparkles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-2 w-2 rounded-full bg-blue-400"
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
            "flex-1 px-4 pt-4 pb-2",
            feedback && "pt-8",
            isEnhanceAnimating && "transition-all duration-500",
          )}
          ref={inputRef}
          onEnter={handleSendMessage}
          onChange={setCurrentPrompt}
        />
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
        <div className="flex items-center gap-3">
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
                  "rounded-2xl text-xs h-8 px-3",
                  enableDeepThinking && "!border-brand !text-brand",
                )}
                variant="outline"
                onClick={() => {
                  setEnableDeepThinking(!enableDeepThinking);
                }}
              >
                <Lightbulb className="w-3 h-3 mr-1" /> Deep Thinking
              </Button>
            </Tooltip>
          )}

          {/* 联网搜索按钮 */}
          <Tooltip
            className="max-w-60"
            title={
              <div>
                <h3 className="mb-2 font-bold">联网搜索</h3>
                <p>开启后，IAS_Mind会在生成报告前进行实时互联网检索，获取最新信息。</p>
              </div>
            }
          >
            <Button
              className={cn(
                "rounded-2xl text-xs h-8 px-3",
                backgroundInvestigation && "!border-brand !text-brand",
              )}
              variant="outline"
              onClick={() => setEnableBackgroundInvestigation(!backgroundInvestigation)}
            >
              <Globe className="w-3 h-3 mr-1" /> 联网搜索
            </Button>
          </Tooltip>

          {/* 知识库检索多选 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className={cn(
                  "rounded-2xl text-xs h-8 px-3",
                  selectedKnowledgeBases.length > 0 && "!border-brand !text-brand"
                )}
                variant="outline"
                disabled={loadingKnowledgeBases}
              >
                {loadingKnowledgeBases ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
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
        <div className="flex items-center gap-2">
          <Tooltip title="Enhance prompt with AI">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hover:bg-accent h-8 w-8",
                isEnhancing && "animate-pulse",
              )}
              onClick={handleEnhancePrompt}
              disabled={isEnhancing || currentPrompt.trim() === ""}
            >
              {isEnhancing ? (
                <div className="flex h-8 w-8 items-center justify-center">
                  <div className="bg-foreground h-3 w-3 animate-bounce rounded-full opacity-70" />
                </div>
              ) : (
                <MagicWandIcon className="text-brand w-4 h-4" />
              )}
            </Button>
          </Tooltip>
          <Tooltip title={responding ? "Stop" : "Send"}>
            <Button
              variant="outline"
              size="icon"
              className={cn("h-8 w-8 rounded-full")}
              onClick={() => inputRef.current?.submit()}
            >
              {responding ? (
                <div className="flex h-8 w-8 items-center justify-center">
                  <div className="bg-foreground h-3 w-3 rounded-sm opacity-70" />
                </div>
              ) : (
                <ArrowUp className="w-4 h-4" />
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
