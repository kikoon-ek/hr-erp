import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  Building2, 
  Target, 
  DollarSign, 
  Clock, 
  Calendar, 
  Receipt, 
  FileText, 
  Shield,
  Menu,
  X,
  LogOut,
  TrendingUp,
  Calculator,
  Award,
  Bell,
  Settings
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const AdminLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // 알림 데이터 로드 (추후 API 연동)
  useEffect(() => {
    // TODO: 실제 알림 API 호출로 교체
    // fetchNotifications();
  }, []);

  // 외부 클릭 시 알림 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationOpen && !event.target.closest('.notification-dropdown')) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationOpen]);

  // 기존 메뉴 구조 그대로 유지
  const menuCategories = [
    {
      category: '인사 관리',
      items: [
        { name: '대시보드', path: '/admin/dashboard', icon: BarChart3 },
        { name: '직원 관리', path: '/admin/employees', icon: Users },
        { name: '부서 관리', path: '/admin/departments', icon: Building2 }
      ]
    },
    {
      category: '평가 및 성과급',
      items: [
        { name: '평가 기준', path: '/admin/evaluation-criteria', icon: Target },
        { name: '성과급 정책', path: '/admin/bonus-policy', icon: DollarSign },
        { name: '성과 기준 관리', path: '/admin/performance-targets', icon: TrendingUp },
        { name: '성과 평가', path: '/admin/performance-evaluation', icon: Award },
        { name: '성과급 계산', path: '/admin/bonus-calculation', icon: Calculator },
        { name: '급여명세서 관리', path: '/admin/payroll', icon: Receipt },
      ]
    },
    {
      category: '출근 및 연차 관리',
      items: [
        { name: '출퇴근 관리', path: '/admin/attendance', icon: Clock },
        { name: '근무시간 설정', path: '/admin/work-schedules', icon: Settings },
        { name: '연차 관리', path: '/admin/annual-leave', icon: Calendar },
      ]
    },
    {
      category: '리포트 및 분석',
      items: [
        { name: '대시보드 및 리포트', path: '/admin/reports', icon: TrendingUp },
      ]
    },
    {
      category: '시스템',
      items: [
        { name: '감사 로그', path: '/admin/audit-logs', icon: Shield },
      ]
    }
  ];

  const handleLogout = () => {
    logout();
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* 모바일 사이드바 오버레이 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
        </div>
      )}

      {/* 사이드바 */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        transition-transform duration-300 ease-in-out 
        lg:relative lg:translate-x-0 lg:flex lg:flex-col lg:w-64
      `}>
        
        {/* 로고 및 헤더 */}
        <div className="flex items-center justify-between h-16 px-6 bg-gradient-to-r from-blue-600 to-blue-700 flex-shrink-0">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-white" />
            <span className="ml-3 text-xl font-bold text-white tracking-tight">HR 시스템</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-blue-200 transition-colors p-1 rounded-md"
            aria-label="사이드바 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 사용자 정보 */}
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {user?.username?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="ml-3">
              <div className="text-sm font-semibold text-gray-900">관리자</div>
              <div className="text-xs text-gray-500">{user?.email || 'admin@company.com'}</div>
            </div>
          </div>
        </div>

        {/* 메뉴 네비게이션 */}
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {menuCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-2">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {category.category}
              </h3>
              <div className="space-y-1">
                {category.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(item.path);
                  return (
                    <Link
                      key={itemIndex}
                      to={item.path}
                      className={`
                        group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                        ${isActive
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600 shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className={`
                        mr-3 h-5 w-5 transition-colors
                        ${isActive 
                          ? 'text-blue-600' 
                          : 'text-gray-400 group-hover:text-gray-600'
                        }
                      `} />
                      <span className="truncate">{item.name}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* 로그아웃 버튼 */}
        <div className="px-4 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-700 transition-all duration-200 group"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors" />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 헤더 */}
        <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0 z-10">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-700 lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="메뉴 열기"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 알림 드롭다운 */}
              <div className="relative notification-dropdown">
                <button 
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
                >
                  <Bell className="h-5 w-5" />
                  {/* 읽지 않은 알림 배지 */}
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>

                {/* 알림 드롭다운 메뉴 */}
                {notificationOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="text-lg font-semibold text-gray-900">알림</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 ${
                                notification.type === 'info' ? 'bg-blue-500' :
                                notification.type === 'warning' ? 'bg-yellow-500' :
                                notification.type === 'success' ? 'bg-green-500' : 'bg-gray-500'
                              }`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                  {notification.time}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>새로운 알림이 없습니다</p>
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-gray-100">
                      <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
                        모든 알림 보기
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 사용자 프로필 */}
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {user?.username?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900">관리자</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

