import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Video, BookOpen, Plus, Edit, Trash2, Users, ChevronRight,
  Play, CheckCircle, Circle, Clock, Award, FileQuestion,
  ArrowLeft, Save, Eye, EyeOff, GripVertical
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Bengali numeral conversion
const toBengaliNumeral = (num) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).split('').map(d => bengaliDigits[parseInt(d)] || d).join('');
};

const VideoLessons = () => {
  const [activeTab, setActiveTab] = useState('semesters');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form states
  const [semesterForm, setSemesterForm] = useState({
    title_bn: '', title_en: '', order: 1, is_active: true
  });
  const [lessonForm, setLessonForm] = useState({
    title_bn: '', title_en: '', description_bn: '', video_url: '',
    video_type: 'youtube', subject_id: '', duration_minutes: 0, order: 1, is_published: false
  });
  const [questionForm, setQuestionForm] = useState({
    question_type: 'mcq', question_bn: '', order: 1, points: 1,
    options: [{ id: '1', text_bn: '', is_correct: false }],
    correct_answers: [''],
    matching_pairs: [{ id: '1', left_bn: '', right_bn: '' }]
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch classes with semester count
  const fetchClasses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/video-lessons/classes`, { headers });
      setClasses(res.data.classes || res.data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  }, []);

  // Fetch subjects
  const fetchSubjects = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/subjects`, { headers });
      setSubjects(res.data.subjects || res.data || []);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  }, []);

  // Fetch semesters for a class
  const fetchSemesters = useCallback(async (classId) => {
    if (!classId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/classes/${classId}/semesters`, { headers });
      setSemesters(res.data.semesters || []);
    } catch (err) {
      console.error('Error fetching semesters:', err);
      toast.error('সেমিস্টার লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch lessons for a semester
  const fetchLessons = useCallback(async (semesterId) => {
    if (!semesterId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/semesters/${semesterId}/lessons`, { headers });
      setLessons(res.data.lessons || []);
    } catch (err) {
      console.error('Error fetching lessons:', err);
      toast.error('পাঠ লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch questions for a lesson
  const fetchQuestions = useCallback(async (lessonId) => {
    if (!lessonId) return;
    try {
      const res = await axios.get(`${API_URL}/admin/lessons/${lessonId}/questions`, { headers });
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
  }, [fetchClasses, fetchSubjects]);

  useEffect(() => {
    if (selectedClass) {
      fetchSemesters(selectedClass);
      setSelectedSemester(null);
      setLessons([]);
    }
  }, [selectedClass, fetchSemesters]);

  useEffect(() => {
    if (selectedSemester) {
      fetchLessons(selectedSemester);
      setSelectedLesson(null);
      setQuestions([]);
    }
  }, [selectedSemester, fetchLessons]);

  useEffect(() => {
    if (selectedLesson) {
      fetchQuestions(selectedLesson);
    }
  }, [selectedLesson, fetchQuestions]);

  // === SEMESTER CRUD ===
  const handleSaveSemester = async () => {
    if (!semesterForm.title_bn) {
      toast.error('সেমিস্টারের নাম দিন');
      return;
    }
    try {
      if (editingItem) {
        await axios.patch(`${API_URL}/admin/semesters/${editingItem}`, semesterForm, { headers });
        toast.success('সেমিস্টার আপডেট হয়েছে');
      } else {
        await axios.post(`${API_URL}/admin/semesters`, { ...semesterForm, class_id: selectedClass }, { headers });
        toast.success('সেমিস্টার তৈরি হয়েছে');
      }
      setShowSemesterModal(false);
      setSemesterForm({ title_bn: '', title_en: '', order: 1, is_active: true });
      setEditingItem(null);
      fetchSemesters(selectedClass);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'সমস্যা হয়েছে');
    }
  };

  const handleDeleteSemester = async (id) => {
    if (!window.confirm('এই সেমিস্টার মুছে ফেলতে চান?')) return;
    try {
      await axios.delete(`${API_URL}/admin/semesters/${id}`, { headers });
      toast.success('সেমিস্টার মুছে ফেলা হয়েছে');
      fetchSemesters(selectedClass);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'মুছতে সমস্যা হয়েছে');
    }
  };

  // === LESSON CRUD ===
  const handleSaveLesson = async () => {
    if (!lessonForm.title_bn || !lessonForm.video_url) {
      toast.error('পাঠের নাম ও ভিডিও লিংক দিন');
      return;
    }
    try {
      if (editingItem) {
        await axios.patch(`${API_URL}/admin/lessons/${editingItem}`, lessonForm, { headers });
        toast.success('পাঠ আপডেট হয়েছে');
      } else {
        await axios.post(`${API_URL}/admin/lessons`, { ...lessonForm, semester_id: selectedSemester }, { headers });
        toast.success('পাঠ তৈরি হয়েছে');
      }
      setShowLessonModal(false);
      setLessonForm({
        title_bn: '', title_en: '', description_bn: '', video_url: '',
        video_type: 'youtube', subject_id: '', duration_minutes: 0, order: 1, is_published: false
      });
      setEditingItem(null);
      fetchLessons(selectedSemester);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'সমস্যা হয়েছে');
    }
  };

  const handleDeleteLesson = async (id) => {
    if (!window.confirm('এই পাঠ ও সংশ্লিষ্ট প্রশ্নসমূহ মুছে ফেলতে চান?')) return;
    try {
      await axios.delete(`${API_URL}/admin/lessons/${id}`, { headers });
      toast.success('পাঠ মুছে ফেলা হয়েছে');
      fetchLessons(selectedSemester);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'মুছতে সমস্যা হয়েছে');
    }
  };

  const toggleLessonPublish = async (lesson) => {
    try {
      await axios.patch(`${API_URL}/admin/lessons/${lesson.id}`, { is_published: !lesson.is_published }, { headers });
      toast.success(lesson.is_published ? 'পাঠ অপ্রকাশিত হয়েছে' : 'পাঠ প্রকাশিত হয়েছে');
      fetchLessons(selectedSemester);
    } catch (err) {
      toast.error('সমস্যা হয়েছে');
    }
  };

  // === QUESTION CRUD ===
  const handleSaveQuestion = async () => {
    if (!questionForm.question_bn) {
      toast.error('প্রশ্ন লিখুন');
      return;
    }
    
    const payload = {
      lesson_id: selectedLesson,
      question_type: questionForm.question_type,
      question_bn: questionForm.question_bn,
      order: questionForm.order,
      points: questionForm.points
    };

    if (questionForm.question_type === 'mcq') {
      payload.options = questionForm.options.filter(o => o.text_bn);
    } else if (questionForm.question_type === 'fill_blank') {
      payload.correct_answers = questionForm.correct_answers.filter(a => a);
    } else if (questionForm.question_type === 'matching') {
      payload.matching_pairs = questionForm.matching_pairs.filter(p => p.left_bn && p.right_bn);
    }

    try {
      if (editingItem) {
        await axios.patch(`${API_URL}/admin/questions/${editingItem}`, payload, { headers });
        toast.success('প্রশ্ন আপডেট হয়েছে');
      } else {
        await axios.post(`${API_URL}/admin/questions`, payload, { headers });
        toast.success('প্রশ্ন তৈরি হয়েছে');
      }
      setShowQuestionModal(false);
      resetQuestionForm();
      setEditingItem(null);
      fetchQuestions(selectedLesson);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'সমস্যা হয়েছে');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('এই প্রশ্ন মুছে ফেলতে চান?')) return;
    try {
      await axios.delete(`${API_URL}/admin/questions/${id}`, { headers });
      toast.success('প্রশ্ন মুছে ফেলা হয়েছে');
      fetchQuestions(selectedLesson);
    } catch (err) {
      toast.error('মুছতে সমস্যা হয়েছে');
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question_type: 'mcq', question_bn: '', order: 1, points: 1,
      options: [{ id: '1', text_bn: '', is_correct: false }],
      correct_answers: [''],
      matching_pairs: [{ id: '1', left_bn: '', right_bn: '' }]
    });
  };

  // MCQ options handlers
  const addOption = () => {
    setQuestionForm(prev => ({
      ...prev,
      options: [...prev.options, { id: String(prev.options.length + 1), text_bn: '', is_correct: false }]
    }));
  };

  const updateOption = (index, field, value) => {
    setQuestionForm(prev => {
      const options = [...prev.options];
      if (field === 'is_correct') {
        options.forEach((o, i) => o.is_correct = i === index);
      } else {
        options[index][field] = value;
      }
      return { ...prev, options };
    });
  };

  const removeOption = (index) => {
    setQuestionForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  // Fill blank handlers
  const addCorrectAnswer = () => {
    setQuestionForm(prev => ({
      ...prev,
      correct_answers: [...prev.correct_answers, '']
    }));
  };

  const updateCorrectAnswer = (index, value) => {
    setQuestionForm(prev => {
      const answers = [...prev.correct_answers];
      answers[index] = value;
      return { ...prev, correct_answers: answers };
    });
  };

  // Matching handlers
  const addMatchingPair = () => {
    setQuestionForm(prev => ({
      ...prev,
      matching_pairs: [...prev.matching_pairs, { id: String(prev.matching_pairs.length + 1), left_bn: '', right_bn: '' }]
    }));
  };

  const updateMatchingPair = (index, field, value) => {
    setQuestionForm(prev => {
      const pairs = [...prev.matching_pairs];
      pairs[index][field] = value;
      return { ...prev, matching_pairs: pairs };
    });
  };

  // Get class name
  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls?.display_name || cls?.name || 'Unknown';
  };

  // Get subject name
  const getSubjectName = (subjectId) => {
    const sub = subjects.find(s => s.id === subjectId);
    return sub?.name_bn || sub?.name || 'Unknown';
  };

  // Get semester name
  const getSemesterName = (semesterId) => {
    const sem = semesters.find(s => s.id === semesterId);
    return sem?.title_bn || 'Unknown';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Video className="h-7 w-7 text-indigo-600" />
          ভিডিও পাঠ ব্যবস্থাপনা
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          সেমিস্টার, ভিডিও পাঠ এবং প্রশ্নাবলী পরিচালনা করুন
        </p>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button
          onClick={() => { setSelectedClass(null); setSelectedSemester(null); setSelectedLesson(null); }}
          className={`px-3 py-1.5 rounded-lg ${!selectedClass ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
        >
          জামাত
        </button>
        {selectedClass && (
          <>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => { setSelectedSemester(null); setSelectedLesson(null); }}
              className={`px-3 py-1.5 rounded-lg ${!selectedSemester ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
            >
              সেমিস্টার ({getClassName(selectedClass)})
            </button>
          </>
        )}
        {selectedSemester && (
          <>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => setSelectedLesson(null)}
              className={`px-3 py-1.5 rounded-lg ${!selectedLesson ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
            >
              পাঠ ({getSemesterName(selectedSemester)})
            </button>
          </>
        )}
        {selectedLesson && (
          <>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white">
              প্রশ্নাবলী
            </span>
          </>
        )}
      </div>

      {/* Class Selection */}
      {!selectedClass && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => setSelectedClass(cls.id)}
              className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-500 transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">{cls.display_name || cls.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {cls.semester_count !== undefined ? `${toBengaliNumeral(cls.semester_count)}টি সেমিস্টার` : 'সেমিস্টার নেই'}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </button>
          ))}
          {classes.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              কোনো জামাত পাওয়া যায়নি। প্রথমে জামাত তৈরি করুন।
            </div>
          )}
        </div>
      )}

      {/* Semester List */}
      {selectedClass && !selectedSemester && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              সেমিস্টার সমূহ - {getClassName(selectedClass)}
            </h2>
            <button
              onClick={() => { setShowSemesterModal(true); setEditingItem(null); setSemesterForm({ title_bn: '', title_en: '', order: semesters.length + 1, is_active: true }); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              নতুন সেমিস্টার
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">লোড হচ্ছে...</div>
          ) : (
            <div className="space-y-3">
              {semesters.map(sem => (
                <div
                  key={sem.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <button
                    onClick={() => setSelectedSemester(sem.id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{toBengaliNumeral(sem.order)}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">{sem.title_bn}</h3>
                      <p className="text-sm text-gray-500">{sem.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingItem(sem.id); setSemesterForm(sem); setShowSemesterModal(true); }}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSemester(sem.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
              {semesters.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl">
                  কোনো সেমিস্টার নেই। নতুন সেমিস্টার যোগ করুন।
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lesson List */}
      {selectedSemester && !selectedLesson && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              ভিডিও পাঠ সমূহ - {getSemesterName(selectedSemester)}
            </h2>
            <button
              onClick={() => { setShowLessonModal(true); setEditingItem(null); setLessonForm({
                title_bn: '', title_en: '', description_bn: '', video_url: '',
                video_type: 'youtube', subject_id: '', duration_minutes: 0, order: lessons.length + 1, is_published: false
              }); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              নতুন পাঠ
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">লোড হচ্ছে...</div>
          ) : (
            <div className="space-y-3">
              {lessons.map(lesson => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <button
                    onClick={() => setSelectedLesson(lesson.id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
                      <Play className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">{lesson.title_bn}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{getSubjectName(lesson.subject_id)}</span>
                        {lesson.duration_minutes > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {toBengaliNumeral(lesson.duration_minutes)} মিনিট
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FileQuestion className="h-3 w-3" />
                          {toBengaliNumeral(lesson.question_count || 0)} প্রশ্ন
                        </span>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleLessonPublish(lesson)}
                      className={`p-2 rounded-lg ${lesson.is_published ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                      title={lesson.is_published ? 'প্রকাশিত' : 'অপ্রকাশিত'}
                    >
                      {lesson.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => { setEditingItem(lesson.id); setLessonForm(lesson); setShowLessonModal(true); }}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
              {lessons.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl">
                  কোনো পাঠ নেই। নতুন ভিডিও পাঠ যোগ করুন।
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Questions List */}
      {selectedLesson && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              প্রশ্নাবলী
            </h2>
            <button
              onClick={() => { setShowQuestionModal(true); setEditingItem(null); resetQuestionForm(); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              নতুন প্রশ্ন
            </button>
          </div>

          <div className="space-y-3">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium">
                      {toBengaliNumeral(index + 1)}
                    </div>
                    <div>
                      <p className="text-gray-800 dark:text-white">{q.question_bn}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          q.question_type === 'mcq' ? 'bg-blue-100 text-blue-700' :
                          q.question_type === 'fill_blank' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {q.question_type === 'mcq' ? 'বহু নির্বাচনী' : q.question_type === 'fill_blank' ? 'শূন্যস্থান' : 'মিলকরণ'}
                        </span>
                        <span className="text-xs text-gray-500">{toBengaliNumeral(q.points)} পয়েন্ট</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { 
                        setEditingItem(q.id); 
                        setQuestionForm({
                          ...q,
                          options: q.options || [{ id: '1', text_bn: '', is_correct: false }],
                          correct_answers: q.correct_answers || [''],
                          matching_pairs: q.matching_pairs || [{ id: '1', left_bn: '', right_bn: '' }]
                        }); 
                        setShowQuestionModal(true); 
                      }}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {questions.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl">
                কোনো প্রশ্ন নেই। নতুন প্রশ্ন যোগ করুন।
              </div>
            )}
          </div>
        </div>
      )}

      {/* Semester Modal */}
      {showSemesterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              {editingItem ? 'সেমিস্টার সম্পাদনা' : 'নতুন সেমিস্টার'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  সেমিস্টারের নাম (বাংলা) *
                </label>
                <input
                  type="text"
                  value={semesterForm.title_bn}
                  onChange={e => setSemesterForm(prev => ({ ...prev, title_bn: e.target.value }))}
                  placeholder="যেমন: প্রথম সেমিস্টার"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ক্রম
                </label>
                <input
                  type="number"
                  value={semesterForm.order}
                  onChange={e => setSemesterForm(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={semesterForm.is_active}
                  onChange={e => setSemesterForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">সক্রিয়</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowSemesterModal(false); setEditingItem(null); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                বাতিল
              </button>
              <button
                onClick={handleSaveSemester}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                সংরক্ষণ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 my-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              {editingItem ? 'পাঠ সম্পাদনা' : 'নতুন ভিডিও পাঠ'}
            </h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  পাঠের নাম (বাংলা) *
                </label>
                <input
                  type="text"
                  value={lessonForm.title_bn}
                  onChange={e => setLessonForm(prev => ({ ...prev, title_bn: e.target.value }))}
                  placeholder="যেমন: আরবি বর্ণমালা পরিচয়"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  বিষয়
                </label>
                <select
                  value={lessonForm.subject_id}
                  onChange={e => setLessonForm(prev => ({ ...prev, subject_id: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">বিষয় নির্বাচন করুন</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name_bn || sub.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ভিডিও লিংক *
                </label>
                <input
                  type="url"
                  value={lessonForm.video_url}
                  onChange={e => setLessonForm(prev => ({ ...prev, video_url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ভিডিও টাইপ
                  </label>
                  <select
                    value={lessonForm.video_type}
                    onChange={e => setLessonForm(prev => ({ ...prev, video_type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="cloudinary">Cloudinary</option>
                    <option value="external">External</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    সময়কাল (মিনিট)
                  </label>
                  <input
                    type="number"
                    value={lessonForm.duration_minutes}
                    onChange={e => setLessonForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  বিবরণ
                </label>
                <textarea
                  value={lessonForm.description_bn}
                  onChange={e => setLessonForm(prev => ({ ...prev, description_bn: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={lessonForm.is_published}
                  onChange={e => setLessonForm(prev => ({ ...prev, is_published: e.target.checked }))}
                  className="rounded"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">প্রকাশিত</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowLessonModal(false); setEditingItem(null); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                বাতিল
              </button>
              <button
                onClick={handleSaveLesson}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                সংরক্ষণ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4 my-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              {editingItem ? 'প্রশ্ন সম্পাদনা' : 'নতুন প্রশ্ন'}
            </h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  প্রশ্নের ধরন
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'mcq', label: 'বহু নির্বাচনী' },
                    { value: 'fill_blank', label: 'শূন্যস্থান পূরণ' },
                    { value: 'matching', label: 'মিলকরণ' }
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => setQuestionForm(prev => ({ ...prev, question_type: type.value }))}
                      className={`px-4 py-2 rounded-lg text-sm ${
                        questionForm.question_type === type.value
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  প্রশ্ন *
                </label>
                <textarea
                  value={questionForm.question_bn}
                  onChange={e => setQuestionForm(prev => ({ ...prev, question_bn: e.target.value }))}
                  rows={2}
                  placeholder={questionForm.question_type === 'fill_blank' ? 'শূন্যস্থানে ___ ব্যবহার করুন' : 'প্রশ্ন লিখুন...'}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    পয়েন্ট
                  </label>
                  <input
                    type="number"
                    value={questionForm.points}
                    onChange={e => setQuestionForm(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                    min={1}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ক্রম
                  </label>
                  <input
                    type="number"
                    value={questionForm.order}
                    onChange={e => setQuestionForm(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                    min={1}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>

              {/* MCQ Options */}
              {questionForm.question_type === 'mcq' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    অপশনসমূহ (সঠিক উত্তর টিক দিন)
                  </label>
                  <div className="space-y-2">
                    {questionForm.options.map((opt, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct_option"
                          checked={opt.is_correct}
                          onChange={() => updateOption(index, 'is_correct', true)}
                          className="text-green-600"
                        />
                        <input
                          type="text"
                          value={opt.text_bn}
                          onChange={e => updateOption(index, 'text_bn', e.target.value)}
                          placeholder={`অপশন ${toBengaliNumeral(index + 1)}`}
                          className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        />
                        {questionForm.options.length > 1 && (
                          <button
                            onClick={() => removeOption(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addOption}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      + আরো অপশন যোগ করুন
                    </button>
                  </div>
                </div>
              )}

              {/* Fill in blank answers */}
              {questionForm.question_type === 'fill_blank' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    সঠিক উত্তর (একাধিক গ্রহণযোগ্য উত্তর যোগ করতে পারেন)
                  </label>
                  <div className="space-y-2">
                    {questionForm.correct_answers.map((ans, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ans}
                          onChange={e => updateCorrectAnswer(index, e.target.value)}
                          placeholder="সঠিক উত্তর"
                          className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                    ))}
                    <button
                      onClick={addCorrectAnswer}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      + বিকল্প সঠিক উত্তর যোগ করুন
                    </button>
                  </div>
                </div>
              )}

              {/* Matching pairs */}
              {questionForm.question_type === 'matching' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    মিলকরণ জোড়া
                  </label>
                  <div className="space-y-2">
                    {questionForm.matching_pairs.map((pair, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={pair.left_bn}
                          onChange={e => updateMatchingPair(index, 'left_bn', e.target.value)}
                          placeholder="বাম দিক"
                          className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="text-gray-400">↔</span>
                        <input
                          type="text"
                          value={pair.right_bn}
                          onChange={e => updateMatchingPair(index, 'right_bn', e.target.value)}
                          placeholder="ডান দিক"
                          className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                    ))}
                    <button
                      onClick={addMatchingPair}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      + আরো জোড়া যোগ করুন
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowQuestionModal(false); setEditingItem(null); resetQuestionForm(); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                বাতিল
              </button>
              <button
                onClick={handleSaveQuestion}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                সংরক্ষণ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoLessons;
