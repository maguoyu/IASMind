// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

/**
 * 工作流默认参数配置
 * 为每个工作流维护默认的执行参数
 */

export interface WorkflowDefaultParams {
  chatInput?: string;
  sessionId?: string;
  [key: string]: any;
}

/**
 * 工作流默认参数映射
 * key: 工作流名称
 * value: 默认参数对象
 */
export const workflowDefaults: Record<string, WorkflowDefaultParams> = {
  // 默认参数配置 - 适用于所有工作流
  default: {
    chatInput: "hello world`",
    sessionId: "user-12345",
  },
  "测试笑话-sse": {
    chatInput: "给我讲个关于加油的笑话",
    sessionId: "user-11111",
  },
  // 示例：为特定工作流名称配置参数
  // "我的聊天机器人": {
  //   chatInput: "你好，请介绍一下你自己",
  //   sessionId: "demo-session",
  // },
};

/**
 * 获取工作流的默认参数
 * @param workflowName 工作流名称
 * @returns 默认参数对象
 */
export function getWorkflowDefaults(workflowName: string): WorkflowDefaultParams {
  // 如果有特定工作流的配置，使用特定配置
  if (workflowDefaults[workflowName]) {
    return { ...workflowDefaults[workflowName] };
  }
  
  // 否则使用默认配置
  return { ...workflowDefaults.default };
}

/**
 * 设置工作流的默认参数
 * @param workflowName 工作流名称
 * @param params 参数对象
 */
export function setWorkflowDefaults(
  workflowName: string,
  params: WorkflowDefaultParams,
): void {
  workflowDefaults[workflowName] = { ...params };
}

/**
 * 格式化参数为 JSON 字符串
 * @param params 参数对象
 * @returns 格式化的 JSON 字符串
 */
export function formatParamsToJson(params: WorkflowDefaultParams): string {
  return JSON.stringify(params, null, 2);
}

/**
 * 解析 JSON 字符串为参数对象
 * @param json JSON 字符串
 * @returns 参数对象
 */
export function parseJsonToParams(json: string): WorkflowDefaultParams {
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error("无效的 JSON 格式");
  }
}

