# 궁극의 HR ERP 시스템 복구 체크리스트
## 다른 마누스 환경에서 100% 성공 보장

---

## 🎯 체크리스트 사용법

이 체크리스트는 **순서대로 진행**하며, 각 단계를 완료한 후 체크박스를 표시하세요.  
❌가 나타나면 해당 문제 해결 후 다음 단계로 진행하세요.

---

## 📋 Phase 1: 사전 환경 검증 (5분)

### 시스템 요구사항 확인
- [ ] **운영체제 확인**
  ```bash
  uname -a
  # Ubuntu 20.04+, CentOS 8+, macOS 10.15+ 권장
  ```

- [ ] **메모리 확인 (최소 4GB)**
  ```bash
  free -h | grep Mem
  # Available 메모리가 2GB 이상이어야 함
  ```

- [ ] **디스크 공간 확인 (최소 2GB)**
  ```bash
  df -h .
  # 현재 디렉토리에 2GB 이상 여유 공간 필요
  ```

- [ ] **인터넷 연결 확인**
  ```bash
  ping -c 3 google.com
  # 패킷 손실 0%여야 함
  ```

- [ ] **관리자 권한 확인**
  ```bash
  sudo echo "권한 테스트"
  # "권한 테스트" 출력되어야 함
  ```

### 필수 소프트웨어 설치

#### Ubuntu/Debian 환경
- [ ] **시스템 업데이트**
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

- [ ] **필수 패키지 설치**
  ```bash
  sudo apt install -y curl wget git build-essential python3-dev libffi-dev libssl-dev
  ```

- [ ] **Python 3.11+ 설치**
  ```bash
  sudo apt install -y python3.11 python3.11-pip python3.11-venv
  python3.11 --version  # 3.11.x 출력 확인
  ```

- [ ] **Node.js 20+ 설치**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  node --version  # v20.x.x 출력 확인
  npm --version   # 10.x.x 출력 확인
  ```

#### CentOS/RHEL 환경
- [ ] **시스템 업데이트**
  ```bash
  sudo yum update -y
  ```

- [ ] **개발 도구 설치**
  ```bash
  sudo yum groupinstall -y "Development Tools"
  sudo yum install -y curl wget git python3-devel openssl-devel libffi-devel
  ```

- [ ] **Python 3.11 소스 컴파일 설치**
  ```bash
  cd /tmp
  wget https://www.python.org/ftp/python/3.11.7/Python-3.11.7.tgz
  tar xzf Python-3.11.7.tgz
  cd Python-3.11.7
  ./configure --enable-optimizations
  make altinstall
  sudo ln -sf /usr/local/bin/python3.11 /usr/bin/python3.11
  python3.11 --version  # 3.11.7 출력 확인
  ```

- [ ] **Node.js 20+ 설치**
  ```bash
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo yum install -y nodejs
  node --version  # v20.x.x 출력 확인
  ```

#### macOS 환경
- [ ] **Homebrew 설치 (없는 경우)**
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

- [ ] **필수 패키지 설치**
  ```bash
  brew install python@3.11 node@20 git
  echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
  source ~/.zshrc
  python3.11 --version  # 3.11.x 출력 확인
  node --version         # v20.x.x 출력 확인
  ```

---

## 📋 Phase 2: 저장소 클론 및 기본 설정 (2분)

- [ ] **작업 디렉토리 생성**
  ```bash
  mkdir -p ~/projects
  cd ~/projects
  pwd  # /home/username/projects 또는 유사한 경로 출력
  ```

- [ ] **GitHub에서 저장소 클론**
  ```bash
  git clone https://github.com/kikoon-ek/hr-erp.git
  cd hr-erp
  ```

- [ ] **디렉토리 구조 확인**
  ```bash
  ls -la
  # 다음 항목들이 보여야 함:
  # hr_backend/, hr_frontend/, README.md, DEPLOYMENT.md 등
  ```

- [ ] **실행 권한 설정**
  ```bash
  chmod +x setup.sh 2>/dev/null || true
  chmod +x hr_backend/run.sh 2>/dev/null || true
  chmod +x hr_frontend/build.sh 2>/dev/null || true
  ```

- [ ] **포트 사용 확인**
  ```bash
  # 포트 5007, 5173이 사용 중이 아닌지 확인
  netstat -tln | grep :5007 || echo "포트 5007 사용 가능"
  netstat -tln | grep :5173 || echo "포트 5173 사용 가능"
  ```

---

## 📋 Phase 3: 백엔드 환경 설정 (5분)

- [ ] **백엔드 디렉토리로 이동**
  ```bash
  cd hr_backend
  pwd  # .../hr-erp/hr_backend 출력 확인
  ```

- [ ] **Python 가상환경 생성**
  ```bash
  python3.11 -m venv venv
  ls -la venv/  # bin/, lib/, include/ 디렉토리 확인
  ```

- [ ] **가상환경 활성화**
  ```bash
  source venv/bin/activate  # Linux/macOS
  # 또는 Windows: venv\Scripts\activate
  which python  # venv/bin/python 경로 출력 확인
  ```

- [ ] **pip 업그레이드**
  ```bash
  pip install --upgrade pip
  pip --version  # 최신 버전 확인
  ```

- [ ] **의존성 파일 확인**
  ```bash
  cat requirements.txt
  # Flask, SQLAlchemy, bcrypt 등이 포함되어 있어야 함
  ```

- [ ] **의존성 설치**
  ```bash
  pip install -r requirements.txt
  # 오류 없이 모든 패키지 설치 완료 확인
  ```

- [ ] **설치된 패키지 확인**
  ```bash
  pip list | grep -E "(Flask|SQLAlchemy|bcrypt|PyJWT)"
  # 주요 패키지들이 설치되어 있어야 함
  ```

- [ ] **환경 변수 파일 생성**
  ```bash
  cat > .env << EOF
  SECRET_KEY=hr-erp-secret-key-$(date +%s)
  JWT_SECRET_KEY=jwt-secret-key-$(date +%s)
  DATABASE_URL=sqlite:///instance/hr_system.db
  FLASK_ENV=development
  FLASK_DEBUG=True
  EOF
  cat .env  # 환경 변수 내용 확인
  ```

- [ ] **데이터베이스 디렉토리 생성**
  ```bash
  mkdir -p instance
  chmod 755 instance
  ls -la instance/  # 디렉토리 생성 및 권한 확인
  ```

- [ ] **데이터베이스 초기화**
  ```bash
  python -c "
  from src.main import app
  from src.database import init_db
  with app.app_context():
      init_db()
      print('✅ 데이터베이스 초기화 완료')
  "
  # "✅ 데이터베이스 초기화 완료" 메시지 확인
  ```

- [ ] **데이터베이스 파일 생성 확인**
  ```bash
  ls -la instance/
  # hr_system.db 파일이 생성되어 있어야 함
  ```

- [ ] **백엔드 서버 시작 테스트**
  ```bash
  timeout 10s python src/main.py || true
  # "Running on http://127.0.0.1:5007" 메시지 확인 후 자동 종료
  ```

---

## 📋 Phase 4: 프론트엔드 환경 설정 (3분)

- [ ] **프론트엔드 디렉토리로 이동**
  ```bash
  cd ../hr_frontend
  pwd  # .../hr-erp/hr_frontend 출력 확인
  ```

- [ ] **package.json 파일 확인**
  ```bash
  cat package.json | grep -E "(react|vite|tailwindcss)"
  # React, Vite, TailwindCSS 의존성 확인
  ```

- [ ] **npm 캐시 정리**
  ```bash
  npm cache clean --force
  ```

- [ ] **Node.js 의존성 설치**
  ```bash
  npm install
  # 오류 없이 모든 패키지 설치 완료 확인
  ```

- [ ] **설치된 패키지 확인**
  ```bash
  ls -la node_modules/ | head -10
  # node_modules 디렉토리에 패키지들이 설치되어 있어야 함
  ```

- [ ] **빌드 테스트**
  ```bash
  npm run build
  # "✓ built in" 메시지와 함께 빌드 성공 확인
  ```

- [ ] **빌드 결과 확인**
  ```bash
  ls -la dist/
  # index.html, assets/ 디렉토리 등이 생성되어 있어야 함
  ```

- [ ] **개발 서버 시작 테스트**
  ```bash
  timeout 10s npm run dev || true
  # "Local: http://localhost:5173/" 메시지 확인 후 자동 종료
  ```

---

## 📋 Phase 5: 서버 시작 및 기본 검증 (3분)

### 백엔드 서버 시작
- [ ] **새 터미널에서 백엔드 시작**
  ```bash
  cd ~/projects/hr-erp/hr_backend
  source venv/bin/activate
  python src/main.py
  ```

- [ ] **백엔드 서버 응답 확인**
  ```bash
  # 다른 터미널에서 실행
  curl -X GET http://localhost:5007/api/employees
  # JSON 형태의 응답 확인 (빈 배열이라도 정상)
  ```

### 프론트엔드 서버 시작
- [ ] **새 터미널에서 프론트엔드 시작**
  ```bash
  cd ~/projects/hr-erp/hr_frontend
  npm run dev
  ```

- [ ] **프론트엔드 서버 응답 확인**
  ```bash
  curl -I http://localhost:5173/
  # "HTTP/1.1 200 OK" 응답 확인
  ```

### 기본 API 테스트
- [ ] **로그인 API 테스트**
  ```bash
  curl -X POST http://localhost:5007/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}'
  # access_token이 포함된 JSON 응답 확인
  ```

- [ ] **직원 목록 API 테스트**
  ```bash
  curl -X GET http://localhost:5007/api/employees
  # JSON 배열 형태의 응답 확인
  ```

---

## 📋 Phase 6: 웹 인터페이스 검증 (2분)

### 브라우저 접속 테스트
- [ ] **프론트엔드 페이지 접속**
  - 브라우저에서 `http://localhost:5173` 접속
  - 로그인 페이지가 정상적으로 표시되어야 함

- [ ] **관리자 로그인 테스트**
  - 사용자명: `admin`
  - 비밀번호: `admin123`
  - 로그인 성공 후 관리자 대시보드 표시 확인

- [ ] **사용자 로그인 테스트**
  - 로그아웃 후 다시 로그인
  - 사용자명: `kim.cs`
  - 비밀번호: `user123`
  - 로그인 성공 후 사용자 대시보드 표시 확인

### 주요 기능 테스트
- [ ] **직원 관리 페이지 접속**
  - 관리자로 로그인 후 "직원 관리" 메뉴 클릭
  - 직원 목록이 표시되어야 함

- [ ] **출퇴근 관리 페이지 접속**
  - "출퇴근 관리" 메뉴 클릭
  - 출퇴근 기록이 표시되어야 함

- [ ] **연차 관리 페이지 접속**
  - "연차 관리" 메뉴 클릭
  - 연차 부여 내역이 표시되어야 함

---

## 📋 Phase 7: 고급 기능 검증 (3분)

### 데이터 조작 테스트
- [ ] **새 직원 추가 테스트**
  - 직원 관리 → "직원 추가" 버튼 클릭
  - 폼 작성 후 저장
  - 직원 목록에 새 직원이 추가되었는지 확인

- [ ] **출퇴근 기록 추가 테스트**
  - 출퇴근 관리 → "출근 기록 추가" 버튼 클릭
  - 기록 저장 후 목록에 반영되었는지 확인

- [ ] **연차 신청 테스트**
  - 사용자로 로그인 → "연차 관리" 메뉴
  - 연차 신청 후 관리자 페이지에서 승인 처리

### API 응답 시간 테스트
- [ ] **API 성능 확인**
  ```bash
  time curl -X GET http://localhost:5007/api/employees
  # 응답 시간이 1초 이내여야 함
  ```

- [ ] **대용량 데이터 처리 테스트**
  ```bash
  # 여러 번 연속 API 호출
  for i in {1..5}; do
    curl -X GET http://localhost:5007/api/employees > /dev/null 2>&1
    echo "API 호출 $i 완료"
  done
  ```

---

## 📋 Phase 8: 보안 및 안정성 검증 (2분)

### 인증 시스템 테스트
- [ ] **잘못된 로그인 정보 테스트**
  ```bash
  curl -X POST http://localhost:5007/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrongpassword"}'
  # 401 Unauthorized 응답 확인
  ```

- [ ] **토큰 없이 API 접근 테스트**
  ```bash
  curl -X POST http://localhost:5007/api/employees \
    -H "Content-Type: application/json" \
    -d '{}'
  # 401 Unauthorized 응답 확인
  ```

### 데이터 무결성 테스트
- [ ] **데이터베이스 백업 테스트**
  ```bash
  cd hr_backend
  cp instance/hr_system.db instance/hr_system_backup.db
  ls -la instance/
  # 백업 파일 생성 확인
  ```

- [ ] **로그 파일 확인**
  ```bash
  # 백엔드 터미널에서 로그 메시지 확인
  # 오류 메시지가 없어야 함
  ```

---

## 📋 Phase 9: 최종 검증 및 문서화 (1분)

### 시스템 상태 최종 확인
- [ ] **프로세스 상태 확인**
  ```bash
  ps aux | grep -E "(python|node)" | grep -v grep
  # Python(백엔드)과 Node.js(프론트엔드) 프로세스 실행 중 확인
  ```

- [ ] **포트 사용 확인**
  ```bash
  netstat -tln | grep -E ":(5007|5173)"
  # 두 포트 모두 LISTEN 상태여야 함
  ```

- [ ] **메모리 사용량 확인**
  ```bash
  free -h
  # 사용 가능한 메모리가 1GB 이상 남아있어야 함
  ```

### 접속 정보 정리
- [ ] **접속 URL 확인**
  - 프론트엔드: http://localhost:5173
  - 백엔드 API: http://localhost:5007

- [ ] **테스트 계정 확인**
  - 관리자: admin / admin123
  - 사용자: kim.cs / user123
  - 사용자: lee.yh / user123
  - 사용자: park.ms / user123
  - 사용자: jung.sj / user123

---

## 🎉 복구 완료 확인

### ✅ 모든 체크박스가 완료되었다면:

**🎯 축하합니다! HR ERP 시스템이 성공적으로 복구되었습니다.**

### 📊 시스템 현황
- **백엔드**: Flask API 서버 (포트 5007)
- **프론트엔드**: React 개발 서버 (포트 5173)
- **데이터베이스**: SQLite (15개 테이블, 샘플 데이터 포함)
- **인증**: JWT 기반 역할별 접근 제어

### 🚀 사용 가능한 기능
- ✅ 직원 관리 (CRUD)
- ✅ 부서 관리
- ✅ 출퇴근 기록 및 통계
- ✅ 연차 관리 및 신청
- ✅ 급여명세서 관리
- ✅ 성과급 계산
- ✅ 대시보드 및 리포트
- ✅ 사용자별 개인 페이지

### 📚 추가 문서
- `README.md`: 프로젝트 개요
- `DEPLOYMENT.md`: 배포 가이드
- `TROUBLESHOOTING.md`: 문제 해결
- `API_DOCUMENTATION.md`: API 문서

---

## ❌ 문제 발생 시 대응

### 체크리스트 중 실패한 항목이 있다면:

1. **해당 단계의 오류 메시지 확인**
2. `TROUBLESHOOTING.md` 문서 참조
3. `RECOVERY_ISSUES_ANALYSIS.md` 문서에서 해결책 찾기
4. 환경 정보 수집 후 지원 요청

### 긴급 복구 방법
```bash
# 전체 재설치
cd ~/projects
rm -rf hr-erp
git clone https://github.com/kikoon-ek/hr-erp.git
cd hr-erp
chmod +x auto_setup.sh
./auto_setup.sh
```

---

**이 체크리스트를 완료하면 어떤 마누스 환경에서도 완전한 HR ERP 시스템을 사용할 수 있습니다!** 🎯

