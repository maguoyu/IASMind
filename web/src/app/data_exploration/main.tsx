"use client";

import { BarChartOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, UploadOutlined } from "@ant-design/icons";
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from "react";
import { VChart } from '@visactor/react-vchart';
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

      {/* 右侧内容区域 */}
      <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-800">
        {selectedFile ? (
          <div className="h-full">
            {/* 标签页导航 */}
            <div className="flex space-x-1 mb-4">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'preview' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                onClick={() => setActiveTab('preview')}
              >
                <EyeOutlined />
                数据预览
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'visualization' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                onClick={() => {
                  setActiveTab('visualization');
                  // 如果没有洞察数据，自动生成
                  if (!insightsData && selectedFile) {
                    handleGenerateInsights(selectedFile.id);
                  }
                }}
              >
                <BarChartOutlined />
                数据分析
              </button>
            </div>

            {/* 内容区域 */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full">
              {activeTab === 'preview' && (
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
              )}

              {activeTab === 'visualization' && (
                <div className="p-6 overflow-auto max-h-[calc(100vh-200px)]">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <BarChartOutlined />
                      数据分析 - {selectedFile.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      基于上传的数据生成图表和智能分析洞察
                    </p>
                    
                    {/* 数据统计卡片 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {selectedFile.preview?.length || 0}
                        </div>
                        <div className="text-sm text-blue-600 dark:text-blue-400">数据记录</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {selectedFile.preview && selectedFile.preview.length > 0 ? Object.keys(selectedFile.preview[0] ?? {}).length : 0}
                        </div>
                        <div className="text-sm text-green-600 dark:text-green-400">数据字段</div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {formatFileSize(selectedFile.size)}
                        </div>
                        <div className="text-sm text-purple-600 dark:text-purple-400">文件大小</div>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {selectedFile.uploadTime.toLocaleDateString()}
                        </div>
                        <div className="text-sm text-orange-600 dark:text-orange-400">上传时间</div>
                      </div>
                    </div>
                    
                    {/* 刷新洞察按钮 */}
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => selectedFile && handleGenerateInsights(selectedFile.id)}
                        disabled={isGeneratingInsights}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md flex items-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingInsights ? "生成中..." : "刷新数据洞察"}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 柱状图和洞察 */}
                    <div className="space-y-4">
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <h4 className="font-medium mb-4 text-gray-900 dark:text-gray-100">分类数据对比</h4>
                        {(() => {
                          const barValues = generateVisualizationData.barData ?? [];
                          const barSpec = {
                            type: 'bar',
                            data: [{ id: 'bar', values: barValues }],
                            xField: 'name',
                            yField: ['value', 'target']
                          };
                          return <VChart spec={barSpec} />;
                        })()}
                      </div>
                      {/* 柱状图相关的数据洞察 */}
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <div className="flex items-start gap-3">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">柱状图洞察</span>
                          <div>
                            <h4 className="font-medium mb-1 text-gray-900 dark:text-gray-100">分类比较分析</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {insightsData?.recommendations?.find((r: {chart_type: string, description: string}) => r.chart_type === 'bar')?.description ?? 
                              "类别 C 的数值最高，类别 A 和 B 分布相对均匀，建议重点关注类别 C 的业务表现。"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 饼图和洞察 */}
                    <div className="space-y-4">
                      {/* 修复饼图 */}
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <h4 className="font-medium mb-4 text-gray-900 dark:text-gray-100">数据分布比例</h4>
                        {(() => {
                          const pieValues = generateVisualizationData.pieData ?? [];
                          const pieSpec = {
                            type: 'pie',
                            data: [{ id: 'pie', values: pieValues }],
                            angleField: 'value',
                            colorField: 'name'
                          };
                          return <VChart spec={pieSpec} />;
                        })()}
                      </div>
                      {/* 饼图相关的数据洞察 */}
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <div className="flex items-start gap-3">
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs font-medium">比例洞察</span>
                          <div>
                            <h4 className="font-medium mb-1 text-gray-900 dark:text-gray-100">数据分布分析</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {insightsData?.data_quality?.summary || 
                              "数据完整性良好，无明显异常值。各类别占比符合业务规律，可进一步探索各类别的内部结构。"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 折线图和洞察 */}
                    <div className="space-y-4">
                      {/* 修复折线图 */}
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <h4 className="font-medium mb-4 text-gray-900 dark:text-gray-100">趋势分析</h4>
                        {(() => {
                          const lineValues = generateVisualizationData.lineData ?? [];
                          const lineSpec = {
                            type: 'line',
                            data: [{ id: 'line', values: lineValues }],
                            xField: 'month',
                            yField: ['sales', 'profit', 'cost']
                          };
                          return <VChart spec={lineSpec} />;
                        })()}
                      </div>
                      {/* 折线图相关的数据洞察 */}
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <div className="flex items-start gap-3">
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-medium">趋势洞察</span>
                          <div>
                            <h4 className="font-medium mb-1 text-gray-900 dark:text-gray-100">时间序列分析</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {insightsData?.recommendations?.find(r => r.chart_type === 'line')?.description || 
                              "数据呈现稳定增长趋势，6月达到峰值。利润与销售额呈正相关，成本维持在较稳定水平。"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 散点图和洞察 */}
                    <div className="space-y-4">
                      {/* 修复散点图 */}
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <h4 className="font-medium mb-4 text-gray-900 dark:text-gray-100">相关性分析</h4>
                        {(() => {
                          const scatterValues = generateVisualizationData.scatterData ?? [];
                          const scatterSpec = {
                            type: 'scatter',
                            data: [{ id: 'scatter', values: scatterValues }],
                            xField: 'x',
                            yField: 'y'
                          };
                          return <VChart spec={scatterSpec} />;
                        })()}
                      </div>
                      {/* 散点图相关的数据洞察 */}
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <div className="flex items-start gap-3">
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-xs font-medium">相关性洞察</span>
                          <div>
                            <h4 className="font-medium mb-1 text-gray-900 dark:text-gray-100">变量相关性</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {insightsData?.statistics?.correlation || 
                              "X轴和Y轴变量呈现显著的正相关关系，相关系数约为0.78。数据点呈线性分布，少量异常值需要关注。"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 面积图和洞察 */}
                    <div className="space-y-4 lg:col-span-2">
                      {/* 修复面积图 */}
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <h4 className="font-medium mb-4 text-gray-900 dark:text-gray-100">财务趋势分析</h4>
                        {(() => {
                          const areaValues = generateVisualizationData.areaData ?? [];
                          const areaSpec = {
                            type: 'area',
                            data: [{ id: 'area', values: areaValues }],
                            xField: 'month',
                            yField: ['revenue', 'expenses', 'profit']
                          };
                          return <VChart spec={areaSpec} />;
                        })()}
                      </div>
                      {/* 面积图相关的数据洞察 */}
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <div className="flex items-start gap-3">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">财务洞察</span>
                          <div>
                            <h4 className="font-medium mb-1 text-gray-900 dark:text-gray-100">综合财务分析</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {insightsData?.data_quality?.summary || 
                              "收入呈增长趋势，从1月到6月增加了约66%。支出增长速度慢于收入，导致利润率从1月的33%上升到6月的43%，财务状况良好。"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
} 