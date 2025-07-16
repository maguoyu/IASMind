// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { resolveServiceURL } from "./resolve-service-url";

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  file_count: number;
  vector_count: number;
  status: "active" | "inactive" | "processing";
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
}

export interface FileDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploaded_at: string;
  status: "uploaded" | "processing" | "vectorized" | "failed";
  knowledge_base_id: string;
  vector_count?: number;
  last_vectorized_at?: string;
  error_message?: string;
  file_path?: string;
  suffix?: string;
  metadata?: {
    description?: string;
    original_filename?: string;
    uploaded_by?: string;
    pageCount?: number;
    wordCount?: number;
    language?: string;
    file_size_mb?: number;
    test_data?: boolean;
    sample_data?: boolean;
  };
}

export interface KnowledgeBaseCreateRequest {
  name: string;
  description?: string;
  embedding_model?: string;
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface KnowledgeBaseUpdateRequest {
  name?: string;
  description?: string;
  embedding_model?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  status?: string;
}

export interface FileListResponse {
  files: FileDocument[];
  total: number;
  page: number;
  page_size: number;
}

export interface KnowledgeBaseListResponse {
  knowledge_bases: KnowledgeBase[];
  total: number;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  file_id?: string;
  file_info?: FileDocument;
}

export interface StatsResponse {
  success: boolean;
  stats: {
    total_knowledge_bases: number;
    total_files: number;
    total_vectors: number;
    knowledge_base_status: Record<string, number>;
    file_status: Record<string, number>;
    file_type_stats: Record<string, number>;
    recent_files: FileDocument[];
  };
}

export interface HealthCheckResponse {
  status: string;
  database: string;
  file_path: string;
  timestamp: string;
}

export interface BatchVectorizeRequest {
  file_ids: string[];
  config?: Record<string, any>;
  knowledge_base_id?: string;
}

export interface BatchVectorizeResponse {
  success: boolean;
  message: string;
  results: Array<{
    file_id: string;
    status: "success" | "failed" | "skipped";
    message: string;
    vector_count?: number;
  }>;
}

// 知识库管理API
export const knowledgeBaseApi = {
  // 健康检查
  async HealthCheck(): Promise<HealthCheckResponse> {
    const response = await fetch(resolveServiceURL("/api/knowledge_base/health"), {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`健康检查失败: ${response.statusText}`);
    }

    return response.json();
  },

  // 创建知识库
  async CreateKnowledgeBase(request: KnowledgeBaseCreateRequest): Promise<{ success: boolean; knowledge_base: KnowledgeBase }> {
    const response = await fetch(resolveServiceURL("/api/knowledge_base/knowledge_bases"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `创建知识库失败: ${response.statusText}`);
    }

    return response.json();
  },

  // 获取知识库列表
  async GetKnowledgeBases(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
  }): Promise<KnowledgeBaseListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.page_size) searchParams.append("page_size", params.page_size.toString());
    if (params?.status) searchParams.append("status", params.status);
    if (params?.search) searchParams.append("search", params.search);

    const url = resolveServiceURL(`/api/knowledge_base/knowledge_bases?${searchParams.toString()}`);

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`获取知识库列表失败: ${response.statusText}`);
    }

    return response.json();
  },

  // 获取知识库详情
  async GetKnowledgeBase(kbId: string): Promise<{ 
    success: boolean; 
    knowledge_base: KnowledgeBase; 
    recent_files: FileDocument[];
  }> {
    const response = await fetch(resolveServiceURL(`/api/knowledge_base/knowledge_bases/${kbId}`), {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`获取知识库详情失败: ${response.statusText}`);
    }

    return response.json();
  },

  // 更新知识库
  async UpdateKnowledgeBase(kbId: string, request: KnowledgeBaseUpdateRequest): Promise<{ success: boolean; knowledge_base: KnowledgeBase }> {
    const response = await fetch(resolveServiceURL(`/api/knowledge_base/knowledge_bases/${kbId}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `更新知识库失败: ${response.statusText}`);
    }

    return response.json();
  },

  // 删除知识库
  async DeleteKnowledgeBase(kbId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(resolveServiceURL(`/api/knowledge_base/knowledge_bases/${kbId}`), {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`删除知识库失败: ${response.statusText}`);
    }

    return response.json();
  },

  // 上传文件
  async UploadFile(file: File, knowledgeBaseId?: string, description?: string): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (knowledgeBaseId) {
      formData.append("knowledge_base_id", knowledgeBaseId);
    }
    if (description) {
      formData.append("description", description);
    }

    const response = await fetch(resolveServiceURL("/api/knowledge_base/upload"), {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `文件上传失败: ${response.statusText}`);
    }

    return response.json();
  },

  // 获取文件列表
  async GetFiles(params?: {
    knowledge_base_id?: string;
    status?: string;
    file_type?: string;
    search?: string;
    file_ids?: string[];
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: "asc" | "desc";
  }): Promise<FileListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.knowledge_base_id) searchParams.append("knowledge_base_id", params.knowledge_base_id);
    if (params?.status) searchParams.append("status", params.status);
    if (params?.file_type) searchParams.append("file_type", params.file_type);
    if (params?.search) searchParams.append("search", params.search);
    if (params?.file_ids && params.file_ids.length > 0) searchParams.append("file_ids", params.file_ids.join(","));
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.page_size) searchParams.append("page_size", params.page_size.toString());
    if (params?.sort_by) searchParams.append("sort_by", params.sort_by);
    if (params?.sort_order) searchParams.append("sort_order", params.sort_order);

    const response = await fetch(
      resolveServiceURL(`/api/knowledge_base/files?${searchParams.toString()}`),
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error(`获取文件列表失败: ${response.statusText}`);
    }

    return response.json();
  },

  // 获取文件详情
  async GetFile(fileId: string): Promise<{ 
    success: boolean; 
    file: FileDocument; 
    knowledge_base: KnowledgeBase | null;
  }> {
    const response = await fetch(resolveServiceURL(`/api/knowledge_base/files/${fileId}`), {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`获取文件详情失败: ${response.statusText}`);
    }

    return response.json();
  },

  // 删除文件
  async DeleteFile(fileId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(resolveServiceURL(`/api/knowledge_base/files/${fileId}`), {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`删除文件失败: ${response.statusText}`);
    }

    return response.json();
  },

  // 向量化文件
  async VectorizeFile(fileId: string, knowledgeBaseId?: string): Promise<{ success: boolean; message: string; vector_count?: number }> {
    const response = await fetch(resolveServiceURL(`/api/knowledge_base/files/${fileId}/vectorize`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        knowledge_base_id: knowledgeBaseId
      }),
    });

    if (!response.ok) {
      throw new Error(`文件向量化失败: ${response.statusText}`);
    }

    return response.json();
  },

  // 批量向量化文件
  async BatchVectorizeFiles(request: BatchVectorizeRequest): Promise<BatchVectorizeResponse> {
    const response = await fetch(resolveServiceURL("/api/knowledge_base/files/batch_vectorize"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`批量向量化失败: ${response.statusText}`);
    }

    return response.json();
  },

  // 下载文件
  async DownloadFile(fileId: string): Promise<Blob> {
    const response = await fetch(resolveServiceURL(`/api/knowledge_base/files/${fileId}/download`), {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`文件下载失败: ${response.statusText}`);
    }

    return response.blob();
  },

  // 获取统计信息
  async GetStats(): Promise<StatsResponse> {
    const response = await fetch(resolveServiceURL("/api/knowledge_base/stats"), {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`获取统计信息失败: ${response.statusText}`);
    }

    return response.json();
  },

  // 工具函数
  utils: {
    // 格式化文件大小
    formatFileSize(bytes: number): string {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    },

    // 获取文件图标
    getFileIcon(type: string): string {
      if (type.includes("pdf")) return "📄";
      if (type.includes("word")) return "📝";
      if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
      if (type.includes("text")) return "📄";
      if (type.includes("markdown")) return "📝";
      if (type.includes("json")) return "📋";
      if (type.includes("csv")) return "📊";
      return "📁";
    },

    // 获取状态颜色
    getStatusColor(status: FileDocument["status"]): string {
      switch (status) {
        case "uploaded":
          return "secondary";
        case "processing":
          return "default";
        case "vectorized":
          return "default";
        case "failed":
          return "destructive";
        default:
          return "secondary";
      }
    },

    // 获取状态文本
    getStatusText(status: FileDocument["status"]): string {
      switch (status) {
        case "uploaded":
          return "已上传";
        case "processing":
          return "处理中";
        case "vectorized":
          return "已向量化";
        case "failed":
          return "失败";
        default:
          return "未知状态";
      }
    },

    // 获取知识库状态颜色
    getKnowledgeBaseStatusColor(status: KnowledgeBase["status"]): string {
      switch (status) {
        case "active":
          return "default";
        case "inactive":
          return "secondary";
        case "processing":
          return "default";
        default:
          return "secondary";
      }
    },

    // 获取知识库状态文本
    getKnowledgeBaseStatusText(status: KnowledgeBase["status"]): string {
      switch (status) {
        case "active":
          return "活跃";
        case "inactive":
          return "非活跃";
        case "processing":
          return "处理中";
        default:
          return "未知状态";
      }
    },
  },
}; 