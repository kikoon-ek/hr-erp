from flask import Blueprint, request, jsonify
from datetime import datetime, date
from src.models.user import db
from src.models.employee import Employee
from src.models.annual_leave_request import AnnualLeaveRequest
from src.models.annual_leave_usage import AnnualLeaveUsage
from src.models.annual_leave_grant import AnnualLeaveGrant
from src.utils.jwt_helper import jwt_required, admin_required
from src.utils.audit import log_action

annual_leave_request_bp = Blueprint('annual_leave_request', __name__)

@annual_leave_request_bp.route('/api/annual-leave/requests', methods=['GET'])
@jwt_required
def get_leave_requests():
    """연차 신청 목록 조회"""
    try:
        # 쿼리 파라미터
        employee_id = request.args.get('employee_id', type=int)
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # 기본 쿼리
        query = AnnualLeaveRequest.query
        
        # 필터 적용
        if employee_id:
            query = query.filter_by(employee_id=employee_id)
        
        if status:
            query = query.filter_by(status=status)
        
        if start_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(AnnualLeaveRequest.start_date >= start_date_obj)
        
        if end_date:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(AnnualLeaveRequest.end_date <= end_date_obj)
        
        # 정렬 및 페이징
        query = query.order_by(AnnualLeaveRequest.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        requests = [req.to_dict() for req in pagination.items]
        
        return jsonify({
            'success': True,
            'requests': requests,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@annual_leave_request_bp.route('/api/annual-leave/requests', methods=['POST'])
@jwt_required
def create_leave_request():
    """연차 신청 생성"""
    try:
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['employee_id', 'start_date', 'end_date', 'leave_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'{field}는 필수 항목입니다.'}), 400
        
        # 직원 존재 확인
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({'success': False, 'error': '존재하지 않는 직원입니다.'}), 404
        
        # 날짜 파싱
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        
        # 날짜 유효성 검증
        if start_date > end_date:
            return jsonify({'success': False, 'error': '시작일이 종료일보다 늦을 수 없습니다.'}), 400
        
        if start_date < date.today():
            return jsonify({'success': False, 'error': '과거 날짜로는 연차 신청할 수 없습니다.'}), 400
        
        # 연차 신청 객체 생성
        leave_request = AnnualLeaveRequest(
            employee_id=data['employee_id'],
            start_date=start_date,
            end_date=end_date,
            leave_type=data['leave_type'],
            reason=data.get('reason', ''),
            status='pending'
        )
        
        # 총 연차 일수 계산
        leave_request.total_days = leave_request.calculate_total_days()
        
        # 연차 잔여일수 확인
        remaining_days = get_employee_remaining_leave_days(data['employee_id'])
        if remaining_days < leave_request.total_days:
            return jsonify({
                'success': False, 
                'error': f'연차 잔여일수가 부족합니다. (신청: {leave_request.total_days}일, 잔여: {remaining_days}일)'
            }), 400
        
        # 중복 신청 확인
        overlapping_requests = AnnualLeaveRequest.query.filter(
            AnnualLeaveRequest.employee_id == data['employee_id'],
            AnnualLeaveRequest.status.in_(['pending', 'approved']),
            AnnualLeaveRequest.start_date <= end_date,
            AnnualLeaveRequest.end_date >= start_date
        ).first()
        
        if overlapping_requests:
            return jsonify({'success': False, 'error': '해당 기간에 이미 신청된 연차가 있습니다.'}), 400
        
        # 데이터베이스 저장
        db.session.add(leave_request)
        db.session.commit()
        
        # 감사 로그
        log_action(
            user_id=request.current_user_id,
            action_type='CREATE',
            entity_type='LEAVE_REQUEST',
            entity_id=leave_request.id,
            message=f'연차 신청 생성: {employee.name} ({start_date} ~ {end_date}, {leave_request.total_days}일)'
        )
        
        return jsonify({
            'success': True,
            'message': '연차 신청이 완료되었습니다.',
            'request': leave_request.to_dict()
        })
        
    except ValueError as e:
        return jsonify({'success': False, 'error': '날짜 형식이 올바르지 않습니다.'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@annual_leave_request_bp.route('/api/annual-leave/requests/<int:request_id>/approve', methods=['POST'])
@admin_required
def approve_leave_request(request_id):
    """연차 신청 승인"""
    try:
        data = request.get_json() or {}
        
        # 연차 신청 조회
        leave_request = AnnualLeaveRequest.query.get(request_id)
        if not leave_request:
            return jsonify({'success': False, 'error': '존재하지 않는 연차 신청입니다.'}), 404
        
        if leave_request.status != 'pending':
            return jsonify({'success': False, 'error': '이미 처리된 연차 신청입니다.'}), 400
        
        # 연차 잔여일수 재확인
        remaining_days = get_employee_remaining_leave_days(leave_request.employee_id)
        if remaining_days < leave_request.total_days:
            return jsonify({
                'success': False, 
                'error': f'연차 잔여일수가 부족합니다. (신청: {leave_request.total_days}일, 잔여: {remaining_days}일)'
            }), 400
        
        # 연차 사용 기록 생성
        annual_leave_usage = AnnualLeaveUsage(
            employee_id=leave_request.employee_id,
            used_date=leave_request.start_date,
            used_days=leave_request.total_days,
            leave_type=leave_request.leave_type,
            reason=leave_request.reason or '연차 신청 승인',
            approved_by=request.current_user_id
        )
        
        db.session.add(annual_leave_usage)
        db.session.flush()  # ID 생성을 위해 flush
        
        # 연차 신청 상태 업데이트
        leave_request.status = 'approved'
        leave_request.approved_by = request.current_user_id
        leave_request.approved_at = datetime.utcnow()
        leave_request.approval_notes = data.get('notes', '')
        leave_request.annual_leave_usage_id = annual_leave_usage.id
        
        db.session.commit()
        
        # 감사 로그
        log_action(
            user_id=request.current_user_id,
            action_type='APPROVE',
            entity_type='LEAVE_REQUEST',
            entity_id=leave_request.id,
            message=f'연차 신청 승인: {leave_request.employee.name} ({leave_request.start_date} ~ {leave_request.end_date}, {leave_request.total_days}일)'
        )
        
        return jsonify({
            'success': True,
            'message': '연차 신청이 승인되었습니다.',
            'request': leave_request.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@annual_leave_request_bp.route('/api/annual-leave/requests/<int:request_id>/reject', methods=['POST'])
@admin_required
def reject_leave_request(request_id):
    """연차 신청 반려"""
    try:
        data = request.get_json() or {}
        
        # 연차 신청 조회
        leave_request = AnnualLeaveRequest.query.get(request_id)
        if not leave_request:
            return jsonify({'success': False, 'error': '존재하지 않는 연차 신청입니다.'}), 404
        
        if leave_request.status != 'pending':
            return jsonify({'success': False, 'error': '이미 처리된 연차 신청입니다.'}), 400
        
        # 연차 신청 상태 업데이트
        leave_request.status = 'rejected'
        leave_request.approved_by = request.current_user_id
        leave_request.approved_at = datetime.utcnow()
        leave_request.approval_notes = data.get('notes', '')
        
        db.session.commit()
        
        # 감사 로그
        log_action(
            user_id=request.current_user_id,
            action_type='REJECT',
            entity_type='LEAVE_REQUEST',
            entity_id=leave_request.id,
            message=f'연차 신청 반려: {leave_request.employee.name} ({leave_request.start_date} ~ {leave_request.end_date}, {leave_request.total_days}일) - 사유: {data.get("notes", "")}'
        )
        
        return jsonify({
            'success': True,
            'message': '연차 신청이 반려되었습니다.',
            'request': leave_request.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@annual_leave_request_bp.route('/api/annual-leave/requests/<int:request_id>', methods=['DELETE'])
@jwt_required
def delete_leave_request(request_id):
    """연차 신청 삭제 (대기중인 신청만 가능)"""
    try:
        # 연차 신청 조회
        leave_request = AnnualLeaveRequest.query.get(request_id)
        if not leave_request:
            return jsonify({'success': False, 'error': '존재하지 않는 연차 신청입니다.'}), 404
        
        if leave_request.status != 'pending':
            return jsonify({'success': False, 'error': '대기중인 연차 신청만 삭제할 수 있습니다.'}), 400
        
        # 연차 신청 삭제
        employee_name = leave_request.employee.name
        start_date = leave_request.start_date
        end_date = leave_request.end_date
        total_days = leave_request.total_days
        
        db.session.delete(leave_request)
        db.session.commit()
        
        # 감사 로그
        log_action(
            user_id=request.current_user_id,
            action_type='DELETE',
            entity_type='LEAVE_REQUEST',
            entity_id=request_id,
            message=f'연차 신청 삭제: {employee_name} ({start_date} ~ {end_date}, {total_days}일)'
        )
        
        return jsonify({
            'success': True,
            'message': '연차 신청이 삭제되었습니다.'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@annual_leave_request_bp.route('/api/annual-leave/requests/statistics', methods=['GET'])
@admin_required
def get_leave_request_statistics():
    """연차 신청 통계"""
    try:
        # 전체 통계
        total_requests = AnnualLeaveRequest.query.count()
        pending_requests = AnnualLeaveRequest.query.filter_by(status='pending').count()
        approved_requests = AnnualLeaveRequest.query.filter_by(status='approved').count()
        rejected_requests = AnnualLeaveRequest.query.filter_by(status='rejected').count()
        
        # 이번 달 통계
        today = date.today()
        month_start = date(today.year, today.month, 1)
        
        month_requests = AnnualLeaveRequest.query.filter(
            AnnualLeaveRequest.created_at >= month_start
        ).count()
        
        month_approved = AnnualLeaveRequest.query.filter(
            AnnualLeaveRequest.created_at >= month_start,
            AnnualLeaveRequest.status == 'approved'
        ).count()
        
        # 승인율 계산
        approval_rate = (approved_requests / total_requests * 100) if total_requests > 0 else 0
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_requests': total_requests,
                'pending_requests': pending_requests,
                'approved_requests': approved_requests,
                'rejected_requests': rejected_requests,
                'approval_rate': round(approval_rate, 1),
                'month_requests': month_requests,
                'month_approved': month_approved
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def get_employee_remaining_leave_days(employee_id):
    """직원의 연차 잔여일수 계산"""
    try:
        # 부여된 연차 총합
        total_granted = db.session.query(db.func.sum(AnnualLeaveGrant.total_days)).filter_by(
            employee_id=employee_id
        ).scalar() or 0
        
        # 사용된 연차 총합 (승인된 신청만)
        total_used = db.session.query(db.func.sum(AnnualLeaveUsage.used_days)).filter_by(
            employee_id=employee_id
        ).scalar() or 0
        
        # 대기중인 신청 총합 (임시 차감)
        pending_requests = db.session.query(db.func.sum(AnnualLeaveRequest.total_days)).filter_by(
            employee_id=employee_id,
            status='pending'
        ).scalar() or 0
        
        return total_granted - total_used - pending_requests
        
    except Exception:
        return 0

