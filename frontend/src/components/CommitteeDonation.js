import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCurrency } from '../context/CurrencyContext';
import { useInstitution } from '../context/InstitutionContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
  Edit,
  Heart,
  TrendingUp,
  Phone,
  MapPin,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { toBengaliNumeral, toBanglaDate } from '../i18n';

const API = process.env.REACT_APP_API_URL || '/api';

const CommitteeDonation = () => {
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
  
  const [activeTab, setActiveTab] = useState('donors');
  const [donors, setDonors] = useState([]);
  const [payments, setPayments] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommittee, setSelectedCommittee] = useState('all');
  const [selectedDonationType, setSelectedDonationType] = useState('all');
  
  const [showAddDonorModal, setShowAddDonorModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [editingDonor, setEditingDonor] = useState(null);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [lastReceipt, setLastReceipt] = useState(null);
  
  const [donorSummary, setDonorSummary] = useState({
    total_donors: 0,
    active_donors: 0,
    monthly_expected: 0,
    yearly_expected: 0
  });
  
  const [paymentSummary, setPaymentSummary] = useState({
    total_collected: 0,
    today_collection: 0,
    month_collection: 0,
    total_payments: 0
  });
  
  const [donorForm, setDonorForm] = useState({
    name: '',
    address: '',
    mobile: '',
    donation_type: 'monthly',
    fixed_amount: '',
    committee_name: '',
    notes: ''
  });
  
  const [paymentForm, setPaymentForm] = useState({
    donor_id: '',
    amount: '',
    payment_mode: 'Cash',
    payment_for_month: '',
    payment_for_year: '',
    remarks: ''
  });
  
  const paymentModes = [
    { value: 'Cash', label: isBangla ? 'নগদ' : 'Cash' },
    { value: 'Bank', label: isBangla ? 'ব্যাংক' : 'Bank' },
    { value: 'Mobile Banking', label: isBangla ? 'মোবাইল ব্যাংকিং' : 'Mobile Banking' },
    { value: 'Cheque', label: isBangla ? 'চেক' : 'Cheque' }
  ];
  
  const donationTypes = [
    { value: 'monthly', label: isBangla ? 'মাসিক' : 'Monthly' },
    { value: 'yearly', label: isBangla ? 'বার্ষিক' : 'Yearly' }
  ];
  
  const banglaMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  useEffect(() => {
    fetchDonors();
    fetchPayments();
    fetchCommittees();
  }, [searchTerm, selectedCommittee, selectedDonationType]);

  const fetchDonors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCommittee !== 'all') params.append('committee_name', selectedCommittee);
      if (selectedDonationType !== 'all') params.append('donation_type', selectedDonationType);
      
      const response = await axios.get(`${API}/donors?${params}`);
      setDonors(response.data.donors || []);
      setDonorSummary(response.data.summary || {});
      if (response.data.committees) {
        setCommittees(response.data.committees);
      }
    } catch (error) {
      console.error('Error fetching donors:', error);
      toast.error(isBangla ? 'দাতা তথ্য লোড করতে ব্যর্থ' : 'Failed to load donors');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCommittee !== 'all') params.append('committee_name', selectedCommittee);
      
      const response = await axios.get(`${API}/donation-payments?${params}`);
      setPayments(response.data.payments || []);
      setPaymentSummary(response.data.summary || {});
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchCommittees = async () => {
    try {
      const response = await axios.get(`${API}/committees`);
      setCommittees(response.data.committees || []);
    } catch (error) {
      console.error('Error fetching committees:', error);
    }
  };

  const handleDonorSubmit = async (e) => {
    e.preventDefault();
    
    if (!donorForm.name || !donorForm.mobile || !donorForm.fixed_amount) {
      toast.error(isBangla ? 'সকল প্রয়োজনীয় তথ্য পূরণ করুন' : 'Please fill all required fields');
      return;
    }
    
    try {
      setLoading(true);
      const data = {
        ...donorForm,
        fixed_amount: parseFloat(donorForm.fixed_amount)
      };
      
      if (editingDonor) {
        await axios.put(`${API}/donors/${editingDonor.id}`, data);
        toast.success(isBangla ? 'দাতা তথ্য আপডেট হয়েছে' : 'Donor updated successfully');
      } else {
        await axios.post(`${API}/donors`, data);
        toast.success(isBangla ? 'দাতা সফলভাবে সংরক্ষিত হয়েছে' : 'Donor added successfully');
      }
      
      setShowAddDonorModal(false);
      resetDonorForm();
      fetchDonors();
      fetchCommittees();
    } catch (error) {
      console.error('Error saving donor:', error);
      toast.error(isBangla ? 'দাতা সংরক্ষণ করতে ব্যর্থ' : 'Failed to save donor');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentForm.donor_id || !paymentForm.amount) {
      toast.error(isBangla ? 'সকল প্রয়োজনীয় তথ্য পূরণ করুন' : 'Please fill all required fields');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post(`${API}/donation-payments`, {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount)
      });
      
      toast.success(isBangla ? 'দান সফলভাবে সংরক্ষিত হয়েছে' : 'Donation recorded successfully');
      setLastReceipt(response.data);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      resetPaymentForm();
      fetchDonors();
      fetchPayments();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(isBangla ? 'দান সংরক্ষণ করতে ব্যর্থ' : 'Failed to record donation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDonor = async (donorId) => {
    if (!window.confirm(isBangla ? 'আপনি কি নিশ্চিত এই দাতা মুছে ফেলতে চান?' : 'Are you sure you want to delete this donor?')) {
      return;
    }
    
    try {
      await axios.delete(`${API}/donors/${donorId}`);
      toast.success(isBangla ? 'দাতা মুছে ফেলা হয়েছে' : 'Donor deleted');
      fetchDonors();
    } catch (error) {
      console.error('Error deleting donor:', error);
      toast.error(isBangla ? 'দাতা মুছে ফেলতে ব্যর্থ' : 'Failed to delete donor');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm(isBangla ? 'আপনি কি নিশ্চিত এই পেমেন্ট মুছে ফেলতে চান?' : 'Are you sure you want to delete this payment?')) {
      return;
    }
    
    try {
      await axios.delete(`${API}/donation-payments/${paymentId}`);
      toast.success(isBangla ? 'পেমেন্ট মুছে ফেলা হয়েছে' : 'Payment deleted');
      fetchDonors();
      fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error(isBangla ? 'পেমেন্ট মুছে ফেলতে ব্যর্থ' : 'Failed to delete payment');
    }
  };

  const resetDonorForm = () => {
    setDonorForm({
      name: '',
      address: '',
      mobile: '',
      donation_type: 'monthly',
      fixed_amount: '',
      committee_name: '',
      notes: ''
    });
    setEditingDonor(null);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      donor_id: '',
      amount: '',
      payment_mode: 'Cash',
      payment_for_month: '',
      payment_for_year: '',
      remarks: ''
    });
    setSelectedDonor(null);
  };

  const openEditDonor = (donor) => {
    setEditingDonor(donor);
    setDonorForm({
      name: donor.name,
      address: donor.address || '',
      mobile: donor.mobile,
      donation_type: donor.donation_type,
      fixed_amount: donor.fixed_amount.toString(),
      committee_name: donor.committee_name || '',
      notes: donor.notes || ''
    });
    setShowAddDonorModal(true);
  };

  const openPaymentForDonor = (donor) => {
    setSelectedDonor(donor);
    setPaymentForm({
      ...paymentForm,
      donor_id: donor.id,
      amount: donor.fixed_amount.toString()
    });
    setShowPaymentModal(true);
  };

  const formatAmount = (amount) => {
    if (isBangla) {
      return `৳${toBengaliNumeral(amount?.toLocaleString() || '0')}`;
    }
    return formatCurrency(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    if (isBangla) {
      return toBanglaDate(dateString);
    }
    return new Date(dateString).toLocaleDateString();
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isBangla ? 'কমিটি / দান ব্যবস্থাপনা' : 'Committee / Donation Management'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isBangla ? 'দাতা ও দান পরিচালনা করুন' : 'Manage donors and donations'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{isBangla ? 'মোট আদায়' : 'Total Collected'}</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(paymentSummary.total_collected)}</p>
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
                <p className="text-sm text-gray-500">{isBangla ? 'এই মাসে আদায়' : 'This Month'}</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(paymentSummary.month_collection)}</p>
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
                <p className="text-sm text-gray-500">{isBangla ? 'সক্রিয় দাতা' : 'Active Donors'}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isBangla ? toBengaliNumeral(donorSummary.active_donors) : donorSummary.active_donors}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <Heart className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{isBangla ? 'মাসিক প্রত্যাশিত' : 'Monthly Expected'}</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(donorSummary.monthly_expected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="donors">{isBangla ? 'দাতা তালিকা' : 'Donors'}</TabsTrigger>
          <TabsTrigger value="payments">{isBangla ? 'পেমেন্ট' : 'Payments'}</TabsTrigger>
          <TabsTrigger value="committees">{isBangla ? 'কমিটি' : 'Committees'}</TabsTrigger>
        </TabsList>

        <TabsContent value="donors">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>{isBangla ? 'দাতা তালিকা' : 'Donor List'}</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={isBangla ? 'অনুসন্ধান...' : 'Search...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-48"
                    />
                  </div>
                  <Select value={selectedCommittee} onValueChange={setSelectedCommittee}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={isBangla ? 'সকল কমিটি' : 'All Committees'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isBangla ? 'সকল কমিটি' : 'All Committees'}</SelectItem>
                      {committees.map((c, idx) => (
                        <SelectItem key={idx} value={typeof c === 'string' ? c : c.name}>
                          {typeof c === 'string' ? c : c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setShowAddDonorModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4 mr-2" />
                    {isBangla ? 'দাতা যোগ করুন' : 'Add Donor'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isBangla ? 'নাম' : 'Name'}</TableHead>
                    <TableHead>{isBangla ? 'মোবাইল' : 'Mobile'}</TableHead>
                    <TableHead>{isBangla ? 'কমিটি' : 'Committee'}</TableHead>
                    <TableHead>{isBangla ? 'দানের ধরন' : 'Type'}</TableHead>
                    <TableHead>{isBangla ? 'নির্ধারিত টাকা' : 'Fixed Amount'}</TableHead>
                    <TableHead>{isBangla ? 'মোট দান' : 'Total Donated'}</TableHead>
                    <TableHead>{isBangla ? 'কার্যক্রম' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {isBangla ? 'লোড হচ্ছে...' : 'Loading...'}
                      </TableCell>
                    </TableRow>
                  ) : donors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {isBangla ? 'কোন দাতা পাওয়া যায়নি' : 'No donors found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    donors.map((donor) => (
                      <TableRow key={donor.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-full">
                              <User className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium">{donor.name}</p>
                              {donor.address && (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {donor.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4 text-gray-400" />
                            {donor.mobile}
                          </span>
                        </TableCell>
                        <TableCell>
                          {donor.committee_name ? (
                            <Badge variant="outline">{donor.committee_name}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={donor.donation_type === 'monthly' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                            {donationTypes.find(d => d.value === donor.donation_type)?.label || donor.donation_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{formatAmount(donor.fixed_amount)}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">{formatAmount(donor.total_donated)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPaymentForDonor(donor)}
                              className="text-emerald-600"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDonor(donor)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDeleteDonor(donor.id)}
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
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>{isBangla ? 'দান পেমেন্ট' : 'Donation Payments'}</CardTitle>
                <Button onClick={() => setShowPaymentModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  {isBangla ? 'পেমেন্ট যোগ করুন' : 'Add Payment'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isBangla ? 'রসিদ নং' : 'Receipt No'}</TableHead>
                    <TableHead>{isBangla ? 'দাতার নাম' : 'Donor Name'}</TableHead>
                    <TableHead>{isBangla ? 'কমিটি' : 'Committee'}</TableHead>
                    <TableHead>{isBangla ? 'টাকা' : 'Amount'}</TableHead>
                    <TableHead>{isBangla ? 'পেমেন্ট মোড' : 'Mode'}</TableHead>
                    <TableHead>{isBangla ? 'সময়কাল' : 'Period'}</TableHead>
                    <TableHead>{isBangla ? 'তারিখ' : 'Date'}</TableHead>
                    <TableHead>{isBangla ? 'কার্যক্রম' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        {isBangla ? 'কোন পেমেন্ট পাওয়া যায়নি' : 'No payments found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Badge variant="outline">{payment.receipt_no}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{payment.donor_name}</TableCell>
                        <TableCell>{payment.committee_name || '-'}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">{formatAmount(payment.amount)}</TableCell>
                        <TableCell>
                          {paymentModes.find(m => m.value === payment.payment_mode)?.label || payment.payment_mode}
                        </TableCell>
                        <TableCell>
                          {payment.payment_for_month || payment.payment_for_year || '-'}
                        </TableCell>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setLastReceipt(payment);
                                setShowReceiptModal(true);
                              }}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDeletePayment(payment.id)}
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
        </TabsContent>

        <TabsContent value="committees">
          <Card>
            <CardHeader>
              <CardTitle>{isBangla ? 'কমিটি তালিকা' : 'Committee List'}</CardTitle>
            </CardHeader>
            <CardContent>
              {committees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{isBangla ? 'কোন কমিটি পাওয়া যায়নি' : 'No committees found'}</p>
                  <p className="text-sm">{isBangla ? 'দাতা যোগ করার সময় কমিটির নাম দিন' : 'Add committee name when adding donors'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {committees.map((committee, idx) => (
                    <Card key={idx} className="border-2">
                      <CardContent className="pt-6">
                        <h3 className="font-bold text-lg mb-4">
                          {typeof committee === 'string' ? committee : committee.name}
                        </h3>
                        {typeof committee !== 'string' && (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">{isBangla ? 'মোট সদস্য' : 'Total Members'}</span>
                              <span className="font-medium">
                                {isBangla ? toBengaliNumeral(committee.total_members) : committee.total_members}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">{isBangla ? 'সক্রিয় সদস্য' : 'Active Members'}</span>
                              <span className="font-medium text-emerald-600">
                                {isBangla ? toBengaliNumeral(committee.active_members) : committee.active_members}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">{isBangla ? 'মাসিক প্রত্যাশিত' : 'Monthly Expected'}</span>
                              <span className="font-bold text-emerald-600">{formatAmount(committee.monthly_expected)}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddDonorModal} onOpenChange={(open) => { setShowAddDonorModal(open); if (!open) resetDonorForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDonor 
                ? (isBangla ? 'দাতা সম্পাদনা' : 'Edit Donor') 
                : (isBangla ? 'নতুন দাতা যোগ করুন' : 'Add New Donor')}
            </DialogTitle>
            <DialogDescription>
              {isBangla ? 'দাতা/কমিটি সদস্যের তথ্য পূরণ করুন' : 'Fill in donor/committee member details'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDonorSubmit} className="space-y-4">
            <div>
              <Label>{isBangla ? 'নাম *' : 'Name *'}</Label>
              <Input
                value={donorForm.name}
                onChange={(e) => setDonorForm({...donorForm, name: e.target.value})}
                placeholder={isBangla ? 'দাতার নাম' : 'Donor name'}
                required
              />
            </div>
            
            <div>
              <Label>{isBangla ? 'মোবাইল নম্বর *' : 'Mobile Number *'}</Label>
              <Input
                value={donorForm.mobile}
                onChange={(e) => setDonorForm({...donorForm, mobile: e.target.value})}
                placeholder={isBangla ? 'মোবাইল নম্বর' : 'Mobile number'}
                required
              />
            </div>
            
            <div>
              <Label>{isBangla ? 'ঠিকানা' : 'Address'}</Label>
              <Input
                value={donorForm.address}
                onChange={(e) => setDonorForm({...donorForm, address: e.target.value})}
                placeholder={isBangla ? 'ঠিকানা' : 'Address'}
              />
            </div>
            
            <div>
              <Label>{isBangla ? 'কমিটির নাম' : 'Committee Name'}</Label>
              <Input
                value={donorForm.committee_name}
                onChange={(e) => setDonorForm({...donorForm, committee_name: e.target.value})}
                placeholder={isBangla ? 'যেমন: ৩১৩ বদরী সাদৃশ্য কমিটি' : 'e.g., 313 Badri Committee'}
              />
            </div>
            
            <div>
              <Label>{isBangla ? 'দানের ধরন *' : 'Donation Type *'}</Label>
              <Select 
                value={donorForm.donation_type} 
                onValueChange={(value) => setDonorForm({...donorForm, donation_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {donationTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>{isBangla ? 'নির্ধারিত টাকা *' : 'Fixed Amount *'}</Label>
              <Input
                type="number"
                value={donorForm.fixed_amount}
                onChange={(e) => setDonorForm({...donorForm, fixed_amount: e.target.value})}
                placeholder={isBangla ? 'টাকার পরিমাণ' : 'Amount'}
                required
              />
            </div>
            
            <div>
              <Label>{isBangla ? 'নোট' : 'Notes'}</Label>
              <Input
                value={donorForm.notes}
                onChange={(e) => setDonorForm({...donorForm, notes: e.target.value})}
                placeholder={isBangla ? 'অতিরিক্ত তথ্য' : 'Additional notes'}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowAddDonorModal(false); resetDonorForm(); }}>
                {isBangla ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                {loading ? (isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBangla ? 'সংরক্ষণ করুন' : 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentModal} onOpenChange={(open) => { setShowPaymentModal(open); if (!open) resetPaymentForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isBangla ? 'দান পেমেন্ট' : 'Record Donation Payment'}</DialogTitle>
            <DialogDescription>
              {selectedDonor 
                ? `${isBangla ? 'দাতা' : 'Donor'}: ${selectedDonor.name}`
                : (isBangla ? 'দান পেমেন্ট রেকর্ড করুন' : 'Record a donation payment')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            {!selectedDonor && (
              <div>
                <Label>{isBangla ? 'দাতা নির্বাচন করুন *' : 'Select Donor *'}</Label>
                <Select 
                  value={paymentForm.donor_id} 
                  onValueChange={(value) => {
                    const donor = donors.find(d => d.id === value);
                    setPaymentForm({
                      ...paymentForm, 
                      donor_id: value,
                      amount: donor?.fixed_amount?.toString() || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isBangla ? 'দাতা নির্বাচন করুন' : 'Select donor'} />
                  </SelectTrigger>
                  <SelectContent>
                    {donors.map(donor => (
                      <SelectItem key={donor.id} value={donor.id}>
                        {donor.name} - {donor.mobile}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label>{isBangla ? 'টাকার পরিমাণ *' : 'Amount *'}</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                placeholder={isBangla ? 'টাকার পরিমাণ' : 'Amount'}
                required
              />
            </div>
            
            <div>
              <Label>{isBangla ? 'পেমেন্ট মোড' : 'Payment Mode'}</Label>
              <Select 
                value={paymentForm.payment_mode} 
                onValueChange={(value) => setPaymentForm({...paymentForm, payment_mode: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentModes.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>{isBangla ? 'মাসের জন্য' : 'For Month'}</Label>
              <Select 
                value={paymentForm.payment_for_month} 
                onValueChange={(value) => setPaymentForm({...paymentForm, payment_for_month: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isBangla ? 'মাস নির্বাচন করুন' : 'Select month'} />
                </SelectTrigger>
                <SelectContent>
                  {banglaMonths.map((month, idx) => (
                    <SelectItem key={idx} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>{isBangla ? 'বছরের জন্য' : 'For Year'}</Label>
              <Input
                value={paymentForm.payment_for_year}
                onChange={(e) => setPaymentForm({...paymentForm, payment_for_year: e.target.value})}
                placeholder={isBangla ? 'যেমন: ২০২৬' : 'e.g., 2026'}
              />
            </div>
            
            <div>
              <Label>{isBangla ? 'মন্তব্য' : 'Remarks'}</Label>
              <Input
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({...paymentForm, remarks: e.target.value})}
                placeholder={isBangla ? 'মন্তব্য (ঐচ্ছিক)' : 'Remarks (optional)'}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowPaymentModal(false); resetPaymentForm(); }}>
                {isBangla ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                {loading ? (isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBangla ? 'সংরক্ষণ করুন' : 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="sm:max-w-lg print:shadow-none">
          <DialogHeader>
            <DialogTitle>{isBangla ? 'দান রসিদ' : 'Donation Receipt'}</DialogTitle>
          </DialogHeader>
          {lastReceipt && (
            <div className="space-y-4 p-4 border rounded-lg bg-white print:border-2">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold text-emerald-600">
                  {isBangla ? 'দান রসিদ' : 'DONATION RECEIPT'}
                </h2>
                <p className="text-gray-500">{isBangla ? 'রসিদ নং' : 'Receipt No'}: {lastReceipt.receipt_no}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{isBangla ? 'দাতার নাম' : 'Donor Name'}</p>
                  <p className="font-medium">{lastReceipt.donor_name}</p>
                </div>
                {lastReceipt.committee_name && (
                  <div>
                    <p className="text-sm text-gray-500">{isBangla ? 'কমিটি' : 'Committee'}</p>
                    <p className="font-medium">{lastReceipt.committee_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">{isBangla ? 'টাকার পরিমাণ' : 'Amount'}</p>
                  <p className="font-bold text-emerald-600 text-lg">{formatAmount(lastReceipt.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{isBangla ? 'পেমেন্ট মোড' : 'Payment Mode'}</p>
                  <p className="font-medium">
                    {paymentModes.find(m => m.value === lastReceipt.payment_mode)?.label || lastReceipt.payment_mode}
                  </p>
                </div>
                {(lastReceipt.payment_for_month || lastReceipt.payment_for_year) && (
                  <div>
                    <p className="text-sm text-gray-500">{isBangla ? 'সময়কাল' : 'Period'}</p>
                    <p className="font-medium">
                      {lastReceipt.payment_for_month} {lastReceipt.payment_for_year}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">{isBangla ? 'তারিখ' : 'Date'}</p>
                  <p className="font-medium">{formatDate(lastReceipt.payment_date)}</p>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <p className="text-center text-sm text-gray-500">
                  {isBangla ? 'এটি কম্পিউটার জেনারেটেড রসিদ' : 'This is a computer generated receipt'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setShowReceiptModal(false)}>
              {isBangla ? 'বন্ধ করুন' : 'Close'}
            </Button>
            <Button onClick={printReceipt} className="bg-emerald-600 hover:bg-emerald-700">
              <Printer className="h-4 w-4 mr-2" />
              {isBangla ? 'প্রিন্ট করুন' : 'Print'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommitteeDonation;
