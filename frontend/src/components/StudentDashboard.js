import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  User, 
  Calendar, 
  CreditCard, 
  Award,
  Bell,
  BookOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Download,
  Receipt
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'https://portal.mahajampurdarbarsharif.org/api';
const BASE_URL = API.replace('/api', '');

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [dashRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/student/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/student/payments`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { payments: [], summary: null } }))
      ]);
      setDashboardData(dashRes.data);
      setPaymentHistory(paymentsRes.data.payments || []);
      setPaymentSummary(paymentsRes.data.summary || null);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadReceipt = async (receiptNo) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/fees/receipt/${receiptNo}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${receiptNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      console.error('Failed to download receipt:', error);
      toast.error('Failed to download receipt');
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Unable to load dashboard. Please try again later.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { student, attendance, fees, latest_result, notifications } = dashboardData;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome, {student.name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {student.class_standard} - Section {student.section_name} | Roll No: {student.roll_no}
          </p>
        </div>
        {student.photo_url && (
          <img 
            src={`${BASE_URL}${student.photo_url}`} 
            alt={student.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/student/profile')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Profile</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{student.admission_no}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">View & Update Profile</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Attendance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{attendance.percentage}%</p>
              </div>
              <div className={`p-3 rounded-full ${attendance.percentage >= 75 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                <Calendar className={`h-6 w-6 ${attendance.percentage >= 75 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {attendance.present_days} / {attendance.total_days} days present
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/student/fees')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Fee Status</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {fees.has_dues ? (
                    <span className="text-red-600">Due: ৳{fees.balance}</span>
                  ) : (
                    <span className="text-green-600">Paid</span>
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-full ${fees.has_dues ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}`}>
                <CreditCard className={`h-6 w-6 ${fees.has_dues ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Paid: ৳{fees.paid_amount} / ৳{fees.total_fees}
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/student-results')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Latest Result</p>
                {latest_result ? (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {latest_result.percentage}% ({latest_result.grade})
                  </p>
                ) : (
                  <p className="text-lg text-gray-500">No results yet</p>
                )}
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            {latest_result && (
              <p className="text-xs text-gray-500 mt-2">
                {latest_result.exam_name} | Rank: #{latest_result.rank || 'N/A'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/student/profile')}
            >
              <User className="h-4 w-4 mr-2" />
              Update Profile
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/student/fees')}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              View Payment History
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/student/admit-card')}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Download Admit Card
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/student-results')}
            >
              <Award className="h-4 w-4 mr-2" />
              View Results
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications && notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notif, index) => (
                  <div key={notif.id || index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className={`p-2 rounded-full ${notif.type === 'alert' ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                      {notif.type === 'alert' ? (
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{notif.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Academic Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{student.class_standard}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Class</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{student.section_name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Section</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{student.roll_no}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Roll No</p>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{student.admission_no}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Admission No</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            Payment History
          </CardTitle>
          {paymentSummary && (
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 font-medium">
                Total Paid: ৳{paymentSummary.total_paid?.toLocaleString() || 0}
              </span>
              {paymentSummary.total_due > 0 && (
                <span className="text-red-600 font-medium">
                  Due: ৳{paymentSummary.total_due?.toLocaleString() || 0}
                </span>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {paymentHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.slice(0, 10).map((payment) => (
                    <TableRow key={payment.id || payment.receipt_no}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{payment.receipt_no}</Badge>
                      </TableCell>
                      <TableCell>
                        {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>{payment.fee_type}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        ৳{payment.amount?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{payment.payment_mode}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadReceipt(payment.receipt_no)}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {paymentHistory.length > 10 && (
                <div className="text-center mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/student/fees')}
                  >
                    View All Payments ({paymentHistory.length})
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No payment history found</p>
              <p className="text-sm">Your payment records will appear here once payments are made</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;
