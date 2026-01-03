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
import { Video, Clock, ExternalLink, Lock, AlertCircle } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '/api';

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
      return false;
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
        toast.error('Please login as a student to view live classes');
      } else {
        toast.error('Failed to load live classes');
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
        toast.success('Attendance marked successfully!');
      }
      
      if (response.data.telegram_link) {
        window.open(response.data.telegram_link, '_blank');
      }
    } catch (error) {
      console.error('Failed to join class:', error);
      toast.error(error.response?.data?.detail || 'Failed to join class');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-green-500">Live - Join Now</Badge>;
      case 'not_started':
        return <Badge variant="secondary">Not Started</Badge>;
      case 'ended':
        return <Badge variant="outline">Ended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (paymentRequired) {
    return (
      <div className="p-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-orange-100 rounded-full">
                <Lock className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-orange-800">Payment Required</h2>
              <p className="text-orange-700">
                Please complete your monthly payment to access live classes.
              </p>
              <p className="text-sm text-orange-600">
                Contact the administration for payment details.
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
          Live Classes
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Join your scheduled live classes
        </p>
      </div>

      {accessStatus && !accessStatus.has_paid && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-700">
                Your payment for {accessStatus.current_month} {accessStatus.current_year} is pending.
                Some features may be restricted.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Today's Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Video className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No live classes scheduled for you today.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((liveClass) => (
                  <TableRow key={liveClass.id}>
                    <TableCell className="font-medium">{liveClass.class_name}</TableCell>
                    <TableCell>{liveClass.start_time}</TableCell>
                    <TableCell>{liveClass.end_time}</TableCell>
                    <TableCell>{liveClass.teacher_name}</TableCell>
                    <TableCell>{getStatusBadge(liveClass.status)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleJoinClass(liveClass)}
                        disabled={liveClass.status !== 'live'}
                        className={liveClass.status === 'live' 
                          ? 'bg-emerald-600 hover:bg-emerald-700' 
                          : ''
                        }
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        {liveClass.status === 'live' ? 'Join' : liveClass.status_text}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentLiveClasses;
