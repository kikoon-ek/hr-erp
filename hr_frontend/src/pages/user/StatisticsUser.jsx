import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Award,
  Target,
  DollarSign,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react';

const StatisticsUser = () => {
  const { user, api } = useAuthStore();
  const [statistics, setStatistics] = useState({
    attendance: null,
    leave: null,
    payroll: null,
    performance: null
  });
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, [selectedPeriod, selectedYear]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      // 출근 통계
      const attendanceResponse = await api.get(`/attendance/statistics?employee_id=${user?.employee?.id}&period=${selectedPeriod}&year=${selectedYear}`);
      const leaveResponse = await api.get(`/annual-leave/statistics?employee_id=${user?.employee?.id}&year=${selectedYear}`);
      const payrollResponse = await api.get(`/payroll/statistics?employee_id=${user?.employee?.id}&year=${selectedYear}`);
      // const performanceResponse = await api.get(`/performance/statistics?employee_id=${user?.employee?.id}&year=${selectedYear}`);

      setStatistics({
        attendance: attendanceResponse.data,
        leave: leaveResponse.data,
        payroll: payrollResponse.data,
        performance: null // 향후 구현
      });
    } catch (error) {
      console.error('통계 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0';
    return amount.toLocaleString() + '원';
  };

  const getAttendanceGrade = (rate) => {
    if (rate >= 95) return { grade: 'A+', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (rate >= 90) return { grade: 'A', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (rate >= 85) return { grade: 'B+', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (rate >= 80) return { grade: 'B', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (rate >= 75) return { grade: 'C+', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    if (rate >= 70) return { grade: 'C', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { grade: 'D', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const attendanceGrade = statistics.attendance ? getAttendanceGrade(statistics.attendance.attendance_rate) : null;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">내 통계</h1>
            <p className="text-gray-600 mt-1">개인 성과 및 활동 통계를 확인하세요</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="month">월별</option>
              <option value="quarter">분기별</option>
              <option value="year">연간</option>
            </select>
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2023, 2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 종합 점수 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">종합 평가</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 출근 등급 */}
            {attendanceGrade && (
              <div className="text-center">
                <div className={`w-20 h-20 ${attendanceGrade.bgColor} rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <span className={`text-2xl font-bold ${attendanceGrade.color}`}>
                    {attendanceGrade.grade}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">출근 등급</h3>
                <p className="text-sm text-gray-600">출근율 {statistics.attendance?.attendance_rate}%</p>
              </div>
            )}
            
            {/* 연차 활용도 */}
            {statistics.leave && (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">연차 활용도</h3>
                <p className="text-sm text-gray-600">
                  {statistics.leave.used_days}/{statistics.leave.total_days}일 사용
                </p>
              </div>
            )}
            
            {/* 성과 점수 (향후 구현) */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-500">성과 점수</h3>
              <p className="text-sm text-gray-400">준비 중</p>
            </div>
          </div>
        </div>
      </div>

      {/* 출근 통계 */}
      {statistics.attendance && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">출근 통계</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{statistics.attendance.total_days}일</h3>
              <p className="text-sm text-gray-600">총 근무일</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{statistics.attendance.present_days}일</h3>
              <p className="text-sm text-gray-600">정상 출근</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Activity className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{statistics.attendance.late_days}일</h3>
              <p className="text-sm text-gray-600">지각</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{statistics.attendance.attendance_rate}%</h3>
              <p className="text-sm text-gray-600">출근율</p>
            </div>
          </div>

          {/* 출근 패턴 차트 (향후 구현) */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">출근 패턴</h3>
              <BarChart3 className="w-6 h-6 text-gray-400" />
            </div>
            <div className="text-center py-8 text-gray-500">
              <LineChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>출근 패턴 차트는 준비 중입니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* 연차 통계 */}
      {statistics.leave && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">연차 통계</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{statistics.leave.total_days}일</h3>
              <p className="text-sm text-gray-600">부여된 연차</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Activity className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{statistics.leave.used_days}일</h3>
              <p className="text-sm text-gray-600">사용한 연차</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{statistics.leave.remaining_days}일</h3>
              <p className="text-sm text-gray-600">잔여 연차</p>
            </div>
          </div>

          {/* 연차 사용률 */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">연차 사용률</h3>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(statistics.leave.used_days / statistics.leave.total_days) * 100}%` 
                }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>0일</span>
              <span>{Math.round((statistics.leave.used_days / statistics.leave.total_days) * 100)}% 사용</span>
              <span>{statistics.leave.total_days}일</span>
            </div>
          </div>
        </div>
      )}

      {/* 급여 통계 */}
      {statistics.payroll && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">급여 통계</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {formatCurrency(statistics.payroll.total_gross_pay)}
              </h3>
              <p className="text-sm text-gray-600">연간 총 급여</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {formatCurrency(statistics.payroll.average_monthly_pay)}
              </h3>
              <p className="text-sm text-gray-600">월 평균 급여</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {formatCurrency(statistics.payroll.total_bonus)}
              </h3>
              <p className="text-sm text-gray-600">총 성과급</p>
            </div>
          </div>

          {/* 급여 추이 차트 (향후 구현) */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">급여 추이</h3>
              <TrendingUp className="w-6 h-6 text-gray-400" />
            </div>
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>급여 추이 차트는 준비 중입니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* 성과 통계 (향후 구현) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">성과 통계</h2>
        
        <div className="text-center py-12 text-gray-500">
          <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">성과 평가 시스템 준비 중</h3>
          <p className="text-gray-400">성과 평가 및 목표 관리 기능이 곧 제공됩니다.</p>
        </div>
      </div>

      {/* 개선 제안 */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">개선 제안</h2>
        
        <div className="space-y-4">
          {statistics.attendance && statistics.attendance.attendance_rate < 90 && (
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-yellow-800">출근율 개선</h3>
                <p className="text-sm text-yellow-700">
                  현재 출근율이 {statistics.attendance.attendance_rate}%입니다. 
                  규칙적인 출근으로 90% 이상 달성을 목표로 해보세요.
                </p>
              </div>
            </div>
          )}
          
          {statistics.leave && (statistics.leave.used_days / statistics.leave.total_days) < 0.5 && (
            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold text-blue-800">연차 활용</h3>
                <p className="text-sm text-blue-700">
                  연차 사용률이 낮습니다. 적절한 휴식으로 업무 효율성을 높여보세요.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h3 className="font-semibold text-green-800">지속적인 성장</h3>
              <p className="text-sm text-green-700">
                꾸준한 자기계발과 목표 달성으로 더 나은 성과를 만들어가세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsUser;

