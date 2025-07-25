from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import and_, or_, desc
from datetime import datetime
from decimal import Decimal

from src.models.user import db
from src.models.payroll import Payroll
from src.models.employee import Employee
from src.utils.jwt_helper import jwt_required, admin_required, get_current_user_id
from src.utils.audit import log_action

payroll_bp = Blueprint('payroll', __name__)

@payroll_bp.route('/payrolls', methods=['GET'])
@jwt_required
@admin_required
def get_payrolls():
    """급여명세서 목록 조회"""
    try:
        # 쿼리 파라미터
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        employee_id = request.args.get('employee_id', type=int)
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        search = request.args.get('search', '').strip()
        
        # 기본 쿼리
        query = db.session.query(Payroll).join(Employee)
        
        # 필터 적용
        if employee_id:
            query = query.filter(Payroll.employee_id == employee_id)
        
        if year:
            query = query.filter(Payroll.year == year)
            
        if month:
            query = query.filter(Payroll.month == month)
        
        if search:
            query = query.filter(
                or_(
                    Employee.name.contains(search),
                    Employee.employee_number.contains(search)
                )
            )
        
        # 정렬 (최신순)
        query = query.order_by(desc(Payroll.year), desc(Payroll.month), Employee.name)
        
        # 페이지네이션
        pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        payrolls = [payroll.to_dict() for payroll in pagination.items]
        
        return jsonify({
            'payrolls': payrolls,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        })
        
    except Exception as e:
        current_app.logger.error(f"급여명세서 목록 조회 오류: {str(e)}")
        return jsonify({'error': '급여명세서 목록 조회 중 오류가 발생했습니다.'}), 500

@payroll_bp.route('/payrolls', methods=['POST'])
@jwt_required
@admin_required
def create_payroll():
    """급여명세서 생성"""
    try:
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['employee_id', 'year', 'month', 'base_salary']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field}는 필수 항목입니다.'}), 400
        
        # 직원 존재 확인
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({'error': '존재하지 않는 직원입니다.'}), 404
        
        # 중복 확인 (같은 직원, 같은 년월)
        existing = Payroll.query.filter_by(
            employee_id=data['employee_id'],
            year=data['year'],
            month=data['month']
        ).first()
        
        if existing:
            return jsonify({'error': '해당 직원의 해당 년월 급여명세서가 이미 존재합니다.'}), 400
        
        # 급여명세서 생성
        payroll = Payroll(
            employee_id=data['employee_id'],
            year=data['year'],
            month=data['month'],
            base_salary=Decimal(str(data['base_salary'])),
            position_allowance=Decimal(str(data.get('position_allowance', 0))),
            meal_allowance=Decimal(str(data.get('meal_allowance', 0))),
            transport_allowance=Decimal(str(data.get('transport_allowance', 0))),
            overtime_pay=Decimal(str(data.get('overtime_pay', 0))),
            night_pay=Decimal(str(data.get('night_pay', 0))),
            holiday_pay=Decimal(str(data.get('holiday_pay', 0))),
            bonus=Decimal(str(data.get('bonus', 0))),
            other_allowances=Decimal(str(data.get('other_allowances', 0))),
            income_tax=Decimal(str(data.get('income_tax', 0))),
            resident_tax=Decimal(str(data.get('resident_tax', 0))),
            national_pension=Decimal(str(data.get('national_pension', 0))),
            health_insurance=Decimal(str(data.get('health_insurance', 0))),
            employment_insurance=Decimal(str(data.get('employment_insurance', 0))),
            long_term_care=Decimal(str(data.get('long_term_care', 0))),
            other_deductions=Decimal(str(data.get('other_deductions', 0))),
            work_days=data.get('work_days', 0),
            overtime_hours=Decimal(str(data.get('overtime_hours', 0))),
            night_hours=Decimal(str(data.get('night_hours', 0))),
            holiday_hours=Decimal(str(data.get('holiday_hours', 0))),
            memo=data.get('memo'),
            created_by=get_current_user_id()
        )
        
        # 총액 계산
        payroll.calculate_totals()
        
        db.session.add(payroll)
        db.session.commit()
        
        # 감사 로그
        log_action(
            user_id=get_current_user_id(),
            action_type='CREATE',
            entity_type='payroll',
            entity_id=payroll.id,
            message=f"급여명세서 생성: {employee.name} ({payroll.year}-{payroll.month:02d})"
        )
        
        return jsonify({
            'message': '급여명세서가 성공적으로 생성되었습니다.',
            'payroll': payroll.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"급여명세서 생성 오류: {str(e)}")
        return jsonify({'error': '급여명세서 생성 중 오류가 발생했습니다.'}), 500

@payroll_bp.route('/payrolls/<int:payroll_id>', methods=['GET'])
@jwt_required
@admin_required
def get_payroll(payroll_id):
    """급여명세서 상세 조회"""
    try:
        payroll = Payroll.query.get_or_404(payroll_id)
        return jsonify({'payroll': payroll.to_dict()})
        
    except Exception as e:
        current_app.logger.error(f"급여명세서 조회 오류: {str(e)}")
        return jsonify({'error': '급여명세서 조회 중 오류가 발생했습니다.'}), 500

@payroll_bp.route('/payrolls/<int:payroll_id>', methods=['PUT'])
@jwt_required
@admin_required
def update_payroll(payroll_id):
    """급여명세서 수정"""
    try:
        payroll = Payroll.query.get_or_404(payroll_id)
        data = request.get_json()
        
        # 수정 가능한 필드들 업데이트
        updatable_fields = [
            'base_salary', 'position_allowance', 'meal_allowance', 'transport_allowance',
            'overtime_pay', 'night_pay', 'holiday_pay', 'bonus', 'other_allowances',
            'income_tax', 'resident_tax', 'national_pension', 'health_insurance',
            'employment_insurance', 'long_term_care', 'other_deductions',
            'work_days', 'overtime_hours', 'night_hours', 'holiday_hours', 'memo'
        ]
        
        for field in updatable_fields:
            if field in data:
                if field in ['work_days']:
                    setattr(payroll, field, data[field])
                elif field in ['memo']:
                    setattr(payroll, field, data[field])
                else:
                    setattr(payroll, field, Decimal(str(data[field])))
        
        # 총액 재계산
        payroll.calculate_totals()
        payroll.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # 감사 로그
        log_action(
            user_id=get_current_user_id(),
            action_type='UPDATE',
            entity_type='payroll',
            entity_id=payroll.id,
            message=f"급여명세서 수정: {payroll.employee.name} ({payroll.year}-{payroll.month:02d})"
        )
        
        return jsonify({
            'message': '급여명세서가 성공적으로 수정되었습니다.',
            'payroll': payroll.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"급여명세서 수정 오류: {str(e)}")
        return jsonify({'error': '급여명세서 수정 중 오류가 발생했습니다.'}), 500

@payroll_bp.route('/payrolls/<int:payroll_id>', methods=['DELETE'])
@jwt_required
@admin_required
def delete_payroll(payroll_id):
    """급여명세서 삭제"""
    try:
        payroll = Payroll.query.get_or_404(payroll_id)
        employee_name = payroll.employee.name
        year_month = f"{payroll.year}-{payroll.month:02d}"
        
        db.session.delete(payroll)
        db.session.commit()
        
        # 감사 로그
        log_action(
            user_id=get_current_user_id(),
            action_type='DELETE',
            entity_type='payroll',
            entity_id=payroll_id,
            message=f"급여명세서 삭제: {employee_name} ({year_month})"
        )
        
        return jsonify({'message': '급여명세서가 성공적으로 삭제되었습니다.'})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"급여명세서 삭제 오류: {str(e)}")
        return jsonify({'error': '급여명세서 삭제 중 오류가 발생했습니다.'}), 500

@payroll_bp.route('/payrolls/summary', methods=['GET'])
@jwt_required
@admin_required
def get_payroll_summary():
    """급여명세서 요약 정보"""
    try:
        year = request.args.get('year', datetime.now().year, type=int)
        month = request.args.get('month', type=int)
        
        # 기본 쿼리
        query = Payroll.query.filter(Payroll.year == year)
        if month:
            query = query.filter(Payroll.month == month)
        
        payrolls = query.all()
        
        if not payrolls:
            return jsonify({
                'total_employees': 0,
                'total_payment': 0,
                'total_deductions': 0,
                'total_net_pay': 0,
                'average_payment': 0,
                'average_net_pay': 0
            })
        
        total_payment = sum(float(p.total_payment) for p in payrolls)
        total_deductions = sum(float(p.total_deductions) for p in payrolls)
        total_net_pay = sum(float(p.net_pay) for p in payrolls)
        
        return jsonify({
            'total_employees': len(payrolls),
            'total_payment': total_payment,
            'total_deductions': total_deductions,
            'total_net_pay': total_net_pay,
            'average_payment': total_payment / len(payrolls) if payrolls else 0,
            'average_net_pay': total_net_pay / len(payrolls) if payrolls else 0
        })
        
    except Exception as e:
        current_app.logger.error(f"급여명세서 요약 조회 오류: {str(e)}")
        return jsonify({'error': '급여명세서 요약 조회 중 오류가 발생했습니다.'}), 500

