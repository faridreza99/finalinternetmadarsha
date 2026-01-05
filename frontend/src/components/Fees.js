import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCurrency } from '../context/CurrencyContext';
import { useInstitution } from '../context/InstitutionContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { 
  DollarSign,
  CreditCard,
  AlertTriangle,
  Users,
  Download,
  Receipt,
  TrendingUp,
  Calendar,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  Check,
  CheckCircle,
  XCircle,
  PieChart,
  Eye,
  History,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_API_URL || '/api';

console.log('🔗 API Base URL:', API);

// Helper function to safely extract error messages from API responses
const getErrorMessage = (error, fallback = 'An error occurred. Please try again.') => {
  const detail = error?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    // Pydantic validation errors are arrays of objects with 'msg' property
    return detail.map(err => err?.msg || JSON.stringify(err)).join(', ') || fallback;
  }
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return fallback;
};

const Fees = () => {
  // Currency context for dynamic currency display
  const { formatCurrency, getCurrencySymbol } = useCurrency();
  const { isMadrasahSimpleUI, isMadrasah, loading: institutionLoading } = useInstitution();
  
  // Router-controlled tabs
  const { '*': tabPath } = useParams();
  const navigate = useNavigate();
  
  // Determine current tab from URL, default to 'manage'
  const currentTab = tabPath === 'student-specific' ? 'student-specific' 
                    : tabPath === 'due' ? 'due'
                    : tabPath === 'select-student' ? 'select-student'
                    : tabPath === 'collection' ? 'collection'
                    : 'manage';
  
  // Tab change handler
  const handleTabChange = (newTab) => {
    console.log('🔥 TAB CHANGED TO:', newTab);
    navigate(`/fees/${newTab}`);
  };
  const [totalFees, setTotalFees] = useState(0);
  const [collected, setCollected] = useState(0);
  const [pending, setPending] = useState(0);
  const [overdue, setOverdue] = useState(0);
  
  // Recent Payment Activity specific metrics
  const [paymentsToday, setPaymentsToday] = useState(0);
  const [todaysCollection, setTodaysCollection] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  
  // Bulk Payment specific state
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [bulkPaymentFilters, setBulkPaymentFilters] = useState({
    class: 'all',
    feeStatus: 'pending',
    feeType: 'Tuition Fees'
  });

  // Student Specific Tab State
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [studentPayments, setStudentPayments] = useState([]);
  const [studentFeesSummary, setStudentFeesSummary] = useState(null);
  
  // Fee Collection Tab state
  const [collectionForm, setCollectionForm] = useState({
    student_id: '',
    fee_type: '',
    amount: '',
    payment_mode: '',
    transaction_id: '',
    remarks: ''
  });
  const [collectionStats, setCollectionStats] = useState({
    todaysCollection: 0,
    transactions: 0,
    avgPayment: 0,
    cashBalance: 0
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [dueFees, setDueFees] = useState([]);
  
  // Madrasah Simple Wizard State
  const [madrasahWizardStep, setMadrasahWizardStep] = useState(1); // 1=ছাত্র নির্বাচন, 2=বেতন আদায়, 3=রসিদ
  const [lastReceipt, setLastReceipt] = useState(null); // For receipt printing
  
  // School Branding for Receipt
  const [schoolBranding, setSchoolBranding] = useState({
    school_name: '',
    school_name_bn: '',
    logo_url: '',
    address: '',
    phone: '',
    email: '',
    primary_color: '#059669'
  });
  
  // Modal states for new functionality
  const [showFeeConfigModal, setShowFeeConfigModal] = useState(false);
  const [currentFeeType, setCurrentFeeType] = useState('');
  const [showGenerateReportsModal, setShowGenerateReportsModal] = useState(false);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [showSendRemindersModal, setShowSendRemindersModal] = useState(false);
  
  // Delete confirmation modal state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [configToDelete, setConfigToDelete] = useState(null);
  
  // Detailed Payment Modal state
  const [showDetailedPaymentModal, setShowDetailedPaymentModal] = useState(false);
  const [detailedPaymentData, setDetailedPaymentData] = useState(null);
  
  // Edit mode state
  const [editingConfig, setEditingConfig] = useState(null);

  // Fee Configuration Storage - This will persist saved fee configs
  const [feeConfigurations, setFeeConfigurations] = useState({
    'Tuition Fees': [],
    'Transport Fees': [],
    'Admission Fees': []
  });

  // Form state for fee configuration modal
  const [configForm, setConfigForm] = useState({
    amount: '',
    frequency: '',
    dueDate: '',
    applyToClasses: '',
    lateFee: '',
    discount: ''
  });

  // Load persisted fee configurations from backend on mount
  useEffect(() => {
    loadFeeDataFromBackend();
    fetchStudentsData();
    fetchSchoolBranding();
  }, []);
  
  // Fetch school branding for receipt
  const fetchSchoolBranding = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get(`${API}/school-branding`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setSchoolBranding({
          school_name: response.data.school_name || '',
          school_name_bn: response.data.school_name_bn || response.data.school_name || '',
          logo_url: response.data.logo_url || '',
          address: response.data.address || '',
          phone: response.data.phone || '',
          email: response.data.email || '',
          primary_color: response.data.primary_color || '#059669'
        });
      }
    } catch (error) {
      console.error('Error fetching school branding:', error);
    }
  };
  
  // Calculate collection stats when recent payments change
  useEffect(() => {
    calculateCollectionStats();
  }, [recentPayments]);

  const loadFeeDataFromBackend = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('❌ Authentication Required', {
          description: 'Please login to access fee management.',
          duration: 4000
        });
        return;
      }

      // Fetch fee configurations, dashboard data, recent payments, and due fees from backend
      const [configsRes, dashboardRes, paymentsRes, dueFeesRes] = await Promise.all([
        axios.get(`${API}/fees/configurations`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/fees/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/fees/payments/recent?limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/fees/student-fees`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Transform backend configs to frontend format - dynamically group by fee_type
      const backendConfigs = configsRes.data || [];
      const transformedConfigs = {};
      backendConfigs.forEach(config => {
        const feeType = config.fee_type || 'Other';
        if (!transformedConfigs[feeType]) {
          transformedConfigs[feeType] = [];
        }
        transformedConfigs[feeType].push(config);
      });
      
      setFeeConfigurations(transformedConfigs);
      
      // Set dashboard data from backend
      const dashboardData = dashboardRes.data;
      setTotalFees(dashboardData.total_fees);
      setCollected(dashboardData.collected);
      setPending(dashboardData.pending);
      setOverdue(dashboardData.overdue);
      
      // Set recent payment activity metrics from backend
      setPaymentsToday(dashboardData.payments_today || 0);
      setTodaysCollection(dashboardData.todays_collection || 0);
      setPendingApprovals(dashboardData.pending_approvals || 0);
      setMonthlyTarget(dashboardData.monthly_target || 0);
      
      // Process and set recent payments data - use Bengali fallback for missing names
      const paymentsData = paymentsRes.data || [];
      const transformedPayments = paymentsData.map(payment => ({
        id: payment.id,
        student_name: payment.student_name && payment.student_name.trim() !== '' && payment.student_name !== 'Unknown Student' 
          ? payment.student_name 
          : (payment.student_id ? `ছাত্র #${String(payment.student_id).slice(-6)}` : 'অজ্ঞাত ছাত্র'),
        amount: payment.amount || 0,
        payment_mode: payment.payment_mode || 'Cash',
        fee_type: payment.fee_type || 'Tuition Fees',
        receipt_no: payment.receipt_no || 'N/A',
        time: payment.payment_date ? new Date(payment.payment_date).toLocaleTimeString() : new Date().toLocaleTimeString(),
        created_at: payment.payment_date || new Date().toISOString(),
        transaction_id: payment.transaction_id || null,
        remarks: payment.remarks || null
      }));
      
      setRecentPayments(transformedPayments);
      
      // Set due fees data
      const dueFeesData = dueFeesRes.data || [];
      setDueFees(dueFeesData);
      
      console.log('✅ Fee data loaded from backend successfully');
      console.log('📊 Today\'s metrics:', {
        payments: dashboardData.payments_today,
        collection: dashboardData.todays_collection,
        approvals: dashboardData.pending_approvals,
        target: dashboardData.monthly_target
      });
      console.log('💳 Recent payments loaded:', transformedPayments.length, 'payments');
      console.log('📋 Due fees loaded:', dueFeesData.length, 'records');
    } catch (error) {
      console.error('Failed to load fee data from backend:', error);
      toast.error('⚠️ Failed to Load Fee Data', {
        description: 'Using fallback data. Please check your connection.',
        duration: 4000
      });
      // Fallback to default values
      setTotalFees(0);
      setCollected(0);
      setPending(0);
      setOverdue(0);
      
      // Reset recent payment activity metrics
      setPaymentsToday(0);
      setTodaysCollection(0);
      setPendingApprovals(0);
      setMonthlyTarget(0);
      
      // Reset recent payments to empty array
      setRecentPayments([]);
    }
  };

  const calculateTotalsFromConfigurations = (configs) => {
    let totalCalculated = 0;
    
    // Calculate total from all fee configurations
    Object.values(configs).forEach(configArray => {
      configArray.forEach(config => {
        const classMultiplier = config.applyToClasses === 'all' ? 30 : 15;
        const frequencyMultiplier = config.frequency === 'monthly' ? 12 : 
                                   config.frequency === 'quarterly' ? 4 : 
                                   config.frequency === 'half-yearly' ? 2 : 1;
        
        totalCalculated += config.amount * classMultiplier * frequencyMultiplier;
      });
    });

    // Return calculated totals with realistic distribution
    return {
      totalFees: totalCalculated > 0 ? totalCalculated : 2500000,
      collected: totalCalculated > 0 ? Math.floor(totalCalculated * 0.7) : 1800000,
      pending: totalCalculated > 0 ? Math.floor(totalCalculated * 0.2) : 500000,
      overdue: totalCalculated > 0 ? Math.floor(totalCalculated * 0.1) : 200000
    };
  };

  const fetchStudentsData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        return;
      }

      const [studentsRes, classesRes] = await Promise.all([
        axios.get(`${API}/students`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/classes`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setStudents(studentsRes.data);
      setClasses(classesRes.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast.error('❌ Failed to Load Students', {
        description: 'Unable to load student data. Please check your connection and try again.',
        duration: 4000
      });
      // Set empty arrays instead of mock data
      setStudents([]);
      setClasses([]);
    }
  };

  const fetchStudentFinancials = async (studentId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('❌ Authentication Required', {
          description: 'Please login to view student financials.',
          duration: 4000
        });
        return;
      }

      // Fetch student fees and payments from backend
      const [feesRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/fees/student/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/fees/payments?student_id=${studentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Calculate summary from fees data
      const studentFees = feesRes.data || [];
      const studentPaymentsData = paymentsRes.data || [];
      
      const summary = {
        totalFees: studentFees.reduce((sum, fee) => sum + fee.amount, 0),
        paidAmount: studentFees.reduce((sum, fee) => sum + fee.paid_amount, 0),
        pendingFees: studentFees.reduce((sum, fee) => sum + fee.pending_amount, 0),
        overdueFees: studentFees.reduce((sum, fee) => sum + fee.overdue_amount, 0),
        lastPaymentDate: studentPaymentsData[0]?.payment_date?.split('T')[0] || null
      };
      
      // Transform payments data for UI
      const transformedPayments = studentPaymentsData.map(payment => ({
        id: payment.id,
        receiptNo: payment.receipt_no,
        date: payment.payment_date?.split('T')[0],
        feeType: payment.fee_type,
        amount: payment.amount,
        paymentMode: payment.payment_mode,
        status: 'Paid',
        dueDate: payment.payment_date?.split('T')[0]
      }));
      
      // Add pending fees as "payment" entries
      const pendingFees = studentFees.filter(fee => fee.pending_amount > 0).map(fee => ({
        id: `pending_${fee.id}`,
        receiptNo: 'PENDING',
        date: null,
        feeType: fee.fee_type,
        amount: fee.pending_amount,
        paymentMode: null,
        status: 'Pending',
        dueDate: fee.due_date
      }));
      
      // Add overdue fees as "payment" entries
      const overdueFees = studentFees.filter(fee => fee.overdue_amount > 0).map(fee => ({
        id: `overdue_${fee.id}`,
        receiptNo: 'OVERDUE',
        date: null,
        feeType: fee.fee_type,
        amount: fee.overdue_amount,
        paymentMode: null,
        status: 'Overdue',
        dueDate: fee.due_date
      }));
      
      setStudentFeesSummary(summary);
      setStudentPayments([...transformedPayments, ...pendingFees, ...overdueFees]);
      
    } catch (error) {
      console.error('Failed to fetch student financials:', error);
      toast.error('❌ Failed to Load Student Financials', {
        description: 'Unable to load financial data for this student.',
        duration: 4000
      });
      // Set empty data instead of mock data
      setStudentFeesSummary({
        totalFees: 0,
        paidAmount: 0,
        pendingFees: 0,
        overdueFees: 0,
        lastPaymentDate: null
      });
      setStudentPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    fetchStudentFinancials(student.id);
  };

  // Open detailed payment modal for a student
  const openDetailedPaymentModal = async (student, feeData) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('❌ অনুগ্রহ করে লগইন করুন');
        return;
      }

      // Fetch all payment records for this student
      const [feesRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/fees/student/${student.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/fees/payments?student_id=${student.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const studentFees = feesRes.data || [];
      const payments = paymentsRes.data || [];

      // Calculate totals
      const totalFees = studentFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
      const paidAmount = studentFees.reduce((sum, fee) => sum + (fee.paid_amount || 0), 0);
      const pendingAmount = studentFees.reduce((sum, fee) => sum + (fee.pending_amount || 0), 0);
      const overdueAmount = studentFees.reduce((sum, fee) => sum + (fee.overdue_amount || 0), 0);

      // Group payments by type
      const paymentsByType = {};
      payments.forEach(p => {
        const type = p.fee_type || 'অন্যান্য';
        if (!paymentsByType[type]) {
          paymentsByType[type] = [];
        }
        paymentsByType[type].push({
          id: p.id,
          receipt_no: p.receipt_no,
          amount: p.amount,
          date: p.payment_date?.split('T')[0] || p.created_at?.split('T')[0],
          payment_method: p.payment_mode || p.payment_method,
          month: p.month || ''
        });
      });

      // Group fees by type
      const feesByType = {};
      studentFees.forEach(f => {
        const type = f.fee_type || 'অন্যান্য';
        if (!feesByType[type]) {
          feesByType[type] = { amount: 0, paid: 0, pending: 0, overdue: 0 };
        }
        feesByType[type].amount += f.amount || 0;
        feesByType[type].paid += f.paid_amount || 0;
        feesByType[type].pending += f.pending_amount || 0;
        feesByType[type].overdue += f.overdue_amount || 0;
      });

      setDetailedPaymentData({
        student: {
          id: student.id,
          name: student.name || student.student_name,
          roll: student.roll_no || student.roll,
          class: student.class_name || student.class || getClassName(student.class_id),
          admission_no: student.admission_no
        },
        summary: {
          totalFees,
          paidAmount,
          pendingAmount,
          overdueAmount,
          balance: pendingAmount + overdueAmount
        },
        payments: payments.map(p => ({
          id: p.id,
          receipt_no: p.receipt_no,
          amount: p.amount,
          fee_type: p.fee_type,
          date: p.payment_date?.split('T')[0] || p.created_at?.split('T')[0],
          payment_method: p.payment_mode || p.payment_method,
          month: p.month || ''
        })),
        feesByType,
        paymentsByType
      });

      setShowDetailedPaymentModal(true);
      toast.success('📋 বিস্তারিত পেমেন্ট তথ্য লোড হয়েছে');
    } catch (error) {
      console.error('Error fetching detailed payment data:', error);
      toast.error('❌ পেমেন্ট তথ্য লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchTerm || 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admission_no.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = selectedClass === 'all' || student.class_id === selectedClass;
    const matchesSection = selectedSection === 'all' || student.section_id === selectedSection;
    
    return matchesSearch && matchesClass && matchesSection;
  });

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? (cls.display_name || cls.name) : (isMadrasahSimpleUI ? 'অজ্ঞাত শ্রেণি' : 'Unknown');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'Overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Bulk Payment Helper Functions
  const toggleStudentSelection = (student) => {
    setSelectedStudents(prev => {
      const isSelected = prev.find(s => s.id === student.id);
      if (isSelected) {
        return prev.filter(s => s.id !== student.id);
      } else {
        return [...prev, student];
      }
    });
  };

  const toggleSelectAll = () => {
    const eligibleStudents = getEligibleStudentsForBulkPayment();
    if (selectedStudents.length === eligibleStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(eligibleStudents);
    }
  };

  const getEligibleStudentsForBulkPayment = () => {
    return students.filter(student => {
      // Filter by class
      if (bulkPaymentFilters.class !== 'all' && student.class_id !== bulkPaymentFilters.class) {
        return false;
      }
      
      // For now, include all students - in real implementation, filter by fee status and type
      return true;
    });
  };

  const calculateBulkPaymentSummary = () => {
    // Calculate actual amounts from selected students' pending fees
    let totalAmount = 0;
    let lateFees = 0;
    
    selectedStudents.forEach(student => {
      // Get student's actual pending amount from fee data
      const studentFee = dueFees.find(f => f.student_id === student.id);
      const pendingAmount = studentFee?.pending_amount || studentFee?.total_due || 0;
      const overdueAmount = studentFee?.overdue_amount || 0;
      totalAmount += pendingAmount;
      lateFees += overdueAmount;
    });
    
    return {
      studentsCount: selectedStudents.length,
      totalAmount,
      lateFees,
      grandTotal: totalAmount + lateFees
    };
  };

  const handleCollectPayment = () => {
    setShowPaymentModal(true);
  };


  // Bulk Payment submission handler
  const submitBulkPayment = async (bulkPaymentData) => {
    if (selectedStudents.length === 0) {
      toast.error('❌ No Students Selected', {
        description: 'Please select at least one student for bulk payment.',
        duration: 4000
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('❌ Authentication Required', {
          description: 'Please login to process bulk payments.',
          duration: 4000
        });
        return;
      }

      // Prepare bulk payment data
      const bulkData = {
        student_ids: selectedStudents.map(s => s.id),
        fee_type: bulkPaymentData.fee_type || 'Tuition Fees',
        payment_mode: bulkPaymentData.payment_mode || 'Cash',
        transaction_id: bulkPaymentData.transaction_id || null,
        remarks: bulkPaymentData.remarks || 'Bulk payment collection'
      };

      console.log('🚀 Submitting bulk payment:', bulkData);

      // Call backend bulk payment API
      const response = await axios.post(`${API}/fees/payments/bulk`, bulkData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = response.data;
      console.log('✅ Bulk payment response:', result);

      // Close modal
      setShowBulkPaymentModal(false);
      
      // Clear selected students
      setSelectedStudents([]);
      
      // Use dashboard stats from response for instant update (no race condition!)
      if (result.dashboard_stats) {
        console.log('📊 Using returned dashboard stats for instant update');
        setTotalFees(result.dashboard_stats.total_fees);
        setCollected(result.dashboard_stats.collected);
        setPending(result.dashboard_stats.pending);
        setOverdue(result.dashboard_stats.overdue);
        setPaymentsToday(result.dashboard_stats.payments_today);
        setTodaysCollection(result.dashboard_stats.todays_collection);
      }
      
      // Background refresh for recent payments list
      console.log('🔄 bulk payment ok → refreshing dashboard in background...');
      loadFeeDataFromBackend();
      console.log('✅ bulk refresh initiated');
      
      // Show success message
      toast.success(`💰 Bulk Payment Processed Successfully!`, {
        description: `${result.payments_count} payments processed. Total: ${formatCurrency(result.total_amount)}. Dashboard updated instantly.`,
        duration: 5000
      });

    } catch (error) {
      console.error('Bulk payment failed:', error);
      const errorMessage = getErrorMessage(error, 'Unable to process bulk payment. Please try again.');
      toast.error('❌ Bulk Payment Failed', {
        description: errorMessage,
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  // Send Reminders submission handler
  const submitSendReminders = async (reminderData) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('❌ Authentication Required', {
          description: 'Please login to send reminders.',
          duration: 4000
        });
        return;
      }

      console.log('📧 Sending fee reminders:', reminderData);

      // Call backend reminders API
      const response = await axios.post(`${API}/reminders/send`, reminderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = response.data;
      console.log('✅ Reminders response:', result);

      // Close modal
      setShowSendRemindersModal(false);
      
      // Show success message
      toast.success(`📧 Fee Reminders Sent Successfully!`, {
        description: `${result.sent_count} reminders sent to students with pending fees. ${result.failed_count} failed.`,
        duration: 5000
      });

    } catch (error) {
      console.error('Send reminders failed:', error);
      const errorMessage = getErrorMessage(error, 'Unable to send reminders. Please try again.');
      toast.error('❌ Failed to Send Reminders', {
        description: errorMessage,
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format = 'excel', reportType = 'student_wise') => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('⚠️ Authentication Required', {
          description: 'Please log in again to export reports.',
          duration: 4000
        });
        return;
      }
      
      // Call backend API to generate and download report
      const response = await fetch(`${API}/reports/export?format=${format}&report_type=${reportType}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Get filename from response headers or create default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `fee_report_${reportType}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename=\"(.+)\"/);  
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success(`📊 ${format.toUpperCase()} Report Downloaded!`, {
          description: `${reportType.replace('_', ' ')} report exported successfully.`,
          duration: 4000
        });
      } else {
        const errorData = await response.json();
        let errorMsg = 'Failed to generate report.';
        if (typeof errorData.detail === 'string') {
          errorMsg = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMsg = errorData.detail.map(err => err?.msg || JSON.stringify(err)).join(', ');
        }
        toast.error('⚠️ Report Export Failed', {
          description: errorMsg,
          duration: 4000
        });
      }
    } catch (error) {
      console.error('Export report error:', error);
      toast.error('⚠️ Export Error', {
        description: 'Unable to export report. Please try again.',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = async (paymentData) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('❌ Authentication Required', {
          description: 'Please login to process payments.',
          duration: 4000
        });
        return false;
      }

      // Create payment in backend
      const response = await axios.post(`${API}/fees/payments`, paymentData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const paymentResult = response.data;
      
      // Find student details for the toast message
      const student = students.find(s => s.id === paymentData.student_id);
      const studentName = student ? student.name : paymentResult.student_name;
      const studentAdmissionNo = student ? student.admission_no : paymentResult.admission_no;
      
      // Close payment modal first
      setShowPaymentModal(false);
      
      // Use dashboard stats from payment response for instant update (no race condition!)
      if (paymentResult.dashboard_stats) {
        console.log('📊 Using returned dashboard stats for instant update');
        setTotalFees(paymentResult.dashboard_stats.total_fees);
        setCollected(paymentResult.dashboard_stats.collected);
        setPending(paymentResult.dashboard_stats.pending);
        setOverdue(paymentResult.dashboard_stats.overdue);
        setPaymentsToday(paymentResult.dashboard_stats.payments_today);
        setTodaysCollection(paymentResult.dashboard_stats.todays_collection);
      }
      
      // Use updated_student_fees from response to update dueFees state directly
      // This fixes the partial payment status button not updating issue
      if (paymentResult.updated_student_fees && paymentResult.updated_student_fees.length > 0) {
        console.log('📋 Updating dueFees with fresh student_fees data from payment response');
        setDueFees(prevDueFees => {
          // Remove old entries for this student and add new ones
          const otherStudentsFees = prevDueFees.filter(f => f.student_id !== paymentData.student_id);
          return [...otherStudentsFees, ...paymentResult.updated_student_fees];
        });
      }
      
      // Also refresh student financials and full dashboard data in background
      console.log('🔄 payment ok → refreshing student financials...');
      await Promise.all([
        loadFeeDataFromBackend(), // Background refresh for recent payments list
        fetchStudentFinancials(paymentResult?.student_id ?? paymentData.student_id)
      ]);
      console.log('✅ refresh complete');
      console.log('✅ refresh complete');
      
      // Auto-generate and download receipt immediately after payment
      generateReceipt(paymentResult.receipt_no);
      
      // Show success toast with real-time update confirmation
      toast.success(`Payment Collected Successfully!`, {
        description: `${formatCurrency(paymentData.amount)} collected from ${studentName} (${studentAdmissionNo}) for ${paymentData.fee_type}. Dashboard updated. Receipt: ${paymentResult.receipt_no}`,
        duration: 5000,
        action: {
          label: "Download Again", 
          onClick: () => generateReceipt(paymentResult.receipt_no)
        }
      });
      
      return true;
      
    } catch (error) {
      console.error('Payment failed:', error);
      const errorMessage = getErrorMessage(error, 'Unable to process payment. Please try again.');
      toast.error('❌ Payment Failed', {
        description: errorMessage,
        duration: 4000
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete fee configuration function  
  const deleteFeeConfiguration = async (configId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('❌ Authentication Required', {
          description: 'Please login to delete fee configurations.',
          duration: 4000
        });
        return;
      }

      // Call backend delete API
      await axios.delete(`${API}/fees/configurations/${configId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh data from backend
      await loadFeeDataFromBackend();

      // Close confirmation modal
      setShowDeleteConfirmModal(false);
      setConfigToDelete(null);

      // Show success message
      toast.success('✅ Fee Configuration Deleted', {
        description: 'Fee configuration has been deleted successfully. Dashboard updated.',
        duration: 5000
      });

    } catch (error) {
      console.error('Failed to delete fee configuration:', error);
      const errorMessage = getErrorMessage(error, 'Unable to delete fee configuration. Please try again.');
      toast.error('❌ Failed to Delete Configuration', {
        description: errorMessage,
        duration: 4000
      });
    }
  };

  // Handle delete button click
  const handleDeleteConfig = (config) => {
    setConfigToDelete(config);
    setShowDeleteConfirmModal(true);
  };
  
  // Handle edit button click
  const handleEditConfig = (config) => {
    // Populate form with existing config data
    setEditingConfig(config);
    setConfigForm({
      amount: config.amount.toString(),
      frequency: config.frequency,
      dueDate: config.due_date || '',
      applyToClasses: config.apply_to_classes || '',
      lateFee: config.late_fee ? config.late_fee.toString() : '',
      discount: config.discount ? config.discount.toString() : ''
    });
    
    toast.info('✏️ Edit Mode', {
      description: 'Modify the configuration and click Save to update.',
      duration: 3000
    });
  };

  const handleStudentPayNow = (paymentData) => {
    setShowPaymentModal(true);
  };

  // Fee Due Tab: Collect Payment for specific student
  const handleStudentCollectPayment = (student) => {
    // Store selected student for payment processing
    setSelectedStudent(student);
    setShowPaymentModal(true);
    
    // Get proper student properties with fallbacks
    const studentName = student.name || 'Unknown Student';
    const admissionNo = student.admission_no || student.admission || 'N/A';
    const pendingAmount = student.pending_amount || student.amount || student.total_due || 0; // Use actual amount or 0
    
    toast.info(`💰 Collecting Payment`, {
      description: `Opening payment collection for ${studentName} (${admissionNo}) - ${formatCurrency(pendingAmount)}`,
      duration: 3000
    });
  };



  const generateReceipt = async (receiptNo) => {
    // Download PDF receipt from backend
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/fees/receipt/${receiptNo}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${receiptNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Receipt Downloaded', {
        description: `Receipt ${receiptNo} has been downloaded as PDF.`,
        duration: 3000
      });
    } catch (error) {
      console.error('Failed to download receipt:', error);
      toast.error('Failed to Download Receipt', {
        description: 'Unable to generate PDF receipt. Please try again.',
        duration: 4000
      });
    }
  };

  const handleDownloadReceipt = (receiptNo) => {
    // Download PDF receipt from backend
    generateReceipt(receiptNo);
  };

  const handleViewAllReceipts = (student) => {
    if (!student) {
      toast.error('⚠️ No Student Selected', {
        description: 'Please select a student first to view receipts.',
        duration: 3000
      });
      return;
    }
    
    // Show success message and provide navigation hint
    toast.success('📄 View All Receipts', {
      description: `Viewing all receipts for ${student.name}. Check the Payment History table below.`,
      duration: 4000
    });
    
    // Scroll to payment history table
    const paymentHistoryElement = document.querySelector('[role="table"]');
    if (paymentHistoryElement) {
      paymentHistoryElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContactGuardian = (student) => {
    if (!student || !student.guardian_phone) {
      toast.error('⚠️ No Contact Information', {
        description: 'Guardian phone number not available for this student.',
        duration: 3000
      });
      return;
    }
    
    // Copy phone number to clipboard
    navigator.clipboard.writeText(student.guardian_phone).then(() => {
      toast.success('📞 Guardian Contact Copied', {
        description: `${student.guardian_name}: ${student.guardian_phone} copied to clipboard.`,
        duration: 4000
      });
    }).catch(() => {
      // Fallback: show phone number in toast
      toast.success('📞 Guardian Contact', {
        description: `${student.guardian_name}: ${student.guardian_phone}`,
        duration: 5000
      });
    });
    
    // Try to open phone dialer on mobile devices
    const phoneLink = document.createElement('a');
    phoneLink.href = `tel:${student.guardian_phone}`;
    phoneLink.click();
  };

  // Fee Collection Tab helper functions
  const updateReceiptPreview = (formData) => {
    if (formData.student_id && formData.fee_type && formData.amount) {
      const student = students.find(s => s.id === formData.student_id);
      const nextReceiptNo = `RCP2025-${String(recentPayments.length + 1).padStart(3, '0')}`;
      
      setReceiptPreview({
        receiptNo: nextReceiptNo,
        student: student ? {
          name: student.name,
          admission_no: student.admission_no,
          class: getClassName(student.class_id)
        } : null,
        amount: parseFloat(formData.amount) || 0,
        fee_type: formData.fee_type,
        payment_mode: formData.payment_mode,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
      });
    } else {
      setReceiptPreview(null);
    }
  };

  const calculateCollectionStats = () => {
    const today = new Date().toDateString();
    const todaysPayments = recentPayments.filter(p => 
      new Date(p.created_at || Date.now()).toDateString() === today
    );
    
    const todaysCollection = todaysPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const avgPayment = todaysPayments.length > 0 ? todaysCollection / todaysPayments.length : 0;
    const cashBalance = todaysPayments
      .filter(p => p.payment_mode === 'Cash')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    setCollectionStats({
      todaysCollection,
      transactions: todaysPayments.length,
      avgPayment,
      cashBalance
    });
  };

  const handleQuickCollectionActions = {
    viewProfile: (studentId) => {
      const student = students.find(s => s.id === studentId);
      if (student) {
        setSelectedStudent(student);
        fetchStudentFinancials(student.id);
        handleTabChange('student-specific');
      }
    },
    viewHistory: (studentId) => {
      const student = students.find(s => s.id === studentId);
      if (student) {
        setSelectedStudent(student);
        fetchStudentFinancials(student.id);
        handleTabChange('student-specific');
      }
    },
    contactParent: (studentId) => {
      const student = students.find(s => s.id === studentId);
      if (student) {
        handleContactGuardian(student);
      }
    }
  };

  const handleCollectionFormSubmit = async () => {
    if (!collectionForm.student_id || !collectionForm.fee_type || !collectionForm.amount || !collectionForm.payment_mode) {
      toast.error('❌ Missing Required Fields', {
        description: 'Please fill in all required fields marked with *',
        duration: 4000
      });
      return;
    }
    
    const paymentData = {
      student_id: collectionForm.student_id,
      amount: parseFloat(collectionForm.amount),
      fee_type: collectionForm.fee_type,
      payment_mode: collectionForm.payment_mode,
      transaction_id: collectionForm.transaction_id || null,
      remarks: collectionForm.remarks || 'Fee Collection Tab payment'
    };
    
    try {
      await submitPayment(paymentData);
      
      // Add to recent payments
      const student = students.find(s => s.id === collectionForm.student_id);
      const newPayment = {
        id: Date.now(),
        student_name: student?.name || 'Unknown',
        amount: paymentData.amount,
        payment_mode: paymentData.payment_mode,
        fee_type: paymentData.fee_type,
        receipt_no: receiptPreview?.receiptNo || `RCP2025-${String(recentPayments.length + 1).padStart(3, '0')}`,
        time: new Date().toLocaleTimeString(),
        created_at: new Date().toISOString()
      };
      
      setRecentPayments(prev => [newPayment, ...prev.slice(0, 9)]);
      
      // Clear form
      setCollectionForm({
        student_id: '',
        fee_type: '',
        amount: '',
        payment_mode: '',
        transaction_id: '',
        remarks: ''
      });
      setReceiptPreview(null);
      
      // Recalculate stats and refresh fee data
      setTimeout(calculateCollectionStats, 100);
      await loadFeeDataFromBackend();
      
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  const handleClearCollectionForm = () => {
    setCollectionForm({
      student_id: '',
      fee_type: '',
      amount: '',
      payment_mode: '',
      transaction_id: '',
      remarks: ''
    });
    setReceiptPreview(null);
    toast.info('🗑️ Form Cleared', {
      description: 'All form fields have been cleared.',
      duration: 2000
    });
  };

  const exportStudentReport = (student) => {
    if (!student) {
      toast.error('⚠️ No Student Selected', {
        description: 'Please select a student first to generate the report.',
        duration: 3000
      });
      return;
    }

    // Generate student-specific report
    const reportData = {
      student: {
        name: student.name,
        admissionNo: student.admission_no,
        class: getClassName(student.class_id),
        section: student.section_id,
        guardian: student.guardian_name,
        phone: student.phone
      },
      summary: studentFeesSummary || {
        totalFees: 0,
        paidAmount: 0,
        pendingFees: 0,
        overdueFees: 0
      },
      payments: studentPayments.length > 0 ? studentPayments : [
      ],
      generatedAt: new Date().toLocaleString()
    };

    // Create CSV content for student-specific report
    const csvContent = [
      `Student Fee Report - ${reportData.student.name}`,
      `Admission No: ${reportData.student.admissionNo}`,
      `Class: ${reportData.student.class}, Section: ${reportData.student.section}`,
      `Guardian: ${reportData.student.guardian}`,
      `Generated: ${reportData.generatedAt}`,
      '',
      'Payment Summary:',
      `Total Fees,Paid Amount,Pending Fees,Overdue Fees`,
      `${formatCurrency(reportData.summary.totalFees)},${formatCurrency(reportData.summary.paidAmount)},${formatCurrency(reportData.summary.pendingFees)},${formatCurrency(reportData.summary.overdueFees)}`,
      '',
      'Payment History:',
      'Receipt No,Date,Fee Type,Amount,Payment Mode,Status',
      ...reportData.payments.map(p => 
        `${p.receiptNo},${p.date},${p.feeType},${formatCurrency(p.amount)},${p.paymentMode || 'N/A'},${p.status}`
      )
    ].join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.student.name.replace(/\s+/g, '-')}-fee-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Handler functions for new functionality
  const resetConfigForm = () => {
    setConfigForm({
      amount: '',
      frequency: '',
      dueDate: '',
      applyToClasses: '',
      lateFee: '',
      discount: ''
    });
    setEditingConfig(null);
  };

  const saveConfiguration = async () => {
    // Validate required fields
    if (!configForm.amount || !configForm.frequency || !configForm.applyToClasses) {
      toast.error(`❌ Missing Required Fields`, {
        description: 'Please fill in Amount, Frequency, and Apply to Classes fields.',
        duration: 4000
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('❌ Authentication Required', {
          description: 'Please login to save fee configuration.',
          duration: 4000
        });
        return;
      }

      // Prepare fee configuration data
      const configData = {
        fee_type: currentFeeType,
        amount: parseFloat(configForm.amount),
        frequency: configForm.frequency,
        due_date: configForm.dueDate || null,
        apply_to_classes: configForm.applyToClasses,
        late_fee: parseFloat(configForm.lateFee || 0),
        discount: parseFloat(configForm.discount || 0)
      };

      // Capture edit mode state before resetting
      const isEditing = !!editingConfig;
      
      let response;
      
      if (isEditing) {
        // Update existing configuration
        response = await axios.put(`${API}/fees/configurations/${editingConfig.id}`, configData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Create new configuration
        response = await axios.post(`${API}/fees/configurations`, configData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      // Refresh dashboard data from backend after successful save
      await loadFeeDataFromBackend();

      // Close modal and reset form
      setShowFeeConfigModal(false);
      resetConfigForm();

      // Success feedback with captured state
      toast.success(isEditing ? `✅ ${currentFeeType} Configuration Updated` : `✅ ${currentFeeType} Configuration Saved`, {
        description: isEditing ? `Fee structure updated successfully.` : `Fee structure saved successfully and applied to students.`,
        duration: 5000
      });

    } catch (error) {
      console.error('Failed to save fee configuration:', error);
      // Capture edit mode for error message (editingConfig might still be set in catch block)
      const isEditingError = !!editingConfig;
      const errorMessage = getErrorMessage(error, 'Unable to save fee configuration. Please try again.');
      toast.error(isEditingError ? '❌ Failed to Update Configuration' : '❌ Failed to Save Configuration', {
        description: errorMessage,
        duration: 4000
      });
    }
  };

  const handleFeeConfiguration = (feeType) => {
    setCurrentFeeType(feeType);
    resetConfigForm(); // Reset form when opening modal
    setShowFeeConfigModal(true);
    toast.info(`📝 Fee Configuration`, {
      description: `Opening ${feeType} configuration settings...`,
      duration: 2000
    });
  };

  const handleGenerateReports = () => {
    setShowGenerateReportsModal(true);
    toast.info(`📊 Generate Reports`, {
      description: 'Opening report generation options...',
      duration: 2000
    });
  };

  const handleBulkPayment = () => {
    setShowBulkPaymentModal(true);
    toast.info(`💰 Bulk Payment`, {
      description: 'Opening bulk payment collection for multiple students...',
      duration: 2000
    });
  };

  const handleSendReminders = () => {
    setShowSendRemindersModal(true);
    toast.info(`📧 Send Reminders`, {
      description: 'Opening reminder management for pending/overdue fees...',
      duration: 2000
    });
  };

  const processSendReminders = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('❌ Authentication Required', {
          description: 'Please login to send reminders.',
          duration: 4000
        });
        return;
      }

      // Call backend API to send reminders
      const response = await axios.post(`${API}/reminders/send`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = response.data;
      
      // Close modal first
      setShowSendRemindersModal(false);
      
      // Show success message with actual results
      toast.success(`📧 Reminders Sent Successfully!`, {
        description: `${result.sent_count} reminders sent to students with pending fees. ${result.failed_count} failed.`,
        duration: 5000
      });

    } catch (error) {
      console.error('Send reminders failed:', error);
      const errorMessage = getErrorMessage(error, 'Unable to send reminders. Please try again.');
      toast.error('❌ Send Reminders Failed', {
        description: errorMessage,
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const processBulkPayment = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('❌ Authentication Required', {
          description: 'Please login to process bulk payments.',
          duration: 4000
        });
        return;
      }

      // Check if students are selected
      if (selectedStudents.length === 0) {
        toast.error('❌ No Students Selected', {
          description: 'Please select students for bulk payment.',
          duration: 4000
        });
        return;
      }

      // Real bulk payment data from selected students
      const bulkPaymentData = {
        student_ids: selectedStudents.map(s => s.id),
        fee_type: bulkPaymentFilters.feeType,
        payment_mode: 'bulk_collection',
        transaction_id: `BULK${Date.now()}`,
        remarks: `Bulk payment for ${selectedStudents.length} students`
      };

      const response = await axios.post(`${API}/fees/payments/bulk`, bulkPaymentData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = response.data;
      
      // Close modal first
      setShowBulkPaymentModal(false);
      
      // Use dashboard stats from response for instant update (no race condition!)
      if (result.dashboard_stats) {
        console.log('📊 Using returned dashboard stats for instant update');
        setTotalFees(result.dashboard_stats.total_fees);
        setCollected(result.dashboard_stats.collected);
        setPending(result.dashboard_stats.pending);
        setOverdue(result.dashboard_stats.overdue);
        setPaymentsToday(result.dashboard_stats.payments_today);
        setTodaysCollection(result.dashboard_stats.todays_collection);
      }
      
      // Background refresh for student financials and recent payments
      console.log('🔄 bulk payment ok → refreshing in background...');
      Promise.all([
        loadFeeDataFromBackend(),
        fetchStudentFinancials(bulkPaymentData.student_ids[0])
      ]);
      console.log('✅ bulk refresh initiated');
      
      // Show success message with real-time update confirmation
      toast.success(`💰 Bulk Payment Processed Successfully!`, {
        description: `${result.payments_count} payments processed. Total: ${formatCurrency(result.total_amount)}. Dashboard updated instantly.`,
        duration: 5000
      });

    } catch (error) {
      console.error('Bulk payment failed:', error);
      const errorMessage = getErrorMessage(error, 'Unable to process bulk payment. Please try again.');
      toast.error('❌ Bulk Payment Failed', {
        description: errorMessage,
        duration: 4000
      });
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-sm sm:text-base md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{isMadrasahSimpleUI ? "বেতন ব্যবস্থাপনা" : "Fees Management"}</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">{isMadrasahSimpleUI ? "মাসিক বেতন আদায় ও হিসাব" : "Manage school fees, payments, and financial records"}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
          {!isMadrasahSimpleUI && (
            <Button variant="outline" size="sm" className="w-full sm:w-auto text-sm sm:text-base h-8 sm:h-9" onClick={() => handleExportReport('excel')}>
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Export
            </Button>
          )}
{/* Removed: বেতন আদায় button - use Reports page for payment analytics */}
        </div>
      </div>

      {(!institutionLoading && !isMadrasahSimpleUI) && (<>
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <Card className="card-hover min-w-0">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium text-gray-600">Total Fees</p>
                <p className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">{getCurrencySymbol()}{(totalFees/100000).toFixed(1)}L</p>
                <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Academic Year</p>
              </div>
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-blue-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover min-w-0">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium text-gray-600">Collected</p>
                <p className="text-lg sm:text-2xl md:text-3xl font-bold text-emerald-600 truncate">{getCurrencySymbol()}{(collected/100000).toFixed(1)}L</p>
                <p className="text-[10px] sm:text-xs text-emerald-500 hidden sm:block">+15% this month</p>
              </div>
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-emerald-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover min-w-0">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium text-gray-600">Pending</p>
                <p className="text-lg sm:text-2xl md:text-3xl font-bold text-orange-600 truncate">{getCurrencySymbol()}{(pending/100000).toFixed(1)}L</p>
                <p className="text-[10px] sm:text-xs text-orange-500 hidden sm:block">Due this month</p>
              </div>
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-orange-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover min-w-0">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium text-gray-600">Overdue</p>
                <p className="text-lg sm:text-2xl md:text-3xl font-bold text-red-600 truncate">{getCurrencySymbol()}{(overdue/100000).toFixed(1)}L</p>
                <p className="text-[10px] sm:text-xs text-red-500 hidden sm:block">Needs attention</p>
              </div>
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-red-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      </>)}
      {/* Fees Management - Wait for institution settings to load */}
      {institutionLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <span className="ml-3 text-gray-600">লোড হচ্ছে...</span>
        </div>
      ) : isMadrasahSimpleUI ? (
        /* ============= MADRASAH SIMPLE FEE WIZARD ============= */
        <div className="space-y-4">
          {/* Dashboard Summary Section - আজ আদায়, মোট বকেয়া, আজকের রসিদ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
            <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">আজ আদায়</p>
                    <p className="text-2xl font-bold text-emerald-600">৳{todaysCollection?.toLocaleString() || 0}</p>
                    <p className="text-xs text-emerald-500">{paymentsToday || 0} টি পেমেন্ট</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500 bg-red-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">মোট বকেয়া</p>
                    <p className="text-2xl font-bold text-red-600">৳{(pending + overdue)?.toLocaleString() || 0}</p>
                    <p className="text-xs text-red-500">আদায় প্রয়োজন</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">আজকের রসিদ</p>
                    <p className="text-2xl font-bold text-blue-600">{paymentsToday || 0}</p>
                    <p className="text-xs text-blue-500">রসিদ প্রদান</p>
                  </div>
                  <Receipt className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Wizard Step Indicator */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6">
            <div 
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full cursor-pointer transition-all ${
                madrasahWizardStep === 1 ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setMadrasahWizardStep(1)}
            >
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">১</span>
              <span className="text-sm font-medium hidden sm:inline">ছাত্র নির্বাচন</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div 
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full cursor-pointer transition-all ${
                madrasahWizardStep === 2 ? 'bg-emerald-500 text-white' : selectedStudent ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              onClick={() => selectedStudent && setMadrasahWizardStep(2)}
            >
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">২</span>
              <span className="text-sm font-medium hidden sm:inline">বেতন আদায়</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div 
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full ${
                madrasahWizardStep === 3 ? 'bg-emerald-500 text-white' : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">৩</span>
              <span className="text-sm font-medium hidden sm:inline">রসিদ প্রিন্ট</span>
            </div>
          </div>

          {/* STEP 1: Student Selection */}
          {madrasahWizardStep === 1 && (
            <Card className="border-2 border-emerald-200">
              <CardHeader className="bg-emerald-50 p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-emerald-700 text-lg sm:text-xl">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  ছাত্র নির্বাচন করুন
                </CardTitle>
                <p className="text-sm text-emerald-600 mt-1">মারহালা বাছাই করে ছাত্র খুঁজুন</p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {/* Class Filter Only - Branch filter hidden (not fully implemented) */}
                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">মারহালা নির্বাচন করুন</label>
                    <Select value={selectedClass} onValueChange={(value) => {
                      setSelectedClass(value);
                      setSelectedSection('all');
                      setSelectedStudent(null);
                    }}>
                      <SelectTrigger className="border-emerald-300 focus:border-emerald-500 h-12 text-base">
                        <SelectValue placeholder="মারহালা বাছুন..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সকল মারহালা</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id || cls._id || cls.name} value={cls.name || cls.class_name}>
                            {cls.display_name || cls.name || cls.class_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Branch filter hidden - sections data not fully implemented */}
                </div>

                {/* Simplified Student List */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h4 className="font-medium text-gray-700">ছাত্র তালিকা ({students.filter(s => 
                      (selectedClass === 'all' || s.class === selectedClass || s.class_name === selectedClass || getClassName(s.class_id) === selectedClass) &&
                      (selectedSection === 'all' || s.section === selectedSection || s.section_name === selectedSection || s.section_id === selectedSection)
                    ).length} জন)</h4>
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y">
                    {students.filter(s => 
                      (selectedClass === 'all' || s.class === selectedClass || s.class_name === selectedClass || getClassName(s.class_id) === selectedClass) &&
                      (selectedSection === 'all' || s.section === selectedSection || s.section_name === selectedSection || s.section_id === selectedSection)
                    ).length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p className="font-medium">কোনো ছাত্র পাওয়া যায়নি</p>
                        <p className="text-sm">মারহালা বা শাখা পরিবর্তন করুন</p>
                      </div>
                    ) : (
                      students.filter(s => 
                        (selectedClass === 'all' || s.class === selectedClass || s.class_name === selectedClass || getClassName(s.class_id) === selectedClass) &&
                        (selectedSection === 'all' || s.section === selectedSection || s.section_name === selectedSection || s.section_id === selectedSection)
                      ).map((student) => {
                        // Aggregate ALL fee records for this student (not just first one)
                        const studentFeeRecords = dueFees.filter(f => f.student_id === student.id);
                        const studentDue = studentFeeRecords.length > 0 ? {
                          paid_amount: studentFeeRecords.reduce((sum, f) => sum + (f.paid_amount || 0), 0),
                          pending_amount: studentFeeRecords.reduce((sum, f) => sum + (f.pending_amount || 0), 0),
                          overdue_amount: studentFeeRecords.reduce((sum, f) => sum + (f.overdue_amount || 0), 0)
                        } : null;
                        const hasDue = studentDue && (studentDue.pending_amount > 0 || studentDue.overdue_amount > 0);
                        return (
                          <div 
                            key={student.id || student._id} 
                            className={`flex items-center justify-between p-4 hover:bg-emerald-50 cursor-pointer transition-colors ${
                              selectedStudent?.id === student.id ? 'bg-emerald-100 border-l-4 border-l-emerald-500' : ''
                            }`}
                            onClick={() => setSelectedStudent(student)}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-bold">
                                  {(student.name || student.student_name || 'ছ').charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-bold text-gray-900 text-base">{student.name || student.student_name || `ছাত্র #${student.id?.slice(-4) || ''}`}</p>
                                <p className="text-sm text-gray-500">রোল: {student.roll_no || student.roll || '-'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {studentDue && (
                                <div className="text-right text-sm">
                                  {studentDue.paid_amount > 0 && (
                                    <p className="text-green-600">পেইড: ৳{studentDue.paid_amount?.toLocaleString() || 0}</p>
                                  )}
                                  {hasDue && (
                                    <p className="text-red-600 font-medium">বকেয়া: ৳{((studentDue.pending_amount || 0) + (studentDue.overdue_amount || 0)).toLocaleString()}</p>
                                  )}
                                </div>
                              )}
                              <Badge className={`text-sm px-3 py-1 ${
                                !studentDue ? 'bg-gray-100 text-gray-600' :
                                studentDue.pending_amount === 0 && studentDue.overdue_amount === 0 ? 'bg-green-100 text-green-700' :
                                studentDue.paid_amount > 0 && hasDue ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {!studentDue ? 'তথ্য নেই' :
                                 studentDue.pending_amount === 0 && studentDue.overdue_amount === 0 ? 'পরিশোধিত' :
                                 studentDue.paid_amount > 0 && hasDue ? 'আংশিক পরিশোধ' :
                                 'বকেয়া আছে'}
                              </Badge>
                              {/* Quick Action Buttons */}
                              <div className="flex items-center gap-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="text-blue-600 hover:bg-blue-50 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetailedPaymentModal(student, studentDue);
                                  }}
                                  title="বিস্তারিত পেমেন্ট দেখুন"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="text-purple-600 hover:bg-purple-50 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Download last receipt for this student - check by student_id, _id, or name
                                    const studentId = student.id || student._id;
                                    const studentName = student.name || student.student_name;
                                    const lastPayment = recentPayments.find(p => 
                                      p.student_id === studentId || 
                                      p.studentId === studentId || 
                                      p.student_name === studentName ||
                                      p.studentName === studentName
                                    );
                                    if (lastPayment && (lastPayment.receipt_no || lastPayment.receiptNo)) {
                                      const receiptNo = lastPayment.receipt_no || lastPayment.receiptNo;
                                      window.open(`${API}/fees/receipt/${receiptNo}/pdf`, '_blank');
                                      toast.success('🧾 রসিদ ডাউনলোড হচ্ছে...');
                                    } else {
                                      toast.info('এই ছাত্রের কোন রসিদ নেই');
                                    }
                                  }}
                                  title="রসিদ ডাউনলোড"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </div>
                              <Button 
                                size="lg" 
                                className={`font-bold px-6 ${
                                  studentDue && studentDue.pending_amount === 0 && studentDue.overdue_amount === 0 
                                    ? 'bg-green-500 hover:bg-green-600 text-white cursor-default' 
                                    : studentDue && studentDue.paid_amount > 0 && (studentDue.pending_amount > 0 || studentDue.overdue_amount > 0)
                                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (studentDue && studentDue.pending_amount === 0 && studentDue.overdue_amount === 0) {
                                    toast.success('✅ এই ছাত্রের সব বেতন পরিশোধিত!');
                                    return;
                                  }
                                  setSelectedStudent(student);
                                  setMadrasahWizardStep(2);
                                }}
                              >
                                {studentDue && studentDue.pending_amount === 0 && studentDue.overdue_amount === 0 
                                  ? 'পরিশোধিত' 
                                  : studentDue && studentDue.paid_amount > 0 && (studentDue.pending_amount > 0 || studentDue.overdue_amount > 0)
                                  ? 'আংশিক পরিশোধ'
                                  : 'বেতন নিন'}
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Marhala Fee Overview Panel */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    মারহালা ফি অবস্থা
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {feeConfigurations['Tuition Fees']?.length > 0 ? (
                      feeConfigurations['Tuition Fees'].slice(0, 6).map((config, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{config.applyToClasses || 'সকল মারহালা'}</p>
                            <p className="text-xs text-gray-500">মাসিক: {formatCurrency(config.amount || 0)}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-700 text-xs">সক্রিয়</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center text-gray-500 py-4">
                        <p className="text-sm">কোনো ফি কনফিগার করা হয়নি</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => handleFeeConfiguration('Tuition Fees')}
                        >
                          ফি সেট করুন
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Fee Collection */}
          {madrasahWizardStep === 2 && selectedStudent && (
            <Card className="border-2 border-emerald-200">
              <CardHeader className="bg-emerald-50 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-emerald-700 text-lg sm:text-xl">
                      <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
                      বেতন আদায় করুন
                    </CardTitle>
                    <p className="text-sm text-emerald-600 mt-1">{selectedStudent.name || selectedStudent.student_name} এর বেতন</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setMadrasahWizardStep(1)}>
                    ← ছাত্র পরিবর্তন
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {/* Selected Student Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">
                      {(selectedStudent.name || selectedStudent.student_name || 'ছ').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-lg text-gray-900">{selectedStudent.name || selectedStudent.student_name}</p>
                    <p className="text-gray-600">{getClassName(selectedStudent.class_id)} | রোল: {selectedStudent.roll_no || selectedStudent.roll || '-'}</p>
                    <p className="text-gray-500 text-sm">ভর্তি নং: {selectedStudent.admission_no || '-'}</p>
                  </div>
                </div>

                {/* Fee Breakdown Section - From Fee Setup (Single Source of Truth) */}
                {(() => {
                  const studentClass = selectedStudent.class || selectedStudent.class_name || selectedStudent.class_id;
                  const studentFeeRecords = dueFees.filter(f => f.student_id === selectedStudent.id);
                  const totalDue = studentFeeRecords.reduce((sum, f) => sum + (f.pending_amount || 0) + (f.overdue_amount || 0), 0);
                  const totalPaid = studentFeeRecords.reduce((sum, f) => sum + (f.paid_amount || 0), 0);
                  
                  const getConfiguredFee = (feeType) => {
                    const configs = feeConfigurations[feeType] || [];
                    const classConfig = configs.find(c => c.apply_to_classes === studentClass || c.applyToClasses === studentClass);
                    const allClassConfig = configs.find(c => c.apply_to_classes === 'all' || c.applyToClasses === 'all');
                    return classConfig || allClassConfig;
                  };
                  
                  const tuitionFee = getConfiguredFee('Tuition Fees');
                  const admissionFee = getConfiguredFee('Admission Fees');
                  const examFee = getConfiguredFee('Exam Fees');
                  
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        ফি বিবরণ (ফি সেটআপ থেকে)
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white p-3 rounded border">
                          <p className="text-gray-500">মাসিক বেতন</p>
                          <p className="font-bold text-gray-800">
                            {tuitionFee ? `৳${tuitionFee.amount?.toLocaleString()}` : 
                              <span className="text-yellow-600 text-xs">ফি সেটআপে নির্ধারণ করুন</span>}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-gray-500">ভর্তি ফি</p>
                          <p className="font-bold text-gray-800">
                            {admissionFee ? `৳${admissionFee.amount?.toLocaleString()}` : 
                              <span className="text-gray-400 text-xs">প্রযোজ্য নয়</span>}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-gray-500">পরীক্ষা ফি</p>
                          <p className="font-bold text-gray-800">
                            {examFee ? `৳${examFee.amount?.toLocaleString()}` : 
                              <span className="text-gray-400 text-xs">প্রযোজ্য নয়</span>}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-gray-500">মারহালা</p>
                          <p className="font-bold text-gray-800">{getClassName(selectedStudent.class_id) || studentClass || '-'}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded border border-green-200">
                          <p className="text-green-600">মোট পরিশোধিত</p>
                          <p className="font-bold text-green-700">৳{totalPaid.toLocaleString()}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded border border-red-200">
                          <p className="text-red-600">মোট বকেয়া</p>
                          <p className="font-bold text-red-700">৳{totalDue.toLocaleString()}</p>
                        </div>
                      </div>
                      {!tuitionFee && !admissionFee && !examFee && (
                        <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-700 text-sm">
                          ⚠️ এই মারহালার জন্য ফি সেটআপে কোনো ফি নির্ধারণ করা হয়নি। প্রথমে <a href="/fee-setup" className="underline font-medium">ফি সেটআপ</a> থেকে ফি নির্ধারণ করুন।
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Fee Form */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">বেতনের ধরন</label>
                    <Select 
                      value={collectionForm.fee_type || 'Tuition Fees'} 
                      onValueChange={(value) => setCollectionForm({...collectionForm, fee_type: value})}
                    >
                      <SelectTrigger className="border-emerald-300 focus:border-emerald-500 h-12">
                        <SelectValue placeholder="ফি ধরন বাছুন" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tuition Fees">মাসিক বেতন</SelectItem>
                        <SelectItem value="Admission Fees">ভর্তি ফি</SelectItem>
                        <SelectItem value="Exam Fees">পরীক্ষা ফি</SelectItem>
                        <SelectItem value="Other">অন্যান্য</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">বেতনের পরিমাণ (টাকা)</label>
                    <Input
                      type="number"
                      placeholder="যেমন: ৫০০"
                      value={collectionForm.amount}
                      onChange={(e) => setCollectionForm({...collectionForm, amount: e.target.value})}
                      className="h-14 text-xl font-bold text-center border-emerald-300 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">মন্তব্য (ঐচ্ছিক)</label>
                    <Input
                      placeholder="যেমন: ডিসেম্বর মাসের বেতন"
                      value={collectionForm.remarks}
                      onChange={(e) => setCollectionForm({...collectionForm, remarks: e.target.value})}
                      className="h-12 border-gray-300"
                    />
                  </div>
                  <Button 
                    className="w-full h-14 text-lg font-bold bg-emerald-500 hover:bg-emerald-600"
                    onClick={async () => {
                      if (!collectionForm.amount || parseFloat(collectionForm.amount) <= 0) {
                        toast.error('বেতনের পরিমাণ দিন');
                        return;
                      }
                      setLoading(true);
                      try {
                        const token = localStorage.getItem('token');
                        const selectedFeeType = collectionForm.fee_type || 'Tuition Fees';
                        const response = await axios.post(`${API}/fees/payments`, {
                          student_id: selectedStudent.id,
                          student_name: selectedStudent.name || selectedStudent.student_name,
                          fee_type: selectedFeeType,
                          amount: parseFloat(collectionForm.amount),
                          payment_mode: 'Cash',
                          remarks: collectionForm.remarks || (selectedFeeType === 'Admission Fees' ? 'ভর্তি ফি' : 'মাসিক বেতন'),
                          class_id: selectedStudent.class_id,
                          section_id: selectedStudent.section_id
                        }, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        // Use backend response data, only add fallbacks for UI-specific fields
                        setLastReceipt({
                          student: selectedStudent,
                          amount: parseFloat(collectionForm.amount),
                          date: new Date().toLocaleDateString('bn-BD'),
                          // Fallbacks only used if backend doesn't provide these
                          fee_type: selectedFeeType,
                          payment_mode: 'Cash',
                          remarks: collectionForm.remarks || (selectedFeeType === 'Admission Fees' ? 'ভর্তি ফি' : 'মাসিক বেতন'),
                          status: 'Paid',
                          // Backend response takes priority (spread after fallbacks)
                          ...response.data
                        });
                        // Refresh fee data immediately to update the student list
                        await loadFeeDataFromBackend();
                        setMadrasahWizardStep(3);
                        toast.success('✅ বেতন সফলভাবে আদায় হয়েছে!');
                      } catch (error) {
                        console.error('Payment failed:', error);
                        toast.error('বেতন আদায় ব্যর্থ হয়েছে');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? 'প্রক্রিয়াকরণ হচ্ছে...' : '✓ বেতন আদায় করুন'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Receipt - Professional Madrasah Receipt */}
          {madrasahWizardStep === 3 && lastReceipt && (
            <Card className="border-2 border-emerald-200">
              <CardHeader className="bg-emerald-50 p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-emerald-700 text-lg sm:text-xl">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  বেতন সফলভাবে আদায় হয়েছে!
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {/* Professional Receipt Preview - A5/A6 Print Ready */}
                <div 
                  className="bg-white border-2 border-gray-400 rounded-lg max-w-lg mx-auto mb-6 shadow-lg print:shadow-none print:border-black" 
                  id="receipt-print"
                  style={{ fontFamily: "'Noto Sans Bengali', 'Kalpurush', sans-serif" }}
                >
                  {/* Receipt Header with Institution Branding */}
                  <div 
                    className="text-center py-4 px-4 border-b-2 border-gray-300"
                    style={{ backgroundColor: schoolBranding.primary_color || '#059669' }}
                  >
                    <div className="flex items-center justify-center gap-3 mb-2">
                      {schoolBranding.logo_url && (
                        <img 
                          src={schoolBranding.logo_url} 
                          alt="Logo" 
                          className="h-14 w-14 rounded-full bg-white p-1 object-contain"
                        />
                      )}
                      <div className="text-white">
                        <h2 className="text-xl font-bold leading-tight">
                          {schoolBranding.school_name_bn || schoolBranding.school_name || 'মাদরাসার নাম'}
                        </h2>
                        {schoolBranding.address && (
                          <p className="text-xs opacity-90">{schoolBranding.address}</p>
                        )}
                        <div className="flex items-center justify-center gap-3 text-xs opacity-90 mt-1 flex-wrap">
                          {schoolBranding.phone && (
                            <span>ফোন: {schoolBranding.phone}</span>
                          )}
                          {schoolBranding.email && (
                            <span>ইমেইল: {schoolBranding.email}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Title & Info */}
                  <div className="text-center py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">বেতন রসিদ</h3>
                    <p className="text-xs text-gray-500">Fee Receipt / Money Receipt</p>
                  </div>

                  {/* Receipt Details */}
                  <div className="p-4 space-y-3 text-sm">
                    {/* Receipt Info Row */}
                    <div className="flex justify-between items-center pb-2 border-b border-dashed border-gray-300">
                      <div>
                        <span className="text-gray-500 text-xs">রসিদ নং:</span>
                        <p className="font-bold text-gray-800">{lastReceipt.receipt_no || lastReceipt.id || `${Date.now().toString().slice(-8)}`}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 text-xs">তারিখ:</span>
                        <p className="font-bold text-gray-800">{lastReceipt.date || new Date().toLocaleDateString('bn-BD')}</p>
                      </div>
                    </div>

                    {/* Academic Context */}
                    <div className="flex justify-between items-center pb-2 border-b border-dashed border-gray-300">
                      <div>
                        <span className="text-gray-500 text-xs">মাস:</span>
                        <p className="font-medium text-gray-800">{lastReceipt.month || lastReceipt.remarks || new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 text-xs">শিক্ষাবর্ষ:</span>
                        <p className="font-medium text-gray-800">{lastReceipt.academic_year || `${new Date().getFullYear()} খ্রি.`}</p>
                      </div>
                    </div>

                    {/* Student Info */}
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <h4 className="font-bold text-gray-700 text-xs uppercase border-b pb-1">ছাত্র তথ্য</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500 text-xs">ছাত্রের নাম:</span>
                          <p className="font-bold text-gray-900">{lastReceipt.student?.name || lastReceipt.student?.student_name || 'অজ্ঞাত'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">রোল নং:</span>
                          <p className="font-bold text-gray-900">{lastReceipt.student?.roll_no || lastReceipt.student?.roll || '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">শ্রেণি / মারহালা:</span>
                          <p className="font-bold text-gray-900">{getClassName(lastReceipt.student?.class_id)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">ভর্তি নং:</span>
                          <p className="font-bold text-gray-900">{lastReceipt.student?.admission_no || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-emerald-50 rounded-lg p-3 space-y-2">
                      <h4 className="font-bold text-emerald-700 text-xs uppercase border-b border-emerald-200 pb-1">বেতন তথ্য</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">বেতন ধরন:</span>
                          <span className="font-medium text-gray-800">
                            {lastReceipt.fee_type === 'Tuition Fees' ? 'মাসিক বেতন' : 
                             lastReceipt.fee_type === 'Transport Fees' ? 'পরিবহন ফি' :
                             lastReceipt.fee_type === 'Admission Fees' ? 'ভর্তি ফি' :
                             lastReceipt.fee_type || 'মাসিক বেতন'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">পরিশোধ পদ্ধতি:</span>
                          <span className="font-medium text-gray-800">
                            {lastReceipt.payment_mode === 'Cash' ? 'নগদ' :
                             lastReceipt.payment_mode === 'bKash' ? 'বিকাশ' :
                             lastReceipt.payment_mode === 'Nagad' ? 'নগদ' :
                             lastReceipt.payment_mode === 'Rocket' ? 'রকেট' :
                             lastReceipt.payment_mode === 'Bank' ? 'ব্যাংক' :
                             lastReceipt.payment_mode || 'নগদ'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                          <span className="font-bold text-gray-700">পরিশোধিত পরিমাণ:</span>
                          <span className="text-xl font-bold text-emerald-600">{formatCurrency(lastReceipt.amount)}</span>
                        </div>
                        <div className="flex justify-center pt-1">
                          <Badge className="bg-green-100 text-green-700 px-4 py-1">
                            {lastReceipt.status === 'Pending' ? '⏳ বকেয়া' : '✓ পরিশোধিত'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Footer */}
                  <div className="text-center py-3 px-4 border-t-2 border-gray-300 bg-gray-100">
                    <p className="text-xs text-gray-500 mb-1">এই রসিদটি কম্পিউটার জেনারেটেড এবং অফিস কপি হিসেবে বৈধ।</p>
                    <p className="text-[10px] text-gray-400">Office Copy | Computer Generated Receipt</p>
                    <div className="mt-2 pt-2 border-t border-gray-300 flex justify-between text-[10px] text-gray-400">
                      <span>আদায়কারী স্বাক্ষর: ___________</span>
                      <span>অফিস সিল</span>
                    </div>
                  </div>
                </div>

                {/* Print Styles (inline for component) */}
                <style>{`
                  @media print {
                    body * { visibility: hidden; }
                    #receipt-print, #receipt-print * { visibility: visible; }
                    #receipt-print { 
                      position: absolute; 
                      left: 0; 
                      top: 0; 
                      width: 148mm; /* A5 width */
                      padding: 10mm;
                      margin: 0;
                    }
                  }
                `}</style>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                  <Button 
                    className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 font-bold"
                    onClick={() => {
                      window.print();
                    }}
                  >
                    🖨️ রসিদ প্রিন্ট করুন
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 h-12 font-bold"
                    onClick={() => {
                      setSelectedStudent(null);
                      setCollectionForm({...collectionForm, amount: '', remarks: ''});
                      setLastReceipt(null);
                      setMadrasahWizardStep(1);
                    }}
                  >
                    ← আরেকজনের বেতন নিন
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
      /* ============= STANDARD FEES UI ============= */
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto">
          <TabsTrigger value="manage" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Manage</TabsTrigger>
          <TabsTrigger value="student-specific" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Student</TabsTrigger>
          <TabsTrigger value="due" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Due</TabsTrigger>
          <TabsTrigger value="select-student" className="text-xs sm:text-sm py-2 px-1 sm:px-3 hidden sm:flex">Select</TabsTrigger>
          <TabsTrigger value="collection" className="text-xs sm:text-sm py-2 px-1 sm:px-3 hidden sm:flex">Collection</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          {/* Fee Section Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500 border-l-4 sm:border-l-8 rounded-lg p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-blue-500 text-white rounded-full p-2 sm:p-3 md:p-4">
                <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-700">
                  Fee Structure Management
                </h2>
                <p className="text-xs sm:text-sm text-blue-600">
                  Configure fee types, amounts, and payment schedules
                </p>
              </div>
            </div>
          </div>
          
          {/* Fee Types Configuration */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Fee Types Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <Card className="border-2 border-dashed border-gray-300 hover:border-emerald-500 transition-colors min-w-0">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto text-gray-400 mb-2 sm:mb-3" />
                    <h3 className="font-medium text-sm sm:text-base mb-1 sm:mb-2">Tuition Fees</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">Monthly tuition charges</p>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm" onClick={() => handleFeeConfiguration('Tuition Fees')}>Configure</Button>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-dashed border-gray-300 hover:border-emerald-500 transition-colors min-w-0">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <Receipt className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto text-gray-400 mb-2 sm:mb-3" />
                    <h3 className="font-medium text-sm sm:text-base mb-1 sm:mb-2">Transport Fees</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">Bus and transport charges</p>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm" onClick={() => handleFeeConfiguration('Transport Fees')}>Configure</Button>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-dashed border-gray-300 hover:border-emerald-500 transition-colors min-w-0 sm:col-span-2 lg:col-span-1">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <CreditCard className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto text-gray-400 mb-2 sm:mb-3" />
                    <h3 className="font-medium text-sm sm:text-base mb-1 sm:mb-2">Admission Fees</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">One-time admission charges</p>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm" onClick={() => handleFeeConfiguration('Admission Fees')}>Configure</Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments Summary for Manage Fees */}
          {!institutionLoading && (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                Recent Payment Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <div className="text-center p-2 sm:p-4 bg-green-50 rounded-lg">
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{paymentsToday}</p>
                  <p className="text-[10px] sm:text-xs md:text-sm text-green-600">Payments Today</p>
                </div>
                <div className="text-center p-2 sm:p-4 bg-blue-50 rounded-lg">
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">
                    {todaysCollection >= 100000 
                      ? `${getCurrencySymbol()}${(todaysCollection / 100000).toFixed(2)}L`
                      : `${getCurrencySymbol()}${todaysCollection.toLocaleString('en-IN')}`
                    }
                  </p>
                  <p className="text-[10px] sm:text-xs md:text-sm text-blue-600">Today's Collection</p>
                </div>
                <div className="text-center p-2 sm:p-4 bg-orange-50 rounded-lg">
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">{pendingApprovals}</p>
                  <p className="text-[10px] sm:text-xs md:text-sm text-orange-600">Pending</p>
                </div>
                <div className="text-center p-2 sm:p-4 bg-purple-50 rounded-lg">
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">{getCurrencySymbol()}{(monthlyTarget / 100000).toFixed(1)}L</p>
                  <p className="text-[10px] sm:text-xs md:text-sm text-purple-600">Monthly Target</p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {!institutionLoading && (
          <Card>
            <CardHeader>
              <CardTitle>Management Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button className="h-20 flex flex-col gap-2 bg-blue-500 hover:bg-blue-600" onClick={handleGenerateReports}>
                  <FileText className="h-6 w-6" />
                  <span>Generate Reports</span>
                </Button>
                <Button className="h-20 flex flex-col gap-2 bg-emerald-500 hover:bg-emerald-600" onClick={handleBulkPayment}>
                  <Users className="h-6 w-6" />
                  <span>Bulk Payment</span>
                </Button>
                <Button className="h-20 flex flex-col gap-2 bg-orange-500 hover:bg-orange-600" onClick={handleSendReminders}>
                  <AlertTriangle className="h-6 w-6" />
                  <span>Send Reminders</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="student-specific" className="space-y-6">
          {/* HUGE CLEAR VISUAL INDICATOR FOR STUDENT SPECIFIC TAB */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 sm:border-l-8 border-emerald-500 rounded-lg p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-emerald-500 text-white rounded-full p-2 sm:p-3 md:p-4">
                <User className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8" />
              </div>
              <div>
                <h1 className="text-base sm:text-2xl md:text-4xl font-bold text-emerald-700">👨‍🎓 STUDENT SPECIFIC TAB</h1>
                <h2 className="text-xs sm:text-lg md:text-xl font-bold text-emerald-700">Individual Student Financial Reports</h2>
                <p className="text-[10px] sm:text-sm md:text-base text-emerald-600">Individual student fee management, payment history, and reports</p>
              </div>
            </div>
          </div>
          
          {/* Student Search & Filter */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 flex-shrink-0" />
                Search & Filter Students
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:grid sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="sm:col-span-2 min-w-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by admission number or name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger data-testid="class-select" className="text-xs sm:text-sm h-8 sm:h-10">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    <SelectItem value="A">Section A</SelectItem>
                    <SelectItem value="B">Section B</SelectItem>
                    <SelectItem value="C">Section C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6" data-section="student-list-details">
            {/* Student List */}
            <div className="lg:col-span-1 min-w-0">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    Students ({filteredStudents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-64 sm:max-h-96 overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-gray-300 mb-2 sm:mb-3" />
                        <p className="text-xs sm:text-sm">No students found</p>
                      </div>
                    ) : (
                      filteredStudents.map((student) => (
                        <div
                          key={student.id}
                          className={`p-3 sm:p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedStudent?.id === student.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
                          }`}
                          onClick={() => handleStudentSelect(student)}
                        >
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs sm:text-sm">
                                {student.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs sm:text-sm truncate">{student.name}</p>
                              <p className="text-[10px] sm:text-xs text-gray-500 truncate">{student.admission_no}</p>
                              <p className="text-[10px] sm:text-xs text-gray-500 truncate">{getClassName(student.class_id)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Student Details */}
            <div className="lg:col-span-2">
              {!selectedStudent ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <User className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Student</h3>
                    <p className="text-gray-600">Choose a student from the list to view their financial details</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Student Profile Panel */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Student Profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg">
                            {selectedStudent.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h3 className="font-semibold text-lg">{selectedStudent.name}</h3>
                            <p className="text-sm text-gray-600 mb-2">Admission No: {selectedStudent.admission_no}</p>
                            <p className="text-sm text-gray-600">{getClassName(selectedStudent.class_id)}, Section {selectedStudent.section_id}</p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="h-4 w-4 mr-2" />
                              {selectedStudent.phone}
                            </div>
                            {selectedStudent.email && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="h-4 w-4 mr-2" />
                                {selectedStudent.email}
                              </div>
                            )}
                            <div className="flex items-center text-sm text-gray-600">
                              <User className="h-4 w-4 mr-2" />
                              Guardian: {selectedStudent.guardian_name}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="h-4 w-4 mr-2" />
                              {selectedStudent.guardian_phone}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Summary */}
                  {studentFeesSummary && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-emerald-500" />
                            Payment Summary
                          </span>
                          <span className="text-sm text-gray-500">Academic Year 2024-25</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(studentFeesSummary.totalFees)}</p>
                            <p className="text-sm text-blue-600">Total Fees</p>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(studentFeesSummary.paidAmount)}</p>
                            <p className="text-sm text-green-600">Paid Amount</p>
                          </div>
                          <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(studentFeesSummary.pendingFees)}</p>
                            <p className="text-sm text-yellow-600">Pending Fees</p>
                          </div>
                          <div className="text-center p-4 bg-red-50 rounded-lg">
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(studentFeesSummary.overdueFees)}</p>
                            <p className="text-sm text-red-600">Overdue Fees</p>
                          </div>
                        </div>
                        
                        {/* Payment Progress Bar */}
                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Payment Progress</span>
                            <span className="text-sm text-gray-500">
                              {((studentFeesSummary.paidAmount / (studentFeesSummary.totalFees || 1)) * 100).toFixed(1)}% Complete
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500 ease-in-out"
                              style={{ 
                                width: `${Math.min(((studentFeesSummary.paidAmount / (studentFeesSummary.totalFees || 1)) * 100), 100)}%` 
                              }}
                            ></div>
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-gray-500">
                            <span>{formatCurrency(studentFeesSummary.paidAmount)} Paid</span>
                            <span>{formatCurrency(studentFeesSummary.totalFees)} Total</span>
                          </div>
                        </div>
                        
                        {studentFeesSummary.lastPaymentDate && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                              Last Payment: <span className="font-medium">{new Date(studentFeesSummary.lastPaymentDate).toLocaleDateString()}</span>
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        <Button 
                          onClick={handleCollectPayment}
                          className="bg-emerald-500 hover:bg-emerald-600"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Collect Payment
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => exportStudentReport(selectedStudent)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Report
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleViewAllReceipts(selectedStudent)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View All Receipts
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleContactGuardian(selectedStudent)}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Contact Guardian
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment History */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-emerald-500" />
                        Payment History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        <Button className="bg-emerald-500 hover:bg-emerald-600">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Collect Payment
                        </Button>
                        <Button variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Export Report
                        </Button>
                        <Button variant="outline">
                          <Receipt className="h-4 w-4 mr-2" />
                          View Receipts
                        </Button>
                        <Button variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          Fee Statement
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment History Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Receipt className="h-5 w-5 text-emerald-500" />
                          Payment History
                        </span>
                        <Badge variant="secondary">{studentPayments.length} records</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Receipt No.</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Fee Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Payment Mode</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentPayments.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                  No payment records found
                                </TableCell>
                              </TableRow>
                            ) : (
                              studentPayments.map((payment) => (
                                <TableRow key={payment.id} className={payment.status === 'Overdue' ? 'bg-red-50' : ''}>
                                  <TableCell className="font-medium">
                                    {payment.receiptNo}
                                  </TableCell>
                                  <TableCell>
                                    {payment.date ? new Date(payment.date).toLocaleDateString() : '-'}
                                  </TableCell>
                                  <TableCell>{payment.feeType}</TableCell>
                                  <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                                  <TableCell>{payment.paymentMode || '-'}</TableCell>
                                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                                  <TableCell className={payment.status === 'Overdue' ? 'text-red-600 font-medium' : ''}>
                                    {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      {payment.status === 'Paid' && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleDownloadReceipt(payment.receiptNo)}
                                          title="Download Receipt"
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {(payment.status === 'Pending' || payment.status === 'Overdue') && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-emerald-600"
                                          onClick={() => handleStudentPayNow(payment)}
                                          title="Collect Payment"
                                        >
                                          <CreditCard className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pending & Overdue Fees */}
                  {studentPayments.some(p => p.status === 'Pending' || p.status === 'Overdue') && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          Outstanding Payments
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {studentPayments
                            .filter(p => p.status === 'Pending' || p.status === 'Overdue')
                            .map((payment) => (
                              <div 
                                key={payment.id} 
                                className={`p-4 rounded-lg border-l-4 ${
                                  payment.status === 'Overdue' 
                                    ? 'bg-red-50 border-l-red-500' 
                                    : 'bg-yellow-50 border-l-yellow-500'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{payment.feeType}</p>
                                    <p className="text-sm text-gray-600">
                                      Due: {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'No due date'}
                                      {payment.status === 'Overdue' && (
                                        <span className="ml-2 text-red-600 font-medium">
                                          (Overdue by {Math.ceil((new Date() - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24))} days)
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-lg">{formatCurrency(payment.amount)}</p>
                                    <Button 
                                      size="sm" 
                                      className={payment.status === 'Overdue' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}
                                      onClick={() => handleStudentPayNow(payment)}
                                    >
                                      Pay Now
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="due" className="space-y-6">
          {/* HUGE CLEAR VISUAL INDICATOR FOR FEE DUE TAB */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-8 border-red-500 rounded-lg p-8 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-red-500 text-white rounded-full p-4">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-red-700">⚠️ FEE DUE TAB</h1>
                <h2 className="text-xl font-bold text-red-700">Pending & Overdue Fee Management</h2>
                <p className="text-red-600">Track and collect pending fees, send reminders, manage overdue accounts</p>
              </div>
            </div>
          </div>

          {/* Summary Cards - Dynamic Data from Backend */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Fees</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(pending)}</p>
                    <p className="text-xs text-orange-500">{dueFees.filter(f => f.status === 'pending').length} students</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Overdue Fees</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(overdue)}</p>
                    <p className="text-xs text-red-500">{dueFees.filter(f => f.status === 'overdue').length} students</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Due Students</p>
                    <p className="text-2xl font-bold text-yellow-600">{dueFees.length}</p>
                    <p className="text-xs text-yellow-500">Total: {formatCurrency(pending + overdue)}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fee Due List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Outstanding Payments
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExportReport('excel', 'overdue_students')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export List
                  </Button>
                  <Button className="bg-orange-500 hover:bg-orange-600" size="sm" onClick={handleSendReminders}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reminders
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dueFees.length > 0 ? (
                      dueFees
                        .sort((a, b) => b.days_overdue - a.days_overdue)
                        .map((fee, index) => (
                          <TableRow 
                            key={fee.id || index} 
                            className={fee.days_overdue > 7 ? 'bg-red-50' : fee.days_overdue > 0 ? 'bg-yellow-50' : ''}
                          >
                            <TableCell className="font-medium">{fee.student_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{fee.admission_no}</Badge>
                            </TableCell>
                            <TableCell>{getClassName(fee.class_id) || 'Unknown'}</TableCell>
                            <TableCell>{fee.fee_type}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(fee.total_due)}</TableCell>
                            <TableCell>
                              {fee.due_date ? new Date(fee.due_date).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                fee.days_overdue > 7 ? 'bg-red-100 text-red-800' :
                                fee.days_overdue > 0 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }>
                                {fee.days_overdue > 0 ? `${fee.days_overdue} days` : 'On time'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  size="sm" 
                                  className="bg-emerald-500 hover:bg-emerald-600" 
                                  onClick={() => handleStudentCollectPayment({
                                    id: fee.student_id,
                                    name: fee.student_name,
                                    admission_no: fee.admission_no,
                                    pending_amount: fee.total_due,
                                    class_id: fee.class_id,
                                    section_id: fee.section_id
                                  })}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Collect
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleContactGuardian({
                                    name: fee.student_name,
                                    admission: fee.admission_no
                                  })}
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No outstanding payments found</p>
                          <p className="text-sm">All students are up to date with their fees!</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="select-student" className="space-y-6">
          {/* HUGE CLEAR VISUAL INDICATOR FOR SELECT STUDENT TAB */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-l-8 border-purple-500 rounded-lg p-8 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500 text-white rounded-full p-4">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-purple-700">👥 SELECT STUDENT TAB</h1>
                <h2 className="text-xl font-bold text-purple-700">Student Selection & Quick Actions</h2>
                <p className="text-purple-600">Quick student lookup with fee collection and profile access</p>
              </div>
            </div>
          </div>

          {/* Quick Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-purple-500" />
                Quick Student Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by admission number, name, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button 
                  className="bg-purple-500 hover:bg-purple-600"
                  onClick={() => {
                    toast.success('🔍 Advanced Search', {
                      description: 'Use the Class and Section filters above to refine your search results.',
                      duration: 4000
                    });
                    // Focus on class selector
                    const classSelector = document.querySelector('[data-testid="class-select"]');
                    if (classSelector) classSelector.focus();
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Advanced Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Student Grid with Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Select Student for Fee Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.slice(0, 9).map((student) => (
                  <Card key={student.id} className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-purple-200 group">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-purple-100 text-purple-700 group-hover:bg-purple-200">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{student.name}</h3>
                          <p className="text-sm text-gray-500">{student.admission_no}</p>
                          <p className="text-xs text-gray-500">{getClassName(student.class_id)}</p>
                        </div>
                      </div>
                      
                      {/* Quick Fee Status */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Pending:</span>
                          <span className="text-orange-600 font-medium">{getCurrencySymbol()}12,500</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Overdue:</span>
                          <span className="text-red-600 font-medium">{getCurrencySymbol()}3,200</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{width: '65%'}}></div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">65% fees paid</p>
                      </div>

                      {/* Quick Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          size="sm" 
                          className="bg-purple-500 hover:bg-purple-600 text-xs"
                          onClick={() => {
                            // Set selected student and show details in toast for grid view
                            setSelectedStudent(student);
                            fetchStudentFinancials(student.id);
                            toast.success(`👤 ${student.name}`, {
                              description: `Viewing details for ${student.name} (${student.admission_no}) - ${getClassName(student.class_id)}`,
                              duration: 4000
                            });
                            // Scroll to the list view section to show details
                            const studentListSection = document.querySelector('[data-section="student-list-details"]');
                            if (studentListSection) {
                              studentListSection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                        >
                          <User className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => handleStudentCollectPayment(student)}
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          Collect Fee
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredStudents.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
                  <p className="text-gray-600">Try adjusting your search criteria</p>
                </div>
              )}

              {filteredStudents.length > 9 && (
                <div className="text-center mt-6">
                  <Button 
                    variant="outline" 
                    className="border-purple-200 text-purple-600 hover:bg-purple-50"
                    onClick={() => {
                      toast.info(`👥 All Students`, {
                        description: `Showing first 9 of ${filteredStudents.length} students. Use search filters to refine results.`,
                        duration: 4000
                      });
                    }}
                  >
                    View All {filteredStudents.length} Students
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collection" className="space-y-6">
          {/* Header - Different for Madrasah Simple UI */}
          <div className={`bg-gradient-to-r ${isMadrasahSimpleUI ? 'from-emerald-50 to-green-50 border-emerald-500' : 'from-green-50 to-emerald-50 border-green-500'} border-l-8 rounded-lg p-6 sm:p-8 mb-6`}>
            <div className="flex items-center gap-3">
              <div className={`${isMadrasahSimpleUI ? 'bg-emerald-500' : 'bg-green-500'} text-white rounded-full p-3 sm:p-4`}>
                <CreditCard className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold ${isMadrasahSimpleUI ? 'text-emerald-700' : 'text-green-700'}`}>
                  {isMadrasahSimpleUI ? '💰 বেতন আদায়' : '💳 FEE COLLECTION TAB'}
                </h1>
                <p className={`text-sm sm:text-base ${isMadrasahSimpleUI ? 'text-emerald-600' : 'text-green-600'}`}>
                  {isMadrasahSimpleUI ? 'মারহালা → শাখা → ছাত্র নির্বাচন → বেতন আদায়' : 'Process payments, generate receipts, and track daily collections'}
                </p>
              </div>
            </div>
          </div>

          {/* Analytics Stats - HIDE for Madrasah Simple UI */}
          {!isMadrasahSimpleUI && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today's Collection</p>
                    <p className="text-2xl font-bold text-green-600">
                      {getCurrencySymbol()}{collectionStats.todaysCollection ? (collectionStats.todaysCollection/1000).toFixed(0) + 'K' : '0'}
                    </p>
                    <p className="text-xs text-green-500">{collectionStats.transactions || 0} payments today</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-blue-600">{collectionStats.transactions || 0}</p>
                    <p className="text-xs text-blue-500">payments processed</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Payment</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(collectionStats.avgPayment || 0)}
                    </p>
                    <p className="text-xs text-purple-500">per transaction</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cash Balance</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(collectionStats.cashBalance || 0)}
                    </p>
                    <p className="text-xs text-orange-500">to be deposited</p>
                  </div>
                  <Receipt className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Madrasah Simple UI - Class/Section Flow */}
          {isMadrasahSimpleUI ? (
            <Card className="border-2 border-emerald-200">
              <CardHeader className="bg-emerald-50">
                <CardTitle className="flex items-center gap-2 text-emerald-700">
                  <Users className="h-5 w-5" />
                  ছাত্র নির্বাচন ও বেতন আদায়
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {/* Step 1: Class Selection - Branch filter hidden */}
                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">মারহালা নির্বাচন করুন *</label>
                    <Select value={selectedClass} onValueChange={(value) => {
                      setSelectedClass(value);
                      setSelectedSection('all');
                      setSelectedStudent(null);
                    }}>
                      <SelectTrigger className="border-emerald-300 focus:border-emerald-500">
                        <SelectValue placeholder="মারহালা বাছুন..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সকল মারহালা</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id || cls._id || cls.name} value={cls.name || cls.class_name}>
                            {cls.display_name || cls.name || cls.class_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Branch filter hidden - sections data not fully implemented */}
                </div>

                {/* Step 2: Student List with Paid/Due Status */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h4 className="font-medium text-gray-700">ছাত্র তালিকা ({students.filter(s => 
                      (selectedClass === 'all' || s.class === selectedClass || s.class_name === selectedClass) &&
                      (selectedSection === 'all' || s.section === selectedSection || s.section_name === selectedSection)
                    ).length} জন)</h4>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {students.filter(s => 
                      (selectedClass === 'all' || s.class === selectedClass || s.class_name === selectedClass) &&
                      (selectedSection === 'all' || s.section === selectedSection || s.section_name === selectedSection)
                    ).map((student) => (
                      <div 
                        key={student.id || student._id} 
                        className={`flex items-center justify-between p-4 border-b hover:bg-emerald-50 cursor-pointer transition-colors ${selectedStudent?.id === student.id ? 'bg-emerald-100 border-l-4 border-l-emerald-500' : ''}`}
                        onClick={() => setSelectedStudent(student)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700">
                              {(student.name || student.student_name || 'S').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{student.name || student.student_name}</p>
                            <p className="text-xs text-gray-500">{student.class || student.class_name} - {student.section || student.section_name} | রোল: {student.roll_no || student.roll || '-'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={student.fee_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {student.fee_status === 'paid' ? 'পরিশোধিত' : 'বাকি'}
                          </Badge>
                          {student.due_amount > 0 && (
                            <p className="text-sm font-bold text-red-600 mt-1">{formatCurrency(student.due_amount)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {students.filter(s => 
                      (selectedClass === 'all' || s.class === selectedClass || s.class_name === selectedClass) &&
                      (selectedSection === 'all' || s.section === selectedSection || s.section_name === selectedSection)
                    ).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>কোন ছাত্র পাওয়া যায়নি</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: Quick Collect - Selected Student */}
                {selectedStudent && (
                  <div className="mt-6 p-4 bg-emerald-50 rounded-lg border-2 border-emerald-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-emerald-200 text-emerald-800 text-lg">
                            {(selectedStudent.name || selectedStudent.student_name || 'S').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-lg text-gray-900">{selectedStudent.name || selectedStudent.student_name}</p>
                          <p className="text-sm text-gray-600">{selectedStudent.class || selectedStudent.class_name} - {selectedStudent.section || selectedStudent.section_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">মাসিক বেতন</p>
                        <Input
                          type="number"
                          placeholder="টাকার পরিমাণ"
                          className="w-32 text-right font-bold"
                          value={collectionForm.amount}
                          onChange={(e) => setCollectionForm(prev => ({ ...prev, amount: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Select 
                        value={collectionForm.payment_mode || 'Cash'} 
                        onValueChange={(value) => setCollectionForm(prev => ({ ...prev, payment_mode: value }))}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="পেমেন্ট মোড" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">নগদ</SelectItem>
                          <SelectItem value="bKash">বিকাশ</SelectItem>
                          <SelectItem value="Nagad">নগদ (ডিজিটাল)</SelectItem>
                          <SelectItem value="Bank">ব্যাংক</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        className="bg-emerald-500 hover:bg-emerald-600 px-8"
                        disabled={loading || !collectionForm.amount || parseFloat(collectionForm.amount) <= 0}
                        onClick={async () => {
                          const paymentData = {
                            student_id: selectedStudent.id || selectedStudent._id,
                            fee_type: 'Monthly Fee',
                            amount: parseFloat(collectionForm.amount),
                            payment_mode: collectionForm.payment_mode || 'Cash',
                            remarks: 'মাসিক বেতন আদায়'
                          };
                          const success = await submitPayment(paymentData);
                          if (success) {
                            setSelectedStudent(null);
                            setCollectionForm(prev => ({ ...prev, amount: '', payment_mode: 'Cash' }));
                            toast.success('✅ বেতন আদায় সফল!');
                          }
                        }}
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            বেতন আদায় করুন
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-500" />
                Fee Collection Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Student Information *</label>
                    <Select value={collectionForm.student_id} onValueChange={(value) => {
                      setCollectionForm(prev => ({ ...prev, student_id: value }));
                      updateReceiptPreview({ ...collectionForm, student_id: value });
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select or search student..." />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name} - {student.admission_no}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Fee Type *</label>
                    <Select value={collectionForm.fee_type} onValueChange={(value) => {
                      setCollectionForm(prev => ({ ...prev, fee_type: value }));
                      updateReceiptPreview({ ...collectionForm, fee_type: value });
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tuition Fee">Tuition Fee</SelectItem>
                        <SelectItem value="Transport Fee">Transport Fee</SelectItem>
                        <SelectItem value="Lab Fee">Lab Fee</SelectItem>
                        <SelectItem value="Library Fee">Library Fee</SelectItem>
                        <SelectItem value="Exam Fee">Exam Fee</SelectItem>
                        <SelectItem value="Annual Fee">Annual Fee</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Amount *</label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      min="1"
                      value={collectionForm.amount}
                      onChange={(e) => {
                        setCollectionForm(prev => ({ ...prev, amount: e.target.value }));
                        updateReceiptPreview({ ...collectionForm, amount: e.target.value });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Payment Mode *</label>
                    <Select value={collectionForm.payment_mode} onValueChange={(value) => {
                      setCollectionForm(prev => ({ ...prev, payment_mode: value }));
                      updateReceiptPreview({ ...collectionForm, payment_mode: value });
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Debit/Credit Card">Debit/Credit Card</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Net Banking">Net Banking</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Transaction ID</label>
                    <Input
                      placeholder="Enter transaction ID (optional)"
                      value={collectionForm.transaction_id}
                      onChange={(e) => setCollectionForm(prev => ({ ...prev, transaction_id: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Remarks</label>
                    <Input
                      placeholder="Additional notes (optional)"
                      value={collectionForm.remarks}
                      onChange={(e) => setCollectionForm(prev => ({ ...prev, remarks: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Receipt Preview</label>
                    {receiptPreview ? (
                      <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                        <div className="text-center mb-4">
                          <Receipt className="h-8 w-8 mx-auto text-green-600 mb-2" />
                          <p className="font-bold text-green-800">Receipt #{receiptPreview.receiptNo}</p>
                          <p className="text-xs text-green-600">{receiptPreview.date} • {receiptPreview.time}</p>
                        </div>
                        {receiptPreview.student && (
                          <div className="space-y-1 text-sm">
                            <p><strong>Student:</strong> {receiptPreview.student.name}</p>
                            <p><strong>Admission:</strong> {receiptPreview.student.admission_no}</p>
                            <p><strong>Class:</strong> {receiptPreview.student.class}</p>
                            <p><strong>Fee Type:</strong> {receiptPreview.fee_type}</p>
                            <p><strong>Amount:</strong> {formatCurrency(receiptPreview.amount)}</p>
                            {receiptPreview.payment_mode && (
                              <p><strong>Payment Mode:</strong> {receiptPreview.payment_mode}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Receipt className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-sm text-gray-500">Receipt will be generated after payment</p>
                        <p className="text-xs text-gray-400 mt-2">Fill form to preview receipt</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full text-green-700 border-green-300"
                        onClick={() => {
                          if (!collectionForm.student_id) {
                            toast.error('⚠️ Select Student First', {
                              description: 'Please select a student to view their profile.',
                              duration: 3000
                            });
                            return;
                          }
                          const student = students.find(s => s.id === collectionForm.student_id);
                          setSelectedStudent(student);
                          fetchStudentFinancials(student.id);
                          handleTabChange('student-specific');
                          toast.success(`👤 ${student.name}`, {
                            description: `Viewing profile for ${student.name} - switched to Student Specific tab.`,
                            duration: 4000
                          });
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        View Student Profile
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full text-green-700 border-green-300"
                        onClick={() => {
                          if (!collectionForm.student_id) {
                            toast.error('⚠️ Select Student First', {
                              description: 'Please select a student to view their payment history.',
                              duration: 3000
                            });
                            return;
                          }
                          const student = students.find(s => s.id === collectionForm.student_id);
                          setSelectedStudent(student);
                          fetchStudentFinancials(student.id);
                          handleTabChange('student-specific');
                          toast.success(`📄 Payment History`, {
                            description: `Viewing payment history for ${student.name} - switched to Student Specific tab.`,
                            duration: 4000
                          });
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Payment History
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full text-green-700 border-green-300"
                        onClick={() => {
                          if (!collectionForm.student_id) {
                            toast.error('⚠️ Select Student First', {
                              description: 'Please select a student to contact their parent.',
                              duration: 3000
                            });
                            return;
                          }
                          const student = students.find(s => s.id === collectionForm.student_id);
                          handleContactGuardian(student);
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Contact Parent
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setCollectionForm({
                      student_id: '',
                      fee_type: '',
                      amount: '',
                      payment_mode: '',
                      transaction_id: '',
                      remarks: ''
                    });
                    setReceiptPreview(null);
                    toast.info('Form cleared');
                  }}
                >
                  Clear Form
                </Button>
                <Button 
                  className="bg-green-500 hover:bg-green-600"
                  disabled={loading || !collectionForm.student_id || !collectionForm.fee_type || !collectionForm.amount || !collectionForm.payment_mode}
                  onClick={async () => {
                    if (!collectionForm.student_id) {
                      toast.error('Please select a student');
                      return;
                    }
                    if (!collectionForm.fee_type) {
                      toast.error('Please select a fee type');
                      return;
                    }
                    if (!collectionForm.amount || parseFloat(collectionForm.amount) <= 0) {
                      toast.error('Please enter a valid amount');
                      return;
                    }
                    if (!collectionForm.payment_mode) {
                      toast.error('Please select a payment mode');
                      return;
                    }
                    
                    const paymentData = {
                      student_id: collectionForm.student_id,
                      fee_type: collectionForm.fee_type,
                      amount: parseFloat(collectionForm.amount),
                      payment_mode: collectionForm.payment_mode,
                      transaction_id: collectionForm.transaction_id || null,
                      remarks: collectionForm.remarks || null
                    };
                    
                    const success = await submitPayment(paymentData);
                    
                    // Only clear form after successful payment
                    if (success) {
                      setCollectionForm({
                        student_id: '',
                        fee_type: '',
                        amount: '',
                        payment_mode: '',
                        transaction_id: '',
                        remarks: ''
                      });
                      setReceiptPreview(null);
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Process Payment & Generate Receipt
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Recent Collections - Hide for Madrasah Simple UI */}
          {!isMadrasahSimpleUI && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  Recent Collections Today
                </span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Last updated: {new Date().toLocaleTimeString()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPayments.length > 0 ? (
                  recentPayments.slice(0, 10).map((payment, index) => (
                    <div key={payment.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 text-green-700 rounded-full p-2">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{payment.student_name}</p>
                          <p className="text-xs text-gray-500">{payment.time} • {payment.payment_mode}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-gray-500">{payment.receipt_no}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No recent payments today</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

      </Tabs>
      )}

      {/* Payment Collection Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-500" />
              Collect Payment
            </DialogTitle>
            <DialogDescription>
              Select student and enter payment details
            </DialogDescription>
          </DialogHeader>
          
          <PaymentForm 
            students={students}
            classes={classes}
            feeConfigurations={feeConfigurations}
            onSubmit={submitPayment}
            onCancel={() => setShowPaymentModal(false)}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* CSV Export Modal */}
      {showExportOptions && (
        <CSVExportModal 
          onClose={() => setShowExportOptions(false)}
          onExport={handleExportCSV}
        />
      )}

      {/* Fee Configuration Modal */}
      <Dialog open={showFeeConfigModal} onOpenChange={setShowFeeConfigModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              Configure {currentFeeType}
            </DialogTitle>
            <DialogDescription>
              Manage fee structures, amounts, and payment schedules for {currentFeeType}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Fee Configuration Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Fee Structure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount ({getCurrencySymbol()})</label>
                    <Input 
                      type="number" 
                      placeholder="Enter amount" 
                      value={configForm.amount}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Frequency</label>
                    <Select value={configForm.frequency} onValueChange={(value) => setConfigForm(prev => ({ ...prev, frequency: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="one-time">One-Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Due Date</label>
                    <Input 
                      type="date" 
                      value={configForm.dueDate}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Class-wise Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Apply to Classes</label>
                    <Select value={configForm.applyToClasses} onValueChange={(value) => setConfigForm(prev => ({ ...prev, applyToClasses: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} ({cls.standard})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Late Fee</label>
                    <Input 
                      type="number" 
                      placeholder="Late fee amount" 
                      value={configForm.lateFee}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, lateFee: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Discount</label>
                    <Input 
                      type="number" 
                      placeholder="Discount percentage" 
                      value={configForm.discount}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, discount: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Fee Structure Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current {currentFeeType} Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Class</th>
                        <th className="text-left p-3">Amount</th>
                        <th className="text-left p-3">Frequency</th>
                        <th className="text-left p-3">Due Date</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeConfigurations[currentFeeType] && feeConfigurations[currentFeeType].length > 0 ? (
                        feeConfigurations[currentFeeType].map((config, index) => {
                          // Get class name from apply_to_classes field
                          let className = 'All Classes';
                          if (config.apply_to_classes && config.apply_to_classes !== 'all') {
                            const classObj = classes.find(c => c.id === config.apply_to_classes);
                            className = classObj ? `${classObj.name} (${classObj.standard})` : config.apply_to_classes;
                          }
                          
                          return (
                            <tr key={config.id || index} className="border-b">
                              <td className="p-3">{className}</td>
                              <td className="p-3">{formatCurrency(config.amount)}</td>
                              <td className="p-3">{config.frequency}</td>
                              <td className="p-3">{config.due_date}</td>
                              <td className="p-3">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mr-2"
                                  onClick={() => handleEditConfig(config)}
                                >
                                  Edit
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleDeleteConfig(config)}
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="p-6 text-center text-gray-500">
                            No fee configurations found. Click "Save Configuration" to add new fees.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeeConfigModal(false)}>Cancel</Button>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={saveConfiguration}>
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirmModal} onOpenChange={setShowDeleteConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Fee Configuration
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this fee configuration? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {configToDelete && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm space-y-1">
                <p><strong>Fee Type:</strong> {currentFeeType}</p>
                <p><strong>Amount:</strong> {formatCurrency(configToDelete.amount)}</p>
                <p><strong>Frequency:</strong> {configToDelete.frequency}</p>
                <p><strong>Classes:</strong> {(() => {
                  if (configToDelete.apply_to_classes === 'all' || !configToDelete.apply_to_classes) return 'All Classes';
                  const classObj = classes.find(c => c.id === configToDelete.apply_to_classes);
                  return classObj ? `${classObj.name} (${classObj.standard})` : configToDelete.apply_to_classes;
                })()}</p>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteFeeConfiguration(configToDelete?.id)}
            >
              Delete Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Reports Modal */}
      <Dialog open={showGenerateReportsModal} onOpenChange={setShowGenerateReportsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Generate Fee Reports
            </DialogTitle>
            <DialogDescription>
              Generate comprehensive fee reports with filters and export options
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Report Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-2 hover:border-blue-500 cursor-pointer transition-colors">
                <CardContent className="p-4 text-center">
                  <FileText className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                  <h3 className="font-medium">Fee Collection Report</h3>
                  <p className="text-sm text-gray-600">Daily/Monthly collection summary</p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-emerald-500 cursor-pointer transition-colors">
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                  <h3 className="font-medium">Student Fee Status</h3>
                  <p className="text-sm text-gray-600">Individual student fee status</p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-orange-500 cursor-pointer transition-colors">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                  <h3 className="font-medium">Overdue Report</h3>
                  <p className="text-sm text-gray-600">Pending and overdue fees</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Report Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="this-week">This Week</SelectItem>
                        <SelectItem value="this-month">This Month</SelectItem>
                        <SelectItem value="this-quarter">This Quarter</SelectItem>
                        <SelectItem value="this-year">This Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Class Filter</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        <SelectItem value="class1">Class 1</SelectItem>
                        <SelectItem value="class2">Class 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fee Type</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Fee Types</SelectItem>
                        <SelectItem value="tuition">Tuition Fee</SelectItem>
                        <SelectItem value="transport">Transport Fee</SelectItem>
                        <SelectItem value="admission">Admission Fee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status Filter</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-16 flex flex-col gap-2 bg-green-500 hover:bg-green-600" onClick={() => {
                    setShowGenerateReportsModal(false);
                    handleExportReport('excel', 'student_wise');
                  }}>
                    <FileText className="h-6 w-6" />
                    <span>Export to Excel</span>
                  </Button>
                  <Button className="h-16 flex flex-col gap-2 bg-red-500 hover:bg-red-600" onClick={() => {
                    setShowGenerateReportsModal(false);
                    handleExportReport('pdf', 'student_wise');
                  }}>
                    <FileText className="h-6 w-6" />
                    <span>Export to PDF</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateReportsModal(false)}>Cancel</Button>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => {
              setShowGenerateReportsModal(false);
              toast.success(`📊 Report Generated`, {
                description: 'Fee report has been generated successfully.',
                duration: 3000
              });
            }}>
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Payment Modal */}
      <Dialog open={showBulkPaymentModal} onOpenChange={setShowBulkPaymentModal}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              Bulk Payment Collection
            </DialogTitle>
            <DialogDescription>
              Collect fees from multiple students simultaneously
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Student Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Filter by Class</label>
                      <Select value={bulkPaymentFilters.class} onValueChange={(value) => setBulkPaymentFilters(prev => ({...prev, class: value}))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Fee Type</label>
                      <Select value={bulkPaymentFilters.feeType} onValueChange={(value) => setBulkPaymentFilters(prev => ({...prev, feeType: value}))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fee type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Tuition Fees">Tuition Fees</SelectItem>
                          <SelectItem value="Transport Fees">Transport Fees</SelectItem>
                          <SelectItem value="Admission Fees">Admission Fees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Payment Mode</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Student Selection List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Select Students ({selectedStudents.length} selected)</h4>
                      <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                        {selectedStudents.length === getEligibleStudentsForBulkPayment().length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      {getEligibleStudentsForBulkPayment().map((student) => {
                        const isSelected = selectedStudents.find(s => s.id === student.id);
                        return (
                          <div key={student.id} 
                               className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''}`}
                               onClick={() => toggleStudentSelection(student)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <input type="checkbox" checked={!!isSelected} onChange={() => {}} className="rounded" />
                                <div>
                                  <p className="font-medium text-sm">{student.name}</p>
                                  <p className="text-xs text-gray-500">{student.admission_no} • {getClassName(student.class_id)}</p>
                                </div>
                              </div>
                              <div className="text-right text-sm">
                                <p className="font-medium text-emerald-600">{getCurrencySymbol()}15,000</p>
                                <p className="text-xs text-gray-500">Pending</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Payment Summary */}
                  {selectedStudents.length > 0 && (
                    <Card className="bg-emerald-50 border-emerald-200">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-emerald-800 mb-2">Payment Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-emerald-600">Students</p>
                            <p className="font-bold text-emerald-800">{calculateBulkPaymentSummary().studentsCount}</p>
                          </div>
                          <div>
                            <p className="text-emerald-600">Total Amount</p>
                            <p className="font-bold text-emerald-800">{formatCurrency(calculateBulkPaymentSummary().totalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-emerald-600">Late Fees</p>
                            <p className="font-bold text-emerald-800">{formatCurrency(calculateBulkPaymentSummary().lateFees)}</p>
                          </div>
                          <div>
                            <p className="text-emerald-600">Grand Total</p>
                            <p className="font-bold text-emerald-800">{formatCurrency(calculateBulkPaymentSummary().grandTotal)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBulkPaymentModal(false)}>Cancel</Button>
            <Button 
              className="bg-emerald-500 hover:bg-emerald-600" 
              onClick={() => submitBulkPayment({
                fee_type: bulkPaymentFilters.feeType,
                payment_mode: 'Cash',
                remarks: 'Bulk payment collection'
              })}
              disabled={selectedStudents.length === 0 || loading}
            >
              {loading ? 'Processing...' : `Collect Payment (${formatCurrency(calculateBulkPaymentSummary().grandTotal)})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

          {/* Send Reminders Modal */}
          <Dialog open={showSendRemindersModal} onOpenChange={setShowSendRemindersModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Send Fee Reminders
                </DialogTitle>
                <DialogDescription>
                  Send automated reminders to students with pending or overdue fee payments
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Reminder Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Reminder Type</label>
                        <Select defaultValue="both">
                          <SelectTrigger>
                            <SelectValue placeholder="Select reminder type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email Only</SelectItem>
                            <SelectItem value="sms">SMS Only</SelectItem>
                            <SelectItem value="both">Email + SMS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Fee Status Filter</label>
                        <Select defaultValue="all">
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Pending</SelectItem>
                            <SelectItem value="pending">Pending Only</SelectItem>
                            <SelectItem value="overdue">Overdue Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h4 className="font-medium text-orange-800 mb-2">Reminder Preview</h4>
                      <div className="text-sm text-orange-700">
                        <p><strong>Subject:</strong> Fee Payment Reminder - School ERP</p>
                        <p><strong>Message:</strong> Dear Student/Parent, this is a reminder about pending fee payments. Please make the payment at your earliest convenience.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowSendRemindersModal(false)}>Cancel</Button>
                <Button 
                  className="bg-orange-500 hover:bg-orange-600" 
                  onClick={() => submitSendReminders({})}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reminders'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Detailed Payment Modal */}
          <Dialog open={showDetailedPaymentModal} onOpenChange={setShowDetailedPaymentModal}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-6 w-6 text-emerald-500" />
                  বিস্তারিত পেমেন্ট তথ্য
                </DialogTitle>
                <DialogDescription>
                  {detailedPaymentData?.student?.name} - {detailedPaymentData?.student?.class}
                </DialogDescription>
              </DialogHeader>

              {detailedPaymentData && (
                <div className="space-y-6">
                  {/* Student Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl font-bold">
                          {(detailedPaymentData.student?.name || 'ছ').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{detailedPaymentData.student?.name}</h3>
                        <p className="text-sm text-gray-600">রোল: {detailedPaymentData.student?.roll || '-'} | ভর্তি নং: {detailedPaymentData.student?.admission_no || '-'}</p>
                        <p className="text-sm text-gray-600">মারহালা: {detailedPaymentData.student?.class}</p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-blue-600 mb-1">মোট ফি</p>
                      <p className="text-2xl font-bold text-blue-700">৳{detailedPaymentData.summary?.totalFees?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-green-600 mb-1">পরিশোধিত</p>
                      <p className="text-2xl font-bold text-green-700">৳{detailedPaymentData.summary?.paidAmount?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-yellow-600 mb-1">বকেয়া</p>
                      <p className="text-2xl font-bold text-yellow-700">৳{detailedPaymentData.summary?.pendingAmount?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-red-600 mb-1">মোট বাকি</p>
                      <p className="text-2xl font-bold text-red-700">৳{detailedPaymentData.summary?.balance?.toLocaleString() || 0}</p>
                    </div>
                  </div>

                  {/* Fee Breakdown by Type */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-3 border-b">
                      <h4 className="font-semibold text-gray-800">ফি ধরন অনুযায়ী বিভাজন</h4>
                    </div>
                    <div className="divide-y">
                      {Object.entries(detailedPaymentData.feesByType || {}).map(([type, data]) => (
                        <div key={type} className="flex items-center justify-between p-4 hover:bg-gray-50">
                          <div>
                            <p className="font-medium text-gray-900">{type}</p>
                            <p className="text-sm text-gray-500">মোট: ৳{data.amount?.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-600 text-sm">পেইড: ৳{data.paid?.toLocaleString() || 0}</p>
                            {(data.pending > 0 || data.overdue > 0) && (
                              <p className="text-red-600 text-sm font-medium">বাকি: ৳{((data.pending || 0) + (data.overdue || 0)).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {Object.keys(detailedPaymentData.feesByType || {}).length === 0 && (
                        <div className="p-4 text-center text-gray-500">কোনো ফি রেকর্ড নেই</div>
                      )}
                    </div>
                  </div>

                  {/* Payment History */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-emerald-50 px-4 py-3 border-b flex items-center justify-between">
                      <h4 className="font-semibold text-emerald-800">পেমেন্ট ইতিহাস</h4>
                      <Badge className="bg-emerald-100 text-emerald-700">{detailedPaymentData.payments?.length || 0} টি পেমেন্ট</Badge>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y">
                      {detailedPaymentData.payments?.length > 0 ? (
                        detailedPaymentData.payments.map((payment, idx) => (
                          <div key={payment.id || idx} className="flex items-center justify-between p-4 hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{payment.fee_type || 'পেমেন্ট'}</p>
                                <p className="text-sm text-gray-500">
                                  {payment.date || 'তারিখ নেই'} {payment.month && `• ${payment.month}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">৳{payment.amount?.toLocaleString() || 0}</p>
                              <p className="text-xs text-gray-500">
                                {payment.receipt_no && `রসিদ: ${payment.receipt_no}`}
                                {payment.payment_method && ` • ${payment.payment_method}`}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-gray-500">
                          <AlertTriangle className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                          <p>কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDetailedPaymentModal(false)}
                >
                  বন্ধ করুন
                </Button>
                {detailedPaymentData?.summary?.balance > 0 && (
                  <Button 
                    className="bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => {
                      setShowDetailedPaymentModal(false);
                      const student = students.find(s => s.id === detailedPaymentData.student?.id);
                      if (student) {
                        setSelectedStudent(student);
                        setMadrasahWizardStep(2);
                      }
                    }}
                  >
                    বেতন আদায় করুন
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
  );
};

// Payment Form Component
const PaymentForm = ({ students, classes, onSubmit, onCancel, loading, feeConfigurations = {} }) => {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [amount, setAmount] = useState('');
  const [feeType, setFeeType] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Auto-fill amount when student and fee type are selected
  useEffect(() => {
    console.log('🔍 AUTO-FILL DEBUG:', {
      selectedStudent,
      feeType,
      hasStudents: students.length,
      hasFeeConfigurations: Object.keys(feeConfigurations).length
    });

    if (selectedStudent && feeType) {
      const student = students.find(s => s.id === selectedStudent);
      console.log('👤 Selected Student:', student);
      
      if (student && student.class_id) {
        // Find fee configuration matching student's class and selected fee type
        const configs = feeConfigurations[feeType] || [];
        console.log(`💰 Fee configs for ${feeType}:`, configs);
        console.log('🔍 Looking for class_id:', student.class_id);
        
        const matchingConfig = configs.find(config => {
          console.log('🔎 Checking config:', {
            config_class: config.apply_to_classes,
            student_class: student.class_id,
            match: config.apply_to_classes === student.class_id || config.apply_to_classes === 'all'
          });
          return config.apply_to_classes === student.class_id || config.apply_to_classes === 'all';
        });
        
        console.log('🎯 Matching config found:', matchingConfig);
        
        if (matchingConfig && matchingConfig.amount) {
          setAmount(matchingConfig.amount.toString());
          console.log(`✅ Auto-filled amount: ${matchingConfig.amount} for ${feeType} (${student.name})`);
        } else {
          console.warn('❌ No matching fee configuration found for this student/class');
        }
      } else {
        console.warn('⚠️ Student has no class_id:', student);
      }
    }
  }, [selectedStudent, feeType, students, feeConfigurations]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedStudent || !amount || !feeType || !paymentMode) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit({
      student_id: selectedStudent,
      amount: parseFloat(amount),
      fee_type: feeType,
      payment_mode: paymentMode,
      transaction_id: transactionId,
      remarks
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Student Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Student *</label>
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger>
            <SelectValue placeholder="Select a student" />
          </SelectTrigger>
          <SelectContent>
            {students.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.name} - {student.admission_no}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Fee Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Fee Type *</label>
        <Select value={feeType} onValueChange={setFeeType}>
          <SelectTrigger>
            <SelectValue placeholder="Select fee type" />
          </SelectTrigger>
          <SelectContent>
            {/* Dynamic fee types from saved configurations */}
            {Object.keys(feeConfigurations || {}).map(feeType => (
              feeConfigurations[feeType]?.length > 0 && (
                <SelectItem key={feeType} value={feeType}>
                  {feeType}
                </SelectItem>
              )
            ))}
            {/* Default fee types if no configurations exist */}
            <SelectItem value="Tuition Fees">Tuition Fees</SelectItem>
            <SelectItem value="Transport Fees">Transport Fees</SelectItem>
            <SelectItem value="Admission Fees">Admission Fees</SelectItem>
            <SelectItem value="Lab Fee">Lab Fee</SelectItem>
            <SelectItem value="Library Fee">Library Fee</SelectItem>
            <SelectItem value="Exam Fee">Exam Fee</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Amount *</label>
        <Input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
        />
      </div>

      {/* Payment Mode */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Mode *</label>
        <Select value={paymentMode} onValueChange={setPaymentMode}>
          <SelectTrigger>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Debit/Credit Card</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="netbanking">Net Banking</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
            <SelectItem value="dd">Demand Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction ID (for digital payments) */}
      {['card', 'upi', 'netbanking'].includes(paymentMode) && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Transaction ID</label>
          <Input
            placeholder="Enter transaction ID"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
          />
        </div>
      )}

      {/* Remarks */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Remarks</label>
        <Input
          placeholder="Optional remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      {/* Action Buttons */}
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
          {loading ? 'Processing...' : 'Collect Payment & Generate Receipt'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default Fees;
