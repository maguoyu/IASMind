import type { ApiResponse } from './config';
import { apiClient } from './config';

// 图表生成请求模型
export interface GenerateChartRequest {
  file_name: string;
  output_type: 'png' | 'html';
  task_type?: string;
  insights_id?: string[];
  data?: Record<string, any>[];
  description?: string;
  language?: string;
}

// 图表生成响应模型
export interface GenerateChartResponse {
  chart_path?: string;
  insight_path?: string;
  insight_md?: string;
  error?: string;
  spec?: Record<string, any>; // 添加spec字段用于存储图表规范
}

// VMind API 客户端
export const VmindAPI = {
  // 生成图表
  generateChart: async (
    request: GenerateChartRequest
  ): Promise<ApiResponse<GenerateChartResponse>> => {
    return apiClient.post('/api/vmind/generate-chart', request);
  }
}; 