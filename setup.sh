#!/bin/bash

echo "🚀 HR ERP 시스템 자동 복원 시작..."
echo "======================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 에러 처리 함수
handle_error() {
    echo -e "${RED}❌ 오류 발생: $1${NC}"
    exit 1
}

# 성공 메시지 함수
success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 정보 메시지 함수
info_msg() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 경고 메시지 함수
warn_msg() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. 시스템 요구사항 확인
info_msg "시스템 요구사항 확인 중..."

# SQLite3 설치 확인
if ! command -v sqlite3 &> /dev/null; then
    info_msg "SQLite3 설치 중..."
    sudo apt update && sudo apt install -y sqlite3
    if [ $? -eq 0 ]; then
        success_msg "SQLite3 설치 완료"
    else
        error_msg "SQLite3 설치 실패"
        exit 1
    fi
else
    success_msg "SQLite3 확인됨"
fi

# Python 확인
if ! command -v python3 &> /dev/null; then
    handle_error "Python 3가 설치되어 있지 않습니다."
fi
success_msg "Python 3 확인됨"

# Node.js 확인
if ! command -v node &> /dev/null; then
    handle_error "Node.js가 설치되어 있지 않습니다."
fi
success_msg "Node.js 확인됨"

# npm 확인
if ! command -v npm &> /dev/null; then
    handle_error "npm이 설치되어 있지 않습니다."
fi
success_msg "npm 확인됨"

echo ""
echo "======================================"
echo "🔧 백엔드 설정 시작..."
echo "======================================"

# 2. 백엔드 설정
cd hr_backend || handle_error "hr_backend 디렉토리를 찾을 수 없습니다."

# 가상환경 생성
info_msg "Python 가상환경 생성 중..."
python3 -m venv venv || handle_error "가상환경 생성 실패"
success_msg "가상환경 생성 완료"

# 가상환경 활성화
info_msg "가상환경 활성화 중..."
source venv/bin/activate || handle_error "가상환경 활성화 실패"
success_msg "가상환경 활성화 완료"

# Python 패키지 설치
info_msg "Python 패키지 설치 중..."
pip install -r requirements.txt || handle_error "Python 패키지 설치 실패"
success_msg "Python 패키지 설치 완료"

# 샘플 데이터베이스 사용
info_msg "데이터베이스 설정 중..."

# 데이터베이스 디렉토리 생성
mkdir -p hr_backend/src/database

if [ -f "hr_system_sample.db" ]; then
    cp hr_system_sample.db hr_system.db
    success_msg "샘플 데이터베이스 복사 완료"
else
    # 데이터베이스 생성
    python hr_backend/add_attendance_to_main_db.py
    if [ $? -ne 0 ]; then
        error_msg "출퇴근 테이블 생성 실패"
        exit 1
    fi
    success_msg "출퇴근 테이블 생성 완료"
fi

# 백엔드 디렉토리에서 나가기
cd ..

echo ""
echo "======================================"
echo "🎨 프론트엔드 설정 시작..."
echo "======================================"

# 3. 프론트엔드 설정
cd hr_frontend || handle_error "hr_frontend 디렉토리를 찾을 수 없습니다."

# Node 모듈 설치 (여러 방법 시도)
info_msg "Node.js 패키지 설치 중..."

# 첫 번째 시도: 일반 설치
if npm install --legacy-peer-deps; then
    success_msg "Node.js 패키지 설치 완료"
else
    warn_msg "일반 설치 실패, 캐시 정리 후 재시도..."
    
    # 캐시 정리 후 재시도
    npm cache clean --force
    
    if npm install --legacy-peer-deps --force; then
        success_msg "Node.js 패키지 설치 완료 (재시도)"
    else
        warn_msg "npm 설치 실패, yarn으로 시도..."
        
        # yarn 설치 시도
        if command -v yarn &> /dev/null; then
            yarn install
            success_msg "Yarn으로 패키지 설치 완료"
        else
            handle_error "Node.js 패키지 설치 실패"
        fi
    fi
fi

# 프론트엔드 디렉토리에서 나가기
cd ..

echo ""
echo "======================================"
echo "🎉 복원 완료!"
echo "======================================"

success_msg "HR ERP 시스템이 성공적으로 복원되었습니다!"
echo ""
echo -e "${BLUE}📋 실행 방법:${NC}"
echo ""
echo -e "${YELLOW}1. 백엔드 서버 실행:${NC}"
echo "   cd hr_backend"
echo "   source venv/bin/activate"
echo "   python src/main.py"
echo ""
echo -e "${YELLOW}2. 프론트엔드 서버 실행 (새 터미널):${NC}"
echo "   cd hr_frontend"
echo "   npm run dev"
echo ""
echo -e "${YELLOW}3. 접속 주소:${NC}"
echo "   프론트엔드: http://localhost:5173"
echo "   백엔드 API: http://localhost:5007"
echo ""
echo -e "${YELLOW}4. 기본 로그인 정보:${NC}"
echo "   관리자: admin@company.com / admin123"
echo ""
echo -e "${GREEN}🎯 모든 설정이 완료되었습니다!${NC}"

