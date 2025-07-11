// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { UploadIcon, SearchIcon, FileTextIcon, TrashIcon, DownloadIcon } from "lucide-react";
import { useState, useRef } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { CascaderPro } from "~/components/ui/cascader-pro";
import type { CascaderOption } from "~/components/ui/cascader-pro";

import { SampleTemplate } from "./sample-template";

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
}

interface SampleManagerProps {
  onSampleDataChange: (data: SampleData[]) => void;
}

export function SampleManager({ onSampleDataChange }: SampleManagerProps) {
  const [sampleData, setSampleData] = useState<SampleData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [cascaderValue, setCascaderValue] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // 模拟上传Excel文件
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      // 创建FormData
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/sales_forecast/upload_samples', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('文件上传失败');
      }

      const result = await response.json();
      const newData = result.sample_data;
      
      setSampleData(prev => [...prev, ...newData]);
      onSampleDataChange([...sampleData, ...newData]);
      
      alert(`成功上传 ${newData.length} 条样本数据`);
    } catch (error) {
              console.error('上传错误:', error);
      alert('文件上传失败，请检查文件格式或稍后重试');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
    if (selectedCompany && !item.notes.includes(selectedCompany)) {
      return false;
    }
    
    // 如果选择了机场，检查样本文件是否包含该机场信息
    if (selectedAirport && !item.notes.includes(selectedAirport)) {
      return false;
    }
    
    return true;
  };

  // 搜索和过滤数据
  const filteredData = sampleData.filter(item => {
    const matchesSearch = searchTerm === "" || 
      item.date.includes(searchTerm) ||
      item.region.includes(searchTerm) ||
      item.season.includes(searchTerm) ||
      item.notes.includes(searchTerm);
    
    // 级联筛选
    const matchesCascader = matchesCascaderFilter(item);
    
    // 传统地区筛选（保持向后兼容）
    const matchesRegion = filterRegion === "" || item.region === filterRegion;
    const matchesSeason = filterSeason === "" || item.season === filterSeason;
    
    // 优先使用级联筛选，如果没有级联选择则使用传统筛选
    const regionMatch = cascaderValue.length > 0 ? matchesCascader : matchesRegion;
    
    return matchesSearch && regionMatch && matchesSeason;
  });

  // 获取唯一区域和季节
  const uniqueRegions = [...new Set(sampleData.map(item => item.region))];
  const uniqueSeasons = [...new Set(sampleData.map(item => item.season))];

  // 删除样本数据
  const deleteSample = async (id: string) => {
    try {
      const response = await fetch(`/api/sales_forecast/samples/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedData = sampleData.filter(item => item.id !== id);
        setSampleData(updatedData);
        onSampleDataChange(updatedData);
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请稍后重试');
    }
  };

  // 导出样本数据
  const exportSamples = async () => {
    try {
      const response = await fetch('/api/sales_forecast/export_samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sample_data: filteredData }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales_samples_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileTextIcon className="w-5 h-5" />
          样本数据管理
        </CardTitle>
        <CardDescription>
          上传Excel文件添加样本数据，支持检索查询和管理
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 模板下载和文件上传 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SampleTemplate />
          
          {/* 文件上传区域 */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6">
          <div className="text-center">
            <UploadIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <Label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                                 点击上传Excel文件或拖拽文件到此处
              </span>
            </Label>
            <input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <p className="text-xs text-slate-500 mt-2">
              支持 .xlsx 和 .xls 格式，文件大小不超过 10MB
            </p>
          </div>
        </div>
      </div>

        {/* 搜索和过滤 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>搜索</Label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索日期、地区、季节..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
            <Label>季节筛选</Label>
            <Select value={filterSeason} onValueChange={setFilterSeason}>
              <SelectTrigger>
                <SelectValue placeholder="选择季节" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部季节</SelectItem>
                {uniqueSeasons.map(season => (
                  <SelectItem key={season} value={season}>{season}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button onClick={exportSamples} variant="outline" className="w-full">
              <DownloadIcon className="w-4 h-4 mr-2" />
              导出数据
            </Button>
          </div>
        </div>

        {/* 数据统计 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              总样本数: {sampleData.length}
            </Badge>
            <Badge variant="outline">
              筛选结果: {filteredData.length}
            </Badge>
          </div>
          {isUploading && (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              正在上传...
            </div>
          )}
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
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSample(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            {sampleData.length === 0 ? "暂无样本数据，请上传Excel文件" : "没有找到匹配的数据"}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 