"""
월별 평가 관리 API 라우트
- 월별 평가 조회/생성/수정
- 직원별 연도별 평가 현황
- 평가 제외 관리
- 신규입사자 근무일수 반영
"""

from flask import Blueprint, request, jsonify
from src.models.user import db
import sqlite3
from datetime import datetime, date
import json
import calendar

monthly_evaluation_bp = Blueprint('monthly_evaluation', __name__)

DB_PATH = 'src/database/app.db'

@monthly_evaluation_bp.route('/api/monthly-evaluations', methods=['GET'])
def get_monthly_evaluations():
    """월별 평가 목록 조회"""
    try:
        year = request.args.get('year', datetime.now().year, type=int)
        month = request.args.get('month', type=int)
        employee_id = request.args.get('employee_id')
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 기본 쿼리
        query = '''
        SELECT me.id, me.employee_id, me.year, me.month, me.company_score, 
               me.team_score, me.individual_score, me.total_score, me.evaluator_id,
               me.evaluation_date, me.comments, me.status, me.created_at,
               e.name, e.position, e.hire_date
        FROM monthly_evaluations me
        JOIN employees e ON me.employee_id = e.employee_number
        WHERE me.year = ?
        '''
        params = [year]
        
        # 조건 추가
        if month:
            query += ' AND me.month = ?'
            params.append(month)
        
        if employee_id:
            query += ' AND me.employee_id = ?'
            params.append(employee_id)
        
        query += ' ORDER BY me.month DESC, e.name'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        evaluations = []
        for row in rows:
            # 신규입사자 근무일수 계산 - hire_date 안전 처리
            hire_date_str = row[15] if row[15] else None  # e.hire_date
            hire_date = None
            if hire_date_str:
                try:
                    hire_date = datetime.strptime(hire_date_str, '%Y-%m-%d').date()
                except ValueError:
                    # 날짜 형식이 다른 경우 처리
                    hire_date = None
            
            working_months = calculate_working_months(hire_date, year, row[3])  # month
            
            evaluation = {
                'id': row[0],
                'employee_id': row[1],
                'employee_name': row[13],  # e.name
                'position': row[14],       # e.position
                'hire_date': row[15],      # e.hire_date
                'year': row[2],
                'month': row[3],
                'company_score': row[4],
                'team_score': row[5],
                'individual_score': row[6],
                'total_score': row[7],
                'evaluator_id': row[8],
                'evaluation_date': row[9],
                'comments': row[10],
                'status': row[11],
                'working_months': working_months,
                'is_new_employee': working_months < 12,
                'created_at': row[12]
            }
            evaluations.append(evaluation)
        
        conn.close()
        return jsonify({
            'success': True,
            'data': evaluations,
            'total': len(evaluations)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@monthly_evaluation_bp.route('/api/monthly-evaluations', methods=['POST'])
def create_monthly_evaluation():
    """월별 평가 생성"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 평가 제외 여부 확인
        cursor.execute('''
        SELECT id FROM evaluation_exclusions 
        WHERE employee_id = ? AND year = ? AND month = ?
        ''', (data['employee_id'], data['year'], data['month']))
        
        if cursor.fetchone():
            return jsonify({
                'success': False, 
                'error': '해당 직원은 이 월에 평가 제외 대상입니다.'
            }), 400
        
        # 월별 평가 생성
        cursor.execute('''
        INSERT INTO monthly_evaluations 
        (employee_id, year, month, company_score, team_score, individual_score, 
         total_score, evaluator_id, evaluation_date, comments, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['employee_id'], data['year'], data['month'],
            data['company_score'], data['team_score'], data['individual_score'],
            data['total_score'], data['evaluator_id'], 
            data.get('evaluation_date', datetime.now().date().isoformat()),
            data.get('comments', ''), data.get('status', 'draft')
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '월별 평가가 생성되었습니다.'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@monthly_evaluation_bp.route('/api/monthly-evaluations/<int:evaluation_id>', methods=['PUT'])
def update_monthly_evaluation(evaluation_id):
    """월별 평가 수정"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        UPDATE monthly_evaluations 
        SET company_score = ?, team_score = ?, individual_score = ?, 
            total_score = ?, comments = ?, status = ?, updated_at = ?
        WHERE id = ?
        ''', (
            data['company_score'], data['team_score'], data['individual_score'],
            data['total_score'], data.get('comments', ''), 
            data.get('status', 'draft'), datetime.now().isoformat(),
            evaluation_id
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '월별 평가가 수정되었습니다.'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@monthly_evaluation_bp.route('/api/annual-evaluation-summary/<employee_id>/<int:year>', methods=['GET'])
def get_annual_evaluation_summary(employee_id, year):
    """직원별 연도별 평가 요약"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 직원 정보 조회
        cursor.execute('''
        SELECT name, position, hire_date, department_id 
        FROM employees WHERE employee_number = ?
        ''', (employee_id,))
        employee = cursor.fetchone()
        
        if not employee:
            return jsonify({'success': False, 'error': '직원을 찾을 수 없습니다.'}), 404
        
        # 월별 평가 조회
        cursor.execute('''
        SELECT month, company_score, team_score, individual_score, total_score, status
        FROM monthly_evaluations 
        WHERE employee_id = ? AND year = ?
        ORDER BY month
        ''', (employee_id, year))
        
        monthly_scores = cursor.fetchall()
        
        # 평가 제외 월 조회
        cursor.execute('''
        SELECT month, exclusion_reason 
        FROM evaluation_exclusions 
        WHERE employee_id = ? AND year = ?
        ''', (employee_id, year))
        
        exclusions = {row[0]: row[1] for row in cursor.fetchall()}
        
        # 신규입사자 근무개월 수 계산
        hire_date = datetime.strptime(employee[2], '%Y-%m-%d').date() if employee[2] else None
        total_working_months = calculate_working_months_in_year(hire_date, year)
        
        # 통계 계산
        completed_evaluations = [score for score in monthly_scores if score[5] == 'completed']
        
        if completed_evaluations:
            avg_company = sum(score[1] for score in completed_evaluations) / len(completed_evaluations)
            avg_team = sum(score[2] for score in completed_evaluations) / len(completed_evaluations)
            avg_individual = sum(score[3] for score in completed_evaluations) / len(completed_evaluations)
            avg_total = sum(score[4] for score in completed_evaluations) / len(completed_evaluations)
        else:
            avg_company = avg_team = avg_individual = avg_total = 0
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'employee': {
                    'id': employee_id,
                    'name': employee[0],
                    'position': employee[1],
                    'hire_date': employee[2],
                    'department_id': employee[3]
                },
                'year': year,
                'total_working_months': total_working_months,
                'is_new_employee': total_working_months < 12,
                'monthly_scores': [
                    {
                        'month': score[0],
                        'company_score': score[1],
                        'team_score': score[2],
                        'individual_score': score[3],
                        'total_score': score[4],
                        'status': score[5]
                    } for score in monthly_scores
                ],
                'exclusions': exclusions,
                'summary': {
                    'completed_months': len(completed_evaluations),
                    'excluded_months': len(exclusions),
                    'avg_company_score': round(avg_company, 1),
                    'avg_team_score': round(avg_team, 1),
                    'avg_individual_score': round(avg_individual, 1),
                    'avg_total_score': round(avg_total, 1)
                }
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@monthly_evaluation_bp.route('/api/evaluation-exclusions', methods=['POST'])
def create_evaluation_exclusion():
    """평가 제외 등록"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT OR REPLACE INTO evaluation_exclusions 
        (employee_id, year, month, exclusion_reason, status_type, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['employee_id'], data['year'], data['month'],
            data['exclusion_reason'], data.get('status_type', ''),
            data.get('notes', ''), data['created_by']
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '평가 제외가 등록되었습니다.'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def calculate_working_months(hire_date, year, month):
    """신규입사자 근무개월 수 계산 - 수정된 로직"""
    if not hire_date:
        return 12
    
    # 입사일이 해당 연도 이후라면
    if hire_date.year > year:
        return 0
    
    # 입사일이 해당 연도 이전이라면 (기존 직원)
    if hire_date.year < year:
        return month  # 해당 월까지의 개월 수
    
    # 입사일이 해당 연도라면 (신규입사자)
    if hire_date.year == year:
        if hire_date.month > month:
            return 0  # 아직 입사하지 않음
        return month - hire_date.month + 1  # 입사월부터 해당월까지
    
    return month

def calculate_working_months_in_year(hire_date, year):
    """연도별 총 근무개월 수 계산 - 수정된 로직"""
    if not hire_date:
        return 12
    
    # 입사일이 해당 연도 이후라면
    if hire_date.year > year:
        return 0
    
    # 입사일이 해당 연도 이전이라면 (기존 직원)
    if hire_date.year < year:
        return 12  # 전체 12개월 근무
    
    # 입사일이 해당 연도라면 (신규입사자)
    if hire_date.year == year:
        return 12 - hire_date.month + 1  # 입사월부터 12월까지
    
    return 12

