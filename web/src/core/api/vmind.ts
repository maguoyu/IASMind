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
  output_type: string;  // 改为string类型以更灵活地支持输出类型
  task_type?: string;
  insights_id?: string[];
  data?: any; // 支持多种数据格式：数组、字符串或其他格式
  user_prompt?: string;
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
  },

  // 使用文件生成图表
  generateChartWithFile: async (
    formData: FormData
  ): Promise<ApiResponse<GenerateChartResponse>> => {
    return apiClient.post('/api/vmind/generate-chart-with-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
}; 