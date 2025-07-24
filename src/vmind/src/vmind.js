// vmind.js - 从TypeScript转换的JavaScript版本
const VMind = require("@visactor/vmind").default;
const { isString } = require("@visactor/vutils");

// 算法类型枚举



/**
 * 确保图表规范与请求的图表类型匹配
 * @param {Object} spec - 图表规范
 * @param {string} userPrompt - 用户提示
 * @returns {Object} - 修正后的图表规范
 */


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
    
        
        // 记录增强后的spec以便调试

        // 获取图表洞察
        const insights = [];

            try {
                const insightResult = await vmind.getInsights(spec, {
                    maxNum: 6,
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
                
        // 过滤和处理洞察文本

        
        // 设置结果，包含spec字段供前端渲染
        res = {
            chart_path: `generated_${fileName}.${outputType}`,
            insights: insights,
            spec: spec  // 使用增强后的spec
        };
    } catch (error) {
        console.error("生成图表时发生错误:", error);
        res.error = error.toString();
        res.chart_path = `error_${fileName}.${outputType}`;
        res.insights = [];
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