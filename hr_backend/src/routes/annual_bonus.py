"""
연도별 성과급 계산 API 라우트
- 월별 평가 기반 연도별 성과급 계산
- 신규입사자 근무일수 반영
- 예산 관리 및 승인 워크플로우
- 성과급 분배 및 지급 관리
"""

from flask import Blueprint, request, jsonify
from src.models.user import db
import sqlite3
from datetime import datetime, date
import json

annual_bonus_bp = Blueprint('annual_bonus', __name__)

DB_PATH = 'src/database/app.db'

@annual_bonus_bp.route('/api/annual-bonus/calculate/<int:year>', methods=['POST'])
def calculate_annual_bonus(year):
    """연도별 성과급 계산"""
    try:
        data = request.get_json()
        policy_id = data.get('policy_id')
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 성과급 정책 조회
        cursor.execute('''
        SELECT * FROM bonus_policies WHERE id = ? AND is_active = 1
        ''', (policy_id,))
        policy = cursor.fetchone()
        
        if not policy:
            return jsonify({'success': False, 'error': '유효한 성과급 정책을 찾을 수 없습니다.'}), 404
        
        # 예산 정보 조회
        cursor.execute('''
        SELECT total_budget, allocated_budget, used_budget 
        FROM bonus_budgets WHERE year = ?
        ''', (year,))
        budget_info = cursor.fetchone()
        
        if not budget_info:
            return jsonify({'success': False, 'error': f'{year}년 성과급 예산이 설정되지 않았습니다.'}), 404
        
        # 모든 직원 조회
        cursor.execute('''
        SELECT employee_number, name, position, hire_date, department_id
        FROM employees WHERE employee_number != 'EMP001'
        ''')
        employees = cursor.fetchall()
        
        calculations = []
        total_calculated_bonus = 0
        
        for emp in employees:
            employee_id = emp[0]
            employee_name = emp[1]
            hire_date = datetime.strptime(emp[3], '%Y-%m-%d').date() if emp[3] else None
            
            # 월별 평가 조회
            cursor.execute('''
            SELECT month, company_score, team_score, individual_score, total_score
            FROM monthly_evaluations 
            WHERE employee_id = ? AND year = ? AND status = 'completed'
            ORDER BY month
            ''', (employee_id, year))
            
            monthly_scores = cursor.fetchall()
            
            # 평가 제외 월 조회
            cursor.execute('''
            SELECT month FROM evaluation_exclusions 
            WHERE employee_id = ? AND year = ?
            ''', (employee_id, year))
            excluded_months = [row[0] for row in cursor.fetchall()]
            
            # 신규입사자 근무개월 수 계산
            working_months = calculate_working_months_in_year(hire_date, year)
            expected_evaluations = working_months - len(excluded_months)
            
            if len(monthly_scores) == 0 or expected_evaluations <= 0:
                # 평가 데이터가 없거나 근무개월이 없는 경우
                calculation = {
                    'employee_id': employee_id,
                    'employee_name': employee_name,
                    'working_months': working_months,
                    'excluded_months': len(excluded_months),
                    'evaluated_months': 0,
                    'annual_score': 0,
                    'calculated_bonus': 0,
                    'final_bonus': 0,
                    'reason': '평가 데이터 없음 또는 근무개월 부족'
                }
            else:
                # 연도별 평균 점수 계산
                total_company = sum(score[1] for score in monthly_scores)
                total_team = sum(score[2] for score in monthly_scores)
                total_individual = sum(score[3] for score in monthly_scores)
                total_overall = sum(score[4] for score in monthly_scores)
                
                evaluated_months = len(monthly_scores)
                
                avg_company = total_company / evaluated_months
                avg_team = total_team / evaluated_months
                avg_individual = total_individual / evaluated_months
                avg_total = total_overall / evaluated_months
                
                # 성과급 정책 적용 - 정확한 필드 인덱스
                ratio_base = float(policy[4]) / 100 if policy[4] else 0  # ratio_base
                ratio_team = float(policy[5]) / 100 if policy[5] else 0  # ratio_team  
                ratio_personal = float(policy[6]) / 100 if policy[6] else 0  # ratio_personal
                ratio_company = float(policy[7]) / 100 if policy[7] else 0  # ratio_company
                
                # 가중 평균 점수 계산
                weighted_score = (
                    avg_company * ratio_company +
                    avg_team * ratio_team +
                    avg_individual * ratio_personal
                ) + (ratio_base * 100)  # 기본 점수
                
                # 최소 성과 점수 확인 - 정확한 필드 인덱스
                min_score = float(policy[9]) if policy[9] else 0  # min_performance_score
                max_multiplier = float(policy[10]) if policy[10] else 2.0  # max_bonus_multiplier
                if weighted_score < min_score:
                    calculated_bonus = 0
                    reason = f'최소 성과 점수({min_score}) 미달'
                else:
                    # 기본 성과급 계산 (임시로 100만원 기준)
                    base_bonus = 1000000
                    
                    # 성과 배수 적용
                    performance_multiplier = min(weighted_score / 100, max_multiplier)
                    calculated_bonus = base_bonus * performance_multiplier
                    
                    # 신규입사자 근무개월 수 반영
                    if working_months < 12:
                        calculated_bonus = calculated_bonus * (working_months / 12)
                        reason = f'신규입사자 근무개월 수 반영 ({working_months}개월)'
                    else:
                        reason = '정상 계산'
                
                calculation = {
                    'employee_id': employee_id,
                    'employee_name': employee_name,
                    'working_months': working_months,
                    'excluded_months': len(excluded_months),
                    'evaluated_months': evaluated_months,
                    'monthly_scores': {
                        'avg_company': round(avg_company, 1),
                        'avg_team': round(avg_team, 1),
                        'avg_individual': round(avg_individual, 1),
                        'avg_total': round(avg_total, 1)
                    },
                    'weighted_score': round(weighted_score, 1),
                    'annual_score': round(avg_total, 1),
                    'calculated_bonus': round(calculated_bonus),
                    'final_bonus': round(calculated_bonus),
                    'reason': reason
                }
            
            calculations.append(calculation)
            total_calculated_bonus += calculation['final_bonus']
        
        # 예산 대비 계산 결과 확인
        available_budget = budget_info[1] - budget_info[2]  # allocated - used
        budget_ratio = total_calculated_bonus / available_budget if available_budget > 0 else 0
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'year': year,
                'policy_id': policy_id,
                'calculations': calculations,
                'summary': {
                    'total_employees': len(calculations),
                    'total_calculated_bonus': total_calculated_bonus,
                    'available_budget': available_budget,
                    'budget_ratio': round(budget_ratio, 2),
                    'budget_exceeded': total_calculated_bonus > available_budget
                }
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@annual_bonus_bp.route('/api/annual-bonus/save', methods=['POST'])
def save_annual_bonus_calculations():
    """연도별 성과급 계산 결과 저장"""
    try:
        data = request.get_json()
        year = data['year']
        policy_id = data['policy_id']
        calculations = data['calculations']
        approved_by = data.get('approved_by', 'EMP001')
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        for calc in calculations:
            # 월별 점수 JSON 저장
            monthly_scores_json = json.dumps(calc.get('monthly_scores', {}))
            
            cursor.execute('''
            INSERT OR REPLACE INTO annual_bonus_calculations
            (employee_id, year, policy_id, total_annual_score, monthly_scores_json,
             base_salary, calculated_bonus, final_bonus, approval_status, 
             approved_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                calc['employee_id'], year, policy_id, calc['annual_score'],
                monthly_scores_json, 0,  # base_salary는 별도 관리
                calc['calculated_bonus'], calc['final_bonus'], 'approved',
                approved_by, calc['reason']
            ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '성과급 계산 결과가 저장되었습니다.'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@annual_bonus_bp.route('/api/annual-bonus/<int:year>', methods=['GET'])
def get_annual_bonus_calculations(year):
    """연도별 성과급 계산 결과 조회"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT abc.*, e.name, e.position 
        FROM annual_bonus_calculations abc
        JOIN employees e ON abc.employee_id = e.employee_number
        WHERE abc.year = ?
        ORDER BY e.name
        ''', (year,))
        
        rows = cursor.fetchall()
        
        calculations = []
        for row in rows:
            calculation = {
                'id': row[0],
                'employee_id': row[1],
                'employee_name': row[15],
                'position': row[16],
                'year': row[2],
                'policy_id': row[3],
                'total_annual_score': row[4],
                'monthly_scores': json.loads(row[5]) if row[5] else {},
                'base_salary': row[6],
                'calculated_bonus': row[7],
                'final_bonus': row[8],
                'approval_status': row[9],
                'approved_by': row[10],
                'approved_date': row[11],
                'payment_date': row[12],
                'notes': row[13],
                'created_at': row[14]
            }
            calculations.append(calculation)
        
        # 총합 계산
        total_bonus = sum(calc['final_bonus'] for calc in calculations)
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'year': year,
                'calculations': calculations,
                'summary': {
                    'total_employees': len(calculations),
                    'total_bonus': total_bonus
                }
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@annual_bonus_bp.route('/api/bonus-budgets', methods=['GET'])
def get_bonus_budgets():
    """성과급 예산 목록 조회"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT * FROM bonus_budgets ORDER BY year DESC
        ''')
        
        rows = cursor.fetchall()
        
        budgets = []
        for row in rows:
            budget = {
                'id': row[0],
                'year': row[1],
                'total_budget': row[2],
                'allocated_budget': row[3],
                'used_budget': row[4],
                'remaining_budget': row[5],
                'department_allocations': json.loads(row[6]) if row[6] else {},
                'budget_status': row[7],
                'created_by': row[8],
                'approved_by': row[9],
                'approved_date': row[10],
                'notes': row[11],
                'created_at': row[12]
            }
            budgets.append(budget)
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': budgets
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@annual_bonus_bp.route('/api/bonus-budgets', methods=['POST'])
def create_bonus_budget():
    """성과급 예산 생성"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        department_allocations_json = json.dumps(data.get('department_allocations', {}))
        
        cursor.execute('''
        INSERT INTO bonus_budgets
        (year, total_budget, allocated_budget, remaining_budget,
         department_allocations, budget_status, created_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['year'], data['total_budget'], data.get('allocated_budget', data['total_budget']),
            data['total_budget'], department_allocations_json, 'active',
            data.get('created_by', 'EMP001'), data.get('notes', '')
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '성과급 예산이 생성되었습니다.'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def calculate_working_months_in_year(hire_date, year):
    """연도별 총 근무개월 수 계산"""
    if not hire_date:
        return 12
    
    if hire_date.year > year:
        return 0
    
    if hire_date.year < year:
        return 12
    
    # 입사년도와 같은 경우
    return 12 - hire_date.month + 1

