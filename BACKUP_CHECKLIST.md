# HR ERP 시스템 백업 체크리스트 및 복구 검증 가이드

## 📋 백업 완료 체크리스트

### ✅ 핵심 시스템 파일
- [x] **백엔드 소스 코드** (`hr_backend/src/`)
  - [x] Flask 애플리케이션 (`main.py`)
  - [x] 데이터베이스 설정 (`database.py`)
  - [x] 모든 모델 파일 (`models/`)
  - [x] 모든 API 라우트 (`routes/`)
  - [x] 유틸리티 함수 (`utils/`)

- [x] **프론트엔드 소스 코드** (`hr_frontend/src/`)
  - [x] React 애플리케이션 (`App.jsx`)
  - [x] 관리자 페이지 (`pages/admin/`)
  - [x] 사용자 페이지 (`pages/user/`)
  - [x] 레이아웃 컴포넌트 (`components/layout/`)
  - [x] 상태 관리 (`stores/`)

### ✅ 설정 및 의존성 파일
- [x] **Python 의존성** (`hr_backend/requirements.txt`)
- [x] **Node.js 의존성** (`hr_frontend/package.json`)
- [x] **Git 설정** (`.gitignore`)
- [x] **환경 설정** (환경 변수 가이드 포함)

### ✅ 데이터베이스 관련
- [x] **데이터베이스 스키마** (`DATABASE_SCHEMA.sql`)
- [x] **모델 정의** (모든 SQLAlchemy 모델)
- [x] **초기 데이터** (관리자 계정, 기본 설정)
- [x] **마이그레이션 로직** (자동 테이블 생성)

### ✅ 문서화
- [x] **README.md** (프로젝트 개요 및 기본 설치 가이드)
- [x] **DEPLOYMENT.md** (상세한 배포 및 복구 가이드)
- [x] **DATABASE_SCHEMA.sql** (완전한 데이터베이스 스키마)
- [x] **BACKUP_CHECKLIST.md** (이 파일)

## 🔍 복구 검증 절차

### 1단계: 환경 준비 검증
```bash
# 시스템 요구사항 확인
python3 --version  # 3.11+ 필요
node --version     # v20+ 필요
npm --version      # 10+ 필요
git --version      # 2.0+ 필요

# 필수 패키지 설치 확인
which python3 pip3 node npm git curl wget
```

### 2단계: 저장소 복구 검증
```bash
# 저장소 클론 후 파일 구조 확인
cd ~/workspace/hrerp
find . -name "*.py" | wc -l    # Python 파일 개수 확인
find . -name "*.jsx" | wc -l   # React 파일 개수 확인
find . -name "*.json" | wc -l  # 설정 파일 개수 확인

# 핵심 파일 존재 확인
test -f hr_backend/src/main.py && echo "✅ 백엔드 메인 파일 존재"
test -f hr_frontend/src/App.jsx && echo "✅ 프론트엔드 메인 파일 존재"
test -f hr_backend/requirements.txt && echo "✅ Python 의존성 파일 존재"
test -f hr_frontend/package.json && echo "✅ Node.js 의존성 파일 존재"
test -f README.md && echo "✅ README 파일 존재"
test -f DEPLOYMENT.md && echo "✅ 배포 가이드 존재"
```

### 3단계: 백엔드 복구 검증
```bash
cd hr_backend

# 가상환경 생성 및 의존성 설치
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 의존성 설치 확인
pip list | grep -E "(Flask|SQLAlchemy|bcrypt|PyJWT)"

# 데이터베이스 초기화 테스트
python -c "
from src.main import app
from src.database import init_db
with app.app_context():
    init_db()
    print('✅ 데이터베이스 초기화 성공')
"

# 서버 시작 테스트
timeout 10s python src/main.py &
sleep 5
curl -f http://localhost:5007/ && echo "✅ 백엔드 서버 정상 시작"
pkill -f "python.*main.py"
```

### 4단계: 프론트엔드 복구 검증
```bash
cd hr_frontend

# 의존성 설치
npm install

# 의존성 설치 확인
npm list --depth=0 | grep -E "(react|vite|tailwindcss)"

# 빌드 테스트
npm run build && echo "✅ 프론트엔드 빌드 성공"

# 개발 서버 시작 테스트
timeout 10s npm run dev &
sleep 5
curl -f http://localhost:5173/ && echo "✅ 프론트엔드 서버 정상 시작"
pkill -f "node.*vite"
```

### 5단계: 통합 기능 검증
```bash
# 백엔드 서버 시작
cd hr_backend && source venv/bin/activate
python src/main.py &
BACKEND_PID=$!

# 프론트엔드 서버 시작
cd ../hr_frontend
npm run dev &
FRONTEND_PID=$!

sleep 10

# API 엔드포인트 테스트
echo "=== API 테스트 ==="
curl -X POST http://localhost:5007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  && echo "✅ 관리자 로그인 API 정상"

curl -f http://localhost:5007/api/employees \
  && echo "✅ 직원 목록 API 정상"

curl -f http://localhost:5007/api/attendance/stats \
  && echo "✅ 출퇴근 통계 API 정상"

# 프로세스 정리
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
```

## 🚨 문제 해결 가이드

### 일반적인 복구 문제들

#### 1. Python 버전 호환성 문제
```bash
# 문제: Python 3.11 미만 버전 사용
# 해결: pyenv를 사용한 Python 버전 관리
curl https://pyenv.run | bash
pyenv install 3.11.0
pyenv global 3.11.0
```

#### 2. Node.js 버전 호환성 문제
```bash
# 문제: Node.js 20 미만 버전 사용
# 해결: nvm을 사용한 Node.js 버전 관리
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### 3. 의존성 설치 실패
```bash
# Python 의존성 문제
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt --no-cache-dir

# Node.js 의존성 문제
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### 4. 데이터베이스 초기화 실패
```bash
# 데이터베이스 파일 권한 문제
sudo chown -R $USER:$USER hr_backend/instance/
chmod 755 hr_backend/instance/

# SQLite 설치 확인
sudo apt install sqlite3 libsqlite3-dev
```

#### 5. 포트 충돌 문제
```bash
# 포트 사용 프로세스 확인 및 종료
sudo lsof -i :5007 -i :5173
sudo kill -9 <PID>

# 대체 포트 사용
export PORT=5008  # 백엔드
export VITE_PORT=5174  # 프론트엔드
```

## 📊 복구 성공 기준

### ✅ 필수 기능 체크리스트
- [ ] **관리자 로그인** (admin/admin123)
- [ ] **사용자 로그인** (kim.cs/user123)
- [ ] **직원 목록 조회**
- [ ] **출퇴근 기록 조회**
- [ ] **연차 관리 기능**
- [ ] **급여명세서 조회**
- [ ] **대시보드 통계 표시**

### ✅ 성능 기준
- [ ] **백엔드 응답 시간** < 1초
- [ ] **프론트엔드 로딩 시간** < 3초
- [ ] **데이터베이스 쿼리** < 500ms
- [ ] **메모리 사용량** < 1GB

### ✅ 보안 기준
- [ ] **JWT 토큰 인증** 정상 작동
- [ ] **비밀번호 해싱** 정상 작동
- [ ] **권한 기반 접근 제어** 정상 작동
- [ ] **API 엔드포인트 보호** 정상 작동

## 🔄 백업 업데이트 절차

### 정기 백업 (권장: 주 1회)
```bash
cd ~/workspace/hrerp

# 변경사항 확인
git status

# 새로운 파일 추가
git add .

# 변경사항 커밋
git commit -m "Weekly backup - $(date +%Y-%m-%d)"

# 원격 저장소 푸시 (설정된 경우)
git push origin master
```

### 주요 업데이트 시 백업
```bash
# 기능 추가/수정 후
git add .
git commit -m "Feature update: [기능 설명]

- 추가된 기능: [상세 설명]
- 수정된 파일: [파일 목록]
- 테스트 완료: [테스트 결과]"

git push origin master
```

## 📞 긴급 복구 연락처

### 복구 실패 시 확인사항
1. **시스템 로그 확인**: `journalctl -f`
2. **디스크 공간 확인**: `df -h`
3. **메모리 사용량 확인**: `free -h`
4. **네트워크 연결 확인**: `ping google.com`
5. **방화벽 설정 확인**: `sudo ufw status`

### 로그 수집 스크립트
```bash
#!/bin/bash
# 복구 문제 진단을 위한 로그 수집

echo "=== HR ERP 시스템 진단 정보 ===" > hr_system_debug.log
echo "수집 시간: $(date)" >> hr_system_debug.log
echo "" >> hr_system_debug.log

echo "=== 시스템 정보 ===" >> hr_system_debug.log
uname -a >> hr_system_debug.log
python3 --version >> hr_system_debug.log
node --version >> hr_system_debug.log
echo "" >> hr_system_debug.log

echo "=== 디스크 사용량 ===" >> hr_system_debug.log
df -h >> hr_system_debug.log
echo "" >> hr_system_debug.log

echo "=== 메모리 사용량 ===" >> hr_system_debug.log
free -h >> hr_system_debug.log
echo "" >> hr_system_debug.log

echo "=== 실행 중인 프로세스 ===" >> hr_system_debug.log
ps aux | grep -E "(python|node)" >> hr_system_debug.log
echo "" >> hr_system_debug.log

echo "=== 포트 사용 현황 ===" >> hr_system_debug.log
netstat -tulpn | grep -E "(5007|5173)" >> hr_system_debug.log
echo "" >> hr_system_debug.log

echo "진단 정보가 hr_system_debug.log 파일에 저장되었습니다."
```

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2025년 7월 25일  
**작성자**: Manus AI Assistant

