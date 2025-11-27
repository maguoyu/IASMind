# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
自动派工回放路由模块
提供回放数据的 SSE 流式接口
"""

import logging
import json
import asyncio
import random
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/auto_dispatch/replay",
    tags=["auto_dispatch"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)


class ReplayRequest(BaseModel):
    """回放请求参数"""
    airport_id: str
    start_time: str  # ISO 格式时间字符串
    end_time: str    # ISO 格式时间字符串
    playback_speed: float = 1.0  # 播放速度倍数
    vehicle_id: Optional[str] = None  # 筛选车辆ID，None表示全部
    driver_id: Optional[str] = None   # 筛选加油员ID，None表示全部
    task_id: Optional[str] = None      # 筛选任务ID，None表示全部


# Mock 数据生成函数
def generate_mock_vehicle_position(
    vehicle_id: str,
    vehicle_number: str,
    driver_name: str,
    timestamp: datetime,
    base_lon: float = 116.584,
    base_lat: float = 40.080
) -> dict:
    """生成模拟车辆位置数据"""
    # 模拟车辆移动轨迹
    time_offset = (timestamp.timestamp() % 3600) / 3600  # 0-1之间的值
    lon = base_lon + (random.random() - 0.5) * 0.01 + time_offset * 0.002
    lat = base_lat + (random.random() - 0.5) * 0.01 + time_offset * 0.002
    
    # 根据时间模拟状态变化
    status_progress = time_offset
    if status_progress < 0.3:
        status = "assigned"
    elif status_progress < 0.7:
        status = "in_progress"
    else:
        status = "completed"
    
    return {
        "vehicle_id": vehicle_id,
        "vehicle_number": vehicle_number,
        "driver_name": driver_name,
        "longitude": lon,
        "latitude": lat,
        "status": status,
        "timestamp": timestamp.isoformat()
    }


def generate_mock_task_update(
    task_id: str,
    task_number: str,
    flight_number: str,
    timestamp: datetime
) -> dict:
    """生成模拟任务更新数据"""
    time_offset = (timestamp.timestamp() % 3600) / 3600
    status_progress = time_offset
    
    if status_progress < 0.2:
        status = "pending"
    elif status_progress < 0.4:
        status = "assigned"
    elif status_progress < 0.8:
        status = "in_progress"
    else:
        status = "completed"
    
    return {
        "task_id": task_id,
        "task_number": task_number,
        "flight_number": flight_number,
        "status": status,
        "timestamp": timestamp.isoformat()
    }


def generate_mock_flight_update(
    flight_id: str,
    flight_number: str,
    parking_spot_id: str,
    arrival_time: datetime,
    departure_time: datetime,
    current_time: datetime
) -> dict:
    """生成模拟航班更新数据"""
    if current_time < arrival_time:
        status = "arriving"
        position_offset = 0.002  # 还未到达，在停机位外
    elif current_time < arrival_time + timedelta(minutes=2):
        status = "arriving"
        # 正在到达，逐渐靠近停机位
        progress = (current_time - arrival_time).total_seconds() / 120
        position_offset = 0.002 * (1 - progress)
    elif current_time < departure_time:
        status = "parked"
        position_offset = 0
    elif current_time < departure_time + timedelta(minutes=5):
        status = "departing"
        # 正在起飞，逐渐远离停机位
        progress = (current_time - departure_time).total_seconds() / 300
        position_offset = 0.002 * progress
    else:
        status = "departed"
        position_offset = 0.002
    
    # 模拟停机位中心位置
    base_lon = 116.584
    base_lat = 40.080
    spot_index = int(parking_spot_id.split("-")[-1]) if "-" in parking_spot_id else 0
    row = spot_index // 3
    col = spot_index % 3
    lon = base_lon - 0.0025 + col * 0.0025
    lat = base_lat - 0.0015 + row * 0.003
    
    return {
        "flight_id": flight_id,
        "flight_number": flight_number,
        "parking_spot_id": parking_spot_id,
        "status": status,
        "longitude": lon,
        "latitude": lat - position_offset,
        "timestamp": current_time.isoformat()
    }


@router.post("/stream")
async def replay_stream(request: ReplayRequest, http_request: Request):
    """
    回放数据流式接口 - 使用 SSE 推送车辆位置、任务状态、航班信息
    """
    async def generate_stream():
        try:
            # 解析时间
            start_time = datetime.fromisoformat(request.start_time.replace("Z", "+00:00"))
            end_time = datetime.fromisoformat(request.end_time.replace("Z", "+00:00"))
            
            # 发送开始事件
            start_event = {
                "type": "start",
                "message": "开始回放数据流",
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat()
            }
            yield f"event: start\ndata: {json.dumps(start_event, ensure_ascii=False)}\n\n"
            
            # Mock 车辆和任务数据
            mock_vehicles = [
                {"id": "1", "vehicle_number": "V001", "driver_name": "张师傅"},
                {"id": "2", "vehicle_number": "V002", "driver_name": "李师傅"},
                {"id": "3", "vehicle_number": "V003", "driver_name": "王师傅"},
            ]
            
            mock_tasks = [
                {"id": "task-1", "task_number": "TASK-2025-001", "flight_number": "CA1001"},
                {"id": "task-2", "task_number": "TASK-2025-002", "flight_number": "CA1002"},
                {"id": "task-3", "task_number": "TASK-2025-003", "flight_number": "CA1003"},
            ]
            
            mock_flights = [
                {
                    "id": "flight-1",
                    "flight_number": "CA1001",
                    "parking_spot_id": "spot-1",
                    "arrival_time": start_time + timedelta(minutes=10),
                    "departure_time": start_time + timedelta(minutes=50)
                },
                {
                    "id": "flight-2",
                    "flight_number": "CA1002",
                    "parking_spot_id": "spot-2",
                    "arrival_time": start_time + timedelta(minutes=30),
                    "departure_time": start_time + timedelta(minutes=70)
                },
            ]
            
            # 根据播放速度计算时间间隔
            time_step = timedelta(seconds=1.0 / request.playback_speed)
            current_time = start_time
            
            # 循环推送数据
            while current_time <= end_time:
                # 检查客户端是否断开连接
                if await http_request.is_disconnected():
                    logger.info("客户端断开连接，停止数据流")
                    break
                
                # 推送车辆位置更新
                for vehicle in mock_vehicles:
                    # 应用筛选条件
                    if request.vehicle_id and request.vehicle_id != "all" and vehicle["id"] != request.vehicle_id:
                        continue
                    
                    vehicle_data = generate_mock_vehicle_position(
                        vehicle["id"],
                        vehicle["vehicle_number"],
                        vehicle["driver_name"],
                        current_time
                    )
                    
                    # 检查是否匹配筛选条件（通过任务关联）
                    if request.driver_id and request.driver_id != "all":
                        # 这里简化处理，实际应该通过任务关联
                        pass
                    
                    yield f"event: vehicle_update\ndata: {json.dumps(vehicle_data, ensure_ascii=False)}\n\n"
                
                # 推送任务状态更新
                for task in mock_tasks:
                    if request.task_id and request.task_id != "all" and task["id"] != request.task_id:
                        continue
                    
                    task_data = generate_mock_task_update(
                        task["id"],
                        task["task_number"],
                        task["flight_number"],
                        current_time
                    )
                    
                    yield f"event: task_update\ndata: {json.dumps(task_data, ensure_ascii=False)}\n\n"
                
                # 推送航班信息更新
                for flight in mock_flights:
                    flight_data = generate_mock_flight_update(
                        flight["id"],
                        flight["flight_number"],
                        flight["parking_spot_id"],
                        flight["arrival_time"],
                        flight["departure_time"],
                        current_time
                    )
                    
                    yield f"event: flight_update\ndata: {json.dumps(flight_data, ensure_ascii=False)}\n\n"
                
                # 推进时间
                current_time += time_step
                
                # 控制推送频率，避免过快
                await asyncio.sleep(0.1 / request.playback_speed)
            
            # 发送结束事件
            done_event = {"type": "done", "message": "回放数据流结束"}
            yield f"event: done\ndata: {json.dumps(done_event, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            error_msg = f"回放数据流错误: {str(e)}"
            logger.error(f"[SSE] {error_msg}", exc_info=True)
            error_event = {"type": "error", "error": error_msg}
            yield f"event: error\ndata: {json.dumps(error_event, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

