"use client";

import { BarChartOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, UploadOutlined } from "@ant-design/icons";
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
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

  const [insightMarkdown, setInsightMarkdown] = useState<string | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [visualizationSpec, setVisualizationSpec] = useState<Record<string, any> | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [useAIMode, setUseAIMode] = useState<boolean>(false);
  const [isInsightExpanded, setIsInsightExpanded] = useState<boolean>(true);
  const [isFullscreenInsight, setIsFullscreenInsight] = useState<boolean>(false);
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
                  // 不再处理 data_insights
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
        // 不再处理 insights 数据
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
    // 不再使用 insightsData
    setInsightMarkdown(null); // 清除旧的Markdown洞察数据
    
    try {
      const request = {
        file_id: fileId,
        output_type: "html",
        task_type: "visualization",
        user_prompt: prompt && prompt.trim() ? prompt.trim() : undefined, // 有提示内容时总是发送
        use_llm: useAIMode, // AI智能模式开关
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
      
      // 不再处理 insights 数据，只处理 insight_md
      
      // 处理 insight_md 数据
      if (response.data.insight_md) {
        console.log("收到洞察Markdown数据:", response.data.insight_md);
        setInsightMarkdown(response.data.insight_md);
      } else {
        console.log("未收到洞察Markdown数据");
        setInsightMarkdown(null);
      }
      
                // 处理可视化规格
          if (response.data.spec) {
            console.log("收到新的可视化规格:", response.data.spec);
            console.log("可视化规格类型:", typeof response.data.spec);
            console.log("是否为LLM生成:", response.data.llm_generated);
            
            let chartSpec;
            try {
              // 如果spec是字符串，尝试解析为对象
              if (typeof response.data.spec === 'string') {
                chartSpec = JSON.parse(response.data.spec);
                console.log("解析JSON字符串后的规格:", chartSpec);
              } else if (typeof response.data.spec === 'object' && response.data.spec !== null) {
                chartSpec = response.data.spec;
                console.log("直接使用对象规格:", chartSpec);
              } else {
                throw new Error("无效的规格类型");
              }
              
              // 验证chartSpec是否为有效的ECharts配置
              if (chartSpec && typeof chartSpec === 'object') {
                console.log("原始图表配置:", JSON.stringify(chartSpec, null, 2));
                
                // 只有在非LLM模式下才进行优化
                const finalSpec = response.data.llm_generated ? chartSpec : optimizeChartSpec(chartSpec);
                console.log("最终图表配置:", JSON.stringify(finalSpec, null, 2));
                
                setVisualizationSpec(finalSpec);
                
                // 根据生成模式显示不同的成功消息
                if (response.data.llm_generated) {
                  toast.success("🤖 AI智能分析完成，已生成定制化可视化结果");
                } else {
                  toast.success("数据分析完成，已生成可视化结果");
                }
                
                // 自动切换到可视化标签
                setActiveTab('visualization');
              } else {
                throw new Error("解析后的配置无效");
              }
            } catch (error) {
              console.error("处理可视化规格时出错:", error);
              console.error("原始规格数据:", response.data.spec);
              const errorMessage = error instanceof Error ? error.message : '未知错误';
              toast.error(`处理可视化配置失败: ${errorMessage}`);
              setVisualizationSpec(null);
            }
          } else {
            console.log("API响应中没有spec字段，完整响应:", response.data);
            toast.warning("未能生成可视化结果");
            setVisualizationSpec(null);
          }
    } catch (error) {
      console.error("数据分析失败:", error);
      toast.error("数据分析请求失败，请稍后重试");
      // 确保错误情况下也清除数据
      // 不再使用 insightsData
      setInsightMarkdown(null);
      setVisualizationSpec(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [useAIMode]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };



  // 优化图表配置的函数
  const optimizeChartSpec = (spec: any) => {
    const optimized = { ...spec };
    
    // 如果是散点图且X轴是日期格式的数值
    if (spec.series && spec.series[0] && spec.series[0].type === 'scatter') {
      const seriesData = spec.series[0].data;
      
      if (seriesData && seriesData.length > 0) {
        // 检查是否是日期格式（YYYYMMDD）
        const firstXValue = seriesData[0][0];
        if (typeof firstXValue === 'number' && firstXValue > 20000000) {
          console.log("检测到日期格式的X轴数据，进行优化");
          
          // 转换日期格式并优化坐标轴
          const processedData = seriesData.map((point: any[], index: number) => {
            const dateStr = point[0].toString();
            const year = dateStr.slice(0, 4);
            const month = dateStr.slice(4, 6);
            const day = dateStr.slice(6, 8);
            return [`${year}-${month}-${day}`, point[1]];
          });
          
          // 更新图表配置
          optimized.xAxis = {
            ...spec.xAxis,
            type: 'category',
            name: spec.xAxis.name || 'X轴',
            axisLabel: {
              rotate: 45,
              fontSize: 10
            }
          };
          
          optimized.series[0] = {
            ...spec.series[0],
            data: processedData,
            symbolSize: 8,
            itemStyle: {
              color: '#3b82f6'
            }
          };
          
          // 优化网格布局
          optimized.grid = {
            left: '10%',
            right: '10%',
            bottom: '20%',
            top: '15%',
            containLabel: true
          };
          
          // 添加数据缩放组件
          optimized.dataZoom = [
            {
              type: 'slider',
              show: true,
              xAxisIndex: [0],
              start: 0,
              end: 100
            },
            {
              type: 'inside',
              xAxisIndex: [0],
              start: 0,
              end: 100
            }
          ];
        }
      }
    }
    
    // 优化tooltip
    if (!optimized.tooltip) {
      optimized.tooltip = {};
    }
    optimized.tooltip = {
      ...optimized.tooltip,
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: function(params: any) {
        if (Array.isArray(params) && params.length > 0) {
          const param = params[0];
          return `${param.axisValue}<br/>${param.seriesName}: ${param.value[1]}`;
        }
        return '';
      }
    };
    
    // 优化标题
    if (optimized.title) {
      optimized.title = {
        ...optimized.title,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      };
    }
    
    return optimized;
  };

  return (
    <div className="flex h-full w-full">
      {/* 左侧文件列表 */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col overflow-hidden">
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

        <div className="flex-1 overflow-y-auto">
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
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* 如果没有选中文件，显示欢迎信息 */}
        {!selectedFile ? (
          <div className="flex-1 flex items-center justify-center p-4">
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
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            {/* 文件详情头部 */}
            <div className="mb-4 flex items-center justify-between flex-shrink-0">
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
            <div className="flex-1 overflow-hidden">
            {activeTab === 'preview' ? (
              <div className="h-full p-6 overflow-y-auto">
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
              <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow p-4 overflow-y-auto">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">数据可视化</h3>
                  
                  {/* AI模式开关 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="ai-mode"
                            checked={useAIMode}
                            onChange={(e) => setUseAIMode(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="ai-mode" className="ml-2 text-sm font-medium text-blue-800 dark:text-blue-200">
                            🤖 AI智能模式
                          </label>
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                          ✨ 大模型驱动
                        </span>
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-300">
                        {useAIMode ? "已启用大模型智能分析" : "使用传统分析模式"}
                      </div>
                    </div>
                  </div>

                  {/* 用户提示输入 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {useAIMode ? "🎯 AI分析需求" : "用户提示"}
                    </label>
                    <div className="flex flex-col gap-2">
                      <textarea
                        className={`w-full p-3 min-h-[100px] border rounded-md text-gray-900 dark:text-gray-100 text-base resize-y transition-all ${
                          useAIMode 
                            ? "border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        }`}
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        placeholder={useAIMode 
                          ? "请详细描述您的数据分析需求，AI将根据您的要求生成最合适的图表。例如：'生成时间序列折线图显示航班数量的月度变化趋势，突出显示峰值和低谷，并添加趋势线分析'" 
                          : "描述你想要生成的图表类型和需求，例如：按类别展示销售额的饼图，并分析增长最快的类别"
                        }
                        rows={useAIMode ? 5 : 4}
                        disabled={isAnalyzing}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {useAIMode 
                          ? "💡 AI模式提示：详细的需求描述将帮助大模型生成更精确、更符合您期望的图表配置和样式" 
                          : "提示：尝试指定图表类型、数据关系、分析需求等，描述越具体生成的结果越精确"
                        }
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-300 flex items-center text-sm"
                          onClick={() => {
                            // 生成一个简单的测试图表
                            const testSpec = {
                              title: { text: '测试图表', left: 'center' },
                              tooltip: { trigger: 'axis' },
                              xAxis: { 
                                type: 'category', 
                                data: ['1月', '2月', '3月', '4月', '5月', '6月'] 
                              },
                              yAxis: { type: 'value' },
                              series: [{
                                name: '测试数据',
                                data: [120, 200, 150, 80, 70, 110],
                                type: 'bar',
                                itemStyle: { color: '#3b82f6' }
                              }]
                            };
                            setVisualizationSpec(testSpec);
                            setActiveTab('visualization');
                            toast.success("测试图表已生成");
                          }}
                          disabled={isAnalyzing}
                        >
                          <BarChartOutlined className="h-4 w-4 inline-block mr-1" />
                          测试图表
                        </button>

                        <button
                          className={`px-4 py-2 text-white rounded-md flex items-center font-medium transition-all ${
                            useAIMode 
                              ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-blue-300 disabled:to-purple-300 shadow-md" 
                              : "bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300"
                          }`}
                          onClick={() => handleAnalyzeData(selectedFile.id, userPrompt)}
                          disabled={isAnalyzing || (useAIMode && !userPrompt.trim())}
                        >
                          {isAnalyzing ? (
                            <>
                              <EyeOutlined className="h-5 w-5 inline-block mr-2 animate-spin" />
                              {useAIMode ? "AI分析中..." : "分析中..."}
                            </>
                          ) : (
                            <>
                              {useAIMode ? (
                                <>
                                  <span className="mr-2">🤖</span>
                                  AI智能生成图表
                                </>
                              ) : (
                                <>
                                  <BarChartOutlined className="h-5 w-5 inline-block mr-2" />
                                  生成图表
                                </>
                              )}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* 图表显示区域 */}
                  {visualizationSpec ? (
                    <div className="relative">
                      {/* 生成模式标识 */}
                      <div className="absolute top-2 right-2 z-10">
                        {useAIMode ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border border-blue-200">
                            🤖 AI生成
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            📊 传统模式
                          </span>
                        )}
                      </div>
                      
                      <div className="h-[500px] w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-700">
                        <EChartsWrapper 
                          spec={visualizationSpec as any} 
                          onError={(error) => {
                            console.error("ECharts渲染错误:", error);
                            toast.error(`图表渲染失败: ${error.message}`);
                            // 可以在这里设置一个简单的回退图表
                            setVisualizationSpec({
                              title: { text: '图表渲染失败', left: 'center' },
                              xAxis: { type: 'category', data: ['无数据'] },
                              yAxis: { type: 'value' },
                              series: [{ data: [0], type: 'bar' }]
                            });
                          }}
                          onReady={(chart) => {
                            console.log("ECharts图表实例已创建:", chart);
                          }}
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                    </div>
                  ) : isAnalyzing ? (
                    <div className="h-[500px] w-full border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center bg-white dark:bg-gray-700">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
                        <p className="text-lg">正在分析数据并生成图表...</p>
                        <p className="text-sm">这可能需要几秒钟时间</p>
                      </div>
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
                  {insightMarkdown ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          📊 数据洞察报告
                          {useAIMode && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800">
                              🤖 AI分析
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-2">
                          {insightMarkdown && (
                            <button
                              onClick={() => setIsFullscreenInsight(true)}
                              className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 flex items-center gap-1 transition-colors"
                            >
                              🔍 全屏查看
                            </button>
                          )}
                          <button
                            onClick={() => setIsInsightExpanded(!isInsightExpanded)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                          >
                            {isInsightExpanded ? "收起" : "展开"}
                            <span className={`transform transition-transform ${isInsightExpanded ? "rotate-180" : ""}`}>
                              ▼
                            </span>
                          </button>
                        </div>
                      </div>
                      
                      {isInsightExpanded && (
                        <>
                          {/* 显示 Markdown 洞察内容 */}
                          {insightMarkdown ? (
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                              {/* 添加内容长度指示 */}
                              <div className="px-6 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                  <span>📄 数据分析报告</span>
                                  <span>{insightMarkdown.length} 字符 · 预计阅读时间 {Math.ceil(insightMarkdown.length / 500)} 分钟</span>
                                </div>
                              </div>
                              
                              <div className="p-6">
                                {/* 可滚动的内容区域 */}
                                <div className="max-h-[600px] overflow-y-auto overflow-x-hidden">
                                  <div className="prose prose-sm max-w-none dark:prose-invert
                                    prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                                    prose-p:text-gray-700 dark:prose-p:text-gray-300
                                    prose-strong:text-gray-900 dark:prose-strong:text-gray-100
                                    prose-ul:text-gray-700 dark:prose-ul:text-gray-300
                                    prose-ol:text-gray-700 dark:prose-ol:text-gray-300
                                    prose-li:text-gray-700 dark:prose-li:text-gray-300
                                    prose-code:text-blue-600 dark:prose-code:text-blue-400
                                    prose-code:bg-gray-100 dark:prose-code:bg-gray-800
                                    prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                                    prose-h1:text-xl prose-h1:font-bold prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-2
                                    prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-6
                                    prose-h3:text-base prose-h3:font-medium prose-h3:mt-4
                                    prose-h1:mb-4 prose-h2:mb-3 prose-h3:mb-2
                                    prose-p:mb-3 prose-p:leading-relaxed
                                    prose-ul:mb-4 prose-ol:mb-4
                                    prose-li:mb-1
                                    prose-table:text-sm prose-table:border-collapse prose-table:my-4
                                    prose-th:border prose-th:border-gray-300 prose-th:px-3 prose-th:py-2 prose-th:bg-gray-50 prose-th:font-semibold
                                    prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-2
                                    prose-blockquote:border-l-4 prose-blockquote:border-blue-400 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-4">
                                    <ReactMarkdown>
                                      {insightMarkdown}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                                
                                {/* 如果内容很长，显示滚动提示 */}
                                {insightMarkdown.length > 2000 && (
                                  <div className="mt-4 text-center">
                                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                      💡 内容较长，可以滚动查看完整报告
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : null}
                          

                        </>
                      )}
                      
                      {/* 折叠状态下的简要预览 */}
                      {!isInsightExpanded && insightMarkdown && (
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
{`📊 包含详细的数据分析报告 (${Math.ceil(insightMarkdown.length / 100)} 段内容)`}
                          </p>
                        </div>
                      )}
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
            </div>
          </div>
        )}
      </div>
      
      {/* 全屏洞察查看模态框 */}
      {isFullscreenInsight && insightMarkdown && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full h-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* 模态框头部 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">📊 完整数据洞察报告</h2>
                {useAIMode && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800">
                    🤖 AI分析
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {insightMarkdown.length} 字符 · {Math.ceil(insightMarkdown.length / 500)} 分钟阅读
                </div>
                <button
                  onClick={() => setIsFullscreenInsight(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <span className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</span>
                </button>
              </div>
            </div>
            
            {/* 模态框内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-base max-w-none dark:prose-invert
                prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                prose-p:text-gray-700 dark:prose-p:text-gray-300
                prose-strong:text-gray-900 dark:prose-strong:text-gray-100
                prose-ul:text-gray-700 dark:prose-ul:text-gray-300
                prose-ol:text-gray-700 dark:prose-ol:text-gray-300
                prose-li:text-gray-700 dark:prose-li:text-gray-300
                prose-code:text-blue-600 dark:prose-code:text-blue-400
                prose-code:bg-gray-100 dark:prose-code:bg-gray-800
                prose-code:px-2 prose-code:py-1 prose-code:rounded
                prose-h1:text-2xl prose-h1:font-bold prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-3
                prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8
                prose-h3:text-lg prose-h3:font-medium prose-h3:mt-6
                prose-h1:mb-6 prose-h2:mb-4 prose-h3:mb-3
                prose-p:mb-4 prose-p:leading-relaxed prose-p:text-base
                prose-ul:mb-6 prose-ol:mb-6
                prose-li:mb-2
                prose-table:text-base prose-table:border-collapse prose-table:my-6
                prose-th:border prose-th:border-gray-300 prose-th:px-4 prose-th:py-3 prose-th:bg-gray-50 prose-th:font-semibold
                prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-3
                prose-blockquote:border-l-4 prose-blockquote:border-blue-400 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:my-6">
                <ReactMarkdown>
                  {insightMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 