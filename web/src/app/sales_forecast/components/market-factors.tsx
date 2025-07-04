// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { TrendingUpIcon, BarChart3Icon, CloudIcon } from "lucide-react";

interface MarketFactor {
  name: string;
  impact: "high" | "medium" | "low";
  description: string;
}

interface MarketFactors {
  economic_indicators: MarketFactor[];
  industry_factors: MarketFactor[];
  seasonal_factors: MarketFactor[];
}

export function MarketFactors() {
  const [factors, setFactors] = useState<MarketFactors | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMarketFactors();
  }, []);

  const fetchMarketFactors = async () => {
    try {
      const response = await fetch('/api/sales_forecast/market_factors');
      if (response.ok) {
        const data = await response.json();
        setFactors(data);
      }
    } catch (error) {
      console.error('获取市场因素失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getImpactText = (impact: string) => {
    switch (impact) {
      case 'high': return '高影响';
      case 'medium': return '中等影响';
      case 'low': return '低影响';
      default: return '未知';
    }
  };

  const FactorSection = ({ 
    title, 
    icon, 
    factors: sectionFactors 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    factors: MarketFactor[] 
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sectionFactors.map((factor, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{factor.name}</h4>
                <Badge variant={getImpactColor(factor.impact) as any}>
                  {getImpactText(factor.impact)}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {factor.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">加载市场因素分析...</div>
        </CardContent>
      </Card>
    );
  }

  if (!factors) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-slate-500">无法加载市场因素数据</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>市场因素分析</CardTitle>
          <CardDescription>
            了解影响航空汽油销售的关键市场因素，帮助做出更准确的预测和决策
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FactorSection
          title="经济指标"
          icon={<TrendingUpIcon className="w-5 h-5" />}
          factors={factors.economic_indicators}
        />
        
        <FactorSection
          title="行业因素"
          icon={<BarChart3Icon className="w-5 h-5" />}
          factors={factors.industry_factors}
        />
        
        <FactorSection
          title="季节性因素"
          icon={<CloudIcon className="w-5 h-5" />}
          factors={factors.seasonal_factors}
        />
      </div>
    </div>
  );
} 