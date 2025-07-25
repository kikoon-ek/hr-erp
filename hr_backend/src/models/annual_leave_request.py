from datetime import datetime
from ..database import db

class AnnualLeaveRequest(db.Model):
    """연차 신청 모델"""
    __tablename__ = 'annual_leave_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    leave_type = db.Column(db.String(20), nullable=False, default='annual')  # annual, half, quarter
    total_days = db.Column(db.Float, nullable=False)  # 신청한 총 연차 일수
    reason = db.Column(db.Text, nullable=True)  # 신청 사유
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, approved, rejected
    
    # 승인/반려 관련 정보
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # 승인자
    approved_at = db.Column(db.DateTime, nullable=True)  # 승인/반려 일시
    approval_notes = db.Column(db.Text, nullable=True)  # 승인/반려 사유
    
    # 연차 사용 기록 연결 (승인 시 생성)
    annual_leave_usage_id = db.Column(db.Integer, db.ForeignKey('annual_leave_usages.id'), nullable=True)
    
    # 시스템 정보
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    employee = db.relationship('Employee', backref='leave_requests')
    approver = db.relationship('User', foreign_keys=[approved_by], backref='approved_requests')
    annual_leave_usage = db.relationship('AnnualLeaveUsage', backref='request')
    
    def __repr__(self):
        return f'<AnnualLeaveRequest {self.employee_id} - {self.start_date} to {self.end_date}>'
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.name if self.employee else None,
            'employee_number': self.employee.employee_number if self.employee else None,
            'department_name': self.employee.department.name if self.employee and self.employee.department else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'leave_type': self.leave_type,
            'leave_type_text': self.get_leave_type_text(),
            'total_days': self.total_days,
            'reason': self.reason,
            'status': self.status,
            'status_text': self.get_status_text(),
            'approved_by': self.approved_by,
            'approver_name': self.approver.username if self.approver else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'approval_notes': self.approval_notes,
            'annual_leave_usage_id': self.annual_leave_usage_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def get_leave_type_text(self):
        """연차 유형 한글 변환"""
        type_map = {
            'annual': '연차',
            'half': '반차',
            'quarter': '반반차'
        }
        return type_map.get(self.leave_type, self.leave_type)
    
    def get_status_text(self):
        """상태 한글 변환"""
        status_map = {
            'pending': '대기중',
            'approved': '승인됨',
            'rejected': '반려됨'
        }
        return status_map.get(self.status, self.status)
    
    def get_leave_days_by_type(self):
        """연차 유형별 일수 반환"""
        type_days = {
            'annual': 1.0,
            'half': 0.5,
            'quarter': 0.25
        }
        return type_days.get(self.leave_type, 1.0)
    
    def calculate_total_days(self):
        """시작일과 종료일 기준으로 총 연차 일수 계산"""
        if not self.start_date or not self.end_date:
            return 0.0
        
        # 날짜 차이 계산 (종료일 포함)
        delta = self.end_date - self.start_date
        total_calendar_days = delta.days + 1
        
        # 연차 유형별 일수 적용
        daily_leave = self.get_leave_days_by_type()
        
        return total_calendar_days * daily_leave
    
    @staticmethod
    def get_pending_requests_count(employee_id=None):
        """대기중인 연차 신청 수 조회"""
        query = AnnualLeaveRequest.query.filter_by(status='pending')
        if employee_id:
            query = query.filter_by(employee_id=employee_id)
        return query.count()
    
    @staticmethod
    def get_requests_by_status(status, employee_id=None):
        """상태별 연차 신청 조회"""
        query = AnnualLeaveRequest.query.filter_by(status=status)
        if employee_id:
            query = query.filter_by(employee_id=employee_id)
        return query.order_by(AnnualLeaveRequest.created_at.desc()).all()
    
    @staticmethod
    def get_requests_by_date_range(start_date, end_date, employee_id=None):
        """기간별 연차 신청 조회"""
        query = AnnualLeaveRequest.query.filter(
            AnnualLeaveRequest.start_date <= end_date,
            AnnualLeaveRequest.end_date >= start_date
        )
        if employee_id:
            query = query.filter_by(employee_id=employee_id)
        return query.order_by(AnnualLeaveRequest.start_date).all()

