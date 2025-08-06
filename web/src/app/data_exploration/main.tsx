"use client";

import { BarChartOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, UploadOutlined } from "@ant-design/icons";
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useMemo } from 'react';
import EChartsWrapper from "~/components/charts/echarts-wrapper";
import { toast } from "sonner";

import { DataExplorationAPI } from "~/core/api/data-exploration";
import { useAuthStore } from '~/core/store/auth-store';

interface DataFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadTime: Date;
  preview?: Record<string, unknown>[];
}

export function DataExplorationMain() {
  const [uploadedFiles, setUploadedFiles] = useState<DataFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'visualization'>('preview');
  const [insightsData, setInsightsData] = useState<Record<string, any> | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [visualizationSpec, setVisualizationSpec] = useState<Record<string, any> | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>("");
  const router = useRouter();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  // 处理认证错误
  const handleAuthError = useCallback(() => {
    toast.error("需要登录才能使用此功能");
    setTimeout(() => {
      router.push('/auth/login');
    }, 1500);
  }, [router]);

  // 检查认证状态
  useEffect(() => {
    if (!isAuthenticated) {
      handleAuthError();
    }
  }, [isAuthenticated, handleAuthError]);

  // 加载文件列表
  const fetchFiles = useCallback(async () => {
    if (!isAuthenticated) {
      handleAuthError();
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await DataExplorationAPI.getFiles();
      
      if (response.status === 401 || response.status === 403) {
        handleAuthError();
        return;
      }
      
      // 获取文件列表
      const files = response.data?.files?.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadTime: new Date(file.created_at),
        preview: Array.isArray(file.preview_data) 
          ? file.preview_data.map(item => {
              // 确保所有值为null或undefined的情况都处理为空字符串
              if (!item) return {};
              return Object.fromEntries(
                Object.entries(item).map(([k, v]) => [k, v !== null && v !== undefined ? v : ""])
              );
            }) 
          : file.preview_data && typeof file.preview_data === 'object'
            ? [Object.fromEntries(
                Object.entries(file.preview_data).map(([k, v]) => [k, v !== null && v !== undefined ? v : ""])
              )]
            : []
      })) ?? [];
      setUploadedFiles(files);
    } catch (error) {
      console.error("获取文件列表失败:", error);
      toast.error("无法获取文件列表，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, handleAuthError]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) {
      handleAuthError();
      return;
    }
    
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    // 实际API上传处理
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        const response = await DataExplorationAPI.uploadFile(file);
        
        if (response.status === 401 || response.status === 403) {
          handleAuthError();
          return null;
        }
        
        if (response.data) {
          console.log("文件上传成功:", response.data);
          
          // 将API返回的数据转换为本地格式
          return {
            id: response.data.id,
            name: response.data.name,
            size: response.data.size,
            type: response.data.type,
            uploadTime: new Date(response.data.created_at),
            preview: Array.isArray(response.data.preview_data) 
              ? response.data.preview_data.map(item => {
                  // 确保所有值为null或undefined的情况都处理为空字符串
                  if (!item) return {};
                  return Object.fromEntries(
                    Object.entries(item).map(([k, v]) => [k, v !== null && v !== undefined ? v : ""])
                  );
                })
              : response.data.preview_data && typeof response.data.preview_data === 'object'
                ? [Object.fromEntries(
                    Object.entries(response.data.preview_data).map(([k, v]) => [k, v !== null && v !== undefined ? v : ""])
                  )]
                : []
          };
        }
        throw new Error("上传响应异常");
      } catch (error) {
        console.error("文件上传失败:", error);
        toast.error(`文件 ${file.name} 上传失败`);
        return null;
      }
    });

    Promise.all(uploadPromises)
      .then(newFiles => {
        const validFiles = newFiles.filter(Boolean) as DataFile[];
        if (validFiles.length > 0) {
          setUploadedFiles(prev => [...prev, ...validFiles]);
          toast.success(`成功上传 ${validFiles.length} 个文件`);
        }
      })
      .catch(error => {
        console.error("上传文件处理失败:", error);
        toast.error("处理上传文件时发生错误");
      })
      .finally(() => {
        setIsUploading(false);
        // 清除input的值，允许重复上传同一文件
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      });
  }, [isAuthenticated, handleAuthError]);

  const generateMockPreview = (fileName: string) => {
    // 生成模拟数据预览
    if (fileName.includes('.csv') || fileName.includes('.xlsx') || fileName.includes('.json')) {
      return [
        { id: 1, name: "示例数据1", value: 100, category: "A", date: "2024-01-01" },
        { id: 2, name: "示例数据2", value: 200, category: "B", date: "2024-01-02" },
        { id: 3, name: "示例数据3", value: 150, category: "A", date: "2024-01-03" },
        { id: 4, name: "示例数据4", value: 300, category: "C", date: "2024-01-04" },
        { id: 5, name: "示例数据5", value: 250, category: "B", date: "2024-01-05" }
      ];
    }
    return [];
  };

  // 生成可视化测试数据
  const generateVisualizationData = useMemo(() => {
    // 柱状图数据
    const barData = [
      { name: '类别A', value: 120, target: 100 },
      { name: '类别B', value: 180, target: 150 },
      { name: '类别C', value: 250, target: 200 },
      { name: '类别D', value: 90, target: 120 },
      { name: '类别E', value: 220, target: 180 }
    ];

    // 饼图数据
    const pieData = [
      { name: '类别A', value: 120, color: '#8884d8' },
      { name: '类别B', value: 180, color: '#82ca9d' },
      { name: '类别C', value: 250, color: '#ffc658' },
      { name: '类别D', value: 90, color: '#ff7300' },
      { name: '类别E', value: 220, color: '#8dd1e1' }
    ];

    // 折线图数据
    const lineData = [
      { month: '1月', sales: 1200, profit: 800, cost: 400 },
      { month: '2月', sales: 1400, profit: 900, cost: 500 },
      { month: '3月', sales: 1100, profit: 700, cost: 400 },
      { month: '4月', sales: 1600, profit: 1000, cost: 600 },
      { month: '5月', sales: 1800, profit: 1200, cost: 600 },
      { month: '6月', sales: 2000, profit: 1400, cost: 600 }
    ];

    // 散点图数据
    const scatterData = [
      { x: 10, y: 20, size: 5, category: 'A' },
      { x: 15, y: 35, size: 8, category: 'B' },
      { x: 20, y: 25, size: 6, category: 'A' },
      { x: 25, y: 45, size: 10, category: 'C' },
      { x: 30, y: 30, size: 7, category: 'B' },
      { x: 35, y: 55, size: 12, category: 'C' },
      { x: 40, y: 40, size: 9, category: 'A' },
      { x: 45, y: 65, size: 15, category: 'C' }
    ];

    // 面积图数据
    const areaData = [
      { month: '1月', revenue: 1200, expenses: 800, profit: 400 },
      { month: '2月', revenue: 1400, expenses: 900, profit: 500 },
      { month: '3月', revenue: 1100, expenses: 700, profit: 400 },
      { month: '4月', revenue: 1600, expenses: 1000, profit: 600 },
      { month: '5月', revenue: 1800, expenses: 1200, profit: 600 },
      { month: '6月', revenue: 2000, expenses: 1400, profit: 600 }
    ];

    return { barData, pieData, lineData, scatterData, areaData };
  }, []);

  const handleFileSelect = useCallback(async (file: DataFile) => {
    if (!isAuthenticated) {
      handleAuthError();
      return;
    }
    
    setSelectedFile(file);
    
    // 如果需要获取最新的文件详情（例如获取完整预览数据）
    try {
      const response = await DataExplorationAPI.getFile(file.id);
      
      if (response.status === 401 || response.status === 403) {
        handleAuthError();
        return;
      }
      
      if (response.data) {
        const updatedFile = {
          ...file,
          preview: Array.isArray(response.data.preview_data) 
            ? response.data.preview_data.map(item => {
                // 确保所有值为null或undefined的情况都处理为空字符串
                if (!item) return {};
                return Object.fromEntries(
                  Object.entries(item).map(([k, v]) => [k, v !== null && v !== undefined ? v : ""])
                );
              })
            : response.data.preview_data && typeof response.data.preview_data === 'object'
              ? [Object.fromEntries(
                  Object.entries(response.data.preview_data).map(([k, v]) => [k, v !== null && v !== undefined ? v : ""])
                )]
              : []
        };
        setSelectedFile(updatedFile);
        
        // 更新文件列表中的对应文件
        setUploadedFiles(prev => 
          prev.map(f => f.id === file.id ? updatedFile : f)
        );
        
        // 如果有洞察数据，设置到状态
        if (response.data.data_insights) {
          setInsightsData(response.data.data_insights);
        } else {
          setInsightsData(null);
          // 自动生成洞察数据
          handleGenerateInsights(file.id);
        }
      }
    } catch (error) {
      console.error("获取文件详情失败:", error);
    }
    
    // 自动切换到数据预览标签页
    setActiveTab('preview');
  }, [isAuthenticated, handleAuthError]);

  const handleFileDelete = useCallback(async (fileId: string) => {
    if (!isAuthenticated) {
      handleAuthError();
      return;
    }
    
    try {
      const response = await DataExplorationAPI.deleteFile(fileId);
      
      if (response.status === 401 || response.status === 403) {
        handleAuthError();
        return;
      }
      
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
      toast.success("文件已成功删除");
    } catch (error) {
      console.error("删除文件失败:", error);
      toast.error("无法删除文件，请稍后重试");
    }
  }, [selectedFile, isAuthenticated, handleAuthError]);

  const handleGenerateInsights = useCallback(async (fileId: string) => {
    if (!isAuthenticated) {
      handleAuthError();
      return;
    }
    
    if (!fileId) return;
    
    setIsGeneratingInsights(true);
    try {
      const response = await DataExplorationAPI.generateInsights(fileId);
      
      if (response.status === 401 || response.status === 403) {
        handleAuthError();
        return;
      }
      
      if (response.data && response.data.insights) {
        toast.success("数据洞察已生成");
        setInsightsData(response.data.insights);
      }
    } catch (error) {
      console.error("生成数据洞察失败:", error);
      toast.error("无法生成数据洞察，请稍后重试");
    } finally {
      setIsGeneratingInsights(false);
    }
  }, [isAuthenticated, handleAuthError]);

  // 数据分析功能
  const handleAnalyzeData = useCallback(async (fileId: string, prompt: string) => {
    if (!fileId) return;
    
    // 重置旧的数据和状态
    setIsAnalyzing(true);
    setVisualizationSpec(null);
    setInsightsData(null); // 清除旧的洞察数据
    
    try {
      const request = {
        file_id: fileId,
        output_type: "html",
        task_type: "visualization",
        user_prompt: prompt || "分析数据并生成最合适的可视化图表",
        language: "zh"
      };
      
      console.log("发送数据分析请求:", request);
      const response = await DataExplorationAPI.analyzeData(request);
      console.log("收到API响应:", response);
      
      if (!response || !response.data) {
        toast.error("未收到服务器响应");
        return;
      }
      
      if (response.data.error) {
        toast.error(`数据分析失败: ${response.data.error}`);
        return;
      }
      
      // 处理数据洞察 - 处理多种可能的格式
      const extractInsights = () => {
        // 检查insights字段
        if (response.data.insights && Array.isArray(response.data.insights)) {
          console.log("从insights提取洞察:", response.data.insights);
          const recommendations = response.data.insights.map(insight => ({
            type: "visualization",
            chart_type: insight.type || "general",
            description: insight.textContent?.plainText || insight.name || "无描述"
          }));
          return {
            recommendations
          };
        }
        
        return null;
      };
      
      const insightsData = extractInsights();
      if (insightsData) {
        console.log("处理后的数据洞察:", insightsData);
        setInsightsData(insightsData);
      } else {
        console.log("未找到任何数据洞察");
      }
      
      // 处理可视化规格
      if (response.data.spec) {
        console.log("收到新的可视化规格:", response.data.spec);
        setVisualizationSpec(response.data.spec);
        toast.success("数据分析完成，已生成可视化结果");
        // 自动切换到可视化标签
        setActiveTab('visualization');
      } else {
        toast.warning("未能生成可视化结果");
        setVisualizationSpec(null);
      }
    } catch (error) {
      console.error("数据分析失败:", error);
      toast.error("数据分析请求失败，请稍后重试");
      // 确保错误情况下也清除数据
      setInsightsData(null);
      setVisualizationSpec(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 修复类型错误 - 在JSX外添加类型声明
  const handleRecommendation = (r: {chart_type: string, description: string}) => { 
    return r.description; 
  };

  return (
    <div className="flex h-full w-full pt-12">
      {/* 左侧文件列表 */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">数据文件</h2>
          <div className="space-y-2">
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                <UploadOutlined className="text-2xl mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isUploading ? "上传中..." : "点击上传数据文件"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  支持 CSV, Excel, JSON 格式
                </p>
              </div>
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">加载中...</div>
          ) : uploadedFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              暂无数据文件，请点击上方"上传数据文件"按钮
            </div>
          ) : (
            uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedFile?.id === file.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => handleFileSelect(file)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)} • {file.uploadTime.toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileDelete(file.id);
                    }}
                  >
                    <DeleteOutlined className="h-3 w-3 text-gray-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {/* 如果没有选中文件，显示欢迎信息 */}
        {!selectedFile ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <UploadOutlined className="text-6xl text-gray-400 mb-4" />
              <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-gray-100">开始数据探索</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                从左侧上传数据文件开始智能分析之旅
              </p>
              <div className="text-sm text-gray-400 dark:text-gray-500">
                <p>• 支持 CSV、Excel、JSON 格式</p>
                <p>• 自动生成数据预览和洞察</p>
                <p>• 智能推荐可视化方案</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 文件详情头部 */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                数据文件 - {selectedFile.name}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => handleFileDelete(selectedFile.id)}
                  disabled={isGeneratingInsights || isAnalyzing}
                >
                  <DeleteOutlined className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
                <button
                  className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => handleGenerateInsights(selectedFile.id)}
                  disabled={isGeneratingInsights}
                >
                  <EyeOutlined className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* 标签切换 */}
            <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-4">
                <button
                  className={`py-2 px-4 ${activeTab === 'preview' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  onClick={() => setActiveTab('preview')}
                >
                  <EyeOutlined className="h-5 w-5 inline-block mr-1" />
                  数据预览
                </button>
                <button
                  className={`py-2 px-4 ${activeTab === 'visualization' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  onClick={() => setActiveTab('visualization')}
                >
                  <BarChartOutlined className="h-5 w-5 inline-block mr-1" />
                  数据可视化
                </button>
              </nav>
            </div>

            {/* 内容区域 */}
            {activeTab === 'preview' ? (
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <EyeOutlined />
                    数据预览 - {selectedFile.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    查看数据文件的前 20 行内容
                  </p>
                </div>
                {selectedFile.preview && selectedFile.preview.length > 0 ? (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="overflow-x-auto">
                      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)", height: "max-content" }}>
                        <table className="w-full border-collapse">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              {Object.keys(selectedFile.preview[0] ?? {}).map((key) => (
                                <th key={key} className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedFile.preview.slice(0, 20).map((row, index) => (
                              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                {Object.values(row).map((value, cellIndex) => (
                                  <td key={cellIndex} className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                                    {value !== null && value !== undefined ? String(value) : ""}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    暂无预览数据
                  </div>
                )}
              </div>
            ) : (
              /* 数据可视化标签 */
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">数据可视化</h3>
                  
                  {/* 用户提示输入 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      用户提示
                    </label>
                    <div className="flex flex-col gap-2">
                      <textarea
                        className="w-full p-3 min-h-[100px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-base resize-y"
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        placeholder="描述你想要生成的图表类型和需求，例如：按类别展示销售额的饼图，并分析增长最快的类别"
                        rows={4}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        提示：尝试指定图表类型、数据关系、分析需求等，描述越具体生成的结果越精确
                      </p>
                      <div className="flex justify-end">
                        <button
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 flex items-center"
                          onClick={() => handleAnalyzeData(selectedFile.id, userPrompt)}
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <>
                              <EyeOutlined className="h-5 w-5 inline-block mr-1 animate-spin" />
                              分析中...
                            </>
                          ) : (
                            <>
                              <BarChartOutlined className="h-5 w-5 inline-block mr-1" />
                              生成图表
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* 图表显示区域 */}
                  {visualizationSpec ? (
                    <div className="h-[500px] w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-700">
                      <EChartsWrapper spec={visualizationSpec as any} />
                    </div>
                  ) : (
                    <div className="h-[500px] w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <BarChartOutlined className="h-16 w-16 mx-auto mb-2" />
                        <p className="text-lg">请点击"生成图表"按钮开始分析</p>
                        <p className="text-sm">支持根据数据自动生成最适合的可视化图表</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 数据洞察部分 */}
                  {insightsData && insightsData.recommendations && insightsData.recommendations.length > 0 ? (
                    <div className="mt-4">
                      <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">数据洞察</h4>
                      <div className="space-y-2">
                        {insightsData.recommendations.map((recommendation: any, index: number) => (
                          <div 
                            key={index}
                            className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border-l-4 border-blue-400"
                          >
                            <p className="text-gray-700 dark:text-gray-200">
                              {handleRecommendation(recommendation)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : isAnalyzing ? (
                    <div className="mt-4">
                      <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">数据洞察</h4>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                          <span className="text-gray-500 dark:text-gray-400">生成数据洞察中...</span>
                        </div>
                      </div>
                    </div>
                  ) : visualizationSpec ? (
                    <div className="mt-4">
                      <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">数据洞察</h4>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">此图表未生成洞察信息</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 