"""
공통 라우트 설정
모든 Blueprint를 중앙에서 관리
"""

def register_blueprints(app):
    """모든 Blueprint를 앱에 등록"""
    
    # 인증 관련
    from .auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    # 기본 관리
    from .employee import employee_bp
    app.register_blueprint(employee_bp, url_prefix='/api')
    
    from .department import department_bp
    app.register_blueprint(department_bp, url_prefix='/api')
    
    from .audit_log import audit_log_bp
    app.register_blueprint(audit_log_bp, url_prefix='/api')
    
    # 급여 및 출근
    from .payroll import payroll_bp
    app.register_blueprint(payroll_bp, url_prefix='/api')
    
    from .attendance import attendance_bp
    app.register_blueprint(attendance_bp, url_prefix='/api')
    
    # 연차 관리
    from .annual_leave import annual_leave_bp
    app.register_blueprint(annual_leave_bp, url_prefix='/api')
    
    from .annual_leave_request import annual_leave_request_bp
    app.register_blueprint(annual_leave_request_bp, url_prefix='/api')
    
    # 평가 및 성과
    from .evaluation_criteria import evaluation_criteria_bp
    app.register_blueprint(evaluation_criteria_bp, url_prefix='/api')
    
    from .evaluation import evaluation_bp
    app.register_blueprint(evaluation_bp, url_prefix='/api')
    
    from .bonus_policy import bonus_policy_bp
    app.register_blueprint(bonus_policy_bp, url_prefix='/api')
    
    # 대시보드
    from .dashboard import dashboard_bp
    app.register_blueprint(dashboard_bp, url_prefix='/api')
    
    # 근무시간 설정
    from .work_schedule import work_schedule_bp
    app.register_blueprint(work_schedule_bp, url_prefix='/api')
    
    # 사용자 API
    from .user_api import user_api_bp
    app.register_blueprint(user_api_bp, url_prefix='/api')

    print("✅ 모든 Blueprint가 /api prefix로 등록되었습니다.")

