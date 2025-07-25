#!/usr/bin/env python3
"""
직원별 개별 근무시간 설정을 위한 DB 스키마 추가
"""
import sqlite3
from datetime import datetime, time

def add_employee_work_schedules():
    conn = sqlite3.connect('hr_system.db')
    cursor = conn.cursor()
    
    # 1. 직원별 근무시간 설정 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS employee_work_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        schedule_name VARCHAR(100) DEFAULT '표준 근무시간',
        start_time TIME NOT NULL DEFAULT '09:00:00',
        end_time TIME NOT NULL DEFAULT '18:00:00',
        break_start_time TIME DEFAULT '12:00:00',
        break_end_time TIME DEFAULT '13:00:00',
        break_duration INTEGER DEFAULT 60,
        standard_hours DECIMAL(4,2) DEFAULT 8.0,
        flexible_hours BOOLEAN DEFAULT FALSE,
        core_start_time TIME DEFAULT '10:00:00',
        core_end_time TIME DEFAULT '16:00:00',
        overtime_threshold DECIMAL(4,2) DEFAULT 8.0,
        is_active BOOLEAN DEFAULT TRUE,
        effective_from DATE DEFAULT CURRENT_DATE,
        effective_to DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        updated_by INTEGER,
        FOREIGN KEY (employee_id) REFERENCES employees (id),
        FOREIGN KEY (created_by) REFERENCES employees (id),
        FOREIGN KEY (updated_by) REFERENCES employees (id)
    )
    ''')
    
    # 2. 근무시간 템플릿 테이블 (관리자가 미리 정의한 근무시간 패턴)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS work_schedule_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        break_start_time TIME DEFAULT '12:00:00',
        break_end_time TIME DEFAULT '13:00:00',
        break_duration INTEGER DEFAULT 60,
        standard_hours DECIMAL(4,2) NOT NULL,
        flexible_hours BOOLEAN DEFAULT FALSE,
        core_start_time TIME,
        core_end_time TIME,
        overtime_threshold DECIMAL(4,2),
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES employees (id)
    )
    ''')
    
    # 3. 직원별 특별 근무일 설정 (특정 날짜에 다른 근무시간 적용)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS employee_special_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        break_duration INTEGER DEFAULT 60,
        is_holiday BOOLEAN DEFAULT FALSE,
        is_half_day BOOLEAN DEFAULT FALSE,
        reason VARCHAR(200),
        approved_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees (id),
        FOREIGN KEY (approved_by) REFERENCES employees (id),
        UNIQUE(employee_id, date)
    )
    ''')
    
    # 기본 근무시간 템플릿 데이터 삽입
    templates_data = [
        ('표준 근무시간', '일반적인 9시-18시 근무', '09:00:00', '18:00:00', '12:00:00', '13:00:00', 60, 8.0, False, None, None, 8.0, True, True),
        ('유연근무제', '코어타임 10시-16시, 8시간 근무', '08:00:00', '19:00:00', '12:00:00', '13:00:00', 60, 8.0, True, '10:00:00', '16:00:00', 8.0, False, True),
        ('시차출퇴근 A', '8시-17시 근무', '08:00:00', '17:00:00', '12:00:00', '13:00:00', 60, 8.0, False, None, None, 8.0, False, True),
        ('시차출퇴근 B', '10시-19시 근무', '10:00:00', '19:00:00', '12:00:00', '13:00:00', 60, 8.0, False, None, None, 8.0, False, True),
        ('단축근무', '9시-15시 근무 (6시간)', '09:00:00', '15:00:00', '12:00:00', '13:00:00', 60, 6.0, False, None, None, 6.0, False, True),
        ('야간근무', '22시-06시 근무', '22:00:00', '06:00:00', '02:00:00', '03:00:00', 60, 8.0, False, None, None, 8.0, False, True)
    ]
    
    cursor.executemany('''
    INSERT OR IGNORE INTO work_schedule_templates 
    (name, description, start_time, end_time, break_start_time, break_end_time, break_duration, 
     standard_hours, flexible_hours, core_start_time, core_end_time, overtime_threshold, is_default, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', templates_data)
    
    # 모든 직원에게 기본 근무시간 할당 (표준 근무시간)
    cursor.execute('''
    INSERT OR IGNORE INTO employee_work_schedules 
    (employee_id, schedule_name, start_time, end_time, break_start_time, break_end_time, 
     break_duration, standard_hours, flexible_hours, overtime_threshold, is_active, effective_from)
    SELECT e.id, '표준 근무시간', '09:00:00', '18:00:00', '12:00:00', '13:00:00', 
           60, 8.0, FALSE, 8.0, TRUE, CURRENT_DATE
    FROM employees e
    WHERE e.id NOT IN (
        SELECT ews.employee_id 
        FROM employee_work_schedules ews 
        WHERE ews.is_active = TRUE
    )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ 직원별 근무시간 설정 테이블이 성공적으로 생성되었습니다!")
    print("✅ 6가지 근무시간 템플릿이 추가되었습니다!")
    print("✅ 모든 직원에게 기본 근무시간(9시-18시)이 할당되었습니다!")

if __name__ == "__main__":
    add_employee_work_schedules()
