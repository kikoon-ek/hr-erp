import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { 
  DollarSign, 
  Download, 
  Eye, 
  Calendar, 
  TrendingUp,
  FileText,
  CreditCard,
  PieChart,
  BarChart3
} from 'lucide-react';

const PayrollUser = () => {
  const { user, api } = useAuthStore();
  const [payrollData, setPayrollData] = useState([]);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayrollData();
    loadStatistics();
  }, [selectedYear]);

  const loadPayrollData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payroll?employee_id=${user?.employee?.id}&year=${selectedYear}`);
      setPayrollData(response.data);
    } catch (error) {
      console.error('급여 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await api.get(`/payroll/statistics?employee_id=${user?.employee?.id}&year=${selectedYear}`);
      setStatistics(response.data);
    } catch (error) {
      console.error('급여 통계 로딩 실패:', error);
    }
  };

  const handleViewDetail = (payroll) => {
    setSelectedPayroll(payroll);
    setShowDetailModal(true);
  };

  const handleDownloadPayslip = async (payrollId) => {
    try {
      const response = await api.get(`/payroll/${payrollId}/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `급여명세서_${payrollId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('급여명세서 다운로드 실패:', error);
      alert('급여명세서 다운로드에 실패했습니다.');
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0';
    return amount.toLocaleString() + '원';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long'
    });
  };

  const getPayrollStatus = (status) => {
    const statusMap = {
      'draft': { text: '임시저장', color: 'bg-gray-100 text-gray-800' },
      'approved': { text: '승인됨', color: 'bg-green-100 text-green-800' },
      'paid': { text: '지급완료', color: 'bg-blue-100 text-blue-800' }
    };
    
    const statusInfo = statusMap[status] || { text: '미확인', color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
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
      {/* 급여 통계 요약 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">연간 총 급여</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(statistics.total_gross_pay)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">연간 실수령액</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(statistics.total_net_pay)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">월 평균 급여</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(statistics.average_monthly_pay)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 공제액</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(statistics.total_deductions)}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <PieChart className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 급여명세서 목록 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">급여명세서</h2>
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  지급월
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  기본급
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  수당
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  공제액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  실수령액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrollData.length > 0 ? (
                payrollData.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payroll.pay_period)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payroll.base_salary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payroll.allowances)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payroll.deductions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(payroll.net_pay)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPayrollStatus(payroll.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetail(payroll)}
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>상세</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPayslip(payroll.id)}
                          className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                        >
                          <Download className="w-4 h-4" />
                          <span>다운로드</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    급여명세서가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 급여 추이 차트 (향후 구현) */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">급여 추이</h2>
          <TrendingUp className="w-6 h-6 text-gray-400" />
        </div>
        <div className="text-center py-12 text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>급여 추이 차트는 준비 중입니다.</p>
        </div>
      </div>

      {/* 급여명세서 상세 모달 */}
      {showDetailModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                급여명세서 상세 - {formatDate(selectedPayroll.pay_period)}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">직원명</label>
                  <p className="text-gray-900">{user?.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">직원번호</label>
                  <p className="text-gray-900">{user?.employee?.employee_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">지급월</label>
                  <p className="text-gray-900">{formatDate(selectedPayroll.pay_period)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">상태</label>
                  {getPayrollStatus(selectedPayroll.status)}
                </div>
              </div>

              {/* 급여 내역 */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">급여 내역</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">기본급</span>
                    <span className="font-semibold">{formatCurrency(selectedPayroll.base_salary)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">수당</span>
                    <span className="font-semibold">{formatCurrency(selectedPayroll.allowances)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">성과급</span>
                    <span className="font-semibold">{formatCurrency(selectedPayroll.bonus)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>총 지급액</span>
                      <span className="text-blue-600">{formatCurrency(selectedPayroll.gross_pay)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 공제 내역 */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">공제 내역</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">국민연금</span>
                    <span className="font-semibold">{formatCurrency(selectedPayroll.national_pension)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">건강보험</span>
                    <span className="font-semibold">{formatCurrency(selectedPayroll.health_insurance)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">고용보험</span>
                    <span className="font-semibold">{formatCurrency(selectedPayroll.employment_insurance)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">소득세</span>
                    <span className="font-semibold">{formatCurrency(selectedPayroll.income_tax)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">지방소득세</span>
                    <span className="font-semibold">{formatCurrency(selectedPayroll.local_income_tax)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>총 공제액</span>
                      <span className="text-red-600">{formatCurrency(selectedPayroll.deductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 실수령액 */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span className="text-green-800">실수령액</span>
                  <span className="text-green-600">{formatCurrency(selectedPayroll.net_pay)}</span>
                </div>
              </div>

              {/* 비고 */}
              {selectedPayroll.notes && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">비고</h4>
                  <p className="text-gray-600 bg-gray-50 rounded-lg p-3">{selectedPayroll.notes}</p>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={() => handleDownloadPayslip(selectedPayroll.id)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>PDF 다운로드</span>
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollUser;

