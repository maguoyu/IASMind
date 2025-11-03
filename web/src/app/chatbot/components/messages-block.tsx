// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { motion } from "framer-motion";
import { FastForward, Play } from "lucide-react";
import { useCallback, useRef, useState, useEffect } from "react";
import { toast } from "sonner";

import { RainbowText } from "~/components/deer-flow/rainbow-text";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { fastForwardReplay } from "~/core/api";
import { useReplayMetadata } from "~/core/api/hooks";
import { knowledgeBaseApi, type KnowledgeBase } from "~/core/api/knowledge-base";
import type { Option, Resource } from "~/core/messages";
import { useReplay } from "~/core/replay";
import { sendMessage, useMessageIds, useStore, getGlobalAbortController, abortGlobalRequest } from "~/core/store";
import { env } from "~/env";
import { cn } from "~/lib/utils";

import { ConversationStarter } from "./conversation-starter";
import { InputBox } from "./input-box";
import { MessageListView } from "./message-list-view";
import { Welcome } from "./welcome";

export function MessagesBlock({ className }: { className?: string }) {
  const messageIds = useMessageIds();
  const messageCount = messageIds.length;
  const responding = useStore((state) => state.responding);
  const { isReplay } = useReplay();
  const { title: replayTitle, hasError: replayHasError } = useReplayMetadata();
  const [replayStarted, setReplayStarted] = useState(false);
  const [feedback, setFeedback] = useState<{ option: Option } | null>(null);
  
  // 知识库状态提升到父组件，供 ConversationStarter 和 InputBox 共享
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  
  // 加载知识库数据
  useEffect(() => {
    const loadKnowledgeBases = async () => {
      try {
        const response = await knowledgeBaseApi.GetKnowledgeBases();
        setKnowledgeBases(response.knowledge_bases);
      } catch (error) {
        console.error("加载知识库列表失败:", error);
        toast.error("加载知识库列表失败");
      }
    };
    void loadKnowledgeBases();
  }, []);
  const handleSend = useCallback(
    async (
      message: string,
      options?: {
        interruptFeedback?: string;
        resources?: Array<Resource>;
        enableOnlineSearch?: boolean;
        enableKnowledgeRetrieval?: boolean;
        files?: Array<any>;
      },
    ) => {
      const abortController = getGlobalAbortController();
      
      // 如果 options 中没有显式设置 enableKnowledgeRetrieval，则根据当前选中的知识库状态来设置
      const shouldEnableKnowledgeRetrieval = options?.enableKnowledgeRetrieval !== undefined 
        ? options.enableKnowledgeRetrieval 
        : selectedKnowledgeBases.length > 0;
      
      // 构建知识库资源
      let knowledgeBaseResources: Array<Resource> = [];
      if (shouldEnableKnowledgeRetrieval && selectedKnowledgeBases.length > 0) {
        knowledgeBaseResources = selectedKnowledgeBases.map(kbId => {
          const kb = knowledgeBases.find(kb => kb.id === kbId);
          return {
            uri: `rag://knowledge_base/${kbId}`,
            title: kb?.name ?? `知识库 ${kbId}`,
            description: kb?.description ?? "知识库资源",
            type: "knowledge_base"
          };
        });
      }
      
      // 合并用户提供的资源和知识库资源
      const allResources = [...(options?.resources ?? []), ...knowledgeBaseResources];
      
      console.log('handleSend 发送参数:', {
        message,
        selectedKnowledgeBases,
        shouldEnableKnowledgeRetrieval,
        knowledgeBaseResources,
        allResources,
        originalOptions: options
      });
      
      try {
        await sendMessage(
          "chatbot/stream",
          message,
          {
            interruptFeedback:
              options?.interruptFeedback ?? feedback?.option.value,
            resources: allResources,
            enableOnlineSearch: options?.enableOnlineSearch,
            enableKnowledgeRetrieval: shouldEnableKnowledgeRetrieval,
            files: options?.files,
          },
          {
            abortSignal: abortController.signal,
          },
        );
      } catch {}
    },
    [feedback, selectedKnowledgeBases, knowledgeBases],
  );
  const handleCancel = useCallback(() => {
    abortGlobalRequest();
  }, []);
  const handleFeedback = useCallback(
    (feedback: { option: Option }) => {
      setFeedback(feedback);
    },
    [setFeedback],
  );
  const handleRemoveFeedback = useCallback(() => {
    setFeedback(null);
  }, [setFeedback]);
  const handleStartReplay = useCallback(() => {
    setReplayStarted(true);
    void sendMessage();
  }, [setReplayStarted]);
  const [fastForwarding, setFastForwarding] = useState(false);
  const handleFastForwardReplay = useCallback(() => {
    setFastForwarding(!fastForwarding);
    fastForwardReplay(!fastForwarding);
  }, [fastForwarding]);
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <MessageListView
        className="flex flex-grow"
        onFeedback={handleFeedback}
        onSendMessage={handleSend}
      />
      {!isReplay ? (
        <div className="relative flex h-42 shrink-0 pb-4">
          {!responding && messageCount === 0 && (
            <ConversationStarter
              className="absolute top-[-218px] left-0"
              onSend={handleSend}
            />
          )}
          <InputBox
            className="h-full w-full"
            responding={responding}
            feedback={feedback}
            onSend={handleSend}
            onCancel={handleCancel}
            onRemoveFeedback={handleRemoveFeedback}
            selectedKnowledgeBases={selectedKnowledgeBases}
            onSelectedKnowledgeBasesChange={setSelectedKnowledgeBases}
            knowledgeBases={knowledgeBases}
          />
        </div>
      ) : (
        <>
          <div
            className={cn(
              "fixed bottom-[calc(50vh+80px)] left-0 transition-all duration-500 ease-out",
              replayStarted && "pointer-events-none scale-150 opacity-0",
            )}
          >
            <Welcome />
          </div>
          <motion.div
            className="mb-4 h-fit w-full items-center justify-center"
            initial={{ opacity: 0, y: "20vh" }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card
              className={cn(
                "w-full transition-all duration-300",
                !replayStarted && "translate-y-[-40vh]",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-grow items-center">
                  {responding && (
                    <motion.div
                      className="ml-3"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <video
                        // Walking deer animation, designed by @liangzhaojun. Thank you for creating it!
                        src="/images/walking_deer.webm"
                        autoPlay
                        loop
                        muted
                        className="h-[42px] w-[42px] object-contain"
                      />
                    </motion.div>
                  )}
                  <CardHeader className={cn("flex-grow", responding && "pl-3")}>
                    <CardTitle>
                      <RainbowText animated={responding}>
                        {responding ? "Replaying" : `${replayTitle}`}
                      </RainbowText>
                    </CardTitle>
                    <CardDescription>
                      <RainbowText animated={responding}>
                        {responding
                          ? "IAS_Mind is now replaying the conversation..."
                          : replayStarted
                            ? "The replay has been stopped."
                            : `You're now in IAS_Mind's replay mode. Click the "Play" button on the right to start.`}
                      </RainbowText>
                    </CardDescription>
                  </CardHeader>
                </div>
                {!replayHasError && (
                  <div className="pr-4">
                    {responding && (
                      <Button
                        className={cn(fastForwarding && "animate-pulse")}
                        variant={fastForwarding ? "default" : "outline"}
                        onClick={handleFastForwardReplay}
                      >
                        <FastForward size={16} />
                        Fast Forward
                      </Button>
                    )}
                    {!replayStarted && (
                      <Button className="w-24" onClick={handleStartReplay}>
                        <Play size={16} />
                        Play
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
            {!replayStarted && env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY && (
              <div className="text-muted-foreground w-full text-center text-xs">
                * This site is for demo purposes only. If you want to try your
                own question, please{" "}
                <a
                  className="underline"
                  href="https://github.com/bytedance/deer-flow"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  click here
                </a>{" "}
                to clone it locally and run it.
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
