// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import {
  Play,
  RefreshCw,
  Workflow,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Trash2,
  Power,
  PowerOff,
  Activity,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

import { Layout } from "~/components/layout";
import { toast } from "sonner";

import {
  n8nApi,
  type N8nWorkflow,
  type N8nExecution,
} from "~/core/api/n8n";
import {
  getWorkflowDefaults,
  formatParamsToJson,
} from "~/config/workflow-defaults";

type ViewMode = "workflows" | "executions";

export default function N8nPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("workflows");
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<N8nWorkflow | null>(
    null,
  );
  const [selectedExecution, setSelectedExecution] =
    useState<N8nExecution | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  
  // 执行对话框状态
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [executeWorkflowId, setExecuteWorkflowId] = useState<string | null>(null);
  const [workflowParams, setWorkflowParams] = useState<string>("{}");
  const [paramsError, setParamsError] = useState<string>("");
  const [webhookPath, setWebhookPath] = useState<string>("");
  const [webhookError, setWebhookError] = useState<string>("");
  
  // 执行结果状态
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionStatus, setExecutionStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [executionError, setExecutionError] = useState<string>("");

  // 加载工作流列表
  const loadWorkflows = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await n8nApi.getWorkflows({ limit: 100 });
      setWorkflows(response.data || []);
    } catch (error) {
      toast.error("加载工作流失败: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 加载执行记录列表
  const loadExecutions = useCallback(async (workflowId?: string) => {
    setIsLoading(true);
    try {
      const response = await n8nApi.getExecutions({
        limit: 100,
        workflow_id: workflowId,
      });
      setExecutions(response.data || []);
    } catch (error) {
      toast.error("加载执行记录失败: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 检查健康状态
  const checkHealth = useCallback(async () => {
    try {
      const status = await n8nApi.checkHealth();
      setHealthStatus(status);
    } catch (error) {
      console.error("健康检查失败:", error);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    void loadWorkflows();
    void checkHealth();
  }, [loadWorkflows, checkHealth]);

  // 激活/停用工作流
  const handleToggleActive = async (workflow: N8nWorkflow) => {
    try {
      await n8nApi.activateWorkflow(workflow.id, !workflow.active);
      toast.success(
        workflow.active ? "工作流已停用" : "工作流已激活",
      );
      await loadWorkflows();
    } catch (error) {
      toast.error("操作失败: " + (error as Error).message);
    }
  };

  // 打开执行对话框
  const handleOpenExecuteDialog = (workflowId: string) => {
    const workflow = workflows.find((w) => w.id === workflowId);
    setExecuteWorkflowId(workflowId);
    
    // 使用默认参数（根据工作流名称）
    const defaultParams = getWorkflowDefaults(workflow?.name || "");
    setWorkflowParams(formatParamsToJson(defaultParams));
    
    setParamsError("");
    setWebhookPath(workflow?.webhookPath || "");
    setWebhookError("");
    // 重置执行结果
    setExecutionResult(null);
    setExecutionStatus("idle");
    setExecutionError("");
    setExecuteDialogOpen(true);
  };

  // 实时验证 JSON 格式
  const validateJsonInput = (value: string) => {
    setWorkflowParams(value);
    
    // 如果输入为空或只有空白字符，不显示错误
    if (!value.trim()) {
      setParamsError("");
      return;
    }
    
    try {
      JSON.parse(value);
      setParamsError("");
    } catch (error) {
      const errorMessage = (error as Error).message;
      setParamsError(errorMessage);
    }
  };

  // 验证并执行工作流
  const handleExecuteWithParams = async () => {
    if (!executeWorkflowId) return;

    // 验证 JSON 格式
    let parsedParams;
    try {
      parsedParams = JSON.parse(workflowParams.trim() || "{}");
      setParamsError("");
    } catch (error) {
      const errorMessage = (error as Error).message;
      setParamsError(`JSON 解析失败: ${errorMessage}`);
      return;
    }

    // 验证 webhook 路径（如果有的话）
    const trimmedWebhookPath = webhookPath.trim();
    if (trimmedWebhookPath && !trimmedWebhookPath.startsWith("/")) {
      setWebhookError("Webhook 路径必须以 / 开头");
      return;
    }

    // 开始执行
    setIsExecuting(executeWorkflowId);
    setExecutionStatus("running");
    setExecutionResult(null);
    setExecutionError("");
    
    try {
      const execution = await n8nApi.executeWorkflow(executeWorkflowId, {
        workflow_data: parsedParams,
        webhook_path: trimmedWebhookPath || undefined,
      });
      
      // 设置执行结果
      setExecutionResult(execution);
      setExecutionStatus("success");
      
      toast.success(trimmedWebhookPath ? "工作流已通过 Webhook 执行" : "工作流已提交执行");
      
      // 如果使用 API 方式执行（返回执行记录），则重新加载执行列表
      if (!trimmedWebhookPath && execution) {
        await loadExecutions(executeWorkflowId);
        setSelectedExecution(execution);
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setExecutionError(errorMessage);
      setExecutionStatus("error");
      toast.error(`执行失败: ${errorMessage}`);
    } finally {
      setIsExecuting(null);
    }
  };

  // 快速执行（不带参数）
  const handleQuickExecute = async (workflowId: string) => {
    setIsExecuting(workflowId);
    try {
      const execution = await n8nApi.executeWorkflow(workflowId);
      toast.success("工作流执行成功");
      await loadExecutions(workflowId);
      setSelectedExecution(execution);
    } catch (error) {
      toast.error("执行失败: " + (error as Error).message);
    } finally {
      setIsExecuting(null);
    }
  };

  // 删除工作流
  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm("确定要删除这个工作流吗？")) return;

    try {
      await n8nApi.deleteWorkflow(workflowId);
      toast.success("工作流已删除");
      await loadWorkflows();
      if (selectedWorkflow?.id === workflowId) {
        setSelectedWorkflow(null);
      }
    } catch (error) {
      toast.error("删除失败: " + (error as Error).message);
    }
  };

  // 查看工作流详情
  const handleViewWorkflow = async (workflow: N8nWorkflow) => {
    setSelectedWorkflow(workflow);
    await loadExecutions(workflow.id);
  };

  // 查看执行详情
  const handleViewExecution = async (execution: N8nExecution) => {
    try {
      const detail = await n8nApi.getExecution(execution.id);
      setSelectedExecution(detail);
    } catch (error) {
      toast.error("加载执行详情失败: " + (error as Error).message);
    }
  };

  // 渲染状态徽章
  const renderStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { color: string; icon: React.ReactNode; label: string }
    > = {
      success: {
        color: "bg-green-500",
        icon: <CheckCircle2 className="h-1.5 w-1.5" />,
        label: "成功",
      },
      error: {
        color: "bg-red-500",
        icon: <XCircle className="h-1.5 w-1.5" />,
        label: "失败",
      },
      waiting: {
        color: "bg-yellow-500",
        icon: <Clock className="h-1.5 w-1.5" />,
        label: "等待",
      },
      running: {
        color: "bg-blue-500",
        icon: <Loader2 className="h-1.5 w-1.5 animate-spin" />,
        label: "运行中",
      },
    };

    const config = statusConfig[status] || {
      color: "bg-gray-500",
      icon: null,
      label: status,
    };

    return (
      <Badge className={`${config.color} text-white text-[10px] py-0 h-3.5 flex-shrink-0 leading-none`}>
        <span className="mr-0.5">{config.icon}</span>
        {config.label}
      </Badge>
    );
  };

  // 格式化时间
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN");
  };

  return (
    <Layout>
      <div className="container mx-auto p-4">
        {/* 标题和健康状态 */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">工作流管理</h1>
            <p className="text-muted-foreground text-sm mt-1">
              管理和监控  自动化工作流
            </p>
          </div>
          <div className="flex items-center gap-4">
            {healthStatus && (
              <Badge
                variant={
                  healthStatus.status === "healthy" ? "default" : "destructive"
                }
              >
                <Activity className="mr-1 h-3 w-3" />
                {healthStatus.status === "healthy" ? "服务正常" : "服务异常"}
              </Badge>
            )}
            <Button 
              onClick={() => window.open("http://172.20.0.113:15678/home/workflows", "_blank")}
              variant="default"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              工作流设计
            </Button>
            <Button onClick={() => void loadWorkflows()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 左侧列表 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <Tabs
                  value={viewMode}
                  onValueChange={(v) => setViewMode(v as ViewMode)}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="workflows">
                      <Workflow className="mr-2 h-4 w-4" />
                      工作流
                    </TabsTrigger>
                    <TabsTrigger value="executions">
                      <Activity className="mr-2 h-4 w-4" />
                      执行记录
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {viewMode === "workflows" ? (
                    // 工作流列表
                    <div className="space-y-0.5 p-1.5">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : workflows.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          暂无工作流
                        </div>
                      ) : (
                        workflows
                          .sort((a, b) => {
                            // 激活状态的工作流排在前面
                            if (a.active && !b.active) return -1;
                            if (!a.active && b.active) return 1;
                            // 同样状态下按名称排序
                            return a.name.localeCompare(b.name);
                          })
                          .map((workflow) => (
                          <Card
                            key={workflow.id}
                            className={`cursor-pointer transition-colors hover:bg-accent ${
                              selectedWorkflow?.id === workflow.id
                                ? "border-primary"
                                : ""
                            }`}
                            onClick={() => void handleViewWorkflow(workflow)}
                          >
                            <CardContent className="p-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-xs truncate leading-tight">
                                      {workflow.name}
                                    </h3>
                                  </div>
                                  {workflow.active ? (
                                    <Badge className="bg-green-500 text-[10px] py-0 px-1 h-3.5 flex-shrink-0 leading-none">
                                      <Power className="h-1.5 w-1.5" />
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px] py-0 px-1 h-3.5 flex-shrink-0 leading-none">
                                      <PowerOff className="h-1.5 w-1.5" />
                                    </Badge>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 flex-shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ChevronRight className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleQuickExecute(workflow.id);
                                      }}
                                      disabled={isExecuting === workflow.id}
                                    >
                                      <Play className="mr-2 h-4 w-4" />
                                      快速执行
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenExecuteDialog(workflow.id);
                                      }}
                                      disabled={isExecuting === workflow.id}
                                    >
                                      <Play className="mr-2 h-4 w-4" />
                                      带参数执行
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleToggleActive(workflow);
                                      }}
                                    >
                                      {workflow.active ? (
                                        <>
                                          <PowerOff className="mr-2 h-4 w-4" />
                                          停用
                                        </>
                                      ) : (
                                        <>
                                          <Power className="mr-2 h-4 w-4" />
                                          激活
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleDeleteWorkflow(workflow.id);
                                      }}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      删除
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  ) : (
                    // 执行记录列表
                    <div className="space-y-0.5 p-1.5">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : executions.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          暂无执行记录
                        </div>
                      ) : (
                        executions.map((execution) => (
                          <Card
                            key={execution.id}
                            className={`cursor-pointer transition-colors hover:bg-accent ${
                              selectedExecution?.id === execution.id
                                ? "border-primary"
                                : ""
                            }`}
                            onClick={() => void handleViewExecution(execution)}
                          >
                            <CardContent className="p-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium truncate flex-1 min-w-0 leading-tight">
                                      {execution.workflowData?.name || "未知工作流"}
                                    </span>
                                    {renderStatusBadge(execution.status)}
                                  </div>
                                  <p className="text-muted-foreground text-[10px] truncate mt-0.5 leading-tight">
                                    {formatDate(execution.startedAt)}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* 右侧详情 */}
          <div className="lg:col-span-2">
            {viewMode === "workflows" && selectedWorkflow ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>工作流详情</span>
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            disabled={isExecuting === selectedWorkflow.id}
                          >
                            {isExecuting === selectedWorkflow.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="mr-2 h-4 w-4" />
                            )}
                            执行工作流
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => void handleQuickExecute(selectedWorkflow.id)}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            快速执行
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenExecuteDialog(selectedWorkflow.id)}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            带参数执行
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="space-y-6 p-6">
                    {/* 基本信息 */}
                    <div>
                      <h3 className="mb-4 text-lg font-semibold">基本信息</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm">名称</p>
                          <p className="font-medium">{selectedWorkflow.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">状态</p>
                          {selectedWorkflow.active ? (
                            <Badge className="bg-green-500">已激活</Badge>
                          ) : (
                            <Badge variant="secondary">未激活</Badge>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">
                            创建时间
                          </p>
                          <p className="font-medium">
                            {formatDate(selectedWorkflow.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">
                            更新时间
                          </p>
                          <p className="font-medium">
                            {formatDate(selectedWorkflow.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* 默认参数 */}
                    <div>
                      <h3 className="mb-4 text-lg font-semibold">默认执行参数</h3>
                      <div className="rounded-lg border bg-gray-50 p-4">
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                          {formatParamsToJson(getWorkflowDefaults(selectedWorkflow.name))}
                        </pre>
                      </div>
                      <p className="text-muted-foreground text-xs mt-2">
                        这些参数将在点击"带参数执行"时自动填充
                      </p>
                    </div>

                    <Separator />

                    {/* 执行记录 */}
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">执行记录</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void loadExecutions(selectedWorkflow.id)}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          刷新
                        </Button>
                      </div>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {executions.length === 0 ? (
                            <p className="text-muted-foreground text-center">
                              暂无执行记录
                            </p>
                          ) : (
                            executions.map((execution) => (
                              <Card key={execution.id}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                      {renderStatusBadge(execution.status)}
                                      <p className="text-muted-foreground text-xs">
                                        {formatDate(execution.startedAt)}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        void handleViewExecution(execution)
                                      }
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : viewMode === "executions" && selectedExecution ? (
              <Card>
                <CardHeader>
                  <CardTitle>执行详情</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="space-y-6 p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground text-sm">工作流</p>
                        <p className="font-medium">
                          {selectedExecution.workflowData?.name || "未知"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">状态</p>
                        {renderStatusBadge(selectedExecution.status)}
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">
                          开始时间
                        </p>
                        <p className="font-medium">
                          {formatDate(selectedExecution.startedAt)}
                        </p>
                      </div>
                      {selectedExecution.stoppedAt && (
                        <div>
                          <p className="text-muted-foreground text-sm">
                            结束时间
                          </p>
                          <p className="font-medium">
                            {formatDate(selectedExecution.stoppedAt)}
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedExecution.data && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="mb-2 text-lg font-semibold">
                            执行数据
                          </h3>
                          <ScrollArea className="h-[400px]">
                            <pre className="text-xs">
                              {JSON.stringify(
                                selectedExecution.data,
                                null,
                                2,
                              )}
                            </pre>
                          </ScrollArea>
                        </div>
                      </>
                    )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex h-[calc(100vh-280px)] items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <AlertCircle className="mx-auto mb-4 h-12 w-12" />
                    <p>
                      请从左侧列表中选择一个
                      {viewMode === "workflows" ? "工作流" : "执行记录"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 执行工作流对话框 */}
      <Dialog open={executeDialogOpen} onOpenChange={(open) => {
        setExecuteDialogOpen(open);
        if (!open) {
          // 关闭时重置状态
          setExecutionResult(null);
          setExecutionStatus("idle");
          setExecutionError("");
        }
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              执行工作流
              {executionStatus === "running" && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  执行中
                </Badge>
              )}
              {executionStatus === "success" && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  执行成功
                </Badge>
              )}
              {executionStatus === "error" && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                  <XCircle className="mr-1 h-3 w-3" />
                  执行失败
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              配置工作流参数并查看执行结果
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Webhook 路径输入区域 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="webhook-path" className="text-base font-semibold">
                  Webhook 路径 (可选)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const currentWorkflow = workflows.find(w => w.id === executeWorkflowId);
                    const examplePath = currentWorkflow?.webhookPath || "/webhook-test/example-webhook";
                    setWebhookPath(examplePath);
                    setWebhookError("");
                  }}
                  className="h-8 text-xs"
                >
                  {workflows.find(w => w.id === executeWorkflowId)?.webhookPath ? "使用工作流路径" : "使用示例"}
                </Button>
              </div>
              
              <input
                id="webhook-path"
                type="text"
                placeholder={
                  workflows.find(w => w.id === executeWorkflowId)?.webhookPath || 
                  "/webhook-test/example-webhook"
                }
                value={webhookPath}
                onChange={(e) => {
                  setWebhookPath(e.target.value);
                  setWebhookError("");
                }}
                className="w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              {webhookError && (
                <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 border border-red-200">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">路径格式错误</p>
                    <p className="text-sm text-red-600 mt-1">{webhookError}</p>
                  </div>
                </div>
              )}

              {webhookPath.trim() && !webhookError && (
                <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 border border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">将使用 Webhook 方式执行</p>
                </div>
              )}
              
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <div className="flex items-start gap-2">
                  <div className="rounded-full bg-blue-500 p-1">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-blue-800">
                      如果填写了 Webhook 路径，将使用 Webhook 方式执行工作流（推荐）。
                      留空则使用 n8n API 执行。示例：<code className="px-1 py-0.5 bg-blue-100 rounded text-xs">/webhook-test/my-webhook</code>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 参数输入区域 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="workflow-params" className="text-base font-semibold">
                  工作流参数 (JSON)
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (executeWorkflowId) {
                        const workflow = workflows.find(w => w.id === executeWorkflowId);
                        const defaultParams = getWorkflowDefaults(workflow?.name || "");
                        setWorkflowParams(formatParamsToJson(defaultParams));
                        setParamsError("");
                      }
                    }}
                    className="h-8 text-xs"
                  >
                    使用默认参数
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setWorkflowParams('{\n  "input": "",\n  "config": {\n    "key": "value"\n  }\n}');
                      setParamsError("");
                    }}
                    className="h-8 text-xs"
                  >
                    使用模板
                  </Button>
                </div>
              </div>
              
              <Textarea
                id="workflow-params"
                placeholder='请输入 JSON 格式的参数，例如：&#10;{&#10;  "message": "Hello World",&#10;  "options": {&#10;    "timeout": 30&#10;  }&#10;}'
                value={workflowParams}
                onChange={(e) => validateJsonInput(e.target.value)}
                className="font-mono text-sm min-h-[250px] resize-y"
              />
              
              {paramsError && (
                <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 border border-red-200">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">JSON 格式错误</p>
                    <p className="text-sm text-red-600 mt-1">{paramsError}</p>
                  </div>
                </div>
              )}

              {!paramsError && workflowParams.trim() && (
                <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 border border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">JSON 格式正确</p>
                </div>
              )}
            </div>

            {/* 使用说明 */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-start gap-2">
                <div className="rounded-full bg-blue-500 p-1">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">使用说明</h4>
                  <ul className="text-sm text-blue-800 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>参数必须是<strong>有效的 JSON 格式</strong>（对象、数组、字符串等）</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>输入 <code className="px-1.5 py-0.5 bg-blue-100 rounded">{"{}"}</code> 表示不传递任何参数</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>参数将作为 <code className="px-1.5 py-0.5 bg-blue-100 rounded">workflow_data</code> 传递给工作流</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>点击"使用模板"按钮可以快速填充参数模板</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 常用示例 */}
            {executionStatus === "idle" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">常用示例：</Label>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => {
                      setWorkflowParams('{\n  "message": "测试消息"\n}');
                      setParamsError("");
                    }}
                  >
                    <div className="text-left">
                      <div className="font-medium text-xs">简单消息</div>
                      <code className="text-xs text-muted-foreground">
                        {`{"message": "测试消息"}`}
                      </code>
                    </div>
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => {
                      setWorkflowParams('{\n  "user_id": "12345",\n  "action": "process",\n  "data": {\n    "name": "张三",\n    "email": "zhangsan@example.com"\n  }\n}');
                      setParamsError("");
                    }}
                  >
                    <div className="text-left">
                      <div className="font-medium text-xs">用户数据处理</div>
                      <code className="text-xs text-muted-foreground">
                        {`{"user_id": "...", "action": "...", "data": {...}}`}
                      </code>
                    </div>
                  </Button>
                </div>
              </div>
            )}

            {/* 执行结果显示区域 */}
            {executionStatus !== "idle" && (
              <div className="space-y-3">
                <Separator className="my-4" />
                
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">执行结果</Label>
                  {executionResult && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(executionResult, null, 2));
                        toast.success("已复制到剪贴板");
                      }}
                      className="h-8 text-xs"
                    >
                      复制结果
                    </Button>
                  )}
                </div>

                {/* 执行中状态 */}
                {executionStatus === "running" && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                    <div className="text-center">
                      <p className="text-lg font-medium text-gray-900">正在执行工作流...</p>
                      <p className="text-sm text-gray-500 mt-1">请稍候，工作流正在处理中</p>
                    </div>
                  </div>
                )}

                {/* 执行成功状态 */}
                {executionStatus === "success" && executionResult && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-green-900 mb-1">执行成功</h4>
                          <p className="text-sm text-green-700">
                            工作流已成功完成执行
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 结果详情 */}
                    <div className="rounded-lg border bg-gray-50 p-4 max-h-[400px] overflow-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                        {JSON.stringify(executionResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 执行失败状态 */}
                {executionStatus === "error" && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                      <div className="flex items-start gap-3">
                        <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-red-900 mb-1">执行失败</h4>
                          <p className="text-sm text-red-700">
                            {executionError || "工作流执行过程中发生错误"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 重试按钮 */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setExecutionStatus("idle");
                        setExecutionResult(null);
                        setExecutionError("");
                      }}
                      className="w-full"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      重新配置参数
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {executionStatus === "idle" || executionStatus === "running" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setExecuteDialogOpen(false);
                    setWorkflowParams("{}");
                    setParamsError("");
                  }}
                  disabled={executionStatus === "running"}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleExecuteWithParams()}
                  disabled={executionStatus === "running" || !!paramsError}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {executionStatus === "running" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      执行中...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      提交执行
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {executionStatus === "success" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setExecutionStatus("idle");
                      setExecutionResult(null);
                      setExecutionError("");
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重新执行
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => {
                    setExecuteDialogOpen(false);
                    setWorkflowParams("{}");
                    setParamsError("");
                    setWebhookPath("");
                    setExecutionResult(null);
                    setExecutionStatus("idle");
                    setExecutionError("");
                  }}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  关闭
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

