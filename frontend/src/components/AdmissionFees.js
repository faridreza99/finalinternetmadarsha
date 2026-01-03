import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCurrency } from '../context/CurrencyContext';
import { useInstitution } from '../context/InstitutionContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
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
  Receipt,
  Users,
  Calendar,
  Search,
  Plus,
  Trash2,
  Printer,
  Download,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { toBengaliNumeral, toBanglaDate } from '../i18n';

const API = process.env.REACT_APP_API_URL || '/api';

const AdmissionFees = () => {
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useCurrency();
  const { isMadrasahSimpleUI } = useInstitution();
  const isBangla = i18n.language === 'bn' || isMadrasahSimpleUI;
  
  // Auto-switch to Bengali for Madrasah mode
  useEffect(() => {
    if (isMadrasahSimpleUI && i18n.language !== 'bn') {
      i18n.changeLanguage('bn');
    }
  }, [isMadrasahSimpleUI, i18n]);
  
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({
    total_collected: 0,
    today_collection: 0,
    total_admissions: 0,
    today_admissions: 0
  });
  
  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    class_name: '',
    amount: '',
    payment_mode: 'Cash',
    remarks: ''
  });
  
  const [lastReceipt, setLastReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
  const paymentModes = [
    { value: 'Cash', labelKey: 'admissionFees.cash' },
    { value: 'Bank', labelKey: 'admissionFees.bank' },
    { value: 'Mobile Banking', labelKey: 'admissionFees.mobileBanking' },
    { value: 'Cheque', labelKey: 'admissionFees.cheque' }
  ];

  useEffect(() => {
    fetchFees();
    fetchClasses();
    fetchStudents();
  }, [searchTerm, selectedClass]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedClass !== 'all') params.append('class_name', selectedClass);
      
      const response = await axios.get(`${API}/admission-fees?${params}`);
      setFees(response.data.fees || []);
      setSummary(response.data.summary || {});
    } catch (error) {
      console.error('Error fetching admission fees:', error);
      toast.error(t('admissionFees.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API}/classes`);
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/students`);
      setStudents(response.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.student_name || !formData.class_name || !formData.amount) {
      toast.error(t('admissionFees.fillRequired'));
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post(`${API}/admission-fees`, {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      
      toast.success(t('admissionFees.saveSuccess'));
      setLastReceipt(response.data);
      setShowAddModal(false);
      setShowReceiptModal(true);
      setFormData({
        student_id: '',
        student_name: '',
        class_name: '',
        amount: '',
        payment_mode: 'Cash',
        remarks: ''
      });
      fetchFees();
    } catch (error) {
      console.error('Error creating admission fee:', error);
      toast.error(t('admissionFees.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (feeId) => {
    if (!window.confirm(t('admissionFees.confirmDelete'))) {
      return;
    }
    
    try {
      await axios.delete(`${API}/admission-fees/${feeId}`);
      toast.success(t('admissionFees.deleteSuccess'));
      fetchFees();
    } catch (error) {
      console.error('Error deleting admission fee:', error);
      toast.error(t('admissionFees.deleteError'));
    }
  };

  const handleStudentSelect = (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      const className = classes.find(c => c.id === student.class_id)?.name || '';
      setFormData({
        ...formData,
        student_id: student.id,
        student_name: student.name,
        class_name: className
      });
    }
  };

  const formatAmount = (amount) => {
    if (isBangla) {
      return `৳${toBengaliNumeral(amount.toLocaleString())}`;
    }
    return formatCurrency(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    if (isBangla) {
      return toBanglaDate(dateString);
    }
    return new Date(dateString).toLocaleDateString();
  };

  const getPaymentModeLabel = (value) => {
    const mode = paymentModes.find(m => m.value === value);
    return mode ? t(mode.labelKey) : value;
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('admissionFees.title')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('admissionFees.subtitle')}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          {t('admissionFees.collectFee')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('admissionFees.totalCollected')}</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(summary.total_collected || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('admissionFees.todayCollection')}</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(summary.today_collection || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('admissionFees.totalAdmissions')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isBangla ? toBengaliNumeral(summary.total_admissions || 0) : summary.total_admissions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('admissionFees.todayAdmissions')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isBangla ? toBengaliNumeral(summary.today_admissions || 0) : summary.today_admissions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>{t('admissionFees.feeRecords')}</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('common.search') + '...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('admissionFees.allClasses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admissionFees.allClasses')}</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admissionFees.receiptNo')}</TableHead>
                <TableHead>{t('admissionFees.studentName')}</TableHead>
                <TableHead>{t('admissionFees.class')}</TableHead>
                <TableHead>{t('admissionFees.amount')}</TableHead>
                <TableHead>{t('admissionFees.paymentMode')}</TableHead>
                <TableHead>{t('admissionFees.date')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : fees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {t('admissionFees.noRecords')}
                  </TableCell>
                </TableRow>
              ) : (
                fees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell>
                      <Badge variant="outline">{fee.receipt_no}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{fee.student_name}</TableCell>
                    <TableCell>{fee.class_name}</TableCell>
                    <TableCell className="font-semibold text-emerald-600">
                      {formatAmount(fee.amount)}
                    </TableCell>
                    <TableCell>
                      {getPaymentModeLabel(fee.payment_mode)}
                    </TableCell>
                    <TableCell>{formatDate(fee.payment_date)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setLastReceipt(fee);
                            setShowReceiptModal(true);
                          }}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(fee.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admissionFees.collectFee')}</DialogTitle>
            <DialogDescription>
              {t('admissionFees.collectFeeDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t('admissionFees.selectStudentOptional')}</Label>
              <Select onValueChange={handleStudentSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admissionFees.selectStudent')} />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>{t('admissionFees.studentName')} *</Label>
              <Input
                value={formData.student_name}
                onChange={(e) => setFormData({...formData, student_name: e.target.value})}
                placeholder={t('admissionFees.enterStudentName')}
                required
              />
            </div>
            
            <div>
              <Label>{t('admissionFees.class')} *</Label>
              <Select 
                value={formData.class_name} 
                onValueChange={(value) => setFormData({...formData, class_name: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admissionFees.selectClass')} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>{t('admissionFees.amount')} *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder={t('admissionFees.enterAmount')}
                required
              />
            </div>
            
            <div>
              <Label>{t('admissionFees.paymentMode')}</Label>
              <Select 
                value={formData.payment_mode} 
                onValueChange={(value) => setFormData({...formData, payment_mode: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentModes.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>{t(mode.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>{t('admissionFees.remarks')}</Label>
              <Input
                value={formData.remarks}
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                placeholder={t('admissionFees.remarksOptional')}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                {loading ? t('admissionFees.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="sm:max-w-lg print:shadow-none">
          <DialogHeader>
            <DialogTitle>{t('admissionFees.receipt')}</DialogTitle>
          </DialogHeader>
          {lastReceipt && (
            <div className="space-y-4 p-4 border rounded-lg bg-white print:border-2">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold text-emerald-600">
                  {t('admissionFees.receipt')}
                </h2>
                <p className="text-gray-500">{t('admissionFees.receiptNo')}: {lastReceipt.receipt_no}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{t('admissionFees.studentName')}</p>
                  <p className="font-medium">{lastReceipt.student_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('admissionFees.class')}</p>
                  <p className="font-medium">{lastReceipt.class_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('admissionFees.amount')}</p>
                  <p className="font-bold text-emerald-600 text-lg">{formatAmount(lastReceipt.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('admissionFees.paymentMode')}</p>
                  <p className="font-medium">
                    {getPaymentModeLabel(lastReceipt.payment_mode)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('admissionFees.date')}</p>
                  <p className="font-medium">{formatDate(lastReceipt.payment_date)}</p>
                </div>
                {lastReceipt.remarks && (
                  <div>
                    <p className="text-sm text-gray-500">{t('admissionFees.remarks')}</p>
                    <p className="font-medium">{lastReceipt.remarks}</p>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4 mt-4">
                <p className="text-center text-sm text-gray-500">
                  {t('admissionFees.computerGenerated')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setShowReceiptModal(false)}>
              {t('common.close')}
            </Button>
            <Button onClick={printReceipt} className="bg-emerald-600 hover:bg-emerald-700">
              <Printer className="h-4 w-4 mr-2" />
              {t('common.print')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdmissionFees;
