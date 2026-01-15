import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Calendar,
  Receipt,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_API_URL || '/api';

const toBengaliNumeral = (num) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bengaliDigits[parseInt(d)]);
};

const formatBengaliCurrency = (amount) => {
  const formatted = new Intl.NumberFormat('en-IN').format(amount || 0);
  return `৳${toBengaliNumeral(formatted)}`;
};

const formatBengaliDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return toBengaliNumeral(dateString);
  }
};

const StudentFees = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [feeData, setFeeData] = useState(null);

  const fetchFees = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/student/fees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeData(response.data);
    } catch (error) {
      console.error('Failed to fetch fees:', error);
      toast.error('ফি তথ্য লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!feeData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-gray-500 dark:text-gray-400">
            ফি তথ্য লোড করতে ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন।
          </CardContent>
        </Card>
      </div>
    );
  }

  const { ledger, payments, fee_structure, student_name, admission_no } = feeData;
  const hasDues = ledger.balance > 0;

  const frequencyMap = {
    'monthly': 'মাসিক',
    'yearly': 'বার্ষিক',
    'one-time': 'একবারে',
    'annual': 'বার্ষিক',
    'quarterly': 'ত্রৈমাসিক'
  };

  const statusMap = {
    'paid': 'পরিশোধিত',
    'completed': 'পরিশোধিত',
    'pending': 'বাকি',
    'partial': 'আংশিক'
  };

  const paymentModeMap = {
    'cash': 'নগদ',
    'bkash': 'বিকাশ',
    'nagad': 'নগদ',
    'bank': 'ব্যাংক',
    'online': 'অনলাইন'
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ফি বিবরণী</h1>
          <p className="text-gray-600 dark:text-gray-400">{student_name} ({admission_no})</p>
        </div>
        <Badge variant={hasDues ? "destructive" : "default"} className="text-lg px-4 py-2">
          {hasDues ? 'বাকি আছে' : 'সব পরিশোধিত'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">মোট ফি</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  {formatBengaliCurrency(ledger.total_fees || 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">পরিশোধিত</p>
                <p className="text-2xl font-bold text-green-600 flex items-center">
                  {formatBengaliCurrency(ledger.paid_amount || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${hasDues ? 'from-red-50 to-white dark:from-red-900/20' : 'from-green-50 to-white dark:from-green-900/20'} dark:to-gray-800`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">বাকি আছে</p>
                <p className={`text-2xl font-bold flex items-center ${hasDues ? 'text-red-600' : 'text-green-600'}`}>
                  {formatBengaliCurrency(ledger.balance || 0)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${hasDues ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}`}>
                {hasDues ? (
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {ledger.total_fees > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <span className="font-medium">পরিশোধের অগ্রগতি</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className="bg-emerald-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((ledger.paid_amount / ledger.total_fees) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
              {toBengaliNumeral(Math.round((ledger.paid_amount / ledger.total_fees) * 100))}% পরিশোধ হয়েছে
            </p>
          </CardContent>
        </Card>
      )}

      {fee_structure && fee_structure.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              ফি কাঠামো
            </CardTitle>
            <CardDescription>আপনার জামাতের জন্য প্রযোজ্য ফি সমূহ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ক্রম</TableHead>
                    <TableHead>ফি-র ধরন</TableHead>
                    <TableHead>বিবরণ</TableHead>
                    <TableHead>পরিমাণ</TableHead>
                    <TableHead>মেয়াদ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fee_structure.map((fee, index) => (
                    <TableRow key={fee.id || index}>
                      <TableCell className="font-medium">{toBengaliNumeral(index + 1)}</TableCell>
                      <TableCell className="font-semibold">{fee.name_bn || fee.fee_type || fee.name || 'ফি'}</TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">{fee.description || '-'}</TableCell>
                      <TableCell className="font-semibold">
                        {formatBengaliCurrency(fee.amount || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {frequencyMap[(fee.frequency || 'yearly').toLowerCase()] || fee.frequency}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            পেমেন্ট ইতিহাস
          </CardTitle>
          <CardDescription>আপনার সকল ফি পরিশোধের তালিকা</CardDescription>
        </CardHeader>
        <CardContent>
          {payments && payments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ক্রম</TableHead>
                    <TableHead>রসিদ নং</TableHead>
                    <TableHead>মাস</TableHead>
                    <TableHead>পরিমাণ</TableHead>
                    <TableHead>পরিশোধের তারিখ</TableHead>
                    <TableHead>মাধ্যম</TableHead>
                    <TableHead>অবস্থা</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment, index) => (
                    <TableRow key={payment.id || index}>
                      <TableCell className="font-medium">{toBengaliNumeral(index + 1)}</TableCell>
                      <TableCell>{payment.receipt_no ? toBengaliNumeral(payment.receipt_no) : '-'}</TableCell>
                      <TableCell>{payment.month || payment.fee_type || 'মাসিক ফি'}</TableCell>
                      <TableCell className="font-semibold">
                        {formatBengaliCurrency(payment.amount || 0)}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {payment.payment_date ? formatBengaliDate(payment.payment_date) : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {paymentModeMap[(payment.payment_method || 'cash').toLowerCase()] || payment.payment_method || 'নগদ'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'paid' || payment.status === 'completed' ? 'default' : 'secondary'}>
                          {statusMap[(payment.status || 'completed').toLowerCase()] || 'পরিশোধিত'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি</p>
              <p className="text-sm">পেমেন্ট করার পর এখানে তালিকা দেখা যাবে</p>
            </div>
          )}
        </CardContent>
      </Card>

      {hasDues && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800 dark:text-red-400">ফি বাকি আছে</h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    আপনার {formatBengaliCurrency(ledger.balance)} টাকা বাকি আছে।
                    অনলাইনে পরিশোধ করতে নিচের বাটনে ক্লিক করুন অথবা অফিসে যোগাযোগ করুন।
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/student/payment')}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                অনলাইনে পেমেন্ট করুন
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentFees;
