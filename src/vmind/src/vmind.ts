import VMind, { ChartType, DataTable } from "@visactor/vmind";
import { isString } from "@visactor/vutils";
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
        insights.push(...vmindInsights);
      }
      const insightsText = insights
        .map((insight) => insight.textContent?.plainText)
        .filter((insight) => !!insight) as string[];
      spec.insights = insights;
      res = {
        ...res,
          userPrompt,
          insightsText
        ),
      };
    } catch (error: any) {
      res.error = error.toString();
    } finally {
      return res;
    }
  }
  
 
  const readStdin = (): Promise<string> => {
    return new Promise((resolve) => {
      let input = "";
      process.stdin.setEncoding("utf-8"); // 确保编码与 Python 端一致
      process.stdin.on("data", (chunk) => (input += chunk));
      process.stdin.on("end", () => resolve(input));
    });
  };
async function executeVMind() {
    const input = await readStdin();
    const inputData = JSON.parse(input);

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

    console.log(JSON.stringify(res));
  }
  
  executeVMind();