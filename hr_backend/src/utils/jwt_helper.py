import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from src.models.user import User

def create_access_token(user_id, role, username):
    """액세스 토큰 생성"""
    payload = {
        'user_id': user_id,
        'role': role,
        'username': username,
        'exp': datetime.utcnow() + timedelta(hours=1),
        'iat': datetime.utcnow()
    }
    
    return jwt.encode(
        payload, 
        current_app.config['JWT_SECRET_KEY'], 
        algorithm='HS256'
    )

def create_refresh_token(user_id):
    """리프레시 토큰 생성"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=30),
        'iat': datetime.utcnow(),
        'type': 'refresh'
    }
    
    return jwt.encode(
        payload, 
        current_app.config['JWT_SECRET_KEY'], 
        algorithm='HS256'
    )

def verify_token(token):
    """토큰 검증"""
    try:
        payload = jwt.decode(
            token, 
            current_app.config['JWT_SECRET_KEY'], 
            algorithms=['HS256']
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def verify_refresh_token(token):
    """리프레시 토큰 검증"""
    try:
        payload = jwt.decode(
            token, 
            current_app.config['JWT_SECRET_KEY'], 
            algorithms=['HS256']
        )
        
        # 리프레시 토큰인지 확인
        if payload.get('type') != 'refresh':
            return None
            
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def jwt_required(f):
    """JWT 토큰 검증 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': '토큰 형식이 올바르지 않습니다.'}), 401
        
        if not token:
            return jsonify({'error': '토큰이 필요합니다.'}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': '유효하지 않거나 만료된 토큰입니다.'}), 401
        
        # 사용자 정보를 request context에 저장
        request.current_user_id = payload.get('user_id')
        request.current_user_role = payload.get('role')
        request.current_user_username = payload.get('username')
        
        return f(*args, **kwargs)
    
    return decorated_function

def get_current_user_id():
    """현재 사용자 ID 반환"""
    return getattr(request, 'current_user_id', None)

def get_current_user_role():
    """현재 사용자 역할 반환"""
    return getattr(request, 'current_user_role', None)

def get_current_user():
    """현재 사용자 정보 조회"""
    try:
        user_id = getattr(request, 'current_user_id', None)
        if not user_id:
            return None
        
        # 데이터베이스에서 사용자 정보 조회
        import sqlite3
        conn = sqlite3.connect('src/database/app.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        conn.close()
        
        if user:
            return dict(user)
        return None
        
    except Exception:
        return None

def require_admin():
    """관리자 권한 확인"""
    if get_current_user_role() != 'admin':
        return jsonify({'error': '관리자 권한이 필요합니다.'}), 403
    return None

def admin_required(f):
    """관리자 권한 필요 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if get_current_user_role() != 'admin':
            return jsonify({'error': '관리자 권한이 필요합니다.'}), 403
        return f(*args, **kwargs)
    return decorated_function

def user_required(f):
    """일반 사용자 권한 필요 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if get_current_user_role() not in ['user', 'admin']:
            return jsonify({'error': '사용자 권한이 필요합니다.'}), 403
        return f(*args, **kwargs)
    return decorated_function

def get_current_employee():
    """현재 사용자의 직원 정보 조회"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return None
        
        import sqlite3
        conn = sqlite3.connect('src/database/app.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT e.*, d.name as department_name 
            FROM employees e 
            LEFT JOIN departments d ON e.department_id = d.id 
            WHERE e.user_id = ?
        ''', (user_id,))
        employee = cursor.fetchone()
        
        conn.close()
        
        if employee:
            return dict(employee)
        return None
        
    except Exception:
        return None

def check_employee_access(employee_id):
    """직원 데이터 접근 권한 확인 (본인 또는 관리자만)"""
    current_role = get_current_user_role()
    
    # 관리자는 모든 직원 데이터 접근 가능
    if current_role == 'admin':
        return True
    
    # 일반 사용자는 본인 데이터만 접근 가능
    current_employee = get_current_employee()
    if current_employee and current_employee['id'] == employee_id:
        return True
    
    return False

def employee_access_required(f):
    """직원 데이터 접근 권한 확인 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # URL 파라미터에서 employee_id 추출
        employee_id = kwargs.get('employee_id') or request.args.get('employee_id') or request.json.get('employee_id') if request.json else None
        
        if employee_id and not check_employee_access(int(employee_id)):
            return jsonify({'error': '해당 직원의 데이터에 접근할 권한이 없습니다.'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

