// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Feature } from "ol";
import { Point, LineString, Polygon } from "ol/geom";
import { fromLonLat, toLonLat } from "ol/proj";
import { Extent } from "ol/extent";
import { Style, Stroke, Circle as CircleStyle, Fill, Text, Icon } from "ol/style";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import { connectReplayStream, type VehicleUpdate, type TaskUpdate, type FlightUpdate } from "~/core/api/auto-dispatch-replay";

// 机场接口
interface Airport {
  id: string;
  name: string;
  code: string;
  center: [number, number]; // [经度, 纬度]
}

// 车辆接口
interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  status: "available" | "in_use" | "maintenance";
}

// 加油员接口
interface Driver {
  id: string;
  name: string;
  employeeNumber: string;
}

// 停机位接口
interface ParkingSpot {
  id: string;
  name: string;
  coordinates: Array<[number, number]>; // 多边形坐标 [经度, 纬度]
  center: [number, number]; // 中心点
}

// 道路接口
interface Road {
  id: string;
  name: string;
  coordinates: Array<[number, number]>; // 道路坐标点
}

// 航班接口
interface Flight {
  id: string;
  flightNumber: string;
  aircraftType: string;
  parkingSpotId: string;
  arrivalTime: string; // 到达时间
  departureTime: string; // 起飞时间
  status: "arriving" | "parked" | "departing" | "departed";
}

// 任务接口
interface Task {
  id: string;
  taskNumber: string;
  flightNumber: string;
  vehicleId: string;
  vehicleNumber: string;
  driverId: string;
  driverName: string;
  location: string;
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  startTime: string;
  endTime?: string;
  trajectory: Array<{
    timestamp: string;
    longitude: number;
    latitude: number;
    status: string;
  }>;
}

// 模拟数据
const mockAirports: Airport[] = [
  {
    id: "1",
    name: "北京首都国际机场",
    code: "PEK",
    center: [116.584, 40.080]
  },
  {
    id: "2",
    name: "上海浦东国际机场",
    code: "PVG",
    center: [121.805, 31.143]
  },
  {
    id: "3",
    name: "广州白云国际机场",
    code: "CAN",
    center: [113.299, 23.392]
  }
];

const mockVehicles: Vehicle[] = [
  { id: "1", vehicleNumber: "V001", vehicleType: "大型加油车", status: "in_use" },
  { id: "2", vehicleNumber: "V002", vehicleType: "中型加油车", status: "available" },
  { id: "3", vehicleNumber: "V003", vehicleType: "大型加油车", status: "in_use" }
];

const mockDrivers: Driver[] = [
  { id: "1", name: "张师傅", employeeNumber: "E001" },
  { id: "2", name: "李师傅", employeeNumber: "E002" },
  { id: "3", name: "王师傅", employeeNumber: "E003" }
];

// 生成停机位数据（以机场中心为基准）
function generateParkingSpots(airportCenter: [number, number]): ParkingSpot[] {
  const spots: ParkingSpot[] = [];
  const baseLon = airportCenter[0];
  const baseLat = airportCenter[1];
  const offset = 0.0015; // 约150米，缩小停机位尺寸

  // 生成6个停机位，排列成两排，更紧凑
  for (let i = 0; i < 6; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const lon = baseLon - 0.0025 + col * 0.0025;
    const lat = baseLat - 0.0015 + row * 0.003;

    // 创建矩形停机位
    const spot: ParkingSpot = {
      id: `spot-${i + 1}`,
      name: `${String.fromCharCode(65 + row)}${col + 1}`,
      center: [lon, lat],
      coordinates: [
        [lon - offset, lat - offset],
        [lon + offset, lat - offset],
        [lon + offset, lat + offset],
        [lon - offset, lat + offset],
        [lon - offset, lat - offset] // 闭合多边形
      ]
    };
    spots.push(spot);
  }

  return spots;
}

// 生成道路数据
function generateRoads(airportCenter: [number, number], parkingSpots: ParkingSpot[]): Road[] {
  const roads: Road[] = [];
  const baseLon = airportCenter[0];
  const baseLat = airportCenter[1];

  // 主道路（横向），缩小范围
  roads.push({
    id: "road-main",
    name: "主道路",
    coordinates: [
      [baseLon - 0.004, baseLat],
      [baseLon + 0.004, baseLat]
    ]
  });

  // 连接停机位的道路
  parkingSpots.forEach(spot => {
    roads.push({
      id: `road-${spot.id}`,
      name: `连接${spot.name}`,
      coordinates: [
        [spot.center[0], baseLat],
        spot.center
      ]
    });
  });

  return roads;
}

// 生成航班数据
function generateFlights(startTime: Date, endTime: Date, parkingSpots: ParkingSpot[]): Flight[] {
  const flights: Flight[] = [];
  const timeDiff = endTime.getTime() - startTime.getTime();
  const flightDuration = timeDiff / 8; // 8个航班

  for (let i = 0; i < 8; i++) {
    const arrivalTime = new Date(startTime.getTime() + i * flightDuration * 1.2);
    const departureTime = new Date(arrivalTime.getTime() + flightDuration * 0.6);
    
    if (departureTime > endTime) break;

    flights.push({
      id: `flight-${i + 1}`,
      flightNumber: `CA${1000 + i}`,
      aircraftType: ["B737", "A320", "B777", "A330"][i % 4],
      parkingSpotId: parkingSpots[i % parkingSpots.length].id,
      arrivalTime: arrivalTime.toISOString(),
      departureTime: departureTime.toISOString(),
      status: "parked"
    });
  }

  return flights;
}

// 生成模拟任务轨迹数据
function generateMockTasks(startTime: Date, endTime: Date): Task[] {
  const tasks: Task[] = [];
  const timeDiff = endTime.getTime() - startTime.getTime();
  const interval = timeDiff / 5; // 生成5个任务

  for (let i = 0; i < 5; i++) {
    const taskStartTime = new Date(startTime.getTime() + interval * i);
    const taskEndTime = new Date(taskStartTime.getTime() + interval * 0.8);
    
    // 生成轨迹点
    const trajectory: Task["trajectory"] = [];
    const trajectoryPoints = 20;
    const baseLon = 116.584 + (Math.random() - 0.5) * 0.01;
    const baseLat = 40.080 + (Math.random() - 0.5) * 0.01;
    
    for (let j = 0; j < trajectoryPoints; j++) {
      const pointTime = new Date(
        taskStartTime.getTime() + (taskEndTime.getTime() - taskStartTime.getTime()) * (j / trajectoryPoints)
      );
      trajectory.push({
        timestamp: pointTime.toISOString(),
        longitude: baseLon + (Math.random() - 0.5) * 0.005,
        latitude: baseLat + (Math.random() - 0.5) * 0.005,
        status: j < trajectoryPoints * 0.3 ? "assigned" : j < trajectoryPoints * 0.7 ? "in_progress" : "completed"
      });
    }

    tasks.push({
      id: `task-${i + 1}`,
      taskNumber: `TASK-2025-${String(i + 1).padStart(3, "0")}`,
      flightNumber: `CA${1000 + i}`,
      vehicleId: mockVehicles[i % mockVehicles.length].id,
      vehicleNumber: mockVehicles[i % mockVehicles.length].vehicleNumber,
      driverId: mockDrivers[i % mockDrivers.length].id,
      driverName: mockDrivers[i % mockDrivers.length].name,
      location: `停机位${String.fromCharCode(65 + i)}${String(i + 1).padStart(2, "0")}`,
      status: "completed",
      startTime: taskStartTime.toISOString(),
      endTime: taskEndTime.toISOString(),
      trajectory
    });
  }

  return tasks;
}

export function AutoDispatchReplayMain() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const airportLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const airportSourceRef = useRef<VectorSource | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [selectedAirport, setSelectedAirport] = useState<string>("1");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<string>("all");
  const [startTime, setStartTime] = useState<string>(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sseStreamRef = useRef<AsyncGenerator<any> | null>(null);
  const [realtimeVehicles, setRealtimeVehicles] = useState<Map<string, VehicleUpdate>>(new Map());
  const [realtimeTasks, setRealtimeTasks] = useState<Map<string, TaskUpdate>>(new Map());
  const [realtimeFlights, setRealtimeFlights] = useState<Map<string, FlightUpdate>>(new Map());

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current) return;

    const airport = mockAirports.find(a => a.id === selectedAirport);
    if (!airport) return;

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource
    });

    const airportSource = new VectorSource();
    const airportLayer = new VectorLayer({
      source: airportSource,
      zIndex: 1
    });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        airportLayer, // 机场设施层（停机位、道路）
        vectorLayer   // 动态内容层（车辆、飞机）
      ],
      view: new View({
        center: fromLonLat(airport.center),
        zoom: 16,
        minZoom: 15,
        maxZoom: 18
      })
    });

    mapInstanceRef.current = map;
    vectorLayerRef.current = vectorLayer;
    vectorSourceRef.current = vectorSource;
    airportLayerRef.current = airportLayer;
    airportSourceRef.current = airportSource;

    // 生成停机位和道路
    const spots = generateParkingSpots(airport.center);
    const roadData = generateRoads(airport.center, spots);
    setParkingSpots(spots);
    setRoads(roadData);

    // 计算机场范围并设置地图视图范围
    const minLon = airport.center[0] - 0.005;
    const minLat = airport.center[1] - 0.004;
    const maxLon = airport.center[0] + 0.005;
    const maxLat = airport.center[1] + 0.004;
    
    const minCoord = fromLonLat([minLon, minLat]);
    const maxCoord = fromLonLat([maxLon, maxLat]);
    
    const extent: Extent = [
      minCoord[0],
      minCoord[1],
      maxCoord[0],
      maxCoord[1]
    ];
    
    // 设置地图视图范围，使其只显示机场区域
    setTimeout(() => {
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 0
      });
    }, 100);

    // 绘制停机位
    spots.forEach(spot => {
      const polygon = new Polygon([spot.coordinates.map(coord => fromLonLat(coord))]);
      const feature = new Feature({
        geometry: polygon,
        name: spot.name
      });

      feature.setStyle(new Style({
        fill: new Fill({
          color: "rgba(200, 200, 200, 0.3)"
        }),
        stroke: new Stroke({
          color: "#666",
          width: 2
        }),
        text: new Text({
          text: spot.name,
          fill: new Fill({ color: "#333" }),
          font: "bold 12px sans-serif"
        })
      }));

      airportSource.addFeature(feature);
    });

    // 绘制道路
    roadData.forEach(road => {
      const line = new LineString(road.coordinates.map(coord => fromLonLat(coord)));
      const feature = new Feature({
        geometry: line,
        name: road.name
      });

      feature.setStyle(new Style({
        stroke: new Stroke({
          color: "#333",
          width: 4
        })
      }));

      airportSource.addFeature(feature);
    });

    return () => {
      map.setTarget(undefined);
    };
  }, [selectedAirport]);

  // 加载任务数据和航班数据
  useEffect(() => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const loadedTasks = generateMockTasks(start, end);
    setTasks(loadedTasks);
    
    if (parkingSpots.length > 0) {
      const loadedFlights = generateFlights(start, end, parkingSpots);
      setFlights(loadedFlights);
    }
  }, [startTime, endTime, parkingSpots]);

  // 过滤任务
  useEffect(() => {
    let filtered = tasks;

    if (selectedVehicle !== "all") {
      filtered = filtered.filter(t => t.vehicleId === selectedVehicle);
    }

    if (selectedDriver !== "all") {
      filtered = filtered.filter(t => t.driverId === selectedDriver);
    }

    if (selectedTask !== "all") {
      filtered = filtered.filter(t => t.id === selectedTask);
    }

    setFilteredTasks(filtered);
  }, [tasks, selectedVehicle, selectedDriver, selectedTask]);

  // 更新地图显示 - 使用 SSE 实时数据
  useEffect(() => {
    if (!vectorSourceRef.current || !mapInstanceRef.current) return;

    const source = vectorSourceRef.current;
    source.clear();

    // 如果正在播放，使用 SSE 实时数据；否则使用本地生成的轨迹数据
    if (isPlaying && realtimeVehicles.size > 0) {
      // 使用 SSE 实时车辆数据
      realtimeVehicles.forEach((vehicle) => {
        // 应用筛选条件
        if (selectedVehicle !== "all" && vehicle.vehicle_id !== selectedVehicle) {
          return;
        }

        const vehicleFeature = new Feature({
          geometry: new Point(fromLonLat([vehicle.longitude, vehicle.latitude])),
          vehicleNumber: vehicle.vehicle_number,
          status: vehicle.status
        });

        // 使用SVG创建更友好的车辆图标
        const statusColor = getStatusColor(vehicle.status);
        const svgIcon = `
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <g>
              <!-- 车辆主体 -->
              <rect x="4" y="12" width="24" height="12" rx="2" fill="${statusColor}" stroke="#fff" stroke-width="2"/>
              <!-- 车窗 -->
              <rect x="8" y="16" width="6" height="4" rx="1" fill="#fff" opacity="0.8"/>
              <rect x="18" y="16" width="6" height="4" rx="1" fill="#fff" opacity="0.8"/>
              <!-- 车轮 -->
              <circle cx="10" cy="26" r="3" fill="#333" stroke="#fff" stroke-width="1"/>
              <circle cx="22" cy="26" r="3" fill="#333" stroke="#fff" stroke-width="1"/>
              <!-- 车顶 -->
              <rect x="10" y="8" width="12" height="6" rx="1" fill="${statusColor}" stroke="#fff" stroke-width="1"/>
            </g>
          </svg>
        `;

        const iconUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgIcon);

        const vehicleStyle = new Style({
          image: new Icon({
            src: iconUrl,
            scale: 1,
            anchor: [0.5, 0.9],
            opacity: 1
          }),
          text: new Text({
            text: `${vehicle.driver_name}\n${vehicle.vehicle_number}`,
            offsetY: -30,
            fill: new Fill({ color: "#000" }),
            stroke: new Stroke({ color: "#fff", width: 3 }),
            font: "bold 10px sans-serif",
            backgroundFill: new Fill({ color: "rgba(255, 255, 255, 0.9)" }),
            padding: [3, 5],
            textAlign: "center"
          })
        });
        vehicleFeature.setStyle(vehicleStyle);
        source.addFeature(vehicleFeature);
      });
    } else {
      // 使用本地生成的轨迹数据（非播放状态）
      const currentDate = new Date(startTime);
      currentDate.setTime(currentDate.getTime() + currentTime);

      filteredTasks.forEach(task => {
        const visiblePoints = task.trajectory.filter(
          point => new Date(point.timestamp) <= currentDate
        );

        if (visiblePoints.length === 0) return;

        const lastPoint = visiblePoints[visiblePoints.length - 1];
        const vehicleFeature = new Feature({
          geometry: new Point(fromLonLat([lastPoint.longitude, lastPoint.latitude])),
          vehicleNumber: task.vehicleNumber,
          status: lastPoint.status
        });

        const statusColor = getStatusColor(lastPoint.status);
        const svgIcon = `
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <g>
              <rect x="4" y="12" width="24" height="12" rx="2" fill="${statusColor}" stroke="#fff" stroke-width="2"/>
              <rect x="8" y="16" width="6" height="4" rx="1" fill="#fff" opacity="0.8"/>
              <rect x="18" y="16" width="6" height="4" rx="1" fill="#fff" opacity="0.8"/>
              <circle cx="10" cy="26" r="3" fill="#333" stroke="#fff" stroke-width="1"/>
              <circle cx="22" cy="26" r="3" fill="#333" stroke="#fff" stroke-width="1"/>
              <rect x="10" y="8" width="12" height="6" rx="1" fill="${statusColor}" stroke="#fff" stroke-width="1"/>
            </g>
          </svg>
        `;

        const iconUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgIcon);

        const vehicleStyle = new Style({
          image: new Icon({
            src: iconUrl,
            scale: 1,
            anchor: [0.5, 0.9],
            opacity: 1
          }),
          text: new Text({
            text: `${task.driverName}\n${task.vehicleNumber}`,
            offsetY: -30,
            fill: new Fill({ color: "#000" }),
            stroke: new Stroke({ color: "#fff", width: 3 }),
            font: "bold 10px sans-serif",
            backgroundFill: new Fill({ color: "rgba(255, 255, 255, 0.9)" }),
            padding: [3, 5],
            textAlign: "center"
          })
        });
        vehicleFeature.setStyle(vehicleStyle);
        source.addFeature(vehicleFeature);
      });
    }

    // 显示飞机 - 优先使用 SSE 实时数据
    if (isPlaying && realtimeFlights.size > 0) {
      // 使用 SSE 实时航班数据
      realtimeFlights.forEach((flightData) => {
        const parkingSpot = parkingSpots.find(spot => spot.id === flightData.parking_spot_id);
        if (!parkingSpot) return;

        let flightStatus: Flight["status"] = flightData.status as Flight["status"];
        let position: [number, number] = [flightData.longitude, flightData.latitude];
        let rotation = 0;
        let scale = 1;
        let opacity = 1;

        // 根据状态设置动画参数
        if (flightStatus === "arriving") {
          const arrivalTime = new Date(flightData.timestamp);
          const baseTime = new Date(startTime);
          const progress = (arrivalTime.getTime() - baseTime.getTime()) / (2 * 60 * 1000);
          scale = Math.max(0.5, 0.5 + progress * 0.5);
          opacity = Math.max(0.3, 0.5 + progress * 0.5);
        } else if (flightStatus === "departing") {
          const departureTime = new Date(flightData.timestamp);
          const baseTime = new Date(startTime);
          const progress = (departureTime.getTime() - baseTime.getTime()) / (5 * 60 * 1000);
          rotation = 30 * progress;
          scale = 1 + progress * 0.3;
          opacity = Math.max(0.2, 1 - progress * 0.8);
        } else if (flightStatus === "parked") {
          scale = 1;
          opacity = 1;
          rotation = 0;
        } else {
          return; // 已起飞，不显示
        }

        // 确保值在有效范围内
        scale = Math.max(0.5, Math.min(2, scale));
        opacity = Math.max(0.2, Math.min(1, opacity));

        const aircraftFeature = new Feature({
          geometry: new Point(fromLonLat(position)),
          flightNumber: flightData.flight_number,
          aircraftType: "B737"
        });

        // 使用参考的飞机图标SVG，根据状态改变颜色
        const statusColor = flightStatus === 'parked' ? '#1890ff' : flightStatus === 'departing' ? '#ff4d4f' : '#52c41a';
        
        // 使用参考的飞机图标，缩放并改变颜色
        const svgIcon = `<svg width="48" height="48" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path d="M599.06048 831.309824l12.106752-193.404928 372.860928 184.430592L984.02816 710.206464 617.906176 367.33952 617.906176 151.638016c0-56.974336-46.188544-143.064064-103.158784-143.064064-56.974336 0-103.158784 86.089728-103.158784 143.064064L411.588608 367.33952 45.461504 710.206464l0 112.129024 366.660608-184.430592 14.999552 209.27488c0 5.05344 0.594944 9.892864 1.124352 14.749696l-66.591744 60.348416 0 66.587648 153.986048-50.879488 2.43712-0.80896 147.439616 51.688448 0-66.587648-68.758528-62.253056L599.06048 831.309824z" fill="${statusColor}"/>
        </svg>`;
        
        const iconUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgIcon);

        // 确保scale和opacity在有效范围内，恢复到上一次的大小（1.5倍）
        const finalScale = Math.max(0.8, Math.min(2.5, scale)) * 1.5; // 增加1.5倍基础尺寸
        const finalOpacity = Math.max(0.3, Math.min(1, opacity));
        
        const aircraftStyle = new Style({
          image: new Icon({
            src: iconUrl,
            scale: finalScale,
            rotation: (rotation * Math.PI) / 180,
            opacity: finalOpacity,
            anchor: [0.5, 0.5],
            size: [48, 48]
          }),
          text: new Text({
            text: flightData.flight_number,
            offsetY: -30,
            fill: new Fill({ color: "#000" }),
            stroke: new Stroke({ color: "#fff", width: 3 }),
            font: "bold 11px sans-serif",
            opacity: opacity,
            backgroundFill: new Fill({ color: "rgba(255, 255, 255, 0.9)" }),
            padding: [2, 4],
            textAlign: "center"
          })
        });

        aircraftFeature.setStyle(aircraftStyle);
        source.addFeature(aircraftFeature);
      });
    } else {
      // 使用本地生成的航班数据（非播放状态或没有实时数据）
      const currentDate = new Date(startTime);
      currentDate.setTime(currentDate.getTime() + currentTime);

      flights.forEach(flight => {
        const arrivalTime = new Date(flight.arrivalTime);
        const departureTime = new Date(flight.departureTime);
        const parkingSpot = parkingSpots.find(spot => spot.id === flight.parkingSpotId);
        
        if (!parkingSpot) return;

        let flightStatus: Flight["status"] = "departed";
        let position: [number, number] = parkingSpot.center;
        let rotation = 0;
        let scale = 1;
        let opacity = 1;

        // 判断飞机状态
        if (currentDate < arrivalTime) {
          return;
        } else if (currentDate >= arrivalTime && currentDate < arrivalTime.getTime() + 2 * 60 * 1000) {
          flightStatus = "arriving";
          const arrivalProgress = (currentDate.getTime() - arrivalTime.getTime()) / (2 * 60 * 1000);
          const startOffset = 0.002;
          const offset = startOffset * (1 - arrivalProgress);
          position = [parkingSpot.center[0], parkingSpot.center[1] - offset];
          scale = Math.max(0.5, 0.5 + arrivalProgress * 0.5);
          opacity = Math.max(0.3, 0.5 + arrivalProgress * 0.5);
        } else if (currentDate >= arrivalTime.getTime() + 2 * 60 * 1000 && currentDate < departureTime) {
          flightStatus = "parked";
          position = parkingSpot.center;
          scale = 1;
          opacity = 1;
          rotation = 0;
        } else if (currentDate >= departureTime && currentDate < departureTime.getTime() + 5 * 60 * 1000) {
          flightStatus = "departing";
          const departureProgress = (currentDate.getTime() - departureTime.getTime()) / (5 * 60 * 1000);
          const offset = 0.002 * departureProgress;
          position = [parkingSpot.center[0], parkingSpot.center[1] - offset];
          rotation = 30 * departureProgress;
          scale = 1 + departureProgress * 0.3;
          opacity = Math.max(0.2, 1 - departureProgress * 0.8);
        } else {
          return;
        }

        // 确保值在有效范围内
        scale = Math.max(0.5, Math.min(2, scale));
        opacity = Math.max(0.2, Math.min(1, opacity));

        const aircraftFeature = new Feature({
          geometry: new Point(fromLonLat(position)),
          flightNumber: flight.flightNumber,
          aircraftType: flight.aircraftType
        });

        const statusColor = flightStatus === 'parked' ? '#1890ff' : flightStatus === 'departing' ? '#ff4d4f' : '#52c41a';
        
        const svgIcon = `<svg width="48" height="48" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path d="M599.06048 831.309824l12.106752-193.404928 372.860928 184.430592L984.02816 710.206464 617.906176 367.33952 617.906176 151.638016c0-56.974336-46.188544-143.064064-103.158784-143.064064-56.974336 0-103.158784 86.089728-103.158784 143.064064L411.588608 367.33952 45.461504 710.206464l0 112.129024 366.660608-184.430592 14.999552 209.27488c0 5.05344 0.594944 9.892864 1.124352 14.749696l-66.591744 60.348416 0 66.587648 153.986048-50.879488 2.43712-0.80896 147.439616 51.688448 0-66.587648-68.758528-62.253056L599.06048 831.309824z" fill="${statusColor}"/>
        </svg>`;
        
        const iconUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgIcon);

        const finalScale = Math.max(0.8, Math.min(2.5, scale)) * 1.5;
        const finalOpacity = Math.max(0.3, Math.min(1, opacity));
        
        const aircraftStyle = new Style({
          image: new Icon({
            src: iconUrl,
            scale: finalScale,
            rotation: (rotation * Math.PI) / 180,
            opacity: finalOpacity,
            anchor: [0.5, 0.5],
            size: [48, 48]
          }),
          text: new Text({
            text: flight.flightNumber,
            offsetY: -30,
            fill: new Fill({ color: "#000" }),
            stroke: new Stroke({ color: "#fff", width: 3 }),
            font: "bold 11px sans-serif",
            opacity: opacity,
            backgroundFill: new Fill({ color: "rgba(255, 255, 255, 0.9)" }),
            padding: [2, 4],
            textAlign: "center"
          })
        });

        aircraftFeature.setStyle(aircraftStyle);
        source.addFeature(aircraftFeature);

        // 如果是到达动画（显示脉冲效果）- 只在播放时显示
        if (isPlaying && currentDate >= arrivalTime && currentDate < arrivalTime.getTime() + 2 * 60 * 1000) {
          const arrivalProgress = (currentDate.getTime() - arrivalTime.getTime()) / (2 * 60 * 1000);
          const pulseScale = 1 + Math.sin(arrivalProgress * Math.PI * 4) * 0.2;
          
          const pulseStyle = new Style({
            image: new CircleStyle({
              radius: 20 * pulseScale,
              fill: new Fill({
                color: `rgba(24, 144, 255, ${0.2 * (1 - arrivalProgress)})`
              }),
              stroke: new Stroke({
                color: "#1890ff",
                width: 2,
                lineDash: [5, 5]
              })
            })
          });

          const pulseFeature = new Feature({
            geometry: new Point(fromLonLat(parkingSpot.center))
          });
          pulseFeature.setStyle(pulseStyle);
          source.addFeature(pulseFeature);
        }

        // 如果是起飞动画（显示起飞轨迹）
        if (flightStatus === "departing") {
          const departureProgress = (currentDate.getTime() - departureTime.getTime()) / (5 * 60 * 1000);
          const trailLength = 3;
          
          for (let i = 0; i < trailLength; i++) {
            const trailProgress = departureProgress - (i * 0.1);
            if (trailProgress > 0) {
              const trailOffset = 0.001 * trailProgress;
              const trailPosition: [number, number] = [
                parkingSpot.center[0],
                parkingSpot.center[1] + trailOffset
              ];
              
              const trailFeature = new Feature({
                geometry: new Point(fromLonLat(trailPosition))
              });

              const trailStyle = new Style({
                image: new CircleStyle({
                  radius: 3 * (1 - i * 0.3),
                  fill: new Fill({
                    color: `rgba(255, 77, 79, ${0.5 * (1 - trailProgress)})`
                  })
                })
              });

              trailFeature.setStyle(trailStyle);
              source.addFeature(trailFeature);
            }
          }
        }
      });
    }

    // 使用 requestAnimationFrame 实现平滑动画
    if (isPlaying && animationFrameRef.current === null) {
      const animate = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.render();
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (!isPlaying && animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [filteredTasks, currentTime, startTime, flights, parkingSpots, isPlaying, realtimeVehicles, realtimeFlights]);

  // 获取状态颜色
  function getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      pending: "#8c8c8c",
      assigned: "#1890ff",
      in_progress: "#fa8c16",
      completed: "#52c41a",
      cancelled: "#ff4d4f"
    };
    return colorMap[status] || "#8c8c8c";
  }

  // 播放/暂停控制
  const handlePlayPause = () => {
    if (isPlaying) {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      const totalDuration = end - start;
      const step = totalDuration / 1000; // 分成1000步

      playbackIntervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + step * playbackSpeed;
          if (newTime >= totalDuration) {
            if (playbackIntervalRef.current) {
              clearInterval(playbackIntervalRef.current);
              playbackIntervalRef.current = null;
            }
            setIsPlaying(false);
            return totalDuration;
          }
          return newTime;
        });
      }, 100);

      setIsPlaying(true);
    }
  };

  // 重置回放
  const handleReset = () => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // 时间轴变化
  const handleTimeSliderChange = (value: number[]) => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const totalDuration = end - start;
    setCurrentTime((value[0] / 100) * totalDuration);
  };

  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const totalDuration = end - start;
  const currentDate = new Date(start + currentTime);
  const timeProgress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex h-full w-full flex-col bg-background overflow-hidden" style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* 顶部查询区域 */}
      <div className="border-b bg-muted/30 p-4 flex-shrink-0">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>机场</Label>
            <Select value={selectedAirport} onValueChange={setSelectedAirport}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mockAirports.map(airport => (
                  <SelectItem key={airport.id} value={airport.id}>
                    {airport.name} ({airport.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>车辆</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部车辆</SelectItem>
                {mockVehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicleNumber} - {vehicle.vehicleType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>加油员</Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部加油员</SelectItem>
                {mockDrivers.map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name} ({driver.employeeNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>任务</Label>
            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部任务</SelectItem>
                {tasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.taskNumber} - {task.flightNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 地图区域 */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0, flex: '1 1 auto' }}>
        <div ref={mapRef} className="h-full w-full" style={{ height: '100%', width: '100%' }} />
        <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 p-2 rounded-lg shadow-lg">
          <div className="text-sm font-semibold mb-2">当前时间</div>
          <div className="text-lg">
            {currentDate.toLocaleString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            })}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            任务数: {filteredTasks.length}
          </div>
        </div>
      </div>

      {/* 底部控制区域 */}
      <div className="border-t bg-muted/30 p-4">
        <div className="space-y-4">
          {/* 时间范围选择 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>开始时间</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  handleReset();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>结束时间</Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  handleReset();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>播放速度: {playbackSpeed}x</Label>
              <Slider
                value={[playbackSpeed]}
                onValueChange={(value) => setPlaybackSpeed(value[0])}
                min={0.5}
                max={5}
                step={0.5}
                className="w-full"
              />
            </div>
          </div>

          {/* 播放控制 */}
          <div className="flex items-center gap-4">
            <Button onClick={handlePlayPause} variant="default">
              {isPlaying ? (
                <>
                  <PauseCircleOutlined className="h-4 w-4 mr-2" />
                  暂停
                </>
              ) : (
                <>
                  <PlayCircleOutlined className="h-4 w-4 mr-2" />
                  播放
                </>
              )}
            </Button>
            <Button onClick={handleReset} variant="outline">
              <ReloadOutlined className="h-4 w-4 mr-2" />
              重置
            </Button>

            {/* 时间轴 */}
            <div className="flex-1 ml-4">
              <Label className="mb-2 block">
                时间轴: {currentDate.toLocaleString("zh-CN", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </Label>
              <Slider
                value={[timeProgress]}
                onValueChange={handleTimeSliderChange}
                min={0}
                max={100}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

