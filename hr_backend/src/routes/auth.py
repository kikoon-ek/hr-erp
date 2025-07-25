from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from src.models.user import db, User
from src.models.audit_log import AuditLog
from src.utils.jwt_helper import create_access_token, create_refresh_token, jwt_required, get_current_user_id, verify_refresh_token

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """사용자 로그인"""
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': '사용자명과 비밀번호를 입력해주세요.'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        # 사용자 조회
        user = User.query.filter_by(username=username).first()
        
        if not user or not user.check_password(password):
            # 로그인 실패 로그
            if user:
                AuditLog.log_action(
                    user_id=user.id,
                    action_type='LOGIN_FAILED',
                    entity_type='user',
                    entity_id=user.id,
                    message=f'로그인 실패: 잘못된 비밀번호 - {username}',
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent')
                )
            else:
                # 존재하지 않는 사용자에 대한 로그인 시도
                AuditLog.log_action(
                    user_id=1,  # 시스템 사용자 ID (추후 생성)
                    action_type='LOGIN_FAILED',
                    entity_type='user',
                    entity_id=None,
                    message=f'로그인 실패: 존재하지 않는 사용자 - {username}',
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent')
                )
            
            db.session.commit()
            return jsonify({'error': '사용자명 또는 비밀번호가 올바르지 않습니다.'}), 401
        
        if not user.is_active:
            return jsonify({'error': '비활성화된 계정입니다.'}), 401
        
        # JWT 토큰 생성
        access_token = create_access_token(user.id, user.role, user.username)
        refresh_token = create_refresh_token(user.id)
        
        # 마지막 로그인 시간 업데이트
        user.last_login = datetime.utcnow()
        
        # 로그인 성공 로그
        AuditLog.log_action(
            user_id=user.id,
            action_type='LOGIN_SUCCESS',
            entity_type='user',
            entity_id=user.id,
            message=f'로그인 성공 - {username}',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.commit()
        
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'로그인 중 오류가 발생했습니다: {str(e)}'}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required
def get_current_user():
    """현재 사용자 정보 조회"""
    try:
        current_user_id = get_current_user_id()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        # 직원 정보도 함께 조회
        employee = None
        if user.employee:
            employee = user.employee.to_dict()
        
        return jsonify({
            'user': user.to_dict(),
            'employee': employee
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'사용자 정보 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """토큰 갱신"""
    try:
        data = request.get_json()
        
        if not data or not data.get('refresh_token'):
            return jsonify({'error': '리프레시 토큰이 필요합니다.'}), 400
        
        refresh_token = data.get('refresh_token')
        
        # 리프레시 토큰 검증
        payload = verify_refresh_token(refresh_token)
        if not payload:
            return jsonify({'error': '유효하지 않거나 만료된 리프레시 토큰입니다.'}), 401
        
        user_id = payload.get('user_id')
        user = User.query.get(user_id)
        
        if not user or not user.is_active:
            return jsonify({'error': '사용자를 찾을 수 없거나 비활성화된 계정입니다.'}), 401
        
        # 새로운 액세스 토큰 생성
        new_access_token = create_access_token(user.id, user.role, user.username)
        
        # 토큰 갱신 로그
        AuditLog.log_action(
            user_id=user.id,
            action_type='TOKEN_REFRESH',
            entity_type='user',
            entity_id=user.id,
            message=f'토큰 갱신 - {user.username}',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.commit()
        
        return jsonify({
            'access_token': new_access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'토큰 갱신 중 오류가 발생했습니다: {str(e)}'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required
def logout():
    """사용자 로그아웃"""
    try:
        current_user_id = get_current_user_id()
        user = User.query.get(current_user_id)
        
        if user:
            # 로그아웃 로그
            AuditLog.log_action(
                user_id=user.id,
                action_type='LOGOUT',
                entity_type='user',
                entity_id=user.id,
                message=f'로그아웃 - {user.username}',
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            
            db.session.commit()
        
        return jsonify({'message': '성공적으로 로그아웃되었습니다.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'로그아웃 중 오류가 발생했습니다: {str(e)}'}), 500


@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required
def change_password():
    """사용자 비밀번호 변경"""
    try:
        current_user_id = get_current_user_id()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        data = request.get_json()
        
        if not data or not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': '현재 비밀번호와 새 비밀번호를 입력해주세요.'}), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        # 현재 비밀번호 확인
        if not user.check_password(current_password):
            # 비밀번호 변경 실패 로그
            AuditLog.log_action(
                user_id=user.id,
                action_type='PASSWORD_CHANGE_FAILED',
                entity_type='user',
                entity_id=user.id,
                message=f'비밀번호 변경 실패: 잘못된 현재 비밀번호 - {user.username}',
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            db.session.commit()
            return jsonify({'error': '현재 비밀번호가 올바르지 않습니다.'}), 401
        
        # 새 비밀번호 길이 확인
        if len(new_password) < 6:
            return jsonify({'error': '새 비밀번호는 6자 이상이어야 합니다.'}), 400
        
        # 비밀번호 변경
        user.set_password(new_password)
        
        # 비밀번호 변경 성공 로그
        AuditLog.log_action(
            user_id=user.id,
            action_type='PASSWORD_CHANGED',
            entity_type='user',
            entity_id=user.id,
            message=f'비밀번호 변경 성공 - {user.username}',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.commit()
        
        return jsonify({'message': '비밀번호가 성공적으로 변경되었습니다.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'비밀번호 변경 중 오류가 발생했습니다: {str(e)}'}), 500


@auth_bp.route('/profile', methods=['GET'])
@jwt_required
def get_my_profile():
    """현재 로그인한 사용자의 프로필 정보 조회"""
    try:
        current_user_id = get_current_user_id()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        if not user.employee:
            return jsonify({'error': '연결된 직원 정보를 찾을 수 없습니다.'}), 404
        
        employee = user.employee
        
        # 사용자 프로필 정보 반환
        profile_data = {
            'id': employee.id,
            'employee_number': employee.employee_number,
            'name': employee.name,
            'email': employee.email,
            'phone': employee.phone,
            'address': employee.address,
            'position': employee.position,
            'hire_date': employee.hire_date.isoformat() if employee.hire_date else None,
            'birth_date': employee.birth_date.isoformat() if employee.birth_date else None,
            'status': employee.status,
            'department_id': employee.department_id,
            'department_name': employee.department.name if employee.department else None,
            'created_at': employee.created_at.isoformat() if employee.created_at else None,
            'updated_at': employee.updated_at.isoformat() if employee.updated_at else None
        }
        
        return jsonify({'profile': profile_data}), 200
        
    except Exception as e:
        return jsonify({'error': f'프로필 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required
def update_my_profile():
    """현재 로그인한 사용자의 프로필 정보 수정 (제한된 필드만)"""
    try:
        current_user_id = get_current_user_id()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        if not user.employee:
            return jsonify({'error': '연결된 직원 정보를 찾을 수 없습니다.'}), 404
        
        employee = user.employee
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '수정할 데이터가 없습니다.'}), 400
        
        # 사용자가 수정 가능한 필드만 허용
        allowed_fields = ['phone', 'address']
        updated_fields = []
        
        for field in allowed_fields:
            if field in data:
                old_value = getattr(employee, field)
                new_value = data[field]
                
                if old_value != new_value:
                    setattr(employee, field, new_value)
                    updated_fields.append(f'{field}: {old_value} → {new_value}')
        
        if updated_fields:
            employee.updated_at = datetime.utcnow()
            
            # 프로필 수정 로그
            AuditLog.log_action(
                user_id=user.id,
                action_type='PROFILE_UPDATED',
                entity_type='employee',
                entity_id=employee.id,
                message=f'프로필 수정 - {user.username}: {", ".join(updated_fields)}',
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            
            db.session.commit()
            
            return jsonify({
                'message': '프로필이 성공적으로 수정되었습니다.',
                'updated_fields': updated_fields
            }), 200
        else:
            return jsonify({'message': '변경된 내용이 없습니다.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'프로필 수정 중 오류가 발생했습니다: {str(e)}'}), 500

