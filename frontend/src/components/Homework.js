import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
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
  Plus,
  FileText,
  Calendar,
  Download,
  Trash2,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_API_URL || '/api';

const toBengaliNumeral = (num) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bengaliDigits[parseInt(d)]);
};

const toBanglaDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    const day = toBengaliNumeral(date.getDate());
    const month = toBengaliNumeral(date.getMonth() + 1);
    const year = toBengaliNumeral(date.getFullYear());
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const Homework = () => {
  const [loading, setLoading] = useState(true);
  const [homework, setHomework] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicHierarchy, setAcademicHierarchy] = useState({ marhalas: [], departments: [], semesters: [] });
  const [showDialog, setShowDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    marhala_id: '',
    department_id: '',
    semester_id: '',
    subject: '',
    due_date: '',
    instructions: ''
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchHomework = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        setLoading(false);
        return;
      }
      const response = await axios.get(`${API}/homework`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHomework(response.data.homework || []);
    } catch (error) {
      console.error('Failed to fetch homework:', error);
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        toast.error('হোমওয়ার্ক লোড করতে ব্যর্থ');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      let userRole = 'admin';
      try {
        userRole = JSON.parse(atob(token.split('.')[1])).role;
      } catch (e) {
        console.error('Failed to decode token for role:', e);
      }
      
      let response;
      if (userRole === 'teacher') {
        response = await axios.get(`${API}/teacher/assigned-classes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClasses(response.data.classes || []);
        
        const allSubjects = new Set();
        (response.data.classes || []).forEach(cls => {
          (cls.subjects || []).forEach(s => {
            const subjectName = typeof s === 'object' ? (s.name || s.subject_name || '') : String(s);
            if (subjectName) allSubjects.add(subjectName);
          });
        });
        setSubjects([...allSubjects]);
      } else {
        response = await axios.get(`${API}/classes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClasses(response.data || []);
        
        try {
          const subjectsRes = await axios.get(`${API}/subjects`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const subjectsList = (subjectsRes.data || []).map(s => {
            if (typeof s === 'object') {
              return String(s.name || s.subject_name || '');
            }
            return String(s);
          }).filter(s => s);
          setSubjects(subjectsList);
        } catch (subjectError) {
          console.error('Failed to fetch subjects:', subjectError);
          setSubjects([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  }, []);

  const fetchAcademicHierarchy = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get(`${API}/academic-hierarchy`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const hierarchy = response.data?.flat || response.data || { marhalas: [], departments: [], semesters: [] };
      setAcademicHierarchy(hierarchy);
    } catch (error) {
      console.error('Failed to fetch academic hierarchy:', error);
      setAcademicHierarchy({ marhalas: [], departments: [], semesters: [] });
    }
  }, []);

  useEffect(() => {
    fetchHomework();
    fetchClasses();
    fetchAcademicHierarchy();
  }, [fetchHomework, fetchClasses, fetchAcademicHierarchy]);

  const getFilteredDepartments = () => {
    return academicHierarchy.departments?.filter(d => d.marhala_id === formData.marhala_id) || [];
  };

  const getFilteredSemesters = () => {
    return academicHierarchy.semesters?.filter(s => s.department_id === formData.department_id) || [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.semester_id || !formData.subject || !formData.due_date) {
      toast.error('সমস্ত প্রয়োজনীয় ক্ষেত্র পূরণ করুন');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const formPayload = new FormData();
      formPayload.append('title', formData.title);
      formPayload.append('description', formData.description || '');
      formPayload.append('marhala_id', formData.marhala_id || '');
      formPayload.append('department_id', formData.department_id || '');
      formPayload.append('semester_id', formData.semester_id);
      formPayload.append('subject', formData.subject);
      formPayload.append('due_date', formData.due_date);
      formPayload.append('instructions', formData.instructions || '');
      
      if (file) {
        formPayload.append('file', file);
      }

      await axios.post(`${API}/homework`, formPayload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('হোমওয়ার্ক তৈরি হয়েছে');
      setShowDialog(false);
      setFormData({
        title: '',
        description: '',
        marhala_id: '',
        department_id: '',
        semester_id: '',
        subject: '',
        due_date: '',
        instructions: ''
      });
      setFile(null);
      fetchHomework();
    } catch (error) {
      console.error('Failed to create homework:', error);
      toast.error('হোমওয়ার্ক তৈরি করতে ব্যর্থ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (homeworkId) => {
    if (!window.confirm('আপনি কি এই হোমওয়ার্ক মুছে ফেলতে চান?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/homework/${homeworkId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('হোমওয়ার্ক মুছে ফেলা হয়েছে');
      fetchHomework();
    } catch (error) {
      console.error('Failed to delete homework:', error);
      toast.error('হোমওয়ার্ক মুছে ফেলতে ব্যর্থ');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'সক্রিয়';
      case 'completed': return 'সম্পন্ন';
      case 'overdue': return 'মেয়াদোত্তীর্ণ';
      default: return 'সক্রিয়';
    }
  };

  const getClassId = (cls) => {
    return String(cls.class_id || cls.id || cls._id || '');
  };

  const getClassName = (cls) => {
    const name = cls.class_name || cls.name || '';
    const section = cls.section_name || '';
    return section ? `${name} - ${section}` : String(name);
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center animate-pulse">
          <div><div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div><div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div></div>
        </div>
        <div className="space-y-4">
          {[1,2,3,4].map(i => (<div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border animate-pulse"><div className="flex justify-between mb-4"><div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div><div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div></div><div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2"></div><div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded"></div></div>))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">হোমওয়ার্ক ব্যবস্থাপনা</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">আপনার ক্লাসের জন্য হোমওয়ার্ক তৈরি ও পরিচালনা করুন</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              নতুন হোমওয়ার্ক
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>নতুন হোমওয়ার্ক তৈরি</DialogTitle>
              <DialogDescription>
                শিক্ষার্থীদের জন্য নতুন হোমওয়ার্ক যোগ করুন
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">শিরোনাম *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="হোমওয়ার্কের শিরোনাম লিখুন"
                  required
                />
              </div>

              {/* Academic Hierarchy - Marhala → Department → Semester */}
              <div>
                <Label htmlFor="marhala_id">মারহালা *</Label>
                <Select
                  value={formData.marhala_id}
                  onValueChange={(value) => setFormData({ ...formData, marhala_id: value, department_id: '', semester_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="মারহালা নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicHierarchy.marhalas?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name_bn || m.name_en || m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.marhala_id && (
                <div>
                  <Label htmlFor="department_id">বিভাগ/জামাত</Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => setFormData({ ...formData, department_id: value, semester_id: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilteredDepartments().map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name_bn || d.name_en || d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {formData.department_id && (
                <div>
                  <Label htmlFor="semester_id">সেমিস্টার *</Label>
                  <Select
                    value={formData.semester_id}
                    onValueChange={(value) => setFormData({ ...formData, semester_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="সেমিস্টার নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilteredSemesters().map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name_bn || s.name_en || s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="subject">বিষয় *</Label>
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="বিষয় নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject, index) => (
                      <SelectItem key={`subject-${index}`} value={String(subject)}>
                        {String(subject)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due_date">জমা দেওয়ার তারিখ *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">বিবরণ</Label>
                <textarea
                  id="description"
                  className="w-full min-h-[80px] p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 text-sm"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="হোমওয়ার্কের বিবরণ লিখুন"
                />
              </div>

              <div>
                <Label htmlFor="instructions">নির্দেশনা</Label>
                <textarea
                  id="instructions"
                  className="w-full min-h-[60px] p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 text-sm"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="অতিরিক্ত নির্দেশনা লিখুন"
                />
              </div>

              <div>
                <Label htmlFor="file">সংযুক্তি (ঐচ্ছিক)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    className="text-xs sm:text-sm"
                  />
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">সর্বোচ্চ ১০MB। সমর্থিত: PDF, DOC, DOCX, PNG, JPG</p>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="w-full sm:w-auto">
                  বাতিল
                </Button>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="ক্লাস অনুযায়ী ফিল্টার" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল ক্লাস</SelectItem>
            {classes.map((cls, index) => {
              const classId = getClassId(cls);
              const className = cls.class_name || cls.name || '';
              return (
                <SelectItem key={classId || `filter-class-${index}`} value={classId}>
                  {String(className)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            হোমওয়ার্ক তালিকা
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">আপনার তৈরি করা সকল হোমওয়ার্ক</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {homework.length > 0 ? (
            <div className="overflow-x-auto min-w-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">শিরোনাম</TableHead>
                    <TableHead className="hidden sm:table-cell">ক্লাস</TableHead>
                    <TableHead className="hidden md:table-cell">বিষয়</TableHead>
                    <TableHead>জমার তারিখ</TableHead>
                    <TableHead>অবস্থা</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {homework
                    .filter(hw => !selectedClass || selectedClass === 'all' || hw.class_id === selectedClass)
                    .map((hw) => (
                    <TableRow key={hw.id}>
                      <TableCell className="min-w-0">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{String(hw.title || '')}</p>
                            {hw.description && (
                              <p className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[200px]">{String(hw.description)}</p>
                            )}
                            <div className="sm:hidden mt-1 text-[10px] text-gray-500">
                              {String(hw.class_name || '')} | {String(hw.subject || '')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {String(hw.class_name || '')} {hw.section_name ? `- ${String(hw.section_name)}` : ''}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{String(hw.subject || '')}</TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {toBanglaDate(hw.due_date)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(hw.status)} className="text-[10px] sm:text-xs">
                          {getStatusLabel(hw.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          {hw.file_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = hw.file_url;
                                link.download = hw.file_name || 'attachment';
                                link.click();
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(hw.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-base sm:text-lg font-medium">এখনো কোন হোমওয়ার্ক নেই</p>
              <p className="text-xs sm:text-sm">"নতুন হোমওয়ার্ক" ক্লিক করে শুরু করুন</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Homework;
