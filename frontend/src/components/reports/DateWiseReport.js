import React, { useState, useEffect, useCallback } from "react";
import { useInstitution } from "../../context/InstitutionContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { 
  Printer,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Calendar,
  Filter,
  DollarSign
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const DateWiseReport = () => {
  const { isMadrasahSimpleUI } = useInstitution();
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [reportData, setReportData] = useState({
    admissionFees: [],
    monthlyFees: [],
    donations: []
  });
  const [summary, setSummary] = useState({
    totalAdmission: 0,
    totalMonthly: 0,
    totalDonation: 0,
    grandTotal: 0
  });
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
    return isBangla ? date.toLocaleDateString("bn-BD") : date.toLocaleDateString("en-US");
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [reportRes, institutionRes] = await Promise.all([
        axios.get(`/api/reports/date-wise?date_from=${dateFrom}&date_to=${dateTo}`, { headers }),
        axios.get("/api/institution", { headers })
      ]);

      const data = reportRes.data || {};
      setReportData({
        admissionFees: data.admission_fees || [],
        monthlyFees: data.monthly_fees || [],
        donations: data.donations || []
      });

      const totalAdmission = (data.admission_fees || []).reduce((sum, f) => sum + (f.amount || 0), 0);
      const totalMonthly = (data.monthly_fees || []).reduce((sum, f) => sum + (f.amount || 0), 0);
      const totalDonation = (data.donations || []).reduce((sum, d) => sum + (d.amount || 0), 0);

      setSummary({
        totalAdmission,
        totalMonthly,
        totalDonation,
        grandTotal: totalAdmission + totalMonthly + totalDonation
      });

      const inst = institutionRes.data || {};
      setSchoolBranding({
        school_name: inst.school_name || inst.name || '',
        logo_url: inst.logo_url || inst.logo || '',
        address: inst.address || ''
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(isBangla ? "তথ্য লোড করতে ব্যর্থ" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, isBangla]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${isBangla ? "তারিখভিত্তিক রিপোর্ট" : "Date-wise Report"}</title>
          <style>
            body { font-family: 'Noto Sans Bengali', Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .header img { max-height: 80px; margin-bottom: 10px; }
            .header h1 { margin: 5px 0; font-size: 24px; }
            .section { margin: 20px 0; }
            .section h3 { background: #059669; color: white; padding: 10px; margin: 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
            .summary { margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; text-align: center; }
            .summary-item { padding: 10px; background: white; border-radius: 4px; }
            .print-date { text-align: right; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${schoolBranding.logo_url ? `<img src="${schoolBranding.logo_url}" alt="Logo" />` : ""}
            <h1>${schoolBranding.school_name || "School ERP"}</h1>
            <h2>${isBangla ? "তারিখভিত্তিক আর্থিক রিপোর্ট" : "Date-wise Financial Report"}</h2>
            <p>${formatDate(dateFrom)} - ${formatDate(dateTo)}</p>
          </div>
          
          <div class="summary">
            <div class="summary-grid">
              <div class="summary-item">
                <strong>${isBangla ? "ভর্তি ফি" : "Admission Fees"}</strong><br/>
                ৳ ${toBengaliNumeral(summary.totalAdmission)}
              </div>
              <div class="summary-item">
                <strong>${isBangla ? "মাসিক ফি" : "Monthly Fees"}</strong><br/>
                ৳ ${toBengaliNumeral(summary.totalMonthly)}
              </div>
              <div class="summary-item">
                <strong>${isBangla ? "ডোনেশন" : "Donations"}</strong><br/>
                ৳ ${toBengaliNumeral(summary.totalDonation)}
              </div>
              <div class="summary-item" style="background: #059669; color: white;">
                <strong>${isBangla ? "সর্বমোট" : "Grand Total"}</strong><br/>
                ৳ ${toBengaliNumeral(summary.grandTotal)}
              </div>
            </div>
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
      const response = await axios.get(`/api/reports/date-wise/export/excel?date_from=${dateFrom}&date_to=${dateTo}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `date-wise-report-${dateFrom}-to-${dateTo}.xlsx`);
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
      const response = await axios.get(`/api/reports/date-wise/export/pdf?date_from=${dateFrom}&date_to=${dateTo}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `date-wise-report-${dateFrom}-to-${dateTo}.pdf`);
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
            {isBangla ? "তারিখভিত্তিক রিপোর্ট" : "Date-wise Report"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isBangla ? "নির্দিষ্ট তারিখের সমস্ত আর্থিক লেনদেন" : "All financial transactions for specific dates"}
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
            {isBangla ? "তারিখ নির্বাচন" : "Select Date Range"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span className="text-gray-500">{isBangla ? "থেকে" : "From"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
              <span className="text-gray-500">{isBangla ? "পর্যন্ত" : "To"}</span>
            </div>
            <Button onClick={fetchData} className="bg-emerald-600 hover:bg-emerald-700">
              {isBangla ? "রিপোর্ট দেখুন" : "View Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isBangla ? "ভর্তি ফি" : "Admission Fees"}
            </p>
            <p className="text-2xl font-bold text-blue-600">
              ৳ {toBengaliNumeral(summary.totalAdmission)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isBangla ? "মাসিক ফি" : "Monthly Fees"}
            </p>
            <p className="text-2xl font-bold text-green-600">
              ৳ {toBengaliNumeral(summary.totalMonthly)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isBangla ? "ডোনেশন" : "Donations"}
            </p>
            <p className="text-2xl font-bold text-purple-600">
              ৳ {toBengaliNumeral(summary.totalDonation)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isBangla ? "সর্বমোট" : "Grand Total"}
            </p>
            <p className="text-2xl font-bold text-emerald-600">
              ৳ {toBengaliNumeral(summary.grandTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
            <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {isBangla ? "ভর্তি ফি" : "Admission Fees"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-64 overflow-y-auto">
            {reportData.admissionFees.length === 0 ? (
              <p className="p-4 text-center text-gray-500">
                {isBangla ? "কোনো তথ্য নেই" : "No records"}
              </p>
            ) : (
              <table className="w-full">
                <tbody className="divide-y">
                  {reportData.admissionFees.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-2 text-sm">{item.student_name}</td>
                      <td className="px-4 py-2 text-sm text-right font-semibold">৳ {toBengaliNumeral(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-green-50 dark:bg-green-900/20">
            <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {isBangla ? "মাসিক ফি" : "Monthly Fees"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-64 overflow-y-auto">
            {reportData.monthlyFees.length === 0 ? (
              <p className="p-4 text-center text-gray-500">
                {isBangla ? "কোনো তথ্য নেই" : "No records"}
              </p>
            ) : (
              <table className="w-full">
                <tbody className="divide-y">
                  {reportData.monthlyFees.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-2 text-sm">{item.student_name}</td>
                      <td className="px-4 py-2 text-sm text-right font-semibold">৳ {toBengaliNumeral(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-purple-50 dark:bg-purple-900/20">
            <CardTitle className="text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {isBangla ? "ডোনেশন" : "Donations"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-64 overflow-y-auto">
            {reportData.donations.length === 0 ? (
              <p className="p-4 text-center text-gray-500">
                {isBangla ? "কোনো তথ্য নেই" : "No records"}
              </p>
            ) : (
              <table className="w-full">
                <tbody className="divide-y">
                  {reportData.donations.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-2 text-sm">{item.donor_name}</td>
                      <td className="px-4 py-2 text-sm text-right font-semibold">৳ {toBengaliNumeral(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DateWiseReport;
