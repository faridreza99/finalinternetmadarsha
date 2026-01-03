import React, { useState, useEffect, useCallback } from "react";
import { useInstitution } from "../../context/InstitutionContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { 
  Search,
  Printer,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Calendar,
  Filter
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const MonthlyFeeReport = () => {
  const { isMadrasahSimpleUI } = useInstitution();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState({ total: 0, count: 0, pending: 0 });
  const [schoolBranding, setSchoolBranding] = useState({});

  const isBangla = isMadrasahSimpleUI;

  const toBengaliNumeral = (num) => {
    if (!isBangla) return num?.toLocaleString() || "0";
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num?.toString().replace(/\d/g, d => bengaliDigits[parseInt(d)]) || "০";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isBangla) {
      return date.toLocaleDateString("bn-BD");
    }
    return date.toLocaleDateString("en-US");
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [paymentsRes, brandingRes] = await Promise.all([
        axios.get(`/api/fees/payments/recent?limit=500&month=${selectedMonth}`, { headers }),
        axios.get("/api/school-branding", { headers })
      ]);

      const paymentsData = paymentsRes.data.payments || paymentsRes.data || [];
      setPayments(paymentsData);
      setFilteredPayments(paymentsData);
      setSchoolBranding(brandingRes.data || {});

      const total = paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0);
      setSummary({ total, count: paymentsData.length, pending: 0 });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(isBangla ? "তথ্য লোড করতে ব্যর্থ" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, isBangla]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = payments.filter(p => 
        p.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.receipt_no?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPayments(filtered);
    } else {
      setFilteredPayments(payments);
    }
  }, [searchTerm, payments]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${isBangla ? "মাসিক ফি রিপোর্ট" : "Monthly Fee Report"}</title>
          <style>
            body { font-family: 'Noto Sans Bengali', Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .header img { max-height: 80px; margin-bottom: 10px; }
            .header h1 { margin: 5px 0; font-size: 24px; }
            .header p { margin: 3px 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #059669; color: white; }
            .summary { margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
            .print-date { text-align: right; margin-top: 30px; color: #666; font-size: 12px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            ${schoolBranding.logo_url ? `<img src="${schoolBranding.logo_url}" alt="Logo" />` : ""}
            <h1>${schoolBranding.school_name || "School ERP"}</h1>
            <p>${schoolBranding.address || ""}</p>
            <h2>${isBangla ? "মাসিক ফি রিপোর্ট" : "Monthly Fee Report"} - ${selectedMonth}</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>${isBangla ? "ক্রম" : "SL"}</th>
                <th>${isBangla ? "রসিদ নং" : "Receipt No"}</th>
                <th>${isBangla ? "শিক্ষার্থীর নাম" : "Student Name"}</th>
                <th>${isBangla ? "ফি ধরন" : "Fee Type"}</th>
                <th>${isBangla ? "টাকা" : "Amount"}</th>
                <th>${isBangla ? "তারিখ" : "Date"}</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPayments.map((p, i) => `
                <tr>
                  <td>${isBangla ? toBengaliNumeral(i + 1) : i + 1}</td>
                  <td>${p.receipt_no || ""}</td>
                  <td>${p.student_name || ""}</td>
                  <td>${p.fee_type || ""}</td>
                  <td>৳ ${isBangla ? toBengaliNumeral(p.amount) : p.amount}</td>
                  <td>${formatDate(p.payment_date || p.created_at)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="summary">
            <strong>${isBangla ? "মোট:" : "Total:"}</strong> ৳ ${isBangla ? toBengaliNumeral(summary.total) : summary.total} 
            (${isBangla ? toBengaliNumeral(summary.count) : summary.count} ${isBangla ? "টি পেমেন্ট" : "payments"})
          </div>
          <div class="print-date">
            ${isBangla ? "প্রিন্টের তারিখ:" : "Print Date:"} ${new Date().toLocaleDateString(isBangla ? "bn-BD" : "en-US")}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/reports/monthly-fees/export/excel?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `monthly-fees-${selectedMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(isBangla ? "এক্সেল ডাউনলোড হয়েছে" : "Excel downloaded");
    } catch (error) {
      toast.error(isBangla ? "এক্সপোর্ট ব্যর্থ" : "Export failed");
    }
  };

  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/reports/monthly-fees/export/pdf?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `monthly-fees-${selectedMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(isBangla ? "পিডিএফ ডাউনলোড হয়েছে" : "PDF downloaded");
    } catch (error) {
      toast.error(isBangla ? "এক্সপোর্ট ব্যর্থ" : "Export failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isBangla ? "মাসিক ফি রিপোর্ট" : "Monthly Fee Report"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isBangla ? "মাসিক ফি আদায়ের বিস্তারিত" : "Detailed monthly fee collections"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {isBangla ? "রিফ্রেশ" : "Refresh"}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            {isBangla ? "প্রিন্ট" : "Print"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {isBangla ? "ফিল্টার" : "Filter"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={isBangla ? "নাম বা রসিদ নং খুঁজুন..." : "Search name or receipt..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <Button onClick={fetchData} className="bg-emerald-600 hover:bg-emerald-700">
              {isBangla ? "ফিল্টার করুন" : "Apply Filter"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-emerald-50 dark:bg-emerald-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isBangla ? "মোট আদায়" : "Total Collection"}
            </p>
            <p className="text-2xl font-bold text-emerald-600">
              ৳ {toBengaliNumeral(summary.total)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isBangla ? "মোট পেমেন্ট" : "Total Payments"}
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {toBengaliNumeral(summary.count)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {isBangla ? "ক্রম" : "SL"}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {isBangla ? "রসিদ নং" : "Receipt No"}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {isBangla ? "শিক্ষার্থীর নাম" : "Student Name"}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {isBangla ? "ফি ধরন" : "Fee Type"}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {isBangla ? "টাকা" : "Amount"}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {isBangla ? "তারিখ" : "Date"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      {isBangla ? "কোনো তথ্য পাওয়া যায়নি" : "No records found"}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment, index) => (
                    <tr key={payment.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm">{toBengaliNumeral(index + 1)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-emerald-600">{payment.receipt_no || "-"}</td>
                      <td className="px-4 py-3 text-sm">{payment.student_name}</td>
                      <td className="px-4 py-3 text-sm">{payment.fee_type}</td>
                      <td className="px-4 py-3 text-sm font-semibold">৳ {toBengaliNumeral(payment.amount)}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(payment.payment_date || payment.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlyFeeReport;
