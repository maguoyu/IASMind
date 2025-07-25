// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { MagicWandIcon } from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Lightbulb, X, Paperclip, FileText, File } from "lucide-react";
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

export function InputBox({
  className,
  responding,
  feedback,
  onSend,
  onCancel,
  onRemoveFeedback,
  onFileUpload,
  showUploadButton = true, // 控制上传按钮是否显示
  existingFiles = [], // 外部传入的已上传文件
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
  onFileUpload?: (files: Array<UploadedFile>) => void;
  showUploadButton?: boolean; // 是否显示上传按钮
  existingFiles?: Array<UploadedFile>; // 已上传文件列表
}) {
  const enableDeepThinking = useSettingsStore(
    (state) => state.general.enableDeepThinking,
  );
  const reasoningModel = useMemo(() => getConfig().models?.reasoning?.[0] ?? "", []);
  const reportStyle = useSettingsStore((state) => state.general.reportStyle);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<MessageInputRef>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhancement state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEnhanceAnimating, setIsEnhanceAnimating] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("");
  
  // 文件上传状态 - 使用existingFiles
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  
  // 当外部文件变更时，更新内部状态
  useEffect(() => {
    setUploadedFiles(existingFiles);
  }, [existingFiles]);

  const handleSendMessage = useCallback(
    (message: string, resources: Array<Resource>) => {
      if (responding) {
        onCancel?.();
      } else {
        if (message.trim() === "" && uploadedFiles.length === 0) {
          return;
        }
        if (onSend) {
          onSend(message, {
            interruptFeedback: feedback?.option.value,
            resources,
            files: uploadedFiles,
          });
          // 发送后不清空文件列表，由父组件控制
          onRemoveFeedback?.();
          // Clear enhancement animation after sending
          setIsEnhanceAnimating(false);
        }
      }
    },
    [responding, onCancel, onSend, feedback, onRemoveFeedback, uploadedFiles],
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
  
  // 处理文件上传
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsProcessingFile(true);
    
    try {
      // 只处理第一个文件，忽略其他文件
      const file = e.target.files[0];
      
      // 读取文件内容
      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        
        // 根据文件类型选择不同的读取方式
        if (file.type.startsWith('text/') || 
            file.name.endsWith('.json') || 
            file.name.endsWith('.csv') || 
            file.name.endsWith('.txt')) {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file); // 二进制文件采用 base64 编码
        }
      });
      
      // 创建新的文件列表，只包含这一个文件
      const newFile = {
        id: `file-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        content: content
      };
      
      // 替换原有文件列表
      setUploadedFiles([newFile]);
      
      // 通知父组件文件上传成功
      if (onFileUpload) {
        onFileUpload([newFile]);
      }
    } catch (error) {
      console.error(`读取文件失败:`, error);
    } finally {
      setIsProcessingFile(false);
      
      // 清空文件输入，以便能够重新上传相同的文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onFileUpload]);
  
  // 删除已上传文件
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => {
      const newFiles = prev.filter(file => file.id !== fileId);
      // 通知父组件文件已删除
      if (onFileUpload) {
        onFileUpload(newFiles);
      }
      return newFiles;
    });
  }, [onFileUpload]);
  
  // 触发文件选择对话框
  const openFileSelector = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);
  
  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);

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
        
        {/* 显示已上传文件 */}
        {uploadedFiles.length > 0 && (
          <div className="px-4 pt-3 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {uploadedFiles.map(file => (
              <div 
                key={file.id} 
                className="bg-muted flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
              >
                {file.type.startsWith('image/') ? (
                  <FileText size={14} className="text-blue-500" />
                ) : file.name.endsWith('.csv') ? (
                  <File size={14} className="text-green-500" />
                ) : file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? (
                  <File size={14} className="text-blue-500" />
                ) : (
                  <File size={14} className="text-blue-500" />
                )}
                <span className="max-w-40 truncate">{file.name}</span>
                <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                <X 
                  size={14}
                  className="cursor-pointer hover:text-destructive transition-colors ml-1" 
                  onClick={() => removeFile(file.id)}
                />
              </div>
            ))}
          </div>
        )}
        
        <MessageInput
          className={cn(
            "h-24 px-4 pt-5",
            feedback && "pt-9",
            isEnhanceAnimating && "transition-all duration-500",
            uploadedFiles.length > 0 && "pt-2"
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

          {/* 文件上传按钮 - 只有在showUploadButton为true时显示 */}
          {showUploadButton && (
            <Tooltip title="选择文件进行分析">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={openFileSelector}
                disabled={isProcessingFile}
              >
                <Paperclip size={16} className="mr-1" />
                {isProcessingFile ? '处理中...' : '选择文件'}
              </Button>
            </Tooltip>
          )}
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden"
            onChange={handleFileUpload}
            multiple={false}
            // 支持常见的数据文件格式
            accept=".csv,.json,.xlsx,.xls,.txt,.text"
          />
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
