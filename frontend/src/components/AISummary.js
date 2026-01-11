import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen,
  Sparkles,
  FileText,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AcademicHierarchySelector from './AcademicHierarchySelector';

const API = process.env.REACT_APP_API_URL || "/api";

/**
 * Convert a class object to the canonical class_standard value.
 * Returns the standard with ordinal suffix (e.g., "5th", "6th")
 * to match the format stored in subjects collection.
 */
const getClassValue = (cls) => {
  // If class has standard field (e.g., "5th"), use it directly
  if (cls.standard) {
    return String(cls.standard);
  }
  // If class_standard is already in ordinal format
  if (cls.class_standard !== undefined && cls.class_standard !== null) {
    const val = String(cls.class_standard);
    // If already has ordinal suffix, return as is
    if (val.match(/\d+(st|nd|rd|th)$/i)) {
      return val;
    }
    // Add ordinal suffix
    const num = parseInt(val.match(/\d+/)?.[0] || val, 10);
    if (!isNaN(num)) {
      return `${num}${getOrdinalSuffix(num)}`;
    }
    return val;
  }
  if (cls.name) {
    const nameStr = String(cls.name);
    const match = nameStr.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      return `${num}${getOrdinalSuffix(num)}`;
    }
    return nameStr;
  }
  return String(cls.id);
};

const getOrdinalSuffix = (num) => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

const AISummary = () => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summaries, setSummaries] = useState([]);
  const [currentSummary, setCurrentSummary] = useState(null);

  // Classes from backend (shared for form + filters)
  const [classOptions, setClassOptions] = useState([]);
  const [classLoading, setClassLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(""); // form dropdown (ID)

  // Form state
  const [formData, setFormData] = useState({
    class_standard: "", // e.g. "10"
    subject: "",
    chapter: "",
    topic: "",
  });

  // Dynamic curriculum state from backend (FORM)
  const [subjectsOptions, setSubjectsOptions] = useState([]); // subjects for selected class
  const [chaptersOptions, setChaptersOptions] = useState([]); // chapters for selected subject
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // Filters (library)
  const [filterClass, setFilterClass] = useState(""); // class_standard
  const [filterSubject, setFilterSubject] = useState("");
  const [filterChapter, setFilterChapter] = useState("");

  // ===============================
  // Load classes from backend
  // ===============================
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setClassLoading(true);
        const token = localStorage.getItem("token");

        const res = await axios.get(`${API}/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setClassOptions(res.data || []);
      } catch (err) {
        console.error("Class load failed:", err);
        toast.error("Failed to load class list");
      } finally {
        setClassLoading(false);
      }
    };

    fetchClasses();
  }, []);

  // ===============================
  // Fetch summaries (library)
  // ===============================
  const fetchSummaries = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = {};
      if (filterClass) params.class_standard = filterClass;
      if (filterSubject) params.subject = filterSubject;
      if (filterChapter) params.chapter = filterChapter;

      const response = await axios.get(`${API}/ai/summary/list`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (response.data.success) {
        setSummaries(response.data.summaries);
      }
    } catch (error) {
      console.error("Fetch summaries error:", error);
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterSubject, filterChapter]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  // ===============================
  // Generate Summary
  // ===============================
  const handleGenerate = async () => {
    if (!formData.class_standard || !formData.subject) {
      toast.error("Please select Class and Subject");
      return;
    }

    setGenerating(true);
    setCurrentSummary(null);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/ai/summary/generate`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setCurrentSummary(response.data);
        if (response.data.source === "cms") {
          toast.success("Summary loaded from library!");
        } else {
          toast.success("AI Summary generated and saved!");
        }
        fetchSummaries();
      }
    } catch (error) {
      console.error("Generate summary error:", error);
      toast.error(
        error?.response?.data?.detail || "Failed to generate summary",
      );
    } finally {
      setGenerating(false);
    }
  };

  // ===============================
  // Class → Subject → Chapter (FORM)
  // ===============================
  const handleFormClassChange = async (e) => {
    const classId = e.target.value;
    setSelectedClassId(classId);

    const cls = classOptions.find((c) => String(c.id) === String(classId));
    const classStandard = cls ? getClassValue(cls) : "";

    setFormData((prev) => ({
      ...prev,
      class_standard: classStandard,
      subject: "",
      chapter: "",
      topic: "",
    }));
    setCurrentSummary(null);
    setSubjectsOptions([]);
    setChaptersOptions([]);

    if (!classId) return;

    try {
      setSubjectsLoading(true);
      const token = localStorage.getItem("token");

      // Same endpoint pattern as Notes: subjects belong to class standard
      const res = await axios.get(`${API}/subjects/by-class/${classStandard}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSubjectsOptions(res.data || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      toast.error("Failed to load subjects for selected class");
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleFormSubjectChange = (e) => {
    const value = e.target.value;

    setFormData((prev) => ({
      ...prev,
      subject: value,
      chapter: "",
      topic: "",
    }));
    setCurrentSummary(null);

    // Build chapter list from syllabus of selected subject
    const selectedSubject = subjectsOptions.find(
      (s) => s.subject_name === value,
    );

    if (!selectedSubject || !Array.isArray(selectedSubject.syllabus)) {
      setChaptersOptions([]);
      return;
    }

    const chapters = selectedSubject.syllabus
      .map((unit) => unit.unit_name)
      .filter(Boolean);

    const uniqueChapters = Array.from(new Set(chapters));
    setChaptersOptions(uniqueChapters);
  };

  const handleFormChapterChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, chapter: value }));
  };

  // ===============================
  // Library filters – options from summaries
  // ===============================
  const subjectFilterOptions = useMemo(() => {
    const filteredByClass = summaries.filter((s) =>
      filterClass ? String(s.class_standard) === String(filterClass) : true,
    );
    const subjects = filteredByClass.map((s) => s.subject).filter(Boolean);
    return Array.from(new Set(subjects));
  }, [summaries, filterClass]);

  const chapterFilterOptions = useMemo(() => {
    const filtered = summaries.filter((s) => {
      if (filterClass && String(s.class_standard) !== String(filterClass))
        return false;
      if (filterSubject && s.subject !== filterSubject) return false;
      return true;
    });
    const chapters = filtered.map((s) => s.chapter).filter(Boolean);
    return Array.from(new Set(chapters));
  }, [summaries, filterClass, filterSubject]);

  const handleFilterClassChange = (e) => {
    const value = e.target.value; // class_standard
    setFilterClass(value);
    setFilterSubject("");
    setFilterChapter("");
  };

  const handleFilterSubjectChange = (e) => {
    const value = e.target.value;
    setFilterSubject(value);
    setFilterChapter("");
  };

  const handleFilterChapterChange = (e) => {
    const value = e.target.value;
    setFilterChapter(value);
  };

  // ===============================
  // Summary Actions
  // ===============================
  const handleDelete = async (summaryId) => {
    if (!window.confirm("Delete this summary?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/ai/summary/${summaryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Summary deleted");
      fetchSummaries();
      if (currentSummary?.summary_id === summaryId) {
        setCurrentSummary(null);
      }
    } catch (error) {
      console.error("Delete summary error:", error);
      toast.error("Failed to delete summary");
    }
  };

  const handleViewSummary = (summary) => {
    setCurrentSummary({
      summary_id: summary.id,
      content: summary.content,
      source: summary.source,
      class_standard: summary.class_standard,
      subject: summary.subject,
      chapter: summary.chapter,
      topic: summary.topic,
      created_at: summary.created_at,
    });
  };

  const handleDownload = () => {
    if (!currentSummary) return;

    const content = `
${currentSummary.subject} - Class ${currentSummary.class_standard}
${currentSummary.chapter ? `Chapter: ${currentSummary.chapter}` : ""}
${currentSummary.topic ? `Topic: ${currentSummary.topic}` : ""}

${currentSummary.content}

---
Generated: ${new Date(currentSummary.created_at).toLocaleString()}
Source: ${currentSummary.source === "cms" ? "Library" : "AI Generated"}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary_${currentSummary.subject}_${currentSummary.class_standard}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ===============================
  // Render
  // ===============================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="text-white" size={32} />
            <h1 className="text-3xl font-bold text-white">
              AI সারসংক্ষেপ জেনারেটর
            </h1>
          </div>
          <p className="text-purple-100">
            অধ্যায় ও টপিকের বিস্তারিত সারসংক্ষেপ তৈরি করুন
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Generate Form */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 dark:text-white">
              <Sparkles size={20} className="text-purple-600" />
              সারসংক্ষেপ তৈরি করুন
            </h2>

            <div className="space-y-4">
              {/* Academic Hierarchy Selection */}
              <AcademicHierarchySelector
                onSelectionChange={(selection) => {
                  setSelectedClassId(selection.marhala_id || '');
                  setFormData(prev => ({
                    ...prev,
                    class_standard: selection.marhala_name || '',
                    marhala_id: selection.marhala_id || '',
                    department_id: selection.department_id || '',
                    semester_id: selection.semester_id || ''
                  }));
                }}
                showAllOption={false}
                layout="vertical"
              />

              {/* Subject (dynamic from backend with demo fallback) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  বিষয় *
                </label>
                <select
                  value={formData.subject}
                  onChange={handleFormSubjectChange}
                  disabled={!formData.class_standard || subjectsLoading}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
                >
                  <option value="">
                    {subjectsLoading
                      ? "বিষয় লোড হচ্ছে..."
                      : formData.class_standard
                        ? "বিষয় নির্বাচন করুন"
                        : "প্রথমে মারহালা নির্বাচন করুন"}
                  </option>

                  {/* Backend subjects */}
                  {subjectsOptions.map((subject) => (
                    <option key={subject.id} value={subject.subject_name}>
                      {subject.subject_name}
                    </option>
                  ))}

                  {/* Message when no subjects available */}
                  {subjectsOptions.length === 0 && !subjectsLoading && formData.class_standard && (
                    <option value="" disabled>
                      কোন বিষয় পাওয়া যায়নি - মারহালা ব্যবস্থাপনায় যোগ করুন
                    </option>
                  )}
                </select>
              </div>

              {/* Chapter (dynamic from syllabus or free text) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  অধ্যায়
                </label>
                {chaptersOptions.length > 0 ? (
                  <select
                    value={formData.chapter}
                    onChange={handleFormChapterChange}
                    disabled={!formData.subject}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">অধ্যায় নির্বাচন করুন</option>
                    {chaptersOptions.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.chapter}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        chapter: e.target.value,
                      }))
                    }
                    placeholder={
                      formData.subject
                        ? "সিলেবাসে অধ্যায় পাওয়া যায়নি – অধ্যায়ের নাম লিখুন"
                        : "প্রথমে বিষয় নির্বাচন করুন"
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                )}
              </div>

              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  টপিক
                </label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      topic: e.target.value,
                    }))
                  }
                  placeholder="যেমন, বেগ ও ত্বরণ"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-purple-600 text-white py-3 rounded-md hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400"
              >
                {generating ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    তৈরি হচ্ছে...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    সারসংক্ষেপ তৈরি করুন
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                প্রথমে লাইব্রেরি চেক করে, প্রয়োজনে AI দিয়ে তৈরি করে
              </p>
            </div>
          </div>

          {/* Middle: Summary Display */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 dark:text-white">
                <FileText size={20} className="text-purple-600" />
                সারসংক্ষেপ
              </h2>
              {currentSummary && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                >
                  <Download size={18} />
                  ডাউনলোড
                </button>
              )}
            </div>

            {currentSummary ? (
              <div className="space-y-4">
                <div className="bg-purple-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">মারহালা:</span>{" "}
                      <span className="text-gray-900 dark:text-white">
                        {currentSummary.class_standard}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        বিষয়:
                      </span>{" "}
                      <span className="text-gray-900 dark:text-white">
                        {currentSummary.subject}
                      </span>
                    </div>
                    {currentSummary.chapter && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          অধ্যায়:
                        </span>{" "}
                        <span className="text-gray-900 dark:text-white">
                          {currentSummary.chapter}
                        </span>
                      </div>
                    )}
                    {currentSummary.topic && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          টপিক:
                        </span>{" "}
                        <span className="text-gray-900 dark:text-white">
                          {currentSummary.topic}
                        </span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">উৎস:</span>{" "}
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          currentSummary.source === "cms"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {currentSummary.source === "cms"
                          ? "লাইব্রেরি"
                          : "AI তৈরি"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentSummary.content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                <BookOpen size={64} className="mx-auto mb-4 opacity-30" />
                <p>এখানে দেখতে সারসংক্ষেপ তৈরি করুন</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary History */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">সারসংক্ষেপ লাইব্রেরি</h2>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Class filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                মারহালা দিয়ে ফিল্টার
              </label>
              <select
                value={filterClass}
                onChange={handleFilterClassChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 dark:bg-gray-700 dark:text-white"
              >
                <option value="">
                  {classLoading ? "মারহালা লোড হচ্ছে..." : "সকল মারহালা"}
                </option>
                {classOptions.map((cls) => (
                  <option key={cls.id} value={getClassValue(cls)}>
                    {cls.name || `Class ${getClassValue(cls)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject filter – options based on summaries + class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                বিষয় দিয়ে ফিল্টার
              </label>
              <select
                value={filterSubject}
                onChange={handleFilterSubjectChange}
                disabled={subjectFilterOptions.length === 0}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 disabled:bg-gray-100 dark:disabled:bg-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">
                  {subjectFilterOptions.length
                    ? "সকল বিষয়"
                    : "কোন বিষয় পাওয়া যায়নি"}
                </option>
                {subjectFilterOptions.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter filter – based on summaries + class + subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                অধ্যায় দিয়ে ফিল্টার
              </label>
              <select
                value={filterChapter}
                onChange={handleFilterChapterChange}
                disabled={chapterFilterOptions.length === 0}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 disabled:bg-gray-100 dark:disabled:bg-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">
                  {chapterFilterOptions.length
                    ? "সকল অধ্যায়"
                    : "কোন অধ্যায় পাওয়া যায়নি"}
                </option>
                {chapterFilterOptions.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 py-8">
                <Loader2 className="animate-spin" size={18} />
                সারসংক্ষেপ লোড হচ্ছে...
              </div>
            ) : summaries.length > 0 ? (
              summaries.map((summary) => (
                <div
                  key={summary.id}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-500 transition cursor-pointer"
                  onClick={() => handleViewSummary(summary)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {summary.subject} - Class {summary.class_standard}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {summary.chapter && `অধ্যায়: ${summary.chapter}`}
                        {summary.chapter && summary.topic && " | "}
                        {summary.topic && `টপিক: ${summary.topic}`}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(summary.created_at).toLocaleDateString()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            summary.source === "ai_generated"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {summary.source === "ai_generated" ? "AI" : "লাইব্রেরি"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(summary.id);
                      }}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                কোন সারসংক্ষেপ পাওয়া যায়নি
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISummary;
