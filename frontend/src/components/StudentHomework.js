import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { toast } from 'sonner';
import { BookOpen, Clock, CheckCircle, Lock, AlertCircle, Upload } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '/api';

const StudentHomework = () => {
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchHomework = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/student/homework`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setHomework(response.data.homework || []);
      setPaymentRequired(response.data.payment_required || false);
    } catch (error) {
      console.error('Failed to fetch homework:', error);
      toast.error('Failed to load homework');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomework();
  }, [fetchHomework]);

  const handleSubmit = async () => {
    if (!selectedHomework || !submissionText.trim()) {
      toast.error('Please enter your submission');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.post(`${API}/student/homework/submit`, {
        homework_id: selectedHomework.id,
        student_id: '', // Will be filled by backend from token
        submission_text: submissionText,
        attachments: []
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Homework submitted successfully!');
      setSelectedHomework(null);
      setSubmissionText('');
      fetchHomework();
    } catch (error) {
      console.error('Failed to submit homework:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit homework');
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
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
                Please complete your monthly payment to access homework.
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
          <BookOpen className="w-6 h-6 text-emerald-600" />
          Homework
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and submit your homework assignments
        </p>
      </div>

      {homework.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No homework assignments found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {homework.map((hw) => (
            <Card key={hw.id} className={hw.submitted ? 'border-green-200' : isOverdue(hw.due_date) ? 'border-red-200' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{hw.title}</CardTitle>
                  {hw.submitted ? (
                    <Badge className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Submitted
                    </Badge>
                  ) : isOverdue(hw.due_date) ? (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Overdue
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {hw.description}
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Subject:</strong> {hw.subject || 'General'}</p>
                  <p><strong>Due:</strong> {new Date(hw.due_date).toLocaleDateString()}</p>
                  <p><strong>Assigned by:</strong> {hw.assigned_by}</p>
                </div>
                {!hw.submitted && (
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setSelectedHomework(hw)}
                    disabled={isOverdue(hw.due_date)}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Submit
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedHomework} onOpenChange={(open) => {
        if (!open) {
          setSelectedHomework(null);
          setSubmissionText('');
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Homework: {selectedHomework?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Assignment:</p>
              <p className="text-gray-600 dark:text-gray-400">{selectedHomework?.description}</p>
            </div>
            <div>
              <Textarea
                placeholder="Write your answer here..."
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSelectedHomework(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !submissionText.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentHomework;
