from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.attendance import WorkSchedule
from src.models.employee import Employee
from src.utils.jwt_helper import admin_required
from src.utils.audit import log_action
from datetime import datetime, time

work_schedule_bp = Blueprint('work_schedule', __name__)

@work_schedule_bp.route('/work-schedules', methods=['GET'])
@admin_required
def get_work_schedules():
    """근무시간 설정 목록 조회"""
    try:
        employee_id = request.args.get('employee_id')
        
        query = WorkSchedule.query
        
        if employee_id:
            query = query.filter(WorkSchedule.employee_id == employee_id)
        
        schedules = query.order_by(WorkSchedule.employee_id, WorkSchedule.day_of_week).all()
        
        return jsonify({
            'success': True,
            'schedules': [schedule.to_dict() for schedule in schedules],
            'total': len(schedules)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@work_schedule_bp.route('/work-schedules', methods=['POST'])
@admin_required
def create_work_schedule():
    """근무시간 설정 생성"""
    try:
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['employee_id', 'day_of_week', 'start_time', 'end_time']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'{field} 필드가 필요합니다.'
                }), 400
        
        # 직원 존재 여부 확인
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({
                'success': False,
                'error': '존재하지 않는 직원입니다.'
            }), 404
        
        # 요일 유효성 검증 (0-6)
        if not (0 <= data['day_of_week'] <= 6):
            return jsonify({
                'success': False,
                'error': '요일은 0(월요일)부터 6(일요일) 사이의 값이어야 합니다.'
            }), 400
        
        # 시간 형식 변환
        try:
            start_time = datetime.strptime(data['start_time'], '%H:%M').time()
            end_time = datetime.strptime(data['end_time'], '%H:%M').time()
        except ValueError:
            return jsonify({
                'success': False,
                'error': '시간 형식이 올바르지 않습니다. (HH:MM 형식 사용)'
            }), 400
        
        # 시작시간이 종료시간보다 늦은지 확인
        if start_time >= end_time:
            return jsonify({
                'success': False,
                'error': '시작시간은 종료시간보다 빨라야 합니다.'
            }), 400
        
        # 중복 확인
        existing_schedule = WorkSchedule.query.filter_by(
            employee_id=data['employee_id'],
            day_of_week=data['day_of_week']
        ).first()
        
        if existing_schedule:
            return jsonify({
                'success': False,
                'error': '해당 직원의 해당 요일 근무시간이 이미 설정되어 있습니다.'
            }), 409
        
        # 새 근무시간 설정 생성
        schedule = WorkSchedule(
            employee_id=data['employee_id'],
            day_of_week=data['day_of_week'],
            start_time=start_time,
            end_time=end_time,
            is_working_day=data.get('is_working_day', True)
        )
        
        db.session.add(schedule)
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=request.current_user['id'],
            action='CREATE_WORK_SCHEDULE',
            details=f"직원 {employee.name}의 {['월','화','수','목','금','토','일'][data['day_of_week']]}요일 근무시간 설정: {data['start_time']}-{data['end_time']}"
        )
        
        return jsonify({
            'success': True,
            'message': '근무시간 설정이 생성되었습니다.',
            'schedule': schedule.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@work_schedule_bp.route('/work-schedules/<int:schedule_id>', methods=['PUT'])
@admin_required
def update_work_schedule(schedule_id):
    """근무시간 설정 수정"""
    try:
        schedule = WorkSchedule.query.get(schedule_id)
        if not schedule:
            return jsonify({
                'success': False,
                'error': '존재하지 않는 근무시간 설정입니다.'
            }), 404
        
        data = request.get_json()
        
        # 시간 형식 변환 및 검증
        if 'start_time' in data:
            try:
                start_time = datetime.strptime(data['start_time'], '%H:%M').time()
                schedule.start_time = start_time
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': '시작시간 형식이 올바르지 않습니다. (HH:MM 형식 사용)'
                }), 400
        
        if 'end_time' in data:
            try:
                end_time = datetime.strptime(data['end_time'], '%H:%M').time()
                schedule.end_time = end_time
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': '종료시간 형식이 올바르지 않습니다. (HH:MM 형식 사용)'
                }), 400
        
        # 시작시간이 종료시간보다 늦은지 확인
        if schedule.start_time >= schedule.end_time:
            return jsonify({
                'success': False,
                'error': '시작시간은 종료시간보다 빨라야 합니다.'
            }), 400
        
        # 근무일 여부 업데이트
        if 'is_working_day' in data:
            schedule.is_working_day = data['is_working_day']
        
        schedule.updated_at = datetime.utcnow()
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=request.current_user['id'],
            action='UPDATE_WORK_SCHEDULE',
            details=f"직원 {schedule.employee.name}의 {['월','화','수','목','금','토','일'][schedule.day_of_week]}요일 근무시간 수정"
        )
        
        return jsonify({
            'success': True,
            'message': '근무시간 설정이 수정되었습니다.',
            'schedule': schedule.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@work_schedule_bp.route('/work-schedules/<int:schedule_id>', methods=['DELETE'])
@admin_required
def delete_work_schedule(schedule_id):
    """근무시간 설정 삭제"""
    try:
        schedule = WorkSchedule.query.get(schedule_id)
        if not schedule:
            return jsonify({
                'success': False,
                'error': '존재하지 않는 근무시간 설정입니다.'
            }), 404
        
        employee_name = schedule.employee.name
        day_name = ['월','화','수','목','금','토','일'][schedule.day_of_week]
        
        db.session.delete(schedule)
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=request.current_user['id'],
            action='DELETE_WORK_SCHEDULE',
            details=f"직원 {employee_name}의 {day_name}요일 근무시간 설정 삭제"
        )
        
        return jsonify({
            'success': True,
            'message': '근무시간 설정이 삭제되었습니다.'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@work_schedule_bp.route('/work-schedules/bulk', methods=['POST'])
@admin_required
def create_bulk_work_schedules():
    """직원별 일괄 근무시간 설정"""
    try:
        data = request.get_json()
        
        # 필수 필드 검증
        if 'employee_id' not in data or 'schedules' not in data:
            return jsonify({
                'success': False,
                'error': 'employee_id와 schedules 필드가 필요합니다.'
            }), 400
        
        # 직원 존재 여부 확인
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({
                'success': False,
                'error': '존재하지 않는 직원입니다.'
            }), 404
        
        # 기존 근무시간 설정 삭제
        WorkSchedule.query.filter_by(employee_id=data['employee_id']).delete()
        
        created_schedules = []
        
        # 새 근무시간 설정 생성
        for schedule_data in data['schedules']:
            if not schedule_data.get('is_working_day', True):
                continue  # 비근무일은 스킵
            
            try:
                start_time = datetime.strptime(schedule_data['start_time'], '%H:%M').time()
                end_time = datetime.strptime(schedule_data['end_time'], '%H:%M').time()
            except (ValueError, KeyError):
                return jsonify({
                    'success': False,
                    'error': f"요일 {schedule_data.get('day_of_week', '?')}의 시간 형식이 올바르지 않습니다."
                }), 400
            
            if start_time >= end_time:
                return jsonify({
                    'success': False,
                    'error': f"요일 {schedule_data.get('day_of_week', '?')}의 시작시간이 종료시간보다 늦습니다."
                }), 400
            
            schedule = WorkSchedule(
                employee_id=data['employee_id'],
                day_of_week=schedule_data['day_of_week'],
                start_time=start_time,
                end_time=end_time,
                is_working_day=schedule_data.get('is_working_day', True)
            )
            
            db.session.add(schedule)
            created_schedules.append(schedule)
        
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=request.current_user['id'],
            action='BULK_CREATE_WORK_SCHEDULE',
            details=f"직원 {employee.name}의 주간 근무시간 일괄 설정 ({len(created_schedules)}개 요일)"
        )
        
        return jsonify({
            'success': True,
            'message': f'{len(created_schedules)}개 요일의 근무시간이 설정되었습니다.',
            'schedules': [schedule.to_dict() for schedule in created_schedules]
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@work_schedule_bp.route('/work-schedules/templates', methods=['GET'])
@admin_required
def get_schedule_templates():
    """근무시간 템플릿 목록 조회"""
    try:
        templates = [
            {
                'id': 'standard',
                'name': '표준 근무시간 (9-6)',
                'description': '월~금 09:00-18:00, 주말 휴무',
                'schedules': [
                    {'day_of_week': 0, 'start_time': '09:00', 'end_time': '18:00', 'is_working_day': True},
                    {'day_of_week': 1, 'start_time': '09:00', 'end_time': '18:00', 'is_working_day': True},
                    {'day_of_week': 2, 'start_time': '09:00', 'end_time': '18:00', 'is_working_day': True},
                    {'day_of_week': 3, 'start_time': '09:00', 'end_time': '18:00', 'is_working_day': True},
                    {'day_of_week': 4, 'start_time': '09:00', 'end_time': '18:00', 'is_working_day': True},
                    {'day_of_week': 5, 'start_time': '09:00', 'end_time': '18:00', 'is_working_day': False},
                    {'day_of_week': 6, 'start_time': '09:00', 'end_time': '18:00', 'is_working_day': False}
                ]
            },
            {
                'id': 'flexible',
                'name': '유연 근무시간 (10-7)',
                'description': '월~금 10:00-19:00, 주말 휴무',
                'schedules': [
                    {'day_of_week': 0, 'start_time': '10:00', 'end_time': '19:00', 'is_working_day': True},
                    {'day_of_week': 1, 'start_time': '10:00', 'end_time': '19:00', 'is_working_day': True},
                    {'day_of_week': 2, 'start_time': '10:00', 'end_time': '19:00', 'is_working_day': True},
                    {'day_of_week': 3, 'start_time': '10:00', 'end_time': '19:00', 'is_working_day': True},
                    {'day_of_week': 4, 'start_time': '10:00', 'end_time': '19:00', 'is_working_day': True},
                    {'day_of_week': 5, 'start_time': '10:00', 'end_time': '19:00', 'is_working_day': False},
                    {'day_of_week': 6, 'start_time': '10:00', 'end_time': '19:00', 'is_working_day': False}
                ]
            },
            {
                'id': 'early',
                'name': '조기 근무시간 (8-5)',
                'description': '월~금 08:00-17:00, 주말 휴무',
                'schedules': [
                    {'day_of_week': 0, 'start_time': '08:00', 'end_time': '17:00', 'is_working_day': True},
                    {'day_of_week': 1, 'start_time': '08:00', 'end_time': '17:00', 'is_working_day': True},
                    {'day_of_week': 2, 'start_time': '08:00', 'end_time': '17:00', 'is_working_day': True},
                    {'day_of_week': 3, 'start_time': '08:00', 'end_time': '17:00', 'is_working_day': True},
                    {'day_of_week': 4, 'start_time': '08:00', 'end_time': '17:00', 'is_working_day': True},
                    {'day_of_week': 5, 'start_time': '08:00', 'end_time': '17:00', 'is_working_day': False},
                    {'day_of_week': 6, 'start_time': '08:00', 'end_time': '17:00', 'is_working_day': False}
                ]
            }
        ]
        
        return jsonify({
            'success': True,
            'templates': templates
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

