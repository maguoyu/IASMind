/**
 * VChart到ECharts配置转换工具
 * 将VChart格式的配置转换为ECharts格式
 */

export interface ChartData {
  [key: string]: any;
}

/**
 * 转换VChart配置为ECharts配置
 */
export function convertVChartToECharts(vchartSpec: any, chartData?: ChartData[]): any {
  // 如果已经是ECharts格式，直接返回
  if (vchartSpec.title || vchartSpec.tooltip || vchartSpec.xAxis || vchartSpec.yAxis || vchartSpec.series) {
    return vchartSpec;
  }

  const { type, data, xField, yField, categoryField, angleField, padding } = vchartSpec;
  
  // 基础ECharts配置
  const baseConfig = {
    title: {
      text: '数据可视化图表',
      left: 'center'
    },
    tooltip: {
      trigger: type === 'pie' ? 'item' : 'axis'
    },
    legend: {
      orient: 'horizontal',
      left: 'center',
      bottom: '10%'
    },
    toolbox: {
      show: true,
      feature: {
        dataView: { show: true, readOnly: false },
        magicType: { show: true, type: ['line', 'bar'] },
        restore: { show: true },
        saveAsImage: { show: true }
      }
    }
  };

  // 提取数据
  const chartValues = chartData || (data && data[0]?.values) || [];

  switch (type) {
    case 'bar':
      return {
        ...baseConfig,
        xAxis: {
          type: 'category',
          data: chartValues.map((item: any) => item[xField] || item.name || item.category)
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          name: yField || 'value',
          type: 'bar',
          data: chartValues.map((item: any) => item[yField] || item.value || item.sales),
          itemStyle: {
            color: '#5470c6'
          }
        }]
      };

    case 'line':
      return {
        ...baseConfig,
        xAxis: {
          type: 'category',
          data: chartValues.map((item: any) => item[xField] || item.name || item.category)
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          name: yField || 'value',
          type: 'line',
          data: chartValues.map((item: any) => item[yField] || item.value || item.sales),
          smooth: true,
          lineStyle: {
            color: '#5470c6'
          }
        }]
      };

    case 'pie':
      return {
        ...baseConfig,
        series: [{
          name: '数据',
          type: 'pie',
          radius: '50%',
          data: chartValues.map((item: any) => ({
            name: item[categoryField] || item.name,
            value: item[angleField] || item.value
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      };

    case 'scatter':
      return {
        ...baseConfig,
        xAxis: {
          type: 'value',
          name: xField || 'x'
        },
        yAxis: {
          type: 'value',
          name: yField || 'y'
        },
        series: [{
          name: '数据点',
          type: 'scatter',
          data: chartValues.map((item: any) => [
            item[xField] || item.x,
            item[yField] || item.y
          ]),
          symbolSize: 8,
          itemStyle: {
            color: '#5470c6'
          }
        }]
      };

    default:
      // 默认返回柱状图
      return {
        ...baseConfig,
        xAxis: {
          type: 'category',
          data: chartValues.map((item: any, index: number) => item.name || `项目${index + 1}`)
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          name: 'value',
          type: 'bar',
          data: chartValues.map((item: any) => item.value || 0),
          itemStyle: {
            color: '#5470c6'
          }
        }]
      };
  }
}

/**
 * 根据图表数据自动生成ECharts配置
 */
export function generateEChartsConfig(chartData: ChartData[], chartType: string = 'bar'): any {
  if (!chartData || chartData.length === 0) {
    return null;
  }

  const firstItem = chartData[0];
  if (!firstItem) {
    return null;
  }
  
  const keys = Object.keys(firstItem);
  
  // 尝试识别数值字段和分类字段
  const numericFields = keys.filter(key => typeof firstItem[key] === 'number');
  const categoryFields = keys.filter(key => typeof firstItem[key] === 'string');
  
  const categoryField = categoryFields[0] || 'name';
  const valueField = numericFields[0] || 'value';

  return convertVChartToECharts({
    type: chartType,
    data: [{ values: chartData }],
    xField: categoryField,
    yField: valueField,
    categoryField,
    angleField: valueField
  }, chartData);
} 