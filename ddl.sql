
CREATE DATABASE IF NOT EXISTS kelp;
USE kelp;

CREATE TABLE IF NOT EXISTS historical_events (
    event_id VARCHAR(255) PRIMARY KEY,
    event_name VARCHAR(500) NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    duration_minutes INT,
    parent_event_id VARCHAR(255),
    research_value INT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    INDEX idx_parent_event (parent_event_id),
    FOREIGN KEY (parent_event_id) REFERENCES historical_events(event_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ingestion_jobs (
    job_id VARCHAR(255) PRIMARY KEY,
    status ENUM('Processing', 'Completed', 'Failed') DEFAULT 'Processing',
    total_lines INT DEFAULT 0,
    processed_lines INT DEFAULT 0,
    error_lines INT DEFAULT 0,
    errors JSON,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL
);