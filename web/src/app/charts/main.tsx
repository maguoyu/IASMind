// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Database, BarChart3, TrendingUp, Users, DollarSign, PieChart, LineChart, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart as RechartsLine, Line, Legend, AreaChart, Area } from 'recharts';

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { InputBox } from "./components/input-box";

// 消息类型定义
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  charts?: ChartData[];
  insights?: string[];
}

interface ChartData {
  type: 'bar' | 'pie' | 'line' | 'area';
  title: string;
  data: any[];
  config?: any;
}

// 数据源定义
interface DataSource {
  id: string;
  name: string;
  description: string;
  tables: number;
  lastUpdated: Date;
  status: 'connected' | 'disconnected' | 'syncing';
}

// 模拟数据
const mockDataSources: DataSource[] = [
  {
    id: 'sales_db',
    name: '销售数据库',
    description: '包含销售订单、客户信息和产品数据',
    tables: 12,
    lastUpdated: new Date('2024-01-15'),
    status: 'connected'
  },
  {
    id: 'marketing_db',
    name: '营销数据库',
    description: '广告投放、转化率和用户行为数据',
    tables: 8,
    lastUpdated: new Date('2024-01-14'),
    status: 'connected'
  },
  {
    id: 'finance_db',
    name: '财务数据库',
    description: '财务报表、成本分析和预算数据',
    tables: 6,
    lastUpdated: new Date('2024-01-13'),
    status: 'syncing'
  }
];

const quickQuestions = [
  "最近30天的销售趋势如何？",
  "哪个产品类别销量最好？",
  "今年营销ROI是多少？",
  "各地区销售额对比"
];

// 模拟图表数据生成器
const generateMockChart = (question: string): ChartData[] => {
  if (question.includes('趋势') || question.includes('变化')) {
    return [{
      type: 'line',
      title: '销售趋势分析',
      data: [
        { month: '10月', sales: 120000, target: 100000 },
        { month: '11月', sales: 140000, target: 120000 },
        { month: '12月', sales: 160000, target: 140000 },
        { month: '1月', sales: 180000, target: 160000 }
      ]
    }];
  }
  
  if (question.includes('类别') || question.includes('产品')) {
    return [{
      type: 'bar',
      title: '产品类别销量对比',
      data: [
        { category: '电子产品', sales: 350000, profit: 70000 },
        { category: '服装配饰', sales: 280000, profit: 85000 },
        { category: '家居用品', sales: 220000, profit: 55000 },
        { category: '运动健身', sales: 180000, profit: 45000 },
        { category: '美妆护理', sales: 240000, profit: 72000 }
      ]
    }];
  }
  
  if (question.includes('地区') || question.includes('区域')) {
    return [{
      type: 'pie',
      title: '各地区销售额分布',
      data: [
        { name: '华东地区', value: 450000, color: '#8884d8' },
        { name: '华南地区', value: 380000, color: '#82ca9d' },
        { name: '华北地区', value: 320000, color: '#ffc658' },
        { name: '西南地区', value: 280000, color: '#ff7300' },
        { name: '东北地区', value: 210000, color: '#8dd1e1' }
      ]
    }];
  }
  
  if (question.includes('ROI') || question.includes('成本')) {
    return [{
      type: 'area',
      title: '营销ROI趋势',
      data: [
        { month: '9月', investment: 50000, revenue: 180000, roi: 3.6 },
        { month: '10月', investment: 60000, revenue: 220000, roi: 3.7 },
        { month: '11月', investment: 55000, revenue: 210000, roi: 3.8 },
        { month: '12月', investment: 70000, revenue: 280000, roi: 4.0 },
        { month: '1月', investment: 65000, revenue: 270000, roi: 4.2 }
      ]
    }];
  }
  
  // 默认返回综合数据
  return [{
    type: 'bar',
    title: '数据总览',
    data: [
      { name: '指标A', value: 120 },
      { name: '指标B', value: 180 },
      { name: '指标C', value: 150 },
      { name: '指标D', value: 200 }
    ]
  }];
};

export function ChartsMain() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState('sales_db');
  const [isLoading, setIsLoading] = useState(false);

  const currentDataSource = useMemo(() => 
    mockDataSources.find(ds => ds.id === selectedDataSource) || mockDataSources[0],
    [selectedDataSource]
  );

  const handleSendMessage = useCallback(async (question: string) => {
    if (!question.trim()) return;
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // 模拟 API 延迟
    setTimeout(() => {
      const charts = generateMockChart(question);
      const insights = [
        "数据显示整体呈上升趋势",
        "建议关注转化率的持续优化",
        "可考虑加大投入规模较小但增长迅速的渠道"
      ];

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: `基于 ${currentDataSource?.name} 的分析结果：`,
        timestamp: new Date(),
        charts,
        insights
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  }, [currentDataSource]);

  const handleQuickQuestion = useCallback((question: string) => {
    handleSendMessage(question);
  }, [handleSendMessage]);

  const renderChart = (chart: ChartData) => {
    const chartHeight = 300;
    
    switch (chart.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chart.data[0]?.category ? 'category' : 'name'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={chart.data[0]?.sales ? 'sales' : 'value'} fill="#8884d8" name="销售额" />
              {chart.data[0]?.profit && <Bar dataKey="profit" fill="#82ca9d" name="利润" />}
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <RechartsPie>
              <Pie
                data={chart.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chart.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || `hsl(${index * 360 / chart.data.length}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
            </RechartsPie>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <RechartsLine data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} name="实际销售" />
              {chart.data[0]?.target && <Line type="monotone" dataKey="target" stroke="#82ca9d" strokeWidth={2} name="目标销售" />}
            </RechartsLine>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="investment" stackId="1" stroke="#ffc658" fill="#ffc658" name="投入" />
              <Area type="monotone" dataKey="revenue" stackId="2" stroke="#8884d8" fill="#8884d8" name="收入" />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      default:
        return <div>暂不支持此图表类型</div>;
    }
  };

    return (
    <div className={cn("flex h-full w-full justify-center-safe px-4 pt-12 pb-4")}>
      <div className={cn("w-[768px] flex flex-col h-full")}>
        {/* 数据源选择区域 */}
        <motion.div 
          className="mb-4 p-4 bg-card rounded-lg border"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">数据源:</span>
            </div>
            <Select value={selectedDataSource} onValueChange={setSelectedDataSource}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mockDataSources.map((source) => (
                  <SelectItem key={source.id} value={source.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        source.status === 'connected' ? 'bg-green-500' : 
                        source.status === 'syncing' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      {source.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentDataSource && (
              <div className="text-sm text-muted-foreground">
                {currentDataSource.tables} 个表 • {currentDataSource.lastUpdated.toLocaleDateString()}
              </div>
            )}
          </div>
        </motion.div>

        {/* 消息列表区域 */}
        <div className="flex flex-grow flex-col">
          <div className="flex-grow overflow-y-auto space-y-4">
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
                
                <div className={`max-w-lg ${message.type === 'user' ? 'order-first' : ''}`}>
                  <div className={`p-3 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground ml-auto' 
                      : 'bg-card border'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 opacity-70`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>

                  {/* 图表展示 */}
                  {message.charts && message.charts.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {message.charts.map((chart, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">{chart.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderChart(chart)}
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
          <div className="relative flex shrink-0 pb-4 flex-col">
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
                    📊 欢迎使用 Chat BI
                  </h3>
                  <div className="text-muted-foreground px-4 text-center text-lg">
                    使用自然语言查询您的数据，获得即时的可视化分析结果
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
                            {index === 0 && <TrendingUp className="w-3 h-3 text-primary" />}
                            {index === 1 && <BarChart3 className="w-3 h-3 text-primary" />}
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
