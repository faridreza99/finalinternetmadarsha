// Update to force re-compile
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
import AcademicHierarchySelector from './AcademicHierarchySelector';

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
  // State for data
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [routines, setRoutines] = useState([]);

  // State for selection
  const [selectedMarhalaId, setSelectedMarhalaId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedMarhalaName, setSelectedMarhalaName] = useState('');
  const [selectedDepartmentName, setSelectedDepartmentName] = useState('');
  const [selectedSemesterName, setSelectedSemesterName] = useState('');
  const [selectedClass, setSelectedClass] = useState(null); // Used to track if a semester is selected for view

  // State for UI
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [schoolBranding, setSchoolBranding] = useState({
    name: '',
    address: '',
    logo_url: ''
  });

  // State for form
  const [formData, setFormData] = useState({
    day: '',
    subject: '',
    teacher_id: '',
    start_time: '',
    end_time: ''
  });

  const printRef = useRef();

  const canEdit = ['super_admin', 'admin', 'principal', 'teacher'].includes(user?.role);

  // Fetch initial data (subjects, teachers, branding)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [teachersRes, brandingRes] = await Promise.all([
          axios.get('/api/teachers'),
          axios.get('/api/institution')
        ]);

        // Create a safety check for teachers data
        const teachersData = teachersRes.data;
        if (Array.isArray(teachersData)) {
          setTeachers(teachersData);
        } else if (teachersData && Array.isArray(teachersData.teachers)) {
          setTeachers(teachersData.teachers);
        } else if (teachersData && Array.isArray(teachersData.data)) {
          setTeachers(teachersData.data);
        } else {
          console.error("Invalid teachers data format:", teachersData);
          setTeachers([]);
        }
        if (brandingRes.data) {
          setSchoolBranding({
            name: brandingRes.data.school_name || brandingRes.data.name || '',
            address: brandingRes.data.address || '',
            logo_url: brandingRes.data.logo_url || ''
          });
        }

        // Try fetching subjects if endpoint exists, otherwise ignore error
        try {
          const subjectsRes = await axios.get('/api/subjects');
          setSubjects(subjectsRes.data);
        } catch (e) {
          console.warn("Could not fetch subjects, using defaults", e);
        }

      } catch (error) {
        console.error("Error fetching initial data", error);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch routines when hierarchy selection changes
  const fetchRoutines = useCallback(async () => {
    if (!selectedSemesterId) {
      setRoutines([]);
      return;
    }

    setLoading(true);
    try {
      // Assuming API endpoint
      const response = await axios.get(`/api/madrasah/simple-routines?semester_id=${selectedSemesterId}`);
      setRoutines(response.data);
    } catch (error) {
      console.error("Error fetching routines:", error);
      // Don't clear routines on error immediately to avoid flicker if it's transient, but here we probably should
      // setRoutines([]); 
    } finally {
      setLoading(false);
    }
  }, [selectedSemesterId]);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  const handleHierarchyChange = (selection) => {
    setSelectedMarhalaId(selection.marhala_id);
    setSelectedDepartmentId(selection.department_id);
    setSelectedSemesterId(selection.semester_id);
    // Use semester_id as the key "selectedClass" to maintain logic flow
    setSelectedClass(selection.semester_id);

    setSelectedMarhalaName(selection.marhala_name || '');
    setSelectedDepartmentName(selection.department_name || '');
    setSelectedSemesterName(selection.semester_name || '');
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
      setEditingRoutine(null);
      setFormData({
        day: 'saturday',
        subject: '',
        teacher_id: 'none',
        start_time: '',
        end_time: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('আপনি কি নিশ্চিত যে আপনি এই ক্লাসটি মুছে ফেলতে চান?')) return;

    try {
      await axios.delete(`/api/madrasah/simple-routines/${id}`);
      toast.success('ক্লাস মুছে ফেলা হয়েছে');
      fetchRoutines();
    } catch (error) {
      console.error('Error deleting routine:', error);
      toast.error('মুছে ফেলতে সমস্যা হয়েছে');
    }
  };

  const handleSave = async () => {
    if (!formData.day || !formData.subject || !formData.start_time || !formData.end_time) {
      toast.error('অনুগ্রহ করে সব তথ্য পূরণ করুন');
      return;
    }

    setSaving(true);
    try {
      const teacher = teachers.find(t => t.id === formData.teacher_id);
      const actualTeacherId = formData.teacher_id === 'none' ? null : formData.teacher_id;

      const payload = {
        ...formData,
        teacher_id: actualTeacherId,
        teacher_name: teacher?.name || '',
        semester_id: selectedSemesterId,
        class_id: selectedSemesterId, // Backward compatibility
        class_name: selectedSemesterName || 'Unknown',
        marhala_id: selectedMarhalaId,
        department_id: selectedDepartmentId
      };

      if (editingRoutine) {
        await axios.put(`/api/madrasah/simple-routines/${editingRoutine.id}`, payload);
        toast.success('রুটিন আপডেট করা হয়েছে');
      } else {
        await axios.post('/api/madrasah/simple-routines', payload);
        toast.success('নতুন ক্লাস যোগ করা হয়েছে');
      }

      setIsDialogOpen(false);
      fetchRoutines();
    } catch (error) {
      console.error('Error saving routine:', error);
      toast.error('সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const getRoutinesByDay = (day) => {
    return routines.filter(r => r.day === day).sort((a, b) => {
      return a.start_time.localeCompare(b.start_time);
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const fullHierarchyName = [selectedMarhalaName, selectedDepartmentName, selectedSemesterName].filter(Boolean).join(' | ');

    // Generate table rows for each day
    const dayRows = DAYS.map(day => {
      const dayRoutines = getRoutinesByDay(day.value);
      if (dayRoutines.length === 0) return ''; // Skip empty days or show placeholder? Better to show row.

      // If we want a table where rows are days
      const routineCells = dayRoutines.map(r => `
            <div style="border: 1px solid #ddd; padding: 5px; margin: 2px; border-radius: 4px; background: #f9f9f9;">
                <div style="font-weight: bold;">${r.subject}</div>
                <div style="font-size: 12px;">${r.start_time} - ${r.end_time}</div>
                ${r.teacher_name ? `<div style="font-size: 11px; color: #666;">${r.teacher_name}</div>` : ''}
            </div>
        `).join('');

      return `
            <tr>
                <td style="font-weight: bold; width: 100px;">${day.label}</td>
                <td style="text-align: left; display: flex; flex-wrap: wrap; gap: 5px;">${routineCells || 'কোন ক্লাস নেই'}</td>
            </tr>
        `;
    }).join('');

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
          th, td { border: 1px solid #333; padding: 10px; text-align: center; vertical-align: middle; }
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
          <p style="font-size: 16px; margin-top: 5px; color: #1a5f2a;">${fullHierarchyName}</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>দিন</th>
                    <th style="flex: 1;">ক্লাস সমূহ</th>
                </tr>
            </thead>
            <tbody>
                ${dayRows}
            </tbody>
        </table>

        <div class="footer">
          <p>প্রিন্ট এর তারিখ: ${new Date().toLocaleDateString('bn-BD')}</p>
          <p>Powered by Internet Madrasah</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

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
          <div className="flex flex-col gap-4">
            <AcademicHierarchySelector
              onSelectionChange={handleHierarchyChange}
              selectedMarhalaId={selectedMarhalaId}
              selectedDepartmentId={selectedDepartmentId}
              selectedSemesterId={selectedSemesterId}
              showLabels={true}
              inline={true}
            />

            <div className="flex justify-end gap-3 mt-4">
              {selectedClass && canEdit && (
                <Button
                  onClick={() => handleOpenDialog()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
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
              <Select value={formData.day} onValueChange={(v) => setFormData({ ...formData, day: v })}>
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
              <Select value={formData.subject} onValueChange={(v) => setFormData({ ...formData, subject: v })}>
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
              <Select value={formData.teacher_id} onValueChange={(v) => setFormData({ ...formData, teacher_id: v })}>
                <SelectTrigger className="h-11 mt-1">
                  <SelectValue placeholder="শিক্ষক বাছুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="py-2">কেউ না</SelectItem>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id || "teacher-" + teacher.name} className="py-2">
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
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="h-11 mt-1"
                />
              </div>
              <div>
                <Label className="text-base">শেষের সময়</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
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
