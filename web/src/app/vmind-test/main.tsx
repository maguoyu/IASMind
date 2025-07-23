"use client";

import { BarChartOutlined, FileTextOutlined, LineChartOutlined, PieChartOutlined, SendOutlined } from "@ant-design/icons";
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from "react";
import { VChart } from '@visactor/react-vchart';
import { toast } from "sonner";
import { useAuthStore } from '~/core/store/auth-store';
import { VmindAPI, GenerateChartRequest } from '~/core/api/vmind';

interface ChartData {
  name: string;
  value: number;
}

export function VmindTestMain() {
  const [data, setData] = useState<ChartData[]>([
    { name: "类别A", value: 120 },
    { name: "类别B", value: 80 },
    { name: "类别C", value: 150 },
    { name: "类别D", value: 60 },
    { name: "类别E", value: 100 }
  ]);
  const [description, setDescription] = useState<string>("生成一个柱状图，展示各类别的数值比较");
  const [chartType, setChartType] = useState<string>("bar");
  const [spec, setSpec] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dataInput, setDataInput] = useState<string>(JSON.stringify(data, null, 2));
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

  // 处理数据输入变更
  const handleDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDataInput(e.target.value);
    try {
      const parsedData = JSON.parse(e.target.value);
      if (Array.isArray(parsedData)) {
        setData(parsedData);
      }
    } catch (err) {
      // 解析错误时不更新数据
    }
  };

  // 处理描述输入变更
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
  };

  // 调用VMind API生成图表
  const generateChart = async () => {
    try {
      setIsLoading(true);
      
      // 准备请求数据
      const requestData: GenerateChartRequest = {
        file_name: `chart_${Date.now()}`,
        output_type: "html",
        task_type: "visualization",
        data: data,
        description: description,
        language: "zh"
      };
      
      // 调用API
      const response = await VmindAPI.generateChart(requestData);
      
      if (response.data) {
        const result = response.data;
        
        // 如果有错误
        if (result.error) {
          toast.error(`生成图表失败: ${result.error}`);
          return;
        }
        
        // 如果有图表规格
        if (result.chart_path) {
          toast.success('图表生成成功！');
          
          // 示例：使用默认图表规格，实际中应该从API返回
          if (chartType === 'bar') {
            setSpec({
              type: 'bar',
              data: [{ id: 'data', values: data }],
              xField: 'name',
              yField: 'value'
            });
          } else if (chartType === 'pie') {
            setSpec({
              type: 'pie',
              data: [{ id: 'data', values: data }],
              angleField: 'value',
              colorField: 'name'
            });
          } else if (chartType === 'line') {
            setSpec({
              type: 'line',
              data: [{ id: 'data', values: data }],
              xField: 'name',
              yField: 'value'
            });
          }
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

  // 切换图表类型
  const handleChartTypeChange = (type: string) => {
    setChartType(type);
  };

  return (
    <div className="w-full flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col md:flex-row p-4 gap-4">
        {/* 左侧数据输入区 */}
        <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">VMind 测试</h2>
          
          {/* 数据输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              数据 (JSON 格式)
            </label>
            <textarea
              className="w-full h-48 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={dataInput}
              onChange={handleDataChange}
              placeholder='[{"name": "类别A", "value": 120}]'
            />
          </div>
          
          {/* 描述输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              图表描述
            </label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="描述你想要生成的图表类型和需求"
            />
          </div>
          
          {/* 图表类型选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              图表类型
            </label>
            <div className="flex gap-2">
              <button
                className={`flex items-center gap-1 px-3 py-2 rounded-md ${
                  chartType === 'bar' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                onClick={() => handleChartTypeChange('bar')}
              >
                <BarChartOutlined /> 柱状图
              </button>
              <button
                className={`flex items-center gap-1 px-3 py-2 rounded-md ${
                  chartType === 'pie' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                onClick={() => handleChartTypeChange('pie')}
              >
                <PieChartOutlined /> 饼图
              </button>
              <button
                className={`flex items-center gap-1 px-3 py-2 rounded-md ${
                  chartType === 'line' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                onClick={() => handleChartTypeChange('line')}
              >
                <LineChartOutlined /> 折线图
              </button>
            </div>
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
        
        {/* 右侧图表预览区 */}
        <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">图表预览</h2>
          
          {spec ? (
            <div className="h-[500px] w-full">
              <VChart spec={spec} />
            </div>
          ) : (
            <div className="h-[500px] w-full flex items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <div className="text-center">
                <FileTextOutlined style={{ fontSize: '48px' }} />
                <p className="mt-2">点击生成按钮创建图表</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 