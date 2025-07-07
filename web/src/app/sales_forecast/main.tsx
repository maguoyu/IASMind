"use client";

import { UploadIcon, SearchIcon, FileTextIcon, BarChart3Icon, TrendingUpIcon, PieChartIcon, DownloadIcon, TrashIcon, BarChart3, Target as TargetIcon, Trophy as TrophyIcon } from "lucide-react";
import { useState } from "react";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { CascaderPro } from "~/components/ui/cascader-pro";
import type { CascaderOption } from "~/components/ui/cascader-pro";

interface SampleData {
  id: string;
  date: string;
  sales_volume: number;
  price: number;
  region: string;
  season: string;
  weather: string;
  events: string;
  notes: string;
  sampleFile: string;
}

interface ForecastData {
  month: string;
  predicted: number;
  actual?: number;
  confidence: number;
}

// 静态样本数据
const staticSampleData: SampleData[] = [
  // 历史销售数据
  {
    id: "1",
    date: "2024-01-01",
    sales_volume: 1000.5,
    price: 8.5,
    region: "华东",
    season: "冬季",
    weather: "晴天",
    events: "元旦假期",
    notes: "节假日期间销量增加",
    sampleFile: "华东地区2024年1月样本数据.xlsx"
  },
  {
    id: "2",
    date: "2024-01-02",
    sales_volume: 950.2,
    price: 8.3,
    region: "华东",
    season: "冬季",
    weather: "多云",
    events: "",
    notes: "工作日正常销量",
    sampleFile: "华东地区2024年1月样本数据.xlsx"
  },
  {
    id: "3",
    date: "2024-01-03",
    sales_volume: 1100.8,
    price: 8.7,
    region: "华南",
    season: "冬季",
    weather: "晴天",
    events: "",
    notes: "南方地区需求稳定",
    sampleFile: "华南地区2023年样本数据.xlsx"
  },
  {
    id: "4",
    date: "2024-01-04",
    sales_volume: 1050.3,
    price: 8.6,
    region: "华北",
    season: "冬季",
    weather: "阴天",
    events: "",
    notes: "北方地区需求稳定",
    sampleFile: "华北地区2023年样本数据.xlsx"
  },
  {
    id: "5",
    date: "2024-01-05",
    sales_volume: 1200.1,
    price: 8.8,
    region: "华东",
    season: "冬季",
    weather: "晴天",
    events: "周末",
    notes: "周末出行需求增加",
    sampleFile: "华东地区2024年1月样本数据.xlsx"
  },
  // 年度汇总数据
  {
    id: "6",
    date: "2023-12-31",
    sales_volume: 8500.0,
    price: 8.2,
    region: "华东",
    season: "冬季",
    weather: "晴天",
    events: "年终总结",
    notes: "2023年华东地区年度汇总数据",
    sampleFile: "华东地区2023年年度汇总.xlsx"
  },
  {
    id: "7",
    date: "2023-12-31",
    sales_volume: 7200.0,
    price: 8.1,
    region: "华南",
    season: "冬季",
    weather: "晴天",
    events: "年终总结",
    notes: "2023年华南地区年度汇总数据",
    sampleFile: "华南地区2023年样本数据.xlsx"
  },
  {
    id: "8",
    date: "2023-12-31",
    sales_volume: 6800.0,
    price: 8.0,
    region: "华北",
    season: "冬季",
    weather: "晴天",
    events: "年终总结",
    notes: "2023年华北地区年度汇总数据",
    sampleFile: "华北地区2023年样本数据.xlsx"
  },
  // 季度数据
  {
    id: "9",
    date: "2023-10-01",
    sales_volume: 2100.0,
    price: 8.3,
    region: "华东",
    season: "秋季",
    weather: "晴天",
    events: "Q4季度开始",
    notes: "2023年第四季度华东地区数据",
    sampleFile: "华东地区2023年Q4季度数据.xlsx"
  },
  {
    id: "10",
    date: "2023-10-01",
    sales_volume: 1800.0,
    price: 8.2,
    region: "华南",
    season: "秋季",
    weather: "晴天",
    events: "Q4季度开始",
    notes: "2023年第四季度华南地区数据",
    sampleFile: "华南地区2023年样本数据.xlsx"
  },
  {
    id: "11",
    date: "2023-10-01",
    sales_volume: 1700.0,
    price: 8.1,
    region: "华北",
    season: "秋季",
    weather: "晴天",
    events: "Q4季度开始",
    notes: "2023年第四季度华北地区数据",
    sampleFile: "华北地区2023年样本数据.xlsx"
  },
  // 月度数据
  {
    id: "12",
    date: "2023-12-01",
    sales_volume: 700.0,
    price: 8.4,
    region: "华东",
    season: "冬季",
    weather: "多云",
    events: "12月月度统计",
    notes: "2023年12月华东地区月度数据",
    sampleFile: "华东地区2023年12月数据.xlsx"
  },
  {
    id: "13",
    date: "2023-12-01",
    sales_volume: 600.0,
    price: 8.3,
    region: "华南",
    season: "冬季",
    weather: "多云",
    events: "12月月度统计",
    notes: "2023年12月华南地区月度数据",
    sampleFile: "华南地区2023年样本数据.xlsx"
  },
  {
    id: "14",
    date: "2023-12-01",
    sales_volume: 550.0,
    price: 8.2,
    region: "华北",
    season: "冬季",
    weather: "多云",
    events: "12月月度统计",
    notes: "2023年12月华北地区月度数据",
    sampleFile: "华北地区2023年样本数据.xlsx"
  },
  {
    id: "15",
    date: "2023-11-01",
    sales_volume: 680.0,
    price: 8.3,
    region: "华东",
    season: "秋季",
    weather: "晴天",
    events: "11月月度统计",
    notes: "2023年11月华东地区月度数据",
    sampleFile: "华东地区2023年11月数据.xlsx"
  },
  {
    id: "16",
    date: "2023-11-01",
    sales_volume: 580.0,
    price: 8.2,
    region: "华南",
    season: "秋季",
    weather: "晴天",
    events: "11月月度统计",
    notes: "2023年11月华南地区月度数据",
    sampleFile: "华南地区2023年样本数据.xlsx"
  },
  {
    id: "17",
    date: "2023-11-01",
    sales_volume: 520.0,
    price: 8.1,
    region: "华北",
    season: "秋季",
    weather: "晴天",
    events: "11月月度统计",
    notes: "2023年11月华北地区月度数据",
    sampleFile: "华北地区2023年样本数据.xlsx"
  },
  {
    id: "18",
    date: "2023-10-01",
    sales_volume: 720.0,
    price: 8.4,
    region: "华东",
    season: "秋季",
    weather: "晴天",
    events: "10月月度统计",
    notes: "2023年10月华东地区月度数据",
    sampleFile: "华东地区2023年10月数据.xlsx"
  },
  {
    id: "19",
    date: "2023-10-01",
    sales_volume: 620.0,
    price: 8.3,
    region: "华南",
    season: "秋季",
    weather: "晴天",
    events: "10月月度统计",
    notes: "2023年10月华南地区月度数据",
    sampleFile: "华南地区2023年样本数据.xlsx"
  },
  {
    id: "20",
    date: "2023-10-01",
    sales_volume: 580.0,
    price: 8.2,
    region: "华北",
    season: "秋季",
    weather: "晴天",
    events: "10月月度统计",
    notes: "2023年10月华北地区月度数据",
    sampleFile: "华北地区2023年样本数据.xlsx"
  }
];

// 静态预测数据
const staticForecastData: ForecastData[] = [
  // 华东地区2024年销售预测 - 线性回归
  { month: "2024-02", predicted: 1050, actual: 1020, confidence: 95 },
  { month: "2024-03", predicted: 1100, actual: 1080, confidence: 92 },
  { month: "2024-04", predicted: 1150, confidence: 88 },
  { month: "2024-05", predicted: 1200, confidence: 85 },
  { month: "2024-06", predicted: 1250, confidence: 82 },
  { month: "2024-07", predicted: 1300, confidence: 80 },
  { month: "2024-08", predicted: 1350, confidence: 78 },
  { month: "2024-09", predicted: 1400, confidence: 75 },
  { month: "2024-10", predicted: 1450, confidence: 72 },
  { month: "2024-11", predicted: 1500, confidence: 70 },
  { month: "2024-12", predicted: 1550, confidence: 68 },
  { month: "2025-01", predicted: 1600, confidence: 65 },
  
  // 华南地区年度预测分析 - ARIMA模型
  { month: "2024-02", predicted: 980, actual: 950, confidence: 94 },
  { month: "2024-03", predicted: 1020, actual: 990, confidence: 91 },
  { month: "2024-04", predicted: 1080, confidence: 87 },
  { month: "2024-05", predicted: 1120, confidence: 84 },
  { month: "2024-06", predicted: 1180, confidence: 81 },
  { month: "2024-07", predicted: 1220, confidence: 79 },
  { month: "2024-08", predicted: 1280, confidence: 76 },
  { month: "2024-09", predicted: 1320, confidence: 73 },
  { month: "2024-10", predicted: 1380, confidence: 70 },
  { month: "2024-11", predicted: 1420, confidence: 68 },
  { month: "2024-12", predicted: 1480, confidence: 65 },
  { month: "2025-01", predicted: 1520, confidence: 62 },
  
  // 华北地区季度预测 - 指数平滑
  { month: "2024-02", predicted: 850, actual: 820, confidence: 89 },
  { month: "2024-03", predicted: 880, actual: 850, confidence: 86 },
  { month: "2024-04", predicted: 920, confidence: 83 },
  { month: "2024-05", predicted: 950, confidence: 80 },
  { month: "2024-06", predicted: 980, confidence: 77 },
  { month: "2024-07", predicted: 1020, confidence: 75 },
  { month: "2024-08", predicted: 1050, confidence: 72 },
  { month: "2024-09", predicted: 1080, confidence: 69 },
  { month: "2024-10", predicted: 1120, confidence: 66 },
  { month: "2024-11", predicted: 1150, confidence: 64 },
  { month: "2024-12", predicted: 1180, confidence: 61 },
  { month: "2025-01", predicted: 1220, confidence: 58 },
  
  // 全国销售深度预测 - LSTM神经网络
  { month: "2024-02", predicted: 3200, actual: 3150, confidence: 96 },
  { month: "2024-03", predicted: 3350, actual: 3300, confidence: 93 },
  { month: "2024-04", predicted: 3500, confidence: 90 },
  { month: "2024-05", predicted: 3650, confidence: 87 },
  { month: "2024-06", predicted: 3800, confidence: 84 },
  { month: "2024-07", predicted: 3950, confidence: 82 },
  { month: "2024-08", predicted: 4100, confidence: 79 },
  { month: "2024-09", predicted: 4250, confidence: 76 },
  { month: "2024-10", predicted: 4400, confidence: 73 },
  { month: "2024-11", predicted: 4550, confidence: 70 },
  { month: "2024-12", predicted: 4700, confidence: 67 },
  { month: "2025-01", predicted: 4850, confidence: 64 }
];

// 预测分析数据 - 多维度层级数据
const analysisData = {
  regions: {
    "华东": {
      companies: {
        "华东航空燃料有限公司": {
          airports: {
            "上海浦东机场": {
              data: [
                {
                  month: "2024-01",
                  actual: 1200,
                  predicted: 1250,
                  predictedYoy: 0.08, // 同比
                  predictedMom: 0.05, // 环比
                  lastYearSame: 1110,
                  deviation: 0.042, // 偏差率
                  iteration: 3, // 第几次迭代
                  algorithm: "线性回归"
                },
                {
                  month: "2024-02",
                  actual: 1150,
                  predicted: 1180,
                  predictedYoy: 0.06,
                  predictedMom: -0.056,
                  lastYearSame: 1080,
                  deviation: 0.026,
                  iteration: 3,
                  algorithm: "线性回归"
                },
                {
                  month: "2024-03",
                  actual: 1280,
                  predicted: 1320,
                  predictedYoy: 0.12,
                  predictedMom: 0.119,
                  lastYearSame: 1140,
                  deviation: 0.031,
                  iteration: 3,
                  algorithm: "线性回归"
                },
                {
                  month: "2024-04",
                  actual: 1350,
                  predicted: 1400,
                  predictedYoy: 0.15,
                  predictedMom: 0.061,
                  lastYearSame: 1170,
                  deviation: 0.037,
                  iteration: 3,
                  algorithm: "线性回归"
                },
                {
                  month: "2024-05",
                  actual: 1420,
                  predicted: 1450,
                  predictedYoy: 0.18,
                  predictedMom: 0.036,
                  lastYearSame: 1200,
                  deviation: 0.021,
                  iteration: 3,
                  algorithm: "线性回归"
                },
                {
                  month: "2024-06",
                  actual: 1360,
                  predicted: 1380,
                  predictedYoy: 0.14,
                  predictedMom: -0.062,
                  lastYearSame: 1190,
                  deviation: 0.015,
                  iteration: 3,
                  algorithm: "线性回归"
                }
              ]
            },
            "上海虹桥机场": {
              data: [
                {
                  month: "2024-01",
                  actual: 850,
                  predicted: 880,
                  predictedYoy: 0.07,
                  predictedMom: 0.04,
                  lastYearSame: 820,
                  deviation: 0.035,
                  iteration: 2,
                  algorithm: "随机森林"
                },
                {
                  month: "2024-02",
                  actual: 820,
                  predicted: 850,
                  predictedYoy: 0.05,
                  predictedMom: -0.034,
                  lastYearSame: 780,
                  deviation: 0.037,
                  iteration: 2,
                  algorithm: "随机森林"
                }
              ]
            }
          }
        },
        "江苏航空燃料公司": {
          airports: {
            "南京禄口机场": {
              data: [
                {
                  month: "2024-01",
                  actual: 680,
                  predicted: 720,
                  predictedYoy: 0.09,
                  predictedMom: 0.06,
                  lastYearSame: 660,
                  deviation: 0.059,
                  iteration: 1,
                  algorithm: "XGBoost"
                }
              ]
            }
          }
        }
      }
    },
    "华南": {
      companies: {
        "华南航空燃料有限公司": {
          airports: {
            "广州白云机场": {
              data: [
                {
                  month: "2024-01",
                  actual: 1100,
                  predicted: 1150,
                  predictedYoy: 0.10,
                  predictedMom: 0.05,
                  lastYearSame: 1040,
                  deviation: 0.045,
                  iteration: 2,
                  algorithm: "神经网络"
                }
              ]
            }
          }
        }
      }
    }
  }
};

type MenuItem = "upload" | "preview" | "forecast" | "forecast-preview" | "analysis";

export default function SalesForecastMain() {
  const [activeMenu, setActiveMenu] = useState<MenuItem>("upload");
  const [sampleData, setSampleData] = useState<SampleData[]>(staticSampleData);
  const [forecastData, setForecastData] = useState<ForecastData[]>([
    { month: "2024-01", predicted: 1250, actual: 1280, confidence: 92 },
    { month: "2024-02", predicted: 1180, actual: 1150, confidence: 88 },
    { month: "2024-03", predicted: 1350, actual: 1320, confidence: 91 },
    { month: "2024-04", predicted: 1420, actual: 1450, confidence: 89 },
    { month: "2024-05", predicted: 1380, actual: 1360, confidence: 87 },
    { month: "2024-06", predicted: 1550, actual: 1580, confidence: 93 },
    { month: "2024-07", predicted: 1680, actual: 1650, confidence: 90 },
    { month: "2024-08", predicted: 1620, actual: 1600, confidence: 88 },
    { month: "2024-09", predicted: 1480, actual: 1520, confidence: 91 },
    { month: "2024-10", predicted: 1350, actual: 1380, confidence: 89 },
    { month: "2024-11", predicted: 1280, actual: 1250, confidence: 86 },
    { month: "2024-12", predicted: 1450, actual: 1420, confidence: 92 },
    // 第二组数据
    { month: "2024-01", predicted: 980, actual: 950, confidence: 85 },
    { month: "2024-02", predicted: 920, actual: 900, confidence: 82 },
    { month: "2024-03", predicted: 1050, actual: 1080, confidence: 88 },
    { month: "2024-04", predicted: 1120, actual: 1150, confidence: 90 },
    { month: "2024-05", predicted: 1080, actual: 1060, confidence: 87 },
    { month: "2024-06", predicted: 1250, actual: 1280, confidence: 92 },
    { month: "2024-07", predicted: 1380, actual: 1350, confidence: 89 },
    { month: "2024-08", predicted: 1320, actual: 1300, confidence: 87 },
    { month: "2024-09", predicted: 1180, actual: 1220, confidence: 90 },
    { month: "2024-10", predicted: 1050, actual: 1080, confidence: 88 },
    { month: "2024-11", predicted: 980, actual: 950, confidence: 84 },
    { month: "2024-12", predicted: 1150, actual: 1120, confidence: 91 },
    // 第三组数据
    { month: "2024-01", predicted: 850, actual: 880, confidence: 83 },
    { month: "2024-02", predicted: 780, actual: 750, confidence: 80 },
    { month: "2024-03", predicted: 920, actual: 950, confidence: 86 },
    { month: "2024-04", predicted: 980, actual: 1020, confidence: 88 },
    { month: "2024-05", predicted: 950, actual: 930, confidence: 85 },
    { month: "2024-06", predicted: 1120, actual: 1150, confidence: 90 },
    { month: "2024-07", predicted: 1250, actual: 1220, confidence: 87 },
    { month: "2024-08", predicted: 1180, actual: 1160, confidence: 85 },
    { month: "2024-09", predicted: 1050, actual: 1080, confidence: 88 },
    { month: "2024-10", predicted: 920, actual: 950, confidence: 86 },
    { month: "2024-11", predicted: 850, actual: 820, confidence: 82 },
    { month: "2024-12", predicted: 1020, actual: 980, confidence: 89 },
    // 第四组数据
    { month: "2024-01", predicted: 2200, actual: 2250, confidence: 94 },
    { month: "2024-02", predicted: 2100, actual: 2050, confidence: 91 },
    { month: "2024-03", predicted: 2350, actual: 2380, confidence: 93 },
    { month: "2024-04", predicted: 2420, actual: 2450, confidence: 95 },
    { month: "2024-05", predicted: 2380, actual: 2360, confidence: 92 },
    { month: "2024-06", predicted: 2550, actual: 2580, confidence: 96 },
    { month: "2024-07", predicted: 2680, actual: 2650, confidence: 94 },
    { month: "2024-08", predicted: 2620, actual: 2600, confidence: 93 },
    { month: "2024-09", predicted: 2480, actual: 2520, confidence: 95 },
    { month: "2024-10", predicted: 2350, actual: 2380, confidence: 93 },
    { month: "2024-11", predicted: 2280, actual: 2250, confidence: 90 },
    { month: "2024-12", predicted: 2450, actual: 2420, confidence: 94 }
  ]);
  const [filterRegion, setFilterRegion] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // 级联筛选相关状态
  const [cascaderValue, setCascaderValue] = useState<string[]>([]);
  
  // 预测结果查询页面的级联筛选状态
  const [forecastCascaderValue, setForecastCascaderValue] = useState<string[]>([]);
  
  // 搜索状态
  const [isSearching, setIsSearching] = useState(false);
  
  // 级联选择器选项数据 - 地区、省级公司、地市级公司
  const cascaderOptions: CascaderOption[] = [
    {
      value: "华东",
      label: "华东地区",
      children: [
        {
          value: "华东航空燃料有限公司",
          label: "华东航空燃料有限公司",
          children: [
            { value: "上海浦东机场", label: "上海浦东机场" },
            { value: "上海虹桥机场", label: "上海虹桥机场" },
            { value: "南京禄口机场", label: "南京禄口机场" },
            { value: "杭州萧山机场", label: "杭州萧山机场" },
            { value: "宁波栎社机场", label: "宁波栎社机场" }
          ]
        },
        {
          value: "江苏航空燃料公司",
          label: "江苏航空燃料公司",
          children: [
            { value: "南京禄口机场", label: "南京禄口机场" },
            { value: "无锡硕放机场", label: "无锡硕放机场" },
            { value: "常州奔牛机场", label: "常州奔牛机场" },
            { value: "南通兴东机场", label: "南通兴东机场" }
          ]
        },
        {
          value: "浙江航空燃料公司",
          label: "浙江航空燃料公司",
          children: [
            { value: "杭州萧山机场", label: "杭州萧山机场" },
            { value: "宁波栎社机场", label: "宁波栎社机场" },
            { value: "温州龙湾机场", label: "温州龙湾机场" },
            { value: "义乌机场", label: "义乌机场" }
          ]
        }
      ]
    },
    {
      value: "华南",
      label: "华南地区",
      children: [
        {
          value: "华南航空燃料有限公司",
          label: "华南航空燃料有限公司",
          children: [
            { value: "广州白云机场", label: "广州白云机场" },
            { value: "深圳宝安机场", label: "深圳宝安机场" },
            { value: "珠海金湾机场", label: "珠海金湾机场" },
            { value: "佛山沙堤机场", label: "佛山沙堤机场" }
          ]
        },
        {
          value: "广东航空燃料公司",
          label: "广东航空燃料公司",
          children: [
            { value: "广州白云机场", label: "广州白云机场" },
            { value: "深圳宝安机场", label: "深圳宝安机场" },
            { value: "珠海金湾机场", label: "珠海金湾机场" }
          ]
        }
      ]
    },
    {
      value: "华北",
      label: "华北地区",
      children: [
        {
          value: "华北航空燃料有限公司",
          label: "华北航空燃料有限公司",
          children: [
            { value: "北京首都机场", label: "北京首都机场" },
            { value: "北京大兴机场", label: "北京大兴机场" },
            { value: "天津滨海机场", label: "天津滨海机场" },
            { value: "石家庄正定机场", label: "石家庄正定机场" }
          ]
        },
        {
          value: "北京航空燃料公司",
          label: "北京航空燃料公司",
          children: [
            { value: "北京首都机场", label: "北京首都机场" },
            { value: "北京大兴机场", label: "北京大兴机场" }
          ]
        }
      ]
    }
  ];
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);
  const [taskName, setTaskName] = useState("");
  const [forecastPreviewPage, setForecastPreviewPage] = useState(1);
  const [forecastPreviewPageSize] = useState(10);
  const [filterTaskName, setFilterTaskName] = useState("");
  const [filterAlgorithm, setFilterAlgorithm] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [showWeightedForecast, setShowWeightedForecast] = useState(false);
  const [weightConfig, setWeightConfig] = useState({
    region: "华东",
    company: "华东航空燃料有限公司",
    models: [
      { name: "线性回归", weight: 30, enabled: true },
      { name: "ARIMA模型", weight: 25, enabled: true },
      { name: "指数平滑", weight: 20, enabled: true },
      { name: "LSTM神经网络", weight: 15, enabled: true },
      { name: "Prophet时间序列", weight: 10, enabled: false }
    ]
  });

  // 预设权重配置模板
  const weightTemplates = {
    "保守型": {
      region: "华东",
      company: "华东航空燃料有限公司",
      models: [
        { name: "线性回归", weight: 40, enabled: true },
        { name: "ARIMA模型", weight: 30, enabled: true },
        { name: "指数平滑", weight: 20, enabled: true },
        { name: "LSTM神经网络", weight: 10, enabled: true },
        { name: "Prophet时间序列", weight: 0, enabled: false }
      ]
    },
    "平衡型": {
      region: "华东",
      company: "华东航空燃料有限公司",
      models: [
        { name: "线性回归", weight: 30, enabled: true },
        { name: "ARIMA模型", weight: 25, enabled: true },
        { name: "指数平滑", weight: 20, enabled: true },
        { name: "LSTM神经网络", weight: 15, enabled: true },
        { name: "Prophet时间序列", weight: 10, enabled: true }
      ]
    },
    "激进型": {
      region: "华东",
      company: "华东航空燃料有限公司",
      models: [
        { name: "线性回归", weight: 20, enabled: true },
        { name: "ARIMA模型", weight: 15, enabled: true },
        { name: "指数平滑", weight: 15, enabled: true },
        { name: "LSTM神经网络", weight: 30, enabled: true },
        { name: "Prophet时间序列", weight: 20, enabled: true }
      ]
    }
  };

  // 模型性能测试数据
  const modelPerformanceData = {
    "线性回归": {
      accuracy: 85.2,
      mape: 12.3,
      rmse: 45.6,
      trainingTime: "30秒",
      predictionTime: "2秒",
      bestFor: "线性趋势明显的数据",
      limitations: "对非线性关系敏感"
    },
    "ARIMA模型": {
      accuracy: 88.7,
      mape: 10.8,
      rmse: 38.9,
      trainingTime: "2分钟",
      predictionTime: "5秒",
      bestFor: "时间序列数据",
      limitations: "需要足够的历史数据"
    },
    "指数平滑": {
      accuracy: 82.1,
      mape: 15.2,
      rmse: 52.1,
      trainingTime: "15秒",
      predictionTime: "1秒",
      bestFor: "短期预测",
      limitations: "对长期趋势把握不足"
    },
    "LSTM神经网络": {
      accuracy: 91.3,
      mape: 8.9,
      rmse: 32.4,
      trainingTime: "8分钟",
      predictionTime: "10秒",
      bestFor: "复杂非线性关系",
      limitations: "需要大量训练数据"
    },
    "Prophet时间序列": {
      accuracy: 87.5,
      mape: 11.6,
      rmse: 41.2,
      trainingTime: "1分钟",
      predictionTime: "3秒",
      bestFor: "季节性数据",
      limitations: "对异常值敏感"
    }
  };

  // 保存的权重配置列表
  const [savedConfigs, setSavedConfigs] = useState([
    {
      id: "1",
      name: "华东地区标准配置",
      region: "华东",
      company: "华东航空燃料有限公司",
      models: [
        { name: "线性回归", weight: 35, enabled: true },
        { name: "ARIMA模型", weight: 25, enabled: true },
        { name: "指数平滑", weight: 20, enabled: true },
        { name: "LSTM神经网络", weight: 15, enabled: true },
        { name: "Prophet时间序列", weight: 5, enabled: false }
      ],
      accuracy: 87.2,
      lastUpdated: "2024-01-05",
      description: "华东地区标准预测配置，适合常规业务场景"
    },
    {
      id: "2",
      name: "华南地区优化配置",
      region: "华南",
      company: "华南航空燃料有限公司",
      models: [
        { name: "线性回归", weight: 25, enabled: true },
        { name: "ARIMA模型", weight: 30, enabled: true },
        { name: "指数平滑", weight: 15, enabled: true },
        { name: "LSTM神经网络", weight: 20, enabled: true },
        { name: "Prophet时间序列", weight: 10, enabled: true }
      ],
      accuracy: 89.1,
      lastUpdated: "2024-01-03",
      description: "华南地区优化配置，提高预测准确性"
    },
    {
      id: "3",
      name: "华北地区保守配置",
      region: "华北",
      company: "华北航空燃料有限公司",
      models: [
        { name: "线性回归", weight: 40, enabled: true },
        { name: "ARIMA模型", weight: 30, enabled: true },
        { name: "指数平滑", weight: 20, enabled: true },
        { name: "LSTM神经网络", weight: 10, enabled: true },
        { name: "Prophet时间序列", weight: 0, enabled: false }
      ],
      accuracy: 85.8,
      lastUpdated: "2023-12-15",
      description: "华北地区保守配置，适合风险控制场景"
    }
  ]);

  const [configName, setConfigName] = useState("");
  const [configDescription, setConfigDescription] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showConfigList, setShowConfigList] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [configSearchTerm, setConfigSearchTerm] = useState("");
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
  
  // 预测分析相关状态
  const [analysisLevel, setAnalysisLevel] = useState("region"); // region, company, airport
  const [selectedRegion, setSelectedRegion] = useState("华东");
  const [selectedCompany, setSelectedCompany] = useState("华东航空燃料有限公司");
  const [selectedAirport, setSelectedAirport] = useState("上海浦东机场");
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("all");
  const [analysisTimeRange, setAnalysisTimeRange] = useState("12"); // 12, 24, 36 months
  const [analysisStartDate, setAnalysisStartDate] = useState("");
  const [analysisEndDate, setAnalysisEndDate] = useState("");
  const [analysisCascaderValue, setAnalysisCascaderValue] = useState<string[]>([]);
  const [showTrendChart, setShowTrendChart] = useState(true);
  
  // 历史执行记录
  const [executionHistory, setExecutionHistory] = useState([
    {
      id: "1",
      taskName: "华东地区2024年销售预测",
      timestamp: "2024-01-05 15:30:00",
      algorithm: "线性回归",
      duration: "45秒",
      status: "成功",
      sampleCount: 20,
      predictionMonths: 12,
      accuracy: "85%"
    },
    {
      id: "2",
      taskName: "华南地区年度预测分析",
      timestamp: "2024-01-04 14:20:00",
      algorithm: "ARIMA模型",
      duration: "2分30秒",
      status: "成功",
      sampleCount: 18,
      predictionMonths: 18,
      accuracy: "92%"
    },
    {
      id: "3",
      taskName: "华北地区季度预测",
      timestamp: "2024-01-03 10:15:00",
      algorithm: "指数平滑",
      duration: "1分15秒",
      status: "成功",
      sampleCount: 15,
      predictionMonths: 6,
      accuracy: "78%"
    },
    {
      id: "4",
      taskName: "全国销售深度预测",
      timestamp: "2024-01-02 16:45:00",
      algorithm: "LSTM神经网络",
      duration: "5分20秒",
      status: "失败",
      sampleCount: 25,
      predictionMonths: 24,
      accuracy: "-"
    },
    {
      id: "5",
      taskName: "华东地区月度预测",
      timestamp: "2024-01-01 09:30:00",
      algorithm: "Prophet时间序列",
      duration: "3分15秒",
      status: "成功",
      sampleCount: 22,
      predictionMonths: 12,
      accuracy: "88%"
    },
    {
      id: "6",
      taskName: "华南地区短期预测",
      timestamp: "2023-12-31 11:20:00",
      algorithm: "多项式回归",
      duration: "1分45秒",
      status: "成功",
      sampleCount: 16,
      predictionMonths: 6,
      accuracy: "82%"
    },
    {
      id: "7",
      taskName: "华北地区年度预测",
      timestamp: "2023-12-30 14:10:00",
      algorithm: "线性回归",
      duration: "50秒",
      status: "成功",
      sampleCount: 19,
      predictionMonths: 12,
      accuracy: "87%"
    },
    {
      id: "8",
      taskName: "华东地区长期预测",
      timestamp: "2023-12-29 16:30:00",
      algorithm: "ARIMA模型",
      duration: "2分45秒",
      status: "成功",
      sampleCount: 21,
      predictionMonths: 18,
      accuracy: "90%"
    },
    {
      id: "9",
      taskName: "华南地区季度预测",
      timestamp: "2023-12-28 10:45:00",
      algorithm: "指数平滑",
      duration: "1分20秒",
      status: "成功",
      sampleCount: 14,
      predictionMonths: 6,
      accuracy: "76%"
    },
    {
      id: "10",
      taskName: "全国销售AI预测",
      timestamp: "2023-12-27 13:15:00",
      algorithm: "LSTM神经网络",
      duration: "4分30秒",
      status: "成功",
      sampleCount: 23,
      predictionMonths: 24,
      accuracy: "94%"
    }
  ]);

  // 菜单项配置
  const menuItems = [
    { id: "upload", label: "样本管理", icon: UploadIcon },
    { id: "preview", label: "样本数据查询", icon: FileTextIcon },
    { id: "forecast", label: "预测管理", icon: TrendingUpIcon },
    { id: "forecast-preview", label: "预测结果查询", icon: BarChart3Icon },
    { id: "analysis", label: "预测分析", icon: PieChartIcon }
  ];

  // 级联筛选逻辑
  const matchesCascaderFilter = (item: SampleData) => {
    if (cascaderValue.length === 0) return true;
    
    // 根据级联选择的值进行过滤
    const [selectedRegion, selectedCompany, selectedAirport] = cascaderValue;
    
    // 如果选择了地区，检查地区是否匹配
    if (selectedRegion && item.region !== selectedRegion) {
      return false;
    }
    
    // 如果选择了公司，检查样本文件是否包含该公司信息
    if (selectedCompany && !item.sampleFile.includes(selectedCompany)) {
      return false;
    }
    
    // 如果选择了机场，检查样本文件是否包含该机场信息
    if (selectedAirport && !item.sampleFile.includes(selectedAirport)) {
      return false;
    }
    
    return true;
  };

  // 过滤数据
  const filteredData = sampleData.filter(item => {
    // 级联筛选
    const matchesCascader = matchesCascaderFilter(item);
    
    // 传统地区筛选（保持向后兼容）
    const matchesRegion = filterRegion === "" || item.region === filterRegion;
    
    // 根据样本类型过滤（通过notes字段判断）
    const matchesSampleType = filterSeason === "" || 
      (filterSeason === "历史销售数据" && item.notes.includes("销量")) ||
      (filterSeason === "年度汇总数据" && item.notes.includes("年度汇总")) ||
      (filterSeason === "季度数据" && item.notes.includes("季度")) ||
      (filterSeason === "月度数据" && item.notes.includes("月度"));
    
    // 时间范围过滤
    const matchesDateRange = (!startDate || item.date >= startDate) && 
                            (!endDate || item.date <= endDate);
    
    // 优先使用级联筛选，如果没有级联选择则使用传统筛选
    const regionMatch = cascaderValue.length > 0 ? matchesCascader : matchesRegion;
    
    return regionMatch && matchesSampleType && matchesDateRange;
  });

  // 获取唯一区域和季节
  const uniqueRegions = [...new Set(sampleData.map(item => item.region))];
  const uniqueSeasons = [...new Set(sampleData.map(item => item.season))];
  
  // 分页计算
  const totalPages = Math.ceil(executionHistory.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageData = executionHistory.slice(startIndex, endIndex);
  
  // 预测结果级联筛选逻辑
  const matchesForecastCascaderFilter = (item: ForecastData, index: number) => {
    if (forecastCascaderValue.length === 0) return true;
    
    // 根据索引确定任务信息
    const taskIndex = Math.floor(index / 12);
    const taskNames = ["华东地区2024年销售预测", "华南地区年度预测分析", "华北地区季度预测", "全国销售深度预测"];
    const regions = ["华东", "华南", "华北", "全国"];
    const companies = ["华东航空燃料有限公司", "华南航空燃料有限公司", "华北航空燃料有限公司", "全国航空燃料集团"];
    
    const currentTaskName = taskNames[taskIndex] || taskNames[0]!;
    const currentRegion = regions[taskIndex] || regions[0]!;
    const currentCompany = companies[taskIndex] || companies[0]!;
    
    const [selectedRegion, selectedCompany, selectedAirport] = forecastCascaderValue;
    
    // 如果选择了地区，检查地区是否匹配
    if (selectedRegion && currentRegion !== selectedRegion) {
      return false;
    }
    
    // 如果选择了公司，检查公司是否匹配
    if (selectedCompany && !currentCompany.includes(selectedCompany)) {
      return false;
    }
    
    // 如果选择了机场，检查任务名称是否包含该机场信息
    if (selectedAirport && !currentTaskName.includes(selectedAirport)) {
      return false;
    }
    
    return true;
  };

  // 预测数据筛选和分页
  const filteredForecastData = forecastData.filter((item, index) => {
    // 根据索引确定任务名称和算法（简化逻辑）
    const taskIndex = Math.floor(index / 12);
    const taskNames = ["华东地区2024年销售预测", "华南地区年度预测分析", "华北地区季度预测", "全国销售深度预测"];
    const algorithms = ["线性回归", "ARIMA模型", "指数平滑", "LSTM神经网络"];
    
    const currentTaskName = taskNames[taskIndex] || taskNames[0]!;
    const currentAlgorithm = algorithms[taskIndex] || algorithms[0]!;
    
    // 级联筛选
    const matchesCascader = matchesForecastCascaderFilter(item, index);
    
    // 传统筛选
    const matchesTaskName = !filterTaskName || filterTaskName === "all" || currentTaskName.includes(filterTaskName);
    const matchesAlgorithm = !filterAlgorithm || filterAlgorithm === "all" || currentAlgorithm.includes(filterAlgorithm);
    const matchesDateRange = (!filterStartDate || item.month >= filterStartDate) && 
                            (!filterEndDate || item.month <= filterEndDate);
    
    // 优先使用级联筛选，如果没有级联选择则使用传统筛选
    const taskNameMatch = forecastCascaderValue.length > 0 ? matchesCascader : matchesTaskName;
    
    return taskNameMatch && matchesAlgorithm && matchesDateRange;
  });
  
  const forecastTotalPages = Math.ceil(filteredForecastData.length / forecastPreviewPageSize);
  const forecastStartIndex = (forecastPreviewPage - 1) * forecastPreviewPageSize;
  const forecastEndIndex = forecastStartIndex + forecastPreviewPageSize;
  const currentForecastPageData = filteredForecastData.slice(forecastStartIndex, forecastEndIndex);
  
  // 计算加权综合预测
  const calculateWeightedForecast = (month: string) => {
    const enabledModels = weightConfig.models.filter(model => model.enabled);
    const totalWeight = enabledModels.reduce((sum, model) => sum + model.weight, 0);
    
    if (totalWeight === 0) return null;
    
    // 基于月份和地区生成更真实的预测值
    const monthParts = month.split('-');
    const monthIndex = monthParts[1] ? parseInt(monthParts[1]) - 1 : 0;
    const regionFactors: Record<string, number> = {
      "华东": 1.0,
      "华南": 0.85,
      "华北": 0.75,
      "全国": 1.2
    };
    const regionFactor = regionFactors[weightConfig.region] || 1.0;
    
    // 季节性调整因子
    const seasonalFactors = [0.9, 0.85, 1.0, 1.1, 1.2, 1.3, 1.25, 1.2, 1.1, 1.0, 0.95, 0.9];
    const seasonalFactor = seasonalFactors[monthIndex] || 1.0;
    
    // 不同模型的预测值（基于真实业务逻辑）
    const modelPredictions = {
      "线性回归": Math.round((1000 + monthIndex * 20) * seasonalFactor * regionFactor + Math.random() * 50),
      "ARIMA模型": Math.round((980 + monthIndex * 15) * seasonalFactor * regionFactor + Math.random() * 40),
      "指数平滑": Math.round((1020 + monthIndex * 25) * seasonalFactor * regionFactor + Math.random() * 60),
      "LSTM神经网络": Math.round((1010 + monthIndex * 18) * seasonalFactor * regionFactor + Math.random() * 80),
      "Prophet时间序列": Math.round((990 + monthIndex * 22) * seasonalFactor * regionFactor + Math.random() * 70)
    };
    
    let weightedSum = 0;
    enabledModels.forEach(model => {
      const prediction = modelPredictions[model.name as keyof typeof modelPredictions] || 1000;
      weightedSum += (prediction * model.weight) / 100;
    });
    
    return Math.round(weightedSum);
  };

  // 验证权重配置
  const validateWeightConfig = () => {
    const enabledModels = weightConfig.models.filter(model => model.enabled);
    const totalWeight = enabledModels.reduce((sum, model) => sum + model.weight, 0);
    return {
      isValid: totalWeight === 100,
      totalWeight,
      message: totalWeight === 100 ? "权重配置正确" : `权重总和应为100%，当前为${totalWeight}%`
    };
  };

  // 获取当前分析数据
  const getCurrentAnalysisData = () => {
    const regionData = (analysisData.regions as any)[selectedRegion];
    if (!regionData) return [];
    
    if (analysisLevel === "region") {
      // 返回该地区所有数据
      const allData: any[] = [];
      Object.values(regionData.companies).forEach((company: any) => {
        Object.values(company.airports).forEach((airport: any) => {
          allData.push(...airport.data);
        });
      });
      return allData;
    } else if (analysisLevel === "company") {
      const companyData = (regionData.companies as any)[selectedCompany];
      if (!companyData) return [];
      
      const allData: any[] = [];
      Object.values(companyData.airports).forEach((airport: any) => {
        allData.push(...airport.data);
      });
      return allData;
    } else if (analysisLevel === "airport") {
      const companyData = (regionData.companies as any)[selectedCompany];
      if (!companyData) return [];
      
      const airportData = (companyData.airports as any)[selectedAirport];
      return airportData ? airportData.data : [];
    }
    
    return [];
  };

  // 过滤分析数据
  const getFilteredAnalysisData = () => {
    let data = getCurrentAnalysisData();
    
    // 如果启用了多模型加权分析，则按启用的模型算法过滤
    if (showWeightedForecast) {
      const enabledAlgorithms = weightConfig.models
        .filter(model => model.enabled)
        .map(model => model.name);
      data = data.filter((item: any) => enabledAlgorithms.includes(item.algorithm));
    }
    
    // 按时间范围过滤
    const months = parseInt(analysisTimeRange);
    if (months > 0) {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
      data = data.filter((item: any) => {
        const itemDate = new Date(item.month + "-01");
        return itemDate >= cutoffDate;
      });
    }
    
    return data;
  };

  // 导出分析数据
  const exportAnalysisData = () => {
    const data = getFilteredAnalysisData();
    const csvContent = [
      "月份,实际完成值,预测值,预测值同比,预测值环比,去年同期,预测偏差率,迭代次数,算法",
      ...data.map((item: any) => 
        `${item.month},${item.actual},${item.predicted},${(item.predictedYoy * 100).toFixed(2)}%,${(item.predictedMom * 100).toFixed(2)}%,${item.lastYearSame},${(item.deviation * 100).toFixed(2)}%,${item.iteration},${item.algorithm}`
      )
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `预测分析数据_${selectedRegion}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 自动调整权重
  const autoAdjustWeights = () => {
    const enabledModels = weightConfig.models.filter(model => model.enabled);
    if (enabledModels.length === 0) return;
    
    const totalWeight = enabledModels.reduce((sum, model) => sum + model.weight, 0);
    const adjustmentFactor = 100 / totalWeight;
    
    const newModels = weightConfig.models.map(model => {
      if (model.enabled) {
        return { ...model, weight: Math.round(model.weight * adjustmentFactor) };
      }
      return model;
    });
    
    setWeightConfig(prev => ({ ...prev, models: newModels }));
  };

  // 执行预测
  const executeForecast = () => {
    setIsExecuting(true);
    setExecutionLogs([]);
    
    // 模拟执行过程
    const logs = [
      "开始执行预测任务...",
      "正在加载样本数据...",
      "数据预处理完成，共处理 20 条记录",
      "正在训练线性回归模型...",
      "模型训练完成，R² = 0.85",
      "正在生成预测结果...",
      "预测完成，生成 12 个月预测数据",
      "正在计算置信区间...",
      "置信区间计算完成",
      "预测任务执行成功！"
    ];
    
    const startTime = Date.now();
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < logs.length) {
        setExecutionLogs(prev => [...prev, logs[currentIndex]!]);
        currentIndex++;
      } else {
        clearInterval(interval);
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        // 添加历史记录
        const newRecord = {
          id: Date.now().toString(),
          taskName: taskName || "未命名预测任务",
          timestamp: new Date().toLocaleString(),
          algorithm: "线性回归",
          duration: `${duration}秒`,
          status: "成功",
          sampleCount: 20,
          predictionMonths: 12,
          accuracy: "85%"
        };
        
        setExecutionHistory(prev => [newRecord, ...prev]);
        setIsExecuting(false);
        setForecastData(staticForecastData);
        setActiveMenu("forecast-preview");
      }
    }, 800);
  };

  // 样本文件列表状态
  const [sampleFiles, setSampleFiles] = useState([
    {
      id: "1",
      name: "华东地区2024年1月样本数据.xlsx",
      uploadTime: "2024-01-05 14:30:00",
      timeRange: "2024-01-01 至 2024-01-31",
      sampleType: "历史销售数据",
      description: "华东地区冬季航空汽油销售数据，包含节假日和周末数据",
      size: "2.5MB"
    },
    {
      id: "2", 
      name: "华南地区2023年样本数据.xlsx",
      uploadTime: "2024-01-03 10:15:00",
      timeRange: "2023-01-01 至 2023-12-31",
      sampleType: "年度汇总数据",
      description: "华南地区全年航空汽油销售汇总，按季度和月份统计",
      size: "5.2MB"
    }
  ]);

  // 上传表单状态
  const [uploadForm, setUploadForm] = useState({
    timeRange: "",
    sampleType: "",
    description: ""
  });

  // 处理文件上传
  const handleFileUpload = () => {
    const newFile = {
      id: Date.now().toString(),
      name: "新上传样本数据.xlsx",
      uploadTime: new Date().toLocaleString(),
      timeRange: uploadForm.timeRange,
      sampleType: uploadForm.sampleType,
      description: uploadForm.description,
      size: "1.8MB"
    };
    
    setSampleFiles([newFile, ...sampleFiles]);
    setUploadForm({ timeRange: "", sampleType: "", description: "" });
  };

  // 删除文件
  const handleDeleteFile = (fileId: string) => {
    setSampleFiles(sampleFiles.filter(file => file.id !== fileId));
  };

  // 处理预测结果搜索
  const handleForecastSearch = () => {
    setIsSearching(true);
    
    // 模拟搜索过程
    setTimeout(() => {
      setIsSearching(false);
      // 这里可以添加实际的搜索逻辑，比如调用API
      console.log("搜索条件:", {
        cascader: forecastCascaderValue,
        taskName: filterTaskName,
        algorithm: filterAlgorithm,
        startDate: filterStartDate,
        endDate: filterEndDate
      });
    }, 500);
  };

  // 重置预测结果筛选条件
  const handleForecastReset = () => {
    setForecastCascaderValue([]);
    setFilterTaskName("");
    setFilterAlgorithm("");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  // 渲染内容区域
  const renderContent = () => {
    switch (activeMenu) {
      case "upload":
        return (
          <div className="space-y-6">
            {/* 上传表单 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadIcon className="w-5 h-5" />
                  上传样本数据
                </CardTitle>
                <CardDescription>
                  上传Excel文件并填写样本信息
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 文件上传区域 */}
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8">
                  <div className="text-center">
                    <UploadIcon className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <h3 className="text-lg font-medium mb-2">拖拽文件到此处或点击上传</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      支持 .xlsx 和 .xls 格式，文件大小不超过 10MB
                    </p>
                    <Button>选择文件</Button>
                  </div>
                </div>

                {/* 样本信息表单 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeRange">样本时间段</Label>
                    <Input
                      id="timeRange"
                      placeholder="例如：2024-01-01 至 2024-12-31"
                      value={uploadForm.timeRange}
                      onChange={(e) => setUploadForm({...uploadForm, timeRange: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sampleType">样本类型</Label>
                    <Select 
                      value={uploadForm.sampleType} 
                      onValueChange={(value) => setUploadForm({...uploadForm, sampleType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择样本类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="历史销售数据">历史销售数据</SelectItem>
                        <SelectItem value="年度汇总数据">年度汇总数据</SelectItem>
                        <SelectItem value="季度数据">季度数据</SelectItem>
                        <SelectItem value="月度数据">月度数据</SelectItem>
                        <SelectItem value="其他">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">样本描述</Label>
                  <Input
                    id="description"
                    placeholder="请描述样本数据的内容、来源、特点等"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                  />
                </div>

                <Button onClick={handleFileUpload} className="w-full">
                  上传样本
                </Button>
              </CardContent>
            </Card>

            {/* 样本文件列表 */}
            <Card>
              <CardHeader>
                <CardTitle>样本文件列表</CardTitle>
                <CardDescription>
                  已上传的样本文件，支持下载和删除
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sampleFiles.length > 0 ? (
                  <div className="space-y-4">
                    {sampleFiles.map((file) => (
                      <div key={file.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileTextIcon className="w-5 h-5 text-blue-600" />
                              <h4 className="font-medium">{file.name}</h4>
                              <Badge variant="outline">{file.size}</Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
                              <div><strong>上传时间：</strong>{file.uploadTime}</div>
                              <div><strong>时间段：</strong>{file.timeRange}</div>
                              <div><strong>类型：</strong>{file.sampleType}</div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              <strong>描述：</strong>{file.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button variant="outline" size="sm">
                              <DownloadIcon className="w-4 h-4 mr-1" />
                              下载
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteFile(file.id)}
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              删除
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    暂无样本文件
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case "preview":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="w-5 h-5" />
                样本数据查询
              </CardTitle>
              <CardDescription>
                按样本类型查看和管理销售数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 筛选条件 */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>样本类型</Label>
                  <Select 
                    value={filterSeason} 
                    onValueChange={setFilterSeason}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择样本类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类型</SelectItem>
                      <SelectItem value="历史销售数据">历史销售数据</SelectItem>
                      <SelectItem value="年度汇总数据">年度汇总数据</SelectItem>
                      <SelectItem value="季度数据">季度数据</SelectItem>
                      <SelectItem value="月度数据">月度数据</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>地区</Label>
                  <CascaderPro
                    options={cascaderOptions}
                    value={cascaderValue}
                    onChange={setCascaderValue}
                    placeholder="选择地区/公司/机场"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>开始时间</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="选择开始日期"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>结束时间</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="选择结束日期"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button variant="default" className="w-full">
                    <SearchIcon className="w-4 h-4 mr-2" />
                    搜索
                  </Button>
                </div>
              </div>

              {/* 数据统计 */}
              <div className="flex items-center gap-4">
                <Badge variant="secondary">总记录数: {filteredData.length}</Badge>
                <Badge variant="outline">当前页: 1/3</Badge>
              </div>

              {/* 数据表格 */}
              {filteredData.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日期</TableHead>
                        <TableHead>销量(万升)</TableHead>
                        <TableHead>价格(元/升)</TableHead>
                        <TableHead>地区</TableHead>
                        <TableHead>季节</TableHead>
                        <TableHead>天气</TableHead>
                        <TableHead>事件</TableHead>
                        <TableHead>备注</TableHead>
                        <TableHead>所属样本文件</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.slice(0, 10).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.sales_volume}</TableCell>
                          <TableCell>{item.price}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.region}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.season}</Badge>
                          </TableCell>
                          <TableCell>{item.weather}</TableCell>
                          <TableCell>{item.events}</TableCell>
                          <TableCell className="max-w-xs truncate" title={item.notes}>
                            {item.notes}
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={item.sampleFile}>
                            <div className="flex items-center gap-2">
                              <FileTextIcon className="w-4 h-4 text-blue-600" />
                              <span className="text-sm">{item.sampleFile}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  没有找到匹配的数据
                </div>
              )}

              {/* 分页 */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  显示 1-10 条，共 {filteredData.length} 条记录
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    上一页
                  </Button>
                  <Button variant="default" size="sm">1</Button>
                  <Button variant="outline" size="sm">2</Button>
                  <Button variant="outline" size="sm">3</Button>
                  <Button variant="outline" size="sm">
                    下一页
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case "forecast":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="w-5 h-5" />
                执行预测
              </CardTitle>
              <CardDescription>
                选择算法和样本数据执行销售预测
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 任务名称 */}
              <div className="space-y-2">
                <Label htmlFor="taskName">任务名称</Label>
                <Input
                  id="taskName"
                  placeholder="请输入预测任务名称，例如：华东地区2024年销售预测"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                />
              </div>
              
              {/* 预测配置 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">预测配置</h3>
                  
                  <div className="space-y-2">
                    <Label>预测算法</Label>
                    <Select defaultValue="linear">
                      <SelectTrigger>
                        <SelectValue placeholder="选择预测算法" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear">线性回归</SelectItem>
                        <SelectItem value="polynomial">多项式回归</SelectItem>
                        <SelectItem value="exponential">指数平滑</SelectItem>
                        <SelectItem value="arima">ARIMA模型</SelectItem>
                        <SelectItem value="lstm">LSTM神经网络</SelectItem>
                        <SelectItem value="prophet">Prophet时间序列</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>预测时长</Label>
                    <Select defaultValue="12">
                      <SelectTrigger>
                        <SelectValue placeholder="选择预测时长" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6个月</SelectItem>
                        <SelectItem value="12">12个月</SelectItem>
                        <SelectItem value="18">18个月</SelectItem>
                        <SelectItem value="24">24个月</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>置信度水平</Label>
                    <Select defaultValue="95">
                      <SelectTrigger>
                        <SelectValue placeholder="选择置信度" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90">90%</SelectItem>
                        <SelectItem value="95">95%</SelectItem>
                        <SelectItem value="99">99%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>季节性处理</Label>
                    <Select defaultValue="auto">
                      <SelectTrigger>
                        <SelectValue placeholder="选择季节性处理" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无季节性</SelectItem>
                        <SelectItem value="auto">自动检测</SelectItem>
                        <SelectItem value="additive">加法季节性</SelectItem>
                        <SelectItem value="multiplicative">乘法季节性</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">样本数据选择</h3>
                  
                  <div className="space-y-2">
                    <Label>样本文件</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue placeholder="选择样本文件" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">使用所有样本数据</SelectItem>
                        <SelectItem value="file1">华东地区2024年1月样本数据.xlsx</SelectItem>
                        <SelectItem value="file2">华南地区2023年样本数据.xlsx</SelectItem>
                        <SelectItem value="file3">华北地区2023年样本数据.xlsx</SelectItem>
                        <SelectItem value="file4">华东地区2023年年度汇总.xlsx</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>数据时间范围</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        placeholder="开始日期"
                        defaultValue="2023-01-01"
                      />
                      <Input
                        type="date"
                        placeholder="结束日期"
                        defaultValue="2024-01-05"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>数据预处理</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="remove-outliers" defaultChecked />
                        <Label htmlFor="remove-outliers">移除异常值</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="normalize" defaultChecked />
                        <Label htmlFor="normalize">数据标准化</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="fill-missing" defaultChecked />
                        <Label htmlFor="fill-missing">填充缺失值</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 执行按钮 */}
              <div className="flex justify-center">
                <Button 
                  onClick={executeForecast} 
                  size="lg" 
                  className="px-8"
                  disabled={isExecuting}
                >
                  {isExecuting ? (
                    <>
                      <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      执行中...
                    </>
                  ) : (
                    <>
                      <TrendingUpIcon className="w-5 h-5 mr-2" />
                      开始执行预测
                    </>
                  )}
                </Button>
              </div>
              
              {/* 执行日志和历史记录 */}
              <div className="mt-6 space-y-6">
                {/* 执行日志 */}
                {(isExecuting || executionLogs.length > 0) && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">执行日志</h3>
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                      {executionLogs.length === 0 ? (
                        <div className="flex items-center gap-2 text-slate-500">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span>准备执行...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {executionLogs.map((log, index) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              <span className="text-slate-400 font-mono">
                                [{new Date().toLocaleTimeString()}]
                              </span>
                              <span className="text-slate-700 dark:text-slate-300">
                                {log}
                              </span>
                              {index === executionLogs.length - 1 && isExecuting && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* 执行状态 */}
                    {!isExecuting && executionLogs.length > 0 && (
                      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium">预测执行完成</span>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                          已生成预测结果，可在"预测结果查询"中查看详细结果
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 历史执行记录 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">历史执行记录</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      {showHistory ? "收起" : "展开"}
                    </Button>
                  </div>
                  
                  {showHistory && (
                    <div className="space-y-4">
                      <div className="border rounded-lg">
                        <Table>
                                                  <TableHeader>
                          <TableRow>
                            <TableHead>任务名称</TableHead>
                            <TableHead>执行时间</TableHead>
                            <TableHead>算法</TableHead>
                            <TableHead>执行时长</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>样本数</TableHead>
                            <TableHead>预测月数</TableHead>
                            <TableHead>准确率</TableHead>
                            <TableHead>操作</TableHead>
                          </TableRow>
                        </TableHeader>
                          <TableBody>
                            {currentPageData.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell className="max-w-xs truncate" title={record.taskName}>
                                  {record.taskName}
                                </TableCell>
                                <TableCell className="text-sm">{record.timestamp}</TableCell>
                                <TableCell>{record.algorithm}</TableCell>
                                <TableCell>{record.duration}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={record.status === "成功" ? "default" : "destructive"}
                                  >
                                    {record.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{record.sampleCount}</TableCell>
                                <TableCell>{record.predictionMonths}</TableCell>
                                <TableCell>{record.accuracy}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm">
                                      <FileTextIcon className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="sm">
                                      <DownloadIcon className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* 分页控件 */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            显示 {startIndex + 1}-{Math.min(endIndex, executionHistory.length)} 条，共 {executionHistory.length} 条记录
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                            >
                              上一页
                            </Button>
                            
                            {/* 页码按钮 */}
                            <div className="flex items-center gap-1">
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <Button
                                  key={page}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                  className="w-8 h-8 p-0"
                                >
                                  {page}
                                </Button>
                              ))}
                            </div>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                            >
                              下一页
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case "forecast-preview":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3Icon className="w-5 h-5" />
                    预测结果查询
                  </CardTitle>
                  <CardDescription>
                    查看和管理预测结果数据
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {/* 预测结果查询页面不再包含多模型加权预测功能 */}
                </div>
              </div>
            </CardHeader>
            
            {/* 数据说明 */}
            <div className="px-6 py-3 bg-blue-50 border-b">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                💡
                <span>系统已预置示例预测数据，您可以直接查看、筛选和分析，无需先执行预测任务</span>
              </div>
            </div>
            
            <CardContent className="space-y-6">
              {/* 筛选条件 */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label>地区</Label>
                  <CascaderPro
                    options={cascaderOptions}
                    value={forecastCascaderValue}
                    onChange={setForecastCascaderValue}
                    placeholder="选择地区/公司/机场"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>任务名称</Label>
                  <Select value={filterTaskName} onValueChange={setFilterTaskName}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择任务名称" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部任务</SelectItem>
                      <SelectItem value="华东">华东地区</SelectItem>
                      <SelectItem value="华南">华南地区</SelectItem>
                      <SelectItem value="华北">华北地区</SelectItem>
                      <SelectItem value="全国">全国销售</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>算法名称</Label>
                  <Select value={filterAlgorithm} onValueChange={setFilterAlgorithm}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择算法" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部算法</SelectItem>
                      <SelectItem value="线性回归">线性回归</SelectItem>
                      <SelectItem value="ARIMA">ARIMA模型</SelectItem>
                      <SelectItem value="指数平滑">指数平滑</SelectItem>
                      <SelectItem value="LSTM">LSTM神经网络</SelectItem>
                      <SelectItem value="Prophet">Prophet时间序列</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>开始时间</Label>
                  <Input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    placeholder="选择开始日期"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>结束时间</Label>
                  <Input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    placeholder="选择结束日期"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      className="flex-1"
                      onClick={handleForecastSearch}
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          搜索中...
                        </>
                      ) : (
                        <>
                          <SearchIcon className="w-4 h-4 mr-2" />
                          搜索
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleForecastReset}
                      title="重置筛选条件"
                    >
                      重置
                    </Button>
                  </div>
                </div>
              </div>

              {/* 数据统计 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">总记录数: {filteredForecastData.length}</Badge>
                  <Badge variant="outline">当前页: {forecastPreviewPage}/{forecastTotalPages}</Badge>
                </div>
                <div className="text-sm text-slate-500">
                  💡 显示示例预测数据，支持筛选和分页查看
                </div>
              </div>

              {/* 预测数据表格 */}
              {filteredForecastData.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>任务名称</TableHead>
                        <TableHead>预测月份</TableHead>
                        <TableHead>预测销量(万升)</TableHead>
                        <TableHead>实际销量(万升)</TableHead>
                        <TableHead>置信度(%)</TableHead>
                        <TableHead>算法</TableHead>
                        <TableHead>地区公司</TableHead>
                        <TableHead>执行时间</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentForecastPageData.map((item, index) => {
                        const globalIndex = forecastStartIndex + index;
                        const taskIndex = Math.floor(globalIndex / 12);
                        const taskNames = ["华东地区2024年销售预测", "华南地区年度预测分析", "华北地区季度预测", "全国销售深度预测"];
                        const algorithms = ["线性回归", "ARIMA模型", "指数平滑", "LSTM神经网络"];
                        const executionTimes = ["2024-01-05 15:30", "2024-01-04 14:20", "2024-01-03 10:15", "2024-01-02 16:45"];
                        const regionCompanies = ["华东", "青岛", "烟台", "华南", "华北", "大连", "济南", "天津", "上海", "南京", "杭州", "广州"];
                        
                        const currentTaskName = taskNames[taskIndex] || taskNames[0]!;
                        const currentAlgorithm = algorithms[taskIndex] || algorithms[0]!;
                        const currentExecutionTime = executionTimes[taskIndex] || executionTimes[0]!;
                        const currentRegionCompany = regionCompanies[globalIndex % regionCompanies.length] || regionCompanies[0]!;
                        
                        return (
                          <TableRow key={globalIndex}>
                            <TableCell className="max-w-xs truncate" title={currentTaskName}>
                              {currentTaskName}
                            </TableCell>
                            <TableCell>{item.month}</TableCell>
                            <TableCell>{item.predicted}</TableCell>
                            <TableCell>{item.actual || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={item.confidence >= 90 ? "default" : item.confidence >= 80 ? "secondary" : "outline"}>
                                {item.confidence}%
                              </Badge>
                            </TableCell>
                            <TableCell>{currentAlgorithm}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{currentRegionCompany}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{currentExecutionTime}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">
                                  <FileTextIcon className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <DownloadIcon className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  暂无符合条件的预测数据
                </div>
              )}

              {/* 分页 */}
              {filteredForecastData.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    显示 {forecastStartIndex + 1}-{Math.min(forecastEndIndex, filteredForecastData.length)} 条，共 {filteredForecastData.length} 条记录
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setForecastPreviewPage(prev => Math.max(1, prev - 1))}
                      disabled={forecastPreviewPage === 1}
                    >
                      上一页
                    </Button>
                    
                    {/* 页码按钮 */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(forecastTotalPages, 5) }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={forecastPreviewPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setForecastPreviewPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setForecastPreviewPage(prev => Math.min(forecastTotalPages, prev + 1))}
                      disabled={forecastPreviewPage === forecastTotalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case "analysis":
        return (
          <div className="space-y-6">
            {/* 页面标题和层级选择 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  预测分析
                </CardTitle>
                <CardDescription>
                  依托模型算法输出，支持地区/合资公司、分公司、机场等层级的多维度预测结果分析
                </CardDescription>
              </CardHeader>
              <CardContent>
                
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>地区</Label>
                    <CascaderPro
                      options={cascaderOptions}
                      value={analysisCascaderValue}
                      onChange={setAnalysisCascaderValue}
                      placeholder="选择地区/公司/机场"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>开始时间</Label>
                    <Input
                      type="date"
                      value={analysisStartDate}
                      onChange={(e) => setAnalysisStartDate(e.target.value)}
                      placeholder="选择开始日期"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>结束时间</Label>
                    <Input
                      type="date"
                      value={analysisEndDate}
                      onChange={(e) => setAnalysisEndDate(e.target.value)}
                      placeholder="选择结束日期"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>多模型加权分析</Label>
                    <Button 
                      variant={showWeightedForecast ? "default" : "outline"}
                      onClick={() => setShowWeightedForecast(!showWeightedForecast)}
                      className="w-full"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {showWeightedForecast ? "隐藏配置" : "显示配置"}
                    </Button>
                  </div>
                </div>
                
                {/* 多模型加权分析配置面板 */}
                {showWeightedForecast && (
                  <div className="mt-6 border rounded-lg p-6 bg-slate-50">
                    {/* 功能说明 */}
                    <div className="mb-6 p-4 border rounded-lg bg-blue-50">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">多模型加权分析配置说明</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>• 支持多个预测模型按权重组合，提高预测准确性</p>
                        <p>• 权重配置可细化至地区/公司层级，不同区域可设置不同权重</p>
                        <p>• 系统自动计算加权综合预测值，并在表格中显示</p>
                        <p>• 提供预设模板（保守型、平衡型、激进型）快速配置</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">多模型加权配置</h3>
                      <div className="flex items-center gap-3">
                        <Badge variant={validateWeightConfig().isValid ? "default" : "destructive"}>
                          总权重: {validateWeightConfig().totalWeight}%
                        </Badge>
                                                 <Select 
                           onValueChange={(template) => {
                             if (template && weightTemplates[template as keyof typeof weightTemplates]) {
                               setWeightConfig(weightTemplates[template as keyof typeof weightTemplates]);
                             }
                           }}
                         >
                           <SelectTrigger className="w-32">
                             <SelectValue placeholder="选择模板" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="保守型">保守型</SelectItem>
                             <SelectItem value="平衡型">平衡型</SelectItem>
                             <SelectItem value="激进型">激进型</SelectItem>
                           </SelectContent>
                         </Select>
                         <Select 
                           onValueChange={(configId) => {
                             const config = savedConfigs.find(c => c.id === configId);
                             if (config) {
                               setWeightConfig({
                                 region: config.region,
                                 company: config.company,
                                 models: config.models
                               });
                             }
                           }}
                         >
                           <SelectTrigger className="w-40">
                             <SelectValue placeholder="选择保存的配置" />
                           </SelectTrigger>
                           <SelectContent>
                             {savedConfigs.map((config) => (
                               <SelectItem key={config.id} value={config.id}>
                                 {config.name}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                      </div>
                    </div>
                    
                    {/* 权重验证提示 */}
                    {!validateWeightConfig().isValid && (
                      <div className="mb-4 p-3 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-red-600">
                            ⚠️ {validateWeightConfig().message}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={autoAdjustWeights}
                          >
                            自动调整
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 地区公司配置 */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">权重配置地区</Label>
                          <Select 
                            value={weightConfig.region} 
                            onValueChange={(value) => setWeightConfig(prev => ({ ...prev, region: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="华东">华东地区</SelectItem>
                              <SelectItem value="华南">华南地区</SelectItem>
                              <SelectItem value="华北">华北地区</SelectItem>
                              <SelectItem value="全国">全国</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">权重配置公司</Label>
                          <Select 
                            value={weightConfig.company} 
                            onValueChange={(value) => setWeightConfig(prev => ({ ...prev, company: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="华东航空燃料有限公司">华东航空燃料有限公司</SelectItem>
                              <SelectItem value="华南航空燃料有限公司">华南航空燃料有限公司</SelectItem>
                              <SelectItem value="华北航空燃料有限公司">华北航空燃料有限公司</SelectItem>
                              <SelectItem value="全国航空燃料集团">全国航空燃料集团</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* 模型权重配置 */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">模型权重配置</Label>
                        {weightConfig.models.map((model, index) => {
                          const performance = modelPerformanceData[model.name as keyof typeof modelPerformanceData];
                          return (
                            <div key={model.name} className="p-3 border rounded-lg bg-white">
                              <div className="flex items-center gap-3 mb-2">
                                <input
                                  type="checkbox"
                                  checked={model.enabled}
                                  onChange={(e) => {
                                    const newModels = [...weightConfig.models];
                                    newModels[index] = { ...model, enabled: e.target.checked };
                                    setWeightConfig(prev => ({ ...prev, models: newModels }));
                                  }}
                                  className="w-4 h-4"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{model.name}</div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    准确率: {performance?.accuracy}% | 训练时间: {performance?.trainingTime}
                                  </div>
                                </div>
                                <div className="text-sm font-medium">{model.weight}%</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={model.weight}
                                  onChange={(e) => {
                                    const newModels = [...weightConfig.models];
                                    newModels[index] = { ...model, weight: parseInt(e.target.value) };
                                    setWeightConfig(prev => ({ ...prev, models: newModels }));
                                  }}
                                  className="flex-1"
                                  disabled={!model.enabled}
                                />
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={model.weight}
                                  onChange={(e) => {
                                    const newModels = [...weightConfig.models];
                                    newModels[index] = { ...model, weight: parseInt(e.target.value) || 0 };
                                    setWeightConfig(prev => ({ ...prev, models: newModels }));
                                  }}
                                  className="w-16 text-sm border rounded px-2 py-1"
                                  disabled={!model.enabled}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                                         {/* 配置列表 */}
                     {showConfigList && (
                       <div className="mt-4 p-4 border rounded-lg bg-slate-50">
                         <div className="flex items-center justify-between mb-3">
                           <h5 className="text-sm font-medium">保存的配置列表</h5>
                           <div className="flex items-center gap-2">
                             {selectedConfigs.length > 0 && (
                               <Button 
                                 variant="destructive" 
                                 size="sm"
                                 onClick={() => {
                                   setSavedConfigs(prev => prev.filter(c => !selectedConfigs.includes(c.id)));
                                   setSelectedConfigs([]);
                                 }}
                               >
                                 删除选中 ({selectedConfigs.length})
                               </Button>
                             )}
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => setShowConfigList(false)}
                             >
                               关闭
                             </Button>
                           </div>
                         </div>
                         <div className="mb-3">
                           <Input
                             placeholder="搜索配置名称或描述..."
                             value={configSearchTerm}
                             onChange={(e) => setConfigSearchTerm(e.target.value)}
                             className="w-full"
                           />
                           <div className="text-xs text-slate-500 mt-1">
                             找到 {savedConfigs.filter(config => 
                               config.name.toLowerCase().includes(configSearchTerm.toLowerCase()) ||
                               config.description.toLowerCase().includes(configSearchTerm.toLowerCase()) ||
                               config.region.toLowerCase().includes(configSearchTerm.toLowerCase()) ||
                               config.company.toLowerCase().includes(configSearchTerm.toLowerCase())
                             ).length} 个配置
                           </div>
                         </div>
                         <div className="space-y-2">
                           {savedConfigs
                             .filter(config => 
                               config.name.toLowerCase().includes(configSearchTerm.toLowerCase()) ||
                               config.description.toLowerCase().includes(configSearchTerm.toLowerCase()) ||
                               config.region.toLowerCase().includes(configSearchTerm.toLowerCase()) ||
                               config.company.toLowerCase().includes(configSearchTerm.toLowerCase())
                             )
                             .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
                             .map((config) => (
                               <div key={config.id} className="p-3 border rounded-lg bg-white">
                                 <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                     <input
                                       type="checkbox"
                                       checked={selectedConfigs.includes(config.id)}
                                       onChange={(e) => {
                                         if (e.target.checked) {
                                           setSelectedConfigs(prev => [...prev, config.id]);
                                         } else {
                                           setSelectedConfigs(prev => prev.filter(id => id !== config.id));
                                         }
                                       }}
                                       className="w-4 h-4"
                                     />
                                     <div className="flex-1">
                                       <div className="text-sm font-medium">{config.name}</div>
                                       <div className="text-xs text-slate-500 mt-1">{config.description}</div>
                                       <div className="text-xs text-slate-400 mt-1">
                                         {config.region} - {config.company} | 准确率: {config.accuracy}% | 更新: {config.lastUpdated}
                                       </div>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => {
                                         setWeightConfig({
                                           region: config.region,
                                           company: config.company,
                                           models: config.models
                                         });
                                         setShowConfigList(false);
                                       }}
                                     >
                                       选择
                                     </Button>
                                     <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => {
                                         setEditingConfig(config.id);
                                         setConfigName(config.name);
                                         setConfigDescription(config.description);
                                       }}
                                     >
                                       编辑
                                     </Button>
                                     <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => {
                                         const newConfig = {
                                           ...config,
                                           id: Date.now().toString(),
                                           name: `${config.name} - 副本`,
                                           lastUpdated: new Date().toISOString().split('T')[0] ?? new Date().toLocaleDateString()
                                         };
                                         setSavedConfigs(prev => [...prev, newConfig]);
                                       }}
                                     >
                                       复制
                                     </Button>
                                     <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => {
                                         const configData = JSON.stringify(config, null, 2);
                                         const blob = new Blob([configData], { type: 'application/json' });
                                         const url = URL.createObjectURL(blob);
                                         const a = document.createElement('a');
                                         a.href = url;
                                         a.download = `${config.name}.json`;
                                         document.body.appendChild(a);
                                         a.click();
                                         document.body.removeChild(a);
                                         URL.revokeObjectURL(url);
                                       }}
                                     >
                                       导出
                                     </Button>
                                     <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => {
                                         setSavedConfigs(prev => prev.filter(c => c.id !== config.id));
                                       }}
                                     >
                                       删除
                                     </Button>
                                   </div>
                                 </div>
                               </div>
                             ))}
                         </div>
                       </div>
                     )}
                     
                     {/* 保存配置对话框 */}
                     {showSaveDialog && (
                       <div className="mt-4 p-4 border rounded-lg bg-blue-50">
                         <h5 className="text-sm font-medium mb-3">
                           {editingConfig ? "编辑配置" : "保存当前配置"}
                         </h5>
                         <div className="space-y-3">
                           <div>
                             <Label className="text-sm">配置名称</Label>
                             <Input
                               value={configName}
                               onChange={(e) => setConfigName(e.target.value)}
                               placeholder="请输入配置名称"
                               className="mt-1"
                             />
                           </div>
                           <div>
                             <Label className="text-sm">配置描述</Label>
                             <Input
                               value={configDescription}
                               onChange={(e) => setConfigDescription(e.target.value)}
                               placeholder="请输入配置描述"
                               className="mt-1"
                             />
                           </div>
                           <div className="flex items-center gap-2">
                             <Button
                               size="sm"
                               onClick={() => {
                                 if (configName.trim()) {
                                   if (editingConfig) {
                                     // 编辑现有配置
                                     setSavedConfigs(prev => prev.map(config => 
                                       config.id === editingConfig 
                                         ? {
                                             ...config,
                                             name: configName,
                                             description: configDescription,
                                             region: weightConfig.region,
                                             company: weightConfig.company,
                                             models: weightConfig.models,
                                             accuracy: Math.round(weightConfig.models.filter(m => m.enabled).reduce((sum, m) => {
                                               const performance = modelPerformanceData[m.name as keyof typeof modelPerformanceData];
                                               return sum + (performance?.accuracy ?? 0) * m.weight / 100;
                                             }, 0) * 10) / 10,
                                             lastUpdated: new Date().toISOString().split('T')[0] ?? new Date().toLocaleDateString()
                                           }
                                         : config
                                     ));
                                     setEditingConfig(null);
                                   } else {
                                     // 保存新配置
                                     const newConfig = {
                                       id: Date.now().toString(),
                                       name: configName,
                                       description: configDescription,
                                       region: weightConfig.region,
                                       company: weightConfig.company,
                                       models: weightConfig.models,
                                       accuracy: Math.round(weightConfig.models.filter(m => m.enabled).reduce((sum, m) => {
                                         const performance = modelPerformanceData[m.name as keyof typeof modelPerformanceData];
                                         return sum + (performance?.accuracy ?? 0) * m.weight / 100;
                                       }, 0) * 10) / 10,
                                       lastUpdated: new Date().toISOString().split('T')[0] ?? new Date().toLocaleDateString()
                                     };
                                     setSavedConfigs(prev => [...prev, newConfig]);
                                   }
                                   setConfigName("");
                                   setConfigDescription("");
                                   setShowSaveDialog(false);
                                 }
                               }}
                             >
                               {editingConfig ? "更新" : "保存"}
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => {
                                 setConfigName("");
                                 setConfigDescription("");
                                 setEditingConfig(null);
                                 setShowSaveDialog(false);
                               }}
                             >
                               取消
                             </Button>
                           </div>
                         </div>
                       </div>
                     )}
                     
                     {/* 操作按钮 */}
                     <div className="mt-6 flex items-center justify-between">
                       <div className="text-sm text-slate-600">
                         配置将自动保存到 {weightConfig.region} - {weightConfig.company}
                       </div>
                       <div className="flex items-center gap-3">
                         <Button 
                           variant="outline" 
                           size="sm"
                           onClick={() => setShowConfigList(!showConfigList)}
                         >
                           <FileTextIcon className="w-4 h-4 mr-2" />
                           配置列表
                         </Button>
                         <Button 
                           variant="outline" 
                           size="sm"
                           onClick={() => setShowSaveDialog(true)}
                         >
                           <UploadIcon className="w-4 h-4 mr-2" />
                           保存配置
                         </Button>
                       </div>
                     </div>
                     
                     {/* 配置统计信息 */}
                     <div className="mt-4 p-4 border rounded-lg bg-blue-50">
                       <h5 className="text-sm font-medium mb-3">配置统计信息</h5>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div className="text-center">
                           <div className="text-lg font-bold text-blue-600">
                             {weightConfig.models.filter(m => m.enabled).length}
                           </div>
                           <div className="text-xs text-slate-600">启用模型数</div>
                         </div>
                         <div className="text-center">
                           <div className="text-lg font-bold text-green-600">
                             {validateWeightConfig().totalWeight}%
                           </div>
                           <div className="text-xs text-slate-600">权重总和</div>
                         </div>
                         <div className="text-center">
                           <div className="text-lg font-bold text-purple-600">
                             {Math.round(weightConfig.models.filter(m => m.enabled).reduce((sum, m) => {
                               const performance = modelPerformanceData[m.name as keyof typeof modelPerformanceData];
                               return sum + (performance?.accuracy ?? 0) * m.weight / 100;
                             }, 0) * 10) / 10}%
                           </div>
                           <div className="text-xs text-slate-600">预期准确率</div>
                         </div>
                         <div className="text-center">
                           <div className="text-lg font-bold text-orange-600">
                             {weightConfig.models.filter(m => m.enabled).reduce((sum, m) => {
                               const performance = modelPerformanceData[m.name as keyof typeof modelPerformanceData];
                               return sum + (parseInt(performance?.trainingTime.replace(/[^-\d]/g, '') ?? '0') * m.weight / 100);
                             }, 0).toFixed(0)}秒
                           </div>
                           <div className="text-xs text-slate-600">平均训练时间</div>
                         </div>
                       </div>
                     </div>
                     
                     {/* 配置状态提示 */}
                     <div className="mt-4 p-3 border rounded-lg bg-green-50">
                       <div className="flex items-center justify-between">
                         <div className="text-sm text-green-700">
                           ✅ 权重配置已就绪，可在下方表格中查看加权预测结果
                         </div>
                         <div className="text-sm text-green-600">
                           已保存 {savedConfigs.length} 个配置
                         </div>
                       </div>
                     </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 1. 预测结果偏差分析 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUpIcon className="w-5 h-5" />
                      预测结果偏差分析
                    </CardTitle>
                    <CardDescription>
                      整合各公司上月预测与实际偏差及本月预测数据，多维呈现关键指标
                    </CardDescription>
                  </div>
                  <Button onClick={exportAnalysisData} variant="outline">
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    导出数据
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showTrendChart && (
                  <div className="mb-6 p-4 border rounded-lg">
                    <h4 className="text-sm font-medium mb-4">实际与预测趋势对比图</h4>
                    <div className="h-64 bg-slate-50 rounded flex items-center justify-center">
                      <div className="text-center text-slate-500">
                        <TrendingUpIcon className="w-12 h-12 mx-auto mb-2" />
                        <p>趋势图表区域</p>
                        <p className="text-xs">显示实际值与预测值的曲线对比</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                                             <TableRow>
                         <TableHead>月份</TableHead>
                         <TableHead>实际完成值</TableHead>
                         <TableHead>预测值</TableHead>
                         {showWeightedForecast && <TableHead>加权预测值</TableHead>}
                         <TableHead>预测值同比</TableHead>
                         <TableHead>预测值环比</TableHead>
                         <TableHead>去年同期</TableHead>
                         <TableHead>预测偏差率</TableHead>
                         <TableHead>迭代次数</TableHead>
                         <TableHead>算法</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredAnalysisData().map((item: any, index: number) => (
                                                 <TableRow key={index}>
                           <TableCell className="font-medium">{item.month}</TableCell>
                           <TableCell>{item.actual?.toLocaleString()}</TableCell>
                           <TableCell>{item.predicted?.toLocaleString()}</TableCell>
                           {showWeightedForecast && (
                             <TableCell className="font-medium text-blue-600">
                               {calculateWeightedForecast(item.month).toLocaleString()}
                             </TableCell>
                           )}
                           <TableCell className={item.predictedYoy >= 0 ? "text-green-600" : "text-red-600"}>
                             {(item.predictedYoy * 100).toFixed(2)}%
                           </TableCell>
                          <TableCell className={item.predictedMom >= 0 ? "text-green-600" : "text-red-600"}>
                            {(item.predictedMom * 100).toFixed(2)}%
                          </TableCell>
                          <TableCell>{item.lastYearSame?.toLocaleString()}</TableCell>
                          <TableCell className={item.deviation <= 0.05 ? "text-green-600" : item.deviation <= 0.1 ? "text-yellow-600" : "text-red-600"}>
                            {(item.deviation * 100).toFixed(2)}%
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">第{item.iteration}次</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.algorithm}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* 2. 预测完成率分析 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TargetIcon className="w-5 h-5" />
                      预测完成率分析
                    </CardTitle>
                    <CardDescription>
                      源自各公司当月销售量统计及累计销量完成率汇报内容
                    </CardDescription>
                  </div>
                  <Button onClick={exportAnalysisData} variant="outline">
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    导出数据
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>月份</TableHead>
                        <TableHead>实际完成值</TableHead>
                        <TableHead>本月同比</TableHead>
                        <TableHead>本年累计</TableHead>
                        <TableHead>本年同比</TableHead>
                        <TableHead>本年销售预测</TableHead>
                        <TableHead>预测完成率</TableHead>
                        <TableHead>去年同期</TableHead>
                        <TableHead>去年截止同期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredAnalysisData().map((item: any, index: number) => {
                        const yearToDateActual = getFilteredAnalysisData()
                          .filter((d: any) => d.month <= item.month && d.month.startsWith('2024'))
                          .reduce((sum: number, d: any) => sum + d.actual, 0);
                        const yearToDatePredicted = yearToDateActual * 1.15; // 模拟年度预测
                        const completionRate = (yearToDateActual / yearToDatePredicted) * 100;
                        const lastYearToDate = yearToDateActual * 0.92; // 模拟去年同期累计
                        
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.month}</TableCell>
                            <TableCell>{item.actual?.toLocaleString()}</TableCell>
                            <TableCell className={item.predictedYoy >= 0 ? "text-green-600" : "text-red-600"}>
                              {(item.predictedYoy * 100).toFixed(2)}%
                            </TableCell>
                            <TableCell>{yearToDateActual.toLocaleString()}</TableCell>
                            <TableCell className="text-green-600">
                              {((yearToDateActual / lastYearToDate - 1) * 100).toFixed(2)}%
                            </TableCell>
                            <TableCell>{yearToDatePredicted.toLocaleString()}</TableCell>
                            <TableCell className={completionRate >= 90 ? "text-green-600" : completionRate >= 80 ? "text-yellow-600" : "text-red-600"}>
                              {completionRate.toFixed(1)}%
                            </TableCell>
                            <TableCell>{item.lastYearSame?.toLocaleString()}</TableCell>
                            <TableCell>{lastYearToDate.toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* 3. 加油量排名分析 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrophyIcon className="w-5 h-5" />
                      加油量排名分析
                    </CardTitle>
                    <CardDescription>
                      源自上月与上上月排名前十机场汇报内容，支持TopX排名对比分析
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="10">
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Top5</SelectItem>
                        <SelectItem value="10">Top10</SelectItem>
                        <SelectItem value="15">Top15</SelectItem>
                        <SelectItem value="20">Top20</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={exportAnalysisData} variant="outline">
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      导出数据
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showTrendChart && (
                  <div className="mb-6 p-4 border rounded-lg">
                    <h4 className="text-sm font-medium mb-4">加油量排名趋势图</h4>
                    <div className="h-64 bg-slate-50 rounded flex items-center justify-center">
                      <div className="text-center text-slate-500">
                        <TrophyIcon className="w-12 h-12 mx-auto mb-2" />
                        <p>排名趋势图表区域</p>
                        <p className="text-xs">显示Top机场加油量变化趋势</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">排名</TableHead>
                        <TableHead>机场名称</TableHead>
                        <TableHead>地区</TableHead>
                        <TableHead>当月加油量</TableHead>
                        <TableHead>上月加油量</TableHead>
                        <TableHead>环比变化</TableHead>
                        <TableHead>同比变化</TableHead>
                        <TableHead>市场占比</TableHead>
                        <TableHead>排名变化</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        {
                          rank: 1,
                          airport: "上海浦东机场",
                          region: "华东",
                          current: 1250,
                          lastMonth: 1200,
                          mom: 0.042,
                          yoy: 0.08,
                          marketShare: 15.2,
                          rankChange: 0
                        },
                        {
                          rank: 2,
                          airport: "广州白云机场",
                          region: "华南",
                          current: 1150,
                          lastMonth: 1180,
                          mom: -0.025,
                          yoy: 0.06,
                          marketShare: 14.1,
                          rankChange: 1
                        },
                        {
                          rank: 3,
                          airport: "北京首都机场",
                          region: "华北",
                          current: 1100,
                          lastMonth: 1050,
                          mom: 0.048,
                          yoy: 0.12,
                          marketShare: 13.5,
                          rankChange: -1
                        },
                        {
                          rank: 4,
                          airport: "上海虹桥机场",
                          region: "华东",
                          current: 880,
                          lastMonth: 850,
                          mom: 0.035,
                          yoy: 0.07,
                          marketShare: 10.8,
                          rankChange: 0
                        },
                        {
                          rank: 5,
                          airport: "南京禄口机场",
                          region: "华东",
                          current: 720,
                          lastMonth: 680,
                          mom: 0.059,
                          yoy: 0.09,
                          marketShare: 8.8,
                          rankChange: 2
                        }
                      ].map((item) => (
                        <TableRow key={item.rank}>
                          <TableCell className="font-bold">
                            <div className="flex items-center">
                              {item.rank <= 3 && (
                                <TrophyIcon className={`w-4 h-4 mr-1 ${item.rank === 1 ? 'text-yellow-500' : item.rank === 2 ? 'text-gray-400' : 'text-amber-600'}`} />
                              )}
                              {item.rank}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{item.airport}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.region}</Badge>
                          </TableCell>
                          <TableCell>{item.current.toLocaleString()}</TableCell>
                          <TableCell>{item.lastMonth.toLocaleString()}</TableCell>
                          <TableCell className={item.mom >= 0 ? "text-green-600" : "text-red-600"}>
                            {(item.mom * 100).toFixed(2)}%
                          </TableCell>
                          <TableCell className={item.yoy >= 0 ? "text-green-600" : "text-red-600"}>
                            {(item.yoy * 100).toFixed(2)}%
                          </TableCell>
                          <TableCell>{item.marketShare.toFixed(1)}%</TableCell>
                          <TableCell>
                            {item.rankChange === 0 ? (
                              <Badge variant="secondary">-</Badge>
                            ) : item.rankChange > 0 ? (
                              <Badge variant="default" className="text-red-600">↓{item.rankChange}</Badge>
                            ) : (
                              <Badge variant="default" className="text-green-600">↑{Math.abs(item.rankChange)}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
                     </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full w-full pt-12">
      {/* 左侧菜单 */}
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeMenu === item.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveMenu(item.id as MenuItem)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
