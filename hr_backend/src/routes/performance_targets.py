#!/usr/bin/env python3
"""
성과 기준 관리 API 라우트
"""
from flask import Blueprint, request, jsonify
import sqlite3
from datetime import datetime
import json

performance_targets_bp = Blueprint('performance_targets', __name__)

DB_PATH = 'src/database/app.db'

# ==================== 성과 지표 카테고리 관리 ====================

@performance_targets_bp.route('/api/target-categories', methods=['GET'])
def get_target_categories():
    """성과 지표 카테고리 목록 조회"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT id, name, description, unit, target_type, is_active, created_at
        FROM target_categories
        WHERE is_active = 1
        ORDER BY name
        ''')
        
        categories = []
        for row in cursor.fetchall():
            categories.append({
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'unit': row[3],
                'target_type': row[4],
                'is_active': bool(row[5]),
                'created_at': row[6]
            })
        
        conn.close()
        return jsonify({'success': True, 'data': categories})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/target-categories', methods=['POST'])
def create_target_category():
    """성과 지표 카테고리 생성"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO target_categories (name, description, unit, target_type)
        VALUES (?, ?, ?, ?)
        ''', (data['name'], data.get('description'), data.get('unit'), data['target_type']))
        
        category_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'data': {'id': category_id}})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/target-categories/<int:category_id>', methods=['PUT'])
def update_target_category(category_id):
    """성과 지표 카테고리 수정"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        UPDATE target_categories 
        SET name = ?, description = ?, unit = ?, target_type = ?
        WHERE id = ?
        ''', (data['name'], data.get('description'), data.get('unit'), data['target_type'], category_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/target-categories/<int:category_id>', methods=['DELETE'])
def delete_target_category(category_id):
    """성과 지표 카테고리 삭제 (비활성화)"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        UPDATE target_categories 
        SET is_active = 0
        WHERE id = ?
        ''', (category_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== 회사 성과 목표 관리 ====================

@performance_targets_bp.route('/api/company-targets', methods=['GET'])
def get_company_targets():
    """회사 성과 목표 목록 조회"""
    try:
        year = request.args.get('year', datetime.now().year)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT ct.id, ct.year, ct.month, ct.category_id, tc.name as category_name, 
               tc.unit, ct.target_value, ct.description, ct.weight, ct.is_active
        FROM company_targets ct
        JOIN target_categories tc ON ct.category_id = tc.id
        WHERE ct.year = ? AND ct.is_active = 1
        ORDER BY ct.weight DESC
        ''', (year,))
        
        targets = []
        for row in cursor.fetchall():
            targets.append({
                'id': row[0],
                'year': row[1],
                'month': row[2],
                'category_id': row[3],
                'category_name': row[4],
                'unit': row[5],
                'target_value': float(row[6]),
                'description': row[7],
                'weight': float(row[8]),
                'is_active': bool(row[9])
            })
        
        conn.close()
        return jsonify({'success': True, 'data': targets})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/company-targets', methods=['POST'])
def create_company_target():
    """회사 성과 목표 생성"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO company_targets (year, month, category_id, target_value, description, weight)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (data['year'], data.get('month'), data['category_id'], 
              data['target_value'], data.get('description'), data.get('weight', 100.0)))
        
        target_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'data': {'id': target_id}})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/company-targets/<int:target_id>', methods=['PUT'])
def update_company_target(target_id):
    """회사 성과 목표 수정"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        UPDATE company_targets 
        SET year = ?, month = ?, category_id = ?, target_value = ?, 
            description = ?, weight = ?
        WHERE id = ?
        ''', (data['year'], data.get('month'), data['category_id'], 
              data['target_value'], data.get('description'), 
              data.get('weight', 100.0), target_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/company-targets/<int:target_id>', methods=['DELETE'])
def delete_company_target(target_id):
    """회사 성과 목표 삭제"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        UPDATE company_targets 
        SET is_active = 0
        WHERE id = ?
        ''', (target_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== 부서별 성과 목표 관리 ====================

@performance_targets_bp.route('/api/department-targets', methods=['GET'])
def get_department_targets():
    """부서별 성과 목표 목록 조회"""
    try:
        year = request.args.get('year', datetime.now().year)
        department_id = request.args.get('department_id')
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = '''
        SELECT dt.id, dt.year, dt.month, dt.department_id, d.name as department_name,
               dt.category_id, tc.name as category_name, tc.unit, dt.target_value, 
               dt.description, dt.weight, dt.is_active
        FROM department_targets dt
        JOIN departments d ON dt.department_id = d.id
        JOIN target_categories tc ON dt.category_id = tc.id
        WHERE dt.year = ? AND dt.is_active = 1
        '''
        params = [year]
        
        if department_id:
            query += ' AND dt.department_id = ?'
            params.append(department_id)
            
        query += ' ORDER BY d.name, dt.weight DESC'
        
        cursor.execute(query, params)
        
        targets = []
        for row in cursor.fetchall():
            targets.append({
                'id': row[0],
                'year': row[1],
                'month': row[2],
                'department_id': row[3],
                'department_name': row[4],
                'category_id': row[5],
                'category_name': row[6],
                'unit': row[7],
                'target_value': float(row[8]),
                'description': row[9],
                'weight': float(row[10]),
                'is_active': bool(row[11])
            })
        
        conn.close()
        return jsonify({'success': True, 'data': targets})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/department-targets', methods=['POST'])
def create_department_target():
    """부서별 성과 목표 생성"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO department_targets (year, month, department_id, category_id, 
                                      target_value, description, weight)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (data['year'], data.get('month'), data['department_id'], 
              data['category_id'], data['target_value'], 
              data.get('description'), data.get('weight', 100.0)))
        
        target_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'data': {'id': target_id}})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/department-targets/<int:target_id>', methods=['PUT'])
def update_department_target(target_id):
    """부서별 성과 목표 수정"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        UPDATE department_targets 
        SET year = ?, month = ?, department_id = ?, category_id = ?, 
            target_value = ?, description = ?, weight = ?
        WHERE id = ?
        ''', (data['year'], data.get('month'), data['department_id'], 
              data['category_id'], data['target_value'], 
              data.get('description'), data.get('weight', 100.0), target_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/department-targets/<int:target_id>', methods=['DELETE'])
def delete_department_target(target_id):
    """부서별 성과 목표 삭제"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        UPDATE department_targets 
        SET is_active = 0
        WHERE id = ?
        ''', (target_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== 개인별 성과 목표 관리 ====================

@performance_targets_bp.route('/api/employee-targets', methods=['GET'])
def get_employee_targets():
    """개인별 성과 목표 목록 조회"""
    try:
        year = request.args.get('year', datetime.now().year)
        employee_id = request.args.get('employee_id')
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = '''
        SELECT et.id, et.year, et.month, et.employee_id, e.name as employee_name,
               et.category_id, tc.name as category_name, tc.unit, et.target_value, 
               et.description, et.weight, et.is_active
        FROM employee_targets et
        JOIN employees e ON et.employee_id = e.employee_number
        JOIN target_categories tc ON et.category_id = tc.id
        WHERE et.year = ? AND et.is_active = 1
        '''
        params = [year]
        
        if employee_id:
            query += ' AND et.employee_id = ?'
            params.append(employee_id)
            
        query += ' ORDER BY e.name, et.weight DESC'
        
        cursor.execute(query, params)
        
        targets = []
        for row in cursor.fetchall():
            targets.append({
                'id': row[0],
                'year': row[1],
                'month': row[2],
                'employee_id': row[3],
                'employee_name': row[4],
                'category_id': row[5],
                'category_name': row[6],
                'unit': row[7],
                'target_value': float(row[8]),
                'description': row[9],
                'weight': float(row[10]),
                'is_active': bool(row[11])
            })
        
        conn.close()
        return jsonify({'success': True, 'data': targets})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/employee-targets', methods=['POST'])
def create_employee_target():
    """개인별 성과 목표 생성"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO employee_targets (year, month, employee_id, category_id, 
                                    target_value, description, weight)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (data['year'], data.get('month'), data['employee_id'], 
              data['category_id'], data['target_value'], 
              data.get('description'), data.get('weight', 100.0)))
        
        target_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'data': {'id': target_id}})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/employee-targets/<int:target_id>', methods=['PUT'])
def update_employee_target(target_id):
    """개인별 성과 목표 수정"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        UPDATE employee_targets 
        SET year = ?, month = ?, employee_id = ?, category_id = ?, 
            target_value = ?, description = ?, weight = ?
        WHERE id = ?
        ''', (data['year'], data.get('month'), data['employee_id'], 
              data['category_id'], data['target_value'], 
              data.get('description'), data.get('weight', 100.0), target_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/employee-targets/<int:target_id>', methods=['DELETE'])
def delete_employee_target(target_id):
    """개인별 성과 목표 삭제"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        UPDATE employee_targets 
        SET is_active = 0
        WHERE id = ?
        ''', (target_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== 실적 입력 관리 ====================

@performance_targets_bp.route('/api/target-achievements', methods=['GET'])
def get_target_achievements():
    """실적 입력 목록 조회"""
    try:
        year = request.args.get('year', datetime.now().year)
        month = request.args.get('month')
        target_type = request.args.get('target_type')  # company, department, employee
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = '''
        SELECT ta.id, ta.year, ta.month, ta.target_type, ta.target_id, 
               ta.actual_value, ta.achievement_rate, ta.notes, ta.recorded_at
        FROM target_achievements ta
        WHERE ta.year = ?
        '''
        params = [year]
        
        if month:
            query += ' AND ta.month = ?'
            params.append(month)
            
        if target_type:
            query += ' AND ta.target_type = ?'
            params.append(target_type)
            
        query += ' ORDER BY ta.month DESC, ta.target_type, ta.target_id'
        
        cursor.execute(query, params)
        
        achievements = []
        for row in cursor.fetchall():
            achievements.append({
                'id': row[0],
                'year': row[1],
                'month': row[2],
                'target_type': row[3],
                'target_id': row[4],
                'actual_value': float(row[5]),
                'achievement_rate': float(row[6]) if row[6] else None,
                'notes': row[7],
                'recorded_at': row[8]
            })
        
        conn.close()
        return jsonify({'success': True, 'data': achievements})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/target-achievements', methods=['POST'])
def create_target_achievement():
    """실적 입력 생성"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 달성률 자동 계산
        achievement_rate = None
        if data.get('target_value'):
            achievement_rate = (data['actual_value'] / data['target_value']) * 100
        
        cursor.execute('''
        INSERT INTO target_achievements (year, month, target_type, target_id, 
                                       actual_value, achievement_rate, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (data['year'], data['month'], data['target_type'], 
              data['target_id'], data['actual_value'], 
              achievement_rate, data.get('notes')))
        
        achievement_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'data': {'id': achievement_id}})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/target-achievements/<int:achievement_id>', methods=['PUT'])
def update_target_achievement(achievement_id):
    """실적 입력 수정"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 달성률 자동 계산
        achievement_rate = None
        if data.get('target_value'):
            achievement_rate = (data['actual_value'] / data['target_value']) * 100
        
        cursor.execute('''
        UPDATE target_achievements 
        SET year = ?, month = ?, target_type = ?, target_id = ?, 
            actual_value = ?, achievement_rate = ?, notes = ?
        WHERE id = ?
        ''', (data['year'], data['month'], data['target_type'], 
              data['target_id'], data['actual_value'], 
              achievement_rate, data.get('notes'), achievement_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@performance_targets_bp.route('/api/target-achievements/<int:achievement_id>', methods=['DELETE'])
def delete_target_achievement(achievement_id):
    """실적 입력 삭제"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
        DELETE FROM target_achievements 
        WHERE id = ?
        ''', (achievement_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== 가중치 일괄 관리 ====================

@performance_targets_bp.route('/api/target-weights/<target_type>/<int:year>', methods=['PUT'])
def update_target_weights(target_type, year):
    """가중치 일괄 수정"""
    try:
        data = request.get_json()  # [{'id': 1, 'weight': 40.0}, ...]
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        if target_type == 'company':
            table = 'company_targets'
        elif target_type == 'department':
            table = 'department_targets'
        elif target_type == 'employee':
            table = 'employee_targets'
        else:
            return jsonify({'success': False, 'error': 'Invalid target_type'}), 400
        
        for item in data:
            cursor.execute(f'''
            UPDATE {table} 
            SET weight = ?
            WHERE id = ? AND year = ?
            ''', (item['weight'], item['id'], year))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

