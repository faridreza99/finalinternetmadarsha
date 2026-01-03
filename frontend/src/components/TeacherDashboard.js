import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Users,
  BookOpen,
  Calendar,
  Bell,
  CheckCircle,
  AlertCircle,
  BookMarked,
  ClipboardList,
  FileText,
  GraduationCap,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_API_URL || '/api';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/teacher/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch teacher dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

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
          <CardContent className="py-8 text-center text-gray-500 dark:text-gray-400">
            Unable to load dashboard. Please try again later.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { teacher, today, assigned, attendance_summary, pending_tasks, notifications } = dashboardData;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
            Welcome, {teacher?.name || 'Teacher'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {teacher?.designation || 'Teacher'} | {today?.day}, {new Date(today?.date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => navigate('/attendance')} className="w-full sm:w-auto flex items-center justify-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Take Attendance
          </Button>
          <Button variant="outline" onClick={() => navigate('/homework')} className="w-full sm:w-auto flex items-center justify-center gap-2">
            <FileText className="h-4 w-4" />
            Add Homework
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Today's Classes</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{today?.total_periods || 0}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900 rounded-full flex-shrink-0">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Total Students</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{assigned?.total_students || 0}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900 rounded-full flex-shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Assigned Classes</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{assigned?.classes?.length || 0}</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900 rounded-full flex-shrink-0">
                <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Subjects</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{assigned?.subjects?.length || 0}</p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-100 dark:bg-orange-900 rounded-full flex-shrink-0">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {attendance_summary && attendance_summary.total > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Today's Attendance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 sm:pt-0">
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full"></span>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Present:</span>
                <span className="text-xs sm:text-sm font-semibold text-green-600">{attendance_summary.present}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full"></span>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Absent:</span>
                <span className="text-xs sm:text-sm font-semibold text-red-600">{attendance_summary.absent}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-orange-500 rounded-full"></span>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Late:</span>
                <span className="text-xs sm:text-sm font-semibold text-orange-600">{attendance_summary.late}</span>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total:</span>
                <span className="text-xs sm:text-sm font-semibold">{attendance_summary.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Today's Schedule
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Your classes for {today?.day}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 sm:pt-0">
            {today?.classes && today.classes.length > 0 ? (
              <div className="space-y-3">
                {today.classes.map((cls, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-center min-w-[50px] sm:min-w-[60px]">
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Period</p>
                        <p className="text-base sm:text-lg font-bold text-blue-600">{cls.period_number}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">
                          {cls.class_name} {cls.section && `- ${cls.section}`}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{cls.subject}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] sm:text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {cls.start_time} - {cls.end_time}
                      </p>
                      {cls.room_number && (
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Room: {cls.room_number}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-base sm:text-lg font-medium">No classes today</p>
                <p className="text-xs sm:text-sm">Enjoy your day off!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Pending Tasks
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Tasks that need your attention</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 sm:pt-0">
            {pending_tasks && pending_tasks.length > 0 ? (
              <div className="space-y-3">
                {pending_tasks.map((task, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {task.type === 'marks_entry' ? (
                        <BookMarked className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      ) : (
                        <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                        {task.class_name && (
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{task.class_name}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px] sm:text-xs">
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-green-500" />
                <p className="text-base sm:text-lg font-medium">All caught up!</p>
                <p className="text-xs sm:text-sm">No pending tasks</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              My Classes & Subjects
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 sm:pt-0">
            <div className="space-y-4">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Classes</p>
                <div className="flex flex-wrap gap-2">
                  {assigned?.classes?.map((cls, index) => (
                    <Badge key={index} variant="outline" className="text-[10px] sm:text-xs">
                      {cls}
                    </Badge>
                  ))}
                  {(!assigned?.classes || assigned.classes.length === 0) && (
                    <span className="text-xs sm:text-sm text-gray-500">No classes assigned</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {assigned?.subjects?.map((subject, index) => (
                    <Badge key={index} variant="secondary" className="text-[10px] sm:text-xs">
                      {subject}
                    </Badge>
                  ))}
                  {(!assigned?.subjects || assigned.subjects.length === 0) && (
                    <span className="text-xs sm:text-sm text-gray-500">No subjects assigned</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-600" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 sm:pt-0">
            {notifications && notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notif, index) => (
                  <div 
                    key={notif.id || index}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 min-w-0"
                  >
                    <Bell className="h-4 w-4 text-blue-600 mt-0.5 sm:mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm truncate">{notif.title}</p>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">{notif.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">No new notifications</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 sm:pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-3 sm:py-4 flex flex-col items-center gap-2 text-xs sm:text-sm"
              onClick={() => navigate('/attendance')}
            >
              <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              <span>Attendance</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 sm:py-4 flex flex-col items-center gap-2 text-xs sm:text-sm"
              onClick={() => navigate('/homework')}
            >
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              <span>Homework</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 sm:py-4 flex flex-col items-center gap-2 text-xs sm:text-sm"
              onClick={() => navigate('/lesson-plans')}
            >
              <BookMarked className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              <span>Lesson Plans</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 sm:py-4 flex flex-col items-center gap-2 text-xs sm:text-sm"
              onClick={() => navigate('/results')}
            >
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              <span>Enter Marks</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherDashboard;
