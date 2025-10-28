import { apiClient, type ApiResponse } from './config';
import { resolveServiceURL } from './resolve-service-url';

// 数据库分析请求类型
export interface DatabaseAnalysisRequest {
  user_query: string;
  datasource_id: string;
  thread_id: string;
  table_name?: string | null;
  enable_insights?: boolean;
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

// SSE事件类型
export interface SSEThinkingStep {
  type: 'thinking_step';
  data: {
    node: string;
    emoji: string;
    title: string;
    message: string;
    details?: any;
    timestamp: string;
    status: 'processing' | 'completed' | 'error';
  };
}

export interface SSEResult {
  type: 'result';
  result_type: 'chart' | 'table' | 'text';
  data: any[];
  columns: string[];
  chart_config?: any;
  metadata?: {
    sql_query: string;
    execution_time: number;
    row_count: number;
    entities: any[];
    tables: string[];
  };
  insights?: any;
  insight_md?: string;
}

export interface SSEError {
  type: 'error';
  error: string;
}

export type SSEEvent = SSEThinkingStep | SSEResult | SSEError | { type: 'start' | 'done', message?: string };

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

  // 流式分析数据库（SSE）
  async* analyzeDatabaseStream(
    request: DatabaseAnalysisRequest
  ): AsyncGenerator<SSEEvent> {
    // 获取访问令牌
    const getAccessToken = () => {
      if (typeof window === 'undefined') return null;
      try {
        const authStore = JSON.parse(localStorage.getItem('auth-store') || '{}');
        return authStore?.state?.accessToken || null;
      } catch {
        return null;
      }
    };

    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = resolveServiceURL('database_analysis/analyze/stream');
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 处理SSE消息
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr);
              yield event as SSEEvent;
            } catch (e) {
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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