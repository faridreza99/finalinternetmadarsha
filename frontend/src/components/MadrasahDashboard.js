import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Users,
  GraduationCap,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  BookOpen,
  UserCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

const API = process.env.REACT_APP_API_URL || '/api';

const MadrasahDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    students: { total: 0, active: 0, new_this_month: 0 },
    fees: { total: 0, collected: 0, pending: 0, overdue: 0, todays_collection: 0 },
    attendance: { present: 0, absent: 0, late: 0, total: 0 },
    classes: [],
    recentPayments: [],
    monthlyFees: [],
    weeklyAttendance: [],
  });
  const [schoolBranding, setSchoolBranding] = useState({});

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Performance Optimization: Fetch pre-calculated stats from backend
      // instead of fetching all students and calculating on client
      const [statsRes, institutionRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { headers }).catch(() => ({ data: {} })),
        axios.get(`${API}/institution`, { headers }).catch(() => ({ data: {} })),
      ]);

      const stats = statsRes.data || {};

      // Use efficient backend stats directly
      setDashboardData({
        students: {
          total: stats.students?.total || 0,
          active: stats.students?.active || 0,
          new_this_month: stats.students?.new_this_month || 0,
        },
        fees: {
          total: stats.fees?.total || 0,
          collected: stats.fees?.collected || 0,
          pending: stats.fees?.pending || 0,
          overdue: stats.fees?.overdue || 0,
          todays_collection: 0, // This detailing might be less critical or could be added to backend stats if needed
          payments_today: 0,
        },
        attendance: {
          present: stats.attendance?.present || 0,
          absent: stats.attendance?.absent || 0,
          late: stats.attendance?.late || 0,
          total: stats.attendance?.total || 0,
        },
        classes: stats.classes || [],
        recentPayments: stats.recent_payments || [],
        monthlyFees: [], // Could be added to backend stats if strictly needed
        weeklyAttendance: [], // Could be added to backend stats if strictly needed
      });

      const institution = institutionRes.data || {};
      setSchoolBranding({
        school_name: institution.school_name || institution.name || institution.site_title || '',
        logo_url: institution.logo_url || institution.logo || '',
        primary_color: institution.primary_color || '#10B981'
      });
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast.error("ড্যাশবোর্ড ডাটা লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const { students, fees, attendance, classes, recentPayments, monthlyFees, weeklyAttendance } = dashboardData;

  const attendancePieData = attendance.total > 0 ? [
    { name: 'উপস্থিত', value: attendance.present, color: '#10B981' },
    { name: 'অনুপস্থিত', value: attendance.absent, color: '#EF4444' },
    { name: 'বিলম্বে', value: attendance.late, color: '#F59E0B' },
  ].filter(d => d.value > 0) : [];

  const collectionPercentage = fees.total > 0 ? Math.round((fees.collected / fees.total) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border animate-pulse">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-64 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border animate-pulse">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-64 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {schoolBranding.school_name || 'মাদ্রাসা ড্যাশবোর্ড'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            শিক্ষাবর্ষ ২০২৪-২৫ | {new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Badge className="bg-emerald-500 text-white px-4 py-2 text-sm">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          সক্রিয় প্রতিষ্ঠান
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/students')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">মোট ছাত্র</p>
                <p className="text-3xl font-bold mt-1">{students.active}</p>
                <p className="text-blue-100 text-xs mt-2">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  এই মাসে নতুন {students.new_this_month} জন
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Users className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/fees')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">মোট আদায়</p>
                <p className="text-3xl font-bold mt-1">৳{fees.collected.toLocaleString()}</p>
                <p className="text-emerald-100 text-xs mt-2">
                  <CheckCircle2 className="h-3 w-3 inline mr-1" />
                  {collectionPercentage}% আদায় সম্পন্ন
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <DollarSign className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/fees')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">বকেয়া</p>
                <p className="text-3xl font-bold mt-1">৳{fees.pending.toLocaleString()}</p>
                <p className="text-amber-100 text-xs mt-2">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  অতিরিক্ত বকেয়া ৳{fees.overdue.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Clock className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/attendance/student')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">আজকের হাজিরা</p>
                <p className="text-3xl font-bold mt-1">{attendance.present + attendance.absent}</p>
                <p className="text-purple-100 text-xs mt-2">
                  <UserCheck className="h-3 w-3 inline mr-1" />
                  উপস্থিত {attendance.present} জন
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Calendar className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              মাসিক ফি আদায় প্রবণতা
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyFees.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyFees}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(v) => `৳${v / 1000}k`} />
                  <Tooltip
                    formatter={(value) => [`৳${value.toLocaleString()}`, 'আদায়']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Area type="monotone" dataKey="collected" stroke="#10B981" strokeWidth={3} fill="url(#colorCollected)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-gray-500">
                <TrendingUp className="h-12 w-12 mb-3 text-gray-300" />
                <p>মাসিক আদায় ডাটা নেই</p>
                <p className="text-xs mt-1">পেমেন্ট রেকর্ড যোগ করলে এখানে দেখাবে</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              সাপ্তাহিক হাজিরা বিশ্লেষণ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyAttendance.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyAttendance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Bar dataKey="present" name="উপস্থিত" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="অনুপস্থিত" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-gray-500">
                <Calendar className="h-12 w-12 mb-3 text-gray-300" />
                <p>সাপ্তাহিক হাজিরা ডাটা নেই</p>
                <p className="text-xs mt-1">হাজিরা রেকর্ড যোগ করলে এখানে দেখাবে</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              মারহালা অনুযায়ী ছাত্র
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={classes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                  <Bar dataKey="students" name="ছাত্র সংখ্যা" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-500">
                <p>কোনো ক্লাস ডাটা নেই</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              হাজিরা সারাংশ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendancePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {attendancePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-gray-500">
                <UserCheck className="h-12 w-12 mb-3 text-gray-300" />
                <p>হাজিরা ডাটা নেই</p>
                <p className="text-xs mt-1">হাজিরা রেকর্ড যোগ করলে এখানে দেখাবে</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              সাম্প্রতিক পেমেন্ট
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length > 0 ? (
              <div className="space-y-3">
                {recentPayments.slice(0, 5).map((payment, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 p-2 rounded-full">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{payment.student_name || 'শিক্ষার্থী'}</p>
                        <p className="text-xs text-gray-500">
                          {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('bn-BD') : '-'}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-emerald-600">৳{(payment.amount || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-gray-500">
                <XCircle className="h-10 w-10 mb-2 text-gray-300" />
                <p>কোনো সাম্প্রতিক পেমেন্ট নেই</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => navigate('/students')}>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-900">ছাত্র তালিকা</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => navigate('/fees')}>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-900">বেতন আদায়</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors" onClick={() => navigate('/attendance/student')}>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-900">হাজিরা</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => navigate('/madrasah/reports')}>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 text-amber-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-amber-900">রিপোর্ট</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MadrasahDashboard;
