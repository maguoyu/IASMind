"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as echarts from 'echarts/core';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
  DataZoomComponent,
  MarkPointComponent,
  MarkLineComponent,
  MarkAreaComponent,
  TimelineComponent,
  DatasetComponent,
  TransformComponent
} from 'echarts/components';
import {
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  RadarChart,
  MapChart,
  TreeChart,
  TreemapChart,
  GraphChart,
  GaugeChart,
  FunnelChart,
  ParallelChart,
  SankeyChart,
  BoxplotChart,
  CandlestickChart,
  HeatmapChart,
  PictorialBarChart,
  ThemeRiverChart,
  SunburstChart
} from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

// 注册必需的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
  DataZoomComponent,
  MarkPointComponent,
  MarkLineComponent,
  MarkAreaComponent,
  TimelineComponent,
  DatasetComponent,
  TransformComponent,
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  RadarChart,
  MapChart,
  TreeChart,
  TreemapChart,
  GraphChart,
  GaugeChart,
  FunnelChart,
  ParallelChart,
  SankeyChart,
  BoxplotChart,
  CandlestickChart,
  HeatmapChart,
  PictorialBarChart,
  ThemeRiverChart,
  SunburstChart,
  CanvasRenderer
]);

export interface EChartsWrapperProps {
  /** ECharts 配置对象 */
  spec: any;
  /** 图表容器的样式 */
  style?: React.CSSProperties;
  /** 图表容器的类名 */
  className?: string;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 图表实例准备就绪回调 */
  onReady?: (chart: echarts.ECharts) => void;
  /** 主题名称 */
  theme?: string | object;
  /** 图表配置选项 */
  opts?: {
    devicePixelRatio?: number;
    renderer?: 'canvas' | 'svg';
    width?: number;
    height?: number;
  };
}

export interface EChartsWrapperRef {
  getChart: () => echarts.ECharts | null;
  resize: () => void;
}

const EChartsWrapper = forwardRef<EChartsWrapperRef, EChartsWrapperProps>(
  ({ spec, style, className, onError, onReady, theme, opts }, ref) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    useImperativeHandle(ref, () => ({
      getChart: () => chartInstance.current,
      resize: () => {
        if (chartInstance.current) {
          chartInstance.current.resize();
        }
      }
    }));

    useEffect(() => {
      if (!chartRef.current) return;

      try {
        // 初始化图表实例
        chartInstance.current = echarts.init(chartRef.current, theme, opts);
        
        if (onReady) {
          onReady(chartInstance.current);
        }

        // 监听窗口大小变化
        const handleResize = () => {
          if (chartInstance.current) {
            chartInstance.current.resize();
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          if (chartInstance.current) {
            chartInstance.current.dispose();
            chartInstance.current = null;
          }
        };
      } catch (error) {
        if (onError && error instanceof Error) {
          onError(error);
        }
        console.error('ECharts 初始化失败:', error);
      }
    }, [theme, opts, onReady, onError]);

    useEffect(() => {
      if (!chartInstance.current || !spec) return;

      try {
        // 设置图表配置
        chartInstance.current.setOption(spec, true);
      } catch (error) {
        if (onError && error instanceof Error) {
          onError(error);
        }
        console.error('ECharts 配置更新失败:', error);
      }
    }, [spec, onError]);

    const defaultStyle: React.CSSProperties = {
      width: '100%',
      height: '500px',
      minWidth: '600px',
      ...style
    };

    return (
      <div
        ref={chartRef}
        style={defaultStyle}
        className={className}
      />
    );
  }
);

EChartsWrapper.displayName = 'EChartsWrapper';

export default EChartsWrapper; 