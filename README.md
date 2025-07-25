# HR ERP 통합 관리 시스템

## 📋 프로젝트 개요

완전한 기능을 갖춘 HR(인사) 관리 시스템으로, 직원 관리, 출퇴근 관리, 연차 관리, 급여 관리, 성과 평가 등의 기능을 제공합니다.

### 🎯 주요 기능

#### 관리자 기능
- **직원 관리**: 직원 정보 등록, 수정, 조회
- **부서 관리**: 부서 생성, 수정, 삭제
- **출퇴근 관리**: 출퇴근 기록 조회, 수정, 통계
- **연차 관리**: 연차 부여, 사용 내역, 신청 승인
- **급여 관리**: 급여명세서 생성, 조회, 관리
- **성과 평가**: 평가 기준 설정, 성과급 계산
- **대시보드**: 전체 시스템 현황 및 통계

#### 사용자 기능
- **개인 대시보드**: 개인 업무 현황 요약
- **내 정보**: 개인정보 조회 및 수정
- **출퇴근 현황**: 개인 출퇴근 기록 및 통계
- **연차 관리**: 연차 신청 및 사용 내역 조회
- **급여명세서**: 개인 급여 내역 조회
- **개인 통계**: 개인 성과 및 통계 조회

## 🏗️ 시스템 아키텍처

### 백엔드 (Flask)
```
hr_backend/
├── src/
│   ├── main.py              # Flask 애플리케이션 진입점
│   ├── database.py          # 데이터베이스 설정
│   ├── models/              # 데이터 모델
│   │   ├── __init__.py
│   │   ├── user.py          # 사용자 모델
│   │   ├── employee.py      # 직원 모델
│   │   ├── department.py    # 부서 모델
│   │   ├── attendance_record.py  # 출퇴근 기록
│   │   ├── annual_leave_*.py     # 연차 관련 모델
│   │   ├── payroll_record.py     # 급여 기록
│   │   └── ...
│   ├── routes/              # API 라우트
│   │   ├── __init__.py
│   │   ├── auth.py          # 인증 관련 API
│   │   ├── employee.py      # 직원 관리 API
│   │   ├── attendance.py    # 출퇴근 관리 API
│   │   ├── annual_leave.py  # 연차 관리 API
│   │   ├── payroll.py       # 급여 관리 API
│   │   └── ...
│   └── utils/
│       └── jwt_helper.py    # JWT 토큰 유틸리티
└── requirements.txt         # Python 의존성
```

### 프론트엔드 (React + Vite)
```
hr_frontend/
├── src/
│   ├── App.jsx              # 메인 애플리케이션
│   ├── components/          # 공통 컴포넌트
│   │   └── layout/
│   │       ├── AdminLayout.jsx   # 관리자 레이아웃
│   │       └── UserLayout.jsx    # 사용자 레이아웃
│   ├── pages/               # 페이지 컴포넌트
│   │   ├── admin/           # 관리자 페이지
│   │   │   ├── EmployeeManagement.jsx
│   │   │   ├── AttendanceManagement.jsx
│   │   │   ├── AnnualLeaveManagement.jsx
│   │   │   ├── PayrollManagement.jsx
│   │   │   └── ...
│   │   └── user/            # 사용자 페이지
│   │       ├── Dashboard.jsx
│   │       ├── MyProfile.jsx
│   │       ├── AttendanceUser.jsx
│   │       ├── AnnualLeaveUser.jsx
│   │       └── ...
│   ├── stores/              # 상태 관리
│   │   └── authStore.js     # 인증 상태 관리
│   └── ...
├── package.json             # Node.js 의존성
└── vite.config.js          # Vite 설정
```

## 🚀 설치 및 실행 가이드

### 1. 시스템 요구사항
- Python 3.11+
- Node.js 20+
- SQLite3

### 2. 백엔드 설정

```bash
# 백엔드 디렉토리로 이동
cd hr_backend

# 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# 또는 venv\Scripts\activate  # Windows

# 의존성 설치
pip install -r requirements.txt

# 데이터베이스 초기화
python src/main.py

# 서버 실행 (기본 포트: 5007)
python src/main.py
```

### 3. 프론트엔드 설정

```bash
# 프론트엔드 디렉토리로 이동
cd hr_frontend

# 의존성 설치
npm install

# 개발 서버 실행 (기본 포트: 5173)
npm run dev

# 프로덕션 빌드
npm run build
```

### 4. 기본 계정 정보

#### 관리자 계정
- **사용자명**: admin
- **비밀번호**: admin123

#### 일반 사용자 계정
- **사용자명**: kim.cs, lee.yh, park.ms, jung.sj
- **비밀번호**: user123

## 🔧 환경 설정

### 백엔드 환경 변수
```python
# src/main.py에서 설정
SECRET_KEY = 'your-secret-key-here'
DATABASE_URL = 'sqlite:///hr_system.db'
JWT_SECRET_KEY = 'your-jwt-secret-key'
```

### 프론트엔드 환경 설정
```javascript
// src/stores/authStore.js에서 API 기본 URL 설정
const API_BASE_URL = 'http://localhost:5007'
```

## 📊 데이터베이스 스키마

### 주요 테이블
- **users**: 사용자 계정 정보
- **employees**: 직원 상세 정보
- **departments**: 부서 정보
- **attendance_records**: 출퇴근 기록
- **annual_leave_grants**: 연차 부여 내역
- **annual_leave_usage**: 연차 사용 내역
- **annual_leave_requests**: 연차 신청
- **payroll_records**: 급여 기록
- **bonus_calculations**: 성과급 계산
- **audit_logs**: 감사 로그

## 🔐 보안 기능

### 인증 및 권한
- **JWT 토큰 기반 인증**
- **역할 기반 접근 제어** (관리자/사용자)
- **API 엔드포인트 보호**
- **비밀번호 해싱** (bcrypt)

### 감사 로그
- 모든 중요한 작업에 대한 로그 기록
- 사용자 행동 추적
- 데이터 변경 이력 관리

## 🧪 테스트

### 백엔드 테스트
```bash
cd hr_backend
python -m pytest tests/
```

### 프론트엔드 테스트
```bash
cd hr_frontend
npm test
```

## 📈 성능 최적화

### 백엔드
- SQLite 데이터베이스 최적화
- API 응답 캐싱
- 페이지네이션 구현

### 프론트엔드
- React Query를 통한 데이터 캐싱
- 컴포넌트 지연 로딩
- 번들 크기 최적화

## 🔄 배포

### 개발 환경
```bash
# 백엔드
cd hr_backend && python src/main.py

# 프론트엔드
cd hr_frontend && npm run dev
```

### 프로덕션 환경
```bash
# 프론트엔드 빌드
cd hr_frontend && npm run build

# 백엔드에 정적 파일 복사
cp -r hr_frontend/dist/* hr_backend/src/static/

# 프로덕션 서버 실행
cd hr_backend && python src/main.py
```

## 🐛 문제 해결

### 일반적인 문제들

#### 1. 백엔드 서버 시작 실패
```bash
# 포트 충돌 확인
lsof -i :5007

# 가상환경 활성화 확인
which python
```

#### 2. 프론트엔드 빌드 실패
```bash
# 노드 모듈 재설치
rm -rf node_modules package-lock.json
npm install
```

#### 3. 데이터베이스 연결 오류
```bash
# 데이터베이스 파일 권한 확인
ls -la hr_backend/instance/

# 데이터베이스 재생성
rm hr_backend/instance/hr_system.db
python hr_backend/src/main.py
```

## 📝 API 문서

### 인증 API
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 현재 사용자 정보
- `GET /api/auth/profile` - 사용자 프로필 조회
- `PUT /api/auth/profile` - 사용자 프로필 수정
- `PUT /api/auth/change-password` - 비밀번호 변경

### 직원 관리 API
- `GET /api/employees` - 직원 목록 조회
- `POST /api/employees` - 직원 등록
- `GET /api/employees/{id}` - 직원 상세 조회
- `PUT /api/employees/{id}` - 직원 정보 수정
- `DELETE /api/employees/{id}` - 직원 삭제

### 출퇴근 관리 API
- `GET /api/attendance` - 출퇴근 기록 조회
- `POST /api/attendance` - 출퇴근 기록 등록
- `GET /api/attendance/stats` - 출퇴근 통계

### 연차 관리 API
- `GET /api/annual-leave/grants` - 연차 부여 내역
- `POST /api/annual-leave/grants` - 연차 부여
- `GET /api/annual-leave/usage` - 연차 사용 내역
- `POST /api/annual-leave/requests` - 연차 신청

## 🤝 기여 가이드

### 개발 환경 설정
1. 저장소 클론
2. 백엔드 및 프론트엔드 의존성 설치
3. 개발 서버 실행
4. 기능 개발 및 테스트

### 코드 스타일
- **Python**: PEP 8 준수
- **JavaScript**: ESLint 설정 준수
- **커밋 메시지**: Conventional Commits 형식

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 지원

문제가 발생하거나 질문이 있으시면 이슈를 등록해 주세요.

---

**개발 완료일**: 2025년 7월 25일  
**버전**: 1.0.0  
**개발자**: Manus AI Assistant

