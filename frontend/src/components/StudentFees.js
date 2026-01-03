import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
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
import { useCurrency } from '../context/CurrencyContext';

const API = process.env.REACT_APP_API_URL || '/api';

const StudentFees = () => {
  const [loading, setLoading] = useState(true);
  const [feeData, setFeeData] = useState(null);
  const { formatCurrency, getCurrencySymbol } = useCurrency();

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
      toast.error('Failed to load fee information');
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!feeData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Unable to load fee information. Please try again later.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { ledger, payments, fee_structure, student_name, admission_no } = feeData;
  const hasDues = ledger.balance > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Status</h1>
          <p className="text-gray-600 dark:text-gray-400">{student_name} ({admission_no})</p>
        </div>
        <Badge variant={hasDues ? "destructive" : "default"} className="text-lg px-4 py-2">
          {hasDues ? 'Dues Pending' : 'All Paid'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Fees</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  {formatCurrency(ledger.total_fees || 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600 flex items-center">
                  {formatCurrency(ledger.paid_amount || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Balance Due</p>
                <p className={`text-2xl font-bold flex items-center ${hasDues ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(ledger.balance || 0)}
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
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Payment Progress</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div 
                className="bg-green-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((ledger.paid_amount / ledger.total_fees) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
              {Math.round((ledger.paid_amount / ledger.total_fees) * 100)}% paid
            </p>
          </CardContent>
        </Card>
      )}

      {fee_structure && fee_structure.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Fee Structure
            </CardTitle>
            <CardDescription>Applicable fees for your class</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fee_structure.map((fee, index) => (
                    <TableRow key={fee.id || index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-semibold">{fee.fee_type || fee.name || 'Fee'}</TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">{fee.description || '-'}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(fee.amount || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{fee.frequency || 'Annual'}</Badge>
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
            <Receipt className="h-5 w-5 text-blue-600" />
            Payment History
          </CardTitle>
          <CardDescription>View all your fee payments</CardDescription>
        </CardHeader>
        <CardContent>
          {payments && payments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment, index) => (
                    <TableRow key={payment.id || index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{payment.receipt_no || '-'}</TableCell>
                      <TableCell>{payment.fee_type || 'Tuition Fee'}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payment.amount || 0)}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.payment_mode || 'Cash'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                          {payment.status || 'Completed'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No payment records found</p>
              <p className="text-sm">Payment history will appear here once payments are made</p>
            </div>
          )}
        </CardContent>
      </Card>

      {hasDues && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-400">Payment Due</h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  You have an outstanding balance of {formatCurrency(ledger.balance)}. 
                  Please contact the school office for payment options.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentFees;
