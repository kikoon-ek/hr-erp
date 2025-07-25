@echo off
chcp 65001 >nul
echo 🚀 HR ERP 시스템 자동 복원 시작...
echo ======================================

:: 색상 설정을 위한 ANSI 지원 활성화
for /f "tokens=2 delims=[]" %%A in ('ver') do set "version=%%A"

echo ℹ️  시스템 요구사항 확인 중...

:: Python 확인
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 오류: Python이 설치되어 있지 않습니다.
    pause
    exit /b 1
)
echo ✅ Python 확인됨

:: Node.js 확인
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 오류: Node.js가 설치되어 있지 않습니다.
    pause
    exit /b 1
)
echo ✅ Node.js 확인됨

:: npm 확인
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 오류: npm이 설치되어 있지 않습니다.
    pause
    exit /b 1
)
echo ✅ npm 확인됨

echo.
echo ======================================
echo 🔧 백엔드 설정 시작...
echo ======================================

:: 백엔드 디렉토리로 이동
cd hr_backend
if errorlevel 1 (
    echo ❌ 오류: hr_backend 디렉토리를 찾을 수 없습니다.
    pause
    exit /b 1
)

:: 가상환경 생성
echo ℹ️  Python 가상환경 생성 중...
python -m venv venv
if errorlevel 1 (
    echo ❌ 오류: 가상환경 생성 실패
    pause
    exit /b 1
)
echo ✅ 가상환경 생성 완료

:: 가상환경 활성화
echo ℹ️  가상환경 활성화 중...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ❌ 오류: 가상환경 활성화 실패
    pause
    exit /b 1
)
echo ✅ 가상환경 활성화 완료

:: Python 패키지 설치
echo ℹ️  Python 패키지 설치 중...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ 오류: Python 패키지 설치 실패
    pause
    exit /b 1
)
echo ✅ Python 패키지 설치 완료

:: 데이터베이스 스크립트 경로 수정
echo ℹ️  데이터베이스 스크립트 경로 수정 중...
if exist "add_employee_work_schedules.py" (
    powershell -Command "(Get-Content add_employee_work_schedules.py) -replace 'src/database/app.db', 'hr_system.db' | Set-Content add_employee_work_schedules.py"
    echo ✅ 데이터베이스 경로 수정 완료
)

:: 데이터베이스 생성
echo ℹ️  데이터베이스 생성 중...
python create_attendance_tables.py
if errorlevel 1 (
    echo ❌ 오류: 출퇴근 테이블 생성 실패
    pause
    exit /b 1
)
echo ✅ 출퇴근 테이블 생성 완료

:: 기본 데이터 추가
echo ℹ️  기본 데이터 확인 및 추가 중...
if exist "add_employee_work_schedules.py" (
    python add_employee_work_schedules.py
    echo ✅ 근무시간 데이터 처리 완료
)

:: 백엔드 디렉토리에서 나가기
cd ..

echo.
echo ======================================
echo 🎨 프론트엔드 설정 시작...
echo ======================================

:: 프론트엔드 디렉토리로 이동
cd hr_frontend
if errorlevel 1 (
    echo ❌ 오류: hr_frontend 디렉토리를 찾을 수 없습니다.
    pause
    exit /b 1
)

:: Node 모듈 설치
echo ℹ️  Node.js 패키지 설치 중...
npm install --legacy-peer-deps
if errorlevel 1 (
    echo ❌ 오류: Node.js 패키지 설치 실패
    pause
    exit /b 1
)
echo ✅ Node.js 패키지 설치 완료

:: 프론트엔드 디렉토리에서 나가기
cd ..

echo.
echo ======================================
echo 🎉 복원 완료!
echo ======================================

echo ✅ HR ERP 시스템이 성공적으로 복원되었습니다!
echo.
echo 📋 실행 방법:
echo.
echo 1. 백엔드 서버 실행:
echo    cd hr_backend
echo    venv\Scripts\activate.bat
echo    python src\main.py
echo.
echo 2. 프론트엔드 서버 실행 (새 명령 프롬프트):
echo    cd hr_frontend
echo    npm run dev
echo.
echo 3. 접속 주소:
echo    프론트엔드: http://localhost:5173
echo    백엔드 API: http://localhost:5007
echo.
echo 4. 기본 로그인 정보:
echo    관리자: admin@company.com / admin123
echo.
echo 🎯 모든 설정이 완료되었습니다!

pause

