import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  BookOpen,
  Plus,
  Users,
  UserCheck,
  Edit,
  Trash2,
  Search,
  Download,
  GraduationCap,
  FolderOpen,
  Folder,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  AlertTriangle,
  Building2,
  Moon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const BACKEND_URL = process.env.REACT_APP_API_URL || "/api";
const API = BACKEND_URL;

// Madrasah-specific Bangla labels
const madrasahLabels = {
  title: "জামাত ব্যবস্থাপনা",
  subtitle: "জামাত, শাখা এবং উস্তাদ নিয়োগ পরিচালনা করুন",
  class: "জামাত",
  classes: "জামাত সমূহ",
  section: "শাখা",
  sections: "শাখা সমূহ",
  subject: "কিতাব / বিষয়",
  subjects: "কিতাব সমূহ",
  classSubjects: "জামাতের কিতাব",
  standard: "মারহালা",
  classTeacher: "দায়িত্বপ্রাপ্ত উস্তাদ",
  sectionTeacher: "শাখার উস্তাদ",
  maxStudents: "সর্বোচ্চ ছাত্র সংখ্যা",
  addClass: "নতুন জামাত যোগ করুন",
  addSection: "নতুন শাখা যোগ করুন",
  addSubject: "নতুন কিতাব যোগ করুন",
  editClass: "জামাত সম্পাদনা",
  editSection: "শাখা সম্পাদনা",
  editSubject: "কিতাব সম্পাদনা",
  displayName: "প্রদর্শন নাম",
  institutionType: "প্রতিষ্ঠানের ধরন",
  madrasah: "মাদ্রাসা",
  school: "স্কুল",
  totalClasses: "মোট জামাত",
  totalSections: "মোট শাখা",
  totalSubjects: "মোট কিতাব",
  assignedTeachers: "নিয়োজিত উস্তাদ",
  notAssigned: "নির্ধারিত নয়",
  noClasses: "এখনো কোনো জামাত যোগ করা হয়নি",
  noSections: "এখনো কোনো শাখা যোগ করা হয়নি",
  noSubjects: "এখনো কোনো কিতাব যোগ করা হয়নি",
  active: "সক্রিয়",
  inactive: "নিষ্ক্রিয়",
  status: "অবস্থা",
  actions: "অ্যাকশন",
  save: "সংরক্ষণ",
  saving: "সংরক্ষণ হচ্ছে...",
  cancel: "বাতিল",
  update: "আপডেট",
  delete: "মুছুন",
  selectClass: "জামাত নির্বাচন করুন",
  selectTeacher: "উস্তাদ নির্বাচন করুন (ঐচ্ছিক)",
  noTeacherAssigned: "কোনো উস্তাদ নির্ধারিত নয়",
  selectStandard: "মারহালা নির্বাচন করুন",
  filterByClass: "জামাত অনুযায়ী ফিল্টার",
  allClasses: "সকল জামাত",
  allSections: "সকল শাখা",
  showInactive: "নিষ্ক্রিয় জামাত দেখান",
  initializeDefaults: "ডিফল্ট সেটআপ",
  exportClasses: "এক্সপোর্ট",
  addSampleTeachers: "নমুনা উস্তাদ যোগ করুন",
  sectionName: "শাখার নাম",
  subjectName: "কিতাবের নাম",
  subjectCode: "কিতাব কোড",
  classFormDesc: "জামাতের তথ্য তৈরি বা পরিবর্তন করুন",
  sectionFormDesc: "শাখার তথ্য তৈরি বা পরিবর্তন করুন",
  subjectFormDesc: "নির্দিষ্ট জামাতের জন্য কিতাব যোগ বা পরিবর্তন করুন",
  madrasahDesc: "মাদ্রাসা জামাত কাঠামো (ইবতেদায়ী, দাখিল, আলিম)",
  schoolDesc: "সাধারণ স্কুল শ্রেণি কাঠামো (১ম-১২শ শ্রেণি)",
  displayNameHint:
    "এই নামটি UI তে প্রদর্শিত হবে। আপনি বাংলা বা যেকোনো কাস্টম নাম ব্যবহার করতে পারেন।",
  sectionPlaceholder: "যেমন: ক, খ, গ বা A, B, C",
  subjectPlaceholder: "যেমন: কুরআন, হাদিস, ফিকহ",
  subjectCodePlaceholder: "যেমন: QRN101, HDT101",
};

// School-specific English labels
const schoolLabels = {
  title: "Class Management",
  subtitle: "Manage classes, sections, and teacher assignments",
  class: "Class",
  classes: "Classes",
  section: "Section",
  sections: "Sections",
  subject: "Subject",
  subjects: "Subjects",
  classSubjects: "Class Subjects",
  standard: "Standard",
  classTeacher: "Class Teacher",
  sectionTeacher: "Section Teacher",
  maxStudents: "Max Students",
  addClass: "Add Class",
  addSection: "Add Section",
  addSubject: "Add Subject",
  editClass: "Edit Class",
  editSection: "Edit Section",
  editSubject: "Edit Subject",
  displayName: "Display Name",
  institutionType: "Institution Type",
  madrasah: "Madrasah",
  school: "স্কুল",
  totalClasses: "Total Classes",
  totalSections: "Total Sections",
  totalSubjects: "Total Subjects",
  assignedTeachers: "Assigned Teachers",
  notAssigned: "Not assigned",
  noClasses: "No classes added yet",
  noSections: "No sections added yet",
  noSubjects: "No subjects added yet",
  active: "Active",
  inactive: "Inactive",
  status: "Status",
  actions: "Actions",
  save: "Save",
  saving: "Saving...",
  cancel: "Cancel",
  update: "Update",
  delete: "Delete",
  selectClass: "Select class",
  selectTeacher: "Select teacher (optional)",
  noTeacherAssigned: "No teacher assigned",
  selectStandard: "Select standard",
  filterByClass: "Filter by class",
  allClasses: "All Classes",
  allSections: "All Sections",
  showInactive: "Show inactive classes",
  initializeDefaults: "Initialize Defaults",
  exportClasses: "Export Classes",
  addSampleTeachers: "Add Sample Teachers",
  sectionName: "Section Name",
  subjectName: "Subject Name",
  subjectCode: "Subject Code",
  classFormDesc: "Create or modify class information.",
  sectionFormDesc: "Create or modify section information.",
  subjectFormDesc: "Add or modify subjects for a specific class.",
  madrasahDesc: "Madrasah class structure (Ebtedayee, Dakhil, Alim)",
  schoolDesc: "Standard school class structure (Class 1-12)",
  displayNameHint:
    "This name will be shown in the UI. You can use Bengali or any custom name.",
  sectionPlaceholder: "e.g., A, B, C",
  subjectPlaceholder: "e.g., Mathematics, Science",
  subjectCodePlaceholder: "e.g., MATH101, SCI101",
};

const toBengaliNumeral = (num) => {
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).replace(/[0-9]/g, (d) => bengaliDigits[parseInt(d)]);
};

const withTimeout = (promise, timeoutMs = 10000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Request timeout")),
      timeoutMs,
    );
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
};

const safeBackgroundRefresh = (refreshFn) => {
  Promise.resolve(refreshFn()).catch((err) =>
    console.error("Background refresh failed:", err),
  );
};

const ClassManagement = () => {
  const { t } = useTranslation();
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [institutionType, setInstitutionType] = useState("madrasah");
  const [classDefaults, setClassDefaults] = useState(null);
  const [showInactiveClasses, setShowInactiveClasses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const [classFormData, setClassFormData] = useState({
    name: "",
    standard: "select_standard",
    display_name: "",
    internal_standard: 0,
    class_teacher_id: "no_teacher",
    max_students: 60,
    order_index: 0,
    institution_type: "school",
  });

  const [sectionFormData, setSectionFormData] = useState({
    class_id: "select_class",
    name: "",
    section_teacher_id: "no_teacher",
    max_students: 40,
  });

  const [subjectFormData, setSubjectFormData] = useState({
    subject_name: "",
    subject_code: "",
    class_standard: "select_class",
    section_id: "all_sections",
    description: "",
    is_elective: false,
  });

  const [expandedClasses, setExpandedClasses] = useState({});

  // Get localized labels based on institution type
  const labels = institutionType === "madrasah" ? madrasahLabels : schoolLabels;

  // Get unique standards from classes API (dynamic)
  const getUniqueStandards = () => {
    const uniqueStandards = [...new Set(classes.map((cls) => cls.standard))];
    return uniqueStandards.sort((a, b) => {
      // Custom sort order for classes
      const order = [
        "Nursery",
        "LKG",
        "UKG",
        "Class 1",
        "Class 2",
        "Class 3",
        "Class 4",
        "Class 5",
        "Class 6",
        "Class 7",
        "Class 8",
        "Class 9",
        "Class 10",
        "Class 11",
        "Class 12",
      ];
      return order.indexOf(a) - order.indexOf(b);
    });
  };

  // Fallback standards for class creation based on institution type
  const schoolStandards = [
    { standard: "Nursery", display_name: "Nursery", internal_standard: 0 },
    { standard: "LKG", display_name: "LKG", internal_standard: 0 },
    { standard: "UKG", display_name: "UKG", internal_standard: 0 },
    { standard: "Class 1", display_name: "Class 1", internal_standard: 1 },
    { standard: "Class 2", display_name: "Class 2", internal_standard: 2 },
    { standard: "Class 3", display_name: "Class 3", internal_standard: 3 },
    { standard: "Class 4", display_name: "Class 4", internal_standard: 4 },
    { standard: "Class 5", display_name: "Class 5", internal_standard: 5 },
    { standard: "Class 6", display_name: "Class 6", internal_standard: 6 },
    { standard: "Class 7", display_name: "Class 7", internal_standard: 7 },
    { standard: "Class 8", display_name: "Class 8", internal_standard: 8 },
    { standard: "Class 9", display_name: "Class 9", internal_standard: 9 },
    { standard: "Class 10", display_name: "Class 10", internal_standard: 10 },
    {
      standard: "Class 11",
      display_name: "Class 11 (HSC 1st Year)",
      internal_standard: 11,
    },
    {
      standard: "Class 12",
      display_name: "Class 12 (HSC 2nd Year)",
      internal_standard: 12,
    },
  ];

  const madrasahStandards = [
    {
      standard: "Class 1",
      display_name: "ইবতেদায়ী ১ম বর্ষ",
      internal_standard: 1,
      category: "Ebtedayee",
    },
    {
      standard: "Class 2",
      display_name: "ইবতেদায়ী ২য় বর্ষ",
      internal_standard: 2,
      category: "Ebtedayee",
    },
    {
      standard: "Class 3",
      display_name: "ইবতেদায়ী ৩য় বর্ষ",
      internal_standard: 3,
      category: "Ebtedayee",
    },
    {
      standard: "Class 4",
      display_name: "ইবতেদায়ী ৪র্থ বর্ষ",
      internal_standard: 4,
      category: "Ebtedayee",
    },
    {
      standard: "Class 5",
      display_name: "ইবতেদায়ী ৫ম বর্ষ",
      internal_standard: 5,
      category: "Ebtedayee",
    },
    {
      standard: "Class 6",
      display_name: "দাখিল ৬ষ্ঠ শ্রেণি",
      internal_standard: 6,
      category: "Dakhil",
    },
    {
      standard: "Class 7",
      display_name: "দাখিল ৭ম শ্রেণি",
      internal_standard: 7,
      category: "Dakhil",
    },
    {
      standard: "Class 8",
      display_name: "দাখিল ৮ম শ্রেণি",
      internal_standard: 8,
      category: "Dakhil",
    },
    {
      standard: "Class 9",
      display_name: "দাখিল ৯ম শ্রেণি",
      internal_standard: 9,
      category: "Dakhil",
    },
    {
      standard: "Class 10",
      display_name: "দাখিল ১০ম শ্রেণি",
      internal_standard: 10,
      category: "Dakhil",
    },
    {
      standard: "Class 11",
      display_name: "আলিম ১ম বর্ষ",
      internal_standard: 11,
      category: "Alim",
    },
    {
      standard: "Class 12",
      display_name: "আলিম ২য় বর্ষ",
      internal_standard: 12,
      category: "Alim",
    },
    {
      standard: "Nazera",
      display_name: "নাজেরা",
      internal_standard: 0,
      category: "Special",
    },
    {
      standard: "Hifz",
      display_name: "হিফজ",
      internal_standard: 0,
      category: "Special",
    },
    {
      standard: "Kitab",
      display_name: "কিতাব",
      internal_standard: 0,
      category: "Special",
    },
  ];

  const defaultStandards =
    institutionType === "madrasah" ? madrasahStandards : schoolStandards;

  // For subject dropdowns, use standards from existing classes
  const classStandards = getUniqueStandards();

  useEffect(() => {
    fetchData();
    fetchInstitutionSettings();
  }, []);

  const fetchInstitutionSettings = async () => {
    try {
      const response = await axios.get(`${API}/institution/settings`);
      if (response.data?.institution_type) {
        // Normalize to lowercase for consistent comparison
        setInstitutionType(response.data.institution_type.toLowerCase());
      }
    } catch (error) {
      console.log("Using default institution type: school");
    }
  };

  const fetchData = async () => {
    try {
      console.log("🔄 Fetching class management data...");
      const [classesRes, sectionsRes, staffRes, subjectsRes] =
        await Promise.all([
          axios.get(`${API}/classes`),
          axios.get(`${API}/sections`),
          axios.get(`${API}/staff`),
          axios.get(`${API}/subjects`),
        ]);

      console.log("✅ Classes fetched:", classesRes.data);
      console.log("✅ Sections fetched:", sectionsRes.data);
      console.log("✅ Staff fetched:", staffRes.data);
      console.log("✅ Subjects fetched:", subjectsRes.data);

      const classData = Array.isArray(classesRes.data)
        ? classesRes.data
        : classesRes.data?.classes || [];
      const sectionData = Array.isArray(sectionsRes.data)
        ? sectionsRes.data
        : sectionsRes.data?.sections || [];
      const staffData = Array.isArray(staffRes.data)
        ? staffRes.data
        : staffRes.data?.staff || [];
      const subjectData = Array.isArray(subjectsRes.data)
        ? subjectsRes.data
        : subjectsRes.data?.subjects || [];

      setClasses(classData);
      setSections(sectionData);
      setSubjects(subjectData);

      // Filter staff to include teachers and senior positions
      const teachers = staffData.filter(
        (s) =>
          s.designation &&
          (s.designation.toLowerCase().includes("teacher") ||
            s.designation.toLowerCase().includes("principal") ||
            s.designation.toLowerCase().includes("head")),
      );
      console.log("✅ Teachers filtered:", teachers);

      setStaff(teachers);
    } catch (error) {
      console.error("❌ Failed to fetch data:", error);
      toast.error(
        "Failed to load data: " +
          (error.response?.data?.detail || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClassSubmit = async (e) => {
    e.preventDefault();

    if (submittingRef.current) {
      return;
    }

    console.log("🔄 Submitting class form:", classFormData);
    submittingRef.current = true;
    setIsSubmitting(true);

    const unlockTimeout = setTimeout(() => {
      submittingRef.current = false;
      setIsSubmitting(false);
      toast.warning(
        "Operation is taking longer than expected. Please check the list.",
      );
    }, 15000);

    try {
      if (classFormData.standard === "select_standard") {
        toast.error("মারহালা নির্বাচন করুন");
        clearTimeout(unlockTimeout);
        submittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const submitData = {
        ...classFormData,
        max_students: parseInt(classFormData.max_students),
        class_teacher_id:
          classFormData.class_teacher_id === "no_teacher"
            ? null
            : classFormData.class_teacher_id,
        display_name: classFormData.display_name || classFormData.name,
        internal_standard: classFormData.internal_standard || 0,
        order_index: classFormData.order_index || classes.length,
        institution_type: institutionType,
      };

      console.log("📤 Sending data to API:", submitData);

      if (editingClass) {
        const res = await withTimeout(
          axios.put(`${API}/classes/${editingClass.id}`, submitData),
          10000,
        );
        const updatedClass = res.data?.class || res.data || submitData;
        setClasses((prev) =>
          prev.map((cls) =>
            cls.id === editingClass.id ? { ...cls, ...updatedClass } : cls,
          ),
        );
        toast.success("জামাত সফলভাবে আপডেট হয়েছে");
      } else {
        const res = await withTimeout(axios.post(`${API}/classes`, submitData), 10000);
        const newClass = res.data?.class || res.data;
        setClasses((prev) => [...prev, newClass]);
        toast.success("জামাত সফলভাবে যোগ হয়েছে");
      }

      setIsClassModalOpen(false);
      setEditingClass(null);
      resetClassForm();
    } catch (error) {
      console.error("Failed to save class:", error);
      const errorMessage =
        error.message === "Request timeout"
          ? "সময় শেষ। আবার চেষ্টা করুন।"
          : error.response?.data?.detail || "জামাত সংরক্ষণে সমস্যা হয়েছে";
      toast.error(errorMessage);
    } finally {
      clearTimeout(unlockTimeout);
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSectionSubmit = async (e) => {
    e.preventDefault();

    console.log(
      "🔄 Section form submit triggered, submittingRef:",
      submittingRef.current,
    );
    console.log("📋 Section form data:", sectionFormData);

    if (submittingRef.current) {
      console.log("⚠️ Already submitting, returning early");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setLoading(true);

    const unlockTimeout = setTimeout(() => {
      submittingRef.current = false;
      setIsSubmitting(false);
      setLoading(false);
      toast.warning(
        "Operation is taking longer than expected. Please check the list.",
      );
    }, 15000);

    try {
      if (
        !sectionFormData.class_id ||
        sectionFormData.class_id === "select_class" ||
        sectionFormData.class_id === ""
      ) {
        toast.error("জামাত নির্বাচন করুন");
        clearTimeout(unlockTimeout);
        submittingRef.current = false;
        setIsSubmitting(false);
        setLoading(false);
        return;
      }

      if (!sectionFormData.name || sectionFormData.name.trim() === "") {
        toast.error("শাখার নাম লিখুন");
        clearTimeout(unlockTimeout);
        submittingRef.current = false;
        setIsSubmitting(false);
        setLoading(false);
        return;
      }

      const submitData = {
        class_id: sectionFormData.class_id,
        name: sectionFormData.name.trim(),
        max_students: parseInt(sectionFormData.max_students) || 40,
        section_teacher_id:
          sectionFormData.section_teacher_id === "no_teacher"
            ? null
            : sectionFormData.section_teacher_id,
      };

      console.log("📤 Sending section data to API:", submitData);

      if (editingSection) {
        const response = await withTimeout(
          axios.put(`${API}/sections/${editingSection.id}`, submitData),
          10000,
        );
        console.log("✅ Section update response:", response.data);
        const updatedSection = response.data?.section || response.data;
        setSections((prev) =>
          prev.map((s) =>
            s.id === editingSection.id ? { ...s, ...updatedSection } : s,
          ),
        );
        toast.success("শাখা সফলভাবে আপডেট হয়েছে");
      } else {
        const response = await withTimeout(
          axios.post(`${API}/sections`, submitData),
          10000,
        );
        console.log("✅ Section create response:", response.data);
        const newSection = response.data?.section || response.data;
        setSections((prev) => [...prev, newSection]);
        toast.success("শাখা সফলভাবে যোগ হয়েছে");
      }

      setIsSectionModalOpen(false);
      setEditingSection(null);
      resetSectionForm();
    } catch (error) {
      console.error("❌ Failed to save section:", error);
      console.error("❌ Error details:", error.response?.data);
      const errorMessage =
        error.message === "Request timeout"
          ? "সময় শেষ। আবার চেষ্টা করুন।"
          : error.response?.data?.detail ||
            error.message ||
            "শাখা সংরক্ষণে সমস্যা হয়েছে";
      toast.error(errorMessage);
    } finally {
      clearTimeout(unlockTimeout);
      submittingRef.current = false;
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleEditClass = (cls) => {
    setClassFormData({
      name: cls.name,
      standard: cls.standard,
      display_name: cls.display_name || cls.name || cls.standard,
      internal_standard: cls.internal_standard || 0,
      class_teacher_id: cls.class_teacher_id || "no_teacher",
      max_students: cls.max_students,
      order_index: cls.order_index || 0,
      institution_type: cls.institution_type || institutionType,
    });
    setEditingClass(cls);
    setIsClassModalOpen(true);
  };

  const handleEditSection = (section) => {
    setSectionFormData({
      class_id: section.class_id,
      name: section.name,
      section_teacher_id: section.section_teacher_id || "no_teacher",
      max_students: section.max_students,
    });
    setEditingSection(section);
    setIsSectionModalOpen(true);
  };

  const handleDeleteClass = async (cls) => {
    const result = await Swal.fire({
      title: `"${cls.display_name || cls.name}" মুছে ফেলবেন?`,
      text: "এই জামাতের সকল শাখা মুছে যাবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "হ্যাঁ, মুছুন!",
      cancelButtonText: "বাতিল",
    });

    if (!result.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/classes/${cls.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Real-time update: Remove class from state
      setClasses((prev) => prev.filter((c) => c.id !== cls.id));
      // Also remove related sections
      setSections((prev) => prev.filter((s) => s.class_id !== cls.id));
      
      toast.success(`"${cls.display_name || cls.name}" সফলভাবে মুছে ফেলা হয়েছে`);
    } catch (error) {
      console.error("Failed to delete class:", error);
      toast.error(error.response?.data?.detail || "জামাত মুছতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSection = async (section) => {
    const result = await Swal.fire({
      title: `"${section.name}" শাখা মুছে ফেলবেন?`,
      text: "এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "হ্যাঁ, মুছুন!",
      cancelButtonText: "বাতিল",
    });

    if (!result.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/sections/${section.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Real-time update: Remove section from state
      setSections((prev) => prev.filter((s) => s.id !== section.id));
      
      toast.success(`"${section.name}" শাখা সফলভাবে মুছে ফেলা হয়েছে`);
    } catch (error) {
      console.error("Failed to delete section:", error);
      toast.error(error.response?.data?.detail || "শাখা মুছতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const resetClassForm = () => {
    setClassFormData({
      name: "",
      standard: "select_standard",
      display_name: "",
      internal_standard: 0,
      class_teacher_id: "no_teacher",
      max_students: 60,
      order_index: 0,
      institution_type: institutionType,
    });
  };

  const resetSectionForm = () => {
    setSectionFormData({
      class_id: "select_class",
      name: "",
      section_teacher_id: "no_teacher",
      max_students: 40,
    });
  };

  const resetSubjectForm = () => {
    setSubjectFormData({
      subject_name: "",
      subject_code: "",
      class_standard: "select_class",
      section_id: "all_sections",
      description: "",
      is_elective: false,
    });
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    console.log("🔄 Submitting subject form:", subjectFormData);
    setLoading(true);

    try {
      if (subjectFormData.class_standard === "select_class") {
        toast.error("জামাত নির্বাচন করুন");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const submitData = {
        ...subjectFormData,
        section_id:
          subjectFormData.section_id === "all_sections"
            ? null
            : subjectFormData.section_id,
      };

      console.log("📤 Sending subject data to API:", submitData);

      if (editingSubject) {
        const res = await axios.put(`${API}/subjects/${editingSubject.id}`, submitData, {
          headers,
        });
        const updatedSubject = res.data?.subject || res.data || submitData;
        setSubjects((prev) =>
          prev.map((s) =>
            s.id === editingSubject.id ? { ...s, ...updatedSubject } : s,
          ),
        );
        toast.success("কিতাব সফলভাবে আপডেট হয়েছে");
      } else {
        const res = await axios.post(`${API}/subjects`, submitData, { headers });
        const newSubject = res.data?.subject || res.data;
        setSubjects((prev) => [...prev, newSubject]);
        toast.success("কিতাব সফলভাবে যোগ হয়েছে");
      }

      setIsSubjectModalOpen(false);
      setEditingSubject(null);
      resetSubjectForm();
    } catch (error) {
      console.error("Failed to save subject:", error);
      toast.error(error.response?.data?.detail || "কিতাব সংরক্ষণে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubject = (subject) => {
    setSubjectFormData({
      subject_name: subject.subject_name,
      subject_code: subject.subject_code,
      class_standard: subject.class_standard,
      section_id: subject.section_id || "all_sections",
      description: subject.description || "",
      is_elective: subject.is_elective || false,
    });
    setEditingSubject(subject);
    setIsSubjectModalOpen(true);
  };

  const toggleClassFolder = (classStandard) => {
    setExpandedClasses((prev) => ({
      ...prev,
      [classStandard]: !prev[classStandard],
    }));
  };

  const getSectionsForSelectedClass = () => {
    if (subjectFormData.class_standard === "select_class") return [];
    const selectedClass = classes.find(
      (c) => c.standard === subjectFormData.class_standard,
    );
    if (!selectedClass) return [];
    return sections.filter((s) => s.class_id === selectedClass.id);
  };

  const getSectionName = (sectionId) => {
    const section = sections.find((s) => s.id === sectionId);
    return section ? section.name : "All Sections";
  };

  const handleDeleteSubject = async (subject) => {
    const result = await Swal.fire({
      title: `"${subject.subject_name}" কিতাব মুছে ফেলবেন?`,
      text: "এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "হ্যাঁ, মুছুন!",
      cancelButtonText: "বাতিল",
    });

    if (!result.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/subjects/${subject.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Real-time update: Remove subject from state
      setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
      
      toast.success(`"${subject.subject_name}" কিতাব সফলভাবে মুছে ফেলা হয়েছে`);
    } catch (error) {
      console.error("Failed to delete subject:", error);
      toast.error(error.response?.data?.detail || "কিতাব মুছতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const getSubjectsForClass = (classStandard) => {
    return subjects.filter((s) => s.class_standard === classStandard);
  };

  const getFilteredSubjects = () => {
    if (selectedClassFilter === "all") {
      return subjects;
    }
    return subjects.filter((s) => s.class_standard === selectedClassFilter);
  };

  const createSampleTeachers = async () => {
    try {
      console.log("🔄 Creating sample teachers for testing...");
      const sampleTeachers = [
        {
          employee_id: "TEACH001",
          name: "John Smith",
          email: "john.smith@school.com",
          phone: "9876543210",
          designation: "Teacher",
          department: "Teaching",
          qualification: "B.Ed, M.A",
          experience_years: 5,
          date_of_joining: "2024-01-15",
          salary: 45000,
          address: "123 Teacher Street",
        },
        {
          employee_id: "TEACH002",
          name: "Sarah Johnson",
          email: "sarah.johnson@school.com",
          phone: "9876543211",
          designation: "Senior Teacher",
          department: "Teaching",
          qualification: "M.Ed, M.Sc",
          experience_years: 8,
          date_of_joining: "2022-06-01",
          salary: 55000,
          address: "456 Education Lane",
        },
        {
          employee_id: "HEAD001",
          name: "Dr. Robert Wilson",
          email: "robert.wilson@school.com",
          phone: "9876543212",
          designation: "Head Teacher",
          department: "Administration",
          qualification: "Ph.D, B.Ed",
          experience_years: 15,
          date_of_joining: "2020-04-01",
          salary: 75000,
          address: "789 Principal Road",
        },
      ];

      for (const teacher of sampleTeachers) {
        try {
          await axios.post(`${API}/staff`, teacher);
          console.log(`✅ Created teacher: ${teacher.name}`);
        } catch (error) {
          console.log(
            `ℹ️ Teacher ${teacher.name} already exists or error:`,
            error.response?.status,
          );
        }
      }

      // Refresh data after creating teachers
      fetchData();
      toast.success("Sample teachers created successfully!");
    } catch (error) {
      console.error("❌ Failed to create sample teachers:", error);
      toast.error("Failed to create sample teachers");
    }
  };

  const getTeacherName = (teacherId) => {
    if (!teacherId) return "Not assigned";
    const teacher = staff.find((s) => s.id === teacherId);
    return teacher ? teacher.name : "Unknown";
  };

  const getDisplayName = (cls) => {
    // For madrasah institution type, apply Bengali class names based on internal_standard
    if (institutionType === "madrasah") {
      const internalStd =
        cls.internal_standard || parseInt(cls.standard?.match(/\d+/)?.[0]) || 0;
      const madrasahMatch = madrasahStandards.find(
        (m) => m.internal_standard === internalStd && internalStd > 0,
      );
      if (madrasahMatch) {
        return madrasahMatch.display_name;
      }
      // Check for special classes by standard name
      const specialMatch = madrasahStandards.find(
        (m) => m.standard === cls.standard || m.standard === cls.name,
      );
      if (specialMatch) {
        return specialMatch.display_name;
      }
    }
    return cls.display_name || cls.name || cls.standard;
  };

  const getDisplayNameForStandard = (std) => {
    if (institutionType === "madrasah") {
      const madrasahMatch = madrasahStandards.find((m) => m.standard === std);
      if (madrasahMatch) {
        return madrasahMatch.display_name;
      }
    }
    return std;
  };

  const handleToggleClassStatus = async (cls) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/classes/${cls.id}/toggle-status`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success(
        `Class "${getDisplayName(cls)}" ${cls.is_active ? "disabled" : "enabled"} successfully`,
      );
      fetchData();
    } catch (error) {
      console.error("Failed to toggle class status:", error);
      toast.error(
        error.response?.data?.detail || "Failed to toggle class status",
      );
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      const token = localStorage.getItem("token");
      Swal.fire({
        title: t("classManagement.initializeClasses") || "Initialize Classes",
        text: `${t("classManagement.initializeConfirm") || "This will add default classes for"} ${institutionType === "madrasah" ? "মাদ্রাসা" : "স্কুল"}. ${t("classManagement.existingClassesKept") || "Existing classes will be kept."}`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: t("common.confirm") || "Confirm",
        cancelButtonText: t("common.cancel") || "Cancel",
      }).then(async (result) => {
        if (result.isConfirmed) {
          await axios.post(
            `${API}/classes/initialize-defaults`,
            {
              institution_type: institutionType,
              include_special_classes: institutionType === "madrasah",
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          toast.success(
            t("classManagement.classesInitialized") ||
              "Classes initialized successfully!",
          );
          fetchData();
        }
      });
    } catch (error) {
      console.error("Failed to initialize classes:", error);
      toast.error(
        error.response?.data?.detail || "Failed to initialize classes",
      );
    }
  };

  const handleInstitutionTypeChange = async (newType) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/institution/settings`,
        {
          institution_type: newType,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setInstitutionType(newType);
      toast.success(
        `প্রতিষ্ঠানের ধরন পরিবর্তন হয়েছে: ${newType === "madrasah" ? "মাদ্রাসা" : "স্কুল"}`,
      );
    } catch (error) {
      console.error("Failed to update institution type:", error);
      setInstitutionType(newType);
    }
  };

  const getFilteredClasses = () => {
    let filtered = classes;
    if (!showInactiveClasses) {
      filtered = filtered.filter((cls) => cls.is_active !== false);
    }
    return filtered.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  };

  const getClassName = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    return cls ? `${cls.name} (${cls.standard})` : "Unknown";
  };

  const getSectionsForClass = (classId) => {
    return sections.filter((s) => s.class_id === classId);
  };

  if (loading && classes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {labels.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {labels.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {staff.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={createSampleTeachers}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {labels.addSampleTeachers}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                console.log("🔄 Exporting class data...");
                // Generate CSV export
                const csvData = [
                  [
                    "Class Name",
                    "Standard",
                    "Class Teacher",
                    "Sections",
                    "Max Students",
                    "Current Students",
                  ],
                  ...classes.map((cls) => [
                    cls.name,
                    cls.standard,
                    getTeacherName(cls.class_teacher_id),
                    getSectionsForClass(cls.id).length,
                    cls.max_students,
                    0, // Will be calculated from actual student data
                  ]),
                ];

                const csvContent = csvData
                  .map((row) => row.join(","))
                  .join("\n");
                const blob = new Blob([csvContent], {
                  type: "text/csv;charset=utf-8;",
                });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", "class-management-report.csv");
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                toast.success("Class data exported successfully");
              } catch (error) {
                console.error("Export failed:", error);
                toast.error("Failed to export data");
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            {labels.exportClasses}
          </Button>
          {classes.length === 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleInitializeDefaults}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              {labels.initializeDefaults}
            </Button>
          )}
        </div>
      </div>

      {/* Show Inactive Classes Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowInactiveClasses(!showInactiveClasses)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          {showInactiveClasses ? (
            <ToggleRight className="h-5 w-5 text-emerald-500" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}
          {labels.showInactive}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {labels.totalClasses}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {institutionType === "madrasah"
                    ? toBengaliNumeral(classes.length)
                    : classes.length}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {labels.totalSections}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {institutionType === "madrasah"
                    ? toBengaliNumeral(sections.length)
                    : sections.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {labels.totalSubjects}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {institutionType === "madrasah"
                    ? toBengaliNumeral(subjects.length)
                    : subjects.length}
                </p>
              </div>
              <GraduationCap className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {labels.assignedTeachers}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {institutionType === "madrasah"
                    ? toBengaliNumeral(
                        classes.filter((c) => c.class_teacher_id).length +
                          sections.filter((s) => s.section_teacher_id).length,
                      )
                    : classes.filter((c) => c.class_teacher_id).length +
                      sections.filter((s) => s.section_teacher_id).length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Classes, Sections, and Subjects */}
      <Tabs defaultValue="classes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="classes">{labels.classes}</TabsTrigger>
          <TabsTrigger value="sections">{labels.sections}</TabsTrigger>
          <TabsTrigger value="subjects">{labels.classSubjects}</TabsTrigger>
        </TabsList>

        {/* Classes Tab */}
        <TabsContent value="classes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold dark:text-white">
              {labels.classes}
            </h2>
            <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => {
                    console.log("🔄 Add Class button clicked!");
                    console.log("Modal state before:", isClassModalOpen);
                    setIsClassModalOpen(true);
                    console.log("Modal state set to true");
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {labels.addClass}
                </Button>
              </DialogTrigger>
              <DialogContent className="dark:bg-gray-900">
                <DialogHeader>
                  <DialogTitle className="dark:text-white">
                    {editingClass ? labels.editClass : labels.addClass}
                  </DialogTitle>
                  <DialogDescription className="dark:text-gray-400">
                    {labels.classFormDesc}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleClassSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="standard" className="dark:text-gray-300">
                      {labels.standard} *
                    </Label>
                    <Select
                      value={classFormData.standard}
                      onValueChange={(value) => {
                        const standardsList =
                          institutionType === "madrasah"
                            ? madrasahStandards
                            : defaultStandards;
                        const selectedStd = standardsList.find(
                          (s) => s.standard === value,
                        );
                        setClassFormData({
                          ...classFormData,
                          standard: value,
                          display_name: selectedStd?.display_name || value,
                          internal_standard:
                            selectedStd?.internal_standard || 0,
                          name: selectedStd?.display_name || value,
                        });
                      }}
                    >
                      <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                        <SelectValue placeholder={labels.selectStandard} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800">
                        <SelectItem value="select_standard" disabled>
                          {labels.selectStandard}
                        </SelectItem>
                        {(institutionType === "madrasah"
                          ? madrasahStandards
                          : defaultStandards
                        ).map((std) => (
                          <SelectItem key={std.standard} value={std.standard}>
                            <span className="flex items-center gap-2">
                              <span>{std.display_name}</span>
                              {std.display_name !== std.standard && (
                                <span className="text-xs text-gray-500">
                                  ({std.standard})
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="display_name"
                      className="dark:text-gray-300"
                    >
                      {labels.displayName} *
                    </Label>
                    <Input
                      id="display_name"
                      value={classFormData.display_name}
                      onChange={(e) =>
                        setClassFormData({
                          ...classFormData,
                          display_name: e.target.value,
                          name: e.target.value,
                        })
                      }
                      placeholder={
                        institutionType === "madrasah"
                          ? "যেমন: ইবতেদায়ী ১ম বর্ষ, নূরানী"
                          : "e.g., Class 1"
                      }
                      className="dark:bg-gray-800 dark:border-gray-700"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {labels.displayNameHint}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="class_teacher">{labels.classTeacher}</Label>
                    <Select
                      value={classFormData.class_teacher_id}
                      onValueChange={(value) =>
                        setClassFormData({
                          ...classFormData,
                          class_teacher_id: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={labels.selectTeacher} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_teacher">
                          {labels.noTeacherAssigned}
                        </SelectItem>
                        {staff.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name} - {teacher.designation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="max_students_class">
                      {labels.maxStudents}
                    </Label>
                    <Input
                      id="max_students_class"
                      type="number"
                      min="1"
                      value={classFormData.max_students}
                      onChange={(e) =>
                        setClassFormData({
                          ...classFormData,
                          max_students: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsClassModalOpen(false);
                        setEditingClass(null);
                        resetClassForm();
                      }}
                    >
                      {labels.cancel}
                    </Button>
                    <Button
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-600"
                      disabled={loading}
                    >
                      {loading
                        ? labels.saving
                        : editingClass
                          ? labels.update
                          : labels.save}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent>
              <div className="rounded-md border dark:border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{labels.displayName}</TableHead>
                      <TableHead>{labels.standard}</TableHead>
                      <TableHead>{labels.classTeacher}</TableHead>
                      <TableHead>{labels.sections}</TableHead>
                      <TableHead>{labels.maxStudents}</TableHead>
                      <TableHead>{labels.status}</TableHead>
                      <TableHead>{labels.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredClasses().length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-gray-500 dark:text-gray-400"
                        >
                          {labels.noClasses}
                        </TableCell>
                      </TableRow>
                    ) : (
                      getFilteredClasses().map((cls, index) => (
                        <TableRow
                          key={cls.id}
                          className={`${cls.is_active === false ? "opacity-50 bg-gray-50 dark:bg-gray-800/50" : ""}`}
                        >
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {getDisplayName(cls)}
                              </span>
                              {cls.display_name &&
                                cls.display_name !== cls.standard && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {cls.standard}
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="dark:bg-gray-700 dark:text-gray-200"
                            >
                              {cls.internal_standard
                                ? `Level ${cls.internal_standard}`
                                : cls.standard}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {cls.class_teacher_id ? (
                                <>
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                      {getTeacherName(cls.class_teacher_id)
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm dark:text-gray-300">
                                    {getTeacherName(cls.class_teacher_id)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400 text-sm">
                                  {labels.notAssigned}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="dark:border-gray-600 dark:text-gray-300"
                            >
                              {institutionType === "madrasah"
                                ? toBengaliNumeral(
                                    getSectionsForClass(cls.id).length,
                                  )
                                : getSectionsForClass(cls.id).length}{" "}
                              {labels.section}
                            </Badge>
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            {cls.max_students}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleToggleClassStatus(cls)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                                cls.is_active !== false
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                              }`}
                            >
                              {cls.is_active !== false ? (
                                <>
                                  <ToggleRight className="h-3 w-3" />
                                  {labels.active}
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-3 w-3" />
                                  {labels.inactive}
                                </>
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClass(cls)}
                                title={t("common.edit") || "Edit"}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 dark:text-red-400"
                                onClick={() => handleDeleteClass(cls)}
                                title={t("common.delete") || "Delete"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sections Tab */}
        <TabsContent value="sections" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold dark:text-white">
              {labels.sections}
            </h2>
            <Dialog
              open={isSectionModalOpen}
              onOpenChange={setIsSectionModalOpen}
            >
              <DialogTrigger asChild>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => {
                    console.log("🔄 Add Section button clicked!");
                    console.log("Modal state before:", isSectionModalOpen);
                    setIsSectionModalOpen(true);
                    console.log("Modal state set to true");
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {labels.addSection}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingSection ? labels.editSection : labels.addSection}
                  </DialogTitle>
                  <DialogDescription>
                    {labels.sectionFormDesc}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSectionSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="section_class">{labels.class} *</Label>
                    <Select
                      value={sectionFormData.class_id}
                      onValueChange={(value) =>
                        setSectionFormData({
                          ...sectionFormData,
                          class_id: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={labels.selectClass} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select_class" disabled>
                          {labels.selectClass}
                        </SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {getDisplayName(cls)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="section_name">{labels.sectionName} *</Label>
                    <Input
                      id="section_name"
                      value={sectionFormData.name}
                      onChange={(e) =>
                        setSectionFormData({
                          ...sectionFormData,
                          name: e.target.value,
                        })
                      }
                      placeholder={labels.sectionPlaceholder}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="section_teacher">
                      {labels.sectionTeacher}
                    </Label>
                    <Select
                      value={sectionFormData.section_teacher_id}
                      onValueChange={(value) =>
                        setSectionFormData({
                          ...sectionFormData,
                          section_teacher_id: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={labels.selectTeacher} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_teacher">
                          {labels.noTeacherAssigned}
                        </SelectItem>
                        {staff.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name} - {teacher.designation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="max_students_section">
                      {labels.maxStudents}
                    </Label>
                    <Input
                      id="max_students_section"
                      type="number"
                      min="1"
                      value={sectionFormData.max_students}
                      onChange={(e) =>
                        setSectionFormData({
                          ...sectionFormData,
                          max_students: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsSectionModalOpen(false);
                        setEditingSection(null);
                        resetSectionForm();
                      }}
                    >
                      {labels.cancel}
                    </Button>
                    <Button
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-600"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? labels.saving
                        : editingSection
                          ? labels.update
                          : labels.save}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{labels.sectionName}</TableHead>
                      <TableHead>{labels.class}</TableHead>
                      <TableHead>{labels.sectionTeacher}</TableHead>
                      <TableHead>{labels.maxStudents}</TableHead>
                      <TableHead>{labels.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sections.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-gray-500"
                        >
                          {labels.noSections}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sections.map((section, index) => (
                        <TableRow key={section.id}>
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-medium">
                              {section.name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getClassName(section.class_id)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {section.section_teacher_id ? (
                                <>
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                      {getTeacherName(
                                        section.section_teacher_id,
                                      )
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">
                                    {getTeacherName(section.section_teacher_id)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-500 text-sm">
                                  {labels.notAssigned}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{section.max_students}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSection(section)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteSection(section)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Class Subjects Tab */}
        <TabsContent value="subjects" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold dark:text-white">
                {labels.classSubjects}
              </h2>
              <Select
                value={selectedClassFilter}
                onValueChange={setSelectedClassFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={labels.filterByClass} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{labels.allClasses}</SelectItem>
                  {classStandards.length > 0 ? (
                    classStandards.map((std) => (
                      <SelectItem key={std} value={std}>
                        {getDisplayNameForStandard(std)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no_classes" disabled>
                      No classes available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Dialog
              open={isSubjectModalOpen}
              onOpenChange={setIsSubjectModalOpen}
            >
              <DialogTrigger asChild>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => {
                    setIsSubjectModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {labels.addSubject}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingSubject ? labels.editSubject : labels.addSubject}
                  </DialogTitle>
                  <DialogDescription>
                    {labels.subjectFormDesc}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubjectSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="subject_class">{labels.class} *</Label>
                    <Select
                      value={subjectFormData.class_standard}
                      onValueChange={(value) =>
                        setSubjectFormData({
                          ...subjectFormData,
                          class_standard: value,
                          section_id: "all_sections",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={labels.selectClass} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select_class" disabled>
                          {labels.selectClass}
                        </SelectItem>
                        {classStandards.length > 0 ? (
                          classStandards.map((std) => (
                            <SelectItem key={std} value={std}>
                              {getDisplayNameForStandard(std)}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no_classes" disabled>
                            {institutionType === "madrasah"
                              ? "প্রথমে জামাত তৈরি করুন"
                              : "Please create classes first"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subject_section">
                      {labels.section} (
                      {institutionType === "madrasah" ? "ঐচ্ছিক" : "Optional"})
                    </Label>
                    <Select
                      value={subjectFormData.section_id}
                      onValueChange={(value) =>
                        setSubjectFormData({
                          ...subjectFormData,
                          section_id: value,
                        })
                      }
                      disabled={
                        subjectFormData.class_standard === "select_class"
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={labels.allSections} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_sections">
                          {labels.allSections}
                        </SelectItem>
                        {getSectionsForSelectedClass().map((sec) => (
                          <SelectItem key={sec.id} value={sec.id}>
                            {labels.section} {sec.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {institutionType === "madrasah"
                        ? '"সকল শাখা" রাখুন পুরো জামাতে প্রযোজ্য হলে'
                        : 'Leave as "All Sections" to apply to entire class'}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="subject_name">{labels.subjectName} *</Label>
                    <Input
                      id="subject_name"
                      value={subjectFormData.subject_name}
                      onChange={(e) =>
                        setSubjectFormData({
                          ...subjectFormData,
                          subject_name: e.target.value,
                        })
                      }
                      placeholder={labels.subjectPlaceholder}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject_code">{labels.subjectCode} *</Label>
                    <Input
                      id="subject_code"
                      value={subjectFormData.subject_code}
                      onChange={(e) =>
                        setSubjectFormData({
                          ...subjectFormData,
                          subject_code: e.target.value,
                        })
                      }
                      placeholder={labels.subjectCodePlaceholder}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject_description">
                      {institutionType === "madrasah" ? "বিবরণ" : "Description"}
                    </Label>
                    <Input
                      id="subject_description"
                      value={subjectFormData.description}
                      onChange={(e) =>
                        setSubjectFormData({
                          ...subjectFormData,
                          description: e.target.value,
                        })
                      }
                      placeholder={
                        institutionType === "madrasah"
                          ? "কিতাবের সংক্ষিপ্ত বিবরণ"
                          : "Brief description of the subject"
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_elective"
                      checked={subjectFormData.is_elective}
                      onChange={(e) =>
                        setSubjectFormData({
                          ...subjectFormData,
                          is_elective: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="is_elective">
                      {institutionType === "madrasah"
                        ? "ঐচ্ছিক কিতাব"
                        : "Elective Subject"}
                    </Label>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsSubjectModalOpen(false);
                        setEditingSubject(null);
                        resetSubjectForm();
                      }}
                    >
                      {labels.cancel}
                    </Button>
                    <Button
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-600"
                      disabled={loading}
                    >
                      {loading
                        ? labels.saving
                        : editingSubject
                          ? labels.update
                          : labels.save}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {classStandards.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                {institutionType === "madrasah"
                  ? "এখনো কোনো জামাত তৈরি হয়নি। কিতাব যোগ করতে প্রথমে জামাত তৈরি করুন।"
                  : "No classes created yet. Please create classes first to add subjects."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(selectedClassFilter === "all"
                ? classStandards
                : [selectedClassFilter]
              ).map((classStd) => {
                const classSubjects = subjects.filter(
                  (s) => s.class_standard === classStd,
                );
                const isExpanded = expandedClasses[classStd] !== false;

                return (
                  <Card key={classStd} className="overflow-hidden">
                    <button
                      onClick={() => toggleClassFolder(classStd)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {isExpanded ? (
                          <FolderOpen className="h-5 w-5 text-amber-500" />
                        ) : (
                          <Folder className="h-5 w-5 text-amber-500" />
                        )}
                        <span className="font-semibold text-lg">
                          {classStd}
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {institutionType === "madrasah"
                            ? `${toBengaliNumeral(classSubjects.length)} কিতাব`
                            : `${classSubjects.length} subject${classSubjects.length !== 1 ? "s" : ""}`}
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <CardContent className="pt-0 pb-4">
                        {classSubjects.length === 0 ? (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            {institutionType === "madrasah"
                              ? "এই জামাতে এখনো কোনো কিতাব যোগ করা হয়নি"
                              : "No subjects added for this class"}
                          </div>
                        ) : (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">#</TableHead>
                                  <TableHead>{labels.subjectName}</TableHead>
                                  <TableHead>
                                    {institutionType === "madrasah"
                                      ? "কোড"
                                      : "Code"}
                                  </TableHead>
                                  <TableHead>{labels.section}</TableHead>
                                  <TableHead>
                                    {institutionType === "madrasah"
                                      ? "ধরন"
                                      : "Type"}
                                  </TableHead>
                                  <TableHead>{labels.actions}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {classSubjects.map((subject, index) => (
                                  <TableRow key={subject.id}>
                                    <TableCell className="font-medium">
                                      {index + 1}
                                    </TableCell>
                                    <TableCell>
                                      <div className="font-medium">
                                        {subject.subject_name}
                                      </div>
                                      {subject.description && (
                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                          {subject.description}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {subject.subject_code}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {subject.section_id
                                          ? `${labels.section} ${getSectionName(subject.section_id)}`
                                          : institutionType === "madrasah"
                                            ? "সকল"
                                            : "All"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {subject.is_elective ? (
                                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                          {institutionType === "madrasah"
                                            ? "ঐচ্ছিক"
                                            : "Elective"}
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                          {institutionType === "madrasah"
                                            ? "আবশ্যিক"
                                            : "Core"}
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center space-x-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleEditSubject(subject)
                                          }
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-red-600 hover:text-red-700"
                                          onClick={() =>
                                            handleDeleteSubject(subject)
                                          }
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClassManagement;
