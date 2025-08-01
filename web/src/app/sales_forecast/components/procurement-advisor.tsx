// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ShoppingCartIcon, AlertTriangleIcon, TrendingUpIcon, CalendarIcon } from "lucide-react";
import { salesForecastApi } from "~/core/api";

interface ForecastData {
  month: string;
  predicted: number;
  confidence: number;
  actual?: number;
}

interface ProcurementAdvice {
  total_recommended_procurement: number;
  safety_stock_factor: number;
  quarterly_batches: Array<{
    quarter: string;
    demand: number;
    recommended_purchase: number;
  }>;
  risk_alerts: string[];
  procurement_strategy: string;
}

interface ProcurementAdvisorProps {
  forecastData: ForecastData[];
}

export function ProcurementAdvisor({ forecastData }: ProcurementAdvisorProps) {
  const [advice, setAdvice] = useState<ProcurementAdvice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateProcurementAdvice = async () => {
    if (forecastData.length === 0) {
      alert("请先生成销售预测数据");
      return;
    }

    setIsLoading(true);
    try {
      const response = await salesForecastApi.optimizeProcurement({
        current_inventory: {},
        forecast_demand: forecastData.reduce((acc, item) => {
          acc[item.month] = item.predicted;
          return acc;
        }, {} as Record<string, number>),
        optimization_type: 'balanced'
      });

      if (response.data) {
        setAdvice(response.data);
      } else {
        throw new Error(response.error || '采购建议生成失败');
      }
    } catch (error) {
      console.error('采购建议生成错误:', error);
      alert('采购建议生成失败，请检查网络连接或稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCartIcon className="w-5 h-5" />
          智能采购建议
        </CardTitle>
        <CardDescription>
          基于销售预测结果，为您生成智能化的航油采购建议
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button 
          onClick={generateProcurementAdvice} 
          disabled={isLoading || forecastData.length === 0}
          className="w-full"
        >
          {isLoading ? "生成建议中..." : "生成采购建议"}
        </Button>

        {advice && (
          <div className="space-y-6">
            {/* 总体建议 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUpIcon className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {(advice.total_recommended_procurement / 10000).toFixed(1)}万升
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        建议总采购量
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangleIcon className="w-5 h-5 text-orange-600" />
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {advice.safety_stock_factor.toFixed(2)}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        安全库存系数
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 分季度采购建议 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  分季度采购计划
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {advice.quarterly_batches.map((batch, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="text-lg font-semibold mb-2">{batch.quarter}</div>
                        <div className="space-y-1">
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            预测需求: {(batch.demand / 10000).toFixed(1)}万升
                          </div>
                          <div className="text-sm font-medium text-blue-600">
                            建议采购: {(batch.recommended_purchase / 10000).toFixed(1)}万升
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 采购策略 */}
            <Card>
              <CardHeader>
                <CardTitle>采购策略建议</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 dark:text-slate-300">
                  {advice.procurement_strategy}
                </p>
              </CardContent>
            </Card>

            {/* 风险提示 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangleIcon className="w-5 h-5" />
                  风险提示
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {advice.risk_alerts.map((alert, index) => (
                    <Badge key={index} variant="outline" className="w-full justify-start p-3">
                      {alert}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 