import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  Calendar,
  Download,
  UserPlus,
  GraduationCap,
  BarChart3,
  UserCheck,
  Clock,
  BookOpen,
  Target,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_API_URL;
const API = BACKEND_URL;

const AdmissionSummary = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_students: 0,
    new_admissions_this_month: 0,
    pending_applications: 0,
    total_classes: 0
  });
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2025-26');
  
  const [classWiseData, setClassWiseData] = useState([]);
  const [genderDistribution, setGenderDistribution] = useState([]);
  const [monthlyAdmissions, setMonthlyAdmissions] = useState([]);
  const [ageDistribution, setAgeDistribution] = useState([]);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      const [statsRes, studentsRes, classesRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats?year=${selectedYear}`),
        axios.get(`${API}/students?year=${selectedYear}`),
        axios.get(`${API}/classes`)
      ]);
      
      setStats(statsRes.data);
      const studentsData = Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data?.items || []);
      const classesData = Array.isArray(classesRes.data) ? classesRes.data : [];
      setStudents(studentsData);
      setClasses(classesData);
      
      calculateChartData(studentsData, classesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('তথ্য লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const calculateChartData = (studentsData, classesData) => {
    // 1. Class-wise Distribution with Bengali names
    const classCount = {};
    studentsData.forEach(student => {
      const classId = student.class_id;
      classCount[classId] = (classCount[classId] || 0) + 1;
    });

    const classWise = classesData.map(cls => ({
      name: cls.name,
      ছাত্র: classCount[cls.id] || 0,
      ধারণক্ষমতা: cls.capacity || 40
    }));
    setClassWiseData(classWise);

    // 2. Gender Distribution with Bengali
    const genderCount = { পুরুষ: 0, মহিলা: 0 };
    studentsData.forEach(student => {
      if (student.gender) {
        const g = student.gender.toLowerCase();
        if (g === 'male' || g === 'পুরুষ') genderCount['পুরুষ']++;
        else if (g === 'female' || g === 'মহিলা') genderCount['মহিলা']++;
      }
    });

    const genderDist = [
      { name: 'পুরুষ', value: genderCount['পুরুষ'], color: '#3B82F6', fill: '#3B82F6' },
      { name: 'মহিলা', value: genderCount['মহিলা'], color: '#EC4899', fill: '#EC4899' }
    ].filter(g => g.value > 0);
    setGenderDistribution(genderDist);

    // 3. Monthly Admissions with Bengali months
    const bengaliMonths = {
      'Jan': 'জানু', 'Feb': 'ফেব্রু', 'Mar': 'মার্চ', 'Apr': 'এপ্রি',
      'May': 'মে', 'Jun': 'জুন', 'Jul': 'জুলা', 'Aug': 'আগ',
      'Sep': 'সেপ্টে', 'Oct': 'অক্টো', 'Nov': 'নভে', 'Dec': 'ডিসে'
    };
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const monthCounts = {};
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = monthNames[date.getMonth()];
      monthCounts[monthKey] = 0;
    }
    
    studentsData.forEach(student => {
      if (student.created_at) {
        const admissionDate = new Date(student.created_at);
        const monthKey = monthNames[admissionDate.getMonth()];
        if (monthCounts[monthKey] !== undefined) {
          monthCounts[monthKey]++;
        }
      }
    });

    const monthlyAdm = Object.keys(monthCounts).map(month => ({
      মাস: bengaliMonths[month] || month,
      ভর্তি: monthCounts[month]
    }));
    setMonthlyAdmissions(monthlyAdm);

    // 4. Age Distribution
    const ageGroups = { '৫-১০ বছর': 0, '১১-১৫ বছর': 0, '১৬-২০ বছর': 0, '২০+ বছর': 0 };
    studentsData.forEach(student => {
      if (student.date_of_birth) {
        const birthDate = new Date(student.date_of_birth);
        const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        if (age >= 5 && age <= 10) ageGroups['৫-১০ বছর']++;
        else if (age >= 11 && age <= 15) ageGroups['১১-১৫ বছর']++;
        else if (age >= 16 && age <= 20) ageGroups['১৬-২০ বছর']++;
        else if (age > 20) ageGroups['২০+ বছর']++;
      }
    });

    const ageDist = Object.entries(ageGroups).map(([name, value], index) => ({
      name,
      value,
      fill: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'][index]
    })).filter(a => a.value > 0);
    setAgeDistribution(ageDist);
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/reports/admission-summary`, {
        params: { format: 'csv', year: selectedYear },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ভর্তি-সারাংশ-${selectedYear}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('রিপোর্ট ডাউনলোড সম্পন্ন');
    } catch (error) {
      generateCSVFallback();
    }
  };

  const generateCSVFallback = () => {
    try {
      const csvData = [
        ['ছাত্রের নাম', 'ভর্তি নম্বর', 'মারহালা', 'পিতার নাম', 'মোবাইল', 'ভর্তির তারিখ'],
        ...students.map(student => [
          student.name,
          student.admission_no,
          getClassName(student.class_id),
          student.father_name,
          student.phone,
          student.created_at ? new Date(student.created_at).toLocaleDateString('bn-BD') : ''
        ])
      ];

      const BOM = '\uFEFF';
      const csvContent = BOM + csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ভর্তি-সারাংশ-${selectedYear}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('রিপোর্ট তৈরি সম্পন্ন');
    } catch (error) {
      toast.error('রিপোর্ট তৈরি করতে সমস্যা হয়েছে');
    }
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? cls.name : 'অজানা';
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const maleCount = genderDistribution.find(g => g.name === 'পুরুষ')?.value || 0;
  const femaleCount = genderDistribution.find(g => g.name === 'মহিলা')?.value || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
            ভর্তি সারাংশ
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            ছাত্র-ছাত্রীদের ভর্তির বিস্তারিত পরিসংখ্যান
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger className="w-44 bg-white dark:bg-gray-800 border-emerald-200">
              <Calendar className="h-4 w-4 mr-2 text-emerald-600" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-26">শিক্ষাবর্ষ ২০২৫-২৬</SelectItem>
              <SelectItem value="2024-25">শিক্ষাবর্ষ ২০২৪-২৫</SelectItem>
              <SelectItem value="2023-24">শিক্ষাবর্ষ ২০২৩-২৪</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleExport} className="border-emerald-200 hover:bg-emerald-50">
            <Download className="h-4 w-4 mr-2 text-emerald-600" />
            রিপোর্ট ডাউনলোড
          </Button>
          
          <Button 
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg"
            onClick={() => navigate('/students')}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            নতুন ভর্তি
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">মোট ছাত্র</p>
                <p className="text-3xl sm:text-4xl font-bold mt-1">{stats.total_students || students.length}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Users className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-emerald-100 text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>সক্রিয় ছাত্র-ছাত্রী</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">এই মাসে ভর্তি</p>
                <p className="text-3xl sm:text-4xl font-bold mt-1">{stats.new_admissions_this_month || 0}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <UserCheck className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-blue-100 text-sm">
              <Clock className="h-4 w-4 mr-1" />
              <span>চলতি মাস</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">মোট মারহালা</p>
                <p className="text-3xl sm:text-4xl font-bold mt-1">{classes.length}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-purple-100 text-sm">
              <GraduationCap className="h-4 w-4 mr-1" />
              <span>সক্রিয় শ্রেণী</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">গড় ছাত্র/শ্রেণী</p>
                <p className="text-3xl sm:text-4xl font-bold mt-1">
                  {classes.length > 0 ? Math.round(students.length / classes.length) : 0}
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Target className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-amber-100 text-sm">
              <Award className="h-4 w-4 mr-1" />
              <span>গড় হার</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Class-wise Distribution Bar Chart */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg font-semibold text-gray-800 dark:text-white">
              <BarChart3 className="h-5 w-5 mr-2 text-emerald-600" />
              মারহালা অনুযায়ী ছাত্র সংখ্যা
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classWiseData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="ছাত্র" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ধারণক্ষমতা" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gender Distribution Pie Chart */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg font-semibold text-gray-800 dark:text-white">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              লিঙ্গ অনুযায়ী বিভাজন
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center">
              {genderDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {genderDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>কোনো তথ্য পাওয়া যায়নি</p>
                </div>
              )}
            </div>
            {genderDistribution.length > 0 && (
              <div className="flex justify-center gap-8 mt-4">
                <div className="text-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-1"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">পুরুষ</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">{maleCount}</p>
                </div>
                <div className="text-center">
                  <div className="w-4 h-4 bg-pink-500 rounded-full mx-auto mb-1"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">মহিলা</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">{femaleCount}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Admissions Area Chart */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg font-semibold text-gray-800 dark:text-white">
              <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
              মাসিক ভর্তির প্রবণতা
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyAdmissions} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorAdmission" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="মাস" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="ভর্তি" 
                    stroke="#8B5CF6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorAdmission)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Age Distribution Radial Chart */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg font-semibold text-gray-800 dark:text-white">
              <GraduationCap className="h-5 w-5 mr-2 text-amber-600" />
              বয়স অনুযায়ী বিভাজন
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {ageDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="20%" 
                    outerRadius="90%" 
                    data={ageDistribution}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar
                      minAngle={15}
                      label={{ position: 'insideStart', fill: '#fff', fontSize: 12 }}
                      background
                      clockWise
                      dataKey="value"
                    />
                    <Legend 
                      iconSize={10} 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                    />
                    <Tooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>বয়সের তথ্য পাওয়া যায়নি</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Admissions Table */}
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-gray-800 dark:text-white">
            <UserPlus className="h-5 w-5 mr-2 text-emerald-600" />
            সাম্প্রতিক ভর্তি
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">ছাত্রের নাম</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">ভর্তি নম্বর</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">মারহালা</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">অভিভাবক</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">তারিখ</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 5).map((student, index) => (
                  <tr key={student.id || index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                          {student.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-white">{student.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {student.admission_no}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{getClassName(student.class_id)}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{student.father_name || student.guardian_name || '-'}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-500 text-sm">
                      {student.created_at ? new Date(student.created_at).toLocaleDateString('bn-BD') : '-'}
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>কোনো ছাত্র পাওয়া যায়নি</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {students.length > 5 && (
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                onClick={() => navigate('/students')}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                সকল ছাত্র দেখুন ({students.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdmissionSummary;
