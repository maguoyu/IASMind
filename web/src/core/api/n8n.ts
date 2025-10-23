// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

/**
 * n8n API 客户端
 * 提供工作流和执行记录的管理功能
 */

import { env } from "~/env";

// 获取 API 基础 URL，确保没有 /api 后缀
const getApiBaseUrl = () => {
  const baseUrl = env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  // 如果 URL 以 /api 结尾，则移除它
  return baseUrl.replace(/\/api$/, "");
};

const API_BASE_URL = getApiBaseUrl();

/**
 * 工作流接口
 */
export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes?: any[];
  connections?: any;
  settings?: any;
  tags?: string[];
  webhookPath?: string; // webhook 路径，例如 "/webhook-test/joke-webhook-sse"
}

/**
 * 执行记录接口
 */
export interface N8nExecution {
  id: string;
  workflowId: string;
  mode: string;
  status: "success" | "error" | "waiting" | "running";
  startedAt: string;
  stoppedAt?: string;
  workflowData?: {
    name: string;
  };
  data?: any;
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
}

/**
 * 执行工作流请求
 */
export interface ExecuteWorkflowRequest {
  workflow_data?: Record<string, any>;
  webhook_path?: string; // webhook 路径，例如 "/webhook-test/joke-webhook-sse"
}

/**
 * n8n API 类
 */
export class N8nApi {
  /**
   * 获取工作流列表
   */
  static async getWorkflows(params?: {
    limit?: number;
    cursor?: string;
    active?: boolean;
  }): Promise<PaginatedResponse<N8nWorkflow>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.cursor) queryParams.append("cursor", params.cursor);
    if (params?.active !== undefined)
      queryParams.append("active", params.active.toString());

    const response = await fetch(
      `${API_BASE_URL}/api/n8n/workflows?${queryParams.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`获取工作流列表失败: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 获取单个工作流详情
   */
  static async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    const response = await fetch(
      `${API_BASE_URL}/api/n8n/workflows/${workflowId}`,
    );

    if (!response.ok) {
      throw new Error(`获取工作流详情失败: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 激活或停用工作流
   */
  static async activateWorkflow(
    workflowId: string,
    active: boolean,
  ): Promise<N8nWorkflow> {
    const response = await fetch(
      `${API_BASE_URL}/api/n8n/workflows/${workflowId}/activate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active }),
      },
    );

    if (!response.ok) {
      throw new Error(`激活工作流失败: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 删除工作流
   */
  static async deleteWorkflow(workflowId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/n8n/workflows/${workflowId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      throw new Error(`删除工作流失败: ${response.statusText}`);
    }
  }

  /**
   * 执行工作流
   */
  static async executeWorkflow(
    workflowId: string,
    data?: ExecuteWorkflowRequest,
  ): Promise<N8nExecution> {
    const response = await fetch(
      `${API_BASE_URL}/api/n8n/workflows/${workflowId}/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data || {}),
      },
    );

    if (!response.ok) {
      throw new Error(`执行工作流失败: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 获取执行记录列表
   */
  static async getExecutions(params?: {
    limit?: number;
    cursor?: string;
    workflow_id?: string;
    status?: string;
  }): Promise<PaginatedResponse<N8nExecution>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.cursor) queryParams.append("cursor", params.cursor);
    if (params?.workflow_id)
      queryParams.append("workflow_id", params.workflow_id);
    if (params?.status) queryParams.append("status", params.status);

    const response = await fetch(
      `${API_BASE_URL}/api/n8n/executions?${queryParams.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`获取执行记录失败: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 获取单个执行记录详情
   */
  static async getExecution(executionId: string): Promise<N8nExecution> {
    const response = await fetch(
      `${API_BASE_URL}/api/n8n/executions/${executionId}`,
    );

    if (!response.ok) {
      throw new Error(`获取执行记录详情失败: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 删除执行记录
   */
  static async deleteExecution(executionId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/n8n/executions/${executionId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      throw new Error(`删除执行记录失败: ${response.statusText}`);
    }
  }

  /**
   * 检查 n8n 服务健康状态
   */
  static async checkHealth(): Promise<{
    status: string;
    api_url: string;
    api_key_configured: boolean;
    error?: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/n8n/health`);

    if (!response.ok) {
      throw new Error(`健康检查失败: ${response.statusText}`);
    }

    return response.json();
  }
}

export const n8nApi = N8nApi;

