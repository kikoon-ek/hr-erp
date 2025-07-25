import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../../stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Users, Plus, Search, Filter, Edit, Trash2, X } from 'lucide-react'

export default function EmployeeManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [newEmployee, setNewEmployee] = useState({
    // User 테이블 필드
    username: '',
    email: '',
    password: '',
    role: 'user',
    
    // Employee 테이블 필드
    employee_number: '',
    name: '',
    phone: '',
    position: '',
    department_id: 1,
    hire_date: new Date().toISOString().split('T')[0],
    birth_date: '',
    address: '',
    salary: ''
  })

  const queryClient = useQueryClient()

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees')
      return response.data
    },
  })

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments')
      return response.data
    },
  })

  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData) => {
      const response = await api.post('/employees', employeeData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees'])
      setShowCreateModal(false)
      setNewEmployee({
        // User 테이블 필드
        username: '',
        email: '',
        password: '',
        role: 'user',
        
        // Employee 테이블 필드
        employee_number: '',
        name: '',
        phone: '',
        position: '',
        department_id: 1,
        hire_date: new Date().toISOString().split('T')[0],
        birth_date: '',
        address: '',
        salary: ''
      })
      alert('직원이 성공적으로 등록되었습니다!')
    },
    onError: (error) => {
      alert(`직원 등록 실패: ${error.response?.data?.error || error.message}`)
    }
  })

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId) => {
      const response = await api.delete(`/employees/${employeeId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees'])
      setShowDetailModal(false)
      alert('직원이 성공적으로 삭제되었습니다!')
    },
    onError: (error) => {
      alert(`직원 삭제 실패: ${error.response?.data?.error || error.message}`)
    }
  })

  const handleCreateEmployee = (e) => {
    e.preventDefault()
    createEmployeeMutation.mutate(newEmployee)
  }

  const handleDeleteEmployee = (employeeId) => {
    if (window.confirm('정말로 이 직원을 삭제하시겠습니까?')) {
      deleteEmployeeMutation.mutate(employeeId)
    }
  }

  const handleViewDetails = async (employeeId) => {
    try {
      const response = await api.get(`/employees/${employeeId}`)
      setSelectedEmployee(response.data.employee)
      setShowDetailModal(true)
    } catch (error) {
      alert(`직원 정보 조회 실패: ${error.response?.data?.error || error.message}`)
    }
  }

  const filteredEmployees = employeesData?.employees?.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      terminated: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      active: '재직',
      inactive: '휴직',
      terminated: '퇴사'
    }

    return (
      <Badge className={variants[status] || variants.active}>
        {labels[status] || status}
      </Badge>
    )
  }

  const getDepartmentName = (departmentId) => {
    const department = departmentsData?.departments?.find(d => d.id === departmentId)
    return department?.name || '부서 없음'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">직원 관리</h1>
            <p className="text-gray-600">직원 정보를 관리합니다</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">직원 관리</h1>
          <p className="text-gray-600">직원 정보를 관리합니다</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          새 직원 등록
        </Button>
      </div>

      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="직원명, 사번, 이메일로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              필터
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">총 직원 수</p>
                <p className="text-2xl font-bold text-gray-900">{filteredEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">재직자</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredEmployees.filter(emp => emp.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">비재직자</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredEmployees.filter(emp => emp.status !== 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 직원 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>직원 목록</CardTitle>
          <CardDescription>
            등록된 모든 직원의 정보를 확인할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length > 0 ? (
            <div className="space-y-4">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {employee.name?.charAt(0) || 'N'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{employee.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{employee.employee_number}</span>
                        <span>•</span>
                        <span>{employee.position || '직책 없음'}</span>
                        <span>•</span>
                        <span>{employee.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(employee.status)}
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(employee.id)}>
                      상세보기
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? '검색 결과가 없습니다' : '등록된 직원이 없습니다'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? '다른 검색어를 시도해보세요' : '새로운 직원을 등록해보세요'}
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                첫 번째 직원 등록
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 새 직원 등록 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">새 직원 등록</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  required
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사번</label>
                <input
                  type="text"
                  required
                  value={newEmployee.employee_number}
                  onChange={(e) => setNewEmployee({...newEmployee, employee_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input
                  type="email"
                  required
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사용자명</label>
                <input
                  type="text"
                  required
                  value={newEmployee.username}
                  onChange={(e) => setNewEmployee({...newEmployee, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                <input
                  type="password"
                  required
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                <select
                  value={newEmployee.department_id}
                  onChange={(e) => setNewEmployee({...newEmployee, department_id: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {departmentsData?.departments?.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직급</label>
                <input
                  type="text"
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">입사일</label>
                <input
                  type="date"
                  value={newEmployee.hire_date}
                  onChange={(e) => setNewEmployee({...newEmployee, hire_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                <input
                  type="tel"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">기본급</label>
                <input
                  type="number"
                  value={newEmployee.salary}
                  onChange={(e) => setNewEmployee({...newEmployee, salary: parseInt(e.target.value) || ''})}
                  placeholder="예: 3500000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={createEmployeeMutation.isPending}>
                  {createEmployeeMutation.isPending ? '등록 중...' : '등록'}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                  취소
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 직원 상세보기 모달 */}
      {showDetailModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">직원 상세 정보</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowDetailModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-medium">
                    {selectedEmployee.name?.charAt(0) || 'N'}
                  </span>
                </div>
                <h3 className="text-lg font-medium">{selectedEmployee.name}</h3>
                <p className="text-gray-600">{selectedEmployee.position}</p>
                {getStatusBadge(selectedEmployee.status)}
              </div>
              
              <div className="border-t pt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">사번</label>
                  <p className="text-gray-900">{selectedEmployee.employee_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">이메일</label>
                  <p className="text-gray-900">{selectedEmployee.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">부서</label>
                  <p className="text-gray-900">{getDepartmentName(selectedEmployee.department_id)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">입사일</label>
                  <p className="text-gray-900">{selectedEmployee.hire_date}</p>
                </div>
                {selectedEmployee.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">전화번호</label>
                    <p className="text-gray-900">{selectedEmployee.phone}</p>
                  </div>
                )}
                {selectedEmployee.salary && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">기본급</label>
                    <p className="text-gray-900">{selectedEmployee.salary?.toLocaleString()}원</p>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 pt-4 border-t">
                <Button variant="outline" className="flex-1">
                  <Edit className="w-4 h-4 mr-2" />
                  수정
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeleteEmployee(selectedEmployee.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

