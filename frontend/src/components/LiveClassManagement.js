import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
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
import { Badge } from './ui/badge';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Video,
  Users,
  Calendar,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_API_URL || '/api';

const MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const toBengaliNumeral = (num) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bengaliDigits[parseInt(d)]);
};

const LiveClassManagement = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    class_name: '',
    gender: '',
    start_time: '',
    end_time: '',
    teacher_id: '',
    teacher_name: '',
    month: '',
    year: new Date().getFullYear(),
    telegram_link: '',
    is_active: true
  });

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        setLoading(false);
        return;
      }
      const response = await axios.get(`${API}/live-classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data.classes || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        toast.error('লাইভ ক্লাস লোড করতে ব্যর্থ');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found for teachers fetch');
        return;
      }
      const response = await axios.get(`${API}/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const staffList = response.data || [];
      const teachersList = staffList.filter(s => 
        s.role === 'teacher' || 
        (s.designation && typeof s.designation === 'string' && s.designation.toLowerCase().includes('teacher'))
      );
      setTeachers(teachersList);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
      setTeachers([]);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, [fetchClasses, fetchTeachers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      if (editingClass) {
        await axios.put(`${API}/live-classes/${editingClass.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('লাইভ ক্লাস আপডেট হয়েছে');
      } else {
        await axios.post(`${API}/live-classes`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('লাইভ ক্লাস তৈরি হয়েছে');
      }
      
      setIsDialogOpen(false);
      setEditingClass(null);
      resetForm();
      fetchClasses();
    } catch (error) {
      console.error('Failed to save class:', error);
      toast.error(error.response?.data?.detail || 'ক্লাস সংরক্ষণ করতে ব্যর্থ');
    }
  };

  const handleEdit = (liveClass) => {
    setEditingClass(liveClass);
    setFormData({
      class_name: liveClass.class_name || '',
      gender: liveClass.gender || '',
      start_time: liveClass.start_time || '',
      end_time: liveClass.end_time || '',
      teacher_id: liveClass.teacher_id || '',
      teacher_name: liveClass.teacher_name || '',
      month: liveClass.month || '',
      year: liveClass.year || new Date().getFullYear(),
      telegram_link: liveClass.telegram_link || '',
      is_active: liveClass.is_active !== false
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (classId) => {
    if (!window.confirm('আপনি কি এই ক্লাসটি মুছে ফেলতে চান?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/live-classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('লাইভ ক্লাস মুছে ফেলা হয়েছে');
      fetchClasses();
    } catch (error) {
      console.error('Failed to delete class:', error);
      toast.error('ক্লাস মুছে ফেলতে ব্যর্থ');
    }
  };

  const resetForm = () => {
    setFormData({
      class_name: '',
      gender: '',
      start_time: '',
      end_time: '',
      teacher_id: '',
      teacher_name: '',
      month: '',
      year: new Date().getFullYear(),
      telegram_link: '',
      is_active: true
    });
  };

  const handleTeacherChange = (teacherId) => {
    const teacher = teachers.find(t => (t.staff_id || t.id || '') === teacherId);
    const teacherName = teacher ? (teacher.name || teacher.full_name || '') : '';
    setFormData({
      ...formData,
      teacher_id: teacherId,
      teacher_name: teacherName
    });
  };

  const getTeacherId = (teacher) => {
    return String(teacher.staff_id || teacher.id || teacher._id || '');
  };

  const getTeacherName = (teacher) => {
    return String(teacher.name || teacher.full_name || 'Unknown');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            লাইভ ক্লাস ব্যবস্থাপনা
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            শিক্ষার্থীদের জন্য লাইভ ক্লাস তৈরি ও পরিচালনা করুন
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingClass(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              নতুন লাইভ ক্লাস
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingClass ? 'লাইভ ক্লাস সম্পাদনা' : 'নতুন লাইভ ক্লাস তৈরি'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="class_name">ক্লাসের নাম</Label>
                <Input
                  id="class_name"
                  value={formData.class_name}
                  onChange={(e) => setFormData({...formData, class_name: e.target.value})}
                  placeholder="ক্লাসের নাম লিখুন"
                  required
                />
              </div>

              <div>
                <Label htmlFor="gender">লিঙ্গ</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({...formData, gender: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="লিঙ্গ নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">পুরুষ</SelectItem>
                    <SelectItem value="female">মহিলা</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">শুরুর সময়</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">শেষের সময়</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="teacher">শিক্ষক নির্বাচন</Label>
                <Select
                  value={formData.teacher_id}
                  onValueChange={handleTeacherChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="শিক্ষক নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher, index) => {
                      const teacherId = getTeacherId(teacher);
                      const teacherName = getTeacherName(teacher);
                      return (
                        <SelectItem key={teacherId || `teacher-${index}`} value={teacherId}>
                          {teacherName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="month">মাস</Label>
                  <Select
                    value={formData.month}
                    onValueChange={(value) => setFormData({...formData, month: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="মাস নির্বাচন" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month} value={month}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="year">বছর</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                    min={2024}
                    max={2030}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="telegram_link">টেলিগ্রাম লিংক</Label>
                <Input
                  id="telegram_link"
                  value={formData.telegram_link}
                  onChange={(e) => setFormData({...formData, telegram_link: e.target.value})}
                  placeholder="https://t.me/..."
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="is_active">সক্রিয়</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  বাতিল
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  {editingClass ? 'আপডেট' : 'তৈরি করুন'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Video className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">মোট ক্লাস</p>
                <p className="text-xl font-bold">{toBengaliNumeral(classes.length)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">পুরুষ ক্লাস</p>
                <p className="text-xl font-bold">{toBengaliNumeral(classes.filter(c => c.gender === 'male').length)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Users className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">মহিলা ক্লাস</p>
                <p className="text-xl font-bold">{toBengaliNumeral(classes.filter(c => c.gender === 'female').length)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">সক্রিয় ক্লাস</p>
                <p className="text-xl font-bold">{toBengaliNumeral(classes.filter(c => c.is_active).length)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            লাইভ ক্লাস তালিকা
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ক্লাসের নাম</TableHead>
                <TableHead>লিঙ্গ</TableHead>
                <TableHead>সময়</TableHead>
                <TableHead>শিক্ষক</TableHead>
                <TableHead>মাস</TableHead>
                <TableHead>অবস্থা</TableHead>
                <TableHead>অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    কোন লাইভ ক্লাস নেই। প্রথম ক্লাস তৈরি করুন!
                  </TableCell>
                </TableRow>
              ) : (
                classes.map((liveClass) => (
                  <TableRow key={liveClass.id}>
                    <TableCell className="font-medium">{String(liveClass.class_name || '')}</TableCell>
                    <TableCell>
                      <Badge variant={liveClass.gender === 'male' ? 'default' : 'secondary'}>
                        {liveClass.gender === 'male' ? 'পুরুষ' : 'মহিলা'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {String(liveClass.start_time || '')} - {String(liveClass.end_time || '')}
                    </TableCell>
                    <TableCell>{String(liveClass.teacher_name || '')}</TableCell>
                    <TableCell>{String(liveClass.month || '')} {liveClass.year ? toBengaliNumeral(liveClass.year) : ''}</TableCell>
                    <TableCell>
                      <Badge variant={liveClass.is_active ? 'success' : 'destructive'}>
                        {liveClass.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(liveClass)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(liveClass.id)}
                        >
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
};

export default LiveClassManagement;
