// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { apiClient, type ApiResponse } from './config';

// Types
export interface FileExploration {
  id: string;
  name: string;
  type: string;
  size: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  file_path: string;
  status: string;
  suffix?: string;
  metadata?: Record<string, any>;
  preview_data?: Record<string, any>[] | Record<string, any>;
  data_insights?: Record<string, any>;
  last_accessed_at?: string;
}

export interface FileListResponse {
  total: number;
  files: FileExploration[];
}

export interface DataInsightsResponse {
  status: string;
  message: string;
  insights: Record<string, any>;
}

export interface AnalyzeDataRequest {
  file_id: string;
  output_type?: string;
  task_type?: string;
  user_prompt?: string;
  language?: string;
}

export interface AnalyzeDataResponse {
  spec?: Record<string, any>;
  insights?: Array<{
    name: string;
    type: string;
    textContent: {
      plainText: string;
    };
  }>;
  error?: string;
}

// API Client
export const DataExplorationAPI = {
  // 上传文件
  uploadFile: async (file: File): Promise<ApiResponse<FileExploration>> => {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post('/api/data-exploration/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // 获取文件列表
  getFiles: async (
    params: {
      limit?: number;
      offset?: number;
      file_type?: string;
      search?: string;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    } = {}
  ): Promise<ApiResponse<FileListResponse>> => {
    return apiClient.get('/api/data-exploration/files', { params });
  },

  // 获取文件详情
  getFile: async (fileId: string): Promise<ApiResponse<FileExploration>> => {
    return apiClient.get(`/api/data-exploration/files/${fileId}`);
  },

  // 删除文件
  deleteFile: async (fileId: string): Promise<ApiResponse<{ status: string; message: string }>> => {
    return apiClient.delete(`/api/data-exploration/files/${fileId}`);
  },

  // 生成数据洞察
  generateInsights: async (fileId: string): Promise<ApiResponse<DataInsightsResponse>> => {
    return apiClient.post(`/api/data-exploration/files/${fileId}/insights`);
  },
  
  // 分析数据
  analyzeData: async (request: AnalyzeDataRequest): Promise<ApiResponse<AnalyzeDataResponse>> => {
    return apiClient.post('/api/data-exploration/analyze', request);
  }
};

export default DataExplorationAPI; 