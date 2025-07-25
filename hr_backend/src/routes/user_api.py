"""
사용자 전용 API 라우트
일반 직원이 본인의 데이터만 조회하고 간단한 신청을 할 수 있는 API
"""

from flask import Blueprint, request, jsonify
from src.utils.jwt_helper import jwt_required, user_required, get_current_employee, get_current_user_id
from src.utils.audit import log_action
import sqlite3
from datetime import datetime, date

user_api_bp = Blueprint('user_api', __name__)

@user_api_bp.route('/me', methods=['GET'])
@jwt_required
@user_required
def get_my_profile():
    """내 프로필 정보 조회"""
    try:
        employee = get_current_employee()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        return jsonify({
            'success': True,
            'employee': employee
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_api_bp.route('/my-attendance', methods=['GET'])
@jwt_required
@user_required
def get_my_attendance():
    """내 출퇴근 기록 조회"""
    try:
        employee = get_current_employee()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        # 쿼리 파라미터
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        conn = sqlite3.connect('src/database/app.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 기본 쿼리
        query = '''
            SELECT ar.*, e.name as employee_name
            FROM attendance_records ar
            JOIN employees e ON ar.employee_id = e.id
            WHERE ar.employee_id = ?
        '''
        params = [employee['id']]
        
        # 날짜 필터
        if start_date:
            query += ' AND ar.date >= ?'
            params.append(start_date)
        if end_date:
            query += ' AND ar.date <= ?'
            params.append(end_date)
        
        # 정렬
        query += ' ORDER BY ar.date DESC, ar.check_in_time DESC'
        
        # 페이징
        offset = (page - 1) * per_page
        query += f' LIMIT {per_page} OFFSET {offset}'
        
        cursor.execute(query, params)
        records = [dict(row) for row in cursor.fetchall()]
        
        # 총 개수 조회
        count_query = '''
            SELECT COUNT(*) as total
            FROM attendance_records ar
            WHERE ar.employee_id = ?
        '''
        count_params = [employee['id']]
        
        if start_date:
            count_query += ' AND ar.date >= ?'
            count_params.append(start_date)
        if end_date:
            count_query += ' AND ar.date <= ?'
            count_params.append(end_date)
        
        cursor.execute(count_query, count_params)
        total = cursor.fetchone()['total']
        
        conn.close()
        
        return jsonify({
            'success': True,
            'records': records,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_api_bp.route('/my-annual-leave', methods=['GET'])
@jwt_required
@user_required
def get_my_annual_leave():
    """내 연차 정보 조회"""
    try:
        employee = get_current_employee()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        year = int(request.args.get('year', datetime.now().year))
        
        conn = sqlite3.connect('src/database/app.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 연차 부여 정보
        cursor.execute('''
            SELECT * FROM annual_leave_grants 
            WHERE employee_id = ? AND year = ?
        ''', (employee['id'], year))
        grants = [dict(row) for row in cursor.fetchall()]
        
        # 연차 사용 내역
        cursor.execute('''
            SELECT * FROM annual_leave_usages 
            WHERE employee_id = ? AND strftime('%Y', start_date) = ?
            ORDER BY start_date DESC
        ''', (employee['id'], str(year)))
        usages = [dict(row) for row in cursor.fetchall()]
        
        # 연차 신청 내역
        cursor.execute('''
            SELECT * FROM annual_leave_requests 
            WHERE employee_id = ? AND strftime('%Y', start_date) = ?
            ORDER BY created_at DESC
        ''', (employee['id'], str(year)))
        requests = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        # 연차 잔여일수 계산
        total_granted = sum(grant['days_granted'] for grant in grants)
        total_used = sum(usage['used_days'] for usage in usages)
        remaining_days = total_granted - total_used
        
        return jsonify({
            'success': True,
            'summary': {
                'year': year,
                'total_granted': total_granted,
                'total_used': total_used,
                'remaining_days': remaining_days
            },
            'grants': grants,
            'usages': usages,
            'requests': requests
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_api_bp.route('/annual-leave-request', methods=['POST'])
@jwt_required
@user_required
def create_annual_leave_request():
    """연차 신청"""
    try:
        employee = get_current_employee()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['start_date', 'end_date', 'leave_type', 'reason']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field}는 필수 항목입니다.'}), 400
        
        # 날짜 검증
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        
        if start_date > end_date:
            return jsonify({'error': '시작일은 종료일보다 빨라야 합니다.'}), 400
        
        # 사용일수 계산
        leave_type = data['leave_type']
        if leave_type == 'full':
            days_requested = (end_date - start_date).days + 1
        elif leave_type == 'half':
            days_requested = 0.5
        elif leave_type == 'quarter':
            days_requested = 0.25
        else:
            return jsonify({'error': '올바르지 않은 휴가 유형입니다.'}), 400
        
        # 연차 잔여일수 확인
        conn = sqlite3.connect('src/database/app.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        year = start_date.year
        
        # 부여된 연차
        cursor.execute('''
            SELECT COALESCE(SUM(days_granted), 0) as total_granted
            FROM annual_leave_grants 
            WHERE employee_id = ? AND year = ?
        ''', (employee['id'], year))
        total_granted = cursor.fetchone()['total_granted']
        
        # 사용된 연차 (승인된 것만)
        cursor.execute('''
            SELECT COALESCE(SUM(used_days), 0) as total_used
            FROM annual_leave_usages 
            WHERE employee_id = ? AND strftime('%Y', start_date) = ?
        ''', (employee['id'], str(year)))
        total_used = cursor.fetchone()['total_used']
        
        # 대기 중인 신청
        cursor.execute('''
            SELECT COALESCE(SUM(days_requested), 0) as pending_requests
            FROM annual_leave_requests 
            WHERE employee_id = ? AND strftime('%Y', start_date) = ? AND status = 'pending'
        ''', (employee['id'], str(year)))
        pending_requests = cursor.fetchone()['pending_requests']
        
        remaining_days = total_granted - total_used - pending_requests
        
        if days_requested > remaining_days:
            conn.close()
            return jsonify({'error': f'연차가 부족합니다. (잔여: {remaining_days}일, 신청: {days_requested}일)'}), 400
        
        # 연차 신청 생성
        cursor.execute('''
            INSERT INTO annual_leave_requests 
            (employee_id, start_date, end_date, leave_type, days_requested, reason, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        ''', (
            employee['id'],
            data['start_date'],
            data['end_date'],
            leave_type,
            days_requested,
            data['reason'],
            datetime.now()
        ))
        
        request_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # 감사 로그
        log_action(
            get_current_user_id(),
            'annual_leave_request_create',
            f"연차 신청: {employee['name']} - {data['start_date']} ~ {data['end_date']} ({days_requested}일)"
        )
        
        return jsonify({
            'success': True,
            'message': '연차 신청이 완료되었습니다.',
            'request_id': request_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_api_bp.route('/my-payroll', methods=['GET'])
@jwt_required
@user_required
def get_my_payroll():
    """내 급여명세서 조회"""
    try:
        employee = get_current_employee()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        year = request.args.get('year', datetime.now().year)
        month = request.args.get('month')
        
        conn = sqlite3.connect('src/database/app.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = '''
            SELECT p.*, e.name as employee_name, e.employee_number
            FROM payrolls p
            JOIN employees e ON p.employee_id = e.id
            WHERE p.employee_id = ? AND p.year = ?
        '''
        params = [employee['id'], year]
        
        if month:
            query += ' AND p.month = ?'
            params.append(month)
        
        query += ' ORDER BY p.year DESC, p.month DESC'
        
        cursor.execute(query, params)
        payrolls = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'payrolls': payrolls
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_api_bp.route('/my-work-schedule', methods=['GET'])
@jwt_required
@user_required
def get_my_work_schedule():
    """내 근무시간 조회"""
    try:
        employee = get_current_employee()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        conn = sqlite3.connect('src/database/app.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM work_schedules 
            WHERE employee_id = ?
            ORDER BY day_of_week
        ''', (employee['id'],))
        schedules = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'schedules': schedules
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_api_bp.route('/my-statistics', methods=['GET'])
@jwt_required
@user_required
def get_my_statistics():
    """내 통계 정보 조회"""
    try:
        employee = get_current_employee()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        year = int(request.args.get('year', datetime.now().year))
        month = request.args.get('month')
        
        conn = sqlite3.connect('src/database/app.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 출근 통계
        attendance_query = '''
            SELECT 
                COUNT(*) as total_days,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days
            FROM attendance_records 
            WHERE employee_id = ? AND strftime('%Y', date) = ?
        '''
        params = [employee['id'], str(year)]
        
        if month:
            attendance_query += " AND strftime('%m', date) = ?"
            params.append(f"{int(month):02d}")
        
        cursor.execute(attendance_query, params)
        attendance_stats = dict(cursor.fetchone())
        
        # 연차 통계
        cursor.execute('''
            SELECT 
                COALESCE(SUM(days_granted), 0) as total_granted
            FROM annual_leave_grants 
            WHERE employee_id = ? AND year = ?
        ''', (employee['id'], year))
        total_granted = cursor.fetchone()['total_granted']
        
        cursor.execute('''
            SELECT 
                COALESCE(SUM(used_days), 0) as total_used
            FROM annual_leave_usages 
            WHERE employee_id = ? AND strftime('%Y', start_date) = ?
        ''', (employee['id'], str(year)))
        total_used = cursor.fetchone()['total_used']
        
        # 급여 통계 (최근 3개월)
        cursor.execute('''
            SELECT 
                AVG(net_pay) as avg_net_pay,
                MAX(net_pay) as max_net_pay,
                MIN(net_pay) as min_net_pay
            FROM payrolls 
            WHERE employee_id = ? AND year = ?
            ORDER BY year DESC, month DESC 
            LIMIT 3
        ''', (employee['id'], year))
        payroll_stats = dict(cursor.fetchone())
        
        conn.close()
        
        return jsonify({
            'success': True,
            'statistics': {
                'attendance': attendance_stats,
                'annual_leave': {
                    'total_granted': total_granted,
                    'total_used': total_used,
                    'remaining': total_granted - total_used
                },
                'payroll': payroll_stats
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

