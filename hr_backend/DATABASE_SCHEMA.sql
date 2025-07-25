-- HR ERP 시스템 데이터베이스 스키마
-- 생성일: 2025-07-25
-- 버전: 1.0.0

-- 사용자 계정 테이블
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(80) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 부서 테이블
CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    manager_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES employees (id)
);

-- 직원 테이블
CREATE TABLE employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    employee_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL,
    phone VARCHAR(20),
    position VARCHAR(100),
    department_id INTEGER,
    hire_date DATE NOT NULL,
    birth_date DATE,
    address TEXT,
    salary INTEGER DEFAULT 3000000,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (department_id) REFERENCES departments (id)
);

-- 출퇴근 기록 테이블
CREATE TABLE attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    status VARCHAR(20) DEFAULT 'present',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees (id),
    UNIQUE(employee_id, date)
);

-- 연차 부여 테이블
CREATE TABLE annual_leave_grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_days INTEGER NOT NULL DEFAULT 15,
    used_days INTEGER DEFAULT 0,
    remaining_days INTEGER DEFAULT 15,
    granted_date DATE NOT NULL,
    expiry_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees (id),
    UNIQUE(employee_id, year)
);

-- 연차 사용 테이블
CREATE TABLE annual_leave_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    grant_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_used REAL NOT NULL,
    leave_type VARCHAR(20) DEFAULT 'annual',
    reason TEXT,
    status VARCHAR(20) DEFAULT 'approved',
    approved_by INTEGER,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees (id),
    FOREIGN KEY (grant_id) REFERENCES annual_leave_grants (id),
    FOREIGN KEY (approved_by) REFERENCES employees (id)
);

-- 연차 신청 테이블
CREATE TABLE annual_leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested REAL NOT NULL,
    leave_type VARCHAR(20) DEFAULT 'annual',
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by INTEGER,
    approved_at DATETIME,
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees (id),
    FOREIGN KEY (approved_by) REFERENCES employees (id)
);

-- 급여 기록 테이블
CREATE TABLE payroll_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    base_salary INTEGER NOT NULL,
    overtime_pay INTEGER DEFAULT 0,
    bonus INTEGER DEFAULT 0,
    deductions INTEGER DEFAULT 0,
    net_salary INTEGER NOT NULL,
    pay_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees (id),
    UNIQUE(employee_id, year, month)
);

-- 성과급 정책 테이블
CREATE TABLE bonus_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    total_amount INTEGER NOT NULL,
    distribution_method VARCHAR(50) DEFAULT 'performance',
    year INTEGER NOT NULL,
    quarter INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 성과급 계산 테이블
CREATE TABLE bonus_calculations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    total_amount INTEGER NOT NULL,
    calculation_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    approved_by INTEGER,
    approved_at DATETIME,
    distributed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (policy_id) REFERENCES bonus_policies (id),
    FOREIGN KEY (approved_by) REFERENCES employees (id)
);

-- 성과급 분배 결과 테이블
CREATE TABLE bonus_distributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    calculation_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    performance_score REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (calculation_id) REFERENCES bonus_calculations (id),
    FOREIGN KEY (employee_id) REFERENCES employees (id),
    UNIQUE(calculation_id, employee_id)
);

-- 평가 기준 테이블
CREATE TABLE evaluation_criteria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weight REAL DEFAULT 1.0,
    max_score INTEGER DEFAULT 100,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 성과 평가 테이블
CREATE TABLE evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    evaluator_id INTEGER NOT NULL,
    criteria_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    comments TEXT,
    evaluation_period VARCHAR(20),
    year INTEGER NOT NULL,
    quarter INTEGER,
    month INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees (id),
    FOREIGN KEY (evaluator_id) REFERENCES employees (id),
    FOREIGN KEY (criteria_id) REFERENCES evaluation_criteria (id)
);

-- 감사 로그 테이블
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    message TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 인덱스 생성
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_employee_number ON employees(employee_number);
CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, date);
CREATE INDEX idx_annual_leave_grants_employee_year ON annual_leave_grants(employee_id, year);
CREATE INDEX idx_annual_leave_usage_employee ON annual_leave_usage(employee_id);
CREATE INDEX idx_annual_leave_requests_employee ON annual_leave_requests(employee_id);
CREATE INDEX idx_payroll_employee_year_month ON payroll_records(employee_id, year, month);
CREATE INDEX idx_bonus_distributions_calculation ON bonus_distributions(calculation_id);
CREATE INDEX idx_evaluations_employee ON evaluations(employee_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- 기본 데이터 삽입

-- 기본 부서 생성
INSERT INTO departments (id, name, description) VALUES 
(1, '본사', '본사 관리 부서'),
(2, '개발팀', '소프트웨어 개발 부서'),
(3, '영업팀', '영업 및 마케팅 부서'),
(4, '인사팀', '인사 관리 부서');

-- 관리자 계정 생성
INSERT INTO users (id, username, password_hash, role) VALUES 
(1, 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsIpx7QBG', 'admin');

-- 관리자 직원 정보 생성
INSERT INTO employees (id, user_id, employee_number, name, email, position, department_id, hire_date, salary) VALUES 
(1, 1, 'EMP001', '관리자', 'admin@company.com', '시스템 관리자', 1, '2020-01-01', 5000000);

-- 평가 기준 기본 데이터
INSERT INTO evaluation_criteria (name, description, weight, max_score, category) VALUES 
('업무 성과', '담당 업무의 목표 달성도 및 품질', 0.4, 100, 'performance'),
('협업 능력', '팀워크 및 의사소통 능력', 0.2, 100, 'collaboration'),
('전문성', '업무 관련 전문 지식 및 기술', 0.2, 100, 'expertise'),
('리더십', '리더십 및 문제 해결 능력', 0.1, 100, 'leadership'),
('창의성', '혁신적 사고 및 개선 제안', 0.1, 100, 'creativity');

-- 성과급 정책 기본 데이터
INSERT INTO bonus_policies (name, description, total_amount, year, quarter, status) VALUES 
('2024년 1분기 성과급', '2024년 1분기 성과급 지급 정책', 10000000, 2024, 1, 'completed'),
('2024년 2분기 성과급', '2024년 2분기 성과급 지급 정책', 12000000, 2024, 2, 'completed'),
('2024년 3분기 성과급', '2024년 3분기 성과급 지급 정책', 15000000, 2024, 3, 'active');

-- 트리거 생성 (업데이트 시간 자동 갱신)
CREATE TRIGGER update_users_updated_at 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_employees_updated_at 
    AFTER UPDATE ON employees
    BEGIN
        UPDATE employees SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_departments_updated_at 
    AFTER UPDATE ON departments
    BEGIN
        UPDATE departments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_attendance_records_updated_at 
    AFTER UPDATE ON attendance_records
    BEGIN
        UPDATE attendance_records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_annual_leave_grants_updated_at 
    AFTER UPDATE ON annual_leave_grants
    BEGIN
        UPDATE annual_leave_grants SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_payroll_records_updated_at 
    AFTER UPDATE ON payroll_records
    BEGIN
        UPDATE payroll_records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 연차 부여 시 잔여 연차 자동 계산 트리거
CREATE TRIGGER calculate_remaining_days_on_grant
    AFTER INSERT ON annual_leave_grants
    BEGIN
        UPDATE annual_leave_grants 
        SET remaining_days = total_days - used_days 
        WHERE id = NEW.id;
    END;

-- 연차 사용 시 잔여 연차 자동 업데이트 트리거
CREATE TRIGGER update_remaining_days_on_usage
    AFTER INSERT ON annual_leave_usage
    BEGIN
        UPDATE annual_leave_grants 
        SET used_days = used_days + NEW.days_used,
            remaining_days = total_days - (used_days + NEW.days_used)
        WHERE id = NEW.grant_id;
    END;

