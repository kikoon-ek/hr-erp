import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Plus, 
  Edit, 
  Trash2, 
  Building, 
  Users, 
  User,
  TrendingUp,
  Award,
  Calendar,
  Weight
} from 'lucide-react';

const PerformanceTargetsManagement = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [selectedYear, setSelectedYear] = useState(2024);
  const [categories, setCategories] = useState([]);
  const [companyTargets, setCompanyTargets] = useState([]);
  const [departmentTargets, setDepartmentTargets] = useState([]);
  const [employeeTargets, setEmployeeTargets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [loading, setLoading] = useState(false);

  // 데이터 로딩
  useEffect(() => {
    loadCategories();
    loadDepartments();
    loadEmployees();
  }, []);

  useEffect(() => {
    loadTargets();
  }, [activeTab, selectedYear]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/target-categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('카테고리 로딩 실패:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      console.error('부서 로딩 실패:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      if (data.success) {
        setEmployees(data.data.filter(emp => emp.employee_number !== 'EMP001'));
      }
    } catch (error) {
      console.error('직원 로딩 실패:', error);
    }
  };

  const loadTargets = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      switch (activeTab) {
        case 'company':
          endpoint = `/api/company-targets?year=${selectedYear}`;
          break;
        case 'department':
          endpoint = `/api/department-targets?year=${selectedYear}`;
          break;
        case 'employee':
          endpoint = `/api/employee-targets?year=${selectedYear}`;
          break;
      }

      const response = await fetch(endpoint);
      const data = await response.json();
      if (data.success) {
        switch (activeTab) {
          case 'company':
            setCompanyTargets(data.data);
            break;
          case 'department':
            setDepartmentTargets(data.data);
            break;
          case 'employee':
            setEmployeeTargets(data.data);
            break;
        }
      }
    } catch (error) {
      console.error('목표 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTarget = async (targetData) => {
    try {
      let endpoint = '';
      switch (activeTab) {
        case 'company':
          endpoint = '/api/company-targets';
          break;
        case 'department':
          endpoint = '/api/department-targets';
          break;
        case 'employee':
          endpoint = '/api/employee-targets';
          break;
      }

      const method = editingTarget ? 'PUT' : 'POST';
      const url = editingTarget ? `${endpoint}/${editingTarget.id}` : endpoint;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...targetData,
          year: selectedYear
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        setEditingTarget(null);
        loadTargets();
        alert(editingTarget ? '목표가 수정되었습니다.' : '목표가 생성되었습니다.');
      } else {
        alert('저장 실패: ' + data.error);
      }
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteTarget = async (targetId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      let endpoint = '';
      switch (activeTab) {
        case 'company':
          endpoint = `/api/company-targets/${targetId}`;
          break;
        case 'department':
          endpoint = `/api/department-targets/${targetId}`;
          break;
        case 'employee':
          endpoint = `/api/employee-targets/${targetId}`;
          break;
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        loadTargets();
        alert('목표가 삭제되었습니다.');
      } else {
        alert('삭제 실패: ' + data.error);
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const getCurrentTargets = () => {
    switch (activeTab) {
      case 'company':
        return companyTargets;
      case 'department':
        return departmentTargets;
      case 'employee':
        return employeeTargets;
      default:
        return [];
    }
  };

  const formatValue = (value, unit) => {
    if (unit === '원') {
      return (value / 100000000).toFixed(0) + '억원';
    }
    return value + unit;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-600" />
            성과 기준 관리
          </h1>
          <p className="text-gray-600 mt-1">회사/부서/개인별 성과 목표를 설정하고 관리합니다</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={2024}>2024년</option>
            <option value={2025}>2025년</option>
          </select>
          <button
            onClick={() => {
              setEditingTarget(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            목표 추가
          </button>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('company')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'company'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building className="h-4 w-4" />
            회사 목표
          </button>
          <button
            onClick={() => setActiveTab('department')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'department'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="h-4 w-4" />
            부서 목표
          </button>
          <button
            onClick={() => setActiveTab('employee')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'employee'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="h-4 w-4" />
            개인 목표
          </button>
        </nav>
      </div>

      {/* 목표 목록 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  성과 지표
                </th>
                {activeTab === 'department' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    부서
                  </th>
                )}
                {activeTab === 'employee' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    직원
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  목표값
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가중치
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  설명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getCurrentTargets().map((target) => (
                <tr key={target.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {target.category_name}
                      </span>
                    </div>
                  </td>
                  {activeTab === 'department' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {target.department_name}
                    </td>
                  )}
                  {activeTab === 'employee' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {target.employee_name}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatValue(target.target_value, target.unit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Weight className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">{target.weight}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {target.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setEditingTarget(target);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTarget(target.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {getCurrentTargets().length === 0 && (
            <div className="text-center py-8">
              <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">설정된 목표가 없습니다.</p>
              <p className="text-gray-400 text-sm">새로운 목표를 추가해보세요.</p>
            </div>
          )}
        </div>
      )}

      {/* 목표 추가/수정 모달 */}
      {showModal && (
        <TargetModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingTarget(null);
          }}
          onSave={handleSaveTarget}
          target={editingTarget}
          targetType={activeTab}
          categories={categories}
          departments={departments}
          employees={employees}
        />
      )}
    </div>
  );
};

// 목표 추가/수정 모달 컴포넌트
const TargetModal = ({ isOpen, onClose, onSave, target, targetType, categories, departments, employees }) => {
  const [formData, setFormData] = useState({
    category_id: '',
    department_id: '',
    employee_id: '',
    target_value: '',
    weight: '',
    description: '',
    month: null
  });

  useEffect(() => {
    if (target) {
      setFormData({
        category_id: target.category_id || '',
        department_id: target.department_id || '',
        employee_id: target.employee_id || '',
        target_value: target.target_value || '',
        weight: target.weight || '',
        description: target.description || '',
        month: target.month || null
      });
    } else {
      setFormData({
        category_id: '',
        department_id: '',
        employee_id: '',
        target_value: '',
        weight: '',
        description: '',
        month: null
      });
    }
  }, [target]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 필수 필드 검증
    if (!formData.category_id || !formData.target_value || !formData.weight) {
      alert('필수 필드를 모두 입력해주세요.');
      return;
    }

    if (targetType === 'department' && !formData.department_id) {
      alert('부서를 선택해주세요.');
      return;
    }

    if (targetType === 'employee' && !formData.employee_id) {
      alert('직원을 선택해주세요.');
      return;
    }

    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {target ? '목표 수정' : '목표 추가'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              성과 지표 *
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">선택하세요</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.unit})
                </option>
              ))}
            </select>
          </div>

          {targetType === 'department' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                부서 *
              </label>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">선택하세요</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === 'employee' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                직원 *
              </label>
              <select
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">선택하세요</option>
                {employees.map((emp) => (
                  <option key={emp.employee_number} value={emp.employee_number}>
                    {emp.name} ({emp.employee_number})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              목표값 *
            </label>
            <input
              type="number"
              value={formData.target_value}
              onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              가중치 (%) *
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              {target ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PerformanceTargetsManagement;

