"use client";

import { useState } from "react";
import { CascaderPro } from "~/components/ui/cascader-pro";
import type { CascaderOption } from "~/components/ui/cascader-pro";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

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

export default function TestCascaderPro() {
  const [cascaderValue, setCascaderValue] = useState<string[]>([]);

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

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>专业级联选择器测试</CardTitle>
          <CardDescription>
            测试地区、省级公司、地市级公司的专业级联筛选功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 级联选择器 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">地区</label>
              <CascaderPro
                options={cascaderOptions}
                value={cascaderValue}
                onChange={setCascaderValue}
                placeholder="选择地区/公司/机场"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">选择状态</label>
              <div className="p-3 bg-muted rounded-md">
                <Badge variant="outline">
                  {cascaderValue.length > 0 ? `已选择 ${cascaderValue.length} 级` : "未选择"}
                </Badge>
              </div>
            </div>
          </div>

          {/* 当前选择的值 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">当前选择路径：</label>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-mono">{getDisplayPath()}</p>
            </div>
          </div>
          
          {/* 选择的原始值 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">原始值：</label>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <pre className="text-xs">{JSON.stringify(cascaderValue, null, 2)}</pre>
            </div>
          </div>

          {/* 功能说明 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">功能特性：</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
              <ul className="space-y-1">
                <li>• 三级级联选择（地区 → 公司 → 机场）</li>
                <li>• 智能回显，不挤占布局空间</li>
                <li>• 支持清空选择功能</li>
                <li>• 响应式弹出层设计</li>
              </ul>
              <ul className="space-y-1">
                <li>• 选择任意级别后自动清除下级</li>
                <li>• 选择最终项后自动关闭弹窗</li>
                <li>• 悬停效果和选中状态</li>
                <li>• 支持键盘导航操作</li>
              </ul>
            </div>
          </div>

          {/* 测试数据 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">测试建议：</label>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>1. 点击选择器，测试多级选择功能</p>
              <p>2. 选择不同级别，观察回显效果</p>
              <p>3. 使用清空按钮测试重置功能</p>
              <p>4. 在不同屏幕尺寸下测试响应式效果</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 