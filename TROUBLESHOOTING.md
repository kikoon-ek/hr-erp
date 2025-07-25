# HR ERP 시스템 문제 해결 가이드

## 🎯 목적
이 문서는 HR ERP 시스템 운영 중 발생할 수 있는 일반적인 문제들과 해결 방법을 제공합니다.

## 🚨 긴급 문제 해결

### 시스템 전체 다운
```bash
# 1. 모든 프로세스 확인
ps aux | grep -E "(python|node)"

# 2. 포트 사용 확인
sudo lsof -i :5007 -i :5173

# 3. 프로세스 강제 종료
sudo pkill -f "python.*main.py"
sudo pkill -f "node.*vite"

# 4. 서비스 재시작
cd ~/workspace/hrerp/hr_backend && source venv/bin/activate && python src/main.py &
cd ~/workspace/hrerp/hr_frontend && npm run dev &
```

### 데이터베이스 손상
```bash
# 1. 데이터베이스 백업 생성
cp hr_backend/instance/hr_system.db hr_backend/instance/hr_system_backup_$(date +%Y%m%d_%H%M%S).db

# 2. 데이터베이스 무결성 검사
sqlite3 hr_backend/instance/hr_system.db "PRAGMA integrity_check;"

# 3. 데이터베이스 재생성 (최후 수단)
rm hr_backend/instance/hr_system.db
cd hr_backend && python src/main.py
```

## 🔧 백엔드 문제 해결

### 1. Flask 서버 시작 실패

#### 문제: ModuleNotFoundError
```bash
# 증상
ModuleNotFoundError: No module named 'flask'

# 해결
cd hr_backend
source venv/bin/activate
pip install -r requirements.txt
```

#### 문제: 포트 이미 사용 중
```bash
# 증상
OSError: [Errno 98] Address already in use

# 해결
sudo lsof -i :5007
sudo kill -9 <PID>
# 또는 다른 포트 사용
export FLASK_RUN_PORT=5008
```

#### 문제: 데이터베이스 연결 실패
```bash
# 증상
sqlite3.OperationalError: unable to open database file

# 해결
mkdir -p hr_backend/instance
chmod 755 hr_backend/instance
cd hr_backend && python src/main.py
```

### 2. API 응답 오류

#### 문제: 401 Unauthorized
```bash
# 증상
{"message": "Token has expired"}

# 해결 - 토큰 재발급
curl -X POST http://localhost:5007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

#### 문제: 500 Internal Server Error
```bash
# 증상
Internal Server Error

# 해결 - 로그 확인
cd hr_backend
python src/main.py  # 터미널에서 오류 메시지 확인

# 데이터베이스 스키마 확인
sqlite3 instance/hr_system.db ".schema"
```

#### 문제: CORS 오류
```bash
# 증상
Access to fetch at 'http://localhost:5007' from origin 'http://localhost:5173' has been blocked by CORS policy

# 해결 - Flask-CORS 설정 확인
# hr_backend/src/main.py에서 CORS 설정 확인
from flask_cors import CORS
CORS(app, origins=["http://localhost:5173"])
```

### 3. 데이터베이스 문제

#### 문제: 테이블이 존재하지 않음
```bash
# 증상
sqlite3.OperationalError: no such table: users

# 해결
cd hr_backend
python -c "
from src.main import app
from src.database import init_db
with app.app_context():
    init_db()
"
```

#### 문제: 외래 키 제약 조건 위반
```bash
# 증상
sqlite3.IntegrityError: FOREIGN KEY constraint failed

# 해결 - 데이터 정합성 확인
sqlite3 instance/hr_system.db "
SELECT * FROM employees WHERE user_id NOT IN (SELECT id FROM users);
SELECT * FROM attendance_records WHERE employee_id NOT IN (SELECT id FROM employees);
"
```

## 🎨 프론트엔드 문제 해결

### 1. React 개발 서버 문제

#### 문제: npm install 실패
```bash
# 증상
npm ERR! peer dep missing

# 해결
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
```

#### 문제: Vite 빌드 실패
```bash
# 증상
Error: Build failed with errors

# 해결
# 1. 노드 버전 확인
node --version  # v20+ 필요

# 2. 의존성 재설치
rm -rf node_modules
npm install

# 3. 캐시 정리
rm -rf .vite
npm run build
```

#### 문제: 개발 서버 접속 불가
```bash
# 증상
This site can't be reached

# 해결
# 1. 포트 확인
netstat -tulpn | grep 5173

# 2. 방화벽 확인
sudo ufw status
sudo ufw allow 5173

# 3. 호스트 바인딩 확인
npm run dev -- --host 0.0.0.0
```

### 2. 인증 문제

#### 문제: 로그인 후 리다이렉트 실패
```javascript
// 증상: 로그인 성공 후 잘못된 페이지로 이동

// 해결: authStore.js 확인
const login = async (username, password) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    const { token, user } = response.data;
    
    // 토큰 저장
    localStorage.setItem('token', token);
    set({ token, user, isAuthenticated: true });
    
    // 역할별 리다이렉트
    if (user.role === 'admin') {
      window.location.href = '/admin/dashboard';
    } else {
      window.location.href = '/user/dashboard';
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

#### 문제: API 호출 시 토큰 누락
```javascript
// 증상: 401 Unauthorized 오류

// 해결: API 인터셉터 확인
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 3. UI/UX 문제

#### 문제: 데이터 로딩 실패
```javascript
// 증상: "데이터를 불러올 수 없습니다" 메시지

// 해결: useEffect 의존성 확인
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setError('데이터를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  if (user?.employee?.id) {  // 사용자 정보가 있을 때만 호출
    fetchData();
  }
}, [user?.employee?.id]);
```

#### 문제: 스타일링 깨짐
```bash
# 증상: CSS 스타일이 적용되지 않음

# 해결
# 1. Tailwind CSS 빌드 확인
npm run build:css

# 2. 캐시 정리
rm -rf .vite
npm run dev

# 3. 브라우저 캐시 정리
# Ctrl+Shift+R (하드 리프레시)
```

## 🔐 보안 문제 해결

### 1. JWT 토큰 문제

#### 문제: 토큰 만료
```python
# 백엔드에서 토큰 만료 시간 조정
from datetime import timedelta

app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
```

#### 문제: 토큰 검증 실패
```python
# JWT 시크릿 키 확인
app.config['JWT_SECRET_KEY'] = 'your-secret-key-here'

# 토큰 디코딩 테스트
import jwt
token = "your-token-here"
try:
    payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
    print("Token valid:", payload)
except jwt.ExpiredSignatureError:
    print("Token expired")
except jwt.InvalidTokenError:
    print("Invalid token")
```

### 2. 비밀번호 문제

#### 문제: 비밀번호 해싱 실패
```python
# bcrypt 설정 확인
import bcrypt

password = "user123"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
print("Hashed password:", hashed.decode('utf-8'))

# 비밀번호 검증
is_valid = bcrypt.checkpw(password.encode('utf-8'), hashed)
print("Password valid:", is_valid)
```

## 📊 성능 문제 해결

### 1. 느린 응답 시간

#### 데이터베이스 쿼리 최적화
```sql
-- 인덱스 확인
.indices

-- 쿼리 실행 계획 확인
EXPLAIN QUERY PLAN SELECT * FROM employees WHERE department_id = 1;

-- 필요한 인덱스 추가
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, date);
```

#### API 응답 캐싱
```python
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'simple'})

@app.route('/api/employees')
@cache.cached(timeout=300)  # 5분 캐싱
def get_employees():
    # 직원 목록 조회 로직
    pass
```

### 2. 메모리 사용량 증가

#### 메모리 누수 확인
```bash
# 프로세스 메모리 사용량 모니터링
ps aux | grep -E "(python|node)" | awk '{print $2, $4, $11}'

# 메모리 사용량 지속 모니터링
watch -n 5 'ps aux | grep -E "(python|node)"'
```

#### 데이터베이스 연결 풀 설정
```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    'sqlite:///hr_system.db',
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600
)
```

## 🔄 백업 및 복구 문제

### 1. 백업 실패

#### Git 저장소 문제
```bash
# Git 저장소 상태 확인
git status
git log --oneline -5

# 저장소 복구
git fsck
git gc --prune=now

# 원격 저장소 동기화
git fetch origin
git reset --hard origin/master
```

#### 데이터베이스 백업 문제
```bash
# SQLite 백업
sqlite3 instance/hr_system.db ".backup backup.db"

# 백업 파일 검증
sqlite3 backup.db "PRAGMA integrity_check;"

# 백업에서 복구
cp backup.db instance/hr_system.db
```

### 2. 복구 실패

#### 의존성 버전 충돌
```bash
# Python 의존성 고정
pip freeze > requirements_frozen.txt

# 정확한 버전으로 설치
pip install -r requirements_frozen.txt

# Node.js 의존성 고정
npm shrinkwrap
```

#### 환경 변수 누락
```bash
# 환경 변수 설정 스크립트 생성
cat > setup_env.sh << 'EOF'
#!/bin/bash
export FLASK_ENV=development
export FLASK_DEBUG=1
export SECRET_KEY=your-secret-key-here
export JWT_SECRET_KEY=your-jwt-secret-key
export DATABASE_URL=sqlite:///instance/hr_system.db
EOF

chmod +x setup_env.sh
source setup_env.sh
```

## 📞 지원 요청 시 필요한 정보

### 시스템 정보 수집
```bash
#!/bin/bash
# 문제 진단을 위한 정보 수집 스크립트

echo "=== HR ERP 시스템 진단 정보 ===" > system_info.txt
echo "수집 시간: $(date)" >> system_info.txt
echo "" >> system_info.txt

echo "=== 시스템 환경 ===" >> system_info.txt
uname -a >> system_info.txt
python3 --version >> system_info.txt
node --version >> system_info.txt
npm --version >> system_info.txt
git --version >> system_info.txt
echo "" >> system_info.txt

echo "=== 디스크 사용량 ===" >> system_info.txt
df -h >> system_info.txt
echo "" >> system_info.txt

echo "=== 메모리 사용량 ===" >> system_info.txt
free -h >> system_info.txt
echo "" >> system_info.txt

echo "=== 네트워크 상태 ===" >> system_info.txt
netstat -tulpn | grep -E "(5007|5173)" >> system_info.txt
echo "" >> system_info.txt

echo "=== 실행 중인 프로세스 ===" >> system_info.txt
ps aux | grep -E "(python|node)" | grep -v grep >> system_info.txt
echo "" >> system_info.txt

echo "=== Git 상태 ===" >> system_info.txt
cd ~/workspace/hrerp 2>/dev/null && git status >> system_info.txt
echo "" >> system_info.txt

echo "=== 최근 로그 (마지막 50줄) ===" >> system_info.txt
journalctl -n 50 >> system_info.txt

echo "시스템 정보가 system_info.txt에 저장되었습니다."
```

### 오류 로그 수집
```bash
# 백엔드 오류 로그
cd hr_backend
python src/main.py 2>&1 | tee backend_error.log

# 프론트엔드 빌드 로그
cd hr_frontend
npm run build 2>&1 | tee frontend_build.log

# 시스템 로그
journalctl -u hr-erp --since "1 hour ago" > system.log
```

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2025년 7월 25일  
**작성자**: Manus AI Assistant

