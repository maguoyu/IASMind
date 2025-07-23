import VMind, { ChartType, DataTable } from "@visactor/vmind";
import { isString } from "@visactor/vutils";
import * as fs from 'fs';
import * as path from 'path';

enum AlgorithmType {
    OverallTrending = "overallTrend",
    AbnormalTrend = "abnormalTrend",
    PearsonCorrelation = "pearsonCorrelation",
    SpearmanCorrelation = "spearmanCorrelation",
    ExtremeValue = "extremeValue",
    MajorityValue = "majorityValue",
    StatisticsAbnormal = "statisticsAbnormal",
    StatisticsBase = "statisticsBase",
    DbscanOutlier = "dbscanOutlier",
    LOFOutlier = "lofOutlier",
    TurningPoint = "turningPoint",
    PageHinkley = "pageHinkley",
    DifferenceOutlier = "differenceOutlier",
    Volatility = "volatility",
}

async function generateChart(
    vmind: VMind,
    options: {
        dataset: string | DataTable;
        userPrompt: string;
        directory: string;
        outputType: "png" | "html";
        fileName: string;
        width?: number;
        height?: number;
        language?: "en" | "zh";
    }
) {
    let res: {
        chart_path?: string;
        error?: string;
        insight_path?: string;
        insight_md?: string;
    } = {};
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
        // Get chart spec and save in local file
        const jsonDataset = isString(dataset) ? JSON.parse(dataset) : dataset;
        const { spec, error, chartType } = await vmind.generateChart(
            userPrompt,
            undefined,
            jsonDataset,
            {
                enableDataQuery: false,
                theme: "light",
            }
        );
        if (error || !spec) {
            return {
                error: error || "Spec of Chart was Empty!",
            };
        }

        spec.title = {
            text: userPrompt,
        };

        // get chart insights and save in local
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
            const { insights: vmindInsights } = await vmind.getInsights(spec, {
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
            if (vmindInsights && Array.isArray(vmindInsights)) {
                insights.push(...vmindInsights);
            }
        }
        
        const insightsText = insights
            .map((insight: any) => insight.textContent?.plainText)
            .filter((text: string | undefined) => !!text) as string[];
        
        // 设置结果
        res = {
            chart_path: "path/to/chart",  // 这里应该设置实际的图表路径
            insight_md: insightsText.join('\n')
        };
    } catch (error: any) {
        res.error = error.toString();
    }
    
    return res;
}

// 解析命令行参数
function parseArgs() {
    const args = process.argv.slice(2);
    const result: { [key: string]: string } = {};
    
    for (let i = 0; i < args.length; i += 2) {
        if (args[i].startsWith('--') && i + 1 < args.length) {
            result[args[i].slice(2)] = args[i + 1];
        }
    }
    
    return result;
}

async function executeVMind() {
    try {
        // 解析命令行参数
        const args = parseArgs();
        const inputFile = args.input;
        const outputFile = args.output;
        
        if (!inputFile || !outputFile) {
            console.error('缺少必要的参数: --input <输入文件路径> --output <输出文件路径>');
            process.exit(1);
        }
        
        console.log(`读取输入文件: ${inputFile}`);
        
        // 读取输入文件
        const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
        
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
        } = inputData;
        
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
            userPrompt,
            directory,
            outputType,
            fileName,
            width,
            height,
            language,
        });
        
        // 写入输出文件
        console.log(`写入输出文件: ${outputFile}`);
        fs.writeFileSync(outputFile, JSON.stringify(res), 'utf-8');
        console.log('处理完成');
        
    } catch (error) {
        console.error('执行过程中发生错误:', error);
        process.exit(1);
    }
}

executeVMind();