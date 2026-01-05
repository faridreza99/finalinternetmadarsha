import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  GraduationCap,
  Users,
  Printer,
  Save,
  CheckCircle,
  Search,
} from "lucide-react";
import { toast } from "sonner";

const MADRASAH_GRADES = [
  {
    value: "mumtaz",
    label: "মুমতাজ",
    labelEn: "Mumtaz (Excellent)",
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  {
    value: "jayyid_jiddan",
    label: "জায়্যিদ জিদ্দান",
    labelEn: "Jayyid Jiddan (Very Good)",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  {
    value: "jayyid",
    label: "জায়্যিদ",
    labelEn: "Jayyid (Good)",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  {
    value: "maqbul",
    label: "মাকবুল",
    labelEn: "Maqbul (Pass)",
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  {
    value: "rasib",
    label: "রাসেব (ফেল)",
    labelEn: "Rasib (Fail)",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
];

const MadrasahSimpleResult = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSession, setSelectedSession] = useState(
    new Date().getFullYear().toString(),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolBranding, setSchoolBranding] = useState({
    name: "",
    address: "",
    logo_url: "",
  });
  const printRef = useRef();

  const canEdit = ["super_admin", "admin", "principal", "teacher"].includes(
    user?.role,
  );

  const fetchClasses = useCallback(async () => {
    try {
      const response = await axios.get("/api/classes");
      const madrasahClasses = response.data.filter(
        (c) =>
          c.institution_type === "madrasah" ||
          c.display_name?.includes("ইবতেদায়ী") ||
          c.display_name?.includes("দাখিল") ||
          c.display_name?.includes("আলিম"),
      );
      setClasses(madrasahClasses.length > 0 ? madrasahClasses : response.data);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }
    try {
      const response = await axios.get(
        `/api/students?class_id=${selectedClass}`,
      );
      setStudents(response.data.students || response.data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  }, [selectedClass]);

  const fetchResults = useCallback(async () => {
    if (!selectedClass) return;
    try {
      const response = await axios.get(
        `/api/madrasah/simple-results?class_id=${selectedClass}&session=${selectedSession}`,
      );
      setResults(response.data || []);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error fetching results:", error);
      }
      setResults([]);
    }
  }, [selectedClass, selectedSession]);

  const fetchSchoolBranding = useCallback(async () => {
    try {
      const response = await axios.get("/api/institution");
      if (response.data) {
        setSchoolBranding({
          name: response.data.school_name || response.data.name || "",
          address: response.data.address || "",
          logo_url: response.data.logo_url || "",
        });
      }
    } catch (error) {
      console.error("Error fetching branding:", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchClasses(), fetchSchoolBranding()]);
      setLoading(false);
    };
    init();
  }, [fetchClasses, fetchSchoolBranding]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
      fetchResults();
    }
  }, [selectedClass, selectedSession, fetchStudents, fetchResults]);

  const getStudentResult = (studentId) => {
    return results.find((r) => r.student_id === studentId);
  };

  const handleGradeChange = async (studentId, grade) => {
    if (!canEdit) return;

    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const existingResult = getStudentResult(studentId);

    try {
      if (existingResult) {
        await axios.put(`/api/madrasah/simple-results/${existingResult.id}`, {
          grade,
          session: selectedSession,
        });
      } else {
        await axios.post("/api/madrasah/simple-results", {
          student_id: studentId,
          student_name: student.name,
          class_id: selectedClass,
          class_name:
            classes.find((c) => c.id === selectedClass)?.display_name ||
            classes.find((c) => c.id === selectedClass)?.name,
          grade,
          session: selectedSession,
        });
      }

      await fetchResults();
      toast.success("ফলাফল সংরক্ষণ হয়েছে");
    } catch (error) {
      console.error("Error saving result:", error);
      toast.error("ফলাফল সংরক্ষণ করতে সমস্যা হয়েছে");
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ফলাফল - ${schoolBranding.name}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'SolaimanLipi', 'Kalpurush', Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .logo { max-height: 60px; margin-bottom: 10px; }
          h1 { font-size: 24px; margin: 5px 0; color: #1a5f2a; }
          h2 { font-size: 18px; margin: 5px 0; color: #333; }
          .info { font-size: 14px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #333; padding: 10px; text-align: center; }
          th { background: #1a5f2a; color: white; }
          tr:nth-child(even) { background: #f5f5f5; }
          .grade-mumtaz { background: #d1fae5; color: #065f46; font-weight: bold; }
          .grade-jayyid_jiddan { background: #dcfce7; color: #166534; }
          .grade-jayyid { background: #dbeafe; color: #1e40af; }
          .grade-maqbul { background: #fef9c3; color: #854d0e; }
          .grade-rasib { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          .signature { margin-top: 60px; display: flex; justify-content: space-between; }
          .signature div { text-align: center; border-top: 1px solid #333; padding-top: 5px; width: 150px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${schoolBranding.logo_url ? `<img src="${schoolBranding.logo_url}" class="logo" alt="Logo"/>` : ""}
          <h1>${schoolBranding.name || "মাদ্রাসা"}</h1>
          <p class="info">${schoolBranding.address || ""}</p>
          <h2>বার্ষিক ফলাফল - ${selectedSession}</h2>
          <p>মারহালা: ${classes.find((c) => c.id === selectedClass)?.display_name || ""}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>ক্রম</th>
              <th>ছাত্রের নাম</th>
              <th>রোল</th>
              <th>ফলাফল</th>
            </tr>
          </thead>
          <tbody>
            ${filteredStudents
              .map((student, index) => {
                const result = getStudentResult(student.id);
                const gradeInfo = MADRASAH_GRADES.find(
                  (g) => g.value === result?.grade,
                );
                return `
                <tr>
                  <td>${index + 1}</td>
                  <td style="text-align: left;">${student.name}</td>
                  <td>${student.roll_no || "-"}</td>
                  <td class="grade-${result?.grade || ""}">${gradeInfo?.label || "মূল্যায়ন হয়নি"}</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
        <div class="signature">
          <div>শ্রেণি শিক্ষক</div>
          <div>প্রধান শিক্ষক</div>
          <div>মুহতামিম</div>
        </div>
        <div class="footer">
          <p>প্রকাশের তারিখ: ${new Date().toLocaleDateString("bn-BD")}</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_no?.toString().includes(searchTerm),
  );

  const sessionOptions = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= currentYear - 5; i--) {
    sessionOptions.push(i.toString());
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border animate-pulse">
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-6 rounded-t-lg">
            <div className="h-8 w-48 bg-white/20 rounded"></div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
                ></div>
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-200 dark:bg-gray-700 rounded"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
            <GraduationCap className="h-7 w-7" />
            সহজ ফলাফল সিস্টেম
          </CardTitle>
          <p className="text-emerald-100 text-sm mt-1">
            মারহালা নির্বাচন করে ছাত্রদের ফলাফল দিন
          </p>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                মারহালা নির্বাচন করুন
              </label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="মারহালা বাছাই করুন" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem
                      key={cls.id}
                      value={cls.id}
                      className="text-base py-3"
                    >
                      {cls.display_name || cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                ছাত্র খুঁজুন
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="নাম বা রোল দিয়ে খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
            </div>
          </div>

          {selectedClass && (
            <div className="flex justify-end mb-4">
              <Button
                onClick={handlePrint}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Printer className="h-5 w-5" />
                ফলাফল প্রিন্ট করুন
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClass && (
        <Card ref={printRef}>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-emerald-600" />
              ছাত্র তালিকা ও ফলাফল
              <Badge variant="secondary" className="ml-2">
                মোট: {filteredStudents.length} জন
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">এই মারহালায় কোন ছাত্র নেই</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        ক্রম
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        ছাত্রের নাম
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        রোল
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        ফলাফল
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        অবস্থা
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredStudents.map((student, index) => {
                      const result = getStudentResult(student.id);
                      const gradeInfo = MADRASAH_GRADES.find(
                        (g) => g.value === result?.grade,
                      );

                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {index + 1}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {student.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.father_name &&
                                `পিতা: ${student.father_name}`}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                            {student.roll_no || "-"}
                          </td>
                          <td className="px-4 py-4">
                            {canEdit ? (
                              <Select
                                value={result?.grade || ""}
                                onValueChange={(value) =>
                                  handleGradeChange(student.id, value)
                                }
                              >
                                <SelectTrigger className="h-11 w-48 mx-auto text-base">
                                  <SelectValue placeholder="ফলাফল দিন" />
                                </SelectTrigger>
                                <SelectContent>
                                  {MADRASAH_GRADES.map((grade) => (
                                    <SelectItem
                                      key={grade.value}
                                      value={grade.value}
                                      className="py-3"
                                    >
                                      <span
                                        className={`px-2 py-1 rounded ${grade.color}`}
                                      >
                                        {grade.label}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                className={gradeInfo?.color || "bg-gray-100"}
                              >
                                {gradeInfo?.label || "মূল্যায়ন হয়নি"}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {result ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                                <CheckCircle className="h-3 w-3" />
                                সংরক্ষিত
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-gray-500"
                              >
                                অপেক্ষমাণ
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedClass && (
        <Card className="border-dashed border-2 border-gray-300 dark:border-gray-700">
          <CardContent className="py-16 text-center">
            <GraduationCap className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">
              মারহালা নির্বাচন করুন
            </h3>
            <p className="text-gray-500">
              উপরে থেকে মারহালা বাছাই করলে ছাত্রদের তালিকা দেখাবে
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MadrasahSimpleResult;
