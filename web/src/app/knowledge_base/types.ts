// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  vectorCount: number;
  status: "active" | "inactive" | "processing";
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
}

export interface FileDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  status: "uploaded" | "processing" | "vectorized" | "failed";
  knowledgeBaseId: string;
  vectorCount?: number;
  lastVectorizedAt?: string;
  errorMessage?: string;
  filePath?: string;
  suffix?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    language?: string;
  };
}

export interface VectorData {
  id: string;
  content: string;
  metadata: {
    source: string;
    page?: number;
    chunk?: number;
  };
  similarity?: number;
  embedding?: number[];
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "processing" | "completed" | "failed";
  error?: string;
}

export interface FileFilter {
  status?: FileDocument["status"];
  type?: string;
  knowledgeBaseId?: string;
  search?: string;
}

export interface KnowledgeBaseStats {
  totalFiles: number;
  totalVectors: number;
  totalSize: number;
  processingFiles: number;
  failedFiles: number;
  recentActivity: {
    uploads: number;
    vectorizations: number;
    errors: number;
  };
} 