import type { ApiResponse } from './config';
import { apiClient } from './config';

// 图表洞察接口
export interface ChartInsight {
  name: string;
  type: string;
  fieldId?: string;
  value?: number;
  significant?: number;
  data?: any[];
  info?: Record<string, any>;
  textContent: {
    content?: string;
    variables?: Record<string, any>;
    plainText: string;
  };
}

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
  spec?: Record<string, any>; // 图表规范
  insights?: ChartInsight[]; // 数据洞察数组
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