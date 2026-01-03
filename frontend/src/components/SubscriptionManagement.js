import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import {
  CreditCard,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Smartphone,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  Receipt,
  AlertCircle,
  Copy,
  Check,
  Pencil,
  Trash2,
  Plus,
  Settings,
  Snowflake,
  Play,
  Ban
} from 'lucide-react';
import { toast } from 'sonner';

// Plans are now fetched from API

const SubscriptionManagement = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isAssignPlanDialogOpen, setIsAssignPlanDialogOpen] = useState(false);
  const [isEditPlanDialogOpen, setIsEditPlanDialogOpen] = useState(false);
  const [isBkashConfigDialogOpen, setIsBkashConfigDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [bkashConfig, setBkashConfig] = useState({ bkash_merchant_number: '', bkash_merchant_name: '' });
  const [paymentForm, setPaymentForm] = useState({
    bkash_number: '',
    transaction_id: '',
    amount: 0
  });
  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    period: 'month',
    modules: []
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [copiedTxId, setCopiedTxId] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tenantsRes, subsRes, paymentsRes, plansRes, configRes] = await Promise.all([
        axios.get('/api/tenants'),
        axios.get('/api/subscriptions'),
        axios.get('/api/payments'),
        axios.get('/api/subscription-plans'),
        axios.get('/api/payments/config')
      ]);
      setTenants(tenantsRes.data || []);
      setPlans(plansRes.data || []);
      setBkashConfig(configRes.data || {});
      setSubscriptions(subsRes.data || []);
      setPayments(paymentsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchData();
    }
  }, [user, fetchData]);

  const getSubscriptionForTenant = (tenantId) => {
    return subscriptions.find(s => s.tenant_id === tenantId);
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
      frozen: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      no_plan: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500'
    };
    return styles[status] || styles.pending;
  };

  const handleFreezeSubscription = async (tenantId) => {
    try {
      await axios.put(`/api/subscriptions/${tenantId}/freeze`);
      toast.success('Subscription frozen successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to freeze subscription');
    }
  };

  const handleUnfreezeSubscription = async (tenantId) => {
    try {
      await axios.put(`/api/subscriptions/${tenantId}/unfreeze`);
      toast.success('Subscription unfrozen successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to unfreeze subscription');
    }
  };

  const handleRemovePlan = async (tenantId) => {
    try {
      await axios.put(`/api/subscriptions/${tenantId}/remove-plan`);
      toast.success('Subscription removed - Set to No Plan');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove subscription');
    }
  };

  const handleSyncPlan = async (tenantId) => {
    try {
      const response = await axios.put(`/api/subscriptions/${tenantId}/sync-plan`);
      toast.success(response.data.message || 'Plan synced from payment');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No payment found with plan info');
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedTenant || !selectedPlan) return;
    
    try {
      await axios.post('/api/subscriptions', {
        tenant_id: selectedTenant.id,
        plan_id: selectedPlan.id,
        plan_name: selectedPlan.name,
        price: selectedPlan.price,
        currency: selectedPlan.currency,
        period: selectedPlan.period,
        modules: selectedPlan.modules
      });
      toast.success(`${selectedPlan.name} plan assigned to ${selectedTenant.name}`);
      setIsAssignPlanDialogOpen(false);
      setSelectedTenant(null);
      setSelectedPlan(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to assign plan');
    }
  };

  const openPaymentDialog = (tenant, subscription) => {
    setSelectedTenant(tenant);
    const plan = plans.find(p => p.id === subscription?.plan_id) || plans[0] || {};
    setPaymentForm({
      bkash_number: '',
      transaction_id: '',
      amount: plan?.price || 0
    });
    setIsPaymentDialogOpen(true);
  };

  const handleBkashPayment = async () => {
    if (!paymentForm.bkash_number || !paymentForm.transaction_id) {
      toast.error('Please fill all payment details');
      return;
    }

    setProcessingPayment(true);
    try {
      await axios.post('/api/payments', {
        tenant_id: selectedTenant.id,
        amount: paymentForm.amount,
        currency: 'BDT',
        payment_method: 'bkash',
        bkash_number: paymentForm.bkash_number,
        transaction_id: paymentForm.transaction_id,
        status: 'pending'
      });
      toast.success('Payment recorded! Awaiting verification.');
      setIsPaymentDialogOpen(false);
      setPaymentForm({ bkash_number: '', transaction_id: '', amount: 0 });
      fetchData();
    } catch (error) {
      toast.error('Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const verifyPayment = async (paymentId) => {
    try {
      await axios.patch(`/api/payments/${paymentId}/verify`);
      toast.success('Payment verified successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to verify payment');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedTxId(true);
    setTimeout(() => setCopiedTxId(false), 2000);
  };

  const handleCreatePlan = async () => {
    try {
      await axios.post('/api/subscription-plans', planForm);
      toast.success('Plan created successfully');
      setIsEditPlanDialogOpen(false);
      setPlanForm({ name: '', price: '', period: 'month', modules: [] });
      fetchData();
    } catch (error) {
      toast.error('Failed to create plan');
    }
  };

  const handleUpdatePlan = async () => {
    try {
      await axios.put(`/api/subscription-plans/${editingPlan.id}`, planForm);
      toast.success('Plan updated successfully');
      setIsEditPlanDialogOpen(false);
      setEditingPlan(null);
      setPlanForm({ name: '', price: '', period: 'month', modules: [] });
      fetchData();
    } catch (error) {
      toast.error('Failed to update plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    try {
      await axios.delete(`/api/subscription-plans/${planId}`);
      toast.success('Plan deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete plan');
    }
  };

  const handleSaveBkashConfig = async () => {
    try {
      await axios.put('/api/payments/config', bkashConfig);
      toast.success('bKash settings saved successfully');
      setIsBkashConfigDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save bKash settings');
    }
  };

  const openEditPlanDialog = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name,
        price: plan?.price || 0,
        period: plan.period || 'month',
        modules: plan.modules || []
      });
    } else {
      setEditingPlan(null);
      setPlanForm({ name: '', price: '', period: 'month', modules: [] });
    }
    setIsEditPlanDialogOpen(true);
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.domain?.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'all') return matchesSearch;
    const sub = getSubscriptionForTenant(t.id);
    if (statusFilter === 'active') return matchesSearch && sub?.status === 'active';
    if (statusFilter === 'expired') return matchesSearch && (!sub || sub?.status === 'expired');
    if (statusFilter === 'pending') return matchesSearch && sub?.status === 'pending';
    return matchesSearch;
  });

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Access denied. Super Admin only.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Management</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage school subscriptions and payments</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        {['subscriptions', 'plans', 'payments'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-emerald-600 border-b-2 border-emerald-600 dark:text-emerald-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search schools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No schools found</div>
            ) : (
              filteredTenants.map((tenant) => {
                const subscription = getSubscriptionForTenant(tenant.id);
                const plan = plans.find(p => p.id === subscription?.plan_id);
                
                return (
                  <Card key={tenant.id} className="dark:bg-gray-800">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg shrink-0">
                            <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{tenant.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{tenant.domain}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {subscription ? (
                                <>
                                  <Badge className={getStatusBadge(subscription.status)}>
                                    {subscription.status}
                                  </Badge>
                                  <Badge variant="outline" className={`${!plan?.name && !subscription.plan_name ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400' : 'dark:border-gray-600'}`}>
                                    {plan?.name || subscription.plan_name || 'No Plan Assigned'}
                                  </Badge>
                                  {subscription.expires_at && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Expires: {new Date(subscription.expires_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                  No Subscription
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setIsAssignPlanDialogOpen(true);
                            }}
                            className="gap-1"
                          >
                            <CreditCard className="h-4 w-4" />
                            {subscription ? 'Change Plan' : 'Assign Plan'}
                          </Button>
                          {subscription && !plan?.name && !subscription.plan_name && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncPlan(tenant.id)}
                              className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/30"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Sync Plan
                            </Button>
                          )}
                          {subscription && (
                            <Button
                              size="sm"
                              onClick={() => openPaymentDialog(tenant, subscription)}
                              className="gap-1 bg-pink-600 hover:bg-pink-700"
                            >
                              <Smartphone className="h-4 w-4" />
                              bKash Payment
                            </Button>
                          )}
                          {subscription && subscription.status !== 'frozen' && subscription.status !== 'no_plan' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFreezeSubscription(tenant.id)}
                              className="gap-1 text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/30"
                            >
                              <Snowflake className="h-4 w-4" />
                              Freeze
                            </Button>
                          )}
                          {subscription && subscription.status === 'frozen' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnfreezeSubscription(tenant.id)}
                              className="gap-1 text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/30"
                            >
                              <Play className="h-4 w-4" />
                              Unfreeze
                            </Button>
                          )}
                          {subscription && subscription.status !== 'no_plan' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemovePlan(tenant.id)}
                              className="gap-1 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30"
                            >
                              <Ban className="h-4 w-4" />
                              No Plan
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-4">
          {/* bKash Settings */}
          <Card className="dark:bg-gray-800 border-pink-200 dark:border-pink-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-pink-600" />
                  bKash Payment Settings
                </CardTitle>
                <Button size="sm" onClick={() => setIsBkashConfigDialogOpen(true)} className="gap-1 bg-pink-600 hover:bg-pink-700">
                  <Settings className="w-4 h-4" />
                  Configure
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Merchant Number</p>
                  <p className="font-mono font-bold text-pink-600 dark:text-pink-400">{bkashConfig.bkash_merchant_number || 'Not configured'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Merchant Name</p>
                  <p className="font-medium dark:text-white">{bkashConfig.bkash_merchant_name || 'Not configured'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plans Management */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold dark:text-white">Subscription Plans</h3>
            <Button onClick={() => openEditPlanDialog()} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4" />
              Add Plan
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan, index) => (
              <Card key={plan.id} className={`relative dark:bg-gray-800 ${index === 2 ? 'border-2 border-emerald-500' : ''}`}>
                {index === 2 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditPlanDialog(plan)} className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDeletePlan(plan.id)} className="h-8 w-8 text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">৳{plan.price?.toLocaleString()}</span>
                    <span className="text-gray-500 dark:text-gray-400">/{plan.period || 'month'}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Modules:</p>
                    <div className="flex flex-wrap gap-1">
                      {(plan.modules || []).slice(0, 5).map((module, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{module}</Badge>
                      ))}
                      {(plan.modules || []).length > 5 && (
                        <Badge variant="secondary" className="text-xs">+{(plan.modules || []).length - 5} more</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">School</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Method</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Transaction ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">No payments recorded</td>
                  </tr>
                ) : (
                  payments.map((payment) => {
                    const tenant = tenants.find(t => t.id === payment.tenant_id);
                    return (
                      <tr key={payment.id} className="border-b dark:border-gray-700">
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900 dark:text-white">{tenant?.name || 'Unknown'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900 dark:text-white">৳{payment.amount?.toLocaleString()}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400">
                            {payment.payment_method === 'bkash' ? 'bKash' : payment.payment_method}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{payment.transaction_id}</code>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusBadge(payment.status === 'verified' ? 'active' : payment.status)}>
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {payment.status === 'pending' && (
                            <Button size="sm" onClick={() => verifyPayment(payment.id)} className="gap-1 bg-green-600 hover:bg-green-700">
                              <CheckCircle className="h-3 w-3" />
                              Verify
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={isAssignPlanDialogOpen} onOpenChange={setIsAssignPlanDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Select a plan for <strong>{selectedTenant?.name}</strong>
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedPlan?.id === plan.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{plan.name}</h4>
                    {selectedPlan?.id === plan.id && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">৳{plan.price?.toLocaleString() || 0}<span className="text-sm font-normal text-gray-500">/{plan.period}</span></p>
                  <ul className="mt-2 space-y-1">
                    {(plan.features || []).slice(0, 3).map((f, i) => (
                      <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-500" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignPlanDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignPlan} disabled={!selectedPlan} className="bg-emerald-600 hover:bg-emerald-700">
              Assign Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <Smartphone className="h-5 w-5 text-pink-600" />
              </div>
              bKash Payment
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4 border border-pink-200 dark:border-pink-800">
              <p className="text-sm text-pink-800 dark:text-pink-300 mb-2">Send payment to:</p>
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3">
                <div>
                  <p className="font-mono text-lg font-bold text-gray-900 dark:text-white">01712-345678</p>
                  <p className="text-xs text-gray-500">bKash Merchant</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard('01712345678')} className="gap-1">
                  {copiedTxId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Amount to pay:</p>
                <p className="text-2xl font-bold text-pink-600">৳{paymentForm.amount.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="bkash_number">Your bKash Number</Label>
                <Input
                  id="bkash_number"
                  placeholder="01XXXXXXXXX"
                  value={paymentForm.bkash_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bkash_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="transaction_id">Transaction ID (TxnID)</Label>
                <Input
                  id="transaction_id"
                  placeholder="e.g. 8KJ2H3K4J5"
                  value={paymentForm.transaction_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">Enter the TxnID from your bKash payment confirmation</p>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                Payment will be verified within 24 hours. Subscription will be activated after verification.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleBkashPayment} 
              disabled={processingPayment}
              className="bg-pink-600 hover:bg-pink-700 gap-2"
            >
              {processingPayment ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Submit Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Plan Dialog */}
      <Dialog open={isEditPlanDialogOpen} onOpenChange={setIsEditPlanDialogOpen}>
        <DialogContent className="dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="dark:text-gray-300">Plan Name</Label>
              <Input
                value={planForm.name}
                onChange={(e) => setPlanForm({...planForm, name: e.target.value})}
                placeholder="e.g., Premium Plan"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-gray-300">Price (BDT)</Label>
              <Input
                type="number"
                value={planForm.price}
                onChange={(e) => setPlanForm({...planForm, price: parseInt(e.target.value) || 0})}
                placeholder="e.g., 5999"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-gray-300">Billing Period</Label>
              <select
                value={planForm.period}
                onChange={(e) => setPlanForm({...planForm, period: e.target.value})}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
            <div>
              <Label className="dark:text-gray-300">Modules (comma separated)</Label>
              <Input
                value={(planForm.modules || []).join(', ')}
                onChange={(e) => setPlanForm({...planForm, modules: e.target.value.split(',').map(m => m.trim()).filter(Boolean)})}
                placeholder="e.g., students, staff, classes, attendance"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPlanDialogOpen(false)} className="dark:border-gray-600 dark:text-gray-300">
              Cancel
            </Button>
            <Button onClick={editingPlan ? handleUpdatePlan : handleCreatePlan} className="bg-emerald-600 hover:bg-emerald-700">
              {editingPlan ? 'Update' : 'Create'} Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* bKash Config Dialog */}
      <Dialog open={isBkashConfigDialogOpen} onOpenChange={setIsBkashConfigDialogOpen}>
        <DialogContent className="dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              <Smartphone className="w-5 h-5 text-pink-600" />
              bKash Payment Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="dark:text-gray-300">bKash Merchant Number</Label>
              <Input
                value={bkashConfig.bkash_merchant_number || ''}
                onChange={(e) => setBkashConfig({...bkashConfig, bkash_merchant_number: e.target.value})}
                placeholder="e.g., 01712-345678"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-gray-300">Merchant Name</Label>
              <Input
                value={bkashConfig.bkash_merchant_name || ''}
                onChange={(e) => setBkashConfig({...bkashConfig, bkash_merchant_name: e.target.value})}
                placeholder="e.g., Cloud School ERP"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
              <p className="text-sm text-pink-800 dark:text-pink-300">
                This is the bKash number where school admins will send payments. Make sure it's correct!
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBkashConfigDialogOpen(false)} className="dark:border-gray-600 dark:text-gray-300">
              Cancel
            </Button>
            <Button onClick={handleSaveBkashConfig} className="bg-pink-600 hover:bg-pink-700">
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionManagement;
