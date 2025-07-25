import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import React, { useState, useEffect } from 'react';
import { api } from '../../stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Badge } from '../../components/ui/badge'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Slider } from '../../components/ui/slider'
import { Switch } from '../../components/ui/switch'
import { Plus, Edit, Trash2, DollarSign, TrendingUp, Settings, Star, AlertTriangle, PiggyBank } from 'lucide-react'

const BonusPolicy = () => {
  const [showModal, setShowModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [activeTab, setActiveTab] = useState('policies');
  const [message, setMessage] = useState({ type: '', text: '' });

  const queryClient = useQueryClient()

  // React Query로 성과급 정책 데이터 로딩
  const { data: policiesData, isLoading: policiesLoading } = useQuery({
    queryKey: ['bonus-policies'],
    queryFn: async () => {
      const response = await api.get('/bonus-policies')
      return response.data
    },
  })

  // React Query로 예산 데이터 로딩
  const { data: budgetsData, isLoading: budgetsLoading } = useQuery({
    queryKey: ['bonus-budgets'],
    queryFn: async () => {
      const response = await api.get('/bonus-budgets')
      return response.data
    },
  })

  const policies = policiesData?.data || [];
  const budgets = budgetsData?.data || [];
  const loading = policiesLoading || budgetsLoading;
  
  const [formData, setFormData] = useState({
    name: '',
    policy_type: 'annual',
    description: '',
    ratio_base: 25,
    ratio_team: 25,
    ratio_personal: 25,
    ratio_company: 25,
    calculation_method: 'weighted',
    min_performance_score: 0,
    max_bonus_multiplier: 2,
    effective_from: '',
    effective_to: '',
    is_default: false
  });
  
  const [budgetFormData, setBudgetFormData] = useState({
    year: new Date().getFullYear(),
    total_budget: 0,
    department_allocations: {
      '개발팀': 0,
      '영업팀': 0,
      '인사팀': 0,
      '재무팀': 0,
      '총무팀': 0
    },
    notes: ''
  });

  // 성과급 정책 저장 mutation
  const createPolicyMutation = useMutation({
    mutationFn: async (policyData) => {
      const response = await api.post('/bonus-policies', policyData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bonus-policies'])
      setShowModal(false)
      setMessage({ type: 'success', text: '성과급 정책이 저장되었습니다.' });
      resetForm();
    },
    onError: (error) => {
      setMessage({ type: 'error', text: '정책 저장에 실패했습니다.' });
    }
  })

  // 예산 저장 mutation
  const createBudgetMutation = useMutation({
    mutationFn: async (budgetData) => {
      const response = await api.post('/bonus-budgets', budgetData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bonus-budgets'])
      setShowBudgetModal(false)
      setMessage({ type: 'success', text: '예산이 저장되었습니다.' });
      resetBudgetForm();
    },
    onError: (error) => {
      setMessage({ type: 'error', text: '예산 저장에 실패했습니다.' });
    }
  })

  // 성과급 정책 저장
  const handleSavePolicy = async () => {
    createPolicyMutation.mutate(formData);
  };

  // 예산 저장
  const handleSaveBudget = async () => {
    createBudgetMutation.mutate(budgetFormData);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      policy_type: 'annual',
      description: '',
      ratio_base: 25,
      ratio_team: 25,
      ratio_personal: 25,
      ratio_company: 25,
      calculation_method: 'weighted',
      min_performance_score: 0,
      max_bonus_multiplier: 2,
      effective_from: '',
      effective_to: '',
      is_default: false
    });
    setEditingPolicy(null);
  };

  const resetBudgetForm = () => {
    setBudgetFormData({
      year: new Date().getFullYear(),
      total_budget: 0,
      department_allocations: {
        '개발팀': 0,
        '영업팀': 0,
        '인사팀': 0,
        '재무팀': 0,
        '총무팀': 0
      },
      notes: ''
    });
    setEditingBudget(null);
  };

  const handleEditPolicy = (policy) => {
    setFormData({
      name: policy.name,
      policy_type: policy.policy_type,
      description: policy.description || '',
      ratio_base: policy.ratio_base,
      ratio_team: policy.ratio_team,
      ratio_personal: policy.ratio_personal,
      ratio_company: policy.ratio_company,
      calculation_method: policy.calculation_method,
      min_performance_score: policy.min_performance_score,
      max_bonus_multiplier: policy.max_bonus_multiplier,
      effective_from: policy.effective_from ? policy.effective_from.split('T')[0] : '',
      effective_to: policy.effective_to ? policy.effective_to.split('T')[0] : '',
      is_default: policy.is_default
    });
    setEditingPolicy(policy);
    setShowModal(true);
  };

  const handleEditBudget = (budget) => {
    setBudgetFormData({
      year: budget.year,
      total_budget: budget.total_budget,
      department_allocations: budget.department_allocations || {},
      notes: budget.notes || ''
    });
    setEditingBudget(budget);
    setShowBudgetModal(true);
  };

  // 가중치 조정 시 총합이 100%가 되도록 자동 조정
  const handleRatioChange = (field, value) => {
    const newFormData = { ...formData };
    newFormData[field] = value;
    
    // 나머지 필드들의 합계 계산
    const otherFields = ['ratio_base', 'ratio_team', 'ratio_personal', 'ratio_company'].filter(f => f !== field);
    const otherSum = otherFields.reduce((sum, f) => sum + newFormData[f], 0);
    const remaining = 100 - value;
    
    // 나머지 필드들을 비례적으로 조정
    if (otherSum > 0) {
      otherFields.forEach(f => {
        newFormData[f] = Math.round((newFormData[f] / otherSum) * remaining);
      });
    }
    
    setFormData(newFormData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">성과급 정책 관리</h1>
          <p className="text-muted-foreground">성과급 분배 정책을 설정하고 관리합니다</p>
        </div>
      </div>

      {message.text && (
        <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="policies">성과급 정책</TabsTrigger>
          <TabsTrigger value="budgets">예산 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">성과급 정책 목록</h2>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              새 성과급 정책
            </Button>
          </div>

          {policies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">등록된 성과급 정책이 없습니다</h3>
                <p className="text-muted-foreground mb-4">첫 번째 성과급 정책을 생성해보세요</p>
                <Button onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  첫 번째 성과급 정책 생성
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {policies.map((policy) => (
                <Card key={policy.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {policy.name}
                          {policy.is_default && <Badge variant="secondary"><Star className="h-3 w-3" />기본</Badge>}
                          <Badge variant={policy.is_active ? "default" : "secondary"}>
                            {policy.is_active ? "활성" : "비활성"}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{policy.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditPolicy(policy)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm font-medium">기본급 비중</Label>
                        <p className="text-2xl font-bold">{policy.ratio_base}%</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">팀 성과 비중</Label>
                        <p className="text-2xl font-bold">{policy.ratio_team}%</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">개인 성과 비중</Label>
                        <p className="text-2xl font-bold">{policy.ratio_personal}%</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">회사 성과 비중</Label>
                        <p className="text-2xl font-bold">{policy.ratio_company}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">성과급 예산 관리</h2>
            <Button onClick={() => setShowBudgetModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              새 예산 설정
            </Button>
          </div>

          {budgets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <PiggyBank className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">등록된 예산이 없습니다</h3>
                <p className="text-muted-foreground mb-4">첫 번째 성과급 예산을 설정해보세요</p>
                <Button onClick={() => setShowBudgetModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  첫 번째 예산 설정
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {budgets.map((budget) => (
                <Card key={budget.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{budget.year}년 성과급 예산</CardTitle>
                        <CardDescription>{budget.notes}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={budget.budget_status === 'active' ? "default" : "secondary"}>
                          {budget.budget_status === 'active' ? '활성' : '완료'}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => handleEditBudget(budget)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <Label className="text-sm font-medium">총 예산</Label>
                        <p className="text-2xl font-bold">{budget.total_budget?.toLocaleString()}원</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">사용 예산</Label>
                        <p className="text-2xl font-bold">{budget.used_budget?.toLocaleString()}원</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">잔여 예산</Label>
                        <p className="text-2xl font-bold">{budget.remaining_budget?.toLocaleString()}원</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">사용률</Label>
                        <p className="text-2xl font-bold">
                          {budget.total_budget > 0 ? Math.round((budget.used_budget / budget.total_budget) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium mb-2 block">부서별 배분</Label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {Object.entries(budget.department_allocations || {}).map(([dept, amount]) => (
                          <div key={dept} className="text-center p-2 bg-muted rounded">
                            <div className="text-sm font-medium">{dept}</div>
                            <div className="text-lg font-bold">{amount?.toLocaleString()}원</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 성과급 정책 모달 */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? '성과급 정책 수정' : '새 성과급 정책 생성'}
            </DialogTitle>
            <DialogDescription>
              성과급 분배에 사용할 정책을 설정하세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">정책명 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="예: 2025년 연간 성과급 정책"
                />
              </div>
              <div>
                <Label htmlFor="policy_type">정책 유형 *</Label>
                <Select value={formData.policy_type} onValueChange={(value) => setFormData({...formData, policy_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="정책 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">연간</SelectItem>
                    <SelectItem value="quarterly">분기별</SelectItem>
                    <SelectItem value="project">프로젝트별</SelectItem>
                    <SelectItem value="special">특별</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="성과급 정책에 대한 상세 설명을 입력하세요"
              />
            </div>

            <div>
              <Label className="text-base font-semibold">분배 비율 설정</Label>
              <p className="text-sm text-muted-foreground mb-4">
                총합: {formData.ratio_base + formData.ratio_team + formData.ratio_personal + formData.ratio_company}%
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label>기본급 비중: {formData.ratio_base}%</Label>
                  <Slider
                    value={[formData.ratio_base]}
                    onValueChange={(value) => handleRatioChange('ratio_base', value[0])}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>팀 성과 비중: {formData.ratio_team}%</Label>
                  <Slider
                    value={[formData.ratio_team]}
                    onValueChange={(value) => handleRatioChange('ratio_team', value[0])}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>개인 성과 비중: {formData.ratio_personal}%</Label>
                  <Slider
                    value={[formData.ratio_personal]}
                    onValueChange={(value) => handleRatioChange('ratio_personal', value[0])}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>회사 성과 비중: {formData.ratio_company}%</Label>
                  <Slider
                    value={[formData.ratio_company]}
                    onValueChange={(value) => handleRatioChange('ratio_company', value[0])}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="calculation_method">계산 방식</Label>
                <Select value={formData.calculation_method} onValueChange={(value) => setFormData({...formData, calculation_method: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weighted">가중평균</SelectItem>
                    <SelectItem value="linear">선형계산</SelectItem>
                    <SelectItem value="exponential">지수계산</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="min_score">최소 성과 점수</Label>
                <Input
                  id="min_score"
                  type="number"
                  value={formData.min_performance_score}
                  onChange={(e) => setFormData({...formData, min_performance_score: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="max_multiplier">최대 성과급 배수</Label>
                <Input
                  id="max_multiplier"
                  type="number"
                  step="0.1"
                  value={formData.max_bonus_multiplier}
                  onChange={(e) => setFormData({...formData, max_bonus_multiplier: parseFloat(e.target.value) || 2})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="effective_from">적용 시작일</Label>
                <Input
                  id="effective_from"
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData({...formData, effective_from: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="effective_to">적용 종료일</Label>
                <Input
                  id="effective_to"
                  type="date"
                  value={formData.effective_to}
                  onChange={(e) => setFormData({...formData, effective_to: e.target.value})}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({...formData, is_default: checked})}
              />
              <Label htmlFor="is_default">기본 정책으로 설정</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              취소
            </Button>
            <Button onClick={handleSavePolicy}>
              {editingPolicy ? '수정' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 예산 설정 모달 */}
      <Dialog open={showBudgetModal} onOpenChange={setShowBudgetModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? '예산 수정' : '새 예산 설정'}
            </DialogTitle>
            <DialogDescription>
              연도별 성과급 예산을 설정하세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget_year">연도</Label>
                <Input
                  id="budget_year"
                  type="number"
                  value={budgetFormData.year}
                  onChange={(e) => setBudgetFormData({...budgetFormData, year: parseInt(e.target.value) || new Date().getFullYear()})}
                />
              </div>
              <div>
                <Label htmlFor="total_budget">총 예산 (원)</Label>
                <Input
                  id="total_budget"
                  type="number"
                  value={budgetFormData.total_budget}
                  onChange={(e) => setBudgetFormData({...budgetFormData, total_budget: parseFloat(e.target.value) || 0})}
                  placeholder="예: 50000000"
                />
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold">부서별 예산 배분</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {Object.entries(budgetFormData.department_allocations).map(([dept, amount]) => (
                  <div key={dept}>
                    <Label htmlFor={`dept_${dept}`}>{dept}</Label>
                    <Input
                      id={`dept_${dept}`}
                      type="number"
                      value={amount}
                      onChange={(e) => setBudgetFormData({
                        ...budgetFormData,
                        department_allocations: {
                          ...budgetFormData.department_allocations,
                          [dept]: parseFloat(e.target.value) || 0
                        }
                      })}
                      placeholder="예산 금액"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="budget_notes">비고</Label>
              <Textarea
                id="budget_notes"
                value={budgetFormData.notes}
                onChange={(e) => setBudgetFormData({...budgetFormData, notes: e.target.value})}
                placeholder="예산 설정에 대한 추가 설명"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBudgetModal(false)}>
              취소
            </Button>
            <Button onClick={handleSaveBudget}>
              {editingBudget ? '수정' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BonusPolicy;
