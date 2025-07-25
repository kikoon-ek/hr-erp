import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: 'http://localhost:5007/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request 인터셉터 - 모든 요청에 토큰 추가
api.interceptors.request.use(
  (config) => {
    let token = null;
    
    // 1. localStorage에서 직접 확인
    const directToken = localStorage.getItem('access_token');
    if (directToken) {
      token = directToken;
    }
    
    // 2. zustand persist에서 확인
    const authData = localStorage.getItem('auth-storage');
    if (!token && authData) {
      try {
        const parsed = JSON.parse(authData);
        token = parsed.state?.accessToken;
      } catch (e) {
        console.error('Auth data parsing error:', e);
      }
    }
    
    // 3. axios 기본 헤더에서 확인
    if (!token && api.defaults.headers.common['Authorization']) {
      token = api.defaults.headers.common['Authorization'].replace('Bearer ', '');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Token added to request:', token.substring(0, 20) + '...');
    } else {
      console.warn('No token found for request');
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth Store 생성
const useAuthStore = create(
  persist(
    (set, get) => ({
      // 상태
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 액션
      login: async (username, password) => {
        set({ isLoading: true, error: null })

        try {
          const response = await api.post('/auth/login', {
            username,
            password,
          })

          const { access_token, refresh_token, user } = response.data

          // localStorage에 토큰 저장
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          // Axios 기본 헤더에 토큰 설정
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

          set({
            user,
            accessToken: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })

          return { success: true }
        } catch (error) {
          const errorMessage = error.response?.data?.error || '로그인 중 오류가 발생했습니다.'
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          })
          return { success: false, error: errorMessage }
        }
      },

      logout: async () => {
        const { accessToken } = get()
        
        try {
          if (accessToken) {
            await api.post('/auth/logout')
          }
        } catch (error) {
          console.error('로그아웃 요청 실패:', error)
        } finally {
          // 로컬 상태 초기화
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          delete api.defaults.headers.common['Authorization']
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      getCurrentUser: async () => {
        try {
          const response = await api.get('/auth/me')
          const { user, employee } = response.data
          
          set({ 
            user: { ...user, employee },
            error: null 
          })
          
          return { success: true, user, employee }
        } catch (error) {
          const errorMessage = error.response?.data?.error || '사용자 정보 조회 실패'
          set({ error: errorMessage })
          return { success: false, error: errorMessage }
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true, error: null })
        
        try {
          await api.post('/change-password', {
            current_password: currentPassword,
            new_password: newPassword,
          })

          set({ isLoading: false, error: null })
          return { success: true }
        } catch (error) {
          const errorMessage = error.response?.data?.error || '비밀번호 변경 실패'
          set({ isLoading: false, error: errorMessage })
          return { success: false, error: errorMessage }
        }
      },

      initializeAuth: () => {
        // localStorage에서 직접 토큰 확인
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (accessToken) {
          try {
            // JWT 토큰에서 사용자 정보 추출
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            const user = {
              id: payload.user_id,
              username: payload.username,
              role: payload.role
            };
            
            // Axios 헤더에 토큰 설정
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            
            // 상태 업데이트 (user 정보 포함)
            set({ 
              user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            
            // 사용자 정보 갱신 (백그라운드에서)
            get().getCurrentUser();
          } catch (error) {
            console.error('토큰 파싱 오류:', error);
            // 토큰이 유효하지 않으면 로그아웃 처리
            get().logout();
          }
        } else {
          // 토큰이 없으면 로그아웃 상태로 설정
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Response 인터셉터 - 401 오류 시 로그아웃 처리 (토큰 갱신 제거)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 로그인 API는 401 오류 시 처리하지 않음
    if (error.response?.status === 401 && !error.config.url.includes('/login')) {
      console.log('인증 실패, 로그아웃 처리');
      
      // 즉시 로그아웃
      const authStore = useAuthStore.getState();
      authStore.logout();
      
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API 인스턴스를 외부에서 사용할 수 있도록 export
export { api, useAuthStore }
export default useAuthStore

