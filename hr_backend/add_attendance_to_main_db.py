#!/usr/bin/env python3
"""
메인 DB에 관리자용 출퇴근 시스템 테이블 추가
"""
import sqlite3
from datetime import datetime, date

def add_attendance_tables_to_main_db():
    conn = sqlite3.connect('src/database/app.db')
    cursor = conn.cursor()
    
    # 1. 연차 유형 테이블 (이미 있을 수 있음)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS leave_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        description TEXT,
        max_days_per_year INTEGER DEFAULT 15,
        requires_approval BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # 2. 직원별 연차 잔여일수 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS leave_balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        leave_type_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        total_days INTEGER DEFAULT 15,
        used_days INTEGER DEFAULT 0,
        remaining_days INTEGER DEFAULT 15,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees (id),
        FOREIGN KEY (leave_type_id) REFERENCES leave_types (id),
        UNIQUE(employee_id, leave_type_id, year)
    )
    ''')
    
    # 3. 휴일 관리 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS holidays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) DEFAULT 'public',
        is_working_day BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # 4. 근무 시간 설정 테이블
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS work_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        break_duration INTEGER DEFAULT 60,
        standard_hours DECIMAL(4,2) DEFAULT 8.0,
        is_default BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # 5. 출퇴근 기록 테이블 업데이트 (기존 테이블 수정)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS attendance_records_admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        date DATE NOT NULL,
        check_in_time TIME,
        check_out_time TIME,
        work_hours DECIMAL(4,2) DEFAULT 0,
        overtime_hours DECIMAL(4,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'absent',
        leave_request_id INTEGER,
        notes TEXT,
        is_holiday BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        updated_by INTEGER,
        FOREIGN KEY (employee_id) REFERENCES employees (id),
        FOREIGN KEY (leave_request_id) REFERENCES leave_requests (id),
        FOREIGN KEY (created_by) REFERENCES employees (id),
        FOREIGN KEY (updated_by) REFERENCES employees (id),
        UNIQUE(employee_id, date)
    )
    ''')
    
    # 기본 연차 유형 데이터 삽입
    leave_types_data = [
        ('연차', 'ANNUAL', '연간 휴가', 15, True, True),
        ('병가', 'SICK', '질병으로 인한 휴가', 30, True, True),
        ('경조사', 'FAMILY', '경조사 휴가', 5, True, True),
        ('공가', 'OFFICIAL', '공무로 인한 휴가', 0, True, True),
        ('무급휴가', 'UNPAID', '무급 휴가', 0, True, True)
    ]
    
    cursor.executemany('''
    INSERT OR IGNORE INTO leave_types (name, code, description, max_days_per_year, requires_approval, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', leave_types_data)
    
    # 기본 근무 시간 설정
    cursor.execute('''
    INSERT OR IGNORE INTO work_schedules (name, start_time, end_time, break_duration, standard_hours, is_default)
    VALUES ('표준 근무시간', '09:00:00', '18:00:00', 60, 8.0, TRUE)
    ''')
    
    # 모든 직원에게 2025년 연차 잔여일수 초기화
    cursor.execute('''
    INSERT OR IGNORE INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days, remaining_days)
    SELECT e.id, 1, 2025, 15, 0, 15
    FROM employees e
    WHERE e.id NOT IN (
        SELECT lb.employee_id 
        FROM leave_balances lb 
        WHERE lb.leave_type_id = 1 AND lb.year = 2025
    )
    ''')
    
    # 기본 휴일 데이터 (2025년)
    holidays_data = [
        ('2025-01-01', '신정', 'public'),
        ('2025-02-09', '설날 연휴', 'public'),
        ('2025-02-10', '설날', 'public'),
        ('2025-02-11', '설날 연휴', 'public'),
        ('2025-03-01', '삼일절', 'public'),
        ('2025-05-05', '어린이날', 'public'),
        ('2025-05-13', '부처님오신날', 'public'),
        ('2025-06-06', '현충일', 'public'),
        ('2025-08-15', '광복절', 'public'),
        ('2025-09-28', '추석 연휴', 'public'),
        ('2025-09-29', '추석', 'public'),
        ('2025-09-30', '추석 연휴', 'public'),
        ('2025-10-03', '개천절', 'public'),
        ('2025-10-09', '한글날', 'public'),
        ('2025-12-25', '크리스마스', 'public')
    ]
    
    cursor.executemany('''
    INSERT OR IGNORE INTO holidays (date, name, type)
    VALUES (?, ?, ?)
    ''', holidays_data)
    
    conn.commit()
    conn.close()
    print("✅ 메인 DB에 관리자용 출퇴근 시스템이 성공적으로 추가되었습니다!")
    print("✅ 모든 직원에게 2025년 연차 15일이 할당되었습니다!")
    print("✅ 2025년 공휴일 데이터가 추가되었습니다!")

if __name__ == "__main__":
    add_attendance_tables_to_main_db()
