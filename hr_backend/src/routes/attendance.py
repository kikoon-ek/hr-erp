from flask import Blueprint, request, jsonify
from datetime import datetime, date, time
from src.models.user import db
from src.models.attendance import AttendanceRecord, WorkSchedule
from src.models.employee import Employee
from src.utils.jwt_helper import jwt_required, admin_required
from src.utils.audit import log_action

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/attendance/records', methods=['GET'])
@jwt_required
@admin_required
def get_attendance_records():
    """출퇴근 기록 조회"""
    try:
        # 쿼리 파라미터 가져오기
        date_param = request.args.get('date')
        employee_id = request.args.get('employee_id')
        status = request.args.get('status')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        
        # 기본 쿼리 생성
        query = AttendanceRecord.query.join(Employee)
        
        # 필터 적용
        if date_param:
            try:
                filter_date = datetime.strptime(date_param, '%Y-%m-%d').date()
                query = query.filter(AttendanceRecord.date == filter_date)
            except ValueError:
                return jsonify({'error': '잘못된 날짜 형식입니다'}), 400
        
        if employee_id:
            query = query.filter(AttendanceRecord.employee_id == employee_id)
        
        if status:
            query = query.filter(AttendanceRecord.status == status)
        
        # 날짜 역순으로 정렬
        query = query.order_by(AttendanceRecord.date.desc(), AttendanceRecord.created_at.desc())
        
        # 페이지네이션
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        records = [record.to_dict() for record in pagination.items]
        
        return jsonify({
            'records': records,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@attendance_bp.route('/attendance/records', methods=['POST'])
@jwt_required
@admin_required
def create_attendance_record():
    """출퇴근 기록 생성"""
    try:
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['employee_id', 'date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field}는 필수 항목입니다'}), 400
        
        # 직원 존재 확인
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({'error': '존재하지 않는 직원입니다'}), 404
        
        # 날짜 파싱
        try:
            record_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': '잘못된 날짜 형식입니다'}), 400
        
        # 중복 기록 확인
        existing_record = AttendanceRecord.query.filter_by(
            employee_id=data['employee_id'],
            date=record_date
        ).first()
        
        if existing_record:
            return jsonify({'error': '해당 날짜에 이미 출퇴근 기록이 존재합니다'}), 400
        
        # 시간 파싱
        check_in_time = None
        check_out_time = None
        
        if data.get('check_in_time'):
            try:
                check_in_time = datetime.strptime(data['check_in_time'], '%H:%M').time()
            except ValueError:
                return jsonify({'error': '잘못된 출근시간 형식입니다'}), 400
        
        if data.get('check_out_time'):
            try:
                check_out_time = datetime.strptime(data['check_out_time'], '%H:%M').time()
            except ValueError:
                return jsonify({'error': '잘못된 퇴근시간 형식입니다'}), 400
        
        # 근무시간 계산
        work_hours = AttendanceRecord.calculate_work_hours(check_in_time, check_out_time)
        
        # 상태 자동 판정 (기본 근무시간 09:00-18:00 기준)
        standard_start = time(9, 0)
        standard_end = time(18, 0)
        
        if 'status' not in data or not data['status']:
            status = AttendanceRecord.determine_status(
                check_in_time, check_out_time, standard_start, standard_end
            )
        else:
            status = data['status']
        
        # 새 기록 생성
        new_record = AttendanceRecord(
            employee_id=data['employee_id'],
            date=record_date,
            check_in_time=check_in_time,
            check_out_time=check_out_time,
            status=status,
            work_hours=work_hours,
            overtime_hours=data.get('overtime_hours', 0.0),
            notes=data.get('notes', '')
        )
        
        db.session.add(new_record)
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=request.current_user['id'],
            action='CREATE_ATTENDANCE',
            details=f"직원 {employee.name}의 {record_date} 출퇴근 기록 생성 (상태: {status})"
        )
        
        return jsonify({
            'message': '출퇴근 기록이 생성되었습니다',
            'record': new_record.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@attendance_bp.route('/attendance/records/<int:record_id>', methods=['PUT'])
@jwt_required
@admin_required
def update_attendance_record(record_id):
    """출퇴근 기록 수정"""
    try:
        record = AttendanceRecord.query.get(record_id)
        if not record:
            return jsonify({'error': '존재하지 않는 출퇴근 기록입니다'}), 404
        
        data = request.get_json()
        
        # 직원 변경 시 존재 확인
        if 'employee_id' in data and data['employee_id'] != record.employee_id:
            employee = Employee.query.get(data['employee_id'])
            if not employee:
                return jsonify({'error': '존재하지 않는 직원입니다'}), 404
            record.employee_id = data['employee_id']
        
        # 날짜 변경
        if 'date' in data:
            try:
                new_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
                
                # 중복 기록 확인 (자기 자신 제외)
                existing_record = AttendanceRecord.query.filter_by(
                    employee_id=record.employee_id,
                    date=new_date
                ).filter(AttendanceRecord.id != record_id).first()
                
                if existing_record:
                    return jsonify({'error': '해당 날짜에 이미 출퇴근 기록이 존재합니다'}), 400
                
                record.date = new_date
            except ValueError:
                return jsonify({'error': '잘못된 날짜 형식입니다'}), 400
        
        # 시간 변경
        if 'check_in_time' in data:
            if data['check_in_time']:
                try:
                    record.check_in_time = datetime.strptime(data['check_in_time'], '%H:%M').time()
                except ValueError:
                    return jsonify({'error': '잘못된 출근시간 형식입니다'}), 400
            else:
                record.check_in_time = None
        
        if 'check_out_time' in data:
            if data['check_out_time']:
                try:
                    record.check_out_time = datetime.strptime(data['check_out_time'], '%H:%M').time()
                except ValueError:
                    return jsonify({'error': '잘못된 퇴근시간 형식입니다'}), 400
            else:
                record.check_out_time = None
        
        # 근무시간 재계산
        record.work_hours = AttendanceRecord.calculate_work_hours(
            record.check_in_time, record.check_out_time
        )
        
        # 기타 필드 업데이트
        if 'status' in data:
            record.status = data['status']
        if 'overtime_hours' in data:
            record.overtime_hours = data['overtime_hours']
        if 'notes' in data:
            record.notes = data['notes']
        
        record.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=request.current_user['id'],
            action='UPDATE_ATTENDANCE',
            details=f"직원 {record.employee.name}의 {record.date} 출퇴근 기록 수정"
        )
        
        return jsonify({
            'message': '출퇴근 기록이 수정되었습니다',
            'record': record.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@attendance_bp.route('/attendance/records/<int:record_id>', methods=['DELETE'])
@jwt_required
@admin_required
def delete_attendance_record(record_id):
    """출퇴근 기록 삭제"""
    try:
        record = AttendanceRecord.query.get(record_id)
        if not record:
            return jsonify({'error': '존재하지 않는 출퇴근 기록입니다'}), 404
        
        employee_name = record.employee.name
        record_date = record.date
        
        db.session.delete(record)
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=request.current_user['id'],
            action='DELETE_ATTENDANCE',
            details=f"직원 {employee_name}의 {record_date} 출퇴근 기록 삭제"
        )
        
        return jsonify({'message': '출퇴근 기록이 삭제되었습니다'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@attendance_bp.route('/attendance/statistics', methods=['GET'])
@jwt_required
@admin_required
def get_attendance_statistics():
    """출퇴근 통계 조회"""
    try:
        # 쿼리 파라미터 가져오기
        date_param = request.args.get('date', date.today().isoformat())
        
        try:
            filter_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': '잘못된 날짜 형식입니다'}), 400
        
        # 해당 날짜의 출퇴근 기록 조회
        records = AttendanceRecord.query.filter_by(date=filter_date).all()
        
        # 통계 계산
        total_employees = Employee.query.count()
        present_count = len([r for r in records if r.status in ['present', 'late']])
        late_count = len([r for r in records if r.status == 'late'])
        absent_count = len([r for r in records if r.status == 'absent'])
        on_leave_count = len([r for r in records if r.status == 'on_leave'])
        early_leave_count = len([r for r in records if r.status == 'early_leave'])
        
        # 평균 근무시간 계산
        work_hours_list = [r.work_hours for r in records if r.work_hours is not None]
        avg_work_hours = sum(work_hours_list) / len(work_hours_list) if work_hours_list else 0
        
        return jsonify({
            'date': filter_date.isoformat(),
            'total_employees': total_employees,
            'present_count': present_count,
            'late_count': late_count,
            'absent_count': absent_count,
            'on_leave_count': on_leave_count,
            'early_leave_count': early_leave_count,
            'attendance_rate': (present_count / total_employees * 100) if total_employees > 0 else 0,
            'average_work_hours': round(avg_work_hours, 2)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# 근무시간 설정 관련 API

@attendance_bp.route('/work-schedules', methods=['GET'])
@jwt_required
@admin_required
def get_work_schedules():
    """근무시간 설정 조회"""
    try:
        employee_id = request.args.get('employee_id')
        
        if employee_id:
            schedules = WorkSchedule.query.filter_by(employee_id=employee_id).order_by(WorkSchedule.day_of_week).all()
        else:
            schedules = WorkSchedule.query.join(Employee).order_by(Employee.name, WorkSchedule.day_of_week).all()
        
        return jsonify({
            'schedules': [schedule.to_dict() for schedule in schedules]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@attendance_bp.route('/work-schedules', methods=['POST'])
@jwt_required
@admin_required
def create_work_schedule():
    """근무시간 설정 생성"""
    try:
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['employee_id', 'schedules']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field}는 필수 항목입니다'}), 400
        
        # 직원 존재 확인
        employee = Employee.query.get(data['employee_id'])
        if not employee:
            return jsonify({'error': '존재하지 않는 직원입니다'}), 404
        
        # 기존 스케줄 삭제
        WorkSchedule.query.filter_by(employee_id=data['employee_id']).delete()
        
        # 새 스케줄 생성
        for schedule_data in data['schedules']:
            try:
                start_time = datetime.strptime(schedule_data['start_time'], '%H:%M').time()
                end_time = datetime.strptime(schedule_data['end_time'], '%H:%M').time()
            except ValueError:
                return jsonify({'error': '잘못된 시간 형식입니다'}), 400
            
            new_schedule = WorkSchedule(
                employee_id=data['employee_id'],
                day_of_week=schedule_data['day_of_week'],
                start_time=start_time,
                end_time=end_time,
                is_working_day=schedule_data.get('is_working_day', True)
            )
            
            db.session.add(new_schedule)
        
        db.session.commit()
        
        # 감사 로그 기록
        log_action(
            user_id=request.current_user['id'],
            action='CREATE_WORK_SCHEDULE',
            details=f"직원 {employee.name}의 근무시간 설정 생성"
        )
        
        return jsonify({'message': '근무시간 설정이 생성되었습니다'}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

