import { apiClient, type ApiResponse } from './config';

// 市场因素数据类型
export interface MarketFactor {
  name: string;
  impact: "high" | "medium" | "low";
  description: string;
}

// 市场因素集合类型
export interface MarketFactors {
  economic_indicators: MarketFactor[];
  industry_factors: MarketFactor[];
  seasonal_factors: MarketFactor[];
}

// 采购优化请求类型
export interface ProcurementOptimizationRequest {
  current_inventory: Record<string, number>;
  forecast_demand: Record<string, number>;
  constraints?: Record<string, any>;
  optimization_type?: 'cost' | 'service_level' | 'balanced';
}

// 采购优化响应类型
export interface ProcurementOptimizationResponse {
  total_recommended_procurement: number;
  safety_stock_factor: number;
  quarterly_batches: Array<{
    quarter: string;
    demand: number;
    recommended_purchase: number;
  }>;
  risk_alerts: string[];
  procurement_strategy: string;
}

// 样本数据类型
export interface SampleData {
  id: string;
  name: string;
  description?: string;
  data: any[];
  created_at: string;
  updated_at: string;
}

// 销售预测API客户端
export const salesForecastApi = {
  // 获取市场因素
  async getMarketFactors(): Promise<ApiResponse<MarketFactors>> {
    return apiClient.get<MarketFactors>('/api/sales_forecast/market_factors');
  },

  // 优化采购计划
  async optimizeProcurement(
    request: ProcurementOptimizationRequest
  ): Promise<ApiResponse<ProcurementOptimizationResponse>> {
    return apiClient.post<ProcurementOptimizationResponse>(
      '/api/sales_forecast/optimize_procurement',
      request
    );
  },

  // 下载模板文件
  async downloadTemplate(): Promise<Response> {
    const url = new URL(window.location.origin + '/api/sales_forecast/download_template');
    return fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });
  },

  // 上传样本数据
  async uploadSamples(formData: FormData): Promise<ApiResponse<{ message: string; sample_id: string }>> {
    return apiClient.post<{ message: string; sample_id: string }>(
      '/api/sales_forecast/upload_samples',
      formData
    );
  },

  // 删除样本数据
  async deleteSample(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/api/sales_forecast/samples/${id}`);
  },

  // 导出样本数据
  async exportSamples(format: 'csv' | 'json' = 'csv'): Promise<Response> {
    const url = new URL(window.location.origin + '/api/sales_forecast/export_samples');
    url.searchParams.append('format', format);
    
    return fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });
  },

  // 获取所有样本数据
  async getSamples(): Promise<ApiResponse<SampleData[]>> {
    return apiClient.get<SampleData[]>('/api/sales_forecast/samples');
  },

  // 获取单个样本数据
  async getSample(id: string): Promise<ApiResponse<SampleData>> {
    return apiClient.get<SampleData>(`/api/sales_forecast/samples/${id}`);
  },

  // 更新样本数据
  async updateSample(id: string, data: Partial<SampleData>): Promise<ApiResponse<SampleData>> {
    return apiClient.put<SampleData>(`/api/sales_forecast/samples/${id}`, data);
  },
}; 