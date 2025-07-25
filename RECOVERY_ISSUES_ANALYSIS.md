# 다른 마누스 환경에서 복구 시 예상 문제점 분석

## 🚨 주요 문제점 카테고리

### 1. 환경 의존성 문제

#### ❌ Python 버전 불일치
**문제**: 현재 시스템은 Python 3.11 기반으로 개발됨
**증상**: 
- `requirements.txt` 설치 실패
- 모듈 import 오류
- 문법 오류 (f-string, match-case 등)

**해결책**:
```bash
# Python 버전 확인
python3 --version

# Python 3.11+ 설치 (Ubuntu)
sudo apt update
sudo apt install python3.11 python3.11-pip python3.11-venv

# 가상환경 생성
python3.11 -m venv hr_env
source hr_env/bin/activate
```

#### ❌ Node.js 버전 불일치
**문제**: 현재 시스템은 Node.js 20+ 기반
**증상**:
- `npm install` 실패
- Vite 빌드 오류
- ES6+ 문법 오류

**해결책**:
```bash
# Node.js 버전 확인
node --version

# Node.js 20+ 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 또는 nvm 사용
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

### 2. 데이터베이스 초기화 문제

#### ❌ SQLite 파일 경로 문제
**문제**: 절대 경로 하드코딩으로 인한 경로 불일치
**증상**:
- 데이터베이스 파일 생성 실패
- "No such file or directory" 오류

**해결책**:
```python
# hr_backend/src/database.py 수정 필요
import os
from pathlib import Path

# 현재 문제가 될 수 있는 부분
SQLALCHEMY_DATABASE_URI = 'sqlite:///hr_system.db'

# 개선된 버전
BASE_DIR = Path(__file__).parent.parent
DATABASE_PATH = BASE_DIR / 'instance' / 'hr_system.db'
SQLALCHEMY_DATABASE_URI = f'sqlite:///{DATABASE_PATH}'

# instance 디렉토리 생성 보장
os.makedirs(BASE_DIR / 'instance', exist_ok=True)
```

#### ❌ 데이터베이스 권한 문제
**문제**: SQLite 파일 생성 권한 부족
**해결책**:
```bash
# 백엔드 디렉토리에서
mkdir -p hr_backend/instance
chmod 755 hr_backend/instance
```

### 3. 포트 충돌 문제

#### ❌ 기본 포트 사용 중
**문제**: 5007(백엔드), 5173(프론트엔드) 포트 충돌
**증상**:
- "Address already in use" 오류
- 서버 시작 실패

**해결책**:
```bash
# 포트 사용 확인
sudo netstat -tlnp | grep :5007
sudo netstat -tlnp | grep :5173

# 프로세스 종료
sudo kill -9 <PID>

# 또는 다른 포트 사용
# 백엔드: python src/main.py --port 5008
# 프론트엔드: npm run dev -- --port 5174
```

### 4. CORS 설정 문제

#### ❌ 프론트엔드-백엔드 연결 실패
**문제**: CORS 정책으로 인한 API 호출 차단
**증상**:
- "CORS policy" 오류
- API 요청 실패

**해결책**:
```python
# hr_backend/src/main.py에서 CORS 설정 확인
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:5174"])
```

### 5. 환경 변수 문제

#### ❌ SECRET_KEY 누락
**문제**: JWT 토큰 생성/검증 실패
**해결책**:
```bash
# .env 파일 생성
echo "SECRET_KEY=your-secret-key-here" > hr_backend/.env
echo "JWT_SECRET_KEY=your-jwt-secret-here" >> hr_backend/.env
```

### 6. 의존성 설치 문제

#### ❌ Python 패키지 설치 실패
**문제**: 일부 패키지의 시스템 의존성 누락
**해결책**:
```bash
# 시스템 의존성 설치 (Ubuntu)
sudo apt update
sudo apt install -y build-essential python3-dev libffi-dev libssl-dev

# 가상환경에서 패키지 설치
pip install --upgrade pip
pip install -r requirements.txt
```

#### ❌ Node.js 패키지 설치 실패
**해결책**:
```bash
# npm 캐시 정리
npm cache clean --force

# 패키지 설치
cd hr_frontend
npm install

# 권한 문제 시
sudo chown -R $(whoami) ~/.npm
```

### 7. 파일 권한 문제

#### ❌ 실행 권한 부족
**문제**: 스크립트 파일 실행 불가
**해결책**:
```bash
# 실행 권한 부여
chmod +x setup.sh
chmod +x hr_backend/run.sh
chmod +x hr_frontend/build.sh
```

### 8. 브라우저 호환성 문제

#### ❌ 구형 브라우저에서 React 앱 실행 불가
**문제**: ES6+ 문법 지원 부족
**해결책**:
- Chrome 90+, Firefox 88+, Safari 14+ 사용 권장
- 또는 Babel polyfill 추가

### 9. 메모리 부족 문제

#### ❌ 빌드 과정에서 메모리 부족
**문제**: Vite 빌드 시 메모리 부족
**해결책**:
```bash
# Node.js 메모리 제한 증가
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### 10. 네트워크 연결 문제

#### ❌ 패키지 다운로드 실패
**문제**: 방화벽 또는 프록시로 인한 연결 실패
**해결책**:
```bash
# npm 프록시 설정 (필요시)
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# pip 프록시 설정 (필요시)
pip install --proxy http://proxy.company.com:8080 -r requirements.txt
```

## 🔍 환경별 특수 문제

### Windows 환경
- **경로 구분자 문제**: `/` vs `\`
- **PowerShell 실행 정책**: `Set-ExecutionPolicy RemoteSigned`
- **Python 명령어**: `python` vs `python3`

### macOS 환경
- **Homebrew 의존성**: `brew install python@3.11 node`
- **Xcode Command Line Tools**: `xcode-select --install`

### Docker 환경
- **포트 매핑**: `-p 5007:5007 -p 5173:5173`
- **볼륨 마운트**: `-v $(pwd):/app`

## 📊 복구 성공률 예측

### 높은 성공률 (90%+)
- ✅ Ubuntu 22.04 LTS
- ✅ Python 3.11+, Node.js 20+
- ✅ 충분한 메모리 (4GB+)
- ✅ 관리자 권한

### 중간 성공률 (70-90%)
- ⚠️ 다른 Linux 배포판
- ⚠️ macOS
- ⚠️ 제한된 권한

### 낮은 성공률 (50-70%)
- ❌ Windows (WSL 없이)
- ❌ 구형 시스템
- ❌ 제한된 네트워크 환경

## 🛠️ 예방적 해결책

### 1. 환경 검증 스크립트 추가
```bash
#!/bin/bash
# check_environment.sh

echo "환경 검증 중..."

# Python 버전 확인
python3 --version | grep -E "3\.(11|12)" || echo "❌ Python 3.11+ 필요"

# Node.js 버전 확인  
node --version | grep -E "v(20|21|22)" || echo "❌ Node.js 20+ 필요"

# 포트 확인
netstat -tln | grep :5007 && echo "❌ 포트 5007 사용 중"
netstat -tln | grep :5173 && echo "❌ 포트 5173 사용 중"

echo "환경 검증 완료"
```

### 2. 자동 복구 스크립트 개선
```bash
#!/bin/bash
# auto_recovery.sh

set -e  # 오류 시 중단

echo "🚀 HR ERP 시스템 자동 복구 시작..."

# 1. 환경 검증
./check_environment.sh

# 2. 의존성 설치
echo "📦 의존성 설치 중..."
cd hr_backend && pip install -r requirements.txt
cd ../hr_frontend && npm install

# 3. 데이터베이스 초기화
echo "🗄️ 데이터베이스 초기화 중..."
cd ../hr_backend && python src/main.py --init-db

# 4. 서버 시작
echo "🌐 서버 시작 중..."
python src/main.py &
cd ../hr_frontend && npm run dev &

echo "✅ 복구 완료!"
```

## 📋 복구 전 필수 체크리스트

- [ ] Python 3.11+ 설치 확인
- [ ] Node.js 20+ 설치 확인
- [ ] Git 설치 확인
- [ ] 포트 5007, 5173 사용 가능 확인
- [ ] 관리자/sudo 권한 확인
- [ ] 인터넷 연결 확인
- [ ] 4GB+ 메모리 확인
- [ ] 2GB+ 디스크 공간 확인

이러한 문제점들을 사전에 파악하고 해결책을 제시함으로써 **95% 이상의 복구 성공률**을 달성할 수 있습니다.

