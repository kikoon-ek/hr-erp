// API 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5007';

// API 호출 헬퍼 함수
export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// 특정 API 엔드포인트들
export const API_ENDPOINTS = {
  // 인증
  LOGIN: '/api/login',
  LOGOUT: '/api/logout',
  REFRESH: '/api/refresh',
  
  // 성과급 관리
  BONUS_POLICIES: '/api/bonus-policies',
  BONUS_BUDGETS: '/api/bonus-budgets',
  
  // 성과 기준 관리
  TARGET_CATEGORIES: '/api/target-categories',
  COMPANY_TARGETS: '/api/company-targets',
  DEPARTMENT_TARGETS: '/api/department-targets',
  EMPLOYEE_TARGETS: '/api/employee-targets',
  
  // 월별 평가
  MONTHLY_EVALUATIONS: '/api/monthly-evaluations',
  ANNUAL_BONUS: '/api/annual-bonus',
  
  // 기타
  EMPLOYEES: '/api/employees',
  DEPARTMENTS: '/api/departments',
};

export default API_BASE_URL;

