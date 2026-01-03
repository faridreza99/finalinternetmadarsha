import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_API_URL || '/api';

const toBengaliNumeral = (num) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bengaliDigits[parseInt(d)]);
};

const formatBengaliDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatted;
  } catch {
    return toBengaliNumeral(dateString);
  }
};

const StudentAttendanceView = () => {
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API}/student/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { month: selectedMonth, year: selectedYear }
      });
      
      setAttendanceData(response.data.records || []);
      setSummary(response.data.summary || null);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('হাজিরার তথ্য লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      present: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      absent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const statusLabels = {
    present: 'উপস্থিত',
    absent: 'অনুপস্থিত',
    late: 'বিলম্বিত',
    holiday: 'ছুটি'
  };

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

  const dayLabels = {
    'Sunday': 'রবিবার',
    'Monday': 'সোমবার',
    'Tuesday': 'মঙ্গলবার',
    'Wednesday': 'বুধবার',
    'Thursday': 'বৃহস্পতিবার',
    'Friday': 'শুক্রবার',
    'Saturday': 'শনিবার'
  };

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 2; y--) {
    years.push(y);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">আমার হাজিরা</h1>
          <p className="text-gray-600 dark:text-gray-400">আপনার হাজিরার রেকর্ড দেখুন</p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="dark:bg-gray-800 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">মোট দিন</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{toBengaliNumeral(summary.total_days || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">উপস্থিত</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{toBengaliNumeral(summary.present_days || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700 bg-gradient-to-br from-red-50 to-white dark:from-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">অনুপস্থিত</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{toBengaliNumeral(summary.absent_days || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">শতকরা হার</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{toBengaliNumeral(summary.percentage || 0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="dark:text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              হাজিরার রেকর্ড
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="dark:text-gray-300">মাস:</Label>
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger className="w-32 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value.toString()} className="dark:text-white dark:hover:bg-gray-700">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="dark:text-gray-300">বছর:</Label>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-24 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {years.map(y => (
                      <SelectItem key={y} value={y.toString()} className="dark:text-white dark:hover:bg-gray-700">
                        {toBengaliNumeral(y)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {attendanceData.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>এই সময়ের জন্য কোনো হাজিরার রেকর্ড পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">তারিখ</th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">বার</th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">অবস্থা</th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">মন্তব্য</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map((record, index) => (
                    <tr key={index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4 dark:text-gray-200">
                        {formatBengaliDate(record.date)}
                      </td>
                      <td className="py-3 px-4 dark:text-gray-200">
                        {dayLabels[record.day] || record.day}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <Badge className={getStatusBadge(record.status)}>
                            {statusLabels[record.status] || record.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {record.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAttendanceView;
