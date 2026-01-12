import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Check, X, Users, UserCheck, UserX, Calendar, Download, FileSpreadsheet, Clock, AlertTriangle, Brain, Settings, Edit, History } from 'lucide-react';
import AcademicHierarchySelector from './AcademicHierarchySelector';

const API = process.env.REACT_APP_API_URL || '/api';

const MarkStudentAttendance = () => {
  const [students, setStudents] = useState([]);
  const [selectedMarhalaId, setSelectedMarhalaId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState('Morning');
  const [autoFillAllSessions, setAutoFillAllSessions] = useState(false);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedSemesterId) {
      fetchStudents();
      fetchExistingAttendance();
    } else {
      setStudents([]);
      setAttendance({});
    }
  }, [selectedSemesterId, selectedDate, selectedSession]);

  const handleHierarchyChange = (selection) => {
    setSelectedMarhalaId(selection.marhala_id);
    setSelectedDepartmentId(selection.department_id);
    setSelectedSemesterId(selection.semester_id);
    if (!selection.semester_id) {
      setStudents([]);
      setAttendance({});
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/students`, {
        params: {
          semester_id: selectedSemesterId,
          is_active: true
        }
      });
      const studentData = response.data || [];
      const uniqueStudents = studentData.filter((student, index, self) =>
        index === self.findIndex((s) => s.id === student.id)
      );
      setStudents(uniqueStudents);
    } catch (error) {
      toast.error('ছাত্র লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async () => {
    try {
      const response = await axios.get(`${API}/attendance`, {
        params: {
          date: selectedDate,
          date: selectedDate,
          type: 'student',
          semester_id: selectedSemesterId,
          attendance_session: selectedSession
        }
      });

      const attendanceMap = {};
      response.data.forEach(record => {
        attendanceMap[record.person_id] = record.status;
      });
      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Failed to load existing attendance:', error);
    }
  };

  const markAttendance = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAll = (status) => {
    const newAttendance = {};
    students.forEach(student => {
      newAttendance[student.id] = status;
    });
    setAttendance(newAttendance);
    toast.success(status === 'present' ? 'সকল ছাত্রকে উপস্থিত হিসেবে চিহ্নিত করা হয়েছে' : 'সকল ছাত্রকে অনুপস্থিত হিসেবে চিহ্নিত করা হয়েছে');
  };

  const saveAttendance = async () => {
    if (Object.keys(attendance).length === 0) {
      toast.error('অন্তত একজন ছাত্রের হাজিরা দিন');
      return;
    }

    try {
      setSaving(true);

      const sessionsToSave = autoFillAllSessions
        ? ['Morning', 'Noon', 'Evening', 'Night']
        : [selectedSession];

      for (const session of sessionsToSave) {
        const records = Object.entries(attendance).map(([studentId, status]) => {
          const student = students.find(s => s.id === studentId);
          return {
            person_id: studentId,
            person_name: student?.name || '',
            status: status,
            date: selectedDate,
            type: 'student',
            semester_id: selectedSemesterId,
            marhala_id: selectedMarhalaId,
            department_id: selectedDepartmentId,
            attendance_session: session
          };
        });

        await axios.post(`${API}/attendance/bulk`, {
          date: selectedDate,
          type: 'student',
          semester_id: selectedSemesterId,
          attendance_session: session,
          records: records
        });
      }

      toast.success(autoFillAllSessions ? 'সকল সেশনের হাজিরা সংরক্ষিত হয়েছে' : 'ছাত্র হাজিরা সংরক্ষিত হয়েছে');
    } catch (error) {
      toast.error('হাজিরা সংরক্ষণ করতে ব্যর্থ');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter(s => s === 'present').length;
  const absentCount = Object.values(attendance).filter(s => s === 'absent').length;
  const lateCount = Object.values(attendance).filter(s => s === 'late').length;
  const halfDayCount = Object.values(attendance).filter(s => s === 'half_day').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ছাত্র হাজিরা</h2>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">তারিখ</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">সেশন</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="Morning">সকাল (Morning)</option>
                <option value="Noon">দুপুর (Noon)</option>
                <option value="Evening">সন্ধ্যা (Evening)</option>
                <option value="Night">রাত (Night)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <AcademicHierarchySelector
                onSelectionChange={handleHierarchyChange}
                selectedMarhalaId={selectedMarhalaId}
                selectedDepartmentId={selectedDepartmentId}
                selectedSemesterId={selectedSemesterId}
                showLabels={true}
                inline={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSemesterId && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">মোট ছাত্র</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{students.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">উপস্থিত</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{presentCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">অনুপস্থিত</CardTitle>
                <UserX className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{absentCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">বিলম্বিত</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">অর্ধ দিন</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{halfDayCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2">
            <Button onClick={() => markAll('present')} variant="outline" className="gap-2">
              <Check className="h-4 w-4" />
              সকলকে উপস্থিত
            </Button>
            <Button onClick={() => markAll('absent')} variant="outline" className="gap-2">
              <X className="h-4 w-4" />
              সকলকে অনুপস্থিত
            </Button>
          </div>

          {/* Student List */}
          <Card>
            <CardHeader>
              <CardTitle>ছাত্র তালিকা</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">লোড হচ্ছে...</div>
              ) : students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">কোন ছাত্র পাওয়া যায়নি</div>
              ) : (
                <div className="space-y-2">
                  {students.map(student => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-gray-500">রোল: {student.roll_no || '-'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={() => markAttendance(student.id, 'present')}
                          variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                          size="sm"
                          className={attendance[student.id] === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          উপস্থিত
                        </Button>
                        <Button
                          onClick={() => markAttendance(student.id, 'absent')}
                          variant={attendance[student.id] === 'absent' ? 'default' : 'outline'}
                          size="sm"
                          className={attendance[student.id] === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                          <X className="h-4 w-4 mr-1" />
                          অনুপস্থিত
                        </Button>
                        <Button
                          onClick={() => markAttendance(student.id, 'late')}
                          variant={attendance[student.id] === 'late' ? 'default' : 'outline'}
                          size="sm"
                          className={attendance[student.id] === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          বিলম্বিত
                        </Button>
                        <Button
                          onClick={() => markAttendance(student.id, 'half_day')}
                          variant={attendance[student.id] === 'half_day' ? 'default' : 'outline'}
                          size="sm"
                          className={attendance[student.id] === 'half_day' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          অর্ধ দিন
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end items-center gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoFill"
                checked={autoFillAllSessions}
                onChange={(e) => setAutoFillAllSessions(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label
                htmlFor="autoFill"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                আজকের সকল সেশনে প্রয়োগ করুন
              </label>
            </div>
            <Button
              onClick={saveAttendance}
              disabled={saving || Object.keys(attendance).length === 0}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'হাজিরা সংরক্ষণ'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

const StudentAttendanceReport = () => {
  const [selectedMarhalaId, setSelectedMarhalaId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleHierarchyChange = (selection) => {
    const normalizeId = (id) => (id && id !== 'all') ? id : '';
    setSelectedMarhalaId(normalizeId(selection.marhala_id));
    setSelectedDepartmentId(normalizeId(selection.department_id));
    setSelectedSemesterId(normalizeId(selection.semester_id));
  };

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        date: selectedDate,
        type: 'student'
      };

      if (selectedSemesterId && selectedSemesterId !== 'all') {
        params.semester_id = selectedSemesterId;
      } else if (selectedDepartmentId && selectedDepartmentId !== 'all') {
        params.department_id = selectedDepartmentId;
      } else if (selectedMarhalaId && selectedMarhalaId !== 'all') {
        params.marhala_id = selectedMarhalaId;
      }

      const response = await axios.get(`${API}/attendance/summary`, { params });
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedMarhalaId, selectedDepartmentId, selectedSemesterId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const exportReport = async (format) => {
    try {
      const params = {
        format: format,
        date: selectedDate,
        type: 'student'
      };

      if (selectedSemesterId && selectedSemesterId !== 'all') {
        params.semester_id = selectedSemesterId;
      } else if (selectedDepartmentId && selectedDepartmentId !== 'all') {
        params.department_id = selectedDepartmentId;
      } else if (selectedMarhalaId && selectedMarhalaId !== 'all') {
        params.marhala_id = selectedMarhalaId;
      }

      const response = await axios.get(`${API}/reports/attendance/student-attendance`, {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `student_attendance_${selectedDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(`রিপোর্ট ${format.toUpperCase()} হিসেবে ডাউনলোড হয়েছে`);
    } catch (error) {
      toast.error('রিপোর্ট ডাউনলোড করতে ব্যর্থ');
      console.error(error);
    }
  };

  const attendanceRate = summary?.total > 0
    ? ((summary.present / summary.total) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ছাত্র হাজিরা রিপোর্ট</h2>
        <div className="flex gap-2">
          <Button onClick={() => exportReport('excel')} variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            এক্সেল ডাউনলোড
          </Button>
          <Button onClick={() => exportReport('pdf')} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            পিডিএফ ডাউনলোড
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">তারিখ</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <AcademicHierarchySelector
                onSelectionChange={handleHierarchyChange}
                selectedMarhalaId={selectedMarhalaId}
                selectedDepartmentId={selectedDepartmentId}
                selectedSemesterId={selectedSemesterId}
                showLabels={true}
                showAllOption={true}
                allOptionLabel="সকল"
                inline={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {loading ? (
        <div className="text-center py-8">লোড হচ্ছে...</div>
      ) : summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">মোট ছাত্র</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">উপস্থিত</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary.present || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">অনুপস্থিত</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summary.absent || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">উপস্থিতি হার</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{attendanceRate}%</div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

const StudentAttendance = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { name: 'হাজিরা দিন', path: '/students/attendance/mark' },
    { name: 'হাজিরা রিপোর্ট', path: '/students/attendance/report' }
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${location.pathname === tab.path
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Routes */}
      <Routes>
        <Route path="mark" element={<MarkStudentAttendance />} />
        <Route path="report" element={<StudentAttendanceReport />} />
        <Route path="/" element={<MarkStudentAttendance />} />
      </Routes>
    </div>
  );
};

export default StudentAttendance;
