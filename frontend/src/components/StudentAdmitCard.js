import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { 
  FileText, 
  Download,
  Calendar,
  AlertCircle,
  CheckCircle,
  BookOpen,
  Printer,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_API_URL || '/api';

const toBengaliNumeral = (num) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bengaliDigits[parseInt(d)]);
};

const formatBengaliDate = (dateString) => {
  if (!dateString || dateString === 'None') return '-';
  try {
    return new Date(dateString).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const StudentAdmitCard = () => {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedAdmitCard, setSelectedAdmitCard] = useState(null);
  const [showAdmitCard, setShowAdmitCard] = useState(false);
  const printRef = useRef(null);

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/student/exams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExams(response.data.exams || []);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
      toast.error('পরীক্ষার তথ্য লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleViewAdmitCard = async (examId) => {
    try {
      setDownloading(examId);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/student/admit-card/${examId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.access_denied) {
        toast.error(response.data.message || 'ফি বাকি থাকায় এডমিট কার্ড দেখা যাচ্ছে না');
        return;
      }

      setSelectedAdmitCard(response.data.admit_card);
      setShowAdmitCard(true);
    } catch (error) {
      console.error('Failed to get admit card:', error);
      if (error.response?.status === 403) {
        toast.error('ফি বাকি থাকায় এডমিট কার্ড দেখা যাচ্ছে না');
      } else {
        toast.error('এডমিট কার্ড লোড করতে ব্যর্থ হয়েছে');
      }
    } finally {
      setDownloading(null);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>এডমিট কার্ড</title>
          <style>
            body { font-family: 'SolaimanLipi', 'Kalpurush', sans-serif; padding: 20px; }
            .admit-card { max-width: 600px; margin: 0 auto; border: 2px solid #000; padding: 20px; }
            .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header img { max-height: 60px; margin-bottom: 10px; }
            .header h1 { font-size: 18px; margin: 5px 0; }
            .header h2 { font-size: 14px; font-weight: normal; margin: 5px 0; }
            .student-info { display: flex; gap: 20px; margin-bottom: 20px; }
            .photo { width: 100px; height: 120px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; }
            .photo img { max-width: 100%; max-height: 100%; }
            .details { flex: 1; }
            .details p { margin: 5px 0; font-size: 13px; }
            .details p strong { display: inline-block; width: 100px; }
            .exam-info { border-top: 1px solid #000; padding-top: 15px; margin-top: 15px; }
            .exam-info h3 { margin: 0 0 10px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f0f0f0; }
            .footer { margin-top: 30px; text-align: right; font-size: 12px; }
            @media print { body { print-color-adjust: exact; } }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getExamStatus = (exam) => {
    const now = new Date();
    const startDate = exam.start_date ? new Date(exam.start_date) : null;
    const endDate = exam.end_date ? new Date(exam.end_date) : null;

    if (endDate && now > endDate) {
      return { label: 'সম্পন্ন', variant: 'secondary' };
    }
    if (startDate && endDate && now >= startDate && now <= endDate) {
      return { label: 'চলমান', variant: 'default' };
    }
    if (startDate && now < startDate) {
      return { label: 'আসন্ন', variant: 'outline' };
    }
    return { label: 'সক্রিয়', variant: 'default' };
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">এডমিট কার্ড</h1>
          <p className="text-gray-600 dark:text-gray-400">পরীক্ষার এডমিট কার্ড দেখুন ও প্রিন্ট করুন</p>
        </div>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-400">গুরুত্বপূর্ণ নির্দেশাবলী</h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
                <li>পরীক্ষার হলে এডমিট কার্ডের প্রিন্ট কপি সাথে রাখুন</li>
                <li>সকল ফি পরিশোধ না করলে এডমিট কার্ড দেখা যাবে না</li>
                <li>পরীক্ষার আগে এডমিট কার্ডের সকল তথ্য যাচাই করুন</li>
                <li>কোনো তথ্যে ভুল থাকলে অফিসে যোগাযোগ করুন</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">কোনো পরীক্ষা পাওয়া যায়নি</p>
            <p className="text-sm">পরীক্ষা নির্ধারিত হলে এখানে দেখা যাবে</p>
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
                        <CardTitle className="text-lg dark:text-white">{exam.name_bn || exam.name}</CardTitle>
                        <CardDescription>{exam.academic_year || 'চলতি সেশন'}</CardDescription>
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
                        <span>শুরু: {formatBengaliDate(exam.start_date)}</span>
                      </div>
                    )}
                    {exam.end_date && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>শেষ: {formatBengaliDate(exam.end_date)}</span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleViewAdmitCard(exam.id)}
                    disabled={downloading === exam.id || !exam.admit_card_available}
                  >
                    {downloading === exam.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        লোড হচ্ছে...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        এডমিট কার্ড দেখুন
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
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <CheckCircle className="h-5 w-5 text-green-600" />
            পরীক্ষার দিনের চেকলিস্ট
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 text-sm font-bold">{toBengaliNumeral(1)}</div>
              <div>
                <p className="font-medium dark:text-white">প্রিন্টেড এডমিট কার্ড</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">প্রিন্ট কপি সাথে রাখুন</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 text-sm font-bold">{toBengaliNumeral(2)}</div>
              <div>
                <p className="font-medium dark:text-white">পরিচয়পত্র</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">স্কুল আইডি কার্ড সাথে রাখুন</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 text-sm font-bold">{toBengaliNumeral(3)}</div>
              <div>
                <p className="font-medium dark:text-white">প্রয়োজনীয় সামগ্রী</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">কলম, পেন্সিল, জ্যামিতি বক্স</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 text-sm font-bold">{toBengaliNumeral(4)}</div>
              <div>
                <p className="font-medium dark:text-white">সময়মতো উপস্থিত</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">পরীক্ষা শুরুর ৩০ মিনিট আগে আসুন</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAdmitCard} onOpenChange={setShowAdmitCard}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between dark:text-white">
              <span>এডমিট কার্ড</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700">
                  <Printer className="h-4 w-4 mr-1" />
                  প্রিন্ট
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedAdmitCard && (
            <div ref={printRef} className="admit-card bg-white p-6 border-2 border-gray-800 rounded-lg">
              <div className="header text-center border-b-2 border-gray-800 pb-4 mb-4">
                {selectedAdmitCard.institution?.logo_url && (
                  <img 
                    src={selectedAdmitCard.institution.logo_url} 
                    alt="Logo" 
                    className="h-16 mx-auto mb-2"
                  />
                )}
                <h1 className="text-lg font-bold">{selectedAdmitCard.institution?.name || ''}</h1>
                <p className="text-sm text-gray-600">{selectedAdmitCard.institution?.address || ''}</p>
                <h2 className="text-xl font-bold mt-3 text-emerald-700">
                  {selectedAdmitCard.exam?.name_bn || selectedAdmitCard.exam?.name || 'পরীক্ষা'} - এডমিট কার্ড
                </h2>
              </div>
              
              <div className="student-info flex gap-6 mb-6">
                <div className="photo w-28 h-32 border-2 border-gray-400 rounded flex items-center justify-center overflow-hidden">
                  {selectedAdmitCard.student?.photo_url ? (
                    <img 
                      src={selectedAdmitCard.student.photo_url} 
                      alt="Student" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">ছবি নেই</span>
                  )}
                </div>
                <div className="details flex-1 space-y-2 text-sm">
                  <p><strong className="inline-block w-28">নাম:</strong> {selectedAdmitCard.student?.name_bn || selectedAdmitCard.student?.name}</p>
                  <p><strong className="inline-block w-28">ভর্তি নং:</strong> {toBengaliNumeral(selectedAdmitCard.student?.admission_no || '')}</p>
                  <p><strong className="inline-block w-28">রোল:</strong> {toBengaliNumeral(selectedAdmitCard.student?.roll_no || '')}</p>
                  <p><strong className="inline-block w-28">জামাত:</strong> {selectedAdmitCard.student?.class_name}</p>
                  <p><strong className="inline-block w-28">শাখা:</strong> {selectedAdmitCard.student?.section || '-'}</p>
                  <p><strong className="inline-block w-28">পিতার নাম:</strong> {selectedAdmitCard.student?.father_name || '-'}</p>
                </div>
              </div>
              
              <div className="exam-info border-t-2 border-gray-800 pt-4">
                <h3 className="font-bold mb-2">পরীক্ষার তথ্য</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <p><strong>পরীক্ষা শুরু:</strong> {formatBengaliDate(selectedAdmitCard.exam?.start_date)}</p>
                  <p><strong>পরীক্ষা শেষ:</strong> {formatBengaliDate(selectedAdmitCard.exam?.end_date)}</p>
                </div>
                
                {selectedAdmitCard.subjects && selectedAdmitCard.subjects.length > 0 && (
                  <>
                    <h4 className="font-semibold mb-2">পরীক্ষার সূচি</h4>
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-400 p-2 text-left">বিষয়</th>
                          <th className="border border-gray-400 p-2 text-left">তারিখ</th>
                          <th className="border border-gray-400 p-2 text-left">সময়</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAdmitCard.subjects.map((sub, idx) => (
                          <tr key={idx}>
                            <td className="border border-gray-400 p-2">{sub.subject}</td>
                            <td className="border border-gray-400 p-2">{formatBengaliDate(sub.date)}</td>
                            <td className="border border-gray-400 p-2">{toBengaliNumeral(sub.time || '')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
              
              <div className="footer mt-8 flex justify-between text-sm">
                <div>
                  <p className="text-gray-500">প্রিন্ট তারিখ: {formatBengaliDate(new Date().toISOString())}</p>
                </div>
                <div className="text-right">
                  <div className="border-t border-gray-800 pt-1 mt-8 w-40">
                    <p>প্রতিষ্ঠান প্রধানের স্বাক্ষর</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentAdmitCard;
