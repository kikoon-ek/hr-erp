from datetime import datetime
from ..database import db

class AnnualLeaveUsage(db.Model):
    """연차 사용 모델"""
    __tablename__ = 'annual_leave_usages'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    usage_date = db.Column(db.Date, nullable=False)
    used_days = db.Column(db.Float, nullable=False)  # 사용한 연차 일수 (0.25일 단위 가능)
    leave_type = db.Column(db.String(20), nullable=False, default='full')  # 'full', 'half', 'quarter'
    linked_leave_request_id = db.Column(db.Integer, db.ForeignKey('leave_requests.id'), nullable=True)
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    def to_dict(self):
        """딕셔너리로 변환"""
        from src.models.employee import Employee
        from src.models.user import User
        from src.models.leave_request import LeaveRequest
        
        employee = Employee.query.get(self.employee_id)
        creator = User.query.get(self.created_by)
        leave_request = LeaveRequest.query.get(self.linked_leave_request_id) if self.linked_leave_request_id else None
        
        # 휴가 유형 한글 변환
        leave_type_names = {
            'full': '연차',
            'half': '반차',
            'quarter': '반반차'
        }
        
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'usage_date': self.usage_date.isoformat() if self.usage_date else None,
            'used_days': self.used_days,
            'leave_type': self.leave_type,
            'leave_type_name': leave_type_names.get(self.leave_type, self.leave_type),
            'linked_leave_request_id': self.linked_leave_request_id,
            'note': self.note,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'employee': {
                'id': employee.id,
                'name': employee.name,
                'employee_number': employee.employee_number
            } if employee else None,
            'leave_request': {
                'id': leave_request.id,
                'type': leave_request.type,
                'status': leave_request.status
            } if leave_request else None,
            'creator': {
                'id': creator.id,
                'username': creator.username
            } if creator else None
        }

    @staticmethod
    def get_days_by_type(leave_type):
        """휴가 유형별 사용 일수 반환"""
        type_days = {
            'full': 1.0,
            'half': 0.5,
            'quarter': 0.25
        }
        return type_days.get(leave_type, 1.0)

