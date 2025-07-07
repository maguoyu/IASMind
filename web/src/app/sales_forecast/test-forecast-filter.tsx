"use client";

import { useState } from "react";
import { CascaderPro } from "~/components/ui/cascader-pro";
import type { CascaderOption } from "~/components/ui/cascader-pro";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { SearchIcon } from "lucide-react";

// 级联选择器选项数据
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
      }
    ]
  }
];

// 模拟预测数据
const mockForecastData = [
  // 华东地区数据
  { id: 1, month: "2024-01", predicted: 1250, actual: 1280, confidence: 92, region: "华东", company: "华东航空燃料有限公司", taskName: "华东地区2024年销售预测", algorithm: "线性回归", regionCompany: "华东" },
  { id: 2, month: "2024-02", predicted: 1180, actual: 1150, confidence: 88, region: "华东", company: "华东航空燃料有限公司", taskName: "华东地区2024年销售预测", algorithm: "线性回归", regionCompany: "华东" },
  { id: 3, month: "2024-03", predicted: 1350, actual: 1320, confidence: 91, region: "华东", company: "华东航空燃料有限公司", taskName: "华东地区2024年销售预测", algorithm: "线性回归", regionCompany: "华东" },
  
  // 华南地区数据
  { id: 4, month: "2024-01", predicted: 980, actual: 950, confidence: 85, region: "华南", company: "华南航空燃料有限公司", taskName: "华南地区年度预测分析", algorithm: "ARIMA模型", regionCompany: "青岛" },
  { id: 5, month: "2024-02", predicted: 920, actual: 900, confidence: 82, region: "华南", company: "华南航空燃料有限公司", taskName: "华南地区年度预测分析", algorithm: "ARIMA模型", regionCompany: "青岛" },
  { id: 6, month: "2024-03", predicted: 1050, actual: 1080, confidence: 88, region: "华南", company: "华南航空燃料有限公司", taskName: "华南地区年度预测分析", algorithm: "ARIMA模型", regionCompany: "青岛" },
  
  // 华北地区数据
  { id: 7, month: "2024-01", predicted: 850, actual: 880, confidence: 83, region: "华北", company: "华北航空燃料有限公司", taskName: "华北地区季度预测", algorithm: "指数平滑", regionCompany: "烟台" },
  { id: 8, month: "2024-02", predicted: 780, actual: 750, confidence: 80, region: "华北", company: "华北航空燃料有限公司", taskName: "华北地区季度预测", algorithm: "指数平滑", regionCompany: "大连" },
  { id: 9, month: "2024-03", predicted: 920, actual: 950, confidence: 86, region: "华北", company: "华北航空燃料有限公司", taskName: "华北地区季度预测", algorithm: "指数平滑", regionCompany: "天津" },
  
  // 更多地区公司数据
  { id: 10, month: "2024-04", predicted: 1100, actual: 1120, confidence: 89, region: "华东", company: "华东航空燃料有限公司", taskName: "华东地区2024年销售预测", algorithm: "线性回归", regionCompany: "上海" },
  { id: 11, month: "2024-05", predicted: 1050, actual: 1030, confidence: 87, region: "华东", company: "华东航空燃料有限公司", taskName: "华东地区2024年销售预测", algorithm: "线性回归", regionCompany: "南京" },
  { id: 12, month: "2024-06", predicted: 1200, actual: 1180, confidence: 90, region: "华东", company: "华东航空燃料有限公司", taskName: "华东地区2024年销售预测", algorithm: "线性回归", regionCompany: "杭州" },
];

export default function TestForecastFilter() {
  const [cascaderValue, setCascaderValue] = useState<string[]>([]);
  const [filterTaskName, setFilterTaskName] = useState("");
  const [filterAlgorithm, setFilterAlgorithm] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // 级联筛选逻辑
  const matchesCascaderFilter = (item: any) => {
    if (cascaderValue.length === 0) return true;
    
    const [selectedRegion, selectedCompany, selectedAirport] = cascaderValue;
    
    // 如果选择了地区，检查地区是否匹配
    if (selectedRegion && item.region !== selectedRegion) {
      return false;
    }
    
    // 如果选择了公司，检查公司是否匹配
    if (selectedCompany && !item.company.includes(selectedCompany)) {
      return false;
    }
    
    // 如果选择了机场，检查任务名称是否包含该机场信息
    if (selectedAirport && !item.taskName.includes(selectedAirport)) {
      return false;
    }
    
    return true;
  };

  // 过滤数据
  const filteredData = mockForecastData.filter(item => {
    // 级联筛选
    const matchesCascader = matchesCascaderFilter(item);
    
    // 传统筛选
    const matchesTaskName = !filterTaskName || filterTaskName === "all" || item.taskName.includes(filterTaskName);
    const matchesAlgorithm = !filterAlgorithm || filterAlgorithm === "all" || item.algorithm.includes(filterAlgorithm);
    const matchesDateRange = (!filterStartDate || item.month >= filterStartDate) && 
                            (!filterEndDate || item.month <= filterEndDate);
    
    // 优先使用级联筛选，如果没有级联选择则使用传统筛选
    const taskNameMatch = cascaderValue.length > 0 ? matchesCascader : matchesTaskName;
    
    return taskNameMatch && matchesAlgorithm && matchesDateRange;
  });

  const getDisplayPath = () => {
    if (cascaderValue.length === 0) return "未选择";
    
    const labels: string[] = [];
    let current = cascaderOptions;
    
    for (const value of cascaderValue) {
      const option = current.find(opt => opt.value === value);
      if (!option) break;
      
      labels.push(option.label);
      if (!option.children) break;
      current = option.children;
    }
    
    return labels.join(" → ");
  };

  // 处理搜索
  const handleSearch = () => {
    setIsSearching(true);
    
    setTimeout(() => {
      setIsSearching(false);
      console.log("搜索条件:", {
        cascader: cascaderValue,
        taskName: filterTaskName,
        algorithm: filterAlgorithm,
        startDate: filterStartDate,
        endDate: filterEndDate
      });
    }, 500);
  };

  // 重置筛选条件
  const handleReset = () => {
    setCascaderValue([]);
    setFilterTaskName("");
    setFilterAlgorithm("");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>预测结果查询 - 级联筛选测试</CardTitle>
          <CardDescription>
            测试预测结果查询页面的地区级联筛选功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 筛选条件 */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                  onClick={handleSearch}
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
                  onClick={handleReset}
                  title="重置筛选条件"
                >
                  重置
                </Button>
              </div>
            </div>
          </div>

          {/* 当前筛选状态 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>当前级联选择：</Label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{getDisplayPath()}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>筛选结果：</Label>
              <div className="p-3 bg-muted rounded-lg">
                <Badge variant="secondary">
                  共 {filteredData.length} 条记录
                </Badge>
              </div>
            </div>
          </div>

          {/* 预测数据表格 */}
          {filteredData.length > 0 ? (
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
                    <TableHead>地区</TableHead>
                    <TableHead>公司</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-xs truncate" title={item.taskName}>
                        {item.taskName}
                      </TableCell>
                      <TableCell>{item.month}</TableCell>
                      <TableCell>{item.predicted}</TableCell>
                      <TableCell>{item.actual || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={item.confidence >= 90 ? "default" : item.confidence >= 80 ? "secondary" : "outline"}>
                          {item.confidence}%
                        </Badge>
                      </TableCell>
                      <TableCell>{item.algorithm}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.regionCompany}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.region}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={item.company}>
                        {item.company}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              暂无符合条件的预测数据
            </div>
          )}

          {/* 测试说明 */}
          <div className="space-y-2">
            <Label>测试说明：</Label>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>1. 使用级联选择器选择地区/公司，观察筛选效果</p>
              <p>2. 级联筛选优先于传统任务名称筛选</p>
              <p>3. 可以结合算法名称和时间范围进行组合筛选</p>
              <p>4. 清空级联选择后，恢复使用传统筛选方式</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 