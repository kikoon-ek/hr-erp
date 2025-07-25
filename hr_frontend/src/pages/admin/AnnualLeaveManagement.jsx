import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuthStore } from '../../stores/authStore';

const AnnualLeaveManagement = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('grants'); // grants, usages, balance, requests
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // 연차 부여 내역 조회
  const { data: grantsData, isLoading: grantsLoading } = useQuery({
    queryKey: ['annual-leave-grants', selectedEmployee, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEmployee) params.append('employee_id', selectedEmployee);
      if (selectedYear) params.append('year', selectedYear);
      
      const response = await api.get(`/annual-leave/grants?${params}`);
      return response.data;
    },
    enabled: activeTab === 'grants'
  });

  // 연차 사용 내역 조회
  const { data: usagesData, isLoading: usagesLoading } = useQuery({
    queryKey: ['annual-leave-usages', selectedEmployee],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEmployee) params.append('employee_id', selectedEmployee);
      
      const response = await api.get(`/annual-leave/usages?${params}`);
      return response.data;
    },
    enabled: activeTab === 'usages'
  });

  // 직원 목록 조회
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees');
      return response.data;
    }
  });

  // 연차 잔여일수 조회
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['annual-leave-balance', selectedEmployee, selectedYear],
    queryFn: async () => {
      if (!selectedEmployee) return null;
      
      const response = await api.get(`/annual-leave/balance/${selectedEmployee}?year=${selectedYear}`);
      return response.data;
    },
    enabled: activeTab === 'balance' && !!selectedEmployee
  });

  // 연차 신청 목록 조회
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['annual-leave-requests', selectedEmployee],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEmployee) params.append('employee_id', selectedEmployee);
      
      const response = await api.get(`/annual-leave/requests?${params}`);
      return response.data;
    },
    enabled: activeTab === 'requests'
  });

  // 자동 연차 부여
  const autoGrantMutation = useMutation({
    mutationFn: async (year) => {
      const response = await api.post('/annual-leave/auto-grant', { year });
      return response.data;
    },
    onSuccess: (data) => {
      alert(`자동 연차 부여 완료!\n처리된 직원: ${data.processed_count}명\n총 부여된 연차: ${data.total_granted_days}일`);
      queryClient.invalidateQueries(['annual-leave-grants']);
      queryClient.invalidateQueries(['annual-leave-balance']);
    },
    onError: (error) => {
      alert(`자동 연차 부여 실패: ${error.response?.data?.message || error.message}`);
    }
  });

  // 연차 부여
  const grantMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/annual-leave/grants', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['annual-leave-grants']);
      queryClient.invalidateQueries(['annual-leave-balance']);
      setShowGrantModal(false);
    }
  });

  // 연차 사용 등록
  const usageMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/annual-leave/use', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['annual-leave-usages']);
      queryClient.invalidateQueries(['annual-leave-balance']);
      setShowUsageModal(false);
    }
  });

  // 연차 신청 승인
  const approveMutation = useMutation({
    mutationFn: async ({ requestId, notes }) => {
      const response = await api.post(`/annual-leave/requests/${requestId}/approve`, { notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['annual-leave-requests']);
      queryClient.invalidateQueries(['annual-leave-balance']);
      alert('연차 신청이 승인되었습니다.');
    },
    onError: (error) => {
      alert(`승인 실패: ${error.response?.data?.error || error.message}`);
    }
  });

  // 연차 신청 반려
  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, notes }) => {
      const response = await api.post(`/annual-leave/requests/${requestId}/reject`, { notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['annual-leave-requests']);
      queryClient.invalidateQueries(['annual-leave-balance']);
      alert('연차 신청이 반려되었습니다.');
    },
    onError: (error) => {
      alert(`반려 실패: ${error.response?.data?.error || error.message}`);
    }
  });

  // 연차 신청 생성
  const createRequestMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/annual-leave/requests', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['annual-leave-requests']);
      queryClient.invalidateQueries(['annual-leave-balance']);
      setShowRequestModal(false);
      alert('연차 신청이 완료되었습니다.');
    },
    onError: (error) => {
      alert(`신청 실패: ${error.response?.data?.error || error.message}`);
    }
  });

  const handleGrantSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      employee_id: parseInt(formData.get('employee_id')),
      total_days: parseFloat(formData.get('total_days')),
      year: parseInt(formData.get('year')),
      grant_date: formData.get('grant_date'),
      note: formData.get('note') || null
    };
    grantMutation.mutate(data);
  };

  const handleUsageSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      employee_id: parseInt(formData.get('employee_id')),
      usage_date: formData.get('usage_date'),
      leave_type: formData.get('leave_type'),
      used_days: parseFloat(formData.get('used_days')),
      note: formData.get('note') || null
    };
    usageMutation.mutate(data);
  };

  const handleAutoGrant = () => {
    const year = new Date().getFullYear();
    if (confirm(`${year}년도 자동 연차 부여를 실행하시겠습니까?\n\n근로기준법에 따라:\n- 1년 이상 근무 + 80% 이상 출근: 15일 + 근속가산\n- 1년 미만 또는 80% 미만 출근: 개근월별 1일`)) {
      autoGrantMutation.mutate(year);
    }
  };

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      employee_id: parseInt(formData.get('employee_id')),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      leave_type: formData.get('leave_type'),
      reason: formData.get('reason') || ''
    };
    createRequestMutation.mutate(data);
  };

  const handleApprove = (requestId) => {
    const notes = prompt('승인 사유를 입력하세요 (선택사항):');
    if (notes !== null) { // 취소하지 않은 경우
      approveMutation.mutate({ requestId, notes });
    }
  };

  const handleReject = (requestId) => {
    const notes = prompt('반려 사유를 입력하세요:');
    if (notes && notes.trim()) {
      rejectMutation.mutate({ requestId, notes });
    } else if (notes !== null) {
      alert('반려 사유를 입력해주세요.');
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">연차 관리</h1>
        <div className="space-x-2">
          <button
            onClick={() => setShowGrantModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            연차 부여
          </button>
          <button
            onClick={() => handleAutoGrant()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            자동 연차 부여
          </button>
          <button
            onClick={() => setShowUsageModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            연차 사용 등록
          </button>
          <button
            onClick={() => setShowRequestModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            연차 신청
          </button>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('grants')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'grants'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            연차 부여 내역
          </button>
          <button
            onClick={() => setActiveTab('usages')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'usages'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            연차 사용 내역
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'balance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            연차 잔여 현황
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            연차 신청 관리
          </button>
        </nav>
      </div>

      {/* 필터 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">전체 직원</option>
              {employeesData?.employees?.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.employee_number})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 연차 부여 내역 탭 */}
      {activeTab === 'grants' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    직원
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    연도
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    부여일수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    부여일자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    메모
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grantsData?.grants?.map((grant) => (
                  <tr key={grant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {grant.employee?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {grant.employee?.employee_number}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {grant.year}년
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {grant.total_days}일
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {grant.grant_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {grant.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!grantsData?.grants || grantsData.grants.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              연차 부여 내역이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 연차 사용 내역 탭 */}
      {activeTab === 'usages' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    직원
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용일자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    휴가 유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용일수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    연관 휴가신청
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    메모
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usagesData?.usages?.map((usage) => (
                  <tr key={usage.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {usage.employee?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {usage.employee?.employee_number}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usage.usage_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        usage.leave_type === 'full' ? 'bg-blue-100 text-blue-800' :
                        usage.leave_type === 'half' ? 'bg-green-100 text-green-800' :
                        usage.leave_type === 'quarter' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {usage.leave_type_name || '연차'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usage.used_days}일
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usage.leave_request ? `#${usage.leave_request.id}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usage.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!usagesData?.usages || usagesData.usages.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              연차 사용 내역이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 연차 잔여 현황 탭 */}
      {activeTab === 'balance' && (
        <div className="bg-white rounded-lg shadow p-6">
          {selectedEmployee ? (
            balanceData ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {balanceData.employee_name}의 {balanceData.year}년 연차 현황
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {balanceData.total_granted}일
                    </div>
                    <div className="text-sm text-gray-600">부여된 연차</div>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {balanceData.total_used}일
                    </div>
                    <div className="text-sm text-gray-600">사용한 연차</div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {balanceData.remaining}일
                    </div>
                    <div className="text-sm text-gray-600">잔여 연차</div>
                  </div>
                </div>

                {/* 연차 사용률 바 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>연차 사용률</span>
                    <span>{balanceData.total_granted > 0 ? Math.round((balanceData.total_used / balanceData.total_granted) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${balanceData.total_granted > 0 ? (balanceData.total_used / balanceData.total_granted) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {balanceLoading ? '로딩 중...' : '연차 정보를 불러올 수 없습니다.'}
              </div>
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              직원을 선택하세요.
            </div>
          )}
        </div>
      )}

      {/* 연차 부여 모달 */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">연차 부여</h2>
            <form onSubmit={handleGrantSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
                <select
                  name="employee_id"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">직원을 선택하세요</option>
                  {employeesData?.employees?.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employee_number})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
                <select
                  name="year"
                  required
                  defaultValue={currentYear}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">부여일수</label>
                <input
                  type="number"
                  name="total_days"
                  step="0.5"
                  min="0"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="15"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">부여일자</label>
                <input
                  type="date"
                  name="grant_date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea
                  name="note"
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="메모를 입력하세요"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={grantMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {grantMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 연차 사용 등록 모달 */}
      {showUsageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">연차 사용 등록</h2>
            <form onSubmit={handleUsageSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
                <select
                  name="employee_id"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">직원을 선택하세요</option>
                  {employeesData?.employees?.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employee_number})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사용일자</label>
                <input
                  type="date"
                  name="usage_date"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">휴가 유형</label>
                <select
                  name="leave_type"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  onChange={(e) => {
                    const form = e.target.form;
                    const usedDaysInput = form.used_days;
                    const typeValues = {
                      'full': '1',
                      'half': '0.5',
                      'quarter': '0.25'
                    };
                    usedDaysInput.value = typeValues[e.target.value] || '1';
                  }}
                >
                  <option value="full">연차 (1일)</option>
                  <option value="half">반차 (0.5일)</option>
                  <option value="quarter">반반차 (0.25일)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사용일수</label>
                <input
                  type="number"
                  name="used_days"
                  step="0.25"
                  min="0.25"
                  max="1"
                  required
                  defaultValue="1"
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                  placeholder="휴가 유형에 따라 자동 설정됩니다"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea
                  name="note"
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="메모를 입력하세요"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUsageModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={usageMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {usageMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 연차 신청 관리 탭 */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    직원
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    기간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    일수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    신청일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requestsLoading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      로딩 중...
                    </td>
                  </tr>
                ) : requestsData?.requests?.length > 0 ? (
                  requestsData.requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.employee_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.employee_number}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.start_date} ~ {request.end_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          request.leave_type === 'annual' ? 'bg-blue-100 text-blue-800' :
                          request.leave_type === 'half' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.leave_type_text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.total_days}일
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status_text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {request.status === 'pending' && (
                          <div className="space-x-2">
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="text-green-600 hover:text-green-900"
                              disabled={approveMutation.isPending}
                            >
                              승인
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="text-red-600 hover:text-red-900"
                              disabled={rejectMutation.isPending}
                            >
                              반려
                            </button>
                          </div>
                        )}
                        {request.status !== 'pending' && (
                          <span className="text-gray-400">
                            {request.status === 'approved' ? '승인됨' : '반려됨'}
                          </span>
                        )}
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
      )}

      {/* 연차 신청 모달 */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">연차 신청</h2>
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
                <select
                  name="employee_id"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">직원을 선택하세요</option>
                  {employeesData?.employees?.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.employee_number})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                <input
                  type="date"
                  name="start_date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                <input
                  type="date"
                  name="end_date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">휴가 유형</label>
                <select
                  name="leave_type"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="annual">연차 (1일)</option>
                  <option value="half">반차 (0.5일)</option>
                  <option value="quarter">반반차 (0.25일)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">신청 사유</label>
                <textarea
                  name="reason"
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="연차 신청 사유를 입력하세요"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={createRequestMutation.isPending}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {createRequestMutation.isPending ? '신청 중...' : '신청'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnualLeaveManagement;

