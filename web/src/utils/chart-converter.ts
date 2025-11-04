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
      const barXAxisData = chartValues.map((item: any) => item[xField] || item.name || item.category);
      const barSeriesData = chartValues.map((item: any) => item[yField] || item.value || item.sales);
      
      return {
        ...baseConfig,
        xAxis: {
          type: 'category',
          data: barXAxisData
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          name: yField || 'value',
          type: 'bar',
          data: barSeriesData,
          itemStyle: {
            color: '#5470c6'
          }
        }]
      };

    case 'line':
      const xAxisData = chartValues.map((item: any) => item[xField] || item.name || item.category);
      const seriesData = chartValues.map((item: any) => item[yField] || item.value || item.sales);
      
      return {
        ...baseConfig,
        xAxis: {
          type: 'category',
          data: xAxisData
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          name: yField || 'value',
          type: 'line',
          data: seriesData,
          smooth: true,
          lineStyle: {
            color: '#5470c6'
          }
        }]
      };

    case 'pie':
      const pieData = chartValues.map((item: any) => ({
        name: item[categoryField] || item.name,
        value: item[angleField] || item.value
      }));
      
      return {
        ...baseConfig,
        series: [{
          name: '数据',
          type: 'pie',
          radius: '50%',
          data: pieData,
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
    console.warn('⚠️ generateEChartsConfig: 数据为空');
    return null;
  }

  const firstItem = chartData[0];
  if (!firstItem) {
    console.warn('⚠️ generateEChartsConfig: 第一项为空');
    return null;
  }
  
  const keys = Object.keys(firstItem);
  
  // 时间相关的关键词（这些字段应该作为分类字段/X轴标签）
  const timeKeywords = ['年', '月', '日', '周', '季', '时间', 'time', 'date', 'year', 'month', 'day'];
  const isTimeField = (key: string) => timeKeywords.some(w => key.toLowerCase().includes(w.toLowerCase()));
  
  // 分类相关的关键词
  const categoryKeywords = ['类', '类别', '名', '名称', 'name', 'category', 'type'];
  const isCategoryField = (key: string) => categoryKeywords.some(w => key.toLowerCase().includes(w.toLowerCase()));
  
  // 改进的字段识别逻辑：
  // 1. 优先识别时间字段作为分类字段
  // 2. 其次识别名称/类别字段
  // 3. 最后才根据数据类型判断
  const potentialCategoryFields = keys.filter(key => isTimeField(key) || isCategoryField(key));
  const numericFields = keys.filter(key => typeof firstItem[key] === 'number');
  const stringFields = keys.filter(key => typeof firstItem[key] === 'string');
  
  // 选择字段的优先级：
  // categoryField: 时间字段 > 分类字段 > 字符串字段 > 默认 'name'
  let categoryField = potentialCategoryFields[0] 
                     || stringFields[0] 
                     || 'name';
  
  // valueField: 排除了categoryField的数值字段 > 其他数值字段 > 默认 'value'
  let valueField = numericFields.find(f => f !== categoryField) 
                  || numericFields[0] 
                  || 'value';

  return convertVChartToECharts({
    type: chartType,
    data: [{ values: chartData }],
    xField: categoryField,
    yField: valueField,
    categoryField,
    angleField: valueField
  }, chartData);
} 