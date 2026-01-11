import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  BookOpen,
  Calendar,
  Users,
  Loader2,
  Book,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const API = process.env.REACT_APP_API_URL || "/api";

const AcademicHierarchy = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [hierarchy, setHierarchy] = useState([]);
  const [expandedMarhalas, setExpandedMarhalas] = useState({});
  const [expandedDepartments, setExpandedDepartments] = useState({});

  const [isMarhalaModalOpen, setIsMarhalaModalOpen] = useState(false);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);

  const [editingMarhala, setEditingMarhala] = useState(null);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editingSemester, setEditingSemester] = useState(null);

  const [marhalaForm, setMarhalaForm] = useState({
    name_bn: "",
    name_en: "",
    description: "",
    order_index: 0,
    duration_years: 2,
  });

  const [departmentForm, setDepartmentForm] = useState({
    marhala_id: "",
    name_bn: "",
    name_en: "",
    code: "",
    description: "",
    order_index: 0,
    max_students: 100,
  });

  const [semesterForm, setSemesterForm] = useState({
    department_id: "",
    name_bn: "",
    name_en: "",
    semester_number: 1,
    start_date: "",
    end_date: "",
    order_index: 0,
  });

  const [subjects, setSubjects] = useState([]);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({
    subject_name: "",
    subject_code: "",
    marhala_id: "",
    semester_id: "",
    description: "",
    is_elective: false,
  });
  const [activeTab, setActiveTab] = useState("hierarchy");

  const fetchHierarchy = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/academic-hierarchy`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHierarchy(response.data.hierarchy || []);
    } catch (error) {
      console.error("Failed to fetch hierarchy:", error);
      toast.error("একাডেমিক স্ট্রাকচার লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubjects(response.data || []);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
      toast.error("বিষয় তালিকা লোড করতে সমস্যা হয়েছে");
    }
  }, []);

  useEffect(() => {
    fetchHierarchy();
    fetchSubjects();
  }, [fetchHierarchy, fetchSubjects]);

  const toggleMarhala = (id) => {
    setExpandedMarhalas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDepartment = (id) => {
    setExpandedDepartments((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMarhalaSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (editingMarhala) {
        await axios.patch(
          `${API}/marhalas/${editingMarhala.id}`,
          marhalaForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("মারহালা আপডেট হয়েছে");
      } else {
        await axios.post(`${API}/marhalas`, marhalaForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("মারহালা তৈরি হয়েছে");
      }
      setIsMarhalaModalOpen(false);
      setEditingMarhala(null);
      setMarhalaForm({
        name_bn: "",
        name_en: "",
        description: "",
        order_index: 0,
        duration_years: 2,
      });
      fetchHierarchy();
    } catch (error) {
      toast.error(error.response?.data?.detail || "মারহালা সেভ করতে সমস্যা হয়েছে");
    }
  };

  const handleDepartmentSubmit = async (e) => {
    e.preventDefault();
    if (!departmentForm.marhala_id) {
      toast.error("একটি মারহালা নির্বাচন করুন");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (editingDepartment) {
        await axios.patch(
          `${API}/departments/${editingDepartment.id}`,
          departmentForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("বিভাগ আপডেট হয়েছে");
      } else {
        await axios.post(`${API}/departments`, departmentForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("বিভাগ তৈরি হয়েছে");
      }
      setIsDepartmentModalOpen(false);
      setEditingDepartment(null);
      setDepartmentForm({
        marhala_id: "",
        name_bn: "",
        name_en: "",
        code: "",
        description: "",
        order_index: 0,
        max_students: 100,
      });
      fetchHierarchy();
    } catch (error) {
      toast.error(error.response?.data?.detail || "বিভাগ সেভ করতে সমস্যা হয়েছে");
    }
  };

  const handleSemesterSubmit = async (e) => {
    e.preventDefault();
    if (!semesterForm.department_id) {
      toast.error("একটি বিভাগ নির্বাচন করুন");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (editingSemester) {
        await axios.patch(
          `${API}/academic-semesters/${editingSemester.id}`,
          semesterForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("সেমিস্টার আপডেট হয়েছে");
      } else {
        await axios.post(`${API}/academic-semesters`, semesterForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("সেমিস্টার তৈরি হয়েছে");
      }
      setIsSemesterModalOpen(false);
      setEditingSemester(null);
      setSemesterForm({
        department_id: "",
        name_bn: "",
        name_en: "",
        semester_number: 1,
        start_date: "",
        end_date: "",
        order_index: 0,
      });
      fetchHierarchy();
    } catch (error) {
      toast.error(error.response?.data?.detail || "সেমিস্টার সেভ করতে সমস্যা হয়েছে");
    }
  };

  const handleDeleteMarhala = async (marhala) => {
    const result = await Swal.fire({
      title: `"${marhala.name_bn}" মুছে ফেলবেন?`,
      text: "এই মারহালা মুছে ফেলা হলে এর অধীনের সকল বিভাগ ও সেমিস্টারও মুছে যাবে।",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "হ্যাঁ, মুছুন!",
      cancelButtonText: "বাতিল",
    });
    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/marhalas/${marhala.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("মারহালা মুছে ফেলা হয়েছে");
      fetchHierarchy();
    } catch (error) {
      toast.error(error.response?.data?.detail || "মারহালা মুছতে সমস্যা হয়েছে");
    }
  };

  const handleDeleteDepartment = async (department) => {
    const result = await Swal.fire({
      title: `"${department.name_bn}" মুছে ফেলবেন?`,
      text: "এই বিভাগ মুছে ফেলা হলে এর অধীনের সকল সেমিস্টারও মুছে যাবে।",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "হ্যাঁ, মুছুন!",
      cancelButtonText: "বাতিল",
    });
    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/departments/${department.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("বিভাগ মুছে ফেলা হয়েছে");
      fetchHierarchy();
    } catch (error) {
      toast.error(error.response?.data?.detail || "বিভাগ মুছতে সমস্যা হয়েছে");
    }
  };

  const handleDeleteSemester = async (semester) => {
    const result = await Swal.fire({
      title: `"${semester.name_bn}" মুছে ফেলবেন?`,
      text: "এই সেমিস্টারে ভর্তি ছাত্রদের প্রথমে অন্য সেমিস্টারে স্থানান্তর করতে হবে।",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "হ্যাঁ, মুছুন!",
      cancelButtonText: "বাতিল",
    });
    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/academic-semesters/${semester.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("সেমিস্টার মুছে ফেলা হয়েছে");
      fetchHierarchy();
    } catch (error) {
      toast.error(error.response?.data?.detail || "সেমিস্টার মুছতে সমস্যা হয়েছে");
    }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!subjectForm.subject_name || !subjectForm.subject_code) {
      toast.error("বিষয়ের নাম ও কোড আবশ্যক");
      return;
    }
    if (!subjectForm.marhala_id) {
      toast.error("একটি মারহালা নির্বাচন করুন");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (editingSubject) {
        await axios.put(
          `${API}/subjects/${editingSubject.id}`,
          subjectForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("বিষয় আপডেট হয়েছে");
      } else {
        await axios.post(`${API}/subjects`, subjectForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("বিষয় তৈরি হয়েছে");
      }
      setIsSubjectModalOpen(false);
      setEditingSubject(null);
      setSubjectForm({
        subject_name: "",
        subject_code: "",
        marhala_id: "",
        semester_id: "",
        description: "",
        is_elective: false,
      });
      fetchSubjects();
    } catch (error) {
      toast.error(error.response?.data?.detail || "বিষয় সেভ করতে সমস্যা হয়েছে");
    }
  };

  const handleDeleteSubject = async (subject) => {
    const result = await Swal.fire({
      title: `"${subject.subject_name}" মুছে ফেলবেন?`,
      text: "এই বিষয় মুছে ফেলা হবে।",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "হ্যাঁ, মুছুন!",
      cancelButtonText: "বাতিল",
    });
    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/subjects/${subject.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("বিষয় মুছে ফেলা হয়েছে");
      fetchSubjects();
    } catch (error) {
      toast.error(error.response?.data?.detail || "বিষয় মুছতে সমস্যা হয়েছে");
    }
  };

  const openEditSubject = (subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      subject_name: subject.subject_name || "",
      subject_code: subject.subject_code || "",
      marhala_id: subject.marhala_id || "",
      semester_id: subject.semester_id || "",
      description: subject.description || "",
      is_elective: subject.is_elective || false,
    });
    setIsSubjectModalOpen(true);
  };

  const getSubjectsForSemester = (semesterId) => {
    return subjects.filter(s => s.semester_id === semesterId);
  };

  const getSubjectsForMarhala = (marhalaId) => {
    return subjects.filter(s => s.marhala_id === marhalaId && !s.semester_id);
  };

  const getMarhalaName = (marhalaId) => {
    const marhala = hierarchy.find(m => m.id === marhalaId);
    return marhala ? (marhala.name_bn || marhala.name_en || marhala.name) : "";
  };

  const getSemesterName = (semesterId) => {
    for (const marhala of hierarchy) {
      for (const dept of (marhala.departments || [])) {
        const semester = (dept.semesters || []).find(s => s.id === semesterId);
        if (semester) return semester.name_bn || semester.name_en || semester.name;
      }
    }
    return "";
  };

  const openEditMarhala = (marhala) => {
    setEditingMarhala(marhala);
    setMarhalaForm({
      name_bn: marhala.name_bn || "",
      name_en: marhala.name_en || "",
      description: marhala.description || "",
      order_index: marhala.order_index || 0,
      duration_years: marhala.duration_years || 2,
    });
    setIsMarhalaModalOpen(true);
  };

  const openEditDepartment = (department) => {
    setEditingDepartment(department);
    setDepartmentForm({
      marhala_id: department.marhala_id || "",
      name_bn: department.name_bn || "",
      name_en: department.name_en || "",
      code: department.code || "",
      description: department.description || "",
      order_index: department.order_index || 0,
      max_students: department.max_students || 100,
    });
    setIsDepartmentModalOpen(true);
  };

  const openEditSemester = (semester) => {
    setEditingSemester(semester);
    setSemesterForm({
      department_id: semester.department_id || "",
      name_bn: semester.name_bn || "",
      name_en: semester.name_en || "",
      semester_number: semester.semester_number || 1,
      start_date: semester.start_date || "",
      end_date: semester.end_date || "",
      order_index: semester.order_index || 0,
    });
    setIsSemesterModalOpen(true);
  };

  const openAddDepartment = (marhalaId) => {
    setDepartmentForm({
      marhala_id: marhalaId,
      name_bn: "",
      name_en: "",
      code: "",
      description: "",
      order_index: 0,
      max_students: 100,
    });
    setEditingDepartment(null);
    setIsDepartmentModalOpen(true);
  };

  const openAddSemester = (departmentId) => {
    setSemesterForm({
      department_id: departmentId,
      name_bn: "",
      name_en: "",
      semester_number: 1,
      start_date: "",
      end_date: "",
      order_index: 0,
    });
    setEditingSemester(null);
    setIsSemesterModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            একাডেমিক স্ট্রাকচার
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            মারহালা → বিভাগ/জামাত → সেমিস্টার হায়ারার্কি পরিচালনা করুন
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="hierarchy" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            হায়ারার্কি
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            বিষয়সমূহ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hierarchy" className="mt-6">
          <div className="flex justify-end mb-4">
            <Dialog open={isMarhalaModalOpen} onOpenChange={setIsMarhalaModalOpen}>
              <DialogTrigger asChild>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => {
                setEditingMarhala(null);
                setMarhalaForm({
                  name_bn: "",
                  name_en: "",
                  description: "",
                  order_index: 0,
                  duration_years: 2,
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              নতুন মারহালা
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMarhala ? "মারহালা সম্পাদনা" : "নতুন মারহালা"}
              </DialogTitle>
              <DialogDescription>
                মারহালা হলো একাডেমিক স্তর (যেমন: দাখিল, আলিম, ফাজিল)
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleMarhalaSubmit} className="space-y-4">
              <div>
                <Label>নাম (বাংলা) *</Label>
                <Input
                  value={marhalaForm.name_bn}
                  onChange={(e) =>
                    setMarhalaForm({ ...marhalaForm, name_bn: e.target.value })
                  }
                  placeholder="যেমন: দাখিল"
                  required
                />
              </div>
              <div>
                <Label>নাম (ইংরেজি)</Label>
                <Input
                  value={marhalaForm.name_en}
                  onChange={(e) =>
                    setMarhalaForm({ ...marhalaForm, name_en: e.target.value })
                  }
                  placeholder="e.g., Dakhil"
                />
              </div>
              <div>
                <Label>মেয়াদ (বছর)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={marhalaForm.duration_years}
                  onChange={(e) =>
                    setMarhalaForm({
                      ...marhalaForm,
                      duration_years: parseInt(e.target.value) || 2,
                    })
                  }
                />
              </div>
              <div>
                <Label>বিবরণ</Label>
                <Input
                  value={marhalaForm.description}
                  onChange={(e) =>
                    setMarhalaForm({
                      ...marhalaForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="ঐচ্ছিক বিবরণ"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMarhalaModalOpen(false)}
                >
                  বাতিল
                </Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">
                  সংরক্ষণ
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {hierarchy.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              কোন মারহালা নেই
            </h3>
            <p className="text-gray-500 mt-2">
              প্রথমে একটি মারহালা তৈরি করুন (যেমন: দাখিল, আলিম, ফাজিল)
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {hierarchy.map((marhala) => (
            <Card key={marhala.id} className="overflow-hidden">
              <Collapsible
                open={expandedMarhalas[marhala.id]}
                onOpenChange={() => toggleMarhala(marhala.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedMarhalas[marhala.id] ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                        <GraduationCap className="h-6 w-6 text-emerald-500" />
                        <div>
                          <CardTitle className="text-lg">
                            {marhala.name_bn}
                            {marhala.name_en && (
                              <span className="text-gray-500 ml-2 text-sm font-normal">
                                ({marhala.name_en})
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {marhala.departments?.length || 0} বিভাগ •{" "}
                            {marhala.duration_years || 2} বছর
                          </CardDescription>
                        </div>
                      </div>
                      <div
                        className="flex gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddDepartment(marhala.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          বিভাগ যোগ
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditMarhala(marhala)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => handleDeleteMarhala(marhala)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {marhala.departments?.length === 0 ? (
                      <div className="text-center py-6 text-gray-500">
                        এই মারহালায় কোন বিভাগ নেই। বিভাগ যোগ করুন।
                      </div>
                    ) : (
                      <div className="space-y-3 pl-4">
                        {marhala.departments?.map((dept) => (
                          <Collapsible
                            key={dept.id}
                            open={expandedDepartments[dept.id]}
                            onOpenChange={() => toggleDepartment(dept.id)}
                          >
                            <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between cursor-pointer">
                                  <div className="flex items-center gap-3">
                                    {expandedDepartments[dept.id] ? (
                                      <ChevronDown className="h-4 w-4 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-500" />
                                    )}
                                    <BookOpen className="h-5 w-5 text-blue-500" />
                                    <div>
                                      <h4 className="font-medium">
                                        {dept.name_bn}
                                        {dept.code && (
                                          <Badge
                                            variant="outline"
                                            className="ml-2"
                                          >
                                            {dept.code}
                                          </Badge>
                                        )}
                                      </h4>
                                      <p className="text-sm text-gray-500">
                                        {dept.semesters?.length || 0} সেমিস্টার
                                      </p>
                                    </div>
                                  </div>
                                  <div
                                    className="flex gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openAddSemester(dept.id)}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      সেমিস্টার
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openEditDepartment(dept)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-500"
                                      onClick={() => handleDeleteDepartment(dept)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="mt-3 pl-6">
                                  {dept.semesters?.length === 0 ? (
                                    <p className="text-sm text-gray-500 py-2">
                                      কোন সেমিস্টার নেই
                                    </p>
                                  ) : (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>সেমিস্টার</TableHead>
                                          <TableHead>তারিখ</TableHead>
                                          <TableHead className="text-right">
                                            অ্যাকশন
                                          </TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {dept.semesters?.map((sem) => (
                                          <TableRow key={sem.id}>
                                            <TableCell>
                                              <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-purple-500" />
                                                <span>{sem.name_bn}</span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                              {sem.start_date || "—"} —{" "}
                                              {sem.end_date || "—"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                  openEditSemester(sem)
                                                }
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500"
                                                onClick={() =>
                                                  handleDeleteSemester(sem)
                                                }
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDepartmentModalOpen} onOpenChange={setIsDepartmentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? "বিভাগ সম্পাদনা" : "নতুন বিভাগ"}
            </DialogTitle>
            <DialogDescription>
              বিভাগ/জামাত হলো মারহালার অধীনে শাখা (যেমন: সায়েন্স, হাদিস, তাফসির)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDepartmentSubmit} className="space-y-4">
            {!departmentForm.marhala_id && (
              <div>
                <Label>মারহালা *</Label>
                <Select
                  value={departmentForm.marhala_id}
                  onValueChange={(v) =>
                    setDepartmentForm({ ...departmentForm, marhala_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="মারহালা নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {hierarchy.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name_bn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>নাম (বাংলা) *</Label>
              <Input
                value={departmentForm.name_bn}
                onChange={(e) =>
                  setDepartmentForm({ ...departmentForm, name_bn: e.target.value })
                }
                placeholder="যেমন: সায়েন্স / হাদিস"
                required
              />
            </div>
            <div>
              <Label>নাম (ইংরেজি)</Label>
              <Input
                value={departmentForm.name_en}
                onChange={(e) =>
                  setDepartmentForm({ ...departmentForm, name_en: e.target.value })
                }
                placeholder="e.g., Science / Hadith"
              />
            </div>
            <div>
              <Label>কোড</Label>
              <Input
                value={departmentForm.code}
                onChange={(e) =>
                  setDepartmentForm({ ...departmentForm, code: e.target.value })
                }
                placeholder="যেমন: SCI / HAD"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDepartmentModalOpen(false)}
              >
                বাতিল
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">
                সংরক্ষণ
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSemesterModalOpen} onOpenChange={setIsSemesterModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSemester ? "সেমিস্টার সম্পাদনা" : "নতুন সেমিস্টার"}
            </DialogTitle>
            <DialogDescription>
              সেমিস্টার হলো একাডেমিক পর্ব যেখানে ছাত্ররা ভর্তি হয়
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSemesterSubmit} className="space-y-4">
            <div>
              <Label>নাম (বাংলা) *</Label>
              <Input
                value={semesterForm.name_bn}
                onChange={(e) =>
                  setSemesterForm({ ...semesterForm, name_bn: e.target.value })
                }
                placeholder="যেমন: ১ম সেমিস্টার"
                required
              />
            </div>
            <div>
              <Label>নাম (ইংরেজি)</Label>
              <Input
                value={semesterForm.name_en}
                onChange={(e) =>
                  setSemesterForm({ ...semesterForm, name_en: e.target.value })
                }
                placeholder="e.g., 1st Semester"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>শুরুর তারিখ</Label>
                <Input
                  type="date"
                  value={semesterForm.start_date}
                  onChange={(e) =>
                    setSemesterForm({ ...semesterForm, start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>শেষের তারিখ</Label>
                <Input
                  type="date"
                  value={semesterForm.end_date}
                  onChange={(e) =>
                    setSemesterForm({ ...semesterForm, end_date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSemesterModalOpen(false)}
              >
                বাতিল
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">
                সংরক্ষণ
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="subjects" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                বিষয় তালিকা
              </h2>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={() => {
                  setEditingSubject(null);
                  setSubjectForm({
                    subject_name: "",
                    subject_code: "",
                    marhala_id: "",
                    semester_id: "",
                    description: "",
                    is_elective: false,
                  });
                  setIsSubjectModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                নতুন বিষয়
              </Button>
            </div>

            {subjects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Book className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    কোন বিষয় নেই
                  </h3>
                  <p className="text-gray-500 mt-2">
                    বিষয় যোগ করুন মারহালা বা সেমিস্টার অনুযায়ী
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>বিষয়ের নাম</TableHead>
                        <TableHead>কোড</TableHead>
                        <TableHead>মারহালা</TableHead>
                        <TableHead>সেমিস্টার</TableHead>
                        <TableHead>ধরন</TableHead>
                        <TableHead className="text-right">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((subject) => (
                        <TableRow key={subject.id}>
                          <TableCell className="font-medium">{subject.subject_name}</TableCell>
                          <TableCell>{subject.subject_code}</TableCell>
                          <TableCell>{getMarhalaName(subject.marhala_id) || "-"}</TableCell>
                          <TableCell>{getSemesterName(subject.semester_id) || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={subject.is_elective ? "secondary" : "default"}>
                              {subject.is_elective ? "ঐচ্ছিক" : "আবশ্যিক"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditSubject(subject)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteSubject(subject)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isSubjectModalOpen} onOpenChange={setIsSubjectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? "বিষয় সম্পাদনা" : "নতুন বিষয়"}
            </DialogTitle>
            <DialogDescription>
              বিষয়ের তথ্য দিন এবং মারহালা/সেমিস্টার নির্বাচন করুন
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubjectSubmit} className="space-y-4">
            <div>
              <Label>বিষয়ের নাম *</Label>
              <Input
                value={subjectForm.subject_name}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, subject_name: e.target.value })
                }
                placeholder="যেমন: কুরআন তিলাওয়াত"
                required
              />
            </div>
            <div>
              <Label>বিষয়ের কোড *</Label>
              <Input
                value={subjectForm.subject_code}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, subject_code: e.target.value })
                }
                placeholder="যেমন: QT101"
                required
              />
            </div>
            <div>
              <Label>মারহালা</Label>
              <Select
                value={subjectForm.marhala_id}
                onValueChange={(value) =>
                  setSubjectForm({ ...subjectForm, marhala_id: value, semester_id: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="মারহালা নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {hierarchy.map((marhala) => (
                    <SelectItem key={marhala.id} value={marhala.id}>
                      {marhala.name_bn || marhala.name_en || marhala.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {subjectForm.marhala_id && (
              <div>
                <Label>সেমিস্টার (ঐচ্ছিক)</Label>
                <Select
                  value={subjectForm.semester_id || "__all__"}
                  onValueChange={(value) =>
                    setSubjectForm({ ...subjectForm, semester_id: value === "__all__" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="সেমিস্টার নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">সকল সেমিস্টার</SelectItem>
                    {hierarchy
                      .find((m) => m.id === subjectForm.marhala_id)
                      ?.departments?.flatMap((d) => d.semesters || [])
                      .map((semester) => (
                        <SelectItem key={semester.id} value={semester.id}>
                          {semester.name_bn || semester.name_en || semester.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>বিবরণ</Label>
              <Input
                value={subjectForm.description}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, description: e.target.value })
                }
                placeholder="ঐচ্ছিক বিবরণ"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_elective"
                checked={subjectForm.is_elective}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, is_elective: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="is_elective">ঐচ্ছিক বিষয়</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubjectModalOpen(false)}
              >
                বাতিল
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">
                সংরক্ষণ
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcademicHierarchy;
