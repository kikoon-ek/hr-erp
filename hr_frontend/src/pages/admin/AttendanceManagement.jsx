import React, { useState, useEffect } from 'react';
import { Clock, Users, Calendar, Edit, Trash2, Plus, Search, Filter, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { api } from '../../stores/authStore';

const AttendanceManagement = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 새 출퇴근 기록 폼 데이터
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in_time: '',
    check_out_time: '',
    status: 'present',
    overtime_hours: 0,
    notes: ''
  });

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, [selectedDate, selectedEmployee, selectedStatus, currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 직원 목록 로드
      const employeesResponse = await api.get('/employees');
      
      if (employeesResponse.status === 200) {
        const employeesData = employeesResponse.data;
        setEmployees(employeesData.employees || []);
      }
      
      // 출퇴근 기록 로드
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedEmployee) params.append('employee_id', selectedEmployee);
      if (selectedStatus) params.append('status', selectedStatus);
      params.append('page', currentPage);
      params.append('per_page', 20);
      
      const recordsResponse = await api.get(`/attendance/records?${params}`);
      
      if (recordsResponse.status === 200) {
        const recordsData = recordsResponse.data;
        setAttendanceRecords(recordsData.records || []);
        setTotalPages(recordsData.pages || 1);
      }

      // 통계 데이터 로드
      const statsResponse = await api.get(`/attendance/statistics?date=${selectedDate}`);
      
      if (statsResponse.status === 200) {
        const statsData = statsResponse.data;
        setStatistics(statsData);
      }
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 출퇴근 기록 추가
  const handleAddRecord = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.post('/attendance/records', formData);

      if (response.status === 200 || response.status === 201) {
        alert('출퇴근 기록이 추가되었습니다.');
        setShowAddModal(false);
        setFormData({
          employee_id: '',
          date: new Date().toISOString().split('T')[0],
          check_in_time: '',
          check_out_time: '',
          status: 'present',
          overtime_hours: 0,
          notes: ''
        });
        loadData();
      } else {
        const errorData = response.data;
        alert(`오류: ${errorData.error}`);
      }
    } catch (error) {
      console.error('출퇴근 기록 추가 실패:', error);
      alert('출퇴근 기록 추가에 실패했습니다.');
    }
  };

  // 출퇴근 기록 수정
  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.put(`/attendance/records/${editingRecord.id}`, formData);

      if (response.status === 200) {
        alert('출퇴근 기록이 수정되었습니다.');
        setEditingRecord(null);
        setShowAddModal(false);
        loadData();
      } else {
        const errorData = response.data;
        alert(`오류: ${errorData.error}`);
      }
    } catch (error) {
      console.error('출퇴근 기록 수정 실패:', error);
      alert('출퇴근 기록 수정에 실패했습니다.');
    }
  };

  // 출퇴근 기록 삭제
  const handleDeleteRecord = async (recordId) => {
    if (!confirm('정말로 이 출퇴근 기록을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await api.delete(`/attendance/records/${recordId}`);

      if (response.status === 200) {
        alert('출퇴근 기록이 삭제되었습니다.');
        loadData();
      } else {
        const errorData = response.data;
        alert(`오류: ${errorData.error}`);
      }
    } catch (error) {
      console.error('출퇴근 기록 삭제 실패:', error);
      alert('출퇴근 기록 삭제에 실패했습니다.');
    }
  };

  // 수정 모달 열기
  const openEditModal = (record) => {
    setEditingRecord(record);
    setFormData({
      employee_id: record.employee_id,
      date: record.date,
      check_in_time: record.check_in_time || '',
      check_out_time: record.check_out_time || '',
      status: record.status,
      overtime_hours: record.overtime_hours || 0,
      notes: record.notes || ''
    });
    setShowAddModal(true);
  };

  // 상태별 색상 및 아이콘
  const getStatusDisplay = (status) => {
    const statusMap = {
      'present': { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, text: '정상출근' },
      'late': { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle, text: '지각' },
      'early_leave': { color: 'text-orange-600', bg: 'bg-orange-100', icon: AlertCircle, text: '조퇴' },
      'absent': { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle, text: '결근' },
      'on_leave': { color: 'text-blue-600', bg: 'bg-blue-100', icon: Calendar, text: '연차' }
    };
    
    return statusMap[status] || { color: 'text-gray-600', bg: 'bg-gray-100', icon: AlertCircle, text: '알 수 없음' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">출퇴근 관리</h1>
        <p className="text-gray-600">직원들의 출퇴근 기록을 관리하고 통계를 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">전체 직원</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.total_employees || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">출근</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.present_count || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">지각</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.late_count || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">결근</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.absent_count || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">출근율</p>
              <p className="text-2xl font-bold text-gray-900">{(statistics.attendance_rate || 0).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 직원</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.employee_number})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 상태</option>
              <option value="present">정상출근</option>
              <option value="late">지각</option>
              <option value="early_leave">조퇴</option>
              <option value="absent">결근</option>
              <option value="on_leave">연차</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              출퇴근 기록 추가
            </button>
          </div>
        </div>
      </div>

      {/* 출퇴근 기록 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">직원</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">출근시간</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">퇴근시간</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">근무시간</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비고</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceRecords.map((record) => {
                const statusDisplay = getStatusDisplay(record.status);
                const StatusIcon = statusDisplay.icon;
                
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{record.employee_name}</div>
                        <div className="text-sm text-gray-500">{record.employee_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.check_in_time || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.check_out_time || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.work_hours ? `${record.work_hours.toFixed(1)}시간` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bg} ${statusDisplay.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusDisplay.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {record.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openEditModal(record)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(record.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                이전
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                다음
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span> 페이지
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    다음
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 출퇴근 기록 추가/수정 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingRecord ? '출퇴근 기록 수정' : '출퇴근 기록 추가'}
              </h3>
              
              <form onSubmit={editingRecord ? handleUpdateRecord : handleAddRecord}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">직원을 선택하세요</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} ({employee.employee_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">출근시간</label>
                  <input
                    type="time"
                    value={formData.check_in_time}
                    onChange={(e) => setFormData({...formData, check_in_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">퇴근시간</label>
                  <input
                    type="time"
                    value={formData.check_out_time}
                    onChange={(e) => setFormData({...formData, check_out_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="present">정상출근</option>
                    <option value="late">지각</option>
                    <option value="early_leave">조퇴</option>
                    <option value="absent">결근</option>
                    <option value="on_leave">연차</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">연장근무시간</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.overtime_hours}
                    onChange={(e) => setFormData({...formData, overtime_hours: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="추가 메모를 입력하세요"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingRecord(null);
                      setFormData({
                        employee_id: '',
                        date: new Date().toISOString().split('T')[0],
                        check_in_time: '',
                        check_out_time: '',
                        status: 'present',
                        overtime_hours: 0,
                        notes: ''
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {editingRecord ? '수정' : '추가'}
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

export default AttendanceManagement;

