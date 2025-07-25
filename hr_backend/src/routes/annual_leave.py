from flask import Blueprint, request, jsonify
from src.utils.jwt_helper import jwt_required, get_current_user_id, get_current_user_role, require_admin
from datetime import datetime, date
from sqlalchemy import and_, or_, desc, func
from src.models.user import db
from src.models.annual_leave_grant import AnnualLeaveGrant
from src.models.annual_leave_usage import AnnualLeaveUsage
from src.models.leave_request import LeaveRequest
from src.models.employee import Employee
from src.utils.auth import admin_required
from src.utils.audit import log_action

annual_leave_bp = Blueprint('annual_leave', __name__)

@annual_leave_bp.route('/annual-leave/grants', methods=['GET'])
@jwt_required
def get_annual_leave_grants():
    """연차 부여 내역 조회"""
    try:
        current_user_id = get_current_user_id()
        current_user_role = get_current_user_role()
        user_role = current_user_role
        
        # 쿼리 파라미터
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        employee_id = request.args.get('employee_id', type=int)
        year = request.args.get('year', type=int)
        
        # 기본 쿼리
        query = AnnualLeaveGrant.query.join(Employee)
        
        # 권한에 따른 필터링
        if user_role != 'admin':
            # 일반 사용자는 본인 기록만 조회
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee:
                return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
            query = query.filter(AnnualLeaveGrant.employee_id == employee.id)
        elif employee_id:
            # 관리자가 특정 직원 지정
            query = query.filter(AnnualLeaveGrant.employee_id == employee_id)
        
        # 연도 필터
        if year:
            query = query.filter(AnnualLeaveGrant.year == year)
        
        # 정렬 및 페이지네이션
        query = query.order_by(desc(AnnualLeaveGrant.year), desc(AnnualLeaveGrant.grant_date))
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        grants = [grant.to_dict() for grant in pagination.items]
        
        return jsonify({
            'grants': grants,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'연차 부여 내역 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@annual_leave_bp.route('/annual-leave/grants', methods=['POST'])
@admin_required
def create_annual_leave_grant():
    """연차 부여 (관리자만)"""
    try:
        current_user_id = get_current_user_id()
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['employee_id', 'total_days', 'year']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} 필드는 필수입니다.'}), 400
        
        # 직원 확인
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({'error': '직원을 찾을 수 없습니다.'}), 404
        
        # 중복 부여 확인
        existing_grant = AnnualLeaveGrant.query.filter_by(
            employee_id=data['employee_id'],
            year=data['year']
        ).first()
        
        if existing_grant:
            return jsonify({'error': f'{data["year"]}년도 연차가 이미 부여되었습니다.'}), 400
        
        # 부여 날짜 파싱
        grant_date = date.today()
        if 'grant_date' in data and data['grant_date']:
            try:
                grant_date = datetime.strptime(data['grant_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': '부여 날짜 형식이 올바르지 않습니다.'}), 400
        
        # 연차 부여 생성
        grant = AnnualLeaveGrant(
            employee_id=data['employee_id'],
            grant_date=grant_date,
            total_days=data['total_days'],
            year=data['year'],
            note=data.get('note'),
            created_by=current_user_id
        )
        
        db.session.add(grant)
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=current_user_id,
            action_type='CREATE',
            entity_type='annual_leave_grant',
            entity_id=grant.id,
            message=f'연차 부여: {employee.name} ({data["year"]}년 {data["total_days"]}일)'
        )
        
        return jsonify({
            'message': '연차가 부여되었습니다.',
            'grant': grant.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'연차 부여 중 오류가 발생했습니다: {str(e)}'}), 500

@annual_leave_bp.route('/annual-leave/usages', methods=['GET'])
@jwt_required
def get_annual_leave_usages():
    """연차 사용 내역 조회"""
    try:
        current_user_id = get_current_user_id()
        current_user_role = get_current_user_role()
        user_role = current_user_role
        
        # 쿼리 파라미터
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        employee_id = request.args.get('employee_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # 기본 쿼리
        query = AnnualLeaveUsage.query.join(Employee)
        
        # 권한에 따른 필터링
        if user_role != 'admin':
            # 일반 사용자는 본인 기록만 조회
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee:
                return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
            query = query.filter(AnnualLeaveUsage.employee_id == employee.id)
        elif employee_id:
            # 관리자가 특정 직원 지정
            query = query.filter(AnnualLeaveUsage.employee_id == employee_id)
        
        # 날짜 필터
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(AnnualLeaveUsage.usage_date >= start_date_obj)
            except ValueError:
                return jsonify({'error': '시작 날짜 형식이 올바르지 않습니다.'}), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(AnnualLeaveUsage.usage_date <= end_date_obj)
            except ValueError:
                return jsonify({'error': '종료 날짜 형식이 올바르지 않습니다.'}), 400
        
        # 정렬 및 페이지네이션
        query = query.order_by(desc(AnnualLeaveUsage.usage_date))
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        usages = [usage.to_dict() for usage in pagination.items]
        
        return jsonify({
            'usages': usages,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'연차 사용 내역 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@annual_leave_bp.route('/annual-leave/balance/<int:employee_id>', methods=['GET'])
@jwt_required
def get_annual_leave_balance(employee_id):
    """연차 잔여일수 조회"""
    try:
        current_user_id = get_current_user_id()
        current_user_role = get_current_user_role()
        user_role = current_user_role
        
        # 권한 확인
        if user_role != 'admin':
            employee = Employee.query.filter_by(user_id=current_user_id).first()
            if not employee or employee.id != employee_id:
                return jsonify({'error': '조회 권한이 없습니다.'}), 403
        
        # 직원 확인
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({'error': '직원을 찾을 수 없습니다.'}), 404
        
        year = request.args.get('year', datetime.now().year, type=int)
        
        # 부여된 연차 조회
        grant = AnnualLeaveGrant.query.filter_by(
            employee_id=employee_id,
            year=year
        ).first()
        
        total_granted = grant.total_days if grant else 0
        
        # 사용한 연차 조회
        used_query = db.session.query(func.sum(AnnualLeaveUsage.used_days)).filter(
            AnnualLeaveUsage.employee_id == employee_id,
            func.extract('year', AnnualLeaveUsage.usage_date) == year
        )
        total_used = used_query.scalar() or 0
        
        # 잔여 연차 계산
        remaining = total_granted - total_used
        
        return jsonify({
            'employee_id': employee_id,
            'employee_name': employee.name,
            'year': year,
            'total_granted': total_granted,
            'total_used': total_used,
            'remaining': remaining,
            'grant_info': grant.to_dict() if grant else None
        })
        
    except Exception as e:
        return jsonify({'error': f'연차 잔여일수 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@annual_leave_bp.route('/annual-leave/balance', methods=['GET'])
@jwt_required
def get_my_annual_leave_balance():
    """내 연차 잔여일수 조회"""
    try:
        current_user_id = get_current_user_id()
        
        # 직원 정보 확인
        employee = Employee.query.filter_by(user_id=current_user_id).first()
        if not employee:
            return jsonify({'error': '직원 정보를 찾을 수 없습니다.'}), 404
        
        year = request.args.get('year', datetime.now().year, type=int)
        
        # 부여된 연차 조회
        grant = AnnualLeaveGrant.query.filter_by(
            employee_id=employee.id,
            year=year
        ).first()
        
        total_granted = grant.total_days if grant else 0
        
        # 사용한 연차 조회
        used_query = db.session.query(func.sum(AnnualLeaveUsage.used_days)).filter(
            AnnualLeaveUsage.employee_id == employee.id,
            func.extract('year', AnnualLeaveUsage.usage_date) == year
        )
        total_used = used_query.scalar() or 0
        
        # 잔여 연차 계산
        remaining = total_granted - total_used
        
        return jsonify({
            'employee_id': employee.id,
            'employee_name': employee.name,
            'year': year,
            'total_granted': total_granted,
            'total_used': total_used,
            'remaining': remaining,
            'grant_info': grant.to_dict() if grant else None
        })
        
    except Exception as e:
        return jsonify({'error': f'연차 잔여일수 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@annual_leave_bp.route('/annual-leave/use', methods=['POST'])
@admin_required
def use_annual_leave():
    """연차 사용 등록 (관리자만)"""
    try:
        current_user_id = get_current_user_id()
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['employee_id', 'usage_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} 필드는 필수입니다.'}), 400
        
        # 직원 확인
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({'error': '직원을 찾을 수 없습니다.'}), 404
        
        # 날짜 파싱
        try:
            usage_date = datetime.strptime(data['usage_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': '사용 날짜 형식이 올바르지 않습니다.'}), 400
        
        # 연차 잔여일수 확인
        year = usage_date.year
        grant = AnnualLeaveGrant.query.filter_by(
            employee_id=data['employee_id'],
            year=year
        ).first()
        
        if not grant:
            return jsonify({'error': f'{year}년도 연차가 부여되지 않았습니다.'}), 400
        
        # 사용한 연차 조회
        used_query = db.session.query(func.sum(AnnualLeaveUsage.used_days)).filter(
            AnnualLeaveUsage.employee_id == data['employee_id'],
            func.extract('year', AnnualLeaveUsage.usage_date) == year
        )
        total_used = used_query.scalar() or 0
        
        # 휴가 유형 처리
        leave_type = data.get('leave_type', 'full')
        if leave_type not in ['full', 'half', 'quarter']:
            return jsonify({'error': '올바르지 않은 휴가 유형입니다.'}), 400
        
        # 휴가 유형에 따른 사용 일수 자동 설정
        type_days = AnnualLeaveUsage.get_days_by_type(leave_type)
        used_days = data.get('used_days', type_days)
        
        # 휴가 유형과 사용 일수 일치 확인
        if used_days != type_days:
            return jsonify({'error': f'{leave_type} 유형은 {type_days}일이어야 합니다.'}), 400
        
        # 잔여 연차 확인
        remaining = grant.total_days - total_used
        if used_days > remaining:
            return jsonify({'error': f'연차 잔여일수가 부족합니다. (잔여: {remaining}일)'}), 400
        
        # 연차 사용 등록
        usage = AnnualLeaveUsage(
            employee_id=data['employee_id'],
            usage_date=usage_date,
            used_days=used_days,
            leave_type=leave_type,
            linked_leave_request_id=data.get('linked_leave_request_id'),
            note=data.get('note'),
            created_by=current_user_id
        )
        
        db.session.add(usage)
        db.session.commit()
        
        # 감사 로그 기록
        leave_type_names = {'full': '연차', 'half': '반차', 'quarter': '반반차'}
        type_name = leave_type_names.get(leave_type, leave_type)
        log_action(
            user_id=current_user_id,
            action_type='CREATE',
            entity_type='annual_leave_usage',
            entity_id=usage.id,
            message=f'{type_name} 사용 등록: {employee.name} ({usage_date} {used_days}일)'
        )
        
        return jsonify({
            'message': '연차 사용이 등록되었습니다.',
            'usage': usage.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'연차 사용 등록 중 오류가 발생했습니다: {str(e)}'}), 500



@annual_leave_bp.route('/annual-leave/auto-grant', methods=['POST'])
@jwt_required
@admin_required
def auto_grant_annual_leave():
    """자동 연차 부여 (근로기준법 기준 - 입사일/회계연도 기준)"""
    try:
        data = request.get_json()
        year = data.get('year', datetime.now().year)
        grant_basis = data.get('grant_basis', 'hire_date')  # hire_date 또는 fiscal_year
        
        # 모든 직원 조회
        employees = Employee.query.filter_by(is_active=True).all()
        processed_count = 0
        total_granted_days = 0
        
        for employee in employees:
            # 입사일 확인
            hire_date = employee.hire_date
            if not hire_date:
                continue
            
            # 근속연수 계산
            current_date = datetime.now().date()
            years_of_service = (current_date - hire_date).days / 365.25
            
            if grant_basis == 'hire_date':
                # 입사일 기준 연차 부여
                result = grant_annual_leave_by_hire_date(employee, year)
            else:
                # 회계연도 기준 연차 부여 (1년 이상 근무자만)
                if years_of_service >= 1.0:
                    result = grant_annual_leave_by_fiscal_year(employee, year)
                else:
                    # 1년 미만은 반드시 입사일 기준
                    result = grant_annual_leave_by_hire_date(employee, year)
            
            if result:
                processed_count += result['count']
                total_granted_days += result['days']
        
        db.session.commit()
        
        return jsonify({
            'message': f'자동 연차 부여가 완료되었습니다 ({grant_basis} 기준).',
            'processed_count': processed_count,
            'total_granted_days': total_granted_days,
            'year': year,
            'grant_basis': grant_basis
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'자동 연차 부여 중 오류가 발생했습니다: {str(e)}'}), 500


def grant_annual_leave_by_hire_date(employee, year):
    """입사일 기준 연차 부여"""
    try:
        hire_date = employee.hire_date
        current_date = datetime.now().date()
        years_of_service = (current_date - hire_date).days / 365.25
        
        granted_count = 0
        granted_days = 0
        
        if years_of_service < 1.0:
            # 1년 미만: 매월 개근 시 1일씩 부여
            granted_count, granted_days = grant_monthly_leave(employee, year)
        else:
            # 1년 이상: 입사일 기준 연간 부여
            granted_count, granted_days = grant_annual_leave_on_hire_anniversary(employee, year)
        
        return {'count': granted_count, 'days': granted_days}
        
    except Exception as e:
        print(f"입사일 기준 연차 부여 오류 ({employee.name}): {e}")
        return None


def grant_monthly_leave(employee, year):
    """월별 개근 연차 부여 (1년 미만 근무자)"""
    try:
        granted_count = 0
        granted_days = 0
        
        # 해당 연도의 각 월별로 개근 확인
        for month in range(1, 13):
            # 이미 해당 월에 연차가 부여되었는지 확인
            existing_grant = AnnualLeaveGrant.query.filter_by(
                employee_id=employee.id,
                year=year,
                grant_type='monthly',
                grant_period=month
            ).first()
            
            if existing_grant:
                continue
            
            # 해당 월 개근 여부 확인
            is_perfect_attendance = check_monthly_perfect_attendance(employee.id, year, month)
            
            if is_perfect_attendance:
                # 1일 연차 부여
                grant = AnnualLeaveGrant(
                    employee_id=employee.id,
                    year=year,
                    total_days=1.0,
                    grant_date=datetime(year, month, 1).date(),
                    grant_type='monthly',
                    grant_basis='hire_date',
                    grant_period=month,
                    is_perfect_attendance=True,
                    note=f"{month}월 개근 연차 (1일)",
                    created_by=get_current_user_id()
                )
                
                db.session.add(grant)
                granted_count += 1
                granted_days += 1.0
                
            # 감사 로그
            log_action(
                user_id=get_current_user_id(),
                action_type='CREATE',
                entity_type='annual_leave_grant',
                entity_id=None,
                message=f"월별 연차 부여: {employee.name} ({month}월, 1일)"
            )
        
        return granted_count, granted_days
        
    except Exception as e:
        print(f"월별 연차 부여 오류 ({employee.name}): {e}")
        return 0, 0


def grant_annual_leave_on_hire_anniversary(employee, year):
    """입사 기념일 기준 연간 연차 부여"""
    try:
        hire_date = employee.hire_date
        anniversary_date = hire_date.replace(year=year)
        
        # 이미 해당 연도에 연간 연차가 부여되었는지 확인
        existing_grant = AnnualLeaveGrant.query.filter_by(
            employee_id=employee.id,
            year=year,
            grant_type='annual',
            grant_basis='hire_date'
        ).first()
        
        if existing_grant:
            return 0, 0
        
        # 근속연수 계산 (입사 기념일 기준)
        years_of_service = year - hire_date.year
        
        # 전년도 출근율 계산
        attendance_rate = calculate_attendance_rate(employee.id, year - 1)
        
        # 연차 일수 계산
        annual_leave_days = calculate_annual_leave_days_by_service_years(years_of_service, attendance_rate)
        
        if annual_leave_days > 0:
            grant = AnnualLeaveGrant(
                employee_id=employee.id,
                year=year,
                total_days=annual_leave_days,
                grant_date=anniversary_date,
                grant_type='annual',
                grant_basis='hire_date',
                grant_period=None,
                is_perfect_attendance=(attendance_rate >= 80.0),
                note=f"입사 {years_of_service}주년 연차 ({annual_leave_days}일, 출근율: {attendance_rate:.1f}%)",
                created_by=get_current_user_id()
            )
            
            db.session.add(grant)
            
            # 감사 로그
            log_action(
                user_id=get_current_user_id(),
                action_type='CREATE',
                entity_type='annual_leave_grant',
                entity_id=None,
                message=f"연간 연차 부여: {employee.name} ({annual_leave_days}일)"
            )
            
            return 1, annual_leave_days
        
        return 0, 0
        
    except Exception as e:
        print(f"연간 연차 부여 오류 ({employee.name}): {e}")
        return 0, 0


def grant_annual_leave_by_fiscal_year(employee, year):
    """회계연도 기준 연차 부여 (1월 1일)"""
    try:
        # 이미 해당 연도에 회계연도 기준 연차가 부여되었는지 확인
        existing_grant = AnnualLeaveGrant.query.filter_by(
            employee_id=employee.id,
            year=year,
            grant_type='annual',
            grant_basis='fiscal_year'
        ).first()
        
        if existing_grant:
            return {'count': 0, 'days': 0}
        
        # 근속연수 계산 (12월 31일 기준)
        hire_date = employee.hire_date
        end_of_year = datetime(year - 1, 12, 31).date()
        years_of_service = (end_of_year - hire_date).days / 365.25
        
        # 전년도 출근율 계산
        attendance_rate = calculate_attendance_rate(employee.id, year - 1)
        
        # 연차 일수 계산
        annual_leave_days = calculate_annual_leave_days_by_service_years(years_of_service, attendance_rate)
        
        if annual_leave_days > 0:
            grant = AnnualLeaveGrant(
                employee_id=employee.id,
                year=year,
                total_days=annual_leave_days,
                grant_date=datetime(year, 1, 1).date(),
                grant_type='annual',
                grant_basis='fiscal_year',
                grant_period=None,
                is_perfect_attendance=(attendance_rate >= 80.0),
                note=f"회계연도 연차 ({annual_leave_days}일, 근속: {years_of_service:.1f}년, 출근율: {attendance_rate:.1f}%)",
                created_by=get_current_user_id()
            )
            
            db.session.add(grant)
            
            # 감사 로그
            log_action(
                user_id=get_current_user_id(),
                action_type='CREATE',
                entity_type='annual_leave_grant',
                entity_id=None,
                message=f"회계연도 연차 부여: {employee.name} ({annual_leave_days}일)"
            )
            
            return {'count': 1, 'days': annual_leave_days}
        
        return {'count': 0, 'days': 0}
        
    except Exception as e:
        print(f"회계연도 연차 부여 오류 ({employee.name}): {e}")
        return {'count': 0, 'days': 0}


def check_monthly_perfect_attendance(employee_id, year, month):
    """월별 개근 여부 확인"""
    try:
        from src.models.attendance import Attendance
        from calendar import monthrange
        
        # 해당 월의 총 근무일수 (주말 제외)
        _, last_day = monthrange(year, month)
        start_date = datetime(year, month, 1).date()
        end_date = datetime(year, month, last_day).date()
        
        # 출근 기록 조회
        attendance_records = Attendance.query.filter(
            Attendance.employee_id == employee_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date
        ).all()
        
        if not attendance_records:
            return False
        
        # 결근이나 무단결근이 있는지 확인
        for record in attendance_records:
            if record.status in ['결근', '무단결근']:
                return False
        
        return True
        
    except Exception:
        return False


def calculate_annual_leave_days_by_service_years(years_of_service, attendance_rate):
    """근속연수별 연차 일수 계산"""
    
    # 출근율 80% 미만이면 월별 개근 기준 적용
    if attendance_rate < 80.0:
        # 출근율 기반으로 개근월수 추정
        perfect_months = int(attendance_rate / 100 * 12)
        return min(perfect_months, 11)
    
    # 80% 이상 출근 시 근속연수별 연차
    if years_of_service >= 21:
        return 25
    elif years_of_service >= 19:
        return 24
    elif years_of_service >= 17:
        return 23
    elif years_of_service >= 15:
        return 22
    elif years_of_service >= 13:
        return 21
    elif years_of_service >= 11:
        return 20
    elif years_of_service >= 9:
        return 19
    elif years_of_service >= 7:
        return 18
    elif years_of_service >= 5:
        return 17
    elif years_of_service >= 3:
        return 16
    elif years_of_service >= 1:
        return 15
    else:
        return 0


def calculate_attendance_rate(employee_id, year):
    """출근율 계산"""
    try:
        from src.models.attendance import Attendance
        
        # 해당 연도의 총 근무일수 (주말 제외)
        start_date = datetime(year, 1, 1).date()
        end_date = datetime(year, 12, 31).date()
        
        # 출근 기록 조회
        attendance_records = Attendance.query.filter(
            Attendance.employee_id == employee_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date
        ).all()
        
        if not attendance_records:
            return 0.0
        
        # 출근일수 계산 (출근 또는 지각)
        attended_days = len([r for r in attendance_records if r.status in ['출근', '지각']])
        total_work_days = len(attendance_records)
        
        return (attended_days / total_work_days * 100) if total_work_days > 0 else 0.0
        
    except Exception:
        return 0.0


def calculate_annual_leave_days(years_of_service, attendance_rate):
    """연차 일수 계산 (근로기준법 기준)"""
    
    # 1년 미만 또는 출근율 80% 미만
    if years_of_service < 1.0 or attendance_rate < 80.0:
        # 1개월 개근 시 1일 (최대 11일)
        # 출근율 기반으로 개근월수 추정
        perfect_months = int(attendance_rate / 100 * 12)
        return min(perfect_months, 11)
    
    # 1년 이상 근무 + 80% 이상 출근
    base_days = 15
    
    # 근속연수별 가산일수
    if years_of_service >= 3:
        additional_years = min(int(years_of_service) - 2, 19)  # 최대 19년 가산
        additional_days = min(additional_years, 10)  # 최대 10일 가산
        return base_days + additional_days
    
    return base_days

