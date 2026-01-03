import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
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
  BookMarked,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  Edit,
  Trash2,
  Target,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_API_URL || 'https://portal.mahajampurdarbarsharif.org/api';

const LessonPlans = () => {
  const [loading, setLoading] = useState(true);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    class_id: '',
    section_id: '',
    subject: '',
    topic: '',
    objectives: '',
    content: '',
    activities: '',
    resources: '',
    planned_date: '',
    duration_minutes: 45
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchLessonPlans = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/lesson-plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLessonPlans(response.data.lesson_plans || []);
    } catch (error) {
      console.error('Failed to fetch lesson plans:', error);
      toast.error('Failed to load lesson plans');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const userRole = JSON.parse(atob(token.split('.')[1])).role;
      
      let response;
      if (userRole === 'teacher') {
        response = await axios.get(`${API}/teacher/assigned-classes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClasses(response.data.classes || []);
        
        const allSubjects = new Set();
        (response.data.classes || []).forEach(cls => {
          (cls.subjects || []).forEach(s => allSubjects.add(s));
        });
        setSubjects([...allSubjects]);
      } else {
        response = await axios.get(`${API}/classes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClasses(response.data || []);
        
        const subjectsRes = await axios.get(`${API}/subjects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubjects((subjectsRes.data || []).map(s => s.name || s));
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  }, []);

  useEffect(() => {
    fetchLessonPlans();
    fetchClasses();
  }, [fetchLessonPlans, fetchClasses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.class_id || !formData.subject || !formData.topic) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const formPayload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formPayload.append(key, value || '');
      });

      await axios.post(`${API}/lesson-plans`, formPayload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Lesson plan created successfully');
      setShowDialog(false);
      setFormData({
        title: '',
        class_id: '',
        section_id: '',
        subject: '',
        topic: '',
        objectives: '',
        content: '',
        activities: '',
        resources: '',
        planned_date: '',
        duration_minutes: 45
      });
      fetchLessonPlans();
    } catch (error) {
      console.error('Failed to create lesson plan:', error);
      toast.error('Failed to create lesson plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (planId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const formPayload = new FormData();
      formPayload.append('status', newStatus);
      
      await axios.put(`${API}/lesson-plans/${planId}`, formPayload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Lesson plan status updated');
      fetchLessonPlans();
    } catch (error) {
      console.error('Failed to update lesson plan:', error);
      toast.error('Failed to update lesson plan');
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this lesson plan?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/lesson-plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Lesson plan deleted');
      fetchLessonPlans();
    } catch (error) {
      console.error('Failed to delete lesson plan:', error);
      toast.error('Failed to delete lesson plan');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'planned': return 'outline';
      case 'in_progress': return 'default';
      case 'completed': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredPlans = lessonPlans.filter(plan => 
    statusFilter === 'all' || plan.status === statusFilter
  );

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">Lesson Plans</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Plan and track your teaching lessons</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              New Lesson Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>Create Lesson Plan</DialogTitle>
              <DialogDescription>
                Plan your teaching lesson with objectives and activities
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Lesson plan title"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="topic">Topic *</Label>
                  <Input
                    id="topic"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="Main topic"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="class">Class *</Label>
                  <Select
                    value={formData.class_id}
                    onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.class_id || cls.id} value={cls.class_id || cls.id}>
                          {cls.class_name || cls.name} {cls.section_name && `- ${cls.section_name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => setFormData({ ...formData, subject: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject, index) => (
                        <SelectItem key={index} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="planned_date">Planned Date</Label>
                  <Input
                    id="planned_date"
                    type="date"
                    value={formData.planned_date}
                    onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    min="15"
                    max="180"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="objectives">Learning Objectives</Label>
                <textarea
                  id="objectives"
                  className="w-full min-h-[60px] p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 text-sm"
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  placeholder="What students will learn..."
                />
              </div>

              <div>
                <Label htmlFor="content">Lesson Content</Label>
                <textarea
                  id="content"
                  className="w-full min-h-[80px] p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 text-sm"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Main content to be covered..."
                />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? 'Creating...' : 'Create Lesson Plan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6 p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Planned</p>
                <p className="text-xl sm:text-2xl font-bold">{lessonPlans.filter(p => p.status === 'planned').length}</p>
              </div>
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 opacity-50 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">In Progress</p>
                <p className="text-xl sm:text-2xl font-bold">{lessonPlans.filter(p => p.status === 'in_progress').length}</p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 opacity-50 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 md:col-span-1">
          <CardContent className="pt-6 p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Completed</p>
                <p className="text-xl sm:text-2xl font-bold">{lessonPlans.filter(p => p.status === 'completed').length}</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 opacity-50 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-purple-600" />
            Lesson Plans
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Your teaching plans and progress</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 sm:pt-0">
          {filteredPlans.length > 0 ? (
            <div className="space-y-4">
              {filteredPlans.map((plan) => (
                <div 
                  key={plan.id}
                  className="p-3 sm:p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">{plan.title}</h3>
                        <Badge variant={getStatusColor(plan.status)} className="flex items-center gap-1 text-[10px] sm:text-xs">
                          {getStatusIcon(plan.status)}
                          {plan.status || 'Planned'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] sm:text-sm text-gray-600 dark:text-gray-400">
                        <div className="truncate">
                          <span className="font-medium">Class:</span> {plan.class_name}
                        </div>
                        <div className="truncate">
                          <span className="font-medium">Subject:</span> {plan.subject}
                        </div>
                        <div className="truncate">
                          <span className="font-medium">Topic:</span> {plan.topic}
                        </div>
                        <div className="truncate">
                          <span className="font-medium">Duration:</span> {plan.duration_minutes} min
                        </div>
                      </div>
                      {plan.objectives && (
                        <div className="mt-2 text-xs sm:text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Objectives:</span>
                          <p className="text-gray-600 dark:text-gray-400 line-clamp-2">{plan.objectives}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {plan.status !== 'completed' && (
                        <Select
                          value={plan.status}
                          onValueChange={(value) => handleStatusUpdate(plan.id, value)}
                        >
                          <SelectTrigger className="w-[110px] sm:w-[130px] h-8 sm:h-9 text-[11px] sm:text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <BookMarked className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-base sm:text-lg font-medium">No lesson plans yet</p>
              <p className="text-xs sm:text-sm">Click "New Lesson Plan" to create your first plan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LessonPlans;
