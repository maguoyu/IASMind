# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
import math
import numpy as np
import pandas as pd
import io
import uuid
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/api/sales_forecast",
    tags=["sales_forecast"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)

class ForecastParams(BaseModel):
    time_range: int = 12  # 预测月数
    seasonality: str = "normal"  # 季节性: low, normal, high
    base_amount: float = 10000  # 基础销量(万升)
    growth_rate: float = 5  # 年增长率(%)
    historical_data: Optional[List[float]] = None  # 历史数据

class ForecastResult(BaseModel):
    month: str
    predicted: float
    confidence: float
    actual: Optional[float] = None

class ForecastResponse(BaseModel):
    forecast_data: List[ForecastResult]
    total_predicted: float
    avg_confidence: float
    trend_analysis: str
    risk_factors: List[str]

class SampleData(BaseModel):
    id: str
    date: str
    sales_volume: float
    price: float
    region: str
    season: str
    weather: str
    events: str
    notes: str

class SampleUploadResponse(BaseModel):
    sample_data: List[SampleData]
    message: str

@router.post("/generate", response_model=ForecastResponse)
async def generate_sales_forecast(params: ForecastParams):
    """
    生成航空汽油销售预测
    """
    try:
        # 生成月份列表
        current_date = datetime.now()
        months = []
        for i in range(params.time_range):
            future_date = current_date + timedelta(days=30 * i)
            months.append(future_date.strftime("%Y-%m"))
        
        # 季节性系数
        seasonal_factors = {
            "low": 0.1,
            "normal": 0.15,
            "high": 0.25
        }
        seasonal_factor = seasonal_factors.get(params.seasonality, 0.15)
        
        forecast_data = []
        for i, month in enumerate(months):
            # 基础增长
            growth = 1 + (params.growth_rate / 100)
            base_value = params.base_amount * (growth ** (i / 12))
            
            # 季节性影响 (使用正弦函数模拟季节变化)
            seasonal_effect = 1 + seasonal_factor * math.sin(2 * math.pi * i / 12)
            
            # 添加随机波动
            random_factor = 1 + np.random.normal(0, 0.05)  # 5%的随机波动
            
            # 计算预测值
            predicted = base_value * seasonal_effect * random_factor
            
            # 计算置信度 (随时间递减)
            confidence = max(60, 95 - i * 1.5)
            
            # 如果是前几个月，生成模拟的实际数据
            actual = None
            if i < 3:  # 前3个月有实际数据
                actual = predicted * (0.9 + np.random.random() * 0.2)
            
            forecast_data.append(ForecastResult(
                month=month,
                predicted=round(predicted, 2),
                confidence=round(confidence, 1),
                actual=round(actual, 2) if actual else None
            ))
        
        # 计算汇总数据
        total_predicted = sum(item.predicted for item in forecast_data)
        avg_confidence = sum(item.confidence for item in forecast_data) / len(forecast_data)
        
        # 趋势分析
        if params.growth_rate > 10:
            trend_analysis = "高速增长趋势，需要关注市场容量限制"
        elif params.growth_rate > 0:
            trend_analysis = f"稳定增长趋势，年增长率 {params.growth_rate}%"
        elif params.growth_rate > -5:
            trend_analysis = "市场相对稳定，小幅波动"
        else:
            trend_analysis = "下降趋势，需要采取应对措施"
        
        # 风险因素分析
        risk_factors = []
        if params.seasonality == "high":
            risk_factors.append("高季节性波动可能影响采购计划")
        if params.growth_rate > 15:
            risk_factors.append("过高增长率可能不可持续")
        if avg_confidence < 70:
            risk_factors.append("长期预测置信度较低，建议定期更新")
        if total_predicted / params.time_range > params.base_amount * 1.5:
            risk_factors.append("预测销量大幅增长，需要确保供应链能力")
        
        if not risk_factors:
            risk_factors.append("当前预测参数合理，风险较低")
        
        return ForecastResponse(
            forecast_data=forecast_data,
            total_predicted=round(total_predicted, 2),
            avg_confidence=round(avg_confidence, 1),
            trend_analysis=trend_analysis,
            risk_factors=risk_factors
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"预测生成失败: {str(e)}")

@router.get("/market_factors")
async def get_market_factors():
    """
    获取影响航空汽油销售的市场因素
    """
    factors = {
        "economic_indicators": [
            {"name": "GDP增长率", "impact": "high", "description": "经济增长直接影响航空出行需求"},
            {"name": "油价波动", "impact": "medium", "description": "影响运营成本和需求"},
            {"name": "汇率变化", "impact": "medium", "description": "影响国际航线成本"}
        ],
        "industry_factors": [
            {"name": "航班频次", "impact": "high", "description": "直接决定航油消耗量"},
            {"name": "机队规模", "impact": "high", "description": "影响总体需求量"},
            {"name": "新航线开通", "impact": "medium", "description": "增加额外需求"}
        ],
        "seasonal_factors": [
            {"name": "旅游旺季", "impact": "high", "description": "夏季和节假日需求激增"},
            {"name": "商务出行", "impact": "medium", "description": "工作日需求相对稳定"},
            {"name": "天气影响", "impact": "low", "description": "恶劣天气可能影响航班"}
        ]
    }
    return factors

@router.post("/optimize_procurement")
async def optimize_procurement(forecast_data: List[ForecastResult]):
    """
    基于预测结果优化采购建议
    """
    try:
        total_demand = sum(item.predicted for item in forecast_data)
        
        # 安全库存计算 (考虑置信度)
        avg_confidence = sum(item.confidence for item in forecast_data) / len(forecast_data)
        safety_factor = 1 + (100 - avg_confidence) / 100 * 0.5  # 置信度越低，安全库存越高
        
        recommended_procurement = total_demand * safety_factor
        
        # 分批采购建议
        quarterly_batches = []
        quarters = ["Q1", "Q2", "Q3", "Q4"]
        
        for i, quarter in enumerate(quarters):
            if i * 3 < len(forecast_data):
                quarter_demand = sum(
                    item.predicted 
                    for item in forecast_data[i*3:(i+1)*3]
                )
                quarterly_batches.append({
                    "quarter": quarter,
                    "demand": round(quarter_demand, 2),
                    "recommended_purchase": round(quarter_demand * safety_factor, 2)
                })
        
        # 风险提示
        risk_alerts = []
        if avg_confidence < 70:
            risk_alerts.append("预测置信度较低，建议增加安全库存")
        
        peak_demand = max(item.predicted for item in forecast_data)
        avg_demand = total_demand / len(forecast_data)
        if peak_demand > avg_demand * 1.5:
            risk_alerts.append("存在显著的需求峰值，建议提前储备")
        
        return {
            "total_recommended_procurement": round(recommended_procurement, 2),
            "safety_stock_factor": round(safety_factor, 2),
            "quarterly_batches": quarterly_batches,
            "risk_alerts": risk_alerts,
            "procurement_strategy": "建议采用分批采购策略，在需求高峰前适当增加库存"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"采购优化计算失败: {str(e)}")

# 模拟样本数据存储（实际应用中应使用数据库）
sample_data_storage = []

@router.post("/upload_samples", response_model=SampleUploadResponse)
async def upload_sample_data(file: UploadFile = File(...)):
    """
    上传Excel文件并解析样本数据
    """
    try:
        # 检查文件类型
        if not file.filename or not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="只支持Excel文件格式")
        
        # 读取文件内容
        content = await file.read()
        
        # 使用pandas读取Excel
        try:
            if file.filename.endswith('.xlsx'):
                df = pd.read_excel(io.BytesIO(content), engine='openpyxl')
            else:
                df = pd.read_excel(io.BytesIO(content), engine='xlrd')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Excel文件解析失败: {str(e)}")
        
        # 验证必要的列
        required_columns = ['date', 'sales_volume', 'price', 'region', 'season']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(status_code=400, detail=f"缺少必要的列: {', '.join(missing_columns)}")
        
        # 处理数据
        sample_data = []
        for _, row in df.iterrows():
            sample = SampleData(
                id=str(uuid.uuid4()),
                date=str(row['date']),
                sales_volume=float(row['sales_volume']),
                price=float(row['price']),
                region=str(row['region']),
                season=str(row['season']),
                weather=str(row.get('weather', '')),
                events=str(row.get('events', '')),
                notes=str(row.get('notes', ''))
            )
            sample_data.append(sample)
            sample_data_storage.append(sample)
        
        return SampleUploadResponse(
            sample_data=sample_data,
            message=f"成功上传 {len(sample_data)} 条样本数据"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

@router.get("/samples")
async def get_sample_data(
    search: Optional[str] = None,
    region: Optional[str] = None,
    season: Optional[str] = None,
    limit: int = 100
):
    """
    获取样本数据，支持搜索和过滤
    """
    try:
        filtered_data = sample_data_storage.copy()
        
        # 搜索过滤
        if search:
            filtered_data = [
                item for item in filtered_data
                if search.lower() in item.date.lower() or
                   search.lower() in item.region.lower() or
                   search.lower() in item.season.lower() or
                   search.lower() in item.notes.lower()
            ]
        
        # 地区过滤
        if region:
            filtered_data = [item for item in filtered_data if item.region == region]
        
        # 季节过滤
        if season:
            filtered_data = [item for item in filtered_data if item.season == season]
        
        # 限制返回数量
        return filtered_data[:limit]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取样本数据失败: {str(e)}")

@router.delete("/samples/{sample_id}")
async def delete_sample_data(sample_id: str):
    """
    删除指定的样本数据
    """
    try:
        global sample_data_storage
        original_length = len(sample_data_storage)
        sample_data_storage = [item for item in sample_data_storage if item.id != sample_id]
        
        if len(sample_data_storage) == original_length:
            raise HTTPException(status_code=404, detail="样本数据不存在")
        
        return {"message": "样本数据删除成功"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除样本数据失败: {str(e)}")

@router.post("/export_samples")
async def export_sample_data(sample_data: List[SampleData]):
    """
    导出样本数据为Excel文件
    """
    try:
        # 创建DataFrame
        df = pd.DataFrame([
            {
                'date': item.date,
                'sales_volume': item.sales_volume,
                'price': item.price,
                'region': item.region,
                'season': item.season,
                'weather': item.weather,
                'events': item.events,
                'notes': item.notes
            }
            for item in sample_data
        ])
        
        # 创建Excel文件
        output = io.BytesIO()
        df.to_excel(output, index=False, sheet_name='销售样本数据', engine='openpyxl')
        
        output.seek(0)
        
        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            io.BytesIO(output.getvalue()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=sales_samples_{datetime.now().strftime('%Y%m%d')}.xlsx"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")

@router.get("/download_template")
async def download_template():
    """
    下载Excel模板文件
    """
    try:
        # 创建示例数据
        sample_data = [
            {
                'date': '2024-01-01',
                'sales_volume': 1000.5,
                'price': 8.5,
                'region': '华东',
                'season': '冬季',
                'weather': '晴天',
                'events': '元旦假期',
                'notes': '节假日期间销量增加'
            },
            {
                'date': '2024-01-02',
                'sales_volume': 950.2,
                'price': 8.3,
                'region': '华东',
                'season': '冬季',
                'weather': '多云',
                'events': '',
                'notes': '工作日正常销量'
            },
            {
                'date': '2024-01-03',
                'sales_volume': 1100.8,
                'price': 8.7,
                'region': '华南',
                'season': '冬季',
                'weather': '晴天',
                'events': '',
                'notes': '南方地区需求稳定'
            }
        ]
        
        # 创建DataFrame
        df = pd.DataFrame(sample_data)
        
        # 创建Excel文件
        output = io.BytesIO()
        df.to_excel(output, index=False, sheet_name='销售样本数据', engine='openpyxl')
        
        output.seek(0)
        
        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            io.BytesIO(output.getvalue()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=sales_sample_template.xlsx"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"模板下载失败: {str(e)}") 