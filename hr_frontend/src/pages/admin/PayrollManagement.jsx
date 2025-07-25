import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuthStore } from '../../stores/authStore';

const PayrollManagement = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('list'); // list, create, summary
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);

  // 급여명세서 목록 조회
  const { data: payrollsData, isLoading: payrollsLoading } = useQuery({
    queryKey: ['payrolls', selectedEmployee, selectedYear, selectedMonth],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEmployee) params.append('employee_id', selectedEmployee);
      if (selectedYear) params.append('year', selectedYear);
      if (selectedMonth) params.append('month', selectedMonth);
      
      const response = await api.get(`/payrolls?${params}`);
      return response.data;
    },
    enabled: activeTab === 'list'
  });

  // 직원 목록 조회
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees');
      return response.data;
    }
  });

  // 급여명세서 요약 조회
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['payroll-summary', selectedYear, selectedMonth],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedMonth) params.append('month', selectedMonth);
      
      const response = await api.get(`/payrolls/summary?${params}`);
      return response.data;
    },
    enabled: activeTab === 'summary'
  });

  // 급여명세서 생성
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/payrolls', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payrolls']);
      queryClient.invalidateQueries(['payroll-summary']);
      setShowCreateModal(false);
      alert('급여명세서가 성공적으로 생성되었습니다.');
    },
    onError: (error) => {
      alert(`급여명세서 생성 실패: ${error.response?.data?.error || error.message}`);
    }
  });

  // 급여명세서 수정
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/payrolls/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payrolls']);
      queryClient.invalidateQueries(['payroll-summary']);
      setEditingPayroll(null);
      alert('급여명세서가 성공적으로 수정되었습니다.');
    },
    onError: (error) => {
      alert(`급여명세서 수정 실패: ${error.response?.data?.error || error.message}`);
    }
  });

  // 급여명세서 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/payrolls/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payrolls']);
      queryClient.invalidateQueries(['payroll-summary']);
      alert('급여명세서가 성공적으로 삭제되었습니다.');
    },
    onError: (error) => {
      alert(`급여명세서 삭제 실패: ${error.response?.data?.error || error.message}`);
    }
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      employee_id: parseInt(formData.get('employee_id')),
      year: parseInt(formData.get('year')),
      month: parseInt(formData.get('month')),
      base_salary: parseFloat(formData.get('base_salary')) || 0,
      position_allowance: parseFloat(formData.get('position_allowance')) || 0,
      meal_allowance: parseFloat(formData.get('meal_allowance')) || 0,
      transport_allowance: parseFloat(formData.get('transport_allowance')) || 0,
      overtime_pay: parseFloat(formData.get('overtime_pay')) || 0,
      night_pay: parseFloat(formData.get('night_pay')) || 0,
      holiday_pay: parseFloat(formData.get('holiday_pay')) || 0,
      bonus: parseFloat(formData.get('bonus')) || 0,
      other_allowances: parseFloat(formData.get('other_allowances')) || 0,
      income_tax: parseFloat(formData.get('income_tax')) || 0,
      resident_tax: parseFloat(formData.get('resident_tax')) || 0,
      national_pension: parseFloat(formData.get('national_pension')) || 0,
      health_insurance: parseFloat(formData.get('health_insurance')) || 0,
      employment_insurance: parseFloat(formData.get('employment_insurance')) || 0,
      long_term_care: parseFloat(formData.get('long_term_care')) || 0,
      other_deductions: parseFloat(formData.get('other_deductions')) || 0,
      work_days: parseInt(formData.get('work_days')) || 0,
      overtime_hours: parseFloat(formData.get('overtime_hours')) || 0,
      night_hours: parseFloat(formData.get('night_hours')) || 0,
      holiday_hours: parseFloat(formData.get('holiday_hours')) || 0,
      memo: formData.get('memo') || ''
    };
    createMutation.mutate(data);
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      base_salary: parseFloat(formData.get('base_salary')) || 0,
      position_allowance: parseFloat(formData.get('position_allowance')) || 0,
      meal_allowance: parseFloat(formData.get('meal_allowance')) || 0,
      transport_allowance: parseFloat(formData.get('transport_allowance')) || 0,
      overtime_pay: parseFloat(formData.get('overtime_pay')) || 0,
      night_pay: parseFloat(formData.get('night_pay')) || 0,
      holiday_pay: parseFloat(formData.get('holiday_pay')) || 0,
      bonus: parseFloat(formData.get('bonus')) || 0,
      other_allowances: parseFloat(formData.get('other_allowances')) || 0,
      income_tax: parseFloat(formData.get('income_tax')) || 0,
      resident_tax: parseFloat(formData.get('resident_tax')) || 0,
      national_pension: parseFloat(formData.get('national_pension')) || 0,
      health_insurance: parseFloat(formData.get('health_insurance')) || 0,
      employment_insurance: parseFloat(formData.get('employment_insurance')) || 0,
      long_term_care: parseFloat(formData.get('long_term_care')) || 0,
      other_deductions: parseFloat(formData.get('other_deductions')) || 0,
      work_days: parseInt(formData.get('work_days')) || 0,
      overtime_hours: parseFloat(formData.get('overtime_hours')) || 0,
      night_hours: parseFloat(formData.get('night_hours')) || 0,
      holiday_hours: parseFloat(formData.get('holiday_hours')) || 0,
      memo: formData.get('memo') || ''
    };
    updateMutation.mutate({ id: editingPayroll.id, data });
  };

  const handleDelete = (payroll) => {
    if (confirm(`${payroll.employee_name}의 ${payroll.year}년 ${payroll.month}월 급여명세서를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(payroll.id);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount || 0);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">급여명세서 관리</h1>
        <div className="space-x-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            급여명세서 등록
          </button>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            급여명세서 목록
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            급여 요약
          </button>
        </nav>
      </div>

      {/* 필터 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">월</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">전체 월</option>
              {months.map(month => (
                <option key={month} value={month}>{month}월</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 급여명세서 목록 탭 */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">급여명세서 목록</h3>
          </div>
          <div className="overflow-x-auto">
            {payrollsLoading ? (
              <div className="p-6 text-center">로딩 중...</div>
            ) : payrollsData?.payrolls?.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">직원</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">년월</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">기본급</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 지급액</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 공제액</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">실수령액</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrollsData.payrolls.map((payroll) => (
                    <tr key={payroll.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{payroll.employee_name}</div>
                          <div className="text-sm text-gray-500">{payroll.employee_number}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payroll.year}년 {payroll.month}월
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(payroll.base_salary)}원
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(payroll.total_payment)}원
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(payroll.total_deductions)}원
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(payroll.net_pay)}원
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setEditingPayroll(payroll)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(payroll)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-gray-500">급여명세서가 없습니다.</div>
            )}
          </div>
        </div>
      )}

      {/* 급여 요약 탭 */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">급여 요약</h3>
          </div>
          <div className="p-6">
            {summaryLoading ? (
              <div className="text-center">로딩 중...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800">총 직원 수</h4>
                  <p className="text-2xl font-bold text-blue-900">{summaryData?.total_employees || 0}명</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800">총 지급액</h4>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(summaryData?.total_payment)}원</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800">총 공제액</h4>
                  <p className="text-2xl font-bold text-red-900">{formatCurrency(summaryData?.total_deductions)}원</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-purple-800">총 실수령액</h4>
                  <p className="text-2xl font-bold text-purple-900">{formatCurrency(summaryData?.total_net_pay)}원</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-800">평균 지급액</h4>
                  <p className="text-2xl font-bold text-yellow-900">{formatCurrency(summaryData?.average_payment)}원</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-indigo-800">평균 실수령액</h4>
                  <p className="text-2xl font-bold text-indigo-900">{formatCurrency(summaryData?.average_net_pay)}원</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 급여명세서 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">급여명세서 등록</h3>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">직원 *</label>
                    <select name="employee_id" required className="w-full border border-gray-300 rounded-md px-3 py-2">
                      <option value="">직원 선택</option>
                      {employeesData?.employees?.map(employee => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} ({employee.employee_number})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">연도 *</label>
                    <select name="year" required className="w-full border border-gray-300 rounded-md px-3 py-2">
                      {years.map(year => (
                        <option key={year} value={year}>{year}년</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">월 *</label>
                    <select name="month" required className="w-full border border-gray-300 rounded-md px-3 py-2">
                      {months.map(month => (
                        <option key={month} value={month}>{month}월</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">지급 항목</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">기본급 *</label>
                      <input type="number" name="base_salary" required min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">직책수당</label>
                      <input type="number" name="position_allowance" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">식대</label>
                      <input type="number" name="meal_allowance" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">교통비</label>
                      <input type="number" name="transport_allowance" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">연장근무수당</label>
                      <input type="number" name="overtime_pay" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">야간근무수당</label>
                      <input type="number" name="night_pay" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">휴일근무수당</label>
                      <input type="number" name="holiday_pay" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">상여금</label>
                      <input type="number" name="bonus" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">기타수당</label>
                      <input type="number" name="other_allowances" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">공제 항목</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">소득세</label>
                      <input type="number" name="income_tax" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">주민세</label>
                      <input type="number" name="resident_tax" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">국민연금</label>
                      <input type="number" name="national_pension" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">건강보험</label>
                      <input type="number" name="health_insurance" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">고용보험</label>
                      <input type="number" name="employment_insurance" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">장기요양보험</label>
                      <input type="number" name="long_term_care" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">기타공제</label>
                      <input type="number" name="other_deductions" min="0" step="1000" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">근무 정보</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">근무일수</label>
                      <input type="number" name="work_days" min="0" max="31" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">연장근무시간</label>
                      <input type="number" name="overtime_hours" min="0" step="0.5" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">야간근무시간</label>
                      <input type="number" name="night_hours" min="0" step="0.5" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">휴일근무시간</label>
                      <input type="number" name="holiday_hours" min="0" step="0.5" className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                  <textarea name="memo" rows="3" className="w-full border border-gray-300 rounded-md px-3 py-2"></textarea>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createMutation.isLoading ? '등록 중...' : '등록'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 급여명세서 수정 모달 */}
      {editingPayroll && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                급여명세서 수정 - {editingPayroll.employee_name} ({editingPayroll.year}년 {editingPayroll.month}월)
              </h3>
              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">지급 항목</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">기본급 *</label>
                      <input type="number" name="base_salary" required min="0" step="1000" defaultValue={editingPayroll.base_salary} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">직책수당</label>
                      <input type="number" name="position_allowance" min="0" step="1000" defaultValue={editingPayroll.position_allowance} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">식대</label>
                      <input type="number" name="meal_allowance" min="0" step="1000" defaultValue={editingPayroll.meal_allowance} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">교통비</label>
                      <input type="number" name="transport_allowance" min="0" step="1000" defaultValue={editingPayroll.transport_allowance} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">연장근무수당</label>
                      <input type="number" name="overtime_pay" min="0" step="1000" defaultValue={editingPayroll.overtime_pay} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">야간근무수당</label>
                      <input type="number" name="night_pay" min="0" step="1000" defaultValue={editingPayroll.night_pay} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">휴일근무수당</label>
                      <input type="number" name="holiday_pay" min="0" step="1000" defaultValue={editingPayroll.holiday_pay} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">상여금</label>
                      <input type="number" name="bonus" min="0" step="1000" defaultValue={editingPayroll.bonus} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">기타수당</label>
                      <input type="number" name="other_allowances" min="0" step="1000" defaultValue={editingPayroll.other_allowances} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">공제 항목</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">소득세</label>
                      <input type="number" name="income_tax" min="0" step="1000" defaultValue={editingPayroll.income_tax} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">주민세</label>
                      <input type="number" name="resident_tax" min="0" step="1000" defaultValue={editingPayroll.resident_tax} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">국민연금</label>
                      <input type="number" name="national_pension" min="0" step="1000" defaultValue={editingPayroll.national_pension} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">건강보험</label>
                      <input type="number" name="health_insurance" min="0" step="1000" defaultValue={editingPayroll.health_insurance} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">고용보험</label>
                      <input type="number" name="employment_insurance" min="0" step="1000" defaultValue={editingPayroll.employment_insurance} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">장기요양보험</label>
                      <input type="number" name="long_term_care" min="0" step="1000" defaultValue={editingPayroll.long_term_care} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">기타공제</label>
                      <input type="number" name="other_deductions" min="0" step="1000" defaultValue={editingPayroll.other_deductions} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">근무 정보</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">근무일수</label>
                      <input type="number" name="work_days" min="0" max="31" defaultValue={editingPayroll.work_days} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">연장근무시간</label>
                      <input type="number" name="overtime_hours" min="0" step="0.5" defaultValue={editingPayroll.overtime_hours} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">야간근무시간</label>
                      <input type="number" name="night_hours" min="0" step="0.5" defaultValue={editingPayroll.night_hours} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">휴일근무시간</label>
                      <input type="number" name="holiday_hours" min="0" step="0.5" defaultValue={editingPayroll.holiday_hours} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                  <textarea name="memo" rows="3" defaultValue={editingPayroll.memo} className="w-full border border-gray-300 rounded-md px-3 py-2"></textarea>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingPayroll(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateMutation.isLoading ? '수정 중...' : '수정'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;

