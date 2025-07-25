from datetime import datetime
from ..database import db

class AttendanceRecord(db.Model):
    """출퇴근 기록 모델"""
    __tablename__ = 'attendance_records'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    check_in_time = db.Column(db.Time, nullable=True)
    check_out_time = db.Column(db.Time, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='present')  # present, late, early_leave, absent, on_leave
    work_hours = db.Column(db.Float, nullable=True)  # 실제 근무시간 (시간 단위)
    overtime_hours = db.Column(db.Float, nullable=True, default=0.0)  # 연장근무시간
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    employee = db.relationship('Employee', backref='attendance_records')
    
    def __repr__(self):
        return f'<AttendanceRecord {self.employee_id} - {self.date}>'
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.name if self.employee else None,
            'employee_number': self.employee.employee_number if self.employee else None,
            'date': self.date.isoformat() if self.date else None,
            'check_in_time': self.check_in_time.isoformat() if self.check_in_time else None,
            'check_out_time': self.check_out_time.isoformat() if self.check_out_time else None,
            'status': self.status,
            'work_hours': self.work_hours,
            'overtime_hours': self.overtime_hours,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @staticmethod
    def calculate_work_hours(check_in_time, check_out_time):
        """근무시간 계산 (점심시간 1시간 제외)"""
        if not check_in_time or not check_out_time:
            return 0.0
        
        # 시간 차이 계산
        check_in_datetime = datetime.combine(datetime.today(), check_in_time)
        check_out_datetime = datetime.combine(datetime.today(), check_out_time)
        
        if check_out_datetime <= check_in_datetime:
            return 0.0
        
        total_hours = (check_out_datetime - check_in_datetime).total_seconds() / 3600
        
        # 점심시간 1시간 제외 (6시간 이상 근무 시)
        if total_hours >= 6:
            total_hours -= 1
        
        return max(0.0, total_hours)
    
    @staticmethod
    def determine_status(check_in_time, check_out_time, standard_start_time, standard_end_time):
        """출퇴근 상태 자동 판정"""
        if not check_in_time:
            return 'absent'
        
        if not check_out_time:
            # 출근만 하고 퇴근 안한 경우
            if check_in_time > standard_start_time:
                return 'late'
            return 'present'
        
        # 지각 여부 확인
        is_late = check_in_time > standard_start_time
        
        # 조퇴 여부 확인
        is_early_leave = check_out_time < standard_end_time
        
        if is_late and is_early_leave:
            return 'late'  # 지각이 더 심각한 것으로 간주
        elif is_late:
            return 'late'
        elif is_early_leave:
            return 'early_leave'
        else:
            return 'present'


class WorkSchedule(db.Model):
    """근무시간 설정 모델"""
    __tablename__ = 'work_schedules'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=월요일, 6=일요일
    start_time = db.Column(db.Time, nullable=False, default=datetime.strptime('09:00', '%H:%M').time())
    end_time = db.Column(db.Time, nullable=False, default=datetime.strptime('18:00', '%H:%M').time())
    is_working_day = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    employee = db.relationship('Employee', backref='work_schedules')
    
    def __repr__(self):
        return f'<WorkSchedule {self.employee_id} - Day {self.day_of_week}>'
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.name if self.employee else None,
            'day_of_week': self.day_of_week,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'is_working_day': self.is_working_day,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

