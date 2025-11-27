// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import {
  CarOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  PlayCircleOutlined,
  UserOutlined
} from "@ant-design/icons";
import { useState } from "react";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";

// 任务状态枚举
type TaskStatus = "pending" | "assigned" | "in_progress" | "completed" | "cancelled";

// 车辆状态枚举
type VehicleStatus = "available" | "in_use" | "maintenance";

// 任务接口
interface DispatchTask {
  id: string;
  taskNumber: string;
  flightNumber: string;
  aircraftType: string;
  location: string;
  fuelType: string;
  fuelAmount: number;
  scheduledTime: string;
  assignedVehicle?: string;
  assignedDriver?: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 车辆接口
interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: number;
  fuelType: string;
  status: VehicleStatus;
  driver?: string;
  driverId?: string;
  lastMaintenance?: string;
  location?: string;
}

// 加油员接口
interface Driver {
  id: string;
  name: string;
  employeeNumber: string;
  phone?: string;
  status: "active" | "inactive";
  qualification?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 模拟数据
const mockTasks: DispatchTask[] = [
  {
    id: "1",
    taskNumber: "TASK-2025-001",
    flightNumber: "CA1234",
    aircraftType: "B737",
    location: "停机位A01",
    fuelType: "Jet A-1",
    fuelAmount: 5000,
    scheduledTime: "2025-01-15T10:00:00",
    assignedVehicle: "V001",
    assignedDriver: "张师傅",
    status: "in_progress",
    priority: "high",
    notes: "优先保障",
    createdAt: "2025-01-15T08:00:00",
    updatedAt: "2025-01-15T09:30:00"
  },
  {
    id: "2",
    taskNumber: "TASK-2025-002",
    flightNumber: "MU5678",
    aircraftType: "A320",
    location: "停机位B05",
    fuelType: "Jet A-1",
    fuelAmount: 3500,
    scheduledTime: "2025-01-15T11:30:00",
    status: "pending",
    priority: "medium",
    createdAt: "2025-01-15T09:00:00",
    updatedAt: "2025-01-15T09:00:00"
  },
  {
    id: "3",
    taskNumber: "TASK-2025-003",
    flightNumber: "CZ9012",
    aircraftType: "B777",
    location: "停机位C12",
    fuelType: "Jet A-1",
    fuelAmount: 8000,
    scheduledTime: "2025-01-15T14:00:00",
    assignedVehicle: "V002",
    assignedDriver: "李师傅",
    status: "assigned",
    priority: "high",
    createdAt: "2025-01-15T10:00:00",
    updatedAt: "2025-01-15T10:30:00"
  }
];

const mockVehicles: Vehicle[] = [
  {
    id: "1",
    vehicleNumber: "V001",
    vehicleType: "大型加油车",
    capacity: 15000,
    fuelType: "Jet A-1",
    status: "in_use",
    driver: "张师傅",
    location: "停机位A01",
    lastMaintenance: "2025-01-01"
  },
  {
    id: "2",
    vehicleNumber: "V002",
    vehicleType: "中型加油车",
    capacity: 10000,
    fuelType: "Jet A-1",
    status: "available",
    location: "车库",
    lastMaintenance: "2025-01-10"
  },
  {
    id: "3",
    vehicleNumber: "V003",
    vehicleType: "大型加油车",
    capacity: 15000,
    fuelType: "Jet A-1",
    status: "available",
    location: "车库",
    lastMaintenance: "2025-01-05"
  },
  {
    id: "4",
    vehicleNumber: "V004",
    vehicleType: "小型加油车",
    capacity: 5000,
    fuelType: "Jet A-1",
    status: "maintenance",
    location: "维修车间",
    lastMaintenance: "2024-12-20"
  }
];

const mockDrivers: Driver[] = [
  {
    id: "1",
    name: "张师傅",
    employeeNumber: "E001",
    phone: "13800138001",
    status: "active",
    qualification: "高级加油员",
    notes: "经验丰富，擅长大型飞机加油",
    createdAt: "2024-01-01T00:00:00",
    updatedAt: "2024-01-01T00:00:00"
  },
  {
    id: "2",
    name: "李师傅",
    employeeNumber: "E002",
    phone: "13800138002",
    status: "active",
    qualification: "中级加油员",
    notes: "工作认真负责",
    createdAt: "2024-01-01T00:00:00",
    updatedAt: "2024-01-01T00:00:00"
  },
  {
    id: "3",
    name: "王师傅",
    employeeNumber: "E003",
    phone: "13800138003",
    status: "active",
    qualification: "高级加油员",
    notes: "技术精湛",
    createdAt: "2024-01-01T00:00:00",
    updatedAt: "2024-01-01T00:00:00"
  },
  {
    id: "4",
    name: "赵师傅",
    employeeNumber: "E004",
    phone: "13800138004",
    status: "active",
    qualification: "中级加油员",
    notes: "",
    createdAt: "2024-01-01T00:00:00",
    updatedAt: "2024-01-01T00:00:00"
  }
];

export function AutoDispatchMain() {
  const [tasks, setTasks] = useState<DispatchTask[]>(mockTasks);
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles);
  const [drivers, setDrivers] = useState<Driver[]>(mockDrivers);
  const [activeTab, setActiveTab] = useState<"tasks" | "vehicles" | "drivers">("tasks");
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [showDriverDialog, setShowDriverDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DispatchTask | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [assignVehicleId, setAssignVehicleId] = useState<string>("");
  const [assignDriverId, setAssignDriverId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [driverSearchTerm, setDriverSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // 任务表单状态
  const [taskForm, setTaskForm] = useState<Partial<DispatchTask>>({
    flightNumber: "",
    aircraftType: "",
    location: "",
    fuelType: "Jet A-1",
    fuelAmount: 0,
    scheduledTime: "",
    priority: "medium",
    notes: ""
  });

  // 车辆表单状态
  const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle>>({
    vehicleNumber: "",
    vehicleType: "",
    capacity: 0,
    fuelType: "Jet A-1",
    status: "available",
    location: ""
  });

  // 加油员表单状态
  const [driverForm, setDriverForm] = useState<Partial<Driver>>({
    name: "",
    employeeNumber: "",
    phone: "",
    status: "active",
    qualification: "",
    notes: ""
  });

  // 获取状态标签
  const getStatusBadge = (status: TaskStatus) => {
    const statusMap = {
      pending: { label: "待派工", variant: "secondary" as const, icon: <ClockCircleOutlined /> },
      assigned: { label: "已派工", variant: "default" as const, icon: <CheckCircleOutlined /> },
      in_progress: { label: "进行中", variant: "default" as const, icon: <CheckCircleOutlined /> },
      completed: { label: "已完成", variant: "default" as const, icon: <CheckCircleOutlined /> },
      cancelled: { label: "已取消", variant: "destructive" as const, icon: <CloseCircleOutlined /> }
    };
    const config = statusMap[status];
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <span className="text-xs">{config.icon}</span>
        {config.label}
      </Badge>
    );
  };

  // 获取优先级标签
  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      low: { label: "低", variant: "secondary" as const },
      medium: { label: "中", variant: "default" as const },
      high: { label: "高", variant: "destructive" as const }
    };
    const config = priorityMap[priority as keyof typeof priorityMap];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 获取车辆状态标签
  const getVehicleStatusBadge = (status: VehicleStatus) => {
    const statusMap = {
      available: { label: "可用", variant: "default" as const },
      in_use: { label: "使用中", variant: "secondary" as const },
      maintenance: { label: "维修中", variant: "destructive" as const }
    };
    const config = statusMap[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 创建任务
  const handleCreateTask = () => {
    const newTask: DispatchTask = {
      id: Date.now().toString(),
      taskNumber: `TASK-2025-${String(tasks.length + 1).padStart(3, "0")}`,
      flightNumber: taskForm.flightNumber || "",
      aircraftType: taskForm.aircraftType || "",
      location: taskForm.location || "",
      fuelType: taskForm.fuelType || "Jet A-1",
      fuelAmount: taskForm.fuelAmount || 0,
      scheduledTime: taskForm.scheduledTime || new Date().toISOString(),
      status: "pending",
      priority: taskForm.priority || "medium",
      notes: taskForm.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setTasks([...tasks, newTask]);
    setShowTaskDialog(false);
    setTaskForm({
      flightNumber: "",
      aircraftType: "",
      location: "",
      fuelType: "Jet A-1",
      fuelAmount: 0,
      scheduledTime: "",
      priority: "medium",
      notes: ""
    });
    toast.success("任务创建成功");
  };

  // 删除任务
  const handleDeleteTask = (taskId: string) => {
    if (confirm("确定要删除这个任务吗？")) {
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success("任务删除成功");
    }
  };

  // 打开派工对话框
  const handleOpenAssignDialog = (task: DispatchTask) => {
    setSelectedTask(task);
    setAssignVehicleId("");
    setAssignDriverId("");
    setShowAssignDialog(true);
  };

  // 确认派工
  const handleConfirmAssign = () => {
    if (!selectedTask || !assignVehicleId || !assignDriverId) {
      toast.error("请选择车辆和加油员");
      return;
    }
    handleAssignTask(selectedTask.id, assignVehicleId, assignDriverId);
  };

  // 执行派工
  const handleAssignTask = (taskId: string, vehicleId: string, driverId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    const driver = drivers.find(d => d.id === driverId);
    if (!vehicle || !driver) return;

    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          assignedVehicle: vehicle.vehicleNumber,
          assignedDriver: driver.name,
          status: "assigned",
          updatedAt: new Date().toISOString()
        };
      }
      return task;
    }));

    setVehicles(vehicles.map(v => {
      if (v.id === vehicleId) {
        return {
          ...v,
          status: "in_use",
          driver: driver.name,
          driverId: driver.id
        };
      }
      return v;
    }));

    setShowAssignDialog(false);
    setSelectedTask(null);
    toast.success("派工成功");
  };

  // 更新任务状态
  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const updatedTask = {
          ...task,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };

        // 如果任务完成或取消，释放车辆
        if (newStatus === "completed" || newStatus === "cancelled") {
          if (task.assignedVehicle) {
            setVehicles(vehicles.map(v => {
              if (v.vehicleNumber === task.assignedVehicle) {
                return {
                  ...v,
                  status: "available",
                  driver: undefined
                };
              }
              return v;
            }));
          }
        }

        return updatedTask;
      }
      return task;
    }));
    toast.success("状态更新成功");
  };

  // 创建车辆
  const handleCreateVehicle = () => {
    const driver = vehicleForm.driverId ? drivers.find(d => d.id === vehicleForm.driverId) : null;
    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      vehicleNumber: vehicleForm.vehicleNumber || "",
      vehicleType: vehicleForm.vehicleType || "",
      capacity: vehicleForm.capacity || 0,
      fuelType: vehicleForm.fuelType || "Jet A-1",
      status: vehicleForm.status || "available",
      location: vehicleForm.location || "车库",
      driver: driver?.name,
      driverId: vehicleForm.driverId
    };
    setVehicles([...vehicles, newVehicle]);
    setShowVehicleDialog(false);
    setVehicleForm({
      vehicleNumber: "",
      vehicleType: "",
      capacity: 0,
      fuelType: "Jet A-1",
      status: "available",
      location: "",
      driverId: undefined,
      driver: undefined
    });
    toast.success("车辆添加成功");
  };

  // 删除车辆
  const handleDeleteVehicle = (vehicleId: string) => {
    if (confirm("确定要删除这辆车吗？")) {
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
      toast.success("车辆删除成功");
    }
  };

  // 创建加油员
  const handleCreateDriver = () => {
    const newDriver: Driver = {
      id: Date.now().toString(),
      name: driverForm.name || "",
      employeeNumber: driverForm.employeeNumber || "",
      phone: driverForm.phone,
      status: driverForm.status || "active",
      qualification: driverForm.qualification,
      notes: driverForm.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setDrivers([...drivers, newDriver]);
    setShowDriverDialog(false);
    setDriverForm({
      name: "",
      employeeNumber: "",
      phone: "",
      status: "active",
      qualification: "",
      notes: ""
    });
    toast.success("加油员添加成功");
  };

  // 删除加油员
  const handleDeleteDriver = (driverId: string) => {
    if (confirm("确定要删除这个加油员吗？")) {
      setDrivers(drivers.filter(d => d.id !== driverId));
      toast.success("加油员删除成功");
    }
  };

  // 更新加油员状态
  const handleUpdateDriverStatus = (driverId: string, newStatus: "active" | "inactive") => {
    setDrivers(drivers.map(driver => {
      if (driver.id === driverId) {
        return {
          ...driver,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return driver;
    }));
    toast.success("状态更新成功");
  };

  // 获取加油员状态标签
  const getDriverStatusBadge = (status: "active" | "inactive") => {
    const statusMap = {
      active: { label: "在职", variant: "default" as const },
      inactive: { label: "离职", variant: "secondary" as const }
    };
    const config = statusMap[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 过滤任务
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.taskNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 可用车辆
  const availableVehicles = vehicles.filter(v => v.status === "available");

  // 过滤加油员
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.name.toLowerCase().includes(driverSearchTerm.toLowerCase()) ||
      driver.employeeNumber.toLowerCase().includes(driverSearchTerm.toLowerCase()) ||
      (driver.phone && driver.phone.toLowerCase().includes(driverSearchTerm.toLowerCase()));
    return matchesSearch;
  });

  // 可用加油员
  const availableDrivers = drivers.filter(d => d.status === "active");

  return (
    <div className="flex h-full w-full bg-background">
      {/* 左侧导航栏 */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold mb-2">自动派工系统</h1>
          <p className="text-sm text-muted-foreground">
            航油加油车派工管理
          </p>
        </div>

        <div className="p-2 space-y-1">
          <Button
            variant={activeTab === "tasks" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setActiveTab("tasks")}
          >
            <CarOutlined className="h-4 w-4 mr-2" />
            任务管理
          </Button>
          <Button
            variant={activeTab === "vehicles" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setActiveTab("vehicles")}
          >
            <CarOutlined className="h-4 w-4 mr-2" />
            车辆管理
          </Button>
          <Button
            variant={activeTab === "drivers" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setActiveTab("drivers")}
          >
            <UserOutlined className="h-4 w-4 mr-2" />
            加油员管理
          </Button>
          <Link href="/auto_dispatch/replay" className="w-full">
            <Button
              variant="ghost"
              className="w-full justify-start"
            >
              <PlayCircleOutlined className="h-4 w-4 mr-2" />
              任务回放
            </Button>
          </Link>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 任务管理 */}
        {activeTab === "tasks" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 顶部工具栏 */}
            <div className="border-b p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">任务管理</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    管理和分配航油加油任务
                  </p>
                </div>
                <Button onClick={() => setShowTaskDialog(true)}>
                  <PlusOutlined className="h-4 w-4 mr-2" />
                  新建任务
                </Button>
              </div>

              {/* 搜索和过滤 */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <SearchOutlined className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="搜索任务编号、航班号、位置..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="pending">待派工</SelectItem>
                    <SelectItem value="assigned">已派工</SelectItem>
                    <SelectItem value="in_progress">进行中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 任务列表 */}
            <div className="flex-1 overflow-auto p-6">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>任务编号</TableHead>
                        <TableHead>航班号</TableHead>
                        <TableHead>机型</TableHead>
                        <TableHead>位置</TableHead>
                        <TableHead>油量(L)</TableHead>
                        <TableHead>计划时间</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>优先级</TableHead>
                        <TableHead>车辆/司机</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                            暂无任务数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.taskNumber}</TableCell>
                            <TableCell>{task.flightNumber}</TableCell>
                            <TableCell>{task.aircraftType}</TableCell>
                            <TableCell>{task.location}</TableCell>
                            <TableCell>{task.fuelAmount.toLocaleString()}</TableCell>
                            <TableCell>
                              {new Date(task.scheduledTime).toLocaleString("zh-CN", {
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </TableCell>
                            <TableCell>{getStatusBadge(task.status)}</TableCell>
                            <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                            <TableCell>
                              {task.assignedVehicle ? (
                                <div className="text-sm">
                  <div>{task.assignedVehicle}</div>
                  <div className="text-muted-foreground">{task.assignedDriver}</div>
                </div>
                              ) : (
                                <span className="text-muted-foreground">未分配</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {task.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenAssignDialog(task)}
                                  >
                                    派工
                                  </Button>
                                )}
                                {task.status === "assigned" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateTaskStatus(task.id, "in_progress")}
                                  >
                                    开始
                                  </Button>
                                )}
                                {task.status === "in_progress" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateTaskStatus(task.id, "completed")}
                                  >
                                    完成
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteTask(task.id)}
                                >
                                  <DeleteOutlined className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* 车辆管理 */}
        {activeTab === "vehicles" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 顶部工具栏 */}
            <div className="border-b p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">车辆管理</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    管理加油车辆信息
                  </p>
                </div>
                <Button onClick={() => setShowVehicleDialog(true)}>
                  <PlusOutlined className="h-4 w-4 mr-2" />
                  添加车辆
                </Button>
              </div>
            </div>

            {/* 车辆列表 */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((vehicle) => (
                  <Card key={vehicle.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{vehicle.vehicleNumber}</CardTitle>
                        {getVehicleStatusBadge(vehicle.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">类型:</span>
                          <span>{vehicle.vehicleType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">容量:</span>
                          <span>{vehicle.capacity.toLocaleString()}L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">油品:</span>
                          <span>{vehicle.fuelType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">位置:</span>
                          <span>{vehicle.location}</span>
                        </div>
                        {vehicle.driver && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">操作人:</span>
                            <span>
                              {vehicle.driver}
                              {vehicle.driverId && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({drivers.find(d => d.id === vehicle.driverId)?.employeeNumber || ""})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        {vehicle.lastMaintenance && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">上次保养:</span>
                            <span>{new Date(vehicle.lastMaintenance).toLocaleDateString("zh-CN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit"
                            })}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                        >
                          <DeleteOutlined className="h-4 w-4 mr-2" />
                          删除
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 加油员管理 */}
        {activeTab === "drivers" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 顶部工具栏 */}
            <div className="border-b p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">加油员管理</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    管理加油员信息
                  </p>
                </div>
                <Button onClick={() => setShowDriverDialog(true)}>
                  <PlusOutlined className="h-4 w-4 mr-2" />
                  添加加油员
                </Button>
              </div>

              {/* 搜索 */}
              <div className="relative flex-1 max-w-md">
                <SearchOutlined className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="搜索姓名、工号、电话..."
                  value={driverSearchTerm}
                  onChange={(e) => setDriverSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* 加油员列表 */}
            <div className="flex-1 overflow-auto p-6">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>姓名</TableHead>
                        <TableHead>工号</TableHead>
                        <TableHead>电话</TableHead>
                        <TableHead>资质</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>备注</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDrivers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            暂无加油员数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDrivers.map((driver) => (
                          <TableRow key={driver.id}>
                            <TableCell className="font-medium">{driver.name}</TableCell>
                            <TableCell>{driver.employeeNumber}</TableCell>
                            <TableCell>{driver.phone || "-"}</TableCell>
                            <TableCell>{driver.qualification || "-"}</TableCell>
                            <TableCell>{getDriverStatusBadge(driver.status)}</TableCell>
                            <TableCell className="max-w-xs truncate">{driver.notes || "-"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateDriverStatus(
                                    driver.id,
                                    driver.status === "active" ? "inactive" : "active"
                                  )}
                                >
                                  {driver.status === "active" ? "停用" : "启用"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteDriver(driver.id)}
                                >
                                  <DeleteOutlined className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* 新建任务对话框 */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建任务</DialogTitle>
            <DialogDescription>
              创建新的航油加油任务
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>航班号</Label>
                <Input
                  value={taskForm.flightNumber}
                  onChange={(e) => setTaskForm({ ...taskForm, flightNumber: e.target.value })}
                  placeholder="如: CA1234"
                />
              </div>
              <div className="space-y-2">
                <Label>机型</Label>
                <Input
                  value={taskForm.aircraftType}
                  onChange={(e) => setTaskForm({ ...taskForm, aircraftType: e.target.value })}
                  placeholder="如: B737"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>位置</Label>
                <Input
                  value={taskForm.location}
                  onChange={(e) => setTaskForm({ ...taskForm, location: e.target.value })}
                  placeholder="如: 停机位A01"
                />
              </div>
              <div className="space-y-2">
                <Label>油品类型</Label>
                <Select
                  value={taskForm.fuelType}
                  onValueChange={(value) => setTaskForm({ ...taskForm, fuelType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Jet A-1">Jet A-1</SelectItem>
                    <SelectItem value="Avgas 100LL">Avgas 100LL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>油量 (L)</Label>
                <Input
                  type="number"
                  value={taskForm.fuelAmount}
                  onChange={(e) => setTaskForm({ ...taskForm, fuelAmount: Number(e.target.value) })}
                  placeholder="如: 5000"
                />
              </div>
              <div className="space-y-2">
                <Label>计划时间</Label>
                <Input
                  type="datetime-local"
                  value={taskForm.scheduledTime ? new Date(taskForm.scheduledTime).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setTaskForm({ ...taskForm, scheduledTime: new Date(e.target.value).toISOString() })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>优先级</Label>
              <Select
                value={taskForm.priority}
                onValueChange={(value) => setTaskForm({ ...taskForm, priority: value as "low" | "medium" | "high" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                value={taskForm.notes}
                onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                placeholder="任务备注信息..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateTask}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 派工对话框 */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分配任务</DialogTitle>
            <DialogDescription>
              为任务 {selectedTask?.taskNumber} 分配车辆和司机
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="py-4">
              <div className="space-y-4">
                <div>
                  <Label>选择车辆</Label>
                  <Select
                    value={assignVehicleId}
                    onValueChange={setAssignVehicleId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择可用车辆" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVehicles.length === 0 ? (
                        <SelectItem value="none" disabled>暂无可用车辆</SelectItem>
                      ) : (
                        availableVehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.vehicleNumber} - {vehicle.vehicleType} ({vehicle.capacity}L)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>选择加油员</Label>
                  <Select
                    value={assignDriverId}
                    onValueChange={setAssignDriverId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择加油员" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDrivers.length === 0 ? (
                        <SelectItem value="none" disabled>暂无可用加油员</SelectItem>
                      ) : (
                        availableDrivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name} ({driver.employeeNumber}) - {driver.qualification || "无资质"}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {availableVehicles.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    当前没有可用车辆，请先释放其他任务或添加新车辆
                  </p>
                )}
                {availableDrivers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    当前没有可用加油员，请先添加加油员
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              取消
            </Button>
            <Button onClick={handleConfirmAssign} disabled={!assignVehicleId || !assignDriverId}>
              确认派工
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加车辆对话框 */}
      <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加车辆</DialogTitle>
            <DialogDescription>
              添加新的加油车辆信息
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>车辆编号</Label>
                <Input
                  value={vehicleForm.vehicleNumber}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })}
                  placeholder="如: V001"
                />
              </div>
              <div className="space-y-2">
                <Label>车辆类型</Label>
                <Input
                  value={vehicleForm.vehicleType}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                  placeholder="如: 大型加油车"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>容量 (L)</Label>
                <Input
                  type="number"
                  value={vehicleForm.capacity}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: Number(e.target.value) })}
                  placeholder="如: 15000"
                />
              </div>
              <div className="space-y-2">
                <Label>油品类型</Label>
                <Select
                  value={vehicleForm.fuelType}
                  onValueChange={(value) => setVehicleForm({ ...vehicleForm, fuelType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Jet A-1">Jet A-1</SelectItem>
                    <SelectItem value="Avgas 100LL">Avgas 100LL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>位置</Label>
                <Input
                  value={vehicleForm.location}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, location: e.target.value })}
                  placeholder="如: 车库"
                />
              </div>
              <div className="space-y-2">
                <Label>操作人（加油员）</Label>
                <Select
                  value={vehicleForm.driverId}
                  onValueChange={(value) => {
                    const driver = drivers.find(d => d.id === value);
                    setVehicleForm({
                      ...vehicleForm,
                      driverId: value,
                      driver: driver?.name
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择加油员（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">无</SelectItem>
                    {availableDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name} ({driver.employeeNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVehicleDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateVehicle}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加加油员对话框 */}
      <Dialog open={showDriverDialog} onOpenChange={setShowDriverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加加油员</DialogTitle>
            <DialogDescription>
              添加新的加油员信息
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input
                  value={driverForm.name}
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  placeholder="如: 张师傅"
                />
              </div>
              <div className="space-y-2">
                <Label>工号</Label>
                <Input
                  value={driverForm.employeeNumber}
                  onChange={(e) => setDriverForm({ ...driverForm, employeeNumber: e.target.value })}
                  placeholder="如: E001"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>电话</Label>
                <Input
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  placeholder="如: 13800138001"
                />
              </div>
              <div className="space-y-2">
                <Label>资质</Label>
                <Input
                  value={driverForm.qualification}
                  onChange={(e) => setDriverForm({ ...driverForm, qualification: e.target.value })}
                  placeholder="如: 高级加油员"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={driverForm.status}
                onValueChange={(value) => setDriverForm({ ...driverForm, status: value as "active" | "inactive" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">在职</SelectItem>
                  <SelectItem value="inactive">离职</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                value={driverForm.notes}
                onChange={(e) => setDriverForm({ ...driverForm, notes: e.target.value })}
                placeholder="加油员备注信息..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDriverDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateDriver}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

