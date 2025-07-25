import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { 
  Clock, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  LogIn,
  LogOut,
  Timer,
  BarChart3
} from 'lucide-react';

const AttendanceUser = () => {
  const { user, api } = useAuthStore();
  const [attendanceData, setAttendanceData] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    loadAttendanceData();
    loadTodayAttendance();
    loadStatistics();
  }, [selectedMonth]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(selectedMonth + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      const endDateStr = endDate.toISOString().split('T')[0];

      const response = await api.get(`/attendance?employee_id=${user?.employee?.id}&start_date=${startDate}&end_date=${endDateStr}`);
      setAttendanceData(response.data);
    } catch (error) {
      console.error('출퇴근 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/attendance?employee_id=${user?.employee?.id}&date=${today}`);
      setTodayAttendance(response.data.length > 0 ? response.data[0] : null);
    } catch (error) {
      console.error('오늘 출퇴근 데이터 로딩 실패:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await api.get(`/attendance/statistics?employee_id=${user?.employee?.id}&month=${selectedMonth}`);
      setStatistics(response.data);
    } catch (error) {
      console.error('출퇴근 통계 로딩 실패:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      const now = new Date();
      const checkInData = {
        employee_id: user?.employee?.id,
        date: now.toISOString().split('T')[0],
        check_in_time: now.toTimeString().split(' ')[0],
        status: 'present'
      };

      await api.post('/attendance', checkInData);
      await loadTodayAttendance();
      alert('출근이 완료되었습니다.');
    } catch (error) {
      console.error('출근 처리 실패:', error);
      alert('출근 처리에 실패했습니다.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setCheckingOut(true);
      const now = new Date();
      const checkOutData = {
        check_out_time: now.toTimeString().split(' ')[0]
      };

      await api.put(`/attendance/${todayAttendance.id}`, checkOutData);
      await loadTodayAttendance();
      alert('퇴근이 완료되었습니다.');
    } catch (error) {
      console.error('퇴근 처리 실패:', error);
      alert('퇴근 처리에 실패했습니다.');
    } finally {
      setCheckingOut(false);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'present': { text: '정상출근', color: 'bg-green-100 text-green-800' },
      'late': { text: '지각', color: 'bg-yellow-100 text-yellow-800' },
      'early_leave': { text: '조퇴', color: 'bg-orange-100 text-orange-800' },
      'absent': { text: '결근', color: 'bg-red-100 text-red-800' },
      'on_leave': { text: '연차', color: 'bg-blue-100 text-blue-800' }
    };
    
    const statusInfo = statusMap[status] || { text: '미확인', color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* 오늘의 출퇴근 현황 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">오늘의 출퇴근</h2>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{currentTime}</p>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 출근 시간 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <LogIn className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">출근 시간</h3>
            <p className="text-2xl font-bold text-blue-600">
              {formatTime(todayAttendance?.check_in_time)}
            </p>
            {!todayAttendance?.check_in_time && (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {checkingIn ? '처리 중...' : '출근하기'}
              </button>
            )}
          </div>

          {/* 퇴근 시간 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">퇴근 시간</h3>
            <p className="text-2xl font-bold text-green-600">
              {formatTime(todayAttendance?.check_out_time)}
            </p>
            {todayAttendance?.check_in_time && !todayAttendance?.check_out_time && (
              <button
                onClick={handleCheckOut}
                disabled={checkingOut}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {checkingOut ? '처리 중...' : '퇴근하기'}
              </button>
            )}
          </div>

          {/* 근무 시간 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Timer className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">근무 시간</h3>
            <p className="text-2xl font-bold text-purple-600">
              {todayAttendance?.working_hours || '-'}
            </p>
            {todayAttendance && (
              <div className="mt-3">
                {getStatusBadge(todayAttendance.status)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 이번 달 통계 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 근무일</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total_days}일</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">정상 출근</p>
                <p className="text-2xl font-bold text-green-600">{statistics.present_days}일</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">지각</p>
                <p className="text-2xl font-bold text-yellow-600">{statistics.late_days}일</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">출근율</p>
                <p className="text-2xl font-bold text-indigo-600">{statistics.attendance_rate}%</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 월별 출퇴근 기록 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">출퇴근 기록</h2>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-600">조회 월:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    날짜
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    출근시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    퇴근시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    근무시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    비고
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceData.length > 0 ? (
                  attendanceData.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(record.check_in_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(record.check_out_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.working_hours || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.notes || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      출퇴근 기록이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 근무 시간 차트 (향후 구현) */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">근무 시간 추이</h2>
          <BarChart3 className="w-6 h-6 text-gray-400" />
        </div>
        <div className="text-center py-12 text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>근무 시간 차트는 준비 중입니다.</p>
        </div>
      </div>
    </div>
  );
};

export default AttendanceUser;

