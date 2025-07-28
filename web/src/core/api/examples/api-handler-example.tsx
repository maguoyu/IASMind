'use client';

import { useState } from "react";

import { apiClient } from "~/core/api/config";
import { useApiHandler } from "~/core/api/use-api-handler";

/**
 * API处理工具使用示例组件
 * 展示如何在组件中使用API处理工具
 */
export function ApiHandlerExample() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 使用API处理Hook
  const { wrapApiCall, handleResponse } = useApiHandler();

  // 直接调用apiClient，它已经集成了API处理工具
  const fetchDataWithClient = async () => {
    setLoading(true);
    setError(null);

    try {
      // 调用示例API
      const response = await apiClient.get('/example-api');
      
      if (response.error) {
        setError(response.error);
      } else {
        setData(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生未知错误');
    } finally {
      setLoading(false);
    }
  };

  // 使用wrapApiCall包装自定义API调用
  const fetchDataWithWrapper = async () => {
    setLoading(true);
    setError(null);

    try {
      // 使用wrapApiCall包装自定义API调用
      const response = await wrapApiCall(async () => {
        // 这里是自定义API调用逻辑
        const res = await fetch('/custom-api');
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          return {
            data: null,
            error: errorData.detail ?? res.statusText,
            status: res.status,
          };
        }

        const data = await res.json();
        return { data };
      });

      if (response.error) {
        setError(response.error);
      } else {
        setData(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">API处理工具示例</h2>
      
      <div className="flex space-x-4 mb-6">
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={fetchDataWithClient}
          disabled={loading}
        >
          使用apiClient获取数据
        </button>
        
        <button 
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={fetchDataWithWrapper}
          disabled={loading}
        >
          使用wrapApiCall包装器获取数据
        </button>
      </div>

      {loading && (
        <div className="mb-4">加载中...</div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded text-red-800">
          错误: {error}
        </div>
      )}

      {data && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">返回数据:</h3>
          <pre className="p-3 bg-gray-100 rounded overflow-auto max-h-60">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-50 rounded border border-gray-200">
        <h3 className="font-semibold mb-2">使用说明:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>apiClient:</strong> 已经集成了API响应处理功能，会自动处理403状态码并重定向到登录页面
          </li>
          <li>
            <strong>useApiHandler Hook:</strong> 提供了handleResponse和wrapApiCall方法，用于在组件中处理API响应
          </li>
          <li>
            <strong>API响应处理流程:</strong> 检测响应状态码 → 403/401状态码时清除认证信息 → 重定向到登录页面
          </li>
        </ul>
      </div>
    </div>
  );
} 