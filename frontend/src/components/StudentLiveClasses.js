import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { toast } from 'sonner';
import { Video, Clock, ExternalLink, Lock, AlertCircle, Calendar } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '/api';

const toBengaliNumeral = (num) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bengaliDigits[parseInt(d)]);
};

const StudentLiveClasses = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [accessStatus, setAccessStatus] = useState(null);

  const fetchAccessStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/student/access-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccessStatus(response.data);
      return response.data.has_paid;
    } catch (error) {
      console.error('Failed to fetch access status:', error);
      return true;
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/student/live-classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setClasses(response.data.classes || []);
      setPaymentRequired(response.data.payment_required || false);
    } catch (error) {
      console.error('Failed to fetch live classes:', error);
      if (error.response?.status === 400) {
        toast.error('ছাত্র হিসাবে লগইন করুন');
      } else {
        toast.error('লাইভ ক্লাস লোড করতে সমস্যা হয়েছে');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccessStatus().then(() => {
      fetchClasses();
    });
  }, [fetchAccessStatus, fetchClasses]);

  const handleJoinClass = async (liveClass) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/student/join-class/${liveClass.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.attendance_marked) {
        toast.success('হাজিরা সম্পন্ন হয়েছে!');
      }
      
      if (response.data.telegram_link) {
        window.open(response.data.telegram_link, '_blank');
      }
    } catch (error) {
      console.error('Failed to join class:', error);
      toast.error(error.response?.data?.detail || 'ক্লাসে যোগ দিতে সমস্যা হয়েছে');
    }
  };

  const getStatusBadge = (status, statusText) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-green-500 text-white animate-pulse">🔴 এখন লাইভ</Badge>;
      case 'not_started':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">শীঘ্রই শুরু হবে</Badge>;
      case 'ended':
        return <Badge variant="outline" className="text-gray-500">শেষ হয়েছে</Badge>;
      default:
        return <Badge variant="outline">{statusText || status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <span className="ml-3 text-gray-600">লোড হচ্ছে...</span>
      </div>
    );
  }

  if (paymentRequired) {
    return (
      <div className="p-6">
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-orange-100 dark:bg-orange-800/30 rounded-full">
                <Lock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-xl font-bold text-orange-800 dark:text-orange-300">পেমেন্ট প্রয়োজন</h2>
              <p className="text-orange-700 dark:text-orange-400">
                লাইভ ক্লাস দেখতে মাসিক ফি পরিশোধ করুন।
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-500">
                পেমেন্টের জন্য অফিসে যোগাযোগ করুন।
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Video className="w-6 h-6 text-emerald-600" />
          লাইভ ক্লাস
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          আপনার নির্ধারিত লাইভ ক্লাসে যোগ দিন
        </p>
      </div>

      {accessStatus && !accessStatus.has_paid && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-yellow-700 dark:text-yellow-300">
                {accessStatus.current_month} {toBengaliNumeral(accessStatus.current_year)} মাসের পেমেন্ট বাকি আছে।
                কিছু ফিচার সীমাবদ্ধ থাকতে পারে।
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            এই মাসের ক্লাস সমূহ
            {accessStatus && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({accessStatus.current_month} {toBengaliNumeral(accessStatus.current_year)})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Video className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg">এই মাসে কোনো লাইভ ক্লাস নির্ধারিত নেই</p>
              <p className="text-sm mt-2">নতুন ক্লাস যোগ হলে এখানে দেখা যাবে</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ক্লাসের নাম</TableHead>
                    <TableHead>শুরু</TableHead>
                    <TableHead>শেষ</TableHead>
                    <TableHead>উস্তাদ</TableHead>
                    <TableHead>অবস্থা</TableHead>
                    <TableHead>অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((liveClass) => (
                    <TableRow key={liveClass.id} className={liveClass.status === 'live' ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                      <TableCell className="font-medium">{liveClass.class_name}</TableCell>
                      <TableCell>{liveClass.start_time}</TableCell>
                      <TableCell>{liveClass.end_time}</TableCell>
                      <TableCell>{liveClass.teacher_name}</TableCell>
                      <TableCell>{getStatusBadge(liveClass.status, liveClass.status_text)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleJoinClass(liveClass)}
                          disabled={liveClass.status !== 'live'}
                          className={liveClass.status === 'live' 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                            : 'opacity-50'
                          }
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          {liveClass.status === 'live' ? 'যোগ দিন' : liveClass.status_text}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium">লাইভ ক্লাসে যোগ দেওয়ার নিয়ম:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-blue-600 dark:text-blue-400">
                <li>ক্লাস শুরু হলে "যোগ দিন" বাটন সক্রিয় হবে</li>
                <li>যোগ দিলে স্বয়ংক্রিয়ভাবে হাজিরা হয়ে যাবে</li>
                <li>টেলিগ্রাম অ্যাপ ইনস্টল থাকতে হবে</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentLiveClasses;
