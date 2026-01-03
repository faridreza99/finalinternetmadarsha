import React, { useState, useEffect, useCallback } from "react";
import { useInstitution } from "../../context/InstitutionContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { 
  DollarSign, 
  Users, 
  Calendar,
  TrendingUp,
  Printer,
  FileSpreadsheet,
  FileText,
  RefreshCw
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const FinancialSummary = () => {
  const { isMadrasahSimpleUI } = useInstitution();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalAdmissionFees: 0,
    totalMonthlyFees: 0,
    totalDonations: 0,
    todayCollection: 0,
    totalDues: 0,
    thisMonthCollection: 0,
    thisYearCollection: 0
  });
  const [schoolBranding, setSchoolBranding] = useState({});

  const isBangla = isMadrasahSimpleUI;

  const toBengaliNumeral = (num) => {
    if (!isBangla) return num?.toLocaleString() || "0";
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num?.toString().replace(/\d/g, d => bengaliDigits[parseInt(d)]) || "০";
  };

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [summaryRes, brandingRes] = await Promise.all([
        axios.get("/api/reports/financial-summary", { headers }),
        axios.get("/api/school-branding", { headers })
      ]);

      setSummary(summaryRes.data);
      setSchoolBranding(brandingRes.data || {});
    } catch (error) {
      console.error("Error fetching summary:", error);
      toast.error(isBangla ? "সারাংশ লোড করতে ব্যর্থ" : "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, [isBangla]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handlePrint = () => {
    const printContent = document.getElementById("financial-summary-print");
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${isBangla ? "আর্থিক সারাংশ" : "Financial Summary"}</title>
          <style>
            body { font-family: 'Noto Sans Bengali', Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .header img { max-height: 80px; margin-bottom: 10px; }
            .header h1 { margin: 5px 0; font-size: 24px; }
            .header p { margin: 3px 0; color: #666; }
            .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 30px; }
            .summary-card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
            .summary-card h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; }
            .summary-card .amount { font-size: 28px; font-weight: bold; color: #059669; }
            .print-date { text-align: right; margin-top: 30px; color: #666; font-size: 12px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            ${schoolBranding.logo_url ? `<img src="${schoolBranding.logo_url}" alt="Logo" />` : ""}
            <h1>${schoolBranding.school_name || "School ERP"}</h1>
            <p>${schoolBranding.address || ""}</p>
            <h2>${isBangla ? "আর্থিক সারাংশ রিপোর্ট" : "Financial Summary Report"}</h2>
          </div>
          ${printContent.innerHTML}
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
      const response = await axios.get("/api/reports/financial-summary/export/excel", {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `financial-summary-${new Date().toISOString().split("T")[0]}.xlsx`);
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
      const response = await axios.get("/api/reports/financial-summary/export/pdf", {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `financial-summary-${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(isBangla ? "পিডিএফ ডাউনলোড হয়েছে" : "PDF downloaded");
    } catch (error) {
      toast.error(isBangla ? "এক্সপোর্ট ব্যর্থ" : "Export failed");
    }
  };

  const summaryCards = [
    {
      title: isBangla ? "মোট ভর্তি ফি আদায়" : "Total Admission Fees",
      value: summary.totalAdmissionFees,
      icon: Users,
      color: "bg-blue-500"
    },
    {
      title: isBangla ? "মোট মাসিক ফি আদায়" : "Total Monthly Fees",
      value: summary.totalMonthlyFees,
      icon: Calendar,
      color: "bg-green-500"
    },
    {
      title: isBangla ? "মোট ডোনেশন" : "Total Donations",
      value: summary.totalDonations,
      icon: DollarSign,
      color: "bg-purple-500"
    },
    {
      title: isBangla ? "আজকের মোট আদায়" : "Today's Collection",
      value: summary.todayCollection,
      icon: TrendingUp,
      color: "bg-orange-500"
    },
    {
      title: isBangla ? "মোট বকেয়া" : "Total Dues",
      value: summary.totalDues,
      icon: DollarSign,
      color: "bg-red-500"
    },
    {
      title: isBangla ? "এই মাসের আদায়" : "This Month Collection",
      value: summary.thisMonthCollection,
      icon: Calendar,
      color: "bg-teal-500"
    }
  ];

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
            {isBangla ? "আর্থিক সারাংশ" : "Financial Summary"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isBangla ? "সমস্ত আর্থিক তথ্যের সংক্ষিপ্ত বিবরণ" : "Overview of all financial data"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchSummary}>
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

      <div id="financial-summary-print">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {summaryCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${card.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isBangla ? "৳" : "৳"} {toBengaliNumeral(card.value)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{isBangla ? "বার্ষিক সারাংশ" : "Annual Summary"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isBangla ? "এই বছরের মোট আদায়" : "This Year's Total Collection"}
                </p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">
                  ৳ {toBengaliNumeral(summary.thisYearCollection)}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isBangla ? "মোট আদায় (সর্বকালীন)" : "Total Collection (All Time)"}
                </p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  ৳ {toBengaliNumeral(summary.totalAdmissionFees + summary.totalMonthlyFees + summary.totalDonations)}
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isBangla ? "বকেয়া আদায় বাকি" : "Pending Dues"}
                </p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  ৳ {toBengaliNumeral(summary.totalDues)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialSummary;
