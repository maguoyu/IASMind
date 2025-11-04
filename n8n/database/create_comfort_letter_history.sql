-- ============================================================================
-- 航班延误安抚信发送历史表
-- ============================================================================
-- 版本: 1.0
-- 说明: 用于记录所有通过n8n工作流发送的安抚信信息、发送状态和用户反馈
-- ============================================================================

-- 创建表
CREATE TABLE IF NOT EXISTS comfort_letter_history (
  -- ========== 主键 ==========
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '发送记录ID',
  
  -- ========== 航班信息 ==========
  flight_number VARCHAR(50) NOT NULL COMMENT '航班号',
  flight_id INT COMMENT '航班ID（关联flights表）',
  
  -- ========== 乘客信息 ==========
  passenger_email VARCHAR(255) NOT NULL COMMENT '乘客邮箱',
  passenger_name VARCHAR(100) NOT NULL COMMENT '乘客姓名',
  passenger_phone VARCHAR(20) COMMENT '乘客电话（可选）',
  
  -- ========== 延误信息 ==========
  delay_minutes INT COMMENT '延误分钟数',
  delay_reason VARCHAR(255) COMMENT '延误原因（天气/机械故障/运营等）',
  
  -- ========== 安抚信内容 ==========
  letter_content_zh LONGTEXT COMMENT '中文版本安抚信',
  letter_content_en LONGTEXT COMMENT '英文版本安抚信',
  language VARCHAR(10) DEFAULT 'both' COMMENT '语言选项: zh|en|both',
  
  -- ========== 补偿信息 ==========
  compensation_level VARCHAR(50) COMMENT '补偿等级: basic|standard|premium',
  compensation_amount DECIMAL(10, 2) COMMENT '补偿金额（人民币）',
  compensation_details TEXT COMMENT '补偿详情说明',
  
  -- ========== 发送状态 ==========
  send_status VARCHAR(50) DEFAULT 'pending' COMMENT '发送状态: pending|sent|failed|bounced',
  send_method VARCHAR(50) DEFAULT 'email' COMMENT '发送方式: email|sms|push|multiple',
  send_time DATETIME COMMENT '实际发送时间',
  
  -- ========== 用户反馈 ==========
  user_feedback TEXT COMMENT '乘客反馈内容',
  feedback_rating INT COMMENT '满意度评分（1-5）',
  feedback_time DATETIME COMMENT '反馈时间',
  
  -- ========== 工作流信息 ==========
  session_id VARCHAR(100) COMMENT '会话ID',
  workflow_execution_id VARCHAR(100) COMMENT '工作流执行ID',
  
  -- ========== 时间戳 ==========
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- ========== 索引 ==========
  INDEX idx_flight_number (flight_number),
  INDEX idx_passenger_email (passenger_email),
  INDEX idx_flight_id (flight_id),
  INDEX idx_send_status (send_status),
  INDEX idx_send_time (send_time),
  INDEX idx_created_at (created_at),
  UNIQUE KEY unique_letter (flight_number, passenger_email, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='航班延误安抚信发送历史表';

-- ============================================================================
-- 添加外键约束（确保flights表存在）
-- ============================================================================
ALTER TABLE comfort_letter_history 
ADD CONSTRAINT fk_comfort_flight_id 
FOREIGN KEY (flight_id) REFERENCES flights(flight_id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- ============================================================================
-- 创建相关视图（可选）
-- ============================================================================

-- 未发送和失败记录视图
CREATE OR REPLACE VIEW v_pending_comfort_letters AS
SELECT 
  id,
  flight_number,
  passenger_email,
  passenger_name,
  send_status,
  created_at,
  CASE 
    WHEN send_status = 'pending' THEN '等待发送'
    WHEN send_status = 'failed' THEN '发送失败'
    WHEN send_status = 'bounced' THEN '邮件退回'
  END as status_cn
FROM comfort_letter_history
WHERE send_status IN ('pending', 'failed', 'bounced')
ORDER BY created_at DESC;

-- 日统计视图
CREATE OR REPLACE VIEW v_daily_comfort_letter_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_count,
  SUM(CASE WHEN send_status = 'sent' THEN 1 ELSE 0 END) as sent_count,
  SUM(CASE WHEN send_status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  ROUND(SUM(compensation_amount), 2) as total_compensation,
  ROUND(AVG(feedback_rating), 2) as avg_satisfaction
FROM comfort_letter_history
WHERE feedback_rating IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================================
-- 提示：执行此脚本前请确保
-- ============================================================================
-- 1. flights 表已存在
-- 2. 数据库有适当的权限
-- 3. MySQL 版本 >= 5.7（支持JSON和表达式索引）

