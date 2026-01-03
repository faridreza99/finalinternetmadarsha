import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  FileText, 
  Download,
  Calendar,
  AlertCircle,
  CheckCircle,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_API_URL || '/api';

const StudentAdmitCard = () => {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [exams, setExams] = useState([]);

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/student/exams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExams(response.data || []);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
      toast.error('Failed to load exam information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleDownload = async (examId, examName) => {
    try {
      setDownloading(examId);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/student/admit-card/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `admit_card_${examName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Admit card downloaded successfully');
    } catch (error) {
      console.error('Failed to download admit card:', error);
      if (error.response?.status === 403) {
        const errorText = await error.response.data.text();
        try {
          const errorJson = JSON.parse(errorText);
          toast.error(errorJson.detail || 'Cannot download admit card due to pending fees');
        } catch {
          toast.error('Cannot download admit card. You may have pending fee dues.');
        }
      } else {
        toast.error('Failed to download admit card');
      }
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getExamStatus = (exam) => {
    const now = new Date();
    const startDate = exam.start_date ? new Date(exam.start_date) : null;
    const endDate = exam.end_date ? new Date(exam.end_date) : null;

    if (endDate && now > endDate) {
      return { label: 'Completed', variant: 'secondary' };
    }
    if (startDate && endDate && now >= startDate && now <= endDate) {
      return { label: 'Ongoing', variant: 'default' };
    }
    if (startDate && now < startDate) {
      return { label: 'Upcoming', variant: 'outline' };
    }
    return { label: 'Active', variant: 'default' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admit Card</h1>
          <p className="text-gray-600 dark:text-gray-400">Download your examination admit cards</p>
        </div>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-400">Important Instructions</h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
                <li>Carry a printed copy of your admit card to the examination hall</li>
                <li>Admit cards can only be downloaded if all fee dues are cleared</li>
                <li>Verify all your details on the admit card before the exam</li>
                <li>Contact the school office if you find any discrepancies</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No examinations available</p>
            <p className="text-sm">Admit cards will appear here when exams are scheduled</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => {
            const status = getExamStatus(exam);
            return (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{exam.name}</CardTitle>
                        <CardDescription>{exam.academic_year || 'Current Session'}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    {exam.start_date && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>Start: {formatDate(exam.start_date)}</span>
                      </div>
                    )}
                    {exam.end_date && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>End: {formatDate(exam.end_date)}</span>
                      </div>
                    )}
                    {exam.description && (
                      <p className="text-gray-500 text-xs mt-2">{exam.description}</p>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full"
                    onClick={() => handleDownload(exam.id, exam.name)}
                    disabled={downloading === exam.id}
                  >
                    {downloading === exam.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download Admit Card
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Exam Day Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 text-sm font-bold">1</div>
              <div>
                <p className="font-medium">Printed Admit Card</p>
                <p className="text-sm text-gray-500">Keep a printed copy ready</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 text-sm font-bold">2</div>
              <div>
                <p className="font-medium">ID Proof</p>
                <p className="text-sm text-gray-500">School ID card or any valid ID</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 text-sm font-bold">3</div>
              <div>
                <p className="font-medium">Stationery</p>
                <p className="text-sm text-gray-500">Pens, pencils, ruler, etc.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 text-sm font-bold">4</div>
              <div>
                <p className="font-medium">Arrive Early</p>
                <p className="text-sm text-gray-500">Reach 30 minutes before exam</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAdmitCard;
