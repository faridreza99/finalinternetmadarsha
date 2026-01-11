import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Book,
  Plus,
  Edit,
  Trash2,
  Search,
  FileText,
  Upload,
  Download,
  BookOpen,
  X,
  File,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import AcademicHierarchySelector from './AcademicHierarchySelector';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "/api";

const formatErrorMessage = (error, fallbackMsg) => {
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail.map((err) => {
      const field = err.loc ? err.loc.join(".") : "field";
      return `${field}: ${err.msg}`;
    });
    return messages.join(", ");
  }
  if (detail && typeof detail === "object" && detail.msg) {
    return detail.msg;
  }
  return fallbackMsg;
};

const initialChapter = {
  chapter_number: 1,
  title: "অধ্যায় ১",
  file_url: "",
  file_name: "",
};

const initialBookForm = {
  title: "",
  author: "",
  subject: "",
  class_standard: "",
  marhala_id: "",
  department_id: "",
  semester_id: "",
  board: "মাদ্রাসা বোর্ড",
  prelims_file_url: "",
  prelims_file_name: "",
  chapters: [initialChapter],
  bulk_upload_file: null,
};

const initialQAForm = {
  question: "",
  answer: "",
  subject: "",
  class_standard: "",
  chapter: "",
  question_type: "ধারণাগত",
  difficulty_level: "মাঝারি",
  keywords: "",
};

const initialPaperForm = {
  title: "",
  subject: "",
  class_standard: "",
  marhala_id: "",
  department_id: "",
  semester_id: "",
  chapter: "",
  exam_year: new Date().getFullYear().toString(),
  paper_type: "বার্ষিক পরীক্ষা",
  file_url: "",
};

const AcademicCMS = () => {
  const [activeTab, setActiveTab] = useState("books");
  const [books, setBooks] = useState([]);
  const [qaPairs, setQaPairs] = useState([]);
  const [referenceBooks, setReferenceBooks] = useState([]);
  const [previousPapers, setPreviousPapers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showAddBook, setShowAddBook] = useState(false);
  const [showAddQA, setShowAddQA] = useState(false);
  const [showAddReferenceBook, setShowAddReferenceBook] = useState(false);
  const [showAddPaper, setShowAddPaper] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);

  const [editingBookId, setEditingBookId] = useState(null);
  const [editingQAId, setEditingQAId] = useState(null);
  const [editingReferenceBookId, setEditingReferenceBookId] = useState(null);
  const [editingPaperId, setEditingPaperId] = useState(null);

  const [uploadingFile, setUploadingFile] = useState(false);

  const [bookForm, setBookForm] = useState(initialBookForm);
  const [qaForm, setQaForm] = useState(initialQAForm);
  const [referenceBookForm, setReferenceBookForm] = useState(initialBookForm);
  const [paperForm, setPaperForm] = useState(initialPaperForm);

  const [acadNavLevel, setAcadNavLevel] = useState({
    step: "class",
    class: "",
    subject: "",
  });
  const [refNavLevel, setRefNavLevel] = useState({
    step: "class",
    class: "",
    subject: "",
  });

  const [showChaptersModal, setShowChaptersModal] = useState(false);
  const [selectedBookForChapters, setSelectedBookForChapters] = useState(null);
  const [chapterViewIndex, setChapterViewIndex] = useState(0);
  const [chapterLoading, setChapterLoading] = useState(false);

  const handleFileUpload = useCallback(async (file, onSuccess) => {
    if (!file) return null;

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("ফাইলের আকার ১০০MB এর কম হতে হবে");
      return null;
    }

    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("শুধুমাত্র PDF, TXT, এবং DOCX/DOC ফাইল অনুমোদিত");
      return null;
    }

    setUploadingFile(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${API_BASE_URL}/files/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      toast.success("ফাইল সফলভাবে আপলোড হয়েছে!");
      if (onSuccess) onSuccess(response.data.file_url, file.name);
      return response.data.file_url;
    } catch (error) {
      toast.error(formatErrorMessage(error, "ফাইল আপলোড ব্যর্থ হয়েছে"));
      console.error(error);
      return null;
    } finally {
      setUploadingFile(false);
    }
  }, []);

  const handleFormChange = (formType, field, value) => {
    if (formType === "book") {
      setBookForm((prev) => ({ ...prev, [field]: value }));
    } else if (formType === "reference") {
      setReferenceBookForm((prev) => ({ ...prev, [field]: value }));
    } else if (formType === "qa") {
      setQaForm((prev) => ({ ...prev, [field]: value }));
    } else if (formType === "paper") {
      setPaperForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleChapterChange = (
    formType,
    index,
    field,
    value,
    fileName = null,
  ) => {
    const setForm = formType === "book" ? setBookForm : setReferenceBookForm;

    setForm((prev) => {
      const newChapters = [...prev.chapters];
      if (!newChapters[index]) {
        return prev;
      }
      newChapters[index] = {
        ...newChapters[index],
        [field]: value,
        ...(fileName && { file_name: fileName }),
        ...(field === "file_url" && !value && { file_name: "" }),
      };
      if (
        field === "file_url" &&
        value &&
        !newChapters[index].title.trim() &&
        fileName
      ) {
        newChapters[index].title = fileName.split(".").slice(0, -1).join(".");
      }
      return { ...prev, chapters: newChapters };
    });
  };

  const addChapterField = (formType) => {
    const setForm = formType === "book" ? setBookForm : setReferenceBookForm;

    setForm((prev) => {
      const newIndex = prev.chapters.length;
      if (newIndex < 20) {
        return {
          ...prev,
          chapters: [
            ...prev.chapters,
            {
              chapter_number: newIndex + 1,
              title: `অধ্যায় ${newIndex + 1}`,
              file_url: "",
              file_name: "",
            },
          ],
        };
      }
      toast.warning("সর্বোচ্চ ২০টি অধ্যায় অনুমোদিত।");
      return prev;
    });
  };

  const removeChapterField = (formType, index) => {
    const setForm = formType === "book" ? setBookForm : setReferenceBookForm;
    setForm((prev) => {
      const newChapters = prev.chapters.filter((_, i) => i !== index);
      const renumberedChapters = newChapters.map((chap, i) => ({
        ...chap,
        chapter_number: i + 1,
        title: chap.title.startsWith("অধ্যায় ")
          ? `অধ্যায় ${i + 1}`
          : chap.title,
      }));
      return { ...prev, chapters: renumberedChapters };
    });
  };

  const resetForm = (formType) => {
    if (formType === "book") {
      setBookForm(initialBookForm);
      setEditingBookId(null);
    } else if (formType === "reference") {
      setReferenceBookForm(initialBookForm);
      setEditingReferenceBookId(null);
    } else if (formType === "qa") {
      setQaForm(initialQAForm);
      setEditingQAId(null);
    } else if (formType === "paper") {
      setPaperForm(initialPaperForm);
      setEditingPaperId(null);
    }
  };

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/cms/academic-books`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBooks(response.data || []);
    } catch (error) {
      toast.error("পাঠ্যপুস্তক লোড করতে ব্যর্থ");
      console.error(error);
    }
    setLoading(false);
  }, []);

  const fetchReferenceBooks = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/cms/reference-books`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReferenceBooks(response.data || []);
    } catch (error) {
      toast.error("সহায়ক পুস্তক লোড করতে ব্যর্থ");
      console.error(error);
    }
    setLoading(false);
  }, []);

  const fetchQAPairs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE_URL}/cms/qa-knowledge-base`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setQaPairs(response.data || []);
    } catch (error) {
      toast.error("প্রশ্ন-উত্তর লোড করতে ব্যর্থ");
      console.error(error);
    }
    setLoading(false);
  }, []);

  const fetchPreviousPapers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE_URL}/cms/previous-year-papers`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setPreviousPapers(response.data || []);
    } catch (error) {
      toast.error("বিগত বছরের প্রশ্নপত্র লোড করতে ব্যর্থ");
      console.error(error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "books") {
      fetchBooks();
    } else if (activeTab === "reference") {
      fetchReferenceBooks();
    } else if (activeTab === "qa") {
      fetchQAPairs();
    } else if (activeTab === "papers") {
      fetchPreviousPapers();
    }
  }, [
    activeTab,
    fetchBooks,
    fetchReferenceBooks,
    fetchQAPairs,
    fetchPreviousPapers,
  ]);

  const handleAddBook = async (e) => {
    e.preventDefault();
    const isEditing = editingBookId !== null;

    try {
      const token = localStorage.getItem("token");
      const endpoint = `${API_BASE_URL}/cms/academic-books`;

      const payload = {
        ...bookForm,
        chapters: bookForm.chapters.filter(
          (c) => c.title.trim() && c.file_url.trim(),
        ),
        pdf_url: bookForm.prelims_file_url || "",
        cover_image_url: bookForm.prelims_file_url || "",
      };

      if (isEditing) {
        await axios.put(`${endpoint}/${editingBookId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success(`পাঠ্যপুস্তক সফলভাবে আপডেট হয়েছে!`);
      } else {
        await axios.post(endpoint, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success(`পাঠ্যপুস্তক সফলভাবে যোগ হয়েছে!`);
      }

      setShowAddBook(false);
      resetForm("book");
      fetchBooks();
    } catch (error) {
      const errorMsg = isEditing
        ? "পাঠ্যপুস্তক আপডেট করতে ব্যর্থ"
        : "পাঠ্যপুস্তক যোগ করতে ব্যর্থ";
      toast.error(formatErrorMessage(error, errorMsg));
      console.error(error);
    }
  };

  const handleEditBook = (book) => {
    setEditingBookId(book.id);
    setBookForm({
      title: book.title || "",
      author: book.author || "",
      subject: book.subject || "",
      class_standard: book.class_standard || "",
      board: book.board || "মাদ্রাসা বোর্ড",
      prelims_file_url: book.pdf_url || book.prelims_file_url || "",
      prelims_file_name: book.prelims_file_name || "",
      chapters: (book.chapters || []).map((c, i) => ({
        chapter_number: c.chapter_number || i + 1,
        title:
          c.title || c.chapter_title || `অধ্যায় ${c.chapter_number || i + 1}`,
        file_url: c.file_url || "",
        file_name: c.file_name || "",
      })),
      bulk_upload_file: null,
    });
    setShowAddBook(true);
  };

  const handleDeleteBook = async (bookId) => {
    if (
      !window.confirm("আপনি কি নিশ্চিত যে এই পাঠ্যপুস্তকটি মুছতে চান?")
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/cms/academic-books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("পাঠ্যপুস্তক সফলভাবে মুছে ফেলা হয়েছে!");
      fetchBooks();
    } catch (error) {
      toast.error(formatErrorMessage(error, "পাঠ্যপুস্তক মুছতে ব্যর্থ"));
      console.error(error);
    }
  };

  const handleAddReferenceBook = async (e) => {
    e.preventDefault();
    const isEditing = editingReferenceBookId !== null;

    try {
      const token = localStorage.getItem("token");
      const endpoint = `${API_BASE_URL}/cms/reference-books`;

      const payload = {
        ...referenceBookForm,
        chapters: referenceBookForm.chapters.filter(
          (c) => c.title.trim() && c.file_url.trim(),
        ),
        pdf_url: referenceBookForm.prelims_file_url || "",
      };

      if (isEditing) {
        await axios.put(`${endpoint}/${editingReferenceBookId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("সহায়ক পুস্তক সফলভাবে আপডেট হয়েছে!");
      } else {
        await axios.post(endpoint, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("সহায়ক পুস্তক সফলভাবে যোগ হয়েছে!");
      }

      setShowAddReferenceBook(false);
      resetForm("reference");
      fetchReferenceBooks();
    } catch (error) {
      const errorMsg = isEditing
        ? "সহায়ক পুস্তক আপডেট করতে ব্যর্থ"
        : "সহায়ক পুস্তক যোগ করতে ব্যর্থ";
      toast.error(formatErrorMessage(error, errorMsg));
      console.error(error);
    }
  };

  const handleEditReferenceBook = (book) => {
    setEditingReferenceBookId(book.id);
    setReferenceBookForm({
      title: book.title || "",
      author: book.author || "",
      subject: book.subject || "",
      class_standard: book.class_standard || "",
      board: book.board || "মাদ্রাসা বোর্ড",
      prelims_file_url: book.pdf_url || book.prelims_file_url || "",
      prelims_file_name: book.prelims_file_name || "",
      chapters: (book.chapters || []).map((c, i) => ({
        chapter_number: c.chapter_number || i + 1,
        title:
          c.title || c.chapter_title || `অধ্যায় ${c.chapter_number || i + 1}`,
        file_url: c.file_url || "",
        file_name: c.file_name || "",
      })),
      bulk_upload_file: null,
    });
    setShowAddReferenceBook(true);
  };

  const handleDeleteReferenceBook = async (bookId) => {
    if (
      !window.confirm("আপনি কি নিশ্চিত যে এই সহায়ক পুস্তকটি মুছতে চান?")
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/cms/reference-books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("সহায়ক পুস্তক সফলভাবে মুছে ফেলা হয়েছে!");
      fetchReferenceBooks();
    } catch (error) {
      toast.error(formatErrorMessage(error, "সহায়ক পুস্তক মুছতে ব্যর্থ"));
      console.error(error);
    }
  };

  const handleAddQA = async (e) => {
    e.preventDefault();
    const isEditing = editingQAId !== null;

    try {
      const token = localStorage.getItem("token");
      const qaData = {
        ...qaForm,
        keywords: qaForm.keywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k),
        chapter_topic: qaForm.chapter || "",
      };

      const endpoint = `${API_BASE_URL}/cms/qa-knowledge-base`;

      if (isEditing) {
        await axios.put(`${endpoint}/${editingQAId}`, qaData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("প্রশ্ন-উত্তর সফলভাবে আপডেট হয়েছে!");
      } else {
        await axios.post(endpoint, qaData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("প্রশ্ন-উত্তর সফলভাবে যোগ হয়েছে!");
      }

      setShowAddQA(false);
      resetForm("qa");
      fetchQAPairs();
    } catch (error) {
      const errorMsg = isEditing
        ? "প্রশ্ন-উত্তর আপডেট করতে ব্যর্থ"
        : "প্রশ্ন-উত্তর যোগ করতে ব্যর্থ";
      toast.error(formatErrorMessage(error, errorMsg));
      console.error(error);
    }
  };

  const handleEditQA = (qa) => {
    setEditingQAId(qa.id);
    setQaForm({
      question: qa.question,
      answer: qa.answer,
      subject: qa.subject,
      class_standard: qa.class_standard,
      question_type: qa.question_type || "ধারণাগত",
      difficulty_level: qa.difficulty_level || "মাঝারি",
      keywords: Array.isArray(qa.keywords)
        ? qa.keywords.join(", ")
        : qa.keywords || "",
      chapter: qa.chapter_topic || "",
    });
    setShowAddQA(true);
  };

  const handleDeleteQA = async (qaId) => {
    if (!window.confirm("আপনি কি নিশ্চিত যে এই প্রশ্ন-উত্তরটি মুছতে চান?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/cms/qa-knowledge-base/${qaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("প্রশ্ন-উত্তর সফলভাবে মুছে ফেলা হয়েছে!");
      fetchQAPairs();
    } catch (error) {
      toast.error(formatErrorMessage(error, "প্রশ্ন-উত্তর মুছতে ব্যর্থ"));
      console.error(error);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkUploadFile) {
      toast.error("অনুগ্রহ করে একটি ফাইল নির্বাচন করুন");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", bulkUploadFile);

      const response = await axios.post(
        `${API_BASE_URL}/cms/qa-knowledge-base/bulk-upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setUploadSummary(response.data.summary);
      toast.success(
        `${response.data.summary.successful}টি প্রশ্ন-উত্তর সফলভাবে আপলোড হয়েছে!`,
      );
      setBulkUploadFile(null);
      fetchQAPairs();
    } catch (error) {
      toast.error(formatErrorMessage(error, "বাল্ক আপলোড ব্যর্থ হয়েছে"));
      console.error(error);
    }
    setLoading(false);
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        question: "নিউটনের দ্বিতীয় সূত্র কি?",
        answer: "বল = ভর × ত্বরণ (F = m × a)",
        subject: "পদার্থবিজ্ঞান",
        class: "৯",
        chapter_topic: "গতিসূত্র",
        keywords: "নিউটন, বল, গতি",
        difficulty: "মাঝারি",
        type: "ধারণাগত",
      },
      {
        question: "সমাধান করুন: 2x + 5 = 15",
        answer: "x = 5",
        subject: "গণিত",
        class: "৯",
        chapter_topic: "সরল সমীকরণ",
        keywords: "বীজগণিত, সমীকরণ",
        difficulty: "সহজ",
        type: "সংখ্যাগত",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "প্রশ্ন-উত্তর টেমপ্লেট");
    XLSX.writeFile(workbook, "sample_qa_template.xlsx");
    toast.success("নমুনা টেমপ্লেট ডাউনলোড হয়েছে!");
  };

  const handleAddPaper = async (e) => {
    e.preventDefault();
    const isEditing = editingPaperId !== null;

    try {
      const token = localStorage.getItem("token");
      const endpoint = `${API_BASE_URL}/cms/previous-year-papers`;

      if (isEditing) {
        await axios.put(`${endpoint}/${editingPaperId}`, paperForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("প্রশ্নপত্র সফলভাবে আপডেট হয়েছে!");
      } else {
        await axios.post(endpoint, paperForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("প্রশ্নপত্র সফলভাবে যোগ হয়েছে!");
      }

      setShowAddPaper(false);
      resetForm("paper");
      fetchPreviousPapers();
    } catch (error) {
      const errorMsg = isEditing
        ? "প্রশ্নপত্র আপডেট করতে ব্যর্থ"
        : "প্রশ্নপত্র যোগ করতে ব্যর্থ";
      toast.error(formatErrorMessage(error, errorMsg));
      console.error(error);
    }
  };

  const handleEditPaper = (paper) => {
    setEditingPaperId(paper.id);
    setPaperForm({
      title: paper.title,
      subject: paper.subject,
      class_standard: paper.class_standard,
      chapter: paper.chapter || "",
      exam_year: paper.exam_year,
      paper_type: paper.paper_type,
      file_url: paper.file_url || "",
    });
    setShowAddPaper(true);
  };

  const handleDeletePaper = async (paperId) => {
    if (!window.confirm("আপনি কি নিশ্চিত যে এই প্রশ্নপত্রটি মুছতে চান?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/cms/previous-year-papers/${paperId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("প্রশ্নপত্র সফলভাবে মুছে ফেলা হয়েছে!");
      fetchPreviousPapers();
    } catch (error) {
      toast.error(formatErrorMessage(error, "প্রশ্নপত্র মুছতে ব্যর্থ"));
      console.error(error);
    }
  };

  const openChaptersModal = async (book, bookType) => {
    setSelectedBookForChapters({ ...book, bookType });
    setChapterViewIndex(0);
    setShowChaptersModal(true);

    if (!book.chapters || book.chapters.length === 0) {
      setChapterLoading(true);
      try {
        const token = localStorage.getItem("token");
        const endpoint =
          bookType === "academic"
            ? `${API_BASE_URL}/cms/academic-books/${book.id}`
            : `${API_BASE_URL}/cms/reference-books/${book.id}`;
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSelectedBookForChapters({
          ...response.data,
          bookType,
        });
      } catch (error) {
        toast.error("অধ্যায় লোড করতে ব্যর্থ");
        console.error(error);
      }
      setChapterLoading(false);
    }
  };

  const renderBookModal = (
    isReference,
    showModal,
    setShowModal,
    formState,
    setFormState,
    handleSubmit,
    editingId,
    resetFormFn,
  ) => {
    const formType = isReference ? "reference" : "book";
    const title = isReference
      ? editingId
        ? "সহায়ক পুস্তক সম্পাদনা"
        : "নতুন সহায়ক পুস্তক যোগ করুন"
      : editingId
        ? "পাঠ্যপুস্তক সম্পাদনা"
        : "নতুন পাঠ্যপুস্তক যোগ করুন";

    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {title}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="বইয়ের নাম *"
                value={formState.title}
                onChange={(e) =>
                  handleFormChange(formType, "title", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
              <input
                type="text"
                placeholder="লেখক *"
                value={formState.author}
                onChange={(e) =>
                  handleFormChange(formType, "author", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={formState.subject}
                  onChange={(e) =>
                    handleFormChange(formType, "subject", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">বিষয় নির্বাচন করুন *</option>
                  {[
                    "কুরআন",
                    "হাদিস",
                    "ফিকহ",
                    "আরবি",
                    "বাংলা",
                    "ইংরেজি",
                    "গণিত",
                    "বিজ্ঞান",
                    "সামাজিক বিজ্ঞান",
                    "ইতিহাস",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={formState.board}
                  onChange={(e) =>
                    handleFormChange(formType, "board", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="মাদ্রাসা বোর্ড">মাদ্রাসা বোর্ড</option>
                  <option value="কওমি বোর্ড">কওমি বোর্ড</option>
                  <option value="আলিয়া বোর্ড">আলিয়া বোর্ড</option>
                </select>
              </div>
              <AcademicHierarchySelector
                onSelectionChange={(selection) => {
                  const parts = [];
                  if (selection.marhala_name) parts.push(selection.marhala_name);
                  if (selection.department_name) parts.push(selection.department_name);
                  if (selection.semester_name) parts.push(selection.semester_name);
                  const displayValue = parts.join(' | ') || '';
                  if (formType === 'book') {
                    setBookForm(prev => ({
                      ...prev,
                      class_standard: displayValue,
                      marhala_id: selection.marhala_id || '',
                      department_id: selection.department_id || '',
                      semester_id: selection.semester_id || ''
                    }));
                  } else if (formType === 'reference') {
                    setReferenceBookForm(prev => ({
                      ...prev,
                      class_standard: displayValue,
                      marhala_id: selection.marhala_id || '',
                      department_id: selection.department_id || '',
                      semester_id: selection.semester_id || ''
                    }));
                  }
                }}
                showAllOption={false}
                layout="horizontal"
              />
            </div>

            <div className="border p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <File className="w-4 h-4" />
                প্রিলিমস/মুখবন্ধ ফাইল (ঐচ্ছিক - সর্বোচ্চ ১০০MB)
              </label>
              <input
                type="file"
                accept=".pdf,.txt,.docx,.doc"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    await handleFileUpload(file, (url, fileName) => {
                      setFormState({
                        ...formState,
                        prelims_file_url: url,
                        prelims_file_name: fileName,
                      });
                    });
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-600 dark:border-gray-500"
                disabled={uploadingFile || formState.prelims_file_url}
              />
              {formState.prelims_file_name && (
                <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                  <File className="w-4 h-4" />
                  <span>{formState.prelims_file_name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormState({
                        ...formState,
                        prelims_file_url: "",
                        prelims_file_name: "",
                      })
                    }
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="border p-4 rounded-lg space-y-3 bg-gray-50 dark:bg-gray-700">
              <h4 className="font-medium flex items-center gap-2 text-gray-900 dark:text-white">
                <BookOpen className="w-4 h-4" />
                অধ্যায়সমূহ (PDF/TXT/DOCX - সর্বোচ্চ ১০০MB প্রতিটি)
              </h4>
              {formState.chapters.map((chapter, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 border p-3 rounded-lg bg-white dark:bg-gray-600"
                >
                  <span className="font-bold text-gray-700 dark:text-gray-300 min-w-[85px] text-sm">
                    অধ্যায় {index + 1}:
                  </span>
                  <input
                    type="text"
                    placeholder="অধ্যায়ের শিরোনাম"
                    value={chapter.title}
                    onChange={(e) =>
                      handleChapterChange(
                        formType,
                        index,
                        "title",
                        e.target.value,
                      )
                    }
                    className="w-1/3 px-2 py-1 border rounded-lg text-sm dark:bg-gray-500 dark:border-gray-400"
                    required
                  />

                  <div className="flex items-center w-1/3 text-xs">
                    <input
                      type="file"
                      accept=".pdf,.txt,.docx,.doc"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          await handleFileUpload(file, (url, fileName) => {
                            handleChapterChange(
                              formType,
                              index,
                              "file_url",
                              url,
                              fileName,
                            );
                          });
                        }
                      }}
                      className="text-sm flex-1 dark:text-gray-300"
                      disabled={uploadingFile || chapter.file_url}
                    />
                  </div>

                  <div className="w-1/4 text-xs flex items-center justify-end gap-2">
                    {uploadingFile && (
                      <span className="text-blue-600">আপলোড হচ্ছে...</span>
                    )}
                    {chapter.file_name && (
                      <span className="text-green-600 flex items-center gap-1">
                        <File className="w-3 h-3" /> ফাইল
                      </span>
                    )}
                    {chapter.file_url && (
                      <button
                        type="button"
                        onClick={() =>
                          handleChapterChange(formType, index, "file_url", "")
                        }
                        className="text-red-500 hover:text-red-700 p-1"
                        title="ফাইল মুছুন"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {formState.chapters.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChapterField(formType, index)}
                        className="text-red-600 hover:text-red-800 p-1 rounded-full"
                        title="অধ্যায় মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {formState.chapters.length < 20 && (
                <button
                  type="button"
                  onClick={() => addChapterField(formType)}
                  className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 mt-2 font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  অধ্যায় যোগ করুন
                </button>
              )}
            </div>

            <div className="border p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                বাল্ক আপলোড (সম্পূর্ণ বই একটি ফাইলে - সর্বোচ্চ ১০০MB)
              </label>
              <input
                type="file"
                accept=".pdf,.txt,.docx,.doc"
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    bulk_upload_file: e.target.files[0],
                  })
                }
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-600 dark:border-gray-500"
                disabled={uploadingFile}
              />
              {formState.bulk_upload_file && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  নির্বাচিত: {formState.bulk_upload_file.name}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 disabled:bg-gray-400"
                disabled={uploadingFile}
              >
                {editingId ? "আপডেট করুন" : "যোগ করুন"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetFormFn(formType);
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                বাতিল
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          একাডেমিক কন্টেন্ট সিএমএস
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          পাঠ্যপুস্তক, সহায়ক পুস্তক, বিগত বছরের প্রশ্নপত্র ও প্রশ্ন-উত্তর ব্যবস্থাপনা
        </p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-600 mb-4 sm:mb-6">
        <nav className="-mb-px flex overflow-x-auto scrollbar-hide space-x-4 sm:space-x-8 pb-px">
          <button
            onClick={() => setActiveTab("books")}
            className={`${
              activeTab === "books"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
            } whitespace-nowrap py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shrink-0`}
          >
            <Book className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            পাঠ্যপুস্তক
          </button>
          <button
            onClick={() => setActiveTab("reference")}
            className={`${
              activeTab === "reference"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
            } whitespace-nowrap py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shrink-0`}
          >
            <Book className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            সহায়ক পুস্তক
          </button>
          <button
            onClick={() => setActiveTab("papers")}
            className={`${
              activeTab === "papers"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
            } whitespace-nowrap py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shrink-0`}
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            প্রশ্নপত্র
          </button>
          <button
            onClick={() => setActiveTab("qa")}
            className={`${
              activeTab === "qa"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
            } whitespace-nowrap py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shrink-0`}
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            প্রশ্ন-উত্তর
          </button>
        </nav>
      </div>

      {activeTab === "books" && (
        <div>
          {acadNavLevel.step !== "class" && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <button
                onClick={() =>
                  setAcadNavLevel({
                    step: "class",
                    class: "",
                    subject: "",
                  })
                }
                className="hover:text-emerald-600"
              >
                মারহালা
              </button>
              {acadNavLevel.class && (
                <>
                  <span>›</span>
                  <span className="font-medium">
                    {acadNavLevel.class}
                  </span>
                </>
              )}
              {acadNavLevel.step === "subject" && (
                <>
                  <span>›</span>
                  <span>বিষয় নির্বাচন করুন</span>
                </>
              )}
              {acadNavLevel.step === "books" && (
                <>
                  <span>›</span>
                  <span>{acadNavLevel.subject}</span>
                </>
              )}
            </div>
          )}

          {acadNavLevel.step === "class" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  পাঠ্যপুস্তক – মারহালা নির্বাচন করুন
                </h2>
                <button
                  onClick={() => {
                    resetForm("book");
                    setShowAddBook(true);
                  }}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  বই যোগ করুন
                </button>
              </div>
              {books.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    এখনও কোনো পাঠ্যপুস্তক যোগ করা হয়নি
                  </p>
                  <button
                    onClick={() => setShowAddBook(true)}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
                  >
                    প্রথম বই যোগ করুন
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...new Set(books.map((book) => book.class_standard))]
                    .sort()
                    .map((classNum) => (
                      <button
                        key={classNum}
                        onClick={() =>
                          setAcadNavLevel({
                            step: "subject",
                            class: classNum,
                            subject: "",
                          })
                        }
                        className="border-2 border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-center"
                      >
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {classNum}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {
                            books.filter((b) => b.class_standard === classNum)
                              .length
                          }{" "}
                          বই
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {acadNavLevel.step === "subject" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {acadNavLevel.class} – বিষয় নির্বাচন করুন
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setAcadNavLevel({
                        step: "class",
                        class: "",
                        subject: "",
                      })
                    }
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    ← মারহালায় ফিরুন
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  ...new Set(
                    books
                      .filter(
                        (book) => book.class_standard === acadNavLevel.class,
                      )
                      .map((book) => book.subject),
                  ),
                ]
                  .sort()
                  .map((subject) => (
                    <button
                      key={subject}
                      onClick={() =>
                        setAcadNavLevel({
                          step: "books",
                          class: acadNavLevel.class,
                          subject,
                        })
                      }
                      className="border-2 border-gray-300 dark:border-gray-700 rounded-lg p-4 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-left"
                    >
                      <div className="text-xl font-semibold text-gray-900 dark:text-white">
                        {subject}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {
                          books.filter(
                            (b) =>
                              b.class_standard === acadNavLevel.class &&
                              b.subject === subject,
                          ).length
                        }{" "}
                        বই
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {acadNavLevel.step === "books" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  পাঠ্যপুস্তক – {acadNavLevel.class} – {acadNavLevel.subject}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setAcadNavLevel({
                        step: "subject",
                        class: acadNavLevel.class,
                        subject: "",
                      })
                    }
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    ← বিষয়ে ফিরুন
                  </button>
                  <button
                    onClick={() => {
                      resetForm("book");
                      setBookForm((prev) => ({
                        ...prev,
                        class_standard: acadNavLevel.class,
                        subject: acadNavLevel.subject,
                      }));
                      setShowAddBook(true);
                    }}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4" />
                    বই যোগ করুন
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {books
                  .filter(
                    (book) =>
                      book.class_standard === acadNavLevel.class &&
                      book.subject === acadNavLevel.subject,
                  )
                  .map((book) => (
                    <div
                      key={book.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow dark:border-gray-700"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex-1">
                          {book.title}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditBook(book)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="সম্পাদনা করুন"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="মুছুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">লেখক: {book.author}</p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded dark:bg-purple-900/30 dark:text-purple-300">
                          {book.class_standard}
                        </span>
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded dark:bg-blue-900/30 dark:text-blue-300">
                          {book.subject}
                        </span>
                        {(book.chapter_count || book.chapters?.length || 0) > 0 && (
                          <span className="inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded dark:bg-emerald-900/30 dark:text-emerald-300">
                            {book.chapter_count || book.chapters?.length} অধ্যায়
                          </span>
                        )}
                        {book.pdf_url && !book.has_chapters && !(book.chapters?.length > 0) && (
                          <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded dark:bg-orange-900/30 dark:text-orange-300">
                            সম্পূর্ণ বই
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {book.pdf_url && !book.has_chapters && !(book.chapters?.length > 0) && (
                          <a
                            href={book.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-orange-500 text-white text-xs px-3 py-1.5 rounded hover:bg-orange-600"
                          >
                            <BookOpen className="w-3 h-3" />
                            সম্পূর্ণ বই
                          </a>
                        )}
                        {(book.has_chapters || (book.chapters && book.chapters.length > 0)) && (
                          <button
                            type="button"
                            onClick={() => openChaptersModal(book, "academic")}
                            className="inline-flex items-center gap-1 bg-emerald-500 text-white text-xs px-3 py-1.5 rounded hover:bg-emerald-600"
                          >
                            <BookOpen className="w-3 h-3" />
                            অধ্যায় দেখুন ({book.chapter_count || book.chapters?.length})
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {renderBookModal(
            false,
            showAddBook,
            setShowAddBook,
            bookForm,
            setBookForm,
            handleAddBook,
            editingBookId,
            resetForm,
          )}
        </div>
      )}

      {activeTab === "reference" && (
        <div>
          {refNavLevel.step !== "class" && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <button
                onClick={() =>
                  setRefNavLevel({
                    step: "class",
                    class: "",
                    subject: "",
                  })
                }
                className="hover:text-emerald-600"
              >
                মারহালা
              </button>
              {refNavLevel.class && (
                <>
                  <span>›</span>
                  <span className="font-medium">{refNavLevel.class}</span>
                </>
              )}
              {refNavLevel.step === "subject" && (
                <>
                  <span>›</span>
                  <span>বিষয় নির্বাচন করুন</span>
                </>
              )}
              {refNavLevel.step === "books" && (
                <>
                  <span>›</span>
                  <span>{refNavLevel.subject}</span>
                </>
              )}
            </div>
          )}

          {refNavLevel.step === "class" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  সহায়ক পুস্তক – মারহালা নির্বাচন করুন
                </h2>
                <button
                  onClick={() => {
                    resetForm("reference");
                    setShowAddReferenceBook(true);
                  }}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  বই যোগ করুন
                </button>
              </div>
              {referenceBooks.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    এখনও কোনো সহায়ক পুস্তক যোগ করা হয়নি
                  </p>
                  <button
                    onClick={() => setShowAddReferenceBook(true)}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
                  >
                    প্রথম বই যোগ করুন
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...new Set(referenceBooks.map((book) => book.class_standard))]
                    .sort()
                    .map((classNum) => (
                      <button
                        key={classNum}
                        onClick={() =>
                          setRefNavLevel({
                            step: "subject",
                            class: classNum,
                            subject: "",
                          })
                        }
                        className="border-2 border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-center"
                      >
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {classNum}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {
                            referenceBooks.filter((b) => b.class_standard === classNum)
                              .length
                          }{" "}
                          বই
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {refNavLevel.step === "subject" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {refNavLevel.class} – বিষয় নির্বাচন করুন
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setRefNavLevel({
                        step: "class",
                        class: "",
                        subject: "",
                      })
                    }
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    ← মারহালায় ফিরুন
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  ...new Set(
                    referenceBooks
                      .filter(
                        (book) => book.class_standard === refNavLevel.class,
                      )
                      .map((book) => book.subject),
                  ),
                ]
                  .sort()
                  .map((subject) => (
                    <button
                      key={subject}
                      onClick={() =>
                        setRefNavLevel({
                          step: "books",
                          class: refNavLevel.class,
                          subject,
                        })
                      }
                      className="border-2 border-gray-300 dark:border-gray-700 rounded-lg p-4 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-left"
                    >
                      <div className="text-xl font-semibold text-gray-900 dark:text-white">
                        {subject}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {
                          referenceBooks.filter(
                            (b) =>
                              b.class_standard === refNavLevel.class &&
                              b.subject === subject,
                          ).length
                        }{" "}
                        বই
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {refNavLevel.step === "books" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  সহায়ক পুস্তক – {refNavLevel.class} – {refNavLevel.subject}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setRefNavLevel({
                        step: "subject",
                        class: refNavLevel.class,
                        subject: "",
                      })
                    }
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    ← বিষয়ে ফিরুন
                  </button>
                  <button
                    onClick={() => {
                      resetForm("reference");
                      setReferenceBookForm((prev) => ({
                        ...prev,
                        class_standard: refNavLevel.class,
                        subject: refNavLevel.subject,
                      }));
                      setShowAddReferenceBook(true);
                    }}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4" />
                    বই যোগ করুন
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {referenceBooks
                  .filter(
                    (book) =>
                      book.class_standard === refNavLevel.class &&
                      book.subject === refNavLevel.subject,
                  )
                  .map((book) => (
                    <div
                      key={book.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow dark:border-gray-700"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex-1">
                          {book.title}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditReferenceBook(book)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="সম্পাদনা করুন"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReferenceBook(book.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="মুছুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">লেখক: {book.author}</p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded dark:bg-purple-900/30 dark:text-purple-300">
                          {book.class_standard}
                        </span>
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded dark:bg-blue-900/30 dark:text-blue-300">
                          {book.subject}
                        </span>
                        {(book.chapter_count || book.chapters?.length || 0) > 0 && (
                          <span className="inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded dark:bg-emerald-900/30 dark:text-emerald-300">
                            {book.chapter_count || book.chapters?.length} অধ্যায়
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {book.pdf_url && !book.has_chapters && !(book.chapters?.length > 0) && (
                          <a
                            href={book.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-orange-500 text-white text-xs px-3 py-1.5 rounded hover:bg-orange-600"
                          >
                            <BookOpen className="w-3 h-3" />
                            সম্পূর্ণ বই
                          </a>
                        )}
                        {(book.has_chapters || (book.chapters && book.chapters.length > 0)) && (
                          <button
                            type="button"
                            onClick={() => openChaptersModal(book, "reference")}
                            className="inline-flex items-center gap-1 bg-emerald-500 text-white text-xs px-3 py-1.5 rounded hover:bg-emerald-600"
                          >
                            <BookOpen className="w-3 h-3" />
                            অধ্যায় দেখুন ({book.chapter_count || book.chapters?.length})
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {renderBookModal(
            true,
            showAddReferenceBook,
            setShowAddReferenceBook,
            referenceBookForm,
            setReferenceBookForm,
            handleAddReferenceBook,
            editingReferenceBookId,
            resetForm,
          )}
        </div>
      )}

      {activeTab === "papers" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              বিগত বছরের প্রশ্নপত্র ({previousPapers.length})
            </h2>
            <button
              onClick={() => {
                resetForm("paper");
                setShowAddPaper(true);
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              নতুন প্রশ্নপত্র যোগ করুন
            </button>
          </div>
          
          {previousPapers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                এখনও কোনো প্রশ্নপত্র যোগ করা হয়নি
              </p>
              <button
                onClick={() => setShowAddPaper(true)}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
              >
                প্রথম প্রশ্নপত্র যোগ করুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {previousPapers.map((paper) => (
                <div
                  key={paper.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow dark:border-gray-700"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex-1">
                      {paper.title}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPaper(paper)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="সম্পাদনা করুন"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePaper(paper.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className="inline-block bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded dark:bg-pink-900/30 dark:text-pink-300">
                      {paper.class_standard}
                    </span>
                    <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded dark:bg-purple-900/30 dark:text-purple-300">
                      {paper.subject}
                    </span>
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded dark:bg-green-900/30 dark:text-green-300">
                      {paper.exam_year}
                    </span>
                    {paper.file_url && (
                      <a
                        href={paper.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
                      >
                        <FileText className="w-3 h-3" />
                        ফাইল দেখুন
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAddPaper && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  {editingPaperId
                    ? "প্রশ্নপত্র সম্পাদনা করুন"
                    : "নতুন প্রশ্নপত্র যোগ করুন"}
                </h3>
                <form onSubmit={handleAddPaper} className="space-y-4">
                  <input
                    type="text"
                    placeholder="প্রশ্নপত্রের শিরোনাম *"
                    value={paperForm.title}
                    onChange={(e) =>
                      setPaperForm({ ...paperForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                  <div className="space-y-4">
                    <select
                      value={paperForm.subject}
                      onChange={(e) =>
                        setPaperForm({
                          ...paperForm,
                          subject: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">বিষয় নির্বাচন করুন *</option>
                      {[
                        "কুরআন",
                        "হাদিস",
                        "ফিকহ",
                        "আরবি",
                        "বাংলা",
                        "ইংরেজি",
                        "গণিত",
                        "বিজ্ঞান",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <AcademicHierarchySelector
                      onSelectionChange={(selection) => {
                        const parts = [];
                        if (selection.marhala_name) parts.push(selection.marhala_name);
                        if (selection.department_name) parts.push(selection.department_name);
                        if (selection.semester_name) parts.push(selection.semester_name);
                        setPaperForm(prev => ({
                          ...prev,
                          class_standard: parts.join(' | ') || '',
                          marhala_id: selection.marhala_id || '',
                          department_id: selection.department_id || '',
                          semester_id: selection.semester_id || ''
                        }));
                      }}
                      showAllOption={false}
                      layout="horizontal"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="পরীক্ষার বছর *"
                      value={paperForm.exam_year}
                      onChange={(e) =>
                        setPaperForm({
                          ...paperForm,
                          exam_year: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      min="2000"
                      max={new Date().getFullYear()}
                      required
                    />
                    <select
                      value={paperForm.paper_type}
                      onChange={(e) =>
                        setPaperForm({
                          ...paperForm,
                          paper_type: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="বার্ষিক পরীক্ষা">বার্ষিক পরীক্ষা</option>
                      <option value="অর্ধ-বার্ষিক">অর্ধ-বার্ষিক</option>
                      <option value="প্রাক-নির্বাচনী">প্রাক-নির্বাচনী</option>
                      <option value="মডেল টেস্ট">মডেল টেস্ট</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="অধ্যায় (ঐচ্ছিক)"
                    value={paperForm.chapter}
                    onChange={(e) =>
                      setPaperForm({ ...paperForm, chapter: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      ফাইল আপলোড করুন (PDF, TXT, DOCX/DOC - সর্বোচ্চ ১০০MB)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.txt,.docx,.doc"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          await handleFileUpload(file, (url) => {
                            setPaperForm({ ...paperForm, file_url: url });
                          });
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      disabled={uploadingFile}
                    />
                    {uploadingFile && (
                      <p className="text-sm text-blue-600 mt-1">আপলোড হচ্ছে...</p>
                    )}
                    {paperForm.file_url && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ ফাইল আপলোড হয়েছে
                        <button
                          type="button"
                          onClick={() =>
                            setPaperForm({ ...paperForm, file_url: "" })
                          }
                          className="text-red-500 hover:text-red-700 ml-3"
                        >
                          <X className="w-4 h-4 inline-block" /> মুছুন
                        </button>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700"
                      disabled={uploadingFile}
                    >
                      {editingPaperId ? "আপডেট করুন" : "যোগ করুন"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPaper(false);
                        resetForm("paper");
                      }}
                      className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      বাতিল
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "qa" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              প্রশ্ন-উত্তর জ্ঞানভাণ্ডার ({qaPairs.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowBulkUpload(true);
                  setUploadSummary(null);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Upload className="w-4 h-4" />
                বাল্ক আপলোড
              </button>
              <button
                onClick={() => {
                  resetForm("qa");
                  setShowAddQA(true);
                }}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                প্রশ্ন-উত্তর যোগ করুন
              </button>
            </div>
          </div>

          {qaPairs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                এখনও কোনো প্রশ্ন-উত্তর যোগ করা হয়নি
              </p>
              <button
                onClick={() => setShowAddQA(true)}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
              >
                প্রথম প্রশ্ন-উত্তর যোগ করুন
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {qaPairs.map((qa) => (
                <div key={qa.id} className="border rounded-lg p-4 dark:border-gray-700">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        প্রশ্ন: {qa.question}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">উত্তর: {qa.answer}</p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded dark:bg-blue-900/30 dark:text-blue-300">
                          {qa.subject}
                        </span>
                        <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded dark:bg-purple-900/30 dark:text-purple-300">
                          {qa.class_standard}
                        </span>
                        {qa.chapter_topic && (
                          <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded dark:bg-yellow-900/30 dark:text-yellow-300">
                            {qa.chapter_topic}
                          </span>
                        )}
                        <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded dark:bg-gray-600 dark:text-gray-300">
                          {qa.difficulty_level}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditQA(qa)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="সম্পাদনা করুন"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQA(qa.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAddQA && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  {editingQAId ? "প্রশ্ন-উত্তর সম্পাদনা করুন" : "নতুন প্রশ্ন-উত্তর যোগ করুন"}
                </h3>
                <form onSubmit={handleAddQA} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      প্রশ্ন
                    </label>
                    <input
                      type="text"
                      value={qaForm.question}
                      onChange={(e) =>
                        handleFormChange("qa", "question", e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      উত্তর
                    </label>
                    <textarea
                      value={qaForm.answer}
                      onChange={(e) =>
                        handleFormChange("qa", "answer", e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows={4}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        বিষয়
                      </label>
                      <input
                        type="text"
                        value={qaForm.subject}
                        onChange={(e) =>
                          handleFormChange("qa", "subject", e.target.value)
                        }
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        মারহালা
                      </label>
                      <input
                        type="text"
                        value={qaForm.class_standard}
                        onChange={(e) =>
                          handleFormChange(
                            "qa",
                            "class_standard",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        অধ্যায়/টপিক
                      </label>
                      <input
                        type="text"
                        value={qaForm.chapter}
                        onChange={(e) =>
                          handleFormChange("qa", "chapter", e.target.value)
                        }
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="যেমন: তাজবীদ"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        কঠিনতার স্তর
                      </label>
                      <select
                        value={qaForm.difficulty_level}
                        onChange={(e) =>
                          handleFormChange(
                            "qa",
                            "difficulty_level",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="সহজ">সহজ</option>
                        <option value="মাঝারি">মাঝারি</option>
                        <option value="কঠিন">কঠিন</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        প্রশ্নের ধরন
                      </label>
                      <select
                        value={qaForm.question_type}
                        onChange={(e) =>
                          handleFormChange(
                            "qa",
                            "question_type",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="ধারণাগত">ধারণাগত</option>
                        <option value="সংখ্যাগত">সংখ্যাগত</option>
                        <option value="তাত্ত্বিক">তাত্ত্বিক</option>
                        <option value="প্রয়োগমূলক">প্রয়োগমূলক</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      কিওয়ার্ড (কমা দিয়ে আলাদা করুন)
                    </label>
                    <input
                      type="text"
                      value={qaForm.keywords}
                      onChange={(e) =>
                        handleFormChange("qa", "keywords", e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="নামাজ, রোজা, হজ্জ"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700"
                    >
                      {editingQAId ? "আপডেট করুন" : "যোগ করুন"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddQA(false);
                        resetForm("qa");
                      }}
                      className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      বাতিল
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showBulkUpload && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  বাল্ক আপলোড প্রশ্ন-উত্তর
                </h3>

                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                      ফাইলের প্রয়োজনীয়তা
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                      Excel (.xlsx) বা CSV (.csv) ফাইল আপলোড করুন এই কলামগুলি সহ:
                    </p>
                    <ul className="text-sm text-blue-600 dark:text-blue-400 list-disc list-inside space-y-1">
                      <li>
                        <strong>question</strong> (আবশ্যক)
                      </li>
                      <li>
                        <strong>answer</strong> (আবশ্যক)
                      </li>
                      <li>
                        <strong>subject</strong> (ঐচ্ছিক)
                      </li>
                      <li>
                        <strong>class</strong> বা{" "}
                        <strong>class_standard</strong> (ঐচ্ছিক)
                      </li>
                      <li>
                        <strong>chapter_topic</strong> (ঐচ্ছিক)
                      </li>
                      <li>
                        <strong>keywords</strong> (ঐচ্ছিক)
                      </li>
                      <li>
                        <strong>difficulty</strong> বা{" "}
                        <strong>difficulty_level</strong> (ঐচ্ছিক)
                      </li>
                      <li>
                        <strong>type</strong> বা <strong>question_type</strong>{" "}
                        (ঐচ্ছিক)
                      </li>
                    </ul>

                    <button
                      onClick={downloadSampleTemplate}
                      className="mt-3 w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      নমুনা টেমপ্লেট ডাউনলোড করুন
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      ফাইল নির্বাচন করুন
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={(e) => setBulkUploadFile(e.target.files[0])}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  {uploadSummary && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">
                        আপলোড সারসংক্ষেপ
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        সফল: {uploadSummary.successful} | ব্যর্থ: {uploadSummary.failed}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleBulkUpload}
                      disabled={!bulkUploadFile || loading}
                      className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        "আপলোড হচ্ছে..."
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          আপলোড করুন
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowBulkUpload(false);
                        setBulkUploadFile(null);
                        setUploadSummary(null);
                      }}
                      className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      বন্ধ করুন
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showChaptersModal && selectedBookForChapters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedBookForChapters.title} - অধ্যায়সমূহ
              </h3>
              <button
                onClick={() => {
                  setShowChaptersModal(false);
                  setSelectedBookForChapters(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {chapterLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">অধ্যায় লোড হচ্ছে...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(selectedBookForChapters.chapters || []).map((chapter, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="bg-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1 rounded dark:bg-emerald-900/30 dark:text-emerald-300">
                        অধ্যায় {chapter.chapter_number || index + 1}
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {chapter.title || chapter.chapter_title}
                      </span>
                    </div>
                    {chapter.file_url && (
                      <a
                        href={chapter.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-blue-500 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-600"
                      >
                        <Eye className="w-3 h-3" />
                        দেখুন
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicCMS;
