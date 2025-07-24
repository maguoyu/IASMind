// vmind.js - 从TypeScript转换的JavaScript版本
const VMind = require("@visactor/vmind").default;
const { isString } = require("@visactor/vutils");

// 算法类型枚举
const AlgorithmType = {
    OverallTrending: "overallTrend",
    AbnormalTrend: "abnormalTrend",
    PearsonCorrelation: "pearsonCorrelation",
    SpearmanCorrelation: "spearmanCorrelation",
    ExtremeValue: "extremeValue",
    MajorityValue: "majorityValue",
    StatisticsAbnormal: "statisticsAbnormal",
    StatisticsBase: "statisticsBase",
    DbscanOutlier: "dbscanOutlier",
    LOFOutlier: "lofOutlier",
    TurningPoint: "turningPoint",
    PageHinkley: "pageHinkley",
    DifferenceOutlier: "differenceOutlier",
    Volatility: "volatility",
};

// 图表类型枚举（从@visactor/vmind导入的）
const ChartType = {
    BarChart: "bar", 
    LineChart: "line",
    AreaChart: "area",
    ScatterPlot: "scatter",
    DualAxisChart: "dualAxis"
};

/**
 * 生成图表
 * @param {VMind} vmind - VMind实例
 * @param {Object} options - 选项
 * @returns {Promise<Object>} - 结果对象
 */
async function generateChart(vmind, options) {
    let res = {};
    const {
        dataset,
        userPrompt,
        directory,
        width,
        height,
        outputType,
        fileName,
        language,
    } = options;
    
    try {
        // 解析数据集
        const jsonDataset = isString(dataset) ? JSON.parse(dataset) : dataset;
        
        // 生成图表
        const result = await vmind.generateChart(
            userPrompt,
            undefined,
            jsonDataset,
            {
                enableDataQuery: false,
                theme: "light",
            }
        );
        
        const { spec, error, chartType } = result;
        
        if (error || !spec) {
            return {
                error: error || "图表规范为空!",
            };
        }

        // 设置标题
        spec.title = {
            text: userPrompt,
        };

        // 获取图表洞察
        const insights = [];
        if (
            chartType &&
            [
                ChartType.BarChart,
                ChartType.LineChart,
                ChartType.AreaChart,
                ChartType.ScatterPlot,
                ChartType.DualAxisChart,
            ].includes(chartType)
        ) {
            try {
                const insightResult = await vmind.getInsights(spec, {
                    maxNum: 6,
                    algorithms: [
                        AlgorithmType.OverallTrending,
                        AlgorithmType.AbnormalTrend,
                        AlgorithmType.PearsonCorrelation,
                        AlgorithmType.SpearmanCorrelation,
                        AlgorithmType.StatisticsAbnormal,
                        AlgorithmType.LOFOutlier,
                        AlgorithmType.DbscanOutlier,
                        AlgorithmType.MajorityValue,
                        AlgorithmType.PageHinkley,
                        AlgorithmType.TurningPoint,
                        AlgorithmType.StatisticsBase,
                        AlgorithmType.Volatility,
                    ],
                    usePolish: false,
                    language: language === "en" ? "english" : "chinese",
                });
                
                const vmindInsights = insightResult.insights;
                if (vmindInsights && Array.isArray(vmindInsights)) {
                    insights.push(...vmindInsights);
                }
            } catch (insightError) {
                console.error("获取洞察时出错:", insightError);
            }
        }
        
        // 过滤和处理洞察文本
        const insightsText = insights
            .map(insight => insight && insight.textContent ? insight.textContent.plainText : null)
            .filter(text => !!text);
        
        // 设置结果，包含spec字段供前端渲染
        res = {
            insight_md: insightsText.length > 0 
                ? insightsText.join('\n\n') 
                : `未能生成关于"${userPrompt}"的洞察。`,
            spec: spec  // 添加spec字段供前端vchart使用
        };
    } catch (error) {
        console.error("生成图表时发生错误:", error);
        res.error = error.toString();
        res.chart_path = `error_${fileName}.${outputType}`;
        res.insight_md = `生成图表时发生错误: ${error.toString()}`;
    }
    
    return res;
}

/**
 * 执行VMind图表生成
 */
async function executeVMind() {
    // 在全局捕获未处理的Promise异常
    process.on('unhandledRejection', (reason, promise) => {
        console.error('未处理的Promise拒绝:', reason);
        // 确保错误信息输出到标准输出
        const errorBuffer = Buffer.from(JSON.stringify({
            error: `未处理的Promise错误: ${reason}`
        }), 'utf-8');
        process.stdout.write(errorBuffer);
    });

    try {
        // 从标准输入读取二进制数据
        let inputData = Buffer.alloc(0);
        
        process.stdin.on('data', (chunk) => {
            inputData = Buffer.concat([inputData, chunk]);
        });
        
        process.stdin.on('end', async () => {
            try {
                console.error('正在处理输入数据...');
                
                // 解析输入数据
                const parsedData = JSON.parse(inputData.toString('utf-8'));
                
                let res;
                const {
                    llm_config,
                    width,
                    dataset = [],
                    height,
                    directory,
                    user_prompt: userPrompt,
                    output_type: outputType = "png",
                    file_name: fileName,
                    task_type: taskType = "visualization",
                    insights_id: insightsId = [],
                    language = "zh",
                } = parsedData;
                
                try {
                    // 验证必要的参数
                    if (!llm_config || !llm_config.base_url || !llm_config.model || !llm_config.api_key) {
                        throw new Error("缺少必要的LLM配置参数");
                    }
                    
                    const { base_url: baseUrl, model, api_key: apiKey } = llm_config;
                    const vmind = new VMind({
                        url: `${baseUrl}/chat/completions`,
                        model,
                        headers: {
                            "api-key": apiKey,
                            Authorization: `Bearer ${apiKey}`,
                        },
                    });

                    res = await generateChart(vmind, {
                        dataset,
                        userPrompt: userPrompt || "数据可视化",
                        directory: directory || ".",
                        outputType: outputType || "png",
                        fileName: fileName || `chart_${Date.now()}`,
                        width,
                        height,
                        language,
                    });
                } catch (error) {
                    console.error("执行过程中发生错误:", error);
                    res = {
                        error: `执行错误: ${error}`,
                        chart_path: `error_${fileName || 'chart'}.${outputType || 'png'}`,
                        insight_md: `处理数据时发生错误: ${error}`
                    };
                }
                
                // 输出结果到前端，确保不丢失spec字段
                console.error('处理完成，返回结果');
                const outputBuffer = Buffer.from(JSON.stringify(res), 'utf-8');
                process.stdout.write(outputBuffer);
            } catch (error) {
                console.error('处理输入数据时发生错误:', error);
                
                // 输出错误信息到标准输出
                const errorBuffer = Buffer.from(JSON.stringify({
                    error: `处理数据时发生错误: ${error}`,
                    chart_path: "error_chart.png",
                    insight_md: `解析输入数据失败: ${error}`
                }), 'utf-8');
                process.stdout.write(errorBuffer);
            }
        });
    } catch (error) {
        console.error('执行过程中发生错误:', error);
        
        // 确保错误信息输出到标准输出
        const errorBuffer = Buffer.from(JSON.stringify({
            error: `执行初始化错误: ${error}`,
            chart_path: "error_chart.png",
            insight_md: "执行vmind.js脚本时发生严重错误"
        }), 'utf-8');
        process.stdout.write(errorBuffer);
        
        process.exit(1);
    }
}

// 启动执行
executeVMind(); 