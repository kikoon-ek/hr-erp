from flask import Blueprint, request, jsonify
from src.utils.jwt_helper import jwt_required, get_current_user_id, get_current_user_role, require_admin
from sqlalchemy import and_, or_, desc, func, extract, case
from datetime import datetime, timedelta, date
import calendar

from ..database import db
from ..models.employee import Employee
from ..models.department import Department
from ..models.attendance import AttendanceRecord
from ..models.annual_leave_grant import AnnualLeaveGrant
from ..models.annual_leave_usage import AnnualLeaveUsage
from ..models.annual_leave_request import AnnualLeaveRequest as LeaveRequest
from ..models.evaluation_simple import Evaluation
from ..models.bonus_policy import BonusCalculation, BonusDistribution
from ..models.payroll import Payroll as PayrollRecord
from ..models.audit_log import AuditLog
from ..utils.report_generator import ReportGenerator

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard/overview', methods=['GET'])
@jwt_required
def get_dashboard_overview():
    """대시보드 개요 통계"""
    try:
        print("=== 대시보드 API 디버깅 시작 ===")
        
        current_year = datetime.now().year
        current_month = datetime.now().month
        print(f"현재 연도/월: {current_year}/{current_month}")
        
        # 기본 통계
        print("1. 기본 통계 조회 중...")
        total_employees = Employee.query.count()
        total_departments = Department.query.count()
        print(f"✅ 직원 수: {total_employees}, 부서 수: {total_departments}")
        
        # 이번 달 출근 통계
        print("2. 출근 통계 조회 중...")
        total_records = AttendanceRecord.query.filter(
            extract('year', AttendanceRecord.date) == current_year,
            extract('month', AttendanceRecord.date) == current_month
        ).count()
        print(f"✅ 총 출근 기록: {total_records}")
        
        late_count = AttendanceRecord.query.filter(
            extract('year', AttendanceRecord.date) == current_year,
            extract('month', AttendanceRecord.date) == current_month,
            AttendanceRecord.status == '지각'
        ).count()
        print(f"✅ 지각 수: {late_count}")
        
        absent_count = AttendanceRecord.query.filter(
            extract('year', AttendanceRecord.date) == current_year,
            extract('month', AttendanceRecord.date) == current_month,
            AttendanceRecord.status == '결근'
        ).count()
        print(f"✅ 결근 수: {absent_count}")
        
        avg_work_hours_result = db.session.query(
            func.avg(AttendanceRecord.work_hours)
        ).filter(
            extract('year', AttendanceRecord.date) == current_year,
            extract('month', AttendanceRecord.date) == current_month
        ).scalar() or 0
        print(f"✅ 평균 근무시간: {avg_work_hours_result}")
        
        # 연차 사용 통계
        print("3. 연차 통계 조회 중...")
        annual_leave_stats = db.session.query(
            func.sum(AnnualLeaveUsage.used_days).label('total_used'),
            func.count(AnnualLeaveUsage.id).label('usage_count')
        ).filter(
            extract('year', AnnualLeaveUsage.usage_date) == current_year
        ).first()
        print(f"✅ 연차 통계: {annual_leave_stats}")
        
        # 평가 진행 상황 - SQLAlchemy 인스턴스 문제 해결 후 재활성화
        print("4. 평가 통계 조회 중...")
        total_evaluations = Evaluation.query.filter(
            extract('year', Evaluation.created_at) == current_year
        ).count()
        print(f"✅ 총 평가 수: {total_evaluations}")
        
        completed_evaluations = Evaluation.query.filter(
            extract('year', Evaluation.created_at) == current_year,
            Evaluation.status == 'completed'
        ).count()
        print(f"✅ 완료된 평가 수: {completed_evaluations}")
        
        # 평균 점수는 0으로 설정 (추후 구현)
        avg_score_result = 0
        print(f"✅ 평균 점수: {avg_score_result}")
        
        # 급여 통계 (이번 달)
        print("5. 급여 통계 조회 중...")
        payroll_stats = db.session.query(
            func.count(PayrollRecord.id).label('total_payrolls'),
            func.sum(PayrollRecord.base_salary).label('total_gross_pay'),
            func.sum(PayrollRecord.net_pay).label('total_net_pay'),
            func.avg(PayrollRecord.net_pay).label('avg_net_pay')
        ).filter(
            PayrollRecord.year == current_year,
            PayrollRecord.month == current_month
        ).first()
        print(f"✅ 급여 통계: {payroll_stats}")
        
        print("6. 응답 데이터 구성 중...")
        response_data = {
            'overview': {
                'total_employees': total_employees,
                'total_departments': total_departments,
                'current_period': f"{current_year}년 {current_month}월"
            },
            'attendance': {
                'total_records': total_records,
                'avg_work_hours': float(avg_work_hours_result),
                'late_count': late_count,
                'absent_count': absent_count,
                'attendance_rate': round((1 - (absent_count / max(total_records, 1))) * 100, 1)
            },
            'annual_leave': {
                'total_used': float(annual_leave_stats.total_used or 0),
                'usage_count': annual_leave_stats.usage_count or 0,
                'avg_per_employee': round(float(annual_leave_stats.total_used or 0) / max(total_employees, 1), 1)
            },
            'evaluation': {
                'total_evaluations': total_evaluations,
                'completed_evaluations': completed_evaluations,
                'completion_rate': round((completed_evaluations / max(total_evaluations, 1)) * 100, 1),
                'avg_score': round(float(avg_score_result), 1)
            },
            'payroll': {
                'total_payrolls': payroll_stats.total_payrolls or 0,
                'total_gross_pay': float(payroll_stats.total_gross_pay or 0),
                'total_net_pay': float(payroll_stats.total_net_pay or 0),
                'avg_net_pay': float(payroll_stats.avg_net_pay or 0)
            }
        }
        
        print("✅ 응답 데이터 구성 완료")
        print("=== 대시보드 API 디버깅 완료 ===")
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ 대시보드 API 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'대시보드 개요를 불러오는데 실패했습니다: {str(e)}'}), 500

@dashboard_bp.route('/dashboard/charts/attendance-trend', methods=['GET'])
@jwt_required

def get_attendance_trend():
    """출근 트렌드 차트 데이터"""
    try:
        # 최근 12개월 데이터
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        
        # 월별 출근 통계
        monthly_stats = db.session.query(
            extract('year', AttendanceRecord.date).label('year'),
            extract('month', AttendanceRecord.date).label('month'),
            func.count(AttendanceRecord.id).label('total_records'),
            func.count().filter(AttendanceRecord.status == '출근').label('on_time'),
            func.count().filter(AttendanceRecord.status == '지각').label('late'),
            func.count().filter(AttendanceRecord.status == '결근').label('absent'),
            func.avg(AttendanceRecord.work_hours).label('avg_hours')
        ).filter(
            AttendanceRecord.date >= start_date.date(),
            AttendanceRecord.date <= end_date.date()
        ).group_by(
            extract('year', AttendanceRecord.date),
            extract('month', AttendanceRecord.date)
        ).order_by(
            extract('year', AttendanceRecord.date),
            extract('month', AttendanceRecord.date)
        ).all()
        
        chart_data = []
        for stat in monthly_stats:
            chart_data.append({
                'period': f"{int(stat.year)}년 {int(stat.month)}월",
                'year': int(stat.year),
                'month': int(stat.month),
                'total_records': stat.total_records,
                'on_time': stat.on_time,
                'late': stat.late,
                'absent': stat.absent,
                'avg_hours': round(float(stat.avg_hours or 0), 1),
                'attendance_rate': round((stat.on_time + stat.late) / max(stat.total_records, 1) * 100, 1)
            })
        
        return jsonify({
            'chart_data': chart_data,
            'summary': {
                'total_months': len(chart_data),
                'avg_attendance_rate': round(sum(item['attendance_rate'] for item in chart_data) / max(len(chart_data), 1), 1),
                'avg_work_hours': round(sum(item['avg_hours'] for item in chart_data) / max(len(chart_data), 1), 1)
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'출근 트렌드 데이터를 불러오는데 실패했습니다: {str(e)}'}), 500

@dashboard_bp.route('/dashboard/charts/department-stats', methods=['GET'])
@jwt_required

def get_department_stats():
    """부서별 통계 차트 데이터"""
    try:
        # 부서별 직원 수
        dept_employee_stats = db.session.query(
            Department.name.label('dept_name'),
            func.count(Employee.id).label('employee_count')
        ).outerjoin(Employee).group_by(Department.id, Department.name).all()
        
        # 부서별 평균 급여 (이번 달)
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        dept_salary_stats = db.session.query(
            Department.name.label('dept_name'),
            func.avg(PayrollRecord.net_pay).label('avg_salary'),
            func.sum(PayrollRecord.net_pay).label('total_salary')
        ).join(Employee).join(PayrollRecord).filter(
            PayrollRecord.year == current_year,
            PayrollRecord.month == current_month
        ).group_by(Department.id, Department.name).all()
        
        # 부서별 연차 사용률
        dept_leave_stats = db.session.query(
            Department.name.label('dept_name'),
            func.sum(AnnualLeaveUsage.used_days).label('total_used_days'),
            func.count(Employee.id).label('employee_count')
        ).join(Employee).outerjoin(AnnualLeaveUsage).filter(
            extract('year', AnnualLeaveUsage.usage_date) == current_year
        ).group_by(Department.id, Department.name).all()
        
        # 데이터 통합
        dept_data = {}
        
        # 직원 수 데이터
        for stat in dept_employee_stats:
            dept_data[stat.dept_name] = {
                'name': stat.dept_name,
                'employee_count': stat.employee_count,
                'avg_salary': 0,
                'total_salary': 0,
                'avg_leave_days': 0
            }
        
        # 급여 데이터 추가
        for stat in dept_salary_stats:
            if stat.dept_name in dept_data:
                dept_data[stat.dept_name]['avg_salary'] = float(stat.avg_salary or 0)
                dept_data[stat.dept_name]['total_salary'] = float(stat.total_salary or 0)
        
        # 연차 데이터 추가
        for stat in dept_leave_stats:
            if stat.dept_name in dept_data:
                dept_data[stat.dept_name]['avg_leave_days'] = round(
                    float(stat.total_used_days or 0) / max(stat.employee_count or 1, 1), 1
                )
        
        return jsonify({
            'department_stats': list(dept_data.values()),
            'summary': {
                'total_departments': len(dept_data),
                'total_employees': sum(dept['employee_count'] for dept in dept_data.values()),
                'avg_dept_size': round(sum(dept['employee_count'] for dept in dept_data.values()) / max(len(dept_data), 1), 1)
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'부서별 통계를 불러오는데 실패했습니다: {str(e)}'}), 500

@dashboard_bp.route('/dashboard/charts/payroll-trend', methods=['GET'])
@jwt_required

def get_payroll_trend():
    """급여 트렌드 차트 데이터"""
    try:
        # 최근 12개월 급여 통계
        end_date = datetime.now()
        start_year = end_date.year - 1 if end_date.month <= 12 else end_date.year
        
        monthly_payroll = db.session.query(
            PayrollRecord.year,
            PayrollRecord.month,
            func.count(PayrollRecord.id).label('payroll_count'),
            func.sum(PayrollRecord.gross_pay).label('total_gross'),
            func.sum(PayrollRecord.net_pay).label('total_net'),
            func.avg(PayrollRecord.net_pay).label('avg_net'),
            func.sum(PayrollRecord.total_deductions).label('total_deductions')
        ).filter(
            or_(
                PayrollRecord.year > start_year,
                and_(PayrollRecord.year == start_year, PayrollRecord.month >= end_date.month)
            )
        ).group_by(
            PayrollRecord.year,
            PayrollRecord.month
        ).order_by(
            PayrollRecord.year,
            PayrollRecord.month
        ).all()
        
        chart_data = []
        for stat in monthly_payroll:
            chart_data.append({
                'period': f"{stat.year}년 {stat.month}월",
                'year': stat.year,
                'month': stat.month,
                'payroll_count': stat.payroll_count,
                'total_gross': float(stat.total_gross),
                'total_net': float(stat.total_net),
                'avg_net': float(stat.avg_net),
                'total_deductions': float(stat.total_deductions),
                'deduction_rate': round(float(stat.total_deductions) / max(float(stat.total_gross), 1) * 100, 1)
            })
        
        return jsonify({
            'chart_data': chart_data,
            'summary': {
                'total_months': len(chart_data),
                'avg_monthly_gross': round(sum(item['total_gross'] for item in chart_data) / max(len(chart_data), 1), 0),
                'avg_monthly_net': round(sum(item['total_net'] for item in chart_data) / max(len(chart_data), 1), 0),
                'avg_deduction_rate': round(sum(item['deduction_rate'] for item in chart_data) / max(len(chart_data), 1), 1)
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'급여 트렌드 데이터를 불러오는데 실패했습니다: {str(e)}'}), 500

@dashboard_bp.route('/dashboard/reports/summary', methods=['GET'])
@jwt_required

def get_summary_report():
    """종합 리포트 데이터"""
    try:
        year = request.args.get('year', datetime.now().year, type=int)
        month = request.args.get('month', datetime.now().month, type=int)
        
        # 기간 설정
        if month:
            # 특정 월 데이터
            period_filter = and_(
                extract('year', PayrollRecord.created_at) == year,
                extract('month', PayrollRecord.created_at) == month
            )
            period_name = f"{year}년 {month}월"
        else:
            # 연간 데이터
            period_filter = extract('year', PayrollRecord.created_at) == year
            period_name = f"{year}년"
        
        # 직원 현황
        employee_summary = {
            'total_employees': Employee.query.count(),
            'active_employees': Employee.query.filter_by(status='active').count(),
            'departments': Department.query.count()
        }
        
        # 출근 현황
        attendance_summary = db.session.query(
            func.count(AttendanceRecord.id).label('total_days'),
            func.avg(AttendanceRecord.work_hours).label('avg_hours'),
            func.count().filter(AttendanceRecord.status == '지각').label('late_days'),
            func.count().filter(AttendanceRecord.status == '결근').label('absent_days')
        ).filter(period_filter.replace(PayrollRecord.created_at, AttendanceRecord.date)).first()
        
        # 급여 현황
        payroll_summary = db.session.query(
            func.count(PayrollRecord.id).label('total_payrolls'),
            func.sum(PayrollRecord.gross_pay).label('total_gross'),
            func.sum(PayrollRecord.net_pay).label('total_net'),
            func.sum(PayrollRecord.total_deductions).label('total_deductions')
        ).filter(period_filter).first()
        
        # 평가 현황
        evaluation_summary = db.session.query(
            func.count(Evaluation.id).label('total_evaluations'),
            func.count().filter(Evaluation.status == 'completed').label('completed'),
            func.avg(func.case((Evaluation.status == 'completed', Evaluation.total_score), else_=None)).label('avg_score')
        ).filter(period_filter.replace(PayrollRecord.created_at, Evaluation.created_at)).first()
        
        # 성과급 현황
        bonus_summary = db.session.query(
            func.count(BonusCalculation.id).label('total_calculations'),
            func.sum(BonusCalculation.total_amount).label('total_amount')
        ).filter(period_filter.replace(PayrollRecord.created_at, BonusCalculation.created_at)).first()
        
        return jsonify({
            'period': period_name,
            'employee': {
                'total_employees': employee_summary['total_employees'],
                'active_employees': employee_summary['active_employees'],
                'departments': employee_summary['departments']
            },
            'attendance': {
                'total_days': attendance_summary.total_days or 0,
                'avg_hours': round(float(attendance_summary.avg_hours or 0), 1),
                'late_days': attendance_summary.late_days or 0,
                'absent_days': attendance_summary.absent_days or 0,
                'attendance_rate': round((1 - (attendance_summary.absent_days or 0) / max(attendance_summary.total_days or 1, 1)) * 100, 1)
            },
            'payroll': {
                'total_payrolls': payroll_summary.total_payrolls or 0,
                'total_gross': float(payroll_summary.total_gross or 0),
                'total_net': float(payroll_summary.total_net or 0),
                'total_deductions': float(payroll_summary.total_deductions or 0),
                'avg_net': round(float(payroll_summary.total_net or 0) / max(payroll_summary.total_payrolls or 1, 1), 0)
            },
            'evaluation': {
                'total_evaluations': evaluation_summary.total_evaluations or 0,
                'completed': evaluation_summary.completed or 0,
                'completion_rate': round((evaluation_summary.completed or 0) / max(evaluation_summary.total_evaluations or 1, 1) * 100, 1),
                'avg_score': round(float(evaluation_summary.avg_score or 0), 1)
            },
            'bonus': {
                'total_calculations': bonus_summary.total_calculations or 0,
                'total_amount': float(bonus_summary.total_amount or 0)
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'종합 리포트를 불러오는데 실패했습니다: {str(e)}'}), 500



@dashboard_bp.route('/dashboard/reports/download', methods=['POST'])
@jwt_required

def download_report():
    """리포트 다운로드"""
    try:
        data = request.get_json()
        report_type = data.get('report_type', 'summary')  # summary, attendance, payroll, evaluation
        format_type = data.get('format', 'csv')  # csv, pdf
        year = data.get('year', datetime.now().year)
        month = data.get('month', datetime.now().month)
        
        # 기간 설정
        if month and month > 0:
            period_name = f"{year}년 {month}월"
            period_filter = and_(
                extract('year', PayrollRecord.created_at) == year,
                extract('month', PayrollRecord.created_at) == month
            )
        else:
            period_name = f"{year}년"
            period_filter = extract('year', PayrollRecord.created_at) == year
        
        # 리포트 데이터 수집
        if report_type == 'summary':
            report_data = get_summary_report_data(period_filter, period_name)
        else:
            # 다른 리포트 타입들은 향후 확장
            report_data = {}
        
        # 리포트 생성
        generator = ReportGenerator()
        
        if format_type == 'csv':
            content = generator.generate_csv_report(report_data, report_type, period_name)
            filename = f"hr_report_{report_type}_{year}"
            if month and month > 0:
                filename += f"_{month:02d}"
            filename += ".csv"
            
            from flask import make_response
            response = make_response(content)
            response.headers['Content-Type'] = 'text/csv; charset=utf-8'
            response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        elif format_type == 'pdf':
            buffer = generator.generate_pdf_report(report_data, report_type, period_name)
            filename = f"hr_report_{report_type}_{year}"
            if month and month > 0:
                filename += f"_{month:02d}"
            filename += ".pdf"
            
            from flask import make_response
            response = make_response(buffer.getvalue())
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        
        else:
            return jsonify({'error': '지원하지 않는 파일 형식입니다.'}), 400
            
    except Exception as e:
        return jsonify({'error': f'리포트 다운로드에 실패했습니다: {str(e)}'}), 500

def get_summary_report_data(period_filter, period_name):
    """종합 리포트 데이터 수집"""
    # 직원 현황
    employee_summary = {
        'total_employees': Employee.query.count(),
        'active_employees': Employee.query.filter_by(status='active').count(),
        'departments': Department.query.count()
    }
    
    # 출근 현황
    attendance_summary = db.session.query(
        func.count(AttendanceRecord.id).label('total_days'),
        func.avg(AttendanceRecord.work_hours).label('avg_hours'),
        func.count().filter(AttendanceRecord.status == '지각').label('late_days'),
        func.count().filter(AttendanceRecord.status == '결근').label('absent_days')
    ).filter(period_filter.replace(PayrollRecord.created_at, AttendanceRecord.date)).first()
    
    # 급여 현황
    payroll_summary = db.session.query(
        func.count(PayrollRecord.id).label('total_payrolls'),
        func.sum(PayrollRecord.gross_pay).label('total_gross'),
        func.sum(PayrollRecord.net_pay).label('total_net'),
        func.sum(PayrollRecord.total_deductions).label('total_deductions')
    ).filter(period_filter).first()
    
    # 평가 현황
    evaluation_summary = db.session.query(
        func.count(Evaluation.id).label('total_evaluations'),
        func.count().filter(Evaluation.status == 'completed').label('completed'),
        func.avg(func.case((Evaluation.status == 'completed', Evaluation.total_score), else_=None)).label('avg_score')
    ).filter(period_filter.replace(PayrollRecord.created_at, Evaluation.created_at)).first()
    
    return {
        'period': period_name,
        'employee': {
            'total_employees': employee_summary['total_employees'],
            'active_employees': employee_summary['active_employees'],
            'departments': employee_summary['departments']
        },
        'attendance': {
            'total_days': attendance_summary.total_days or 0,
            'avg_hours': round(float(attendance_summary.avg_hours or 0), 1),
            'late_days': attendance_summary.late_days or 0,
            'absent_days': attendance_summary.absent_days or 0,
            'attendance_rate': round((1 - (attendance_summary.absent_days or 0) / max(attendance_summary.total_days or 1, 1)) * 100, 1)
        },
        'payroll': {
            'total_payrolls': payroll_summary.total_payrolls or 0,
            'total_gross': float(payroll_summary.total_gross or 0),
            'total_net': float(payroll_summary.total_net or 0),
            'total_deductions': float(payroll_summary.total_deductions or 0),
            'avg_net': round(float(payroll_summary.total_net or 0) / max(payroll_summary.total_payrolls or 1, 1), 0)
        },
        'evaluation': {
            'total_evaluations': evaluation_summary.total_evaluations or 0,
            'completed': evaluation_summary.completed or 0,
            'completion_rate': round((evaluation_summary.completed or 0) / max(evaluation_summary.total_evaluations or 1, 1) * 100, 1),
            'avg_score': round(float(evaluation_summary.avg_score or 0), 1)
        }
    }

