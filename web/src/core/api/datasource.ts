import { apiClient } from './config';
import { resolveServiceURL } from "./resolve-service-url";

// 数据源接口定义
export interface DataSource {
  id: string;
  name: string;
  description: string;
  type: 'mysql' | 'oracle';
  host: string;
  port: number;
  username: string;
  database_name: string;
  schema_name?: string;
  service_name?: string;
  ssl: boolean;
  status: 'inactive' | 'active' | 'error';
  created_at: string;
  updated_at: string;
  last_connected_at?: string;
  error_message?: string;
}

export interface DataSourceCreate {
  name: string;
  description?: string;
  type: 'mysql' | 'oracle';
  host: string;
  port: number;
  username: string;
  password: string;
  database_name: string;
  schema_name?: string;
  service_name?: string;
  ssl?: boolean;
  ssl_ca?: string;
  ssl_cert?: string;
  ssl_key?: string;
}

export interface DataSourceUpdate {
  name?: string;
  description?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database_name?: string;
  schema_name?: string;
  service_name?: string;
  ssl?: boolean;
  ssl_ca?: string;
  ssl_cert?: string;
  ssl_key?: string;
}

export interface ConnectionTestResponse {
  success: boolean;
  message: string;
  details: Record<string, any>;
}

export interface Table {
  name: string;
}

export interface Column {
  name: string;
  type: string;
  null: boolean;
  key?: string;
  default?: any;
  extra?: string;
  length?: number;
  precision?: number;
  scale?: number;
}

export interface TablesResponse {
  success: boolean;
  tables: string[];
  count: number;
  schema?: string;
  message?: string;
}

export interface ColumnsResponse {
  success: boolean;
  table_name: string;
  columns: Column[];
  count: number;
  schema?: string;
  message?: string;
}

// 元数据相关接口定义
export interface TableMetadata {
  name: string;
  schema?: string;
  type: 'table' | 'view';
  comment?: string;
  rows_count: number;
  size_mb: number;
  created_at?: string;
  updated_at?: string;
  columns: Column[];
  indexes: Index[];
  constraints: Constraint[];
}

export interface Index {
  name: string;
  type: 'primary' | 'unique' | 'index' | 'fulltext';
  columns: string[];
  unique: boolean;
  comment?: string;
}

export interface Constraint {
  name: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check';
  columns: string[];
  referenced_table?: string;
  referenced_columns?: string[];
  comment?: string;
}

export interface DatabaseMetadata {
  database_name: string;
  charset?: string;
  collation?: string;
  size_mb: number;
  tables_count: number;
  views_count: number;
  created_at?: string;
  tables: TableMetadata[];
}

export interface MetadataResponse {
  success: boolean;
  data: DatabaseMetadata;
  sync_time: string;
  version: string;
  message?: string;
}

export interface SyncConfig {
  enabled: boolean;
  interval_hours: number;
  auto_sync: boolean;
  include_table_stats: boolean;
  include_indexes: boolean;
  include_constraints: boolean;
}

export interface SyncHistory {
  id: string;
  datasource_id: string;
  sync_time: string;
  status: 'success' | 'failed' | 'partial';
  duration_seconds: number;
  tables_synced: number;
  error_message?: string;
  changes_detected: number;
}

export interface SyncHistoryResponse {
  success: boolean;
  history: SyncHistory[];
  total: number;
  message?: string;
}

export interface SyncStatusResponse {
  success: boolean;
  status: 'idle' | 'syncing' | 'error';
  last_sync?: string;
  next_sync?: string;
  config: SyncConfig;
  message?: string;
}

// 数据源API类
export class DataSourceApi {
  private baseUrl = resolveServiceURL('/api/datasources');

  /**
   * 获取所有数据源
   */
  async getAll(): Promise<DataSource[]> {
    const response = await apiClient.get(this.baseUrl);
    return response.data;
  }

  /**
   * 根据ID获取数据源
   */
  async getById(id: string): Promise<DataSource> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * 创建数据源
   */
  async create(data: DataSourceCreate): Promise<DataSource> {
    const response = await apiClient.post(this.baseUrl, data);
    return response.data;
  }

  /**
   * 更新数据源
   */
  async update(id: string, data: DataSourceUpdate): Promise<DataSource> {
    const response = await apiClient.put(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  /**
   * 删除数据源
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * 测试数据源连接
   */
  async testConnection(id: string): Promise<ConnectionTestResponse> {
    const response = await apiClient.post(`${this.baseUrl}/${id}/test`);
    return response.data;
  }

  /**
   * 使用参数测试连接（不保存）
   */
  async testConnectionParams(data: DataSourceCreate): Promise<ConnectionTestResponse> {
    const response = await apiClient.post(`${this.baseUrl}/test-connection`, data);
    return response.data;
  }

  /**
   * 获取数据源中的表列表
   */
  async getTables(id: string): Promise<TablesResponse> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/tables`);
    return response.data;
  }

  /**
   * 获取指定表的列信息
   */
  async getTableColumns(id: string, tableName: string): Promise<ColumnsResponse> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/tables/${tableName}/columns`);
    return response.data;
  }

  /**
   * 获取数据源元数据
   */
  async getMetadata(id: string): Promise<MetadataResponse> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/metadata`);
    return response.data;
  }

  /**
   * 手动同步数据源元数据
   */
  async syncMetadata(id: string): Promise<MetadataResponse> {
    const response = await apiClient.post(`${this.baseUrl}/${id}/metadata/sync`);
    return response.data;
  }

  /**
   * 获取元数据同步配置
   */
  async getSyncConfig(id: string): Promise<SyncConfig> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/metadata/config`);
    return response.data;
  }

  /**
   * 更新元数据同步配置
   */
  async updateSyncConfig(id: string, config: Partial<SyncConfig>): Promise<SyncConfig> {
    const response = await apiClient.put(`${this.baseUrl}/${id}/metadata/config`, config);
    return response.data;
  }

  /**
   * 获取元数据同步状态
   */
  async getSyncStatus(id: string): Promise<SyncStatusResponse> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/metadata/status`);
    return response.data;
  }

  /**
   * 获取元数据同步历史
   */
  async getSyncHistory(id: string, page = 1, limit = 10): Promise<SyncHistoryResponse> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/metadata/history`, {
      params: { page, limit }
    });
    return response.data;
  }

  /**
   * 停止元数据同步
   */
  async stopSync(id: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/${id}/metadata/stop`);
  }
}

// 导出单例实例
export const dataSourceApi = new DataSourceApi(); 