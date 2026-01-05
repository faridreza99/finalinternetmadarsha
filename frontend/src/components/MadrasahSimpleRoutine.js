import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Clock,
  Plus,
  Edit,
  Trash2,
  Printer,
  BookOpen,
  User,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const DAYS = [
  { value: 'saturday', label: 'শনিবার' },
  { value: 'sunday', label: 'রবিবার' },
  { value: 'monday', label: 'সোমবার' },
  { value: 'tuesday', label: 'মঙ্গলবার' },
  { value: 'wednesday', label: 'বুধবার' },
  { value: 'thursday', label: 'বৃহস্পতিবার' }
];

const MadrasahSimpleRoutine = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [schoolBranding, setSchoolBranding] = useState({ name: '', address: '', logo_url: '' });
  const printRef = useRef();

  const [formData, setFormData] = useState({
    day: '',
    subject: '',
    teacher_id: '',
    start_time: '',
    end_time: ''
  });

  const canEdit = ['super_admin', 'admin', 'principal', 'teacher'].includes(user?.role);

  const fetchClasses = useCallback(async () => {
    try {
      const response = await axios.get('/api/classes');
      const classData = Array.isArray(response.data) ? response.data : (response.data?.classes || response.data?.data || []);
      const madrasahClasses = classData.filter(c => 
        c.institution_type === 'madrasah' || c.display_name?.includes('ইবতেদায়ী') || 
        c.display_name?.includes('দাখিল') || c.display_name?.includes('আলিম')
      );
      setClasses(madrasahClasses.length > 0 ? madrasahClasses : classData);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await axios.get('/api/subjects');
      const subjectData = Array.isArray(response.data) ? response.data : (response.data?.subjects || response.data?.data || []);
      setSubjects(subjectData);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const response = await axios.get('/api/staff');
      // Include all staff - in madrasah, any staff can be a teacher (উস্তাদ, মুদাররিস, etc.)
      const teachersList = response.data || [];
      setTeachers(teachersList);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  }, []);

  const fetchRoutines = useCallback(async () => {
    if (!selectedClass) {
      setRoutines([]);
      return;
    }
    try {
      const response = await axios.get(`/api/madrasah/simple-routines?class_id=${selectedClass}`);
      setRoutines(response.data || []);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching routines:', error);
      }
      setRoutines([]);
    }
  }, [selectedClass]);

  const fetchSchoolBranding = useCallback(async () => {
    try {
      const response = await axios.get('/api/institution');
      if (response.data) {
        setSchoolBranding({
          name: response.data.name || '',
          address: response.data.address || '',
          logo_url: response.data.logo_url || ''
        });
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchClasses(), fetchSubjects(), fetchTeachers(), fetchSchoolBranding()]);
      setLoading(false);
    };
    init();
  }, [fetchClasses, fetchSubjects, fetchTeachers, fetchSchoolBranding]);

  useEffect(() => {
    if (selectedClass) {
      fetchRoutines();
    }
  }, [selectedClass, fetchRoutines]);

  const resetForm = () => {
    setFormData({
      day: '',
      subject: '',
      teacher_id: 'none',
      start_time: '',
      end_time: ''
    });
    setEditingRoutine(null);
  };

  const handleOpenDialog = (routine = null) => {
    if (routine) {
      setEditingRoutine(routine);
      setFormData({
        day: routine.day,
        subject: routine.subject,
        teacher_id: routine.teacher_id || 'none',
        start_time: routine.start_time,
        end_time: routine.end_time
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.day || !formData.subject || !formData.start_time || !formData.end_time) {
      toast.error('সব তথ্য পূরণ করুন');
      return;
    }

    setSaving(true);
    try {
      const actualTeacherId = formData.teacher_id === 'none' ? '' : formData.teacher_id;
      const teacher = teachers.find(t => t.id === actualTeacherId);
      const payload = {
        ...formData,
        teacher_id: actualTeacherId,
        class_id: selectedClass,
        class_name: classes.find(c => c.id === selectedClass)?.display_name || classes.find(c => c.id === selectedClass)?.name,
        teacher_name: teacher?.name || ''
      };

      if (editingRoutine) {
        await axios.put(`/api/madrasah/simple-routines/${editingRoutine.id}`, payload);
        toast.success('রুটিন আপডেট হয়েছে');
      } else {
        await axios.post('/api/madrasah/simple-routines', payload);
        toast.success('রুটিন যোগ হয়েছে');
      }

      await fetchRoutines();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving routine:', error);
      toast.error('রুটিন সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (routineId) => {
    if (!window.confirm('আপনি কি এই রুটিন মুছে ফেলতে চান?')) return;
    
    try {
      await axios.delete(`/api/madrasah/simple-routines/${routineId}`);
      toast.success('রুটিন মুছে ফেলা হয়েছে');
      await fetchRoutines();
    } catch (error) {
      console.error('Error deleting routine:', error);
      toast.error('রুটিন মুছতে সমস্যা হয়েছে');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const selectedClassName = classes.find(c => c.id === selectedClass)?.display_name || classes.find(c => c.id === selectedClass)?.name;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>রুটিন - ${schoolBranding.name}</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: 'SolaimanLipi', 'Kalpurush', Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .logo { max-height: 60px; margin-bottom: 10px; }
          h1 { font-size: 24px; margin: 5px 0; color: #1a5f2a; }
          h2 { font-size: 18px; margin: 5px 0; color: #333; }
          .info { font-size: 14px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #333; padding: 10px; text-align: center; }
          th { background: #1a5f2a; color: white; }
          tr:nth-child(even) { background: #f5f5f5; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          ${schoolBranding.logo_url ? `<img src="${schoolBranding.logo_url}" class="logo" alt="Logo"/>` : ''}
          <h1>${schoolBranding.name || 'মাদ্রাসা'}</h1>
          <p class="info">${schoolBranding.address || ''}</p>
          <h2>সাপ্তাহিক রুটিন</h2>
          <p>মারহালা: ${selectedClassName}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>দিন</th>
              <th>বিষয়</th>
              <th>শিক্ষক</th>
              <th>সময়</th>
            </tr>
          </thead>
          <tbody>
            ${DAYS.map(day => {
              const dayRoutines = routines.filter(r => r.day === day.value).sort((a, b) => a.start_time.localeCompare(b.start_time));
              if (dayRoutines.length === 0) {
                return `<tr><td>${day.label}</td><td colspan="3">কোন ক্লাস নেই</td></tr>`;
              }
              return dayRoutines.map((routine, idx) => `
                <tr>
                  ${idx === 0 ? `<td rowspan="${dayRoutines.length}">${day.label}</td>` : ''}
                  <td>${routine.subject}</td>
                  <td>${routine.teacher_name || '-'}</td>
                  <td>${routine.start_time} - ${routine.end_time}</td>
                </tr>
              `).join('');
            }).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>প্রকাশের তারিখ: ${new Date().toLocaleDateString('bn-BD')}</p>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const getRoutinesByDay = (day) => {
    return routines.filter(r => r.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
            <Clock className="h-7 w-7" />
            সহজ রুটিন সিস্টেম
          </CardTitle>
          <p className="text-emerald-100 text-sm mt-1">মারহালা নির্বাচন করে সাপ্তাহিক রুটিন তৈরি করুন</p>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                মারহালা নির্বাচন করুন
              </label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="মারহালা বাছাই করুন" />
                </SelectTrigger>
                <SelectContent>
                  {classes.filter(cls => cls.id).map(cls => (
                    <SelectItem key={cls.id} value={cls.id} className="text-base py-3">
                      {cls.display_name || cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedClass && canEdit && (
              <Button 
                onClick={() => handleOpenDialog()}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Plus className="h-5 w-5" />
                নতুন ক্লাস যোগ করুন
              </Button>
            )}
            
            {selectedClass && routines.length > 0 && (
              <Button 
                onClick={handlePrint}
                size="lg"
                variant="outline"
                className="gap-2"
              >
                <Printer className="h-5 w-5" />
                রুটিন প্রিন্ট করুন
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClass && (
        <div ref={printRef} className="space-y-4">
          {DAYS.map(day => {
            const dayRoutines = getRoutinesByDay(day.value);
            
            return (
              <Card key={day.value}>
                <CardHeader className="py-3 bg-gray-50 dark:bg-gray-800/50">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    {day.label}
                    <Badge variant="secondary" className="ml-2">
                      {dayRoutines.length} ক্লাস
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {dayRoutines.length === 0 ? (
                    <div className="py-6 text-center text-gray-500">
                      এই দিনে কোন ক্লাস নেই
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {dayRoutines.map(routine => (
                        <div key={routine.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Clock className="h-4 w-4 text-emerald-600" />
                              <span className="font-medium">
                                {routine.start_time} - {routine.end_time}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">{routine.subject}</span>
                            </div>
                            {routine.teacher_name && (
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <User className="h-4 w-4" />
                                <span>{routine.teacher_name}</span>
                              </div>
                            )}
                          </div>
                          
                          {canEdit && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(routine)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(routine.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!selectedClass && (
        <Card className="border-dashed border-2 border-gray-300 dark:border-gray-700">
          <CardContent className="py-16 text-center">
            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">
              মারহালা নির্বাচন করুন
            </h3>
            <p className="text-gray-500">
              উপরে থেকে মারহালা বাছাই করলে রুটিন দেখাবে
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingRoutine ? 'রুটিন সম্পাদনা' : 'নতুন ক্লাস যোগ করুন'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-base">দিন</Label>
              <Select value={formData.day} onValueChange={(v) => setFormData({...formData, day: v})}>
                <SelectTrigger className="h-11 mt-1">
                  <SelectValue placeholder="দিন বাছুন" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map(day => (
                    <SelectItem key={day.value} value={day.value} className="py-2">
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base">বিষয়</Label>
              <Select value={formData.subject} onValueChange={(v) => setFormData({...formData, subject: v})}>
                <SelectTrigger className="h-11 mt-1">
                  <SelectValue placeholder="বিষয় বাছুন" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.filter(s => s.subject_name).map(subject => (
                    <SelectItem key={subject.id} value={subject.subject_name} className="py-2">
                      {subject.subject_name}
                    </SelectItem>
                  ))}
                  <SelectItem value="কুরআন" className="py-2">কুরআন</SelectItem>
                  <SelectItem value="হাদিস" className="py-2">হাদিস</SelectItem>
                  <SelectItem value="ফিকহ" className="py-2">ফিকহ</SelectItem>
                  <SelectItem value="আরবি" className="py-2">আরবি</SelectItem>
                  <SelectItem value="বাংলা" className="py-2">বাংলা</SelectItem>
                  <SelectItem value="ইংরেজি" className="py-2">ইংরেজি</SelectItem>
                  <SelectItem value="গণিত" className="py-2">গণিত</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base">শিক্ষক (ঐচ্ছিক)</Label>
              <Select value={formData.teacher_id} onValueChange={(v) => setFormData({...formData, teacher_id: v})}>
                <SelectTrigger className="h-11 mt-1">
                  <SelectValue placeholder="শিক্ষক বাছুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="py-2">কেউ না</SelectItem>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id || `teacher-${teacher.name}`} className="py-2">
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-base">শুরুর সময়</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  className="h-11 mt-1"
                />
              </div>
              <div>
                <Label className="text-base">শেষের সময়</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  className="h-11 mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              বাতিল
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MadrasahSimpleRoutine;
