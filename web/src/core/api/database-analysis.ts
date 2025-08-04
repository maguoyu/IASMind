import { apiClient, type ApiResponse } from './config';

// 数据库分析请求类型
export interface DatabaseAnalysisRequest {
  user_query: string;
  datasource_id: string;
  thread_id: string;
  table_name?: string | null;
  language?: string;
}

// 数据库分析响应类型
export interface DatabaseAnalysisResponse {
  success: boolean;
  result_type: 'chart' | 'table' | 'text';
  analysis: string;
  sql_query?: string;
  data?: any[];
  chart_config?: any;
  insights?: string[];
  error?: string;
}

// 数据库分析API客户端
export const databaseAnalysisApi = {
  // 分析数据库
  async analyzeDatabase(
    request: DatabaseAnalysisRequest
  ): Promise<ApiResponse<DatabaseAnalysisResponse>> {
    return apiClient.post<DatabaseAnalysisResponse>(
      '/api/database_analysis/analyze',
      request
    );
  },

  // 获取数据源状态
  async getDatasourceStatus(dataSourceId: string): Promise<ApiResponse<{ status: string; tables: string[] }>> {
    return apiClient.get<{ status: string; tables: string[] }>(
      `/api/database_analysis/datasource/${dataSourceId}/status`
    );
  },

  // 获取表结构
  async getTableSchema(
    dataSourceId: string, 
    tableName: string
  ): Promise<ApiResponse<{ columns: string[]; sample_data: any[] }>> {
    return apiClient.get<{ columns: string[]; sample_data: any[] }>(
      `/api/database_analysis/datasource/${dataSourceId}/table/${tableName}/schema`
    );
  },

  // 执行自定义SQL查询
  async executeQuery(
    dataSourceId: string,
    query: string
  ): Promise<ApiResponse<{ results: any[]; columns: string[] }>> {
    return apiClient.post<{ results: any[]; columns: string[] }>(
      `/api/database_analysis/datasource/${dataSourceId}/query`,
      { query }
    );
  },
}; 