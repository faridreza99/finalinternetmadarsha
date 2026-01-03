import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Video, Play, CheckCircle, Clock, Award, ChevronRight,
  ArrowLeft, Send, BookOpen, FileQuestion
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const toBengaliNumeral = (num) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).split('').map(d => bengaliDigits[parseInt(d)] || d).join('');
};

const StudentVideoLessons = () => {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonData, setLessonData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [matchingAnswers, setMatchingAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [startTime, setStartTime] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchSemesters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/student/my-semesters`, { headers });
      setSemesters(res.data.semesters || []);
    } catch (err) {
      console.error('Error fetching semesters:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLessons = useCallback(async (semesterId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/student/semesters/${semesterId}/lessons`, { headers });
      setLessons(res.data.lessons || []);
    } catch (err) {
      console.error('Error fetching lessons:', err);
      toast.error('পাঠ লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLesson = useCallback(async (lessonId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/student/lessons/${lessonId}`, { headers });
      setLessonData(res.data);
      setAnswers({});
      setMatchingAnswers({});
      setResult(null);
      setStartTime(Date.now());
    } catch (err) {
      console.error('Error fetching lesson:', err);
      toast.error('পাঠ লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  useEffect(() => {
    if (selectedSemester) {
      fetchLessons(selectedSemester);
      setSelectedLesson(null);
      setLessonData(null);
    }
  }, [selectedSemester, fetchLessons]);

  useEffect(() => {
    if (selectedLesson) {
      fetchLesson(selectedLesson);
    }
  }, [selectedLesson, fetchLesson]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMatchingChange = (questionId, leftId, rightValue) => {
    setMatchingAnswers(prev => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), [leftId]: rightValue }
    }));
  };

  const handleSubmit = async () => {
    if (!lessonData) return;

    const answersList = [];
    lessonData.questions?.forEach(q => {
      if (q.question_type === 'matching') {
        answersList.push({
          question_id: q.id,
          answer: matchingAnswers[q.id] || {}
        });
      } else {
        answersList.push({
          question_id: q.id,
          answer: answers[q.id] || ''
        });
      }
    });

    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/student/lessons/${selectedLesson}/submit`, {
        lesson_id: selectedLesson,
        answers: answersList,
        time_spent_seconds: timeSpent
      }, { headers });
      
      setResult(res.data);
      toast.success('উত্তর জমা হয়েছে!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'জমা দিতে সমস্যা হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const getSemesterName = (semesterId) => {
    const sem = semesters.find(s => s.id === semesterId);
    return sem?.title_bn || '';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Video className="h-7 w-7 text-red-600" />
          ভিডিও পাঠ
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          আপনার সেমিস্টারের ভিডিও পাঠ দেখুন এবং প্রশ্নের উত্তর দিন
        </p>
      </div>

      {/* Breadcrumb */}
      {(selectedSemester || selectedLesson) && (
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button
            onClick={() => { setSelectedSemester(null); setSelectedLesson(null); setLessonData(null); }}
            className="flex items-center gap-1 text-indigo-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            সেমিস্টার
          </button>
          {selectedSemester && (
            <>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <button
                onClick={() => { setSelectedLesson(null); setLessonData(null); }}
                className={`${!selectedLesson ? 'text-gray-800 dark:text-white font-medium' : 'text-indigo-600 hover:underline'}`}
              >
                {getSemesterName(selectedSemester)}
              </button>
            </>
          )}
          {selectedLesson && lessonData && (
            <>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-800 dark:text-white font-medium">{lessonData.title_bn}</span>
            </>
          )}
        </div>
      )}

      {/* Semester Selection */}
      {!selectedSemester && (
        <div>
          {loading ? (
            <div className="text-center py-12">লোড হচ্ছে...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {semesters.map(sem => (
                <button
                  key={sem.id}
                  onClick={() => setSelectedSemester(sem.id)}
                  className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-500 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">{sem.title_bn}</h3>
                      <p className="text-sm text-gray-500 mt-1">{sem.class_name}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </button>
              ))}
              {semesters.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl">
                  আপনি কোনো সেমিস্টারে নথিভুক্ত নেই
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lesson List */}
      {selectedSemester && !selectedLesson && (
        <div>
          {loading ? (
            <div className="text-center py-12">লোড হচ্ছে...</div>
          ) : (
            <div className="space-y-3">
              {lessons.map(lesson => (
                <button
                  key={lesson.id}
                  onClick={() => setSelectedLesson(lesson.id)}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-500 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      lesson.is_completed ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                    }`}>
                      {lesson.is_completed ? (
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <Play className="h-6 w-6 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">{lesson.title_bn}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        {lesson.duration_minutes > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {toBengaliNumeral(lesson.duration_minutes)} মিনিট
                          </span>
                        )}
                        {lesson.is_completed && lesson.score !== null && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Award className="h-3 w-3" />
                            {toBengaliNumeral(lesson.score)}/{toBengaliNumeral(lesson.total_points)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              ))}
              {lessons.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl">
                  এই সেমিস্টারে কোনো পাঠ নেই
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lesson View */}
      {selectedLesson && lessonData && (
        <div className="space-y-6">
          {/* Video Player */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="aspect-video bg-black">
              {lessonData.video_type === 'youtube' ? (
                <iframe
                  src={getYouTubeEmbedUrl(lessonData.video_url)}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : (
                <video
                  src={lessonData.video_url}
                  controls
                  className="w-full h-full"
                />
              )}
            </div>
            <div className="p-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{lessonData.title_bn}</h2>
              {lessonData.description_bn && (
                <p className="text-gray-600 dark:text-gray-400 mt-2">{lessonData.description_bn}</p>
              )}
            </div>
          </div>

          {/* Result Display */}
          {result && (
            <div className={`p-6 rounded-xl ${result.percentage >= 60 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">আপনার ফলাফল</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    আপনি {toBengaliNumeral(result.total_points)} এর মধ্যে {toBengaliNumeral(result.score)} পেয়েছেন
                  </p>
                </div>
                <div className={`text-3xl font-bold ${result.percentage >= 60 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {toBengaliNumeral(Math.round(result.percentage))}%
                </div>
              </div>
            </div>
          )}

          {/* Questions */}
          {lessonData.questions?.length > 0 && !result && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-indigo-600" />
                প্রশ্নাবলী
              </h3>
              
              <div className="space-y-6">
                {lessonData.questions.map((q, index) => (
                  <div key={q.id} className="pb-6 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <p className="font-medium text-gray-800 dark:text-white mb-3">
                      {toBengaliNumeral(index + 1)}। {q.question_bn}
                      <span className="text-xs text-gray-500 ml-2">({toBengaliNumeral(q.points)} পয়েন্ট)</span>
                    </p>

                    {/* MCQ */}
                    {q.question_type === 'mcq' && q.options && (
                      <div className="space-y-2 ml-4">
                        {q.options.map((opt, optIdx) => (
                          <label
                            key={opt.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                              answers[q.id] === opt.id
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              value={opt.id}
                              checked={answers[q.id] === opt.id}
                              onChange={() => handleAnswerChange(q.id, opt.id)}
                              className="text-indigo-600"
                            />
                            <span className="text-gray-700 dark:text-gray-300">{opt.text_bn}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Fill in blank */}
                    {q.question_type === 'fill_blank' && (
                      <div className="ml-4">
                        <input
                          type="text"
                          value={answers[q.id] || ''}
                          onChange={e => handleAnswerChange(q.id, e.target.value)}
                          placeholder="আপনার উত্তর লিখুন"
                          className="w-full max-w-md px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                    )}

                    {/* Matching */}
                    {q.question_type === 'matching' && q.left_items && q.right_items && (
                      <div className="ml-4 space-y-3">
                        {q.left_items.map(left => (
                          <div key={left.id} className="flex items-center gap-4">
                            <span className="w-1/3 text-gray-700 dark:text-gray-300">{left.text}</span>
                            <span className="text-gray-400">→</span>
                            <select
                              value={matchingAnswers[q.id]?.[left.id] || ''}
                              onChange={e => handleMatchingChange(q.id, left.id, e.target.value)}
                              className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            >
                              <option value="">নির্বাচন করুন</option>
                              {q.right_items.map((right, idx) => (
                                <option key={idx} value={right}>{right}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? (
                    'জমা হচ্ছে...'
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      উত্তর জমা দিন
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {lessonData.questions?.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center text-gray-500">
              এই পাঠে কোনো প্রশ্ন নেই
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentVideoLessons;
