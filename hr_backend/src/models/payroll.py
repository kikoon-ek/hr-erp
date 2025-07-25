from datetime import datetime
from ..database import db

class Payroll(db.Model):
    """급여명세서 모델"""
    __tablename__ = 'payrolls'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    month = db.Column(db.Integer, nullable=False)
    
    # 기본 급여 정보
    base_salary = db.Column(db.Numeric(12, 2), nullable=False, default=0)  # 기본급
    
    # 수당 항목들
    position_allowance = db.Column(db.Numeric(10, 2), default=0)  # 직책수당
    meal_allowance = db.Column(db.Numeric(10, 2), default=0)      # 식대
    transport_allowance = db.Column(db.Numeric(10, 2), default=0) # 교통비
    overtime_pay = db.Column(db.Numeric(10, 2), default=0)        # 연장근무수당
    night_pay = db.Column(db.Numeric(10, 2), default=0)           # 야간근무수당
    holiday_pay = db.Column(db.Numeric(10, 2), default=0)         # 휴일근무수당
    bonus = db.Column(db.Numeric(10, 2), default=0)               # 상여금
    other_allowances = db.Column(db.Numeric(10, 2), default=0)    # 기타수당
    
    # 총 지급액
    total_payment = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    
    # 공제 항목들
    income_tax = db.Column(db.Numeric(10, 2), default=0)          # 소득세
    resident_tax = db.Column(db.Numeric(10, 2), default=0)        # 주민세
    national_pension = db.Column(db.Numeric(10, 2), default=0)    # 국민연금
    health_insurance = db.Column(db.Numeric(10, 2), default=0)    # 건강보험
    employment_insurance = db.Column(db.Numeric(10, 2), default=0) # 고용보험
    long_term_care = db.Column(db.Numeric(10, 2), default=0)      # 장기요양보험
    other_deductions = db.Column(db.Numeric(10, 2), default=0)    # 기타공제
    
    # 총 공제액
    total_deductions = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    
    # 실수령액
    net_pay = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    
    # 근무 정보
    work_days = db.Column(db.Integer, default=0)                  # 근무일수
    overtime_hours = db.Column(db.Numeric(5, 2), default=0)       # 연장근무시간
    night_hours = db.Column(db.Numeric(5, 2), default=0)          # 야간근무시간
    holiday_hours = db.Column(db.Numeric(5, 2), default=0)        # 휴일근무시간
    
    # 메모 및 비고
    memo = db.Column(db.Text)
    
    # 생성/수정 정보
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # 관계 설정
    employee = db.relationship('Employee', backref='payrolls')
    creator = db.relationship('User', foreign_keys=[created_by])
    
    def __repr__(self):
        return f'<Payroll {self.employee.name if self.employee else "Unknown"} {self.year}-{self.month:02d}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.name if self.employee else None,
            'employee_number': self.employee.employee_number if self.employee else None,
            'year': self.year,
            'month': self.month,
            'base_salary': float(self.base_salary) if self.base_salary else 0,
            'position_allowance': float(self.position_allowance) if self.position_allowance else 0,
            'meal_allowance': float(self.meal_allowance) if self.meal_allowance else 0,
            'transport_allowance': float(self.transport_allowance) if self.transport_allowance else 0,
            'overtime_pay': float(self.overtime_pay) if self.overtime_pay else 0,
            'night_pay': float(self.night_pay) if self.night_pay else 0,
            'holiday_pay': float(self.holiday_pay) if self.holiday_pay else 0,
            'bonus': float(self.bonus) if self.bonus else 0,
            'other_allowances': float(self.other_allowances) if self.other_allowances else 0,
            'total_payment': float(self.total_payment) if self.total_payment else 0,
            'income_tax': float(self.income_tax) if self.income_tax else 0,
            'resident_tax': float(self.resident_tax) if self.resident_tax else 0,
            'national_pension': float(self.national_pension) if self.national_pension else 0,
            'health_insurance': float(self.health_insurance) if self.health_insurance else 0,
            'employment_insurance': float(self.employment_insurance) if self.employment_insurance else 0,
            'long_term_care': float(self.long_term_care) if self.long_term_care else 0,
            'other_deductions': float(self.other_deductions) if self.other_deductions else 0,
            'total_deductions': float(self.total_deductions) if self.total_deductions else 0,
            'net_pay': float(self.net_pay) if self.net_pay else 0,
            'work_days': self.work_days,
            'overtime_hours': float(self.overtime_hours) if self.overtime_hours else 0,
            'night_hours': float(self.night_hours) if self.night_hours else 0,
            'holiday_hours': float(self.holiday_hours) if self.holiday_hours else 0,
            'memo': self.memo,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by
        }
    
    def calculate_totals(self):
        """총 지급액, 총 공제액, 실수령액 계산"""
        # 총 지급액 계산
        self.total_payment = (
            (self.base_salary or 0) +
            (self.position_allowance or 0) +
            (self.meal_allowance or 0) +
            (self.transport_allowance or 0) +
            (self.overtime_pay or 0) +
            (self.night_pay or 0) +
            (self.holiday_pay or 0) +
            (self.bonus or 0) +
            (self.other_allowances or 0)
        )
        
        # 총 공제액 계산
        self.total_deductions = (
            (self.income_tax or 0) +
            (self.resident_tax or 0) +
            (self.national_pension or 0) +
            (self.health_insurance or 0) +
            (self.employment_insurance or 0) +
            (self.long_term_care or 0) +
            (self.other_deductions or 0)
        )
        
        # 실수령액 계산
        self.net_pay = self.total_payment - self.total_deductions

