-- =============================================================
-- JBNU 2026 DATABASE DESIGN FINAL PROJECT: DDL SCHEMA SCRIPT
-- =============================================================

-- 1. CLEAN UP PREVIOUS STRUCTURES (Safely drops tables in reverse order of foreign keys)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS maintenance_log;
DROP TABLE IF EXISTS alert;
DROP TABLE IF EXISTS sensor_reading;
DROP TABLE IF EXISTS equipment;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. CREATE MASTER EQUIPMENT CONFIGURATION TABLE
-- This tracks our 18 real-world experiment setups acting as physical equipment units
CREATE TABLE equipment (
    equipment_id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    material VARCHAR(20) NOT NULL,
    feedrate_setting INT NOT NULL,
    clamp_pressure DECIMAL(5,2) NOT NULL,
    initial_tool_condition VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active'
);

-- 3. CREATE SENSOR READING TABLE (1-to-Many relationship with Equipment)
-- Stores our 25,286 time-series data rows with our custom AI anomaly scores
CREATE TABLE sensor_reading (
    reading_id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    recorded_at DATETIME(3) NOT NULL, -- Precision set to 3 to handle 100ms interval data cleanly
    vibration DECIMAL(12,5) NOT NULL,
    temperature DECIMAL(12,5) NOT NULL,
    spindle_speed DECIMAL(12,5) NOT NULL,
    tool_wear VARCHAR(20) NOT NULL,
    anomaly_score DECIMAL(8,5) NOT NULL,
    FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id) ON DELETE CASCADE
);

-- 4. CREATE ALERT TABLE (1-to-Many relationship with Equipment)
-- Holds the 1,265 anomalies isolated by our Isolation Forest algorithm
CREATE TABLE alert (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    triggered_at DATETIME(3) NOT NULL,
    severity VARCHAR(10) NOT NULL, -- Will store 'high', 'medium', or 'low'
    message TEXT NOT NULL,
    resolved TINYINT(1) DEFAULT 0, -- 0 represents an open issue, 1 represents resolved
    FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id) ON DELETE CASCADE
);

-- 5. CREATE MAINTENANCE AUDIT LOG TABLE (3NF Relational Anchor)
-- Bridges an alert issue directly to a human technician response event
CREATE TABLE maintenance_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    alert_id INT NULL,
    action_taken TEXT NOT NULL,
    technician VARCHAR(50) NOT NULL,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    FOREIGN KEY (alert_id) REFERENCES alert(alert_id) ON DELETE SET NULL
);

-- 6. SYSTEM PERFORMANCE DATABASE INDEXES
-- Optimizes data retrieval time so our Flask charts load instantly
CREATE INDEX idx_sensor_equip_time ON sensor_reading(equipment_id, recorded_at DESC);
CREATE INDEX idx_alert_status ON alert(resolved, severity);

INSERT INTO equipment (equipment_id, name, material, feedrate_setting, clamp_pressure, initial_tool_condition, status) VALUES
(1, 'CNC Mill Run 01', 'wax', 6, 4.0, 'unworn', 'active'),
(2, 'CNC Mill Run 02', 'wax', 20, 4.0, 'unworn', 'active'),
(3, 'CNC Mill Run 03', 'wax', 6, 3.0, 'unworn', 'active'),
(4, 'CNC Mill Run 04', 'wax', 6, 2.5, 'unworn', 'active'),
(5, 'CNC Mill Run 05', 'wax', 20, 3.0, 'unworn', 'active'),
(6, 'CNC Mill Run 06', 'wax', 6, 4.0, 'worn', 'active'),
(7, 'CNC Mill Run 07', 'wax', 20, 4.0, 'worn', 'active'),
(8, 'CNC Mill Run 08', 'wax', 20, 4.0, 'worn', 'active'),
(9, 'CNC Mill Run 09', 'wax', 15, 4.0, 'worn', 'active'),
(10, 'CNC Mill Run 10', 'wax', 12, 4.0, 'worn', 'active'),
(11, 'CNC Mill Run 11', 'wax', 3, 4.0, 'unworn', 'active'),
(12, 'CNC Mill Run 12', 'wax', 3, 3.0, 'unworn', 'active'),
(13, 'CNC Mill Run 13', 'wax', 3, 4.0, 'worn', 'active'),
(14, 'CNC Mill Run 14', 'wax', 3, 3.0, 'worn', 'active'),
(15, 'CNC Mill Run 15', 'wax', 6, 3.0, 'worn', 'active'),
(16, 'CNC Mill Run 16', 'wax', 20, 3.0, 'worn', 'active'),
(17, 'CNC Mill Run 17', 'wax', 3, 2.5, 'unworn', 'active'),
(18, 'CNC Mill Run 18', 'wax', 3, 2.5, 'worn', 'active');

SELECT * FROM equipment;