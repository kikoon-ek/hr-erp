import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { 
  User, 
  Clock, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  CalendarDays,
  Timer,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';

const UserDashboard = () => {
  const { user, api } = useAuthStore();
  const [dashboardData, setDashboardData] = useState({
    todayAttendance: null,
    annualLeaveStatus: null,
    recentPayroll: null,
    pendingRequests: 0,
    loading: true
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));

      // 오늘 출퇴근 현황
      const today = new Date().toISOString().split('T')[0];
      const attendanceResponse = await api.get(`/attendance?date=${today}&employee_id=${user?.employee?.id}`);
      const todayAttendance = attendanceResponse.data.length > 0 ? attendanceResponse.data[0] : null;

      // 연차 현황
      const currentYear = new Date().getFullYear();
      const annualLeaveResponse = await api.get(`/annual-leave/remaining/${user?.employee?.id}?year=${currentYear}`);
      
      // 최근 급여명세서
      const payrollResponse = await api.get(`/payroll?employee_id=${user?.employee?.id}&limit=1`);
      const recentPayroll = payrollResponse.data.length > 0 ? payrollResponse.data[0] : null;

      // 대기 중인 신청 건수
      const requestsResponse = await api.get(`/annual-leave/requests?employee_id=${user?.employee?.id}&status=pending`);
      const pendingRequests = requestsResponse.data.length;

      setDashboardData({
        todayAttendance,
        annualLeaveStatus: annualLeaveResponse.data,
        recentPayroll,
        pendingRequests,
        loading: false
      });
    } catch (error) {
      console.error('대시보드 데이터 로딩 실패:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5);
  };

  const getAttendanceStatus = (attendance) => {
    if (!attendance) return { text: '미출근', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    
    switch (attendance.status) {
      case 'present':
        return { text: '정상출근', color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'late':
        return { text: '지각', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      case 'early_leave':
        return { text: '조퇴', color: 'text-orange-600', bgColor: 'bg-orange-100' };
      case 'absent':
        return { text: '결근', color: 'text-red-600', bgColor: 'bg-red-100' };
      case 'on_leave':
        return { text: '연차', color: 'text-blue-600', bgColor: 'bg-blue-100' };
      default:
        return { text: '미확인', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    }
  };

  if (dashboardData.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const attendanceStatus = getAttendanceStatus(dashboardData.todayAttendance);

  return (
    <div className="space-y-6">
      {/* 환영 메시지 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                안녕하세요, {user?.username}님!
              </h1>
              <p className="text-gray-600 mt-1">
                {new Date().toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${attendanceStatus.bgColor} ${attendanceStatus.color}`}>
              <Clock className="w-4 h-4 mr-1" />
              {attendanceStatus.text}
            </div>
          </div>
        </div>
      </div>

      {/* 오늘의 현황 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 출근 현황 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">오늘 출근</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatTime(dashboardData.todayAttendance?.check_in_time)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link 
              to="/user/attendance"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              출퇴근 관리 →
            </Link>
          </div>
        </div>

        {/* 퇴근 현황 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">오늘 퇴근</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatTime(dashboardData.todayAttendance?.check_out_time)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Timer className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              근무시간: {dashboardData.todayAttendance?.working_hours || '-'}
            </p>
          </div>
        </div>

        {/* 연차 현황 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">잔여 연차</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.annualLeaveStatus?.remaining_days || 0}일
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link 
              to="/user/annual-leave"
              className="text-sm text-orange-600 hover:text-orange-800 font-medium"
            >
              연차 관리 →
            </Link>
          </div>
        </div>

        {/* 대기 중인 신청 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">대기 중인 신청</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.pendingRequests}건
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              승인 대기 중
            </p>
          </div>
        </div>
      </div>

      {/* 빠른 액세스 메뉴 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/user/profile" className="block">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">내 정보</h3>
                <p className="text-sm text-gray-600">개인 정보 확인 및 수정</p>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/user/attendance" className="block">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">출퇴근 현황</h3>
                <p className="text-sm text-gray-600">출퇴근 기록 및 통계</p>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/user/annual-leave" className="block">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">연차 관리</h3>
                <p className="text-sm text-gray-600">연차 신청 및 사용 내역</p>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/user/payroll" className="block">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">급여명세서</h3>
                <p className="text-sm text-gray-600">급여 내역 및 명세서</p>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/user/statistics" className="block">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">내 통계</h3>
                <p className="text-sm text-gray-600">개인 성과 및 통계</p>
              </div>
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-lg shadow p-6 opacity-50">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-500">성과 평가</h3>
              <p className="text-sm text-gray-400">준비 중</p>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 급여명세서 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 급여명세서</h3>
          {dashboardData.recentPayroll ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">지급월</span>
                <span className="text-sm font-medium">{dashboardData.recentPayroll.pay_period}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">기본급</span>
                <span className="text-sm font-medium">
                  {dashboardData.recentPayroll.base_salary?.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">실수령액</span>
                <span className="text-lg font-bold text-green-600">
                  {dashboardData.recentPayroll.net_pay?.toLocaleString()}원
                </span>
              </div>
              <Link 
                to="/user/payroll"
                className="block w-full text-center py-2 px-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                상세 보기
              </Link>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">급여명세서가 없습니다</p>
          )}
        </div>

        {/* 이번 달 출근 요약 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">이번 달 출근 요약</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">총 근무일</span>
              <span className="text-sm font-medium">-일</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">정상 출근</span>
              <span className="text-sm font-medium text-green-600">-일</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">지각</span>
              <span className="text-sm font-medium text-yellow-600">-일</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">연차 사용</span>
              <span className="text-sm font-medium text-blue-600">-일</span>
            </div>
            <Link 
              to="/user/attendance"
              className="block w-full text-center py-2 px-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              상세 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;

