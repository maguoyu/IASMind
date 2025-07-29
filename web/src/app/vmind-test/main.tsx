"use client";

import { BarChartOutlined, FileTextOutlined, LineChartOutlined, PieChartOutlined, SendOutlined, BulbOutlined, UploadOutlined, FileExcelOutlined } from "@ant-design/icons";
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useRef } from "react";
import { VChart } from '@visactor/react-vchart';
import type { ISpec } from '@visactor/react-vchart';

import { toast } from "sonner";

import type { GenerateChartRequest, GenerateChartResponse, ChartInsight } from '~/core/api/vmind';
import { VmindAPI } from '~/core/api/vmind';

interface ChartData {
  name: string;
  value: number;
  [key: string]: unknown; // 允许其他属性
}

export function VmindTestMain() {
  // 数据源类型: "text" 或 "file"
  const [inputType, setInputType] = useState<"text" | "file">("text");
  const [data, setData] = useState<ChartData[]>([
    { name: "类别A", value: 120 },
    { name: "类别B", value: 80 },
    { name: "类别C", value: 150 },
    { name: "类别D", value: 60 },
    { name: "类别E", value: 100 }
  ]);
  const [userPrompt, setUserPrompt] = useState<string>("生成一个数据可视化图表");
  const [spec, setSpec] = useState<ISpec | null>(null);
  const [insights, setInsights] = useState<ChartInsight[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dataInput, setDataInput] = useState<string>(JSON.stringify(data, null, 2));
  const [fileName, setFileName] = useState<string>("");
  const [fileData, setFileData] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 处理数据输入变更
  const handleDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setDataInput(newValue);
    
    // 尝试检测输入是否为CSV格式
    const isCSV = checkIfCSV(newValue);
    
    try {
      // 尝试解析为JSON
      const parsedData = JSON.parse(newValue);
      if (Array.isArray(parsedData)) {
        setData(parsedData);
        // 如果看起来像CSV但成功解析为JSON，不做特殊处理
      }
    } catch (err) {
      // 解析JSON失败，检查是否为CSV格式
      if (isCSV) {
        toast.info("检测到CSV格式数据，系统将作为CSV处理", {
          id: "csv-format-detected",
          duration: 3000
        });
      }
    }
  };
  
  // 检查文本是否符合CSV格式
  const checkIfCSV = (text: string): boolean => {
    // 检查字符串是否为空
    if (!text || !text.trim()) {
      return false;
    }
    
    // 按行分割
    const lines = text.trim().split('\n');
    if (lines.length < 2) {  // 至少需要有标题行和一行数据
      return false;
    }
    
    // 检查分隔符一致性
    const firstLine = lines[0];
    const firstLineCommas = firstLine ? (firstLine.match(/,/g) || []).length : 0;
    if (firstLineCommas === 0) {  // 必须有逗号分隔
      return false;
    }
    
    // 检查每行字段数是否一致
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.trim() && (line.match(/,/g) || []).length !== firstLineCommas) {
        return false;
      }
    }
    
    return true;
  };

  // 处理数据源类型选择
  const handleInputTypeChange = (type: "text" | "file") => {
    setInputType(type);
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileData(file);
    
    // 支持的文件类型提示
    const supportedTypes = ['.xlsx', '.xls', '.csv', '.json', '.txt', '.text'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.'));
    
    if (!supportedTypes.includes(fileExt)) {
      toast.warning(`文件类型 ${fileExt} 可能不受支持。支持的类型: .xlsx, .xls, .csv, .json, .txt, .text`);
    } else {
      toast.success(`已选择文件: ${file.name}`);
    }
  };

  // 触发文件选择对话框
  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 清除已上传的文件
  const handleClearFile = () => {
    setFileName("");
    setFileData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 调用VMind API生成图表
  const generateChart = async () => {
    try {
      setIsLoading(true);
      
      // 准备API请求的基本参数
      const baseRequestData = {
        file_name: `chart_${Date.now()}`,
        output_type: "html",
        task_type: "visualization",
        user_prompt: userPrompt,
        language: "zh"
      };
      
      let response;
      
      if (inputType === "text") {
        // 使用文本输入方式
        const requestData: GenerateChartRequest = {
          ...baseRequestData
        };
        
        // 优先尝试解析为JSON数据
        try {
          const parsedData = JSON.parse(dataInput.trim());
          requestData.data = parsedData;
          console.log("使用JSON解析后的数据:", parsedData);
        } catch (e) {
          // 如果解析失败，直接使用原始文本
          requestData.data = dataInput;
          console.log("使用原始文本数据");
        }
        
        console.log("发送请求数据:", requestData);
        response = await VmindAPI.generateChart(requestData);
      } else {
        // 使用文件方式
        if (!fileData) {
          toast.error("请先上传数据文件");
          setIsLoading(false);
          return;
        }
        
        const formData = new FormData();
        // 添加文件
        formData.append('file', fileData);
        
        // 添加其他参数
        Object.entries(baseRequestData).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
        
        // 调用文件上传API
        response = await VmindAPI.generateChartWithFile(formData);
      }
      
      if (response.data) {
        const result = response.data;
        
        // 如果有错误
        if (result.error) {
          toast.error(`生成图表失败: ${result.error}`);
          return;
        }
        
        // 处理数据洞察
        if (result.insights) {
          setInsights(result.insights);
          console.log('数据洞察:', result.insights);
        } else {
          setInsights([]);
        }
        
        // 使用服务端返回的spec进行渲染
        if (result.spec) {
          toast.success('图表生成成功！');
          console.log('服务端返回的spec:', result.spec);
          
          // 直接使用服务端返回的spec
          setSpec(result.spec as ISpec);
        } else {
          toast.warning('服务端未返回图表规格');
        }
      } else {
        toast.error('返回数据格式错误');
      }
    } catch (error) {
      console.error('生成图表时出错:', error);
      toast.error('调用API时出错');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col md:flex-row p-4 gap-4">
        {/* 左侧数据输入区 */}
        <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">VMind 测试</h2>
          
          {/* 数据源类型选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              数据源类型
            </label>
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                  inputType === 'text' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                onClick={() => handleInputTypeChange('text')}
              >
                <FileTextOutlined /> 文本输入
              </button>
              <button
                className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                  inputType === 'file' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                onClick={() => handleInputTypeChange('file')}
              >
                <UploadOutlined /> 文件上传
              </button>
            </div>
          </div>
          
          {/* 文本输入方式 */}
          {inputType === 'text' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                数据 
              </label>
              <textarea
                className="w-full h-48 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                value={dataInput}
                onChange={handleDataChange}
                placeholder='[{"name": "类别A", "value": 120}]'
              />
            </div>
          )}
          
          {/* 文件上传方式 */}
          {inputType === 'file' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                上传数据文件
              </label>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={handleFileUploadClick}
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center gap-2"
                >
                  <UploadOutlined /> 选择文件
                </button>
                {fileName && (
                  <div className="flex flex-1 items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div className="flex items-center gap-2">
                      <FileExcelOutlined style={{ color: '#217346' }} />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{fileName}</span>
                    </div>
                    <button
                      onClick={handleClearFile}
                      className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx,.json,.txt,.text"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                支持 .csv、.xlsx、.xls、.json、.txt、.text 格式
              </p>
            </div>
          )}
          
          {/* 用户提示输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              用户提示
            </label>
            <textarea
              className="w-full p-3 min-h-[100px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-base resize-y"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="请描述你想要生成的图表类型和数据分析需求..."
              rows={4}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              例如：根据数据生成一个展示各类别销售趋势的折线图，并分析增长最快的类别
            </p>
          </div>
          
          {/* 生成按钮 */}
          <button
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2"
            onClick={generateChart}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <SendOutlined />
            )}
            {isLoading ? '生成中...' : '生成图表'}
          </button>
        </div>
        
        {/* 右侧图表预览区和数据洞察区 */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          {/* 图表预览 */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">图表预览</h2>
            
            {spec ? (
              <div className="h-[400px] w-full">
                <VChart spec={spec} />
              </div>
            ) : (
              <div className="h-[400px] w-full flex items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <div className="text-center">
                  <FileTextOutlined style={{ fontSize: '48px' }} />
                  <p className="mt-2">点击生成按钮创建图表</p>
                </div>
              </div>
            )}
          </div>
          
          {/* 数据洞察区 */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200">
              <BulbOutlined /> 数据洞察
            </h2>
            
            {insights && insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map((insight: ChartInsight, index: number) => (
                  <div 
                    key={index}
                    className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border-l-4 border-blue-400"
                  >
                    <p className="text-gray-700 dark:text-gray-200">{insight.textContent.plainText}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <p>暂无数据洞察</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 