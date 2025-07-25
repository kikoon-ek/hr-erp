import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { 
  Calendar, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  CalendarDays,
  FileText,
  TrendingUp
} from 'lucide-react';

const AnnualLeaveUser = () => {
  const { user, api } = useAuthStore();
  const [leaveData, setLeaveData] = useState({
    granted: [],
    used: [],
    requests: [],
    remaining: null
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    start_date: '',
    end_date: '',
    leave_type: 'annual',
    reason: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLeaveData();
  }, [selectedYear]);

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      
      // 연차 부여 내역
      const grantedResponse = await api.get(`/annual-leave/granted?employee_id=${user?.employee?.id}&year=${selectedYear}`);
      const usedResponse = await api.get(`/annual-leave/used?employee_id=${user?.employee?.id}&year=${selectedYear}`);
      const requestsResponse = await api.get(`/annual-leave/requests?employee_id=${user?.employee?.id}&year=${selectedYear}`);
      const remainingResponse = await api.get(`/annual-leave/remaining/${user?.employee?.id}?year=${selectedYear}`);

      setLeaveData({
        granted: grantedResponse.data,
        used: usedResponse.data,
        requests: requestsResponse.data,
        remaining: remainingResponse.data
      });
    } catch (error) {
      console.error('연차 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    
    if (new Date(requestForm.start_date) > new Date(requestForm.end_date)) {
      alert('종료일은 시작일보다 늦어야 합니다.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/annual-leave/requests', {
        ...requestForm,
        employee_id: user?.employee?.id
      });
      
      setShowRequestModal(false);
      setRequestForm({
        start_date: '',
        end_date: '',
        leave_type: 'annual',
        reason: ''
      });
      
      await loadLeaveData();
      alert('연차 신청이 완료되었습니다.');
    } catch (error) {
      console.error('연차 신청 실패:', error);
      alert('연차 신청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { text: '대기중', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'approved': { text: '승인됨', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'rejected': { text: '반려됨', color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const statusInfo = statusMap[status] || { text: '미확인', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    const Icon = statusInfo.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {statusInfo.text}
      </span>
    );
  };

  const getLeaveTypeName = (type) => {
    const typeMap = {
      'annual': '연차',
      'sick': '병가',
      'personal': '개인사유',
      'maternity': '출산휴가',
      'paternity': '육아휴가'
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 연차 현황 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">부여된 연차</p>
              <p className="text-2xl font-bold text-blue-600">
                {leaveData.remaining?.total_days || 0}일
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">사용한 연차</p>
              <p className="text-2xl font-bold text-orange-600">
                {leaveData.remaining?.used_days || 0}일
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">잔여 연차</p>
              <p className="text-2xl font-bold text-green-600">
                {leaveData.remaining?.remaining_days || 0}일
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">대기 중인 신청</p>
              <p className="text-2xl font-bold text-purple-600">
                {leaveData.requests.filter(req => req.status === 'pending').length}건
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 연차 신청 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">연차 신청</h2>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-600">조회 연도:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2023, 2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>연차 신청</span>
            </button>
          </div>
        </div>

        {/* 신청 내역 */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  신청일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  휴가 종류
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시작일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  종료일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  일수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사유
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveData.requests.length > 0 ? (
                leaveData.requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getLeaveTypeName(request.leave_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(request.start_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(request.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {calculateDays(request.start_date, request.end_date)}일
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {request.reason || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    연차 신청 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 연차 사용 내역 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">연차 사용 내역</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용일자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  휴가 종류
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용일수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  승인자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  비고
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveData.used.length > 0 ? (
                leaveData.used.map((usage) => (
                  <tr key={usage.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(usage.usage_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getLeaveTypeName(usage.leave_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usage.days_used}일
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usage.approved_by || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {usage.notes || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    연차 사용 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 연차 신청 모달 */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">연차 신청</h3>
            
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">휴가 종류</label>
                <select
                  value={requestForm.leave_type}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, leave_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="annual">연차</option>
                  <option value="sick">병가</option>
                  <option value="personal">개인사유</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">시작일</label>
                <input
                  type="date"
                  value={requestForm.start_date}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">종료일</label>
                <input
                  type="date"
                  value={requestForm.end_date}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">신청 사유</label>
                <textarea
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="신청 사유를 입력하세요"
                  required
                />
              </div>
              
              {requestForm.start_date && requestForm.end_date && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    신청 일수: {calculateDays(requestForm.start_date, requestForm.end_date)}일
                  </p>
                  <p className="text-sm text-blue-600">
                    잔여 연차: {leaveData.remaining?.remaining_days || 0}일
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestForm({
                      start_date: '',
                      end_date: '',
                      leave_type: 'annual',
                      reason: ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? '신청 중...' : '신청'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnualLeaveUser;

