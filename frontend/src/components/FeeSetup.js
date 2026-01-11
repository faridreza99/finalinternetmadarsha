import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useCurrency } from '../context/CurrencyContext';
import { useInstitution } from '../context/InstitutionContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
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
  Settings,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  GraduationCap,
  BookOpen,
  Calendar,
  Save,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from './ui/switch';

const API = process.env.REACT_APP_API_URL || '/api';

// Helper function to safely extract error messages from API responses
const getErrorMessage = (error, fallback = 'An error occurred. Please try again.') => {
  const detail = error?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(err => err?.msg || JSON.stringify(err)).join(', ') || fallback;
  }
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return fallback;
};

const FeeSetup = () => {
  const { formatCurrency } = useCurrency();
  const { isMadrasahSimpleUI, loading: institutionLoading } = useInstitution();
  
  const [feeConfigs, setFeeConfigs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [marhalas, setMarhalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  
  const [formData, setFormData] = useState({
    fee_type: 'Tuition Fees',
    amount: '',
    frequency: 'monthly',
    apply_to_classes: 'all',
    due_date: 10,
    late_fee: 0,
    discount: 0,
    is_active: true
  });

  const feeTypes = [
    { value: 'Tuition Fees', label: 'মাসিক বেতন', labelEn: 'Monthly Tuition' },
    { value: 'Admission Fees', label: 'ভর্তি ফি', labelEn: 'Admission Fee' },
    { value: 'Exam Fees', label: 'পরীক্ষা ফি', labelEn: 'Exam Fee' },
    { value: 'Library Fees', label: 'লাইব্রেরি ফি', labelEn: 'Library Fee' },
    { value: 'Transport Fees', label: 'পরিবহন ফি', labelEn: 'Transport Fee' },
    { value: 'Other', label: 'অন্যান্য', labelEn: 'Other' }
  ];

  const frequencies = [
    { value: 'monthly', label: 'মাসিক', labelEn: 'Monthly' },
    { value: 'yearly', label: 'বাৎসরিক', labelEn: 'Yearly' },
    { value: 'one-time', label: 'একবার', labelEn: 'One-time' },
    { value: 'semester', label: 'সেমিস্টার', labelEn: 'Per Semester' }
  ];

  const fetchFeeConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/fees/configurations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeConfigs(response.data || []);
    } catch (error) {
      console.error('Error fetching fee configs:', error);
      toast.error('ফি কনফিগারেশন লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }, []);

  const fetchMarhalas = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/marhalas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMarhalas(response.data || []);
    } catch (error) {
      console.error('Error fetching marhalas:', error);
    }
  }, []);

  useEffect(() => {
    fetchFeeConfigs();
    fetchClasses();
    fetchMarhalas();
  }, [fetchFeeConfigs, fetchClasses, fetchMarhalas]);

  const handleSubmit = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('সঠিক পরিমাণ দিন');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        due_date: parseInt(formData.due_date) || 10,
        late_fee: parseFloat(formData.late_fee) || 0,
        discount: parseFloat(formData.discount) || 0
      };

      if (editingConfig) {
        await axios.put(`${API}/fees/configurations/${editingConfig.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('ফি কনফিগারেশন আপডেট হয়েছে');
      } else {
        await axios.post(`${API}/fees/configurations`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('নতুন ফি কনফিগারেশন যোগ হয়েছে');
      }

      setShowAddModal(false);
      setEditingConfig(null);
      resetForm();
      fetchFeeConfigs();
    } catch (error) {
      console.error('Error saving fee config:', error);
      toast.error(getErrorMessage(error, 'ফি সংরক্ষণ করতে ব্যর্থ'));
    }
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData({
      fee_type: config.fee_type || 'Tuition Fees',
      amount: config.amount?.toString() || '',
      frequency: config.frequency || 'monthly',
      apply_to_classes: config.apply_to_classes || 'all',
      due_date: config.due_date || 10,
      late_fee: config.late_fee || 0,
      discount: config.discount || 0,
      is_active: config.is_active !== false
    });
    setShowAddModal(true);
  };

  const handleDelete = async (configId) => {
    if (!window.confirm('এই ফি কনফিগারেশন মুছে ফেলতে চান?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/fees/configurations/${configId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('ফি কনফিগারেশন মুছে ফেলা হয়েছে');
      fetchFeeConfigs();
    } catch (error) {
      console.error('Error deleting fee config:', error);
      toast.error('ফি মুছতে ব্যর্থ');
    }
  };

  const handleToggleActive = async (config) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/fees/configurations/${config.id}`, {
        is_active: !config.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(config.is_active ? 'ফি নিষ্ক্রিয় করা হয়েছে' : 'ফি সক্রিয় করা হয়েছে');
      fetchFeeConfigs();
    } catch (error) {
      console.error('Error toggling fee config:', error);
      toast.error('স্ট্যাটাস পরিবর্তন করতে ব্যর্থ');
    }
  };

  const resetForm = () => {
    setFormData({
      fee_type: 'Tuition Fees',
      amount: '',
      frequency: 'monthly',
      apply_to_classes: 'all',
      due_date: 10,
      late_fee: 0,
      discount: 0,
      is_active: true
    });
  };

  const getFeeTypeLabel = (type) => {
    const found = feeTypes.find(f => f.value === type);
    return isMadrasahSimpleUI ? (found?.label || type) : (found?.labelEn || type);
  };

  const getFrequencyLabel = (freq) => {
    const found = frequencies.find(f => f.value === freq);
    return isMadrasahSimpleUI ? (found?.label || freq) : (found?.labelEn || freq);
  };

  const getClassLabel = (classValue) => {
    if (classValue === 'all') return isMadrasahSimpleUI ? 'সকল মারহালা' : 'All Classes';
    if (isMadrasahSimpleUI) {
      const marhala = marhalas.find(m => m.id === classValue);
      if (marhala) return marhala.name_bn || marhala.name;
    }
    const found = classes.find(c => c.id === classValue || c._id === classValue || c.name === classValue || c.class_name === classValue);
    return found?.display_name || found?.name || classValue;
  };

  const groupedConfigs = feeConfigs.reduce((acc, config) => {
    const classKey = config.apply_to_classes || 'all';
    if (!acc[classKey]) acc[classKey] = [];
    acc[classKey].push(config);
    return acc;
  }, {});

  if (institutionLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <span className="ml-3 text-gray-600">লোড হচ্ছে...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Card className="border-2 border-emerald-200">
        <CardHeader className="bg-emerald-50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-emerald-700 text-xl">
                <Settings className="h-6 w-6" />
                {isMadrasahSimpleUI ? 'ফি সেটআপ' : 'Fee Setup'}
              </CardTitle>
              <p className="text-sm text-emerald-600 mt-1">
                {isMadrasahSimpleUI ? 'মারহালা অনুযায়ী ফি কনফিগার করুন - এটি ফি আদায়ের একমাত্র উৎস' : 'Configure fees by class - This is the single source of truth for fee collection'}
              </p>
            </div>
            <Button 
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => {
                resetForm();
                setEditingConfig(null);
                setShowAddModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isMadrasahSimpleUI ? 'নতুন ফি যোগ করুন' : 'Add New Fee'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {feeConfigs.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                {isMadrasahSimpleUI ? 'কোনো ফি কনফিগার করা হয়নি' : 'No Fee Configurations'}
              </h3>
              <p className="text-gray-500 mb-4">
                {isMadrasahSimpleUI ? 'প্রথমে মারহালা অনুযায়ী ফি সেট করুন' : 'Please set up fees by class first'}
              </p>
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isMadrasahSimpleUI ? 'প্রথম ফি যোগ করুন' : 'Add First Fee'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedConfigs).map(([classKey, configs]) => (
                <Card key={classKey} className="border border-gray-200">
                  <CardHeader className="bg-gray-50 py-3">
                    <CardTitle className="flex items-center gap-2 text-gray-700 text-base">
                      <GraduationCap className="h-5 w-5" />
                      {getClassLabel(classKey)}
                      <Badge className="ml-2 bg-blue-100 text-blue-700">
                        {configs.length} {isMadrasahSimpleUI ? 'টি ফি' : 'fees'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>{isMadrasahSimpleUI ? 'ফি ধরন' : 'Fee Type'}</TableHead>
                          <TableHead className="text-right">{isMadrasahSimpleUI ? 'পরিমাণ' : 'Amount'}</TableHead>
                          <TableHead>{isMadrasahSimpleUI ? 'পুনরাবৃত্তি' : 'Frequency'}</TableHead>
                          <TableHead>{isMadrasahSimpleUI ? 'দেয় তারিখ' : 'Due Date'}</TableHead>
                          <TableHead className="text-center">{isMadrasahSimpleUI ? 'অবস্থা' : 'Status'}</TableHead>
                          <TableHead className="text-right">{isMadrasahSimpleUI ? 'অ্যাকশন' : 'Actions'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {configs.map((config) => (
                          <TableRow key={config.id} className={!config.is_active ? 'opacity-50' : ''}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                                {getFeeTypeLabel(config.fee_type)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">
                              ৳{config.amount?.toLocaleString() || 0}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50">
                                {getFrequencyLabel(config.frequency)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                {config.due_date || 10} {isMadrasahSimpleUI ? 'তারিখ' : 'th'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch 
                                checked={config.is_active !== false}
                                onCheckedChange={() => handleToggleActive(config)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="text-blue-600 hover:bg-blue-50"
                                  onClick={() => handleEdit(config)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => handleDelete(config.id)}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-emerald-500" />
              {editingConfig 
                ? (isMadrasahSimpleUI ? 'ফি সম্পাদনা করুন' : 'Edit Fee Configuration')
                : (isMadrasahSimpleUI ? 'নতুন ফি যোগ করুন' : 'Add New Fee Configuration')
              }
            </DialogTitle>
            <DialogDescription>
              {isMadrasahSimpleUI ? 'এই ফি সকল সংশ্লিষ্ট ছাত্রদের জন্য প্রযোজ্য হবে' : 'This fee will apply to all applicable students'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {isMadrasahSimpleUI ? 'ফি ধরন *' : 'Fee Type *'}
              </label>
              <Select 
                value={formData.fee_type} 
                onValueChange={(value) => setFormData({...formData, fee_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {feeTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {isMadrasahSimpleUI ? type.label : type.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {isMadrasahSimpleUI ? 'মারহালা *' : 'Apply to Class *'}
              </label>
              <Select 
                value={formData.apply_to_classes} 
                onValueChange={(value) => setFormData({...formData, apply_to_classes: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isMadrasahSimpleUI ? 'সকল মারহালা' : 'All Classes'}</SelectItem>
                  {isMadrasahSimpleUI ? (
                    marhalas.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name_bn || m.name}
                      </SelectItem>
                    ))
                  ) : (
                    classes.map((cls) => (
                      <SelectItem key={cls.id || cls._id} value={cls.id || cls._id}>
                        {cls.display_name || cls.name || cls.class_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {isMadrasahSimpleUI ? 'পরিমাণ (টাকা) *' : 'Amount *'}
              </label>
              <Input
                type="number"
                placeholder={isMadrasahSimpleUI ? 'যেমন: ৫০০' : 'e.g., 500'}
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="text-lg font-bold"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {isMadrasahSimpleUI ? 'পুনরাবৃত্তি' : 'Frequency'}
              </label>
              <Select 
                value={formData.frequency} 
                onValueChange={(value) => setFormData({...formData, frequency: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {isMadrasahSimpleUI ? freq.label : freq.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {isMadrasahSimpleUI ? 'দেয় তারিখ' : 'Due Date'}
                </label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {isMadrasahSimpleUI ? 'বিলম্ব ফি' : 'Late Fee'}
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.late_fee}
                  onChange={(e) => setFormData({...formData, late_fee: e.target.value})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              {isMadrasahSimpleUI ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button 
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={handleSubmit}
            >
              <Save className="h-4 w-4 mr-2" />
              {editingConfig 
                ? (isMadrasahSimpleUI ? 'আপডেট করুন' : 'Update')
                : (isMadrasahSimpleUI ? 'সংরক্ষণ করুন' : 'Save')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeSetup;
