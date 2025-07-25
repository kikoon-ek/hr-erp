import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, useAuthStore } from '../../stores/authStore';
import {
  Plus, Calculator, Eye, Check, X, DollarSign, Users, TrendingUp,
  Calendar, FileText, Settings, Download, Filter, AlertCircle, 
  CheckCircle, Clock, PlayCircle, Award, Target
} from 'lucide-react';

const BonusCalculationManagement = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedCalculation, setSelectedCalculation] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    period: '',
    page: 1,
    per_page: 10
  });

  // 성과급 계산 목록 조회
  const { data: calculationsData, isLoading } = useQuery({
    queryKey: ['bonus-calculations', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/bonus-calculations?${params}`);
      return response.data;
    }
  });

  // 성과급 정책 목록 조회
  const { data: policiesData } = useQuery({
    queryKey: ['bonus-policies'],
    queryFn: async () => {
      const response = await api.get('/bonus-policies');
      return response.data;
    }
  });

  // 성과급 분배 결과 조회
  const { data: distributionsData } = useQuery({
    queryKey: ['bonus-distributions', selectedCalculation?.id],
    queryFn: async () => {
      if (!selectedCalculation?.id) return null;
      const response = await api.get(`/bonus-calculations/${selectedCalculation.id}/distributions`);
      return response.data;
    },
    enabled: !!selectedCalculation?.id
  });

  // 성과급 계산 생성
  const createCalculationMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/bonus-calculations', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bonus-calculations']);
      setShowCreateModal(false);
      alert('성과급 계산이 생성되었습니다.');
    },
    onError: (error) => {
      alert(`오류: ${error.message}`);
    }
  });

  // 성과급 계산 실행
  const executeCalculationMutation = useMutation({
    mutationFn: async (calculationId) => {
      const response = await api.post(`/bonus-calculations/${calculationId}/calculate`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['bonus-calculations']);
      queryClient.invalidateQueries(['bonus-distributions']);
      alert(`성과급 계산이 완료되었습니다. 총 ${data.result.total_employees}명에게 ${data.result.total_distributed.toLocaleString()}원이 분배되었습니다.`);
    },
    onError: (error) => {
      alert(`오류: ${error.message}`);
    }
  });

  // 성과급 계산 승인
  const approveCalculationMutation = useMutation({
    mutationFn: async (calculationId) => {
      const response = await api.post(`/bonus-calculations/${calculationId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bonus-calculations']);
      queryClient.invalidateQueries(['bonus-distributions']);
      setShowApprovalModal(false);
      alert('성과급 계산이 승인되었습니다.');
    },
    onError: (error) => {
      alert(`오류: ${error.message}`);
    }
  });

  // 성과급 지급 처리
  const payBonusMutation = useMutation({
    mutationFn: async ({ distributionId, paymentData }) => {
      const response = await api.post(`/bonus-distributions/${distributionId}/pay`, paymentData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bonus-distributions']);
      alert('성과급 지급이 처리되었습니다.');
    },
    onError: (error) => {
      alert(`오류: ${error.message}`);
    }
  });

  // 상태별 색상 및 아이콘
  const getStatusInfo = (status) => {
    const statusMap = {
      '초안': { color: 'bg-gray-100 text-gray-800', icon: FileText },
      '계산중': { color: 'bg-blue-100 text-blue-800', icon: Clock },
      '완료': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      '승인': { color: 'bg-purple-100 text-purple-800', icon: Check },
      '지급완료': { color: 'bg-emerald-100 text-emerald-800', icon: Award }
    };
    return statusMap[status] || { color: 'bg-gray-100 text-gray-800', icon: FileText };
  };

  // 성과급 계산 생성 폼 제출
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      period: formData.get('period'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      bonus_policy_id: parseInt(formData.get('bonus_policy_id')),
      total_amount: parseFloat(formData.get('total_amount'))
    };
    createCalculationMutation.mutate(data);
  };

  // 성과급 지급 처리
  const handlePayment = (distributionId) => {
    const paymentDate = prompt('지급일을 입력하세요 (YYYY-MM-DD):');
    const paymentMethod = prompt('지급 방법을 입력하세요 (급여통합/별도지급):');
    const taxAmount = prompt('세금 금액을 입력하세요:');
    
    if (paymentDate && paymentMethod) {
      processPaymentMutation.mutate({
        distributionId,
        paymentData: {
          payment_date: paymentDate + 'T00:00:00Z',
          payment_method: paymentMethod,
          tax_amount: parseFloat(taxAmount) || 0
        }
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calculator className="text-blue-600" />
              성과급 계산 관리
            </h1>
            <p className="text-gray-600 mt-2">성과급 계산, 분배, 승인 및 지급을 관리합니다</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            새 성과급 계산
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
            <input
              type="text"
              placeholder="제목, 설명 검색..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체</option>
              <option value="초안">초안</option>
              <option value="계산중">계산중</option>
              <option value="완료">완료</option>
              <option value="승인">승인</option>
              <option value="지급완료">지급완료</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">기간</label>
            <select
              value={filters.period}
              onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체</option>
              <option value="2024-Q4">2024-Q4</option>
              <option value="2024-Q3">2024-Q3</option>
              <option value="2024-H2">2024-H2</option>
              <option value="2024">2024</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ search: '', status: '', period: '', page: 1, per_page: 10 })}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center justify-center gap-2"
            >
              <X size={16} />
              초기화
            </button>
          </div>
        </div>
      </div>

      {/* 성과급 계산 목록 */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">성과급 계산 목록</h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">로딩 중...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">기간</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총 금액</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대상자</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calculationsData?.calculations?.map((calculation) => {
                  const statusInfo = getStatusInfo(calculation.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <tr key={calculation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{calculation.title}</div>
                          <div className="text-sm text-gray-500">{calculation.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{calculation.period}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(calculation.start_date).toLocaleDateString()} ~ {new Date(calculation.end_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {calculation.total_amount?.toLocaleString()}원
                        </div>
                        {calculation.total_distributed > 0 && (
                          <div className="text-xs text-gray-500">
                            분배: {calculation.total_distributed?.toLocaleString()}원
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          <StatusIcon size={12} className="mr-1" />
                          {calculation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{calculation.total_employees || 0}명</div>
                        {calculation.average_bonus > 0 && (
                          <div className="text-xs text-gray-500">
                            평균: {calculation.average_bonus?.toLocaleString()}원
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedCalculation(calculation);
                              setShowDistributionModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="분배 결과 보기"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {calculation.status === '초안' && (
                            <button
                              onClick={() => executeCalculationMutation.mutate(calculation.id)}
                              className="text-green-600 hover:text-green-800"
                              title="계산 실행"
                              disabled={executeCalculationMutation.isLoading}
                            >
                              <PlayCircle size={16} />
                            </button>
                          )}
                          
                          {calculation.status === '완료' && (
                            <button
                              onClick={() => {
                                setSelectedCalculation(calculation);
                                setShowApprovalModal(true);
                              }}
                              className="text-purple-600 hover:text-purple-800"
                              title="승인"
                            >
                              <Check size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 성과급 계산 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">새 성과급 계산 생성</h3>
            <form onSubmit={handleCreateSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 2024년 4분기 성과급"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <textarea
                    name="description"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="성과급 계산에 대한 설명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">기간</label>
                  <select
                    name="period"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">기간 선택</option>
                    <option value="2024-Q4">2024-Q4</option>
                    <option value="2024-Q3">2024-Q3</option>
                    <option value="2024-H2">2024-H2</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                    <input
                      type="date"
                      name="start_date"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                    <input
                      type="date"
                      name="end_date"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">성과급 정책</label>
                  <select
                    name="bonus_policy_id"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">정책 선택</option>
                    {policiesData?.policies?.map((policy) => (
                      <option key={policy.id} value={policy.id}>
                        {policy.name} (개인:{policy.ratio_personal}% 팀:{policy.ratio_team}% 기본:{policy.ratio_base}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">총 성과급 금액</label>
                  <input
                    type="number"
                    name="total_amount"
                    required
                    min="0"
                    step="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 50000000"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={createCalculationMutation.isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createCalculationMutation.isLoading ? '생성 중...' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 분배 결과 모달 */}
      {showDistributionModal && selectedCalculation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">성과급 분배 결과 - {selectedCalculation.title}</h3>
              <button
                onClick={() => setShowDistributionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            {distributionsData?.distributions && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">직원</th>
                      <th className="px-4 py-2 text-left">부서</th>
                      <th className="px-4 py-2 text-left">직급</th>
                      <th className="px-4 py-2 text-left">개인점수</th>
                      <th className="px-4 py-2 text-left">팀점수</th>
                      <th className="px-4 py-2 text-left">전사점수</th>
                      <th className="px-4 py-2 text-left">최종성과급</th>
                      <th className="px-4 py-2 text-left">상태</th>
                      <th className="px-4 py-2 text-left">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {distributionsData.distributions.map((dist) => (
                      <tr key={dist.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div>
                            <div className="font-medium">{dist.employee?.name}</div>
                            <div className="text-xs text-gray-500">{dist.employee?.employee_number}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2">{dist.department?.name}</td>
                        <td className="px-4 py-2">{dist.position_level}</td>
                        <td className="px-4 py-2">{dist.individual_score?.toFixed(1)}점</td>
                        <td className="px-4 py-2">{dist.team_score?.toFixed(1)}점</td>
                        <td className="px-4 py-2">{dist.company_score?.toFixed(1)}점</td>
                        <td className="px-4 py-2">
                          <div className="font-medium">{dist.final_bonus?.toLocaleString()}원</div>
                          <div className="text-xs text-gray-500">{dist.contribution_ratio?.toFixed(2)}%</div>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            dist.status === '승인' ? 'bg-green-100 text-green-800' :
                            dist.status === '지급완료' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {dist.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {dist.status === '승인' && (
                            <button
                              onClick={() => handlePayment(dist.id)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                              title="지급 처리"
                            >
                              지급
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 승인 모달 */}
      {showApprovalModal && selectedCalculation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">성과급 계산 승인</h3>
            <p className="text-gray-600 mb-6">
              "{selectedCalculation.title}" 성과급 계산을 승인하시겠습니까?
              <br />
              승인 후에는 지급 처리가 가능합니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={() => approveCalculationMutation.mutate(selectedCalculation.id)}
                disabled={approveCalculationMutation.isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {approveCalculationMutation.isLoading ? '승인 중...' : '승인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BonusCalculationManagement;

