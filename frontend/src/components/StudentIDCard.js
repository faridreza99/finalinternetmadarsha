import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Download,
  Printer,
  Search,
  CreditCard,
  Users,
  Eye,
  RefreshCw,
  CheckSquare,
  Square,
  FileDown,
} from "lucide-react";
import JSZip from "jszip";

const API = process.env.REACT_APP_API_URL || "/api";

const StudentIDCard = () => {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState({});
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const fetchClasses = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(response.data || []);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  }, []);

  const fetchSections = useCallback(async (classId) => {
    try {
      const token = localStorage.getItem("token");
      const url =
        classId && classId !== "all"
          ? `${API}/sections?class_id=${classId}`
          : `${API}/sections`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSections(response.data || []);
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = `${API}/id-cards/students/list`;
      const params = [];
      if (selectedClass && selectedClass !== "all") {
        params.push(`class_id=${selectedClass}`);
      }
      if (selectedSection && selectedSection !== "all") {
        params.push(`section_id=${selectedSection}`);
      }
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(response.data || []);
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSection]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchSections(selectedClass);
  }, [selectedClass, fetchSections]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const generateIDCard = async (studentId, studentName) => {
    setGenerating((prev) => ({ ...prev, [studentId]: true }));
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/id-cards/student/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `StudentID-${studentName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate ID card:", error);
      alert(t("idCard.generateError") || "Failed to generate ID card");
    } finally {
      setGenerating((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  const previewIDCard = async (studentId, printAfterLoad = false) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/id-cards/student/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const previewWindow = window.open(url, "_blank");

      if (printAfterLoad && previewWindow) {
        previewWindow.onload = () => {
          previewWindow.focus();
          previewWindow.print();
        };
      }

      return previewWindow;
    } catch (error) {
      console.error("Failed to preview ID card:", error);
      return null;
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.father_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admission_no?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const generateBulkIDCards = async () => {
    if (selectedStudents.size === 0) {
      alert(t("idCard.selectStudents") || "Please select at least one student");
      return;
    }

    setBulkGenerating(true);
    setBulkProgress({ current: 0, total: selectedStudents.size });

    try {
      const token = localStorage.getItem("token");
      const zip = new JSZip();
      const selectedArray = Array.from(selectedStudents);

      for (let i = 0; i < selectedArray.length; i++) {
        const studentId = selectedArray[i];
        const student = students.find((s) => s.id === studentId);

        try {
          const response = await axios.get(
            `${API}/id-cards/student/${studentId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              responseType: "arraybuffer",
            },
          );

          const filename = `ID_${student?.name?.replace(/\s+/g, "_") || studentId}.pdf`;
          zip.file(filename, response.data);
          setBulkProgress({ current: i + 1, total: selectedStudents.size });
        } catch (error) {
          console.error(`Failed to generate ID for ${studentId}:`, error);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Student_ID_Cards_${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSelectedStudents(new Set());
    } catch (error) {
      console.error("Bulk generation failed:", error);
      alert(t("idCard.bulkError") || "Bulk generation failed");
    } finally {
      setBulkGenerating(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-xl dark:text-white">
                {t("idCard.studentTitle") || "ছাত্র আইডি কার্ড"}
              </CardTitle>
            </div>
            <Button
              variant="outline"
              onClick={fetchStudents}
              disabled={loading}
              className="dark:border-gray-600 dark:text-gray-300"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              {t("common.refresh") || "রিফ্রেশ"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("common.class") || "মারহালা"}
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection("all");
                }}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">
                  {t("common.allClasses") || "সকল মারহালা"}
                </option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.display_name || cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("common.section") || "শাখা"}
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">
                  {t("common.allSections") || "সকল শাখা"}
                </option>
                {sections
                  .filter(
                    (s) =>
                      !selectedClass ||
                      selectedClass === "all" ||
                      s.class_id === selectedClass,
                  )
                  .map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("common.search") || "খুঁজুন"}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={
                    t("idCard.searchPlaceholder") ||
                    "নাম, রোল দিয়ে খুঁজুন..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4" />
              <span>
                {t("idCard.totalStudents") || "মোট ছাত্র"}:{" "}
                {filteredStudents.length}
                {selectedStudents.size > 0 && (
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    ({selectedStudents.size}{" "}
                    {t("common.selected") || "নির্বাচিত"})
                  </span>
                )}
              </span>
            </div>
            {selectedStudents.size > 0 && (
              <Button
                onClick={generateBulkIDCards}
                disabled={bulkGenerating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {bulkGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {bulkProgress.current}/{bulkProgress.total}
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    {t("idCard.downloadSelected") || "নির্বাচিত ডাউনলোড"} (
                    {selectedStudents.size})
                  </>
                )}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("idCard.noStudents") || "কোন ছাত্র পাওয়া যায়নি"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="text-center px-4 py-3 w-12">
                      <button
                        onClick={toggleSelectAll}
                        className="text-gray-600 dark:text-gray-300 hover:text-emerald-600"
                      >
                        {selectedStudents.size === filteredStudents.length &&
                        filteredStudents.length > 0 ? (
                          <CheckSquare className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("common.photo") || "ছবি"}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("common.name") || "নাম"}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("common.fatherName") || "পিতার নাম"}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("common.class") || "মারহালা"}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("common.section") || "শাখা"}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("common.rollNo") || "রোল"}
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("common.actions") || "একশন"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedStudents.has(student.id) ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
                    >
                      <td className="text-center px-4 py-3">
                        <button
                          onClick={() => toggleStudentSelection(student.id)}
                          className="text-gray-600 dark:text-gray-300 hover:text-emerald-600"
                        >
                          {selectedStudents.has(student.id) ? (
                            <CheckSquare className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {student.photo_url ? (
                          <img
                            src={student.photo_url}
                            alt={student.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm dark:text-white font-medium">
                        {student.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {student.father_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {student.class_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {student.section_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {student.roll_no || student.admission_no || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => previewIDCard(student.id)}
                            title={t("common.preview") || "প্রিভিউ"}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              generateIDCard(student.id, student.name)
                            }
                            disabled={generating[student.id]}
                            title={t("common.download") || "ডাউনলোড"}
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          >
                            {generating[student.id] ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => previewIDCard(student.id, true)}
                            title={t("common.print") || "প্রিন্ট"}
                            className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentIDCard;
