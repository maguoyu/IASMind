-- =====================================================
-- 航班跟踪系统数据库初始化脚本
-- 数据库: workflow-test
-- 创建时间: 2025-11-04
-- =====================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `workflow-test` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `workflow-test`;

-- =====================================================
-- 1. flights - 航班信息表
-- =====================================================
CREATE TABLE IF NOT EXISTS flights (
  flight_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '航班ID',
  flight_number VARCHAR(10) NOT NULL UNIQUE COMMENT '航班号 (e.g., CA123)',
  airline_name VARCHAR(50) NOT NULL COMMENT '航司名称',
  aircraft_type VARCHAR(50) COMMENT '机型 (e.g., B787, A320)',
  departure_city VARCHAR(50) NOT NULL COMMENT '出发城市',
  arrival_city VARCHAR(50) NOT NULL COMMENT '到达城市',
  departure_time DATETIME NOT NULL COMMENT '预计出发时间',
  arrival_time DATETIME NOT NULL COMMENT '预计到达时间',
  actual_departure DATETIME COMMENT '实际出发时间',
  actual_arrival DATETIME COMMENT '实际到达时间',
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' COMMENT '状态：scheduled/delayed/cancelled/arrived',
  delay_minutes INT DEFAULT 0 COMMENT '延误分钟数',
  delay_reason VARCHAR(255) COMMENT '延误原因',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_flight_number (flight_number),
  INDEX idx_status (status),
  INDEX idx_departure_time (departure_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='航班信息表';

-- =====================================================
-- 2. flight_changes - 航班变更记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS flight_changes (
  change_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '变更ID',
  flight_id INT NOT NULL COMMENT '航班ID (FK)',
  flight_number VARCHAR(10) NOT NULL COMMENT '航班号',
  change_type VARCHAR(30) NOT NULL COMMENT '变更类型：time/status/gate/aircraft等',
  change_description VARCHAR(255) NOT NULL COMMENT '变更描述',
  previous_value VARCHAR(255) COMMENT '之前的值',
  new_value VARCHAR(255) NOT NULL COMMENT '新值',
  change_time DATETIME NOT NULL COMMENT '变更时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (flight_id) REFERENCES flights(flight_id) ON DELETE CASCADE,
  INDEX idx_flight_id (flight_id),
  INDEX idx_flight_number (flight_number),
  INDEX idx_change_time (change_time),
  INDEX idx_change_type (change_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='航班变更记录表';

-- =====================================================
-- 3. 初始化示例数据 - flights 表
-- =====================================================
INSERT INTO flights (flight_number, airline_name, aircraft_type, departure_city, arrival_city, departure_time, arrival_time, status, created_at) VALUES
('CA123', '中国国航', 'B787', '北京', '上海', '2025-11-04 10:00:00', '2025-11-04 12:30:00', 'scheduled', NOW()),
('MU456', '中国东方', 'A320', '上海', '广州', '2025-11-04 14:00:00', '2025-11-04 16:00:00', 'scheduled', NOW()),
('ZH789', '深圳航空', 'B737', '深圳', '北京', '2025-11-04 11:30:00', '2025-11-04 14:00:00', 'delayed', NOW()),
('CA888', '中国国航', 'A380', '北京', '伦敦', '2025-11-04 18:00:00', '2025-11-05 06:00:00', 'scheduled', NOW()),
('CZ999', '中国南方', 'B777', '广州', '美国纽约', '2025-11-04 20:00:00', '2025-11-05 08:00:00', 'scheduled', NOW()),
('HU1001', '海南航空', 'B787', '三亚', '上海', '2025-11-03 15:00:00', '2025-11-03 17:30:00', 'arrived', NOW()),
('BZ1111', '北京航空', 'A320', '北京', '成都', '2025-11-04 16:30:00', '2025-11-04 18:00:00', 'scheduled', NOW()),
('9H1212', '西部航空', 'B737', '重庆', '武汉', '2025-11-04 13:00:00', '2025-11-04 14:30:00', 'scheduled', NOW()),
('FZ1313', '首都航空', 'A320', '北京', '南京', '2025-11-04 09:00:00', '2025-11-04 11:00:00', 'cancelled', NOW()),
('PN1414', '平阳航空', 'B737', '浙江', '上海', '2025-11-04 12:00:00', '2025-11-04 13:00:00', 'scheduled', NOW());

-- =====================================================
-- 4. 初始化示例数据 - flight_changes 表
-- =====================================================
INSERT INTO flight_changes (flight_id, flight_number, change_type, change_description, previous_value, new_value, change_time) VALUES
(1, 'CA123', 'time', '出发时间延迟', '2025-11-04 10:00:00', '2025-11-04 10:30:00', '2025-11-04 09:45:00'),
(1, 'CA123', 'gate', '登机口变更', '5号', '7号', '2025-11-04 09:50:00'),
(3, 'ZH789', 'status', '航班延误', 'scheduled', 'delayed', '2025-11-04 11:15:00'),
(3, 'ZH789', 'time', '预计延误30分钟', '11:30', '12:00', '2025-11-04 11:20:00'),
(3, 'ZH789', 'delay_reason', '天气原因变更', '未知', '恶劣天气', '2025-11-04 11:25:00'),
(2, 'MU456', 'gate', '登机口确认', '', '12号', '2025-11-04 13:30:00'),
(4, 'CA888', 'gate', '登机口分配', '', '1号', '2025-11-04 17:00:00'),
(6, 'HU1001', 'status', '航班已到达', 'delayed', 'arrived', '2025-11-03 17:35:00'),
(9, 'FZ1313', 'status', '航班取消', 'scheduled', 'cancelled', '2025-11-04 08:00:00'),
(9, 'FZ1313', 'cancel_reason', '取消原因', '待定', '机械故障', '2025-11-04 08:05:00');

-- =====================================================
-- 5. 常用查询语句示例
-- =====================================================

-- 查询所有延误的航班
-- SELECT * FROM flights WHERE status = 'delayed' ORDER BY departure_time;

-- 查询特定航班的所有变更记录
-- SELECT * FROM flight_changes WHERE flight_number = 'CA123' ORDER BY change_time DESC;

-- 查询最近24小时的航班变更
-- SELECT fc.*, f.flight_number, f.departure_city, f.arrival_city
-- FROM flight_changes fc
-- JOIN flights f ON fc.flight_id = f.flight_id
-- WHERE fc.change_time >= DATE_SUB(NOW(), INTERVAL 1 DAY)
-- ORDER BY fc.change_time DESC;

-- 统计各航司的航班数和延误数
-- SELECT 
--   airline_name,
--   COUNT(*) as total_flights,
--   SUM(CASE WHEN status = 'delayed' THEN 1 ELSE 0 END) as delayed_count
-- FROM flights
-- GROUP BY airline_name;

-- 查询航班变更的类型统计
-- SELECT 
--   change_type,
--   COUNT(*) as count
-- FROM flight_changes
-- GROUP BY change_type
-- ORDER BY count DESC;
