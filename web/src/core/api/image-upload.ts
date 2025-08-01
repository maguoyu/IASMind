import { apiClient, type ApiResponse } from './config';

// 图片上传响应类型
export interface ImageUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

// 图片上传API客户端
export const imageUploadApi = {
  // 上传图片
  async uploadImage(file: File): Promise<ApiResponse<ImageUploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.post<ImageUploadResponse>('/api/upload', formData);
  },

  // 上传多个图片
  async uploadImages(files: File[]): Promise<ApiResponse<ImageUploadResponse[]>> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    
    return apiClient.post<ImageUploadResponse[]>('/api/upload/batch', formData);
  },

  // 删除图片
  async deleteImage(filename: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/api/upload/${filename}`);
  },
}; 