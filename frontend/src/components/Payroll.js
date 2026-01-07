import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { toast } from 'sonner';
import {
  Wallet,
  Users,
  FileText,
  Download,
  Check,
  Lock,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Loader2,
  Settings,
  CreditCard,
  Gift,
  PiggyBank,
  BarChart3,
  Eye,
  Plus,
  RefreshCw,
  Building2,
  Printer,
  Edit2,
  Trash2,
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '/api';

const getAuthToken = () => {
  const token = localStorage.getItem('token');
  return token ? `Bearer ${token}` : null;
};

const currencySymbols = {
  'BDT': '৳', 'USD': '$', 'EUR': '€', 'GBP': '£',
  'INR': '₹', 'JPY': '¥', 'CNY': '¥', 'AUD': 'A$', 'CAD': 'C$'
};

const Payroll = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('BDT');
  
  const [dashboard, setDashboard] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [payments, setPayments] = useState([]);
  const [settings, setSettings] = useState(null);
  
  const [processYear, setProcessYear] = useState(new Date().getFullYear());
  const [processMonth, setProcessMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [showBonusForm, setShowBonusForm] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingSalaryStructure, setEditingSalaryStructure] = useState(null);
  const [editingBonus, setEditingBonus] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);

  const formatCurrency = useCallback((amount) => {
    const symbol = currencySymbols[currency] || currency + ' ';
    return `${symbol}${Number(amount || 0).toLocaleString()}`;
  }, [currency]);

  const months = [
    { value: 1, label: 'জানুয়ারি' },
    { value: 2, label: 'ফেব্রুয়ারি' },
    { value: 3, label: 'মার্চ' },
    { value: 4, label: 'এপ্রিল' },
    { value: 5, label: 'মে' },
    { value: 6, label: 'জুন' },
    { value: 7, label: 'জুলাই' },
    { value: 8, label: 'আগস্ট' },
    { value: 9, label: 'সেপ্টেম্বর' },
    { value: 10, label: 'অক্টোবর' },
    { value: 11, label: 'নভেম্বর' },
    { value: 12, label: 'ডিসেম্বর' }
  ];

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/payroll/dashboard`, {
        headers: { Authorization: getAuthToken() }
      });
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  }, []);

  const fetchPayrolls = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/payroll/list`, {
        params: { year: filterYear },
        headers: { Authorization: getAuthToken() }
      });
      setPayrolls(response.data);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      toast.error('বেতন তালিকা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [filterYear]);

  const fetchPayrollDetails = useCallback(async (payrollId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/payroll/${payrollId}`, {
        headers: { Authorization: getAuthToken() }
      });
      setSelectedPayroll(response.data);
    } catch (error) {
      toast.error('বেতন বিবরণ লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSalaryStructures = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/payroll/salary-structures`, {
        headers: { Authorization: getAuthToken() }
      });
      setSalaryStructures(response.data);
    } catch (error) {
      console.error('Error fetching salary structures:', error);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/staff`, {
        headers: { Authorization: getAuthToken() }
      });
      setEmployees(response.data.filter(e => e.status === 'Active'));
      const depts = [...new Set(response.data.map(e => e.department).filter(Boolean))];
      setDepartments(depts);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, []);

  const fetchBonuses = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/payroll/bonuses`, {
        params: { year: filterYear },
        headers: { Authorization: getAuthToken() }
      });
      setBonuses(response.data);
    } catch (error) {
      console.error('Error fetching bonuses:', error);
    }
  }, [filterYear]);

  const fetchAdvances = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/payroll/advances`, {
        headers: { Authorization: getAuthToken() }
      });
      setAdvances(response.data);
    } catch (error) {
      console.error('Error fetching advances:', error);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/payroll/payments`, {
        params: { year: filterYear },
        headers: { Authorization: getAuthToken() }
      });
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  }, [filterYear]);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/payroll/settings`, {
        headers: { Authorization: getAuthToken() }
      });
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  const fetchInstitution = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/institution`, {
        headers: { Authorization: getAuthToken() }
      });
      setCurrency(response.data.currency || 'BDT');
    } catch (error) {
      console.error('Error fetching institution:', error);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchPayrolls();
    fetchEmployees();
    fetchInstitution();
  }, [fetchDashboard, fetchPayrolls, fetchEmployees, fetchInstitution]);

  useEffect(() => {
    if (activeTab === 'salary-structures') fetchSalaryStructures();
    if (activeTab === 'bonuses') fetchBonuses();
    if (activeTab === 'advances') fetchAdvances();
    if (activeTab === 'payments') fetchPayments();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab, fetchSalaryStructures, fetchBonuses, fetchAdvances, fetchPayments, fetchSettings]);

  const handleProcessPayroll = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/payroll/process`, {
        year: processYear,
        month: processMonth
      }, {
        headers: { Authorization: getAuthToken() }
      });
      toast.success(response.data.message || 'বেতন প্রক্রিয়া সফল হয়েছে');
      fetchPayrolls();
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'বেতন প্রক্রিয়া ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayroll = async (payrollId, action) => {
    try {
      setLoading(true);
      await axios.post(`${API}/payroll/${payrollId}/approve`, { action }, {
        headers: { Authorization: getAuthToken() }
      });
      toast.success(action === 'approve' ? 'বেতন অনুমোদিত হয়েছে' : 'বেতন প্রত্যাখ্যাত হয়েছে');
      fetchPayrolls();
      if (selectedPayroll?.id === payrollId) {
        fetchPayrollDetails(payrollId);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'বেতন আপডেট ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const handleLockPayroll = async (payrollId) => {
    try {
      setLoading(true);
      await axios.post(`${API}/payroll/${payrollId}/lock`, {}, {
        headers: { Authorization: getAuthToken() }
      });
      toast.success('বেতন লক করা হয়েছে');
      fetchPayrolls();
      if (selectedPayroll?.id === payrollId) {
        fetchPayrollDetails(payrollId);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'বেতন লক করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPayslip = async (payrollId, itemId, employeeName, monthName, year) => {
    try {
      const response = await axios.get(`${API}/payroll/${payrollId}/items/${itemId}/payslip/pdf`, {
        headers: { Authorization: getAuthToken() },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `বেতন_স্লিপ_${employeeName}_${monthName}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('বেতন স্লিপ ডাউনলোড হয়েছে');
    } catch (error) {
      toast.error('বেতন স্লিপ ডাউনলোড ব্যর্থ');
    }
  };

  const handleDownloadReport = async (format) => {
    try {
      const response = await axios.get(`${API}/payroll/reports/monthly`, {
        params: { year: selectedPayroll.year, month: selectedPayroll.month, format },
        headers: { Authorization: getAuthToken() },
        responseType: format === 'excel' ? 'blob' : 'json'
      });
      
      if (format === 'excel') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `বেতন_রিপোর্ট_${selectedPayroll.month_name}_${selectedPayroll.year}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('রিপোর্ট ডাউনলোড হয়েছে');
      }
    } catch (error) {
      toast.error('রিপোর্ট ডাউনলোড ব্যর্থ');
    }
  };

  const handleRecordPayment = async (payrollId, itemId, paymentData) => {
    try {
      await axios.post(`${API}/payroll/${payrollId}/items/${itemId}/payment`, paymentData, {
        headers: { Authorization: getAuthToken() }
      });
      toast.success('পেমেন্ট রেকর্ড হয়েছে');
      fetchPayrollDetails(payrollId);
      setShowPaymentForm(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'পেমেন্ট রেকর্ড ব্যর্থ');
    }
  };

  // Delete salary structure
  const handleDeleteSalaryStructure = async (structureId) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই বেতন কাঠামো মুছে ফেলতে চান?')) return;
    try {
      setLoading(true);
      await axios.delete(`${API}/payroll/salary-structures/${structureId}`, {
        headers: { Authorization: getAuthToken() }
      });
      toast.success('বেতন কাঠামো সফলভাবে মুছে ফেলা হয়েছে');
      fetchSalaryStructures();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'বেতন কাঠামো মুছতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  // Update salary structure
  const handleUpdateSalaryStructure = async (structureId, data) => {
    try {
      setLoading(true);
      await axios.put(`${API}/payroll/salary-structures/${structureId}`, data, {
        headers: { Authorization: getAuthToken() }
      });
      toast.success('বেতন কাঠামো সফলভাবে আপডেট হয়েছে');
      setEditingSalaryStructure(null);
      setShowSalaryForm(false);
      fetchSalaryStructures();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'বেতন কাঠামো আপডেট করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  // Delete bonus
  const handleDeleteBonus = async (bonusId) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই বোনাস মুছে ফেলতে চান?')) return;
    try {
      setLoading(true);
      await axios.delete(`${API}/payroll/bonuses/${bonusId}`, {
        headers: { Authorization: getAuthToken() }
      });
      toast.success('বোনাস সফলভাবে মুছে ফেলা হয়েছে');
      fetchBonuses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'বোনাস মুছতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  // Update bonus
  const handleUpdateBonus = async (bonusId, data) => {
    try {
      setLoading(true);
      await axios.put(`${API}/payroll/bonuses/${bonusId}`, data, {
        headers: { Authorization: getAuthToken() }
      });
      toast.success('বোনাস সফলভাবে আপডেট হয়েছে');
      setEditingBonus(null);
      setShowBonusForm(false);
      fetchBonuses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'বোনাস আপডেট করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  // Delete advance
  const handleDeleteAdvance = async (advanceId) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই অগ্রিম মুছে ফেলতে চান?')) return;
    try {
      setLoading(true);
      await axios.delete(`${API}/payroll/advances/${advanceId}`, {
        headers: { Authorization: getAuthToken() }
      });
      toast.success('অগ্রিম সফলভাবে মুছে ফেলা হয়েছে');
      fetchAdvances();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'অগ্রিম মুছতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  // Update advance
  const handleUpdateAdvance = async (advanceId, data) => {
    try {
      setLoading(true);
      await axios.put(`${API}/payroll/advances/${advanceId}`, data, {
        headers: { Authorization: getAuthToken() }
      });
      toast.success('অগ্রিম সফলভাবে আপডেট হয়েছে');
      setEditingAdvance(null);
      setShowAdvanceForm(false);
      fetchAdvances();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'অগ্রিম আপডেট করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      locked: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      unpaid: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      not_processed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    
    const statusLabels = {
      draft: 'খসড়া',
      approved: 'অনুমোদিত',
      locked: 'লক',
      rejected: 'প্রত্যাখ্যাত',
      paid: 'পরিশোধিত',
      unpaid: 'অপরিশোধিত',
      not_processed: 'প্রক্রিয়াকৃত নয়'
    };

    return (
      <Badge className={statusStyles[status] || statusStyles.draft}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-emerald-600" />
            বেতন ব্যবস্থাপনা
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            কর্মচারীদের বেতন, বোনাস ও পেমেন্ট ব্যবস্থাপনা
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
        <TabsList className="flex flex-wrap sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-1 sm:gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg overflow-x-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">ড্যাশবোর্ড</span>
            <span className="sm:hidden">ড্যাশ</span>
          </TabsTrigger>
          <TabsTrigger value="payrolls" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">বেতন তালিকা</span>
            <span className="sm:hidden">তালিকা</span>
          </TabsTrigger>
          <TabsTrigger value="salary-structures" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">বেতন কাঠামো</span>
            <span className="sm:hidden">কাঠামো</span>
          </TabsTrigger>
          <TabsTrigger value="bonuses" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
            <Gift className="h-3 w-3 sm:h-4 sm:w-4" />
            বোনাস
          </TabsTrigger>
          <TabsTrigger value="advances" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
            <PiggyBank className="h-3 w-3 sm:h-4 sm:w-4" />
            অগ্রিম
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
            পেমেন্ট
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            সেটিংস
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-800/40 border-emerald-200 dark:border-emerald-700">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">চলতি মাসের বেতন</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-800 dark:text-emerald-200 truncate">
                      {formatCurrency(dashboard?.current_month?.total_net || 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 truncate">
                      {dashboard?.current_month?.month_name} {dashboard?.current_month?.year}
                    </p>
                  </div>
                  <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 ml-2">
                    <Wallet className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <div className="mt-2">
                  {getStatusBadge(dashboard?.current_month?.status || 'not_processed')}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 border-blue-200 dark:border-blue-700">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 truncate">সক্রিয় কর্মচারী</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-800 dark:text-blue-200">
                      {dashboard?.active_employees || 0}
                    </p>
                    <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">জন</p>
                  </div>
                  <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 ml-2">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40 border-purple-200 dark:border-purple-700">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 truncate">বছর পর্যন্ত মোট</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-800 dark:text-purple-200 truncate">
                      {formatCurrency(dashboard?.year_to_date_total || 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 truncate">
                      {dashboard?.processed_months || 0} মাস প্রক্রিয়াকৃত
                    </p>
                  </div>
                  <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 ml-2">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 border-orange-200 dark:border-orange-700">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300 truncate">বকেয়া অগ্রিম</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-800 dark:text-orange-200">
                      {dashboard?.pending_advances || 0}
                    </p>
                    <p className="text-xs sm:text-sm text-orange-600 dark:text-orange-400">টি সক্রিয়</p>
                  </div>
                  <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 ml-2">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-emerald-600" />
                বেতন প্রক্রিয়া করুন
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>বছর</Label>
                  <Select value={String(processYear)} onValueChange={(v) => setProcessYear(Number(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2023, 2024, 2025, 2026].map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>মাস</Label>
                  <Select value={String(processMonth)} onValueChange={(v) => setProcessMonth(Number(v))}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(m => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleProcessPayroll}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  বেতন প্রক্রিয়া করুন
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payrolls">
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>বেতনের তালিকা</CardTitle>
                <div className="flex gap-2 items-center">
                  <Label>বছর:</Label>
                  <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2023, 2024, 2025, 2026].map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedPayroll ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedPayroll.month_name} {selectedPayroll.year}
                      </h3>
                      {getStatusBadge(selectedPayroll.status)}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setSelectedPayroll(null)}>
                        ফিরে যান
                      </Button>
                      {selectedPayroll.status === 'draft' && (
                        <>
                          <Button 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprovePayroll(selectedPayroll.id, 'approve')}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            অনুমোদন
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={() => handleApprovePayroll(selectedPayroll.id, 'reject')}
                          >
                            প্রত্যাখ্যান
                          </Button>
                        </>
                      )}
                      {selectedPayroll.status === 'approved' && (
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleLockPayroll(selectedPayroll.id)}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          লক করুন
                        </Button>
                      )}
                      <Button 
                        variant="outline"
                        onClick={() => handleDownloadReport('excel')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        এক্সেল
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Card className="bg-gray-50 dark:bg-gray-700">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">মোট আয়</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(selectedPayroll.total_gross_salary)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-50 dark:bg-gray-700">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">মোট কর্তন</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(selectedPayroll.total_deductions)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-50 dark:bg-gray-700">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">নেট বেতন</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(selectedPayroll.total_net_salary)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>কর্মচারী</TableHead>
                        <TableHead>বিভাগ</TableHead>
                        <TableHead className="text-right">মোট আয়</TableHead>
                        <TableHead className="text-right">কর্তন</TableHead>
                        <TableHead className="text-right">নেট</TableHead>
                        <TableHead>পরিশোধ</TableHead>
                        <TableHead>কার্যক্রম</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPayroll.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.employee_name}</p>
                              <p className="text-sm text-gray-500">{item.employee_employee_id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{item.department}</p>
                              <p className="text-sm text-gray-500">{item.designation}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.gross_salary)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(item.total_deductions)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            {formatCurrency(item.net_salary)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(item.payment?.status || 'unpaid')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDownloadPayslip(
                                  selectedPayroll.id, 
                                  item.id, 
                                  item.employee_name,
                                  selectedPayroll.month_name,
                                  selectedPayroll.year
                                )}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              {selectedPayroll.status === 'approved' && item.payment?.status !== 'paid' && (
                                <Button 
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowPaymentForm(true);
                                  }}
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>মাস</TableHead>
                      <TableHead>অবস্থা</TableHead>
                      <TableHead className="text-right">কর্মচারী</TableHead>
                      <TableHead className="text-right">মোট আয়</TableHead>
                      <TableHead className="text-right">নেট বেতন</TableHead>
                      <TableHead>কার্যক্রম</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                        </TableCell>
                      </TableRow>
                    ) : payrolls.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {filterYear} সালের কোনো বেতন পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    ) : (
                      payrolls.map((payroll) => (
                        <TableRow key={payroll.id}>
                          <TableCell className="font-medium">
                            {payroll.month_name} {payroll.year}
                          </TableCell>
                          <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                          <TableCell className="text-right">{payroll.total_employees}</TableCell>
                          <TableCell className="text-right">{formatCurrency(payroll.total_gross_salary)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            {formatCurrency(payroll.total_net_salary)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => fetchPayrollDetails(payroll.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              দেখুন
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary-structures">
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>বেতন কাঠামো</CardTitle>
                <Button onClick={() => setShowSalaryForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  কাঠামো যোগ করুন
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>কর্মচারী</TableHead>
                    <TableHead>বিভাগ</TableHead>
                    <TableHead className="text-right">মূল বেতন</TableHead>
                    <TableHead className="text-right">বাসা ভাড়া</TableHead>
                    <TableHead className="text-right">খাবার</TableHead>
                    <TableHead className="text-right">যাতায়াত</TableHead>
                    <TableHead className="text-right">মোট</TableHead>
                    <TableHead>অবস্থা</TableHead>
                    <TableHead>কার্যক্রম</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryStructures.map((struct) => (
                    <TableRow key={struct.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{struct.employee_name}</p>
                          <p className="text-sm text-gray-500">{struct.employee_designation}</p>
                        </div>
                      </TableCell>
                      <TableCell>{struct.employee_department}</TableCell>
                      <TableCell className="text-right">{formatCurrency(struct.basic_salary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(struct.house_rent_allowance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(struct.food_allowance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(struct.transport_allowance)}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(
                          (struct.basic_salary || 0) +
                          (struct.house_rent_allowance || 0) +
                          (struct.food_allowance || 0) +
                          (struct.transport_allowance || 0) +
                          (struct.medical_allowance || 0) +
                          (struct.other_allowance || 0)
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={struct.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {struct.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingSalaryStructure(struct);
                              setShowSalaryForm(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteSalaryStructure(struct.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonuses">
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>বোনাস তালিকা</CardTitle>
                <Button onClick={() => setShowBonusForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  বোনাস যোগ করুন
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>বোনাসের নাম</TableHead>
                    <TableHead>ধরন</TableHead>
                    <TableHead>প্রযোজ্য</TableHead>
                    <TableHead className="text-right">পরিমাণ</TableHead>
                    <TableHead>মাস</TableHead>
                    <TableHead>কার্যক্রম</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonuses.map((bonus) => (
                    <TableRow key={bonus.id}>
                      <TableCell className="font-medium">{bonus.bonus_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {bonus.bonus_type === 'percentage' ? 'শতাংশ' : 'নির্দিষ্ট'}
                        </Badge>
                      </TableCell>
                      <TableCell>{bonus.applicable_to}</TableCell>
                      <TableCell className="text-right">
                        {bonus.bonus_type === 'percentage' 
                          ? `${bonus.percentage}%` 
                          : formatCurrency(bonus.amount)}
                      </TableCell>
                      <TableCell>
                        {months.find(m => m.value === bonus.effective_month)?.label} {bonus.effective_year}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingBonus(bonus);
                              setShowBonusForm(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteBonus(bonus.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advances">
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>অগ্রিম ও ঋণ</CardTitle>
                <Button onClick={() => setShowAdvanceForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  অগ্রিম যোগ করুন
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>কর্মচারী</TableHead>
                    <TableHead>কারণ</TableHead>
                    <TableHead className="text-right">পরিমাণ</TableHead>
                    <TableHead className="text-right">মাসিক কর্তন</TableHead>
                    <TableHead className="text-right">বাকি</TableHead>
                    <TableHead>অবস্থা</TableHead>
                    <TableHead>কার্যক্রম</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.map((advance) => (
                    <TableRow key={advance.id}>
                      <TableCell className="font-medium">{advance.employee_name}</TableCell>
                      <TableCell>{advance.reason}</TableCell>
                      <TableCell className="text-right">{formatCurrency(advance.amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(advance.monthly_deduction)}</TableCell>
                      <TableCell className="text-right font-bold text-orange-600">
                        {formatCurrency(advance.remaining_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={advance.is_active ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                          {advance.is_active ? 'সক্রিয়' : 'নিষ্পত্তি'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingAdvance(advance);
                              setShowAdvanceForm(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteAdvance(advance.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle>পেমেন্ট রেকর্ড</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>কর্মচারী</TableHead>
                    <TableHead>মাস</TableHead>
                    <TableHead className="text-right">নেট বেতন</TableHead>
                    <TableHead>পদ্ধতি</TableHead>
                    <TableHead>রেফারেন্স</TableHead>
                    <TableHead>তারিখ</TableHead>
                    <TableHead>অবস্থা</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{payment.employee_name}</TableCell>
                      <TableCell>
                        {months.find(m => m.value === payment.month)?.label} {payment.year}
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(payment.net_salary)}</TableCell>
                      <TableCell>{payment.payment_method || '-'}</TableCell>
                      <TableCell>{payment.payment_reference || '-'}</TableCell>
                      <TableCell>{payment.payment_date || '-'}</TableCell>
                      <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle>বেতন সেটিংস</CardTitle>
            </CardHeader>
            <CardContent>
              {settings ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">উপস্থিতি নিয়ম</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span>কর্মদিবস/মাস</span>
                        <span className="font-bold">{settings.working_days_per_month}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span>বিলম্ব কর্তন সক্রিয়</span>
                        <Badge className={settings.late_deduction_enabled ? 'bg-green-100' : 'bg-gray-100'}>
                          {settings.late_deduction_enabled ? 'হ্যাঁ' : 'না'}
                        </Badge>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span>বিলম্ব দিন সীমা</span>
                        <span className="font-bold">{settings.late_days_threshold} দিন</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span>বিলম্ব কর্তন পরিমাণ</span>
                        <span className="font-bold">{formatCurrency(settings.late_deduction_amount)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">কর্তন নিয়ম</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span>অনুপস্থিত কর্তন/দিন</span>
                        <span className="font-bold">
                          {settings.absent_deduction_per_day > 0 
                            ? formatCurrency(settings.absent_deduction_per_day)
                            : 'দৈনিক হার'}
                        </span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span>অর্ধদিবস কর্তন হার</span>
                        <span className="font-bold">{(settings.half_day_deduction_rate * 100)}%</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span>ওভারটাইম সক্রিয়</span>
                        <Badge className={settings.overtime_enabled ? 'bg-green-100' : 'bg-gray-100'}>
                          {settings.overtime_enabled ? 'হ্যাঁ' : 'না'}
                        </Badge>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span>ওভারটাইম হার/ঘণ্টা</span>
                        <span className="font-bold">{formatCurrency(settings.overtime_rate_per_hour)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>এখনো কোনো বেতন সেটিংস কনফিগার করা হয়নি</p>
                  <Button className="mt-4" onClick={() => setShowSettingsForm(true)}>
                    সেটিংস কনফিগার করুন
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showPaymentForm && selectedItem && selectedPayroll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>পেমেন্ট রেকর্ড করুন</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentForm
                item={selectedItem}
                onSubmit={(data) => handleRecordPayment(selectedPayroll.id, selectedItem.id, data)}
                onCancel={() => {
                  setShowPaymentForm(false);
                  setSelectedItem(null);
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {showSalaryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                {editingSalaryStructure ? 'বেতন কাঠামো সম্পাদনা করুন' : 'বেতন কাঠামো যোগ করুন'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SalaryStructureForm
                employees={employees}
                departments={departments}
                initialData={editingSalaryStructure}
                onSubmit={async (data) => {
                  if (editingSalaryStructure) {
                    await handleUpdateSalaryStructure(editingSalaryStructure.id, data);
                  } else {
                    try {
                      setLoading(true);
                      await axios.post(`${API}/payroll/salary-structures`, data, {
                        headers: { Authorization: getAuthToken() }
                      });
                      toast.success('বেতন কাঠামো সফলভাবে যোগ হয়েছে');
                      setShowSalaryForm(false);
                      fetchSalaryStructures();
                    } catch (error) {
                      toast.error(error.response?.data?.detail || 'বেতন কাঠামো যোগ করতে ব্যর্থ');
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                onCancel={() => {
                  setShowSalaryForm(false);
                  setEditingSalaryStructure(null);
                }}
                loading={loading}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {showBonusForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-600" />
                {editingBonus ? 'বোনাস সম্পাদনা করুন' : 'বোনাস যোগ করুন'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BonusForm
                employees={employees}
                departments={departments}
                months={months}
                initialData={editingBonus}
                onSubmit={async (data) => {
                  if (editingBonus) {
                    await handleUpdateBonus(editingBonus.id, data);
                  } else {
                    try {
                      setLoading(true);
                      await axios.post(`${API}/payroll/bonuses`, data, {
                        headers: { Authorization: getAuthToken() }
                      });
                      toast.success('বোনাস সফলভাবে যোগ হয়েছে');
                      setShowBonusForm(false);
                      fetchBonuses();
                    } catch (error) {
                      toast.error(error.response?.data?.detail || 'বোনাস যোগ করতে ব্যর্থ');
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                onCancel={() => {
                  setShowBonusForm(false);
                  setEditingBonus(null);
                }}
                loading={loading}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {showAdvanceForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-orange-600" />
                {editingAdvance ? 'অগ্রিম সম্পাদনা করুন' : 'অগ্রিম যোগ করুন'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdvanceForm
                employees={employees}
                initialData={editingAdvance}
                onSubmit={async (data) => {
                  if (editingAdvance) {
                    await handleUpdateAdvance(editingAdvance.id, data);
                  } else {
                    try {
                      setLoading(true);
                      await axios.post(`${API}/payroll/advances`, data, {
                        headers: { Authorization: getAuthToken() }
                      });
                      toast.success('অগ্রিম সফলভাবে যোগ হয়েছে');
                      setShowAdvanceForm(false);
                      fetchAdvances();
                    } catch (error) {
                      toast.error(error.response?.data?.detail || 'অগ্রিম যোগ করতে ব্যর্থ');
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                onCancel={() => {
                  setShowAdvanceForm(false);
                  setEditingAdvance(null);
                }}
                loading={loading}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {showSettingsForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                বেতন সেটিংস
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsForm
                initialSettings={settings}
                onSubmit={async (data) => {
                  try {
                    setLoading(true);
                    await axios.put(`${API}/payroll/settings`, data, {
                      headers: { Authorization: getAuthToken() }
                    });
                    toast.success('সেটিংস সফলভাবে আপডেট হয়েছে');
                    setShowSettingsForm(false);
                    fetchSettings();
                  } catch (error) {
                    toast.error(error.response?.data?.detail || 'সেটিংস আপডেট করতে ব্যর্থ');
                  } finally {
                    setLoading(false);
                  }
                }}
                onCancel={() => setShowSettingsForm(false)}
                loading={loading}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const PaymentForm = ({ item, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    payment_method: 'Bank',
    payment_reference: '',
    payment_date: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="font-medium">{item.employee_name}</p>
        <p className="text-lg font-bold text-emerald-600">নেট বেতন: ৳{item.net_salary?.toLocaleString()}</p>
      </div>
      
      <div className="space-y-2">
        <Label>পেমেন্ট পদ্ধতি</Label>
        <Select 
          value={formData.payment_method} 
          onValueChange={(v) => setFormData({...formData, payment_method: v})}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Bank">ব্যাংক ট্রান্সফার</SelectItem>
            <SelectItem value="bKash">বিকাশ</SelectItem>
            <SelectItem value="Nagad">নগদ</SelectItem>
            <SelectItem value="Rocket">রকেট</SelectItem>
            <SelectItem value="Cash">নগদ টাকা</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>রেফারেন্স নম্বর</Label>
        <Input
          value={formData.payment_reference}
          onChange={(e) => setFormData({...formData, payment_reference: e.target.value})}
          placeholder="ট্রান্সেকশন আইডি বা রেফারেন্স"
        />
      </div>

      <div className="space-y-2">
        <Label>পেমেন্ট তারিখ</Label>
        <Input
          type="date"
          value={formData.payment_date}
          onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label>মন্তব্য</Label>
        <Input
          value={formData.remarks}
          onChange={(e) => setFormData({...formData, remarks: e.target.value})}
          placeholder="ঐচ্ছিক মন্তব্য"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          বাতিল
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          পেমেন্ট রেকর্ড করুন
        </Button>
      </div>
    </form>
  );
};

const SalaryStructureForm = ({ employees, departments, onSubmit, onCancel, loading, initialData }) => {
  const [formData, setFormData] = useState({
    employee_id: initialData?.employee_id || '',
    basic_salary: initialData?.basic_salary?.toString() || '',
    house_rent_allowance: initialData?.house_rent_allowance?.toString() || '',
    food_allowance: initialData?.food_allowance?.toString() || '',
    transport_allowance: initialData?.transport_allowance?.toString() || '',
    medical_allowance: initialData?.medical_allowance?.toString() || '',
    other_allowance: initialData?.other_allowance?.toString() || '',
    provident_fund_percentage: initialData?.provident_fund_percentage?.toString() || '0',
    tax_percentage: initialData?.tax_percentage?.toString() || '0',
    is_active: initialData?.is_active ?? true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.employee_id) {
      return;
    }
    onSubmit({
      ...formData,
      basic_salary: Number(formData.basic_salary) || 0,
      house_rent_allowance: Number(formData.house_rent_allowance) || 0,
      food_allowance: Number(formData.food_allowance) || 0,
      transport_allowance: Number(formData.transport_allowance) || 0,
      medical_allowance: Number(formData.medical_allowance) || 0,
      other_allowance: Number(formData.other_allowance) || 0,
      provident_fund_percentage: Number(formData.provident_fund_percentage) || 0,
      tax_percentage: Number(formData.tax_percentage) || 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>কর্মচারী নির্বাচন করুন *</Label>
        <Select value={formData.employee_id} onValueChange={(v) => setFormData({...formData, employee_id: v})}>
          <SelectTrigger>
            <SelectValue placeholder="কর্মচারী বাছুন" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.name} - {emp.employee_id || emp.staff_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>মূল বেতন (৳) *</Label>
          <Input
            type="number"
            value={formData.basic_salary}
            onChange={(e) => setFormData({...formData, basic_salary: e.target.value})}
            placeholder="০"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>বাসা ভাড়া (৳)</Label>
          <Input
            type="number"
            value={formData.house_rent_allowance}
            onChange={(e) => setFormData({...formData, house_rent_allowance: e.target.value})}
            placeholder="০"
          />
        </div>
        <div className="space-y-2">
          <Label>খাবার ভাতা (৳)</Label>
          <Input
            type="number"
            value={formData.food_allowance}
            onChange={(e) => setFormData({...formData, food_allowance: e.target.value})}
            placeholder="০"
          />
        </div>
        <div className="space-y-2">
          <Label>যাতায়াত ভাতা (৳)</Label>
          <Input
            type="number"
            value={formData.transport_allowance}
            onChange={(e) => setFormData({...formData, transport_allowance: e.target.value})}
            placeholder="০"
          />
        </div>
        <div className="space-y-2">
          <Label>চিকিৎসা ভাতা (৳)</Label>
          <Input
            type="number"
            value={formData.medical_allowance}
            onChange={(e) => setFormData({...formData, medical_allowance: e.target.value})}
            placeholder="০"
          />
        </div>
        <div className="space-y-2">
          <Label>অন্যান্য ভাতা (৳)</Label>
          <Input
            type="number"
            value={formData.other_allowance}
            onChange={(e) => setFormData({...formData, other_allowance: e.target.value})}
            placeholder="০"
          />
        </div>
        <div className="space-y-2">
          <Label>প্রভিডেন্ট ফান্ড (%)</Label>
          <Input
            type="number"
            value={formData.provident_fund_percentage}
            onChange={(e) => setFormData({...formData, provident_fund_percentage: e.target.value})}
            placeholder="০"
          />
        </div>
        <div className="space-y-2">
          <Label>ট্যাক্স (%)</Label>
          <Input
            type="number"
            value={formData.tax_percentage}
            onChange={(e) => setFormData({...formData, tax_percentage: e.target.value})}
            placeholder="০"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          বাতিল
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          সংরক্ষণ করুন
        </Button>
      </div>
    </form>
  );
};

const BonusForm = ({ employees, departments, months, onSubmit, onCancel, loading, initialData }) => {
  const [formData, setFormData] = useState({
    bonus_name: initialData?.bonus_name || '',
    bonus_type: initialData?.bonus_type || 'fixed',
    amount: initialData?.amount?.toString() || '',
    percentage: initialData?.percentage?.toString() || '',
    applicable_to: initialData?.applicable_to || 'all',
    employee_ids: initialData?.employee_ids || [],
    department: initialData?.department || '',
    effective_month: initialData?.effective_month || new Date().getMonth() + 1,
    effective_year: initialData?.effective_year || new Date().getFullYear()
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.bonus_name) return;
    onSubmit({
      ...formData,
      amount: Number(formData.amount) || 0,
      percentage: Number(formData.percentage) || 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>বোনাসের নাম *</Label>
        <Input
          value={formData.bonus_name}
          onChange={(e) => setFormData({...formData, bonus_name: e.target.value})}
          placeholder="যেমন: ঈদ বোনাস, বার্ষিক বোনাস"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>বোনাসের ধরন</Label>
          <Select value={formData.bonus_type} onValueChange={(v) => setFormData({...formData, bonus_type: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">নির্দিষ্ট পরিমাণ</SelectItem>
              <SelectItem value="percentage">শতাংশ (মূল বেতনের)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.bonus_type === 'fixed' ? (
          <div className="space-y-2">
            <Label>পরিমাণ (৳)</Label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              placeholder="০"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>শতাংশ (%)</Label>
            <Input
              type="number"
              value={formData.percentage}
              onChange={(e) => setFormData({...formData, percentage: e.target.value})}
              placeholder="০"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>প্রযোজ্য</Label>
        <Select value={formData.applicable_to} onValueChange={(v) => setFormData({...formData, applicable_to: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল কর্মচারী</SelectItem>
            <SelectItem value="department">নির্দিষ্ট বিভাগ</SelectItem>
            <SelectItem value="individual">নির্দিষ্ট কর্মচারী</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.applicable_to === 'department' && (
        <div className="space-y-2">
          <Label>বিভাগ বাছুন</Label>
          <Select value={formData.department} onValueChange={(v) => setFormData({...formData, department: v})}>
            <SelectTrigger>
              <SelectValue placeholder="বিভাগ বাছুন" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id || dept.name} value={dept.name}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>মাস</Label>
          <Select value={String(formData.effective_month)} onValueChange={(v) => setFormData({...formData, effective_month: Number(v)})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>বছর</Label>
          <Select value={String(formData.effective_year)} onValueChange={(v) => setFormData({...formData, effective_year: Number(v)})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          বাতিল
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          বোনাস যোগ করুন
        </Button>
      </div>
    </form>
  );
};

const AdvanceForm = ({ employees, onSubmit, onCancel, loading, initialData }) => {
  const isEditing = !!initialData;
  const [formData, setFormData] = useState({
    employee_id: initialData?.employee_id || '',
    amount: initialData?.amount?.toString() || '',
    reason: initialData?.reason || '',
    repayment_months: initialData?.repayment_months?.toString() || '1',
    start_month: initialData?.start_month || new Date().getMonth() + 1,
    start_year: initialData?.start_year || new Date().getFullYear()
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.amount) return;
    const submitData = {
      amount: Number(formData.amount),
      reason: formData.reason,
      repayment_months: Number(formData.repayment_months) || 1,
      start_month: Number(formData.start_month),
      start_year: Number(formData.start_year)
    };
    // Only include employee_id when creating new advance
    if (!isEditing) {
      submitData.employee_id = formData.employee_id;
    }
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>কর্মচারী নির্বাচন করুন *</Label>
        <Select 
          value={formData.employee_id} 
          onValueChange={(v) => setFormData({...formData, employee_id: v})}
          disabled={isEditing}
        >
          <SelectTrigger className={isEditing ? 'opacity-60 cursor-not-allowed' : ''}>
            <SelectValue placeholder="কর্মচারী বাছুন" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.name} - {emp.employee_id || emp.staff_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isEditing && <p className="text-xs text-gray-500">কর্মচারী পরিবর্তন করা যাবে না</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>অগ্রিমের পরিমাণ (৳) *</Label>
          <Input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            placeholder="০"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>মাসিক কর্তন (৳)</Label>
          <Input
            type="number"
            value={formData.monthly_deduction}
            onChange={(e) => setFormData({...formData, monthly_deduction: e.target.value})}
            placeholder="সম্পূর্ণ পরিমাণ"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>কারণ</Label>
        <Input
          value={formData.reason}
          onChange={(e) => setFormData({...formData, reason: e.target.value})}
          placeholder="অগ্রিম নেওয়ার কারণ"
        />
      </div>

      <div className="space-y-2">
        <Label>শুরুর তারিখ</Label>
        <Input
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({...formData, start_date: e.target.value})}
        />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          বাতিল
        </Button>
        <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          অগ্রিম যোগ করুন
        </Button>
      </div>
    </form>
  );
};

const SettingsForm = ({ initialSettings, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    payment_day: initialSettings?.payment_day || 1,
    provident_fund_percentage: initialSettings?.provident_fund_percentage || 0,
    professional_tax: initialSettings?.professional_tax || 0,
    overtime_rate_per_hour: initialSettings?.overtime_rate_per_hour || 0,
    late_deduction_per_day: initialSettings?.late_deduction_per_day || 0,
    absent_deduction_per_day: initialSettings?.absent_deduction_per_day || 0,
    enable_attendance_deduction: initialSettings?.enable_attendance_deduction ?? true,
    enable_overtime: initialSettings?.enable_overtime ?? false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      payment_day: Number(formData.payment_day),
      provident_fund_percentage: Number(formData.provident_fund_percentage),
      professional_tax: Number(formData.professional_tax),
      overtime_rate_per_hour: Number(formData.overtime_rate_per_hour),
      late_deduction_per_day: Number(formData.late_deduction_per_day),
      absent_deduction_per_day: Number(formData.absent_deduction_per_day)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>বেতন প্রদানের দিন</Label>
          <Input
            type="number"
            min="1"
            max="28"
            value={formData.payment_day}
            onChange={(e) => setFormData({...formData, payment_day: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>প্রভিডেন্ট ফান্ড (%)</Label>
          <Input
            type="number"
            value={formData.provident_fund_percentage}
            onChange={(e) => setFormData({...formData, provident_fund_percentage: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>পেশাদার কর (৳)</Label>
          <Input
            type="number"
            value={formData.professional_tax}
            onChange={(e) => setFormData({...formData, professional_tax: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>ওভারটাইম রেট/ঘণ্টা (৳)</Label>
          <Input
            type="number"
            value={formData.overtime_rate_per_hour}
            onChange={(e) => setFormData({...formData, overtime_rate_per_hour: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>দেরি কর্তন/দিন (৳)</Label>
          <Input
            type="number"
            value={formData.late_deduction_per_day}
            onChange={(e) => setFormData({...formData, late_deduction_per_day: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>অনুপস্থিতি কর্তন/দিন (৳)</Label>
          <Input
            type="number"
            value={formData.absent_deduction_per_day}
            onChange={(e) => setFormData({...formData, absent_deduction_per_day: e.target.value})}
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="attendance_deduction"
            checked={formData.enable_attendance_deduction}
            onChange={(e) => setFormData({...formData, enable_attendance_deduction: e.target.checked})}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="attendance_deduction" className="cursor-pointer">হাজিরা ভিত্তিক কর্তন সক্রিয়</Label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="overtime"
            checked={formData.enable_overtime}
            onChange={(e) => setFormData({...formData, enable_overtime: e.target.checked})}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="overtime" className="cursor-pointer">ওভারটাইম হিসাব সক্রিয়</Label>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          বাতিল
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          সেটিংস সংরক্ষণ করুন
        </Button>
      </div>
    </form>
  );
};

export default Payroll;
