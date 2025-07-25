# HR ERP 시스템 배포 및 복구 가이드

## 🎯 목적
이 문서는 HR ERP 시스템을 새로운 환경에서 완전히 복구하고 정상 작동시키기 위한 단계별 가이드입니다.

## 📋 사전 요구사항

### 시스템 요구사항
- **운영체제**: Ubuntu 22.04 LTS (권장) 또는 호환 Linux 배포판
- **Python**: 3.11 이상
- **Node.js**: 20.x 이상
- **메모리**: 최소 2GB RAM
- **저장공간**: 최소 5GB 여유 공간

### 필수 패키지 설치
```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Python 및 개발 도구 설치
sudo apt install -y python3 python3-pip python3-venv python3-dev

# Node.js 설치 (NodeSource 저장소 사용)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 기타 필수 도구
sudo apt install -y git curl wget build-essential sqlite3

# 버전 확인
python3 --version  # 3.11+ 확인
node --version     # v20+ 확인
npm --version      # 10+ 확인
```

## 🔄 시스템 복구 절차

### 1단계: 저장소 클론
```bash
# 작업 디렉토리 생성
mkdir -p ~/workspace
cd ~/workspace

# Git 저장소 클론
git clone <YOUR_REPOSITORY_URL> hrerp
cd hrerp

# 파일 구조 확인
ls -la
```

### 2단계: 백엔드 설정
```bash
# 백엔드 디렉토리로 이동
cd hr_backend

# Python 가상환경 생성
python3 -m venv venv

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치
pip install --upgrade pip
pip install -r requirements.txt

# 데이터베이스 디렉토리 생성
mkdir -p instance
mkdir -p src/database

# 환경 변수 설정 (선택사항)
export FLASK_ENV=development
export FLASK_DEBUG=1
```

### 3단계: 프론트엔드 설정
```bash
# 새 터미널에서 프론트엔드 디렉토리로 이동
cd ~/workspace/hrerp/hr_frontend

# Node.js 의존성 설치
npm install

# 빌드 테스트
npm run build
```

### 4단계: 데이터베이스 초기화
```bash
# 백엔드 디렉토리에서 실행
cd ~/workspace/hrerp/hr_backend
source venv/bin/activate

# 데이터베이스 초기화 및 테스트 데이터 생성
python src/main.py
```

### 5단계: 서비스 시작
```bash
# 터미널 1: 백엔드 서버 시작
cd ~/workspace/hrerp/hr_backend
source venv/bin/activate
python src/main.py
# 서버가 http://localhost:5007에서 실행됨

# 터미널 2: 프론트엔드 개발 서버 시작
cd ~/workspace/hrerp/hr_frontend
npm run dev
# 서버가 http://localhost:5173에서 실행됨
```

## 🧪 시스템 검증

### 1. 백엔드 API 테스트
```bash
# 헬스 체크
curl http://localhost:5007/

# 로그인 테스트
curl -X POST http://localhost:5007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### 2. 프론트엔드 접속 테스트
```bash
# 브라우저에서 접속
# http://localhost:5173

# 관리자 로그인
# 사용자명: admin
# 비밀번호: admin123

# 일반 사용자 로그인
# 사용자명: kim.cs
# 비밀번호: user123
```

### 3. 기능 테스트 체크리스트
- [ ] 관리자 로그인 성공
- [ ] 사용자 로그인 성공
- [ ] 직원 목록 조회
- [ ] 출퇴근 기록 조회
- [ ] 연차 관리 기능
- [ ] 급여명세서 조회
- [ ] 대시보드 데이터 표시

## 🔧 문제 해결

### 일반적인 문제들

#### 1. 포트 충돌 문제
```bash
# 포트 사용 확인
sudo lsof -i :5007  # 백엔드 포트
sudo lsof -i :5173  # 프론트엔드 포트

# 프로세스 종료
sudo kill -9 <PID>
```

#### 2. Python 가상환경 문제
```bash
# 가상환경 재생성
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 3. Node.js 의존성 문제
```bash
# 노드 모듈 재설치
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### 4. 데이터베이스 문제
```bash
# 데이터베이스 파일 삭제 후 재생성
rm -f hr_backend/instance/*.db
rm -f hr_backend/src/database/*.db
cd hr_backend && python src/main.py
```

#### 5. 권한 문제
```bash
# 파일 권한 수정
chmod -R 755 ~/workspace/hrerp
chown -R $USER:$USER ~/workspace/hrerp
```

### 로그 확인
```bash
# 백엔드 로그 (터미널 출력 확인)
cd hr_backend && python src/main.py

# 프론트엔드 로그 (브라우저 개발자 도구 확인)
# F12 -> Console 탭

# 시스템 로그
journalctl -f
```

## 🚀 프로덕션 배포

### 1. 프론트엔드 빌드
```bash
cd hr_frontend
npm run build
```

### 2. 정적 파일 복사
```bash
# 빌드된 파일을 백엔드 static 디렉토리로 복사
cp -r hr_frontend/dist/* hr_backend/src/static/
```

### 3. 프로덕션 서버 실행
```bash
cd hr_backend
source venv/bin/activate

# 프로덕션 모드로 실행
export FLASK_ENV=production
python src/main.py
```

### 4. 리버스 프록시 설정 (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5007;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 성능 모니터링

### 시스템 리소스 확인
```bash
# CPU 및 메모리 사용량
htop

# 디스크 사용량
df -h

# 네트워크 연결 상태
netstat -tulpn | grep :5007
```

### 애플리케이션 모니터링
```bash
# 백엔드 프로세스 확인
ps aux | grep python

# 프론트엔드 프로세스 확인
ps aux | grep node
```

## 🔐 보안 설정

### 1. 환경 변수 설정
```bash
# .env 파일 생성 (hr_backend/.env)
SECRET_KEY=your-very-secure-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
DATABASE_URL=sqlite:///instance/hr_system.db
FLASK_ENV=production
```

### 2. 방화벽 설정
```bash
# UFW 방화벽 설정
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 5007  # 백엔드 포트 직접 접근 차단
```

### 3. SSL 인증서 설정 (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📋 백업 및 복구

### 데이터베이스 백업
```bash
# SQLite 백업
sqlite3 hr_backend/instance/hr_system.db ".backup backup_$(date +%Y%m%d_%H%M%S).db"
```

### 전체 시스템 백업
```bash
# 시스템 전체 백업 (Git 제외)
tar -czf hr_system_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='venv' \
  --exclude='*.log' \
  ~/workspace/hrerp
```

## 📞 지원 및 문의

### 문제 발생 시 확인사항
1. 모든 서비스가 정상 실행 중인지 확인
2. 포트 충돌이 없는지 확인
3. 로그 파일에서 오류 메시지 확인
4. 네트워크 연결 상태 확인
5. 시스템 리소스 사용량 확인

### 로그 수집
```bash
# 시스템 정보 수집
echo "=== 시스템 정보 ===" > debug_info.txt
uname -a >> debug_info.txt
python3 --version >> debug_info.txt
node --version >> debug_info.txt
echo "=== 프로세스 상태 ===" >> debug_info.txt
ps aux | grep -E "(python|node)" >> debug_info.txt
echo "=== 포트 상태 ===" >> debug_info.txt
netstat -tulpn | grep -E "(5007|5173)" >> debug_info.txt
```

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2025년 7월 25일  
**작성자**: Manus AI Assistant

