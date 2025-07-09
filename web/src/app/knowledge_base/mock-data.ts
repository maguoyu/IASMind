// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import type { KnowledgeBase, FileDocument, VectorData, KnowledgeBaseStats } from "./types";

export const mockKnowledgeBases: KnowledgeBase[] = [
  {
    id: "kb-1",
    name: "产品文档库",
    description: "包含所有产品相关文档和说明书",
    createdAt: "2024-01-15T08:30:00Z",
    updatedAt: "2024-12-20T14:22:00Z",
    fileCount: 156,
    vectorCount: 12450,
    status: "active",
    embeddingModel: "text-embedding-3-small",
    chunkSize: 1000,
    chunkOverlap: 200,
  },
  {
    id: "kb-2", 
    name: "技术文档库",
    description: "开发相关的技术文档和API文档",
    createdAt: "2024-02-10T10:15:00Z",
    updatedAt: "2024-12-19T16:45:00Z",
    fileCount: 89,
    vectorCount: 8320,
    status: "active",
    embeddingModel: "text-embedding-3-large",
    chunkSize: 800,
    chunkOverlap: 150,
  },
  {
    id: "kb-3",
    name: "法务合规文档",
    description: "法律法规和合规相关文档",
    createdAt: "2024-03-05T14:20:00Z",
    updatedAt: "2024-12-18T09:30:00Z",
    fileCount: 45,
    vectorCount: 3890,
    status: "processing",
    embeddingModel: "text-embedding-3-small",
    chunkSize: 1200,
    chunkOverlap: 100,
  },
];

export const mockFileDocuments: FileDocument[] = [
  {
    id: "file-1",
    name: "产品需求文档_v2.3.pdf",
    type: "application/pdf",
    size: 2458762,
    uploadedAt: "2024-12-20T14:22:00Z",
    status: "vectorized",
    knowledgeBaseId: "kb-1",
    vectorCount: 156,
    lastVectorizedAt: "2024-12-20T14:25:30Z",
    metadata: {
      pageCount: 28,
      wordCount: 8450,
      language: "zh-CN",
    },
  },
  {
    id: "file-2",
    name: "API接口文档.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 1876543,
    uploadedAt: "2024-12-20T13:15:00Z",
    status: "processing",
    knowledgeBaseId: "kb-2",
    metadata: {
      pageCount: 45,
      wordCount: 12300,
      language: "zh-CN",
    },
  },
  {
    id: "file-3",
    name: "用户手册_最新版.pdf",
    type: "application/pdf",
    size: 3245678,
    uploadedAt: "2024-12-20T12:40:00Z",
    status: "vectorized",
    knowledgeBaseId: "kb-1",
    vectorCount: 203,
    lastVectorizedAt: "2024-12-20T12:45:10Z",
    metadata: {
      pageCount: 56,
      wordCount: 15600,
      language: "zh-CN",
    },
  },
  {
    id: "file-4",
    name: "系统架构设计.txt",
    type: "text/plain",
    size: 45623,
    uploadedAt: "2024-12-20T11:30:00Z",
    status: "failed",
    knowledgeBaseId: "kb-2",
    errorMessage: "文档格式不支持或内容损坏",
    metadata: {
      wordCount: 2340,
      language: "zh-CN",
    },
  },
  {
    id: "file-5",
    name: "合规检查清单.xlsx",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 123456,
    uploadedAt: "2024-12-20T10:15:00Z",
    status: "uploaded",
    knowledgeBaseId: "kb-3",
    metadata: {
      language: "zh-CN",
    },
  },
];

export const mockVectorData: VectorData[] = [
  {
    id: "vec-1",
    content: "我们的产品主要解决用户在数据分析过程中遇到的效率问题。通过智能化的数据处理算法，可以大幅提升分析速度...",
    metadata: {
      source: "产品需求文档_v2.3.pdf",
      page: 5,
      chunk: 1,
    },
    similarity: 0.95,
  },
  {
    id: "vec-2", 
    content: "系统采用微服务架构设计，主要包含用户服务、数据服务、分析服务等核心模块。每个服务独立部署和扩展...",
    metadata: {
      source: "系统架构设计.txt",
      chunk: 3,
    },
    similarity: 0.88,
  },
  {
    id: "vec-3",
    content: "API接口遵循RESTful设计原则，支持JSON格式的数据交换。所有接口都需要进行身份验证...",
    metadata: {
      source: "API接口文档.docx",
      page: 12,
      chunk: 5,
    },
    similarity: 0.82,
  },
];

export const mockKnowledgeBaseStats: KnowledgeBaseStats = {
  totalFiles: 290,
  totalVectors: 24660,
  totalSize: 125478963, // bytes
  processingFiles: 3,
  failedFiles: 5,
  recentActivity: {
    uploads: 12,
    vectorizations: 8,
    errors: 2,
  },
}; 