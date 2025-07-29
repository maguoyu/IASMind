// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, BarChart3, TrendingUp, Users, DollarSign, PieChart, LineChart, Activity, FileText, File, Plane, Fuel, CalendarClock, X } from "lucide-react";
import { VChart } from '@visactor/react-vchart';
import { toast } from "sonner"; // 修正toast导入

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { InputBox } from "./components/input-box";
import { Checkbox } from "~/components/ui/checkbox";
import type { UploadedFile } from "./components/input-box";
import { VmindAPI } from "~/core/api/vmind"; // 导入VmindAPI
import { dataSourceApi, type DataSource as SystemDataSource } from "~/core/api/datasource"; // 导入数据源API

// 消息类型定义
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  charts?: ChartData[];
  insights?: string[];
  files?: UploadedFile[];
}

interface ChartData {
  type: 'bar' | 'pie' | 'line' | 'area' | 'custom';
  title: string;
  data: any[];
  config?: any;
}

// 本地数据源定义（用于UI显示）
interface LocalDataSource {
  id: string;
  name: string;
  description: string;
  tables: number;
  lastUpdated: Date;
  status: 'connected' | 'disconnected' | 'syncing';
  type: 'system' | 'temporary'; // 区分系统数据源和临时文件
}

// 临时文件数据源（保留原有功能）
const temporaryFileDataSource: LocalDataSource = {
  id: 'uploaded_file',
  name: '临时文件',
  description: '上传的CSV、Excel等文件进行临时分析',
  tables: 0,
  lastUpdated: new Date(),
  status: 'connected',
  type: 'temporary'
};

// 航空相关快速问题
const quickQuestions = [
  "过去30天的航油消耗趋势如何？",
  "哪些航线的航油效率最高？",
  "不同机型的航油成本对比",
  "各机场起降架次分布"
];

// 模拟图表数据生成器 - 航空数据
const generateMockChart = (question: string): ChartData[] => {
  if (question.includes('趋势') || question.includes('消耗')) {
    return [{
      type: 'line',
      title: '航油消耗趋势分析',
      data: [
        { month: '10月', consumption: 98500, flights: 3200 },
        { month: '11月', consumption: 105000, flights: 3350 },
        { month: '12月', consumption: 115000, flights: 3700 },
        { month: '1月', consumption: 108000, flights: 3500 }
      ]
    }];
  }
  
  if (question.includes('航线') || question.includes('效率')) {
    return [{
      type: 'bar',
      title: '主要航线航油效率对比',
      data: [
        { route: '北京-上海', efficiency: 0.92, flights: 420 },
        { route: '北京-广州', efficiency: 0.87, flights: 350 },
        { route: '上海-深圳', efficiency: 0.90, flights: 380 },
        { route: '广州-成都', efficiency: 0.85, flights: 290 },
        { route: '成都-西安', efficiency: 0.93, flights: 240 }
      ]
    }];
  }
  
  if (question.includes('机场') || question.includes('架次')) {
    return [{
      type: 'pie',
      title: '各机场起降架次分布',
      data: [
        { name: '首都国际机场', value: 8500, color: '#8884d8' },
        { name: '浦东国际机场', value: 7800, color: '#82ca9d' },
        { name: '白云国际机场', value: 6900, color: '#ffc658' },
        { name: '双流国际机场', value: 4200, color: '#ff7300' },
        { name: '咸阳国际机场', value: 3600, color: '#8dd1e1' }
      ]
    }];
  }
  
  if (question.includes('成本') || question.includes('机型')) {
    return [{
      type: 'area',
      title: '不同机型航油成本趋势',
      data: [
        { month: '9月', A320: 28500, B737: 29600, B777: 68000 },
        { month: '10月', A320: 29400, B737: 30200, B777: 69500 },
        { month: '11月', A320: 30100, B737: 31000, B777: 71200 },
        { month: '12月', A320: 31000, B737: 32400, B777: 73500 },
        { month: '1月', A320: 29800, B737: 31500, B777: 70800 }
      ]
    }];
  }
  
  // 默认不返回任何图表
  return [];
};

export function ChartsMain() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState('uploaded_file'); // 默认选择临时文件
  const [isLoading, setIsLoading] = useState(false);
  const [isDataSourceDisabled, setIsDataSourceDisabled] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showUploadButton, setShowUploadButton] = useState(true); // 默认显示上传按钮 
  const [enableInsights, setEnableInsights] = useState(false);
  
  // 系统数据源状态
  const [systemDataSources, setSystemDataSources] = useState<LocalDataSource[]>([]);
  const [dataSourcesLoading, setDataSourcesLoading] = useState(false);
  
  // 表选择相关状态
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tablesList, setTablesList] = useState<string[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  
  // 文件工作表选择相关状态（用于Excel等多工作表文件）


  // 合并所有数据源（系统数据源 + 临时文件）
  const allDataSources = useMemo(() => {
    return [...systemDataSources, temporaryFileDataSource];
  }, [systemDataSources]);

  const currentDataSource = useMemo(() => 
    allDataSources.find(ds => ds.id === selectedDataSource) || temporaryFileDataSource,
    [selectedDataSource, allDataSources]
  );

  // 获取系统数据源
  const fetchSystemDataSources = useCallback(async () => {
    try {
      setDataSourcesLoading(true);
      const sources = await dataSourceApi.getAll();
      
             // 转换为本地数据源格式
       const localSources: LocalDataSource[] = sources.map(source => ({
         id: source.id,
         name: source.name,
         description: source.description || `${source.type.toUpperCase()} 数据库连接`,
         tables: 0, // 可以后续通过API获取表数量
         lastUpdated: new Date(source.updated_at),
         status: source.status === 'active' ? 'connected' : 
                 source.status === 'error' ? 'disconnected' : 'syncing',
         type: 'system'
       }));
      
      setSystemDataSources(localSources);
    } catch (error) {
      console.error('获取数据源失败:', error);
      toast.error('获取数据源失败，请检查网络连接');
         } finally {
       setDataSourcesLoading(false);
     }
   }, []);

  // 初始化时获取系统数据源
  useEffect(() => {
    fetchSystemDataSources();
  }, [fetchSystemDataSources]);

  // 获取数据源中的表列表
  const fetchTables = useCallback(async (dataSourceId: string) => {
    try {
      setTablesLoading(true);
      setTablesList([]);
      setSelectedTable('');
      
      const response = await dataSourceApi.getTables(dataSourceId);
      if (response.success && response.tables) {
        setTablesList(response.tables);
        toast.success(`成功获取到 ${response.tables.length} 个数据表`);
      } else {
        toast.error(response.message || '获取表列表失败');
        setTablesList([]);
      }
    } catch (error) {
      console.error('获取表列表失败:', error);
      toast.error('获取表列表失败，请检查数据源连接');
      setTablesList([]);
    } finally {
      setTablesLoading(false);
    }
  }, []);



  // 处理数据源变更
  const handleDataSourceChange = useCallback((value: string) => {
    setSelectedDataSource(value);
    
    // 如果选择了上传临时文件，显示上传按钮
    if (value === 'uploaded_file') {
      setShowUploadButton(true);
      // 清空表选择状态
      setTablesList([]);
      setSelectedTable('');
      
      // 如果选择了上传临时文件，但没有上传文件，显示提示
      if (!uploadedFiles || uploadedFiles.length === 0) {
        toast.info('请选择文件进行分析');
      }
    } else {
      // 如果选择了其他数据源，清理已上传的文件，隐藏上传按钮
      setUploadedFiles([]);
      setShowUploadButton(false);
      
      // 如果是系统数据源，获取表列表
      const isSystemDataSource = systemDataSources.some(ds => ds.id === value);
      if (isSystemDataSource) {
        fetchTables(value);
      }
    }
  }, [uploadedFiles, systemDataSources, fetchTables]);
  
  // 处理文件上传
  const handleFileUpload = useCallback((files: UploadedFile[]) => {
    setUploadedFiles(files);
    if (files.length > 0 && files[0]?.name) {
      toast.success(`已选择文件: ${files[0].name}`);
      // 有文件时锁定为临时文件数据源
      setSelectedDataSource('uploaded_file');
    }
  }, []);

  // 重置文件上传
  const resetFileUpload = useCallback(() => {
    setUploadedFiles([]);
    toast.info('已清除选择的文件');
  }, []);

  const handleSendMessage = useCallback(async (
    question: string, 
    options?: { 
      interruptFeedback?: string; 
      resources?: Array<any>;
      files?: Array<UploadedFile>;
    }
  ) => {
    if (!question.trim() && (!uploadedFiles || uploadedFiles.length === 0)) return;
    
    // 检查是否选择了临时文件数据源但没上传文件
    if (selectedDataSource === 'uploaded_file' && (!uploadedFiles || uploadedFiles.length === 0)) {
      toast.error('请先选择文件再进行分析');
      return;
    }
    

    
    // 检查是否选择了系统数据源但没选择表
    const isSystemDataSource = systemDataSources.some(ds => ds.id === selectedDataSource);
    if (isSystemDataSource && !selectedTable) {
      toast.error('请先选择要分析的数据表');
      return;
    }
    
    // 构建用户消息内容
    let userMessageContent = question;
    if (isSystemDataSource && selectedTable) {
      const dataSourceName = systemDataSources.find(ds => ds.id === selectedDataSource)?.name || '数据源';
      userMessageContent += `\n\n📊 数据源: ${dataSourceName}\n📋 数据表: ${selectedTable}`;
    } else if (selectedDataSource === 'uploaded_file' && uploadedFiles.length > 0 && uploadedFiles[0]) {
      userMessageContent += `\n\n📁 文件: ${uploadedFiles[0].name}`;

    }
    
    // 使用本地状态中的文件
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: userMessageContent,
      timestamp: new Date(),
      files: uploadedFiles
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // 如果有上传的文件，调用API
      if (uploadedFiles && uploadedFiles.length > 0) {
        // 首次上传文件分析
        const file = uploadedFiles[0];
        
        // 文件检查
        if (!file) {
          throw new Error("无效的文件对象");
        }
        
        // 创建FormData
        const formData = new FormData();
        // 从base64或内容创建文件对象
        let fileObj: Blob | null = null;
        
        try {
          console.log("处理文件:", file.name, "类型:", file.type);
          
          if (file.content) {
            // 检查内容是否为base64
            if (typeof file.content === 'string' && file.content.startsWith('data:')) {
              // 处理base64格式
              console.log("处理为base64格式文件");
              try {
                // 尝试提取base64部分
                const base64Match = file.content.match(/;base64,(.+)$/);
                if (base64Match && base64Match[1]) {
                  const byteString = atob(base64Match[1]);
                  const ab = new ArrayBuffer(byteString.length);
                  const ia = new Uint8Array(ab);
                  
                  for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                  }
                  
                  fileObj = new Blob([ab], { type: file.type || 'application/octet-stream' });
                } else {
                  // 如果没有base64部分，当作文本处理
                  fileObj = new Blob([file.content], { type: file.type || 'text/plain' });
                }
              } catch (error) {
                console.error("base64解析错误:", error);
                fileObj = new Blob([file.content], { type: file.type || 'text/plain' });
              }
            } else {
              // 文本内容
              console.log("处理为文本文件");
              fileObj = new Blob([file.content], { type: file.type || 'text/plain' });
            }
          } else {
            throw new Error("文件内容为空");
          }
          
          // 检查文件对象是否创建成功
          if (!fileObj || !(fileObj instanceof Blob)) {
            throw new Error("文件对象创建失败");
          }
          
          // 添加文件和其他参数到FormData
          formData.append('file', fileObj, file.name);
          formData.append('file_name', 'chart_' + Date.now());
          formData.append('output_type', 'html');
          formData.append('task_type', 'visualization');
          
          // 只有当用户输入了内容时，才添加user_prompt参数
          if (question && question.trim()) {
            formData.append('user_prompt', question);
          }
          
          // 添加是否需要数据洞察的参数
          formData.append('enable_insights', enableInsights.toString());
          
          formData.append('language', 'zh');
          
          // 调用API
          console.log("调用API开始");
          const response = await VmindAPI.generateChartWithFile(formData);
          console.log("API响应:", response);
          
          if (response && response.data) {
            // 创建助手消息
            let responseContent = `基于选择的 ${file.name} 文件分析：\n`;
            
            // 如果是Excel文件，添加特定提示
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
              responseContent += `\n检测到航班Excel数据，正在分析航班计划和航油消耗情况。`;
            } else if (file.name.endsWith('.csv')) {
              responseContent += `\n检测到CSV格式数据，正在提取航空数据指标。`;
            }
            
            // 添加响应内容
            if (response.data.insight_md) {
              responseContent += `\n${response.data.insight_md}`;
            }
            
            // 提取图表和洞察
            let chartData: ChartData[] = [];
            
            // 如果有spec，创建图表
            if (response.data.spec && typeof response.data.spec === 'object') {
              try {
                // 尝试将spec转换为图表数据
                chartData = [{
                  type: 'custom',
                  title: '数据分析结果',
                  data: [],
                  config: response.data.spec
                }];
              } catch (e) {
                console.error('解析spec失败', e);
              }
            }
            
            // 提取洞察
            let insights: string[] = [];
            if (enableInsights) {
              if (response.data.insights && Array.isArray(response.data.insights)) {
                insights = response.data.insights.map(insight => 
                  insight.textContent?.plainText || insight.name
                );
              } else if (response.data.insight_md) {
                insights = response.data.insight_md
                  .split('\n')
                  .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
                  .map(line => line.replace(/^[-*]\s+/, '').trim());
              }
            }
            
            const assistantMessage: ChatMessage = {
              id: `assistant-${Date.now()}`,
              type: 'assistant',
              content: responseContent,
              timestamp: new Date(),
              charts: chartData,
              insights: insights.length > 0 ? insights : undefined
            };
            
            setMessages(prev => [...prev, assistantMessage]);
          } else {
            throw new Error("API返回结果为空");
          }
        } catch (error) {
          console.error("处理文件错误:", error);
          throw error;
        }
      } else {
        // 没有文件，使用模拟API响应
        // 模拟 API 延迟
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let responseContent = `基于 ${currentDataSource?.name} 的分析结果：`;
        const hasFiles = uploadedFiles && uploadedFiles.length > 0;
        
        if (hasFiles) {
          responseContent += `\n已分析您上传的 ${uploadedFiles!.length} 个文件`;
          
          // 检查文件类型并调整响应
          const fileTypes = uploadedFiles!.map(f => f.type);
          if (fileTypes.some(t => t.includes('csv') || t.endsWith('csv'))) {
            responseContent += "，检测到CSV格式数据";
          }
          if (fileTypes.some(t => t.includes('json'))) {
            responseContent += "，检测到JSON格式数据";
          }
          if (fileTypes.some(t => t.includes('excel') || t.includes('xls'))) {
            responseContent += "，检测到Excel表格数据";
          }
        }

        // 基于数据源类型生成不同的响应
        let charts: ChartData[] = [];
        let insights: string[] = [];
        
        if (currentDataSource.type === 'system') {
          // 系统数据源的响应
          responseContent += `\n正在从 ${currentDataSource.name} 的 ${selectedTable} 表查询相关数据...`;
          charts = generateMockChart(question);
          
          if (enableInsights) {
            insights = [
              `基于 ${currentDataSource.name}.${selectedTable} 的数据分析结果`,
              "数据连接状态良好，查询性能正常",
              `当前分析表 ${selectedTable} 包含丰富的业务数据`,
              "建议定期更新数据源以获得最新分析结果"
            ];
          }
        } else {
          // 临时文件的响应
          charts = generateMockChart(question);
          
          if (enableInsights) {
            insights = [
              "文件数据已成功解析和分析",
              "数据质量良好，适合进一步分析",
              "建议保存分析结果或将数据添加到系统数据源"
            ];
          }
        }
        
        // 如果有文件时的特殊洞察处理
        if (hasFiles && enableInsights && currentDataSource.type === 'temporary') {
          insights = [
            "上传数据显示航油销售量在近30天内呈上升趋势，增幅达到32.7%",
            "周末期间（尤其是12月24-26日）航油销量明显下降，建议调整库存策略",
            "元旦假期后航油需求快速回升，日均增长率为2.1%",
            "预计下月销量将突破21000吨，需提前做好供应链准备",
            "数据显示最佳加油量应控制在85-90%油箱容量"
          ];
        }

        // 如果有文件，替换为航油销售量的图表
        if (hasFiles) {
          // 替换为航油销售量的图表
          charts.unshift({
            type: 'line',
            title: '最近30天航油销售量分析',
            data: [
              { date: '12-20', volume: 15600, revenue: 156000 },
              { date: '12-21', volume: 14800, revenue: 148000 },
              { date: '12-22', volume: 16200, revenue: 162000 },
              { date: '12-23', volume: 15900, revenue: 159000 },
              { date: '12-24', volume: 14500, revenue: 145000 },
              { date: '12-25', volume: 13200, revenue: 132000 },
              { date: '12-26', volume: 14100, revenue: 141000 },
              { date: '12-27', volume: 15300, revenue: 153000 },
              { date: '12-28', volume: 16500, revenue: 165000 },
              { date: '12-29', volume: 17200, revenue: 172000 },
              { date: '12-30', volume: 17500, revenue: 175000 },
              { date: '12-31', volume: 18100, revenue: 181000 },
              { date: '01-01', volume: 15800, revenue: 158000 },
              { date: '01-02', volume: 16300, revenue: 163000 },
              { date: '01-03', volume: 16700, revenue: 167000 },
              { date: '01-04', volume: 17100, revenue: 171000 },
              { date: '01-05', volume: 17400, revenue: 174000 },
              { date: '01-06', volume: 16900, revenue: 169000 },
              { date: '01-07', volume: 16500, revenue: 165000 },
              { date: '01-08', volume: 17300, revenue: 173000 },
              { date: '01-09', volume: 17800, revenue: 178000 },
              { date: '01-10', volume: 18200, revenue: 182000 },
              { date: '01-11', volume: 18500, revenue: 185000 },
              { date: '01-12', volume: 18900, revenue: 189000 },
              { date: '01-13', volume: 19200, revenue: 192000 },
              { date: '01-14', volume: 19500, revenue: 195000 },
              { date: '01-15', volume: 19800, revenue: 198000 },
              { date: '01-16', volume: 20100, revenue: 201000 },
              { date: '01-17', volume: 20400, revenue: 204000 },
              { date: '01-18', volume: 20700, revenue: 207000 },
            ]
          });
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: responseContent,
          timestamp: new Date(),
          charts,
          insights: insights.length > 0 ? insights : undefined
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('处理消息错误:', error);
      toast.error(`处理消息时出错: ${error instanceof Error ? error.message : String(error)}`);
      
      // 添加错误消息
      const errorMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        type: 'assistant',
        content: `抱歉，处理您的请求时出现问题。${error instanceof Error ? error.message : '请稍后重试。'}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDataSource, uploadedFiles, enableInsights]);



  const handleQuickQuestion = useCallback((question: string) => {
    handleSendMessage(question);
  }, [handleSendMessage]);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);
  
  const renderChart = (chart: ChartData) => {
    const chartHeight = 500; // 增加图表高度以提升显示效果
    
    switch (chart.type) {
      case 'bar':
        return (
          <div style={{ width: '100%', height: chartHeight, minWidth: '600px' }} className="w-full min-h-[500px]">
            <VChart 
              spec={{
                type: 'bar',
                data: [{ id: 'barData', values: chart.data }],
                xField: chart.data[0]?.route ? 'route' : (chart.data[0]?.category ? 'category' : 'name'),
                yField: chart.data[0]?.efficiency ? 'efficiency' : (chart.data[0]?.sales ? 'sales' : 'value'),
                padding: { top: 20, right: 40, bottom: 60, left: 80 }
              }} 
            />
          </div>
        );
      
            case 'pie':
        return (
          <div style={{ width: '100%', height: chartHeight, minWidth: '600px' }} className="w-full min-h-[500px]">
            <VChart 
              spec={{
                type: 'pie',
                data: [{ id: 'pieData', values: chart.data }],
                angleField: 'value',
                categoryField: 'name',
                padding: { top: 40, right: 80, bottom: 60, left: 80 }
              }}
            />
          </div>
        );
      
            case 'line':
        return (
          <div style={{ width: '100%', height: chartHeight, minWidth: '600px' }} className="w-full min-h-[500px]">
            <VChart 
              spec={{
                type: 'line',
                data: [{ id: 'lineData', values: chart.data }],
                xField: chart.data[0]?.month ? 'month' : (chart.data[0]?.date ? 'date' : 'x'),
                yField: chart.data[0]?.consumption ? 'consumption' : (chart.data[0]?.volume ? 'volume' : 'sales'),
                padding: { top: 20, right: 40, bottom: 60, left: 80 }
              }}
            />
          </div>
        );
      
            case 'area':
        return (
          <div style={{ width: '100%', height: chartHeight, minWidth: '600px' }} className="w-full min-h-[500px]">
            <VChart 
              spec={{
                type: 'area',
                data: [{ id: 'areaData', values: chart.data }],
                xField: 'month',
                yField: chart.data[0]?.A320 ? ['A320', 'B737', 'B777'] : 'revenue',
                padding: { top: 60, right: 40, bottom: 60, left: 80 }
              }}
            />
          </div>
        );
      
      case 'custom':
        return (
          <div style={{ width: '100%', height: chartHeight, minWidth: '600px' }} className="w-full min-h-[500px]">
            <VChart spec={chart.config} />
          </div>
        );
      
      default:
        return <div>暂不支持此图表类型</div>;
    }
  };

    return (
    <div className={cn("flex h-full w-full")}>
      <div className={cn("max-w-7xl mx-auto w-full flex flex-col h-full")}>
        {/* 数据源选择区域 - 固定在顶部 */}
        <motion.div 
          className="sticky top-20 z-40 mb-4 p-4 bg-card rounded-lg border backdrop-blur-sm bg-card/95 shadow-sm"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">数据源:</span>
            </div>
            <Select 
              value={selectedDataSource} 
              onValueChange={handleDataSourceChange}
              disabled={isDataSourceDisabled}
            >
              <SelectTrigger className={`w-48 ${isDataSourceDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* 临时文件选项 */}
                <SelectItem value="uploaded_file">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <File className="w-3 h-3" />
                    临时文件分析
                  </div>
                </SelectItem>
                
                {/* 系统数据源 */}
                {systemDataSources.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b">
                      系统数据源
                    </div>
                    {systemDataSources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            source.status === 'connected' ? 'bg-green-500' : 
                            source.status === 'syncing' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <Database className="w-3 h-3" />
                                                     <div className="flex flex-col">
                             <span>{source.name}</span>
                             <span className="text-xs text-muted-foreground truncate max-w-48">
                               {source.description}
                             </span>
                           </div>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                
                {/* 加载状态 */}
                {dataSourcesLoading && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    正在加载数据源...
                  </div>
                )}
                
                {/* 无数据源时的提示 */}
                {!dataSourcesLoading && systemDataSources.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    暂无系统数据源，请前往设置页面添加
                  </div>
                )}
              </SelectContent>
            </Select>
            {/* 数据源信息显示 */}
            {currentDataSource && currentDataSource.type === 'system' && (
              <div className="text-sm text-muted-foreground">
                <span className="capitalize">{currentDataSource.status === 'connected' ? '已连接' : '未连接'}</span>
                {currentDataSource.tables > 0 && ` • ${currentDataSource.tables} 个表`}
                {' • '}{currentDataSource.lastUpdated.toLocaleDateString()}
              </div>
            )}
            
      

            
            {/* 新增数据洞察选项 */}
            <div className="flex items-center space-x-2 ml-auto">
              <Checkbox 
                id="enable-insights"
                checked={enableInsights}
                onCheckedChange={(checked) => setEnableInsights(checked === true)}
              />
              <label
                htmlFor="enable-insights"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                启用数据洞察
              </label>
            </div>
          </div>
        </motion.div>

        {/* 消息列表区域 */}
        <div className="flex flex-grow flex-col px-4">
          <div className="flex-grow overflow-y-auto space-y-4 mb-6 pt-4">
            {messages.map((message) => (
              <motion.div 
                key={message.id} 
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {message.type === 'assistant' && (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                
                <div className={`${message.type === 'user' ? 'max-w-lg order-first' : 'w-full max-w-none'}`}>
                  <div className={`p-3 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground ml-auto' 
                      : 'bg-card border'
                  }`}>
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                    <p className={`text-xs mt-1 opacity-70`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  
            

                  {/* 图表展示 */}
                  {message.charts && message.charts.length > 0 && (
                    <div className="mt-3 space-y-4">
                      {message.charts.map((chart, index) => (
                        <Card key={index} className="w-full">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold">{chart.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="w-full">
                              {renderChart(chart)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* 洞察信息 */}
                  {message.insights && message.insights.length > 0 && (
                    <Card className="mt-3">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          智能洞察
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {message.insights.map((insight, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Badge variant="outline" className="text-xs mt-0.5">
                                {index + 1}
                              </Badge>
                              <span className="text-sm text-muted-foreground">{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground text-sm font-medium shrink-0">
                    U
                  </div>
                )}
              </motion.div>
            ))}

            {/* 加载状态 */}
            {isLoading && (
              <motion.div 
                className="flex gap-3 justify-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Activity className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-card border p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <span className="text-sm text-muted-foreground ml-2">正在分析数据...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* 快速问题 / 输入区域 */}
          <div className="relative flex shrink-0 pb-4 pt-2 flex-col">
            {!isLoading && messages.length === 0 && (
              <motion.div
                className="w-full mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {/* 欢迎界面 */}
                <motion.div
                  className="flex flex-col items-center mb-8"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="mb-2 text-center text-3xl font-medium">
                    ✈️ 欢迎使用航空数据分析
                  </h3>
                  <div className="text-muted-foreground px-4 text-center text-lg">
                    使用自然语言查询航班和航油数据，获得即时的可视化分析结果
                  </div>
                </motion.div>

                {/* 快速问题 */}
                <ul className="flex flex-wrap">
                  {quickQuestions.map((question, index) => (
                    <motion.li
                      key={question}
                      className="flex w-1/2 shrink-0 p-2 active:scale-105"
                      style={{ transition: "all 0.2s ease-out" }}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.1 + 0.5,
                        ease: "easeOut",
                      }}
                    >
                      <div
                        className="bg-card text-muted-foreground cursor-pointer rounded-2xl border px-4 py-4 opacity-75 transition-all duration-300 hover:opacity-100 hover:shadow-md w-full"
                        onClick={() => handleQuickQuestion(question)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
                            {index === 0 && <Fuel className="w-3 h-3 text-primary" />}
                            {index === 1 && <Plane className="w-3 h-3 text-primary" />}
                            {index === 2 && <DollarSign className="w-3 h-3 text-primary" />}
                            {index === 3 && <PieChart className="w-3 h-3 text-primary" />}
                          </div>
                          <span className="text-sm">{question}</span>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* 使用标准的 InputBox 组件 */}
            <InputBox
              className="h-full w-full"
              responding={isLoading}
              onSend={handleSendMessage}
              onFileUpload={handleFileUpload}
              showUploadButton={selectedDataSource === 'uploaded_file'} // 只有在选择上传临时文件时显示上传按钮
              existingFiles={uploadedFiles} // 传递已上传文件列表
              // 数据源相关props
              selectedDataSource={selectedDataSource}
              systemDataSources={systemDataSources}
              // 表选择相关props
              selectedTable={selectedTable}
              tablesList={tablesList}
              tablesLoading={tablesLoading}
              onTableChange={setSelectedTable}
              onFetchTables={fetchTables}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
