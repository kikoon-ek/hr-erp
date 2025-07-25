import React, { useState, useEffect } from 'react';
import { Clock, Users, Settings, Calendar, Save, RotateCcw, Plus, Edit, Trash2 } from 'lucide-react';
import { api } from '../../stores/authStore';

const WorkScheduleManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [workSchedules, setWorkSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // list, individual, bulk, templates
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // 요일 이름 매핑
  const dayNames = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 직원 목록 로드
      const employeesResponse = await api.get('/employees');
      const employeesData = employeesResponse.data;
      
      // 근무시간 설정 로드
      const schedulesResponse = await api.get('/work-schedules');
      const schedulesData = schedulesResponse.data;
      
      // 템플릿 로드
      const templatesResponse = await api.get('/work-schedules/templates');
      const templatesData = templatesResponse.data;
      
      if (employeesData.success) {
        setEmployees(employeesData.employees || []);
      }
      
      if (schedulesData.success) {
        setWorkSchedules(schedulesData.schedules || []);
      }
      
      if (templatesData.success) {
        setTemplates(templatesData.templates || []);
      }
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      alert('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  //   // 근무시간 설정 저장
  const saveSchedule = async (scheduleData) => {
    try {
      setSaving(true);
      
      let response;
      if (editingSchedule) {
        response = await api.put(`/work-schedules/${editingSchedule.id}`, scheduleData);
      } else {
        response = await api.post('/work-schedules', scheduleData);
      }
      
      const result = response.data;
      
      if (result.success) {
        alert(editingSchedule ? '근무시간이 수정되었습니다.' : '근무시간이 등록되었습니다.');
        setShowModal(false);
        setEditingSchedule(null);
        await loadData();
      } else {
        throw new Error(result.error || '저장 실패');
      }
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 근무시간 설정 삭제
  const deleteWorkSchedule = async (scheduleId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      const response = await api.delete(`/work-schedules/${scheduleId}`);
      
      const result = response.data;
      
      if (result.success) {
        alert('근무시간 설정이 삭제되었습니다.');
        await loadData();
      } else {
        throw new Error(result.error || '삭제 실패');
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // 일괄 설정
  const applyBulkSchedule = async (employeeId, schedules) => {
    try {
      setSaving(true);
      
      const response = await api.post('/work-schedules/bulk', {
        employee_id: employeeId,
        schedules: schedules
      });
      
      const result = response.data;
      
      if (result.success) {
        alert('근무시간이 일괄 적용되었습니다.');
        await loadData();
      } else {
        throw new Error(result.error || '일괄 적용 실패');
      }
    } catch (error) {
      console.error('일괄 적용 실패:', error);
      alert('일괄 적용 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 근무시간 설정 목록 탭
  const ScheduleListTab = () => {
    // 직원별로 근무시간 그룹화
    const schedulesByEmployee = workSchedules.reduce((acc, schedule) => {
      const employeeId = schedule.employee_id;
      if (!acc[employeeId]) {
        acc[employeeId] = {
          employee: employees.find(emp => emp.id === employeeId),
          schedules: []
        };
      }
      acc[employeeId].schedules.push(schedule);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        {/* 상단 버튼 */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">근무시간 설정 현황</h3>
          <button
            onClick={() => {
              setEditingSchedule(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="mr-2" size={16} />
            근무시간 추가
          </button>
        </div>

        {/* 직원별 근무시간 목록 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.values(schedulesByEmployee).map(({ employee, schedules }) => (
            <div key={employee?.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="font-semibold text-lg">{employee?.name}</h4>
                  <p className="text-sm text-gray-500">{employee?.employee_number} - {employee?.department_name}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {schedules.sort((a, b) => a.day_of_week - b.day_of_week).map(schedule => (
                  <div key={schedule.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{dayNames[schedule.day_of_week]}</span>
                      <span className="ml-2 text-gray-600">
                        {schedule.start_time} - {schedule.end_time}
                      </span>
                      {!schedule.is_working_day && (
                        <span className="ml-2 text-red-500 text-sm">(휴무)</span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingSchedule(schedule);
                          setShowModal(true);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteWorkSchedule(schedule.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {schedules.length === 0 && (
                  <p className="text-gray-500 text-center py-4">설정된 근무시간이 없습니다.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {Object.keys(schedulesByEmployee).length === 0 && (
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">설정된 근무시간이 없습니다.</p>
          </div>
        )}
      </div>
    );
  };

  // 일괄 적용 탭
  const BulkApplyTab = () => {
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');

    const handleApplyTemplate = () => {
      if (!selectedEmployee) {
        alert('직원을 선택해주세요.');
        return;
      }
      if (!selectedTemplate) {
        alert('템플릿을 선택해주세요.');
        return;
      }

      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        applyBulkSchedule(parseInt(selectedEmployee), template.schedules);
      }
    };

    return (
      <div className="space-y-6">
        {/* 직원 선택 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="mr-2" size={20} />
            직원 선택
          </h3>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">직원을 선택하세요</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.name} ({employee.employee_number}) - {employee.department_name}
              </option>
            ))}
          </select>
        </div>

        {/* 템플릿 선택 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Settings className="mr-2" size={20} />
            템플릿 선택
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedTemplate === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h4 className="font-semibold mb-2">{template.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                <div className="space-y-1 text-xs">
                  {template.schedules.filter(s => s.is_working_day).map(schedule => (
                    <div key={schedule.day_of_week}>
                      {dayNames[schedule.day_of_week]}: {schedule.start_time} - {schedule.end_time}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 적용 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={handleApplyTemplate}
            disabled={saving || !selectedEmployee || !selectedTemplate}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
          >
            <RotateCcw className="mr-2" size={16} />
            {saving ? '적용 중...' : '템플릿 적용'}
          </button>
        </div>
      </div>
    );
  };

  // 템플릿 관리 탭
  const TemplatesTab = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Calendar className="mr-2" size={20} />
          근무시간 템플릿
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-lg mb-2">{template.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              
              <div className="space-y-1 text-sm">
                <div className="font-medium text-gray-700 mb-2">근무일정:</div>
                {template.schedules.map(schedule => (
                  <div key={schedule.day_of_week} className="flex justify-between">
                    <span>{dayNames[schedule.day_of_week]}</span>
                    <span>
                      {schedule.is_working_day 
                        ? `${schedule.start_time} - ${schedule.end_time}`
                        : '휴무'
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 근무시간 설정 모달
  const WorkScheduleModal = () => {
    const [formData, setFormData] = useState({
      employee_id: '',
      day_of_week: 0,
      start_time: '09:00',
      end_time: '18:00',
      is_working_day: true
    });

    useEffect(() => {
      if (editingSchedule) {
        setFormData({
          employee_id: editingSchedule.employee_id,
          day_of_week: editingSchedule.day_of_week,
          start_time: editingSchedule.start_time,
          end_time: editingSchedule.end_time,
          is_working_day: editingSchedule.is_working_day
        });
      } else {
        setFormData({
          employee_id: '',
          day_of_week: 0,
          start_time: '09:00',
          end_time: '18:00',
          is_working_day: true
        });
      }
    }, [editingSchedule]);

    const handleSubmit = (e) => {
      e.preventDefault();
      
      if (!formData.employee_id) {
        alert('직원을 선택해주세요.');
        return;
      }
      
      if (formData.is_working_day && formData.start_time >= formData.end_time) {
        alert('시작시간은 종료시간보다 빨라야 합니다.');
        return;
      }
      
      saveWorkSchedule(formData);
    };

    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">
            {editingSchedule ? '근무시간 수정' : '근무시간 추가'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">직원</label>
              <select
                value={formData.employee_id}
                onChange={(e) => setFormData({...formData, employee_id: parseInt(e.target.value)})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={editingSchedule}
              >
                <option value="">직원을 선택하세요</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.employee_number})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">요일</label>
              <select
                value={formData.day_of_week}
                onChange={(e) => setFormData({...formData, day_of_week: parseInt(e.target.value)})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={editingSchedule}
              >
                {dayNames.map((day, index) => (
                  <option key={index} value={index}>{day}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="is_working_day"
                checked={formData.is_working_day}
                onChange={(e) => setFormData({...formData, is_working_day: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="is_working_day" className="text-sm font-medium text-gray-700">
                근무일
              </label>
            </div>
            
            {formData.is_working_day && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">시작시간</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">종료시간</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingSchedule(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                <Save className="mr-2" size={16} />
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">근무시간 설정</h1>
        <p className="text-gray-600">직원별 근무시간을 설정하고 관리합니다.</p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="mb-6">
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
              근무시간 현황
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bulk'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              템플릿 적용
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              템플릿 관리
            </button>
          </nav>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'list' && <ScheduleListTab />}
      {activeTab === 'bulk' && <BulkApplyTab />}
      {activeTab === 'templates' && <TemplatesTab />}

      {/* 모달 */}
      <WorkScheduleModal />
    </div>
  );
};

export default WorkScheduleManagement;

