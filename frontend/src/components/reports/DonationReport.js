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
  Filter,
  Users,
  Heart
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const DonationReport = () => {
  const { isMadrasahSimpleUI } = useInstitution();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("donations");
  const [donations, setDonations] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [donors, setDonors] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [summary, setSummary] = useState({ totalDonations: 0, totalDonors: 0, totalCommittees: 0 });
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

      const [donationsRes, committeesRes, donorsRes, institutionRes] = await Promise.all([
        axios.get("/api/donation-payments", { headers }).catch(() => ({ data: { payments: [] } })),
        axios.get("/api/committees", { headers }).catch(() => ({ data: { committees: [] } })),
        axios.get("/api/donors", { headers }).catch(() => ({ data: { donors: [] } })),
        axios.get("/api/institution", { headers })
      ]);

      const donationsData = donationsRes.data.payments || donationsRes.data || [];
      const committeesData = committeesRes.data.committees || committeesRes.data || [];
      const donorsData = donorsRes.data.donors || donorsRes.data || [];

      setDonations(donationsData);
      setCommittees(committeesData);
      setDonors(donorsData);
      const inst = institutionRes.data || {};
      setSchoolBranding({
        school_name: inst.school_name || inst.name || '',
        logo_url: inst.logo_url || inst.logo || '',
        address: inst.address || ''
      });

      const totalDonations = donationsData.reduce((sum, d) => sum + (d.amount || 0), 0);
      setSummary({
        totalDonations,
        totalDonors: donorsData.length,
        totalCommittees: committeesData.length
      });

      if (activeTab === "donations") {
        setFilteredData(donationsData);
      } else if (activeTab === "committees") {
        setFilteredData(committeesData);
      } else {
        setFilteredData(donorsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(isBangla ? "তথ্য লোড করতে ব্যর্থ" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [activeTab, isBangla]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let data = [];
    if (activeTab === "donations") data = donations;
    else if (activeTab === "committees") data = committees;
    else data = donors;

    if (searchTerm) {
      data = data.filter(item => 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.donor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.committee_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredData(data);
  }, [searchTerm, activeTab, donations, committees, donors]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const title = activeTab === "donations" 
      ? (isBangla ? "ডোনেশন রিপোর্ট" : "Donation Report")
      : activeTab === "committees"
      ? (isBangla ? "কমিটি রিপোর্ট" : "Committee Report")
      : (isBangla ? "দাতা রিপোর্ট" : "Donor Report");

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Noto Sans Bengali', Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .header img { max-height: 80px; margin-bottom: 10px; }
            .header h1 { margin: 5px 0; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #7c3aed; color: white; }
            .summary { margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
            .print-date { text-align: right; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${schoolBranding.logo_url ? `<img src="${schoolBranding.logo_url}" alt="Logo" />` : ""}
            <h1>${schoolBranding.school_name || "School ERP"}</h1>
            <h2>${title}</h2>
          </div>
          <div class="summary">
            <strong>${isBangla ? "মোট ডোনেশন:" : "Total Donations:"}</strong> ৳ ${toBengaliNumeral(summary.totalDonations)} |
            <strong>${isBangla ? "মোট দাতা:" : "Total Donors:"}</strong> ${toBengaliNumeral(summary.totalDonors)} |
            <strong>${isBangla ? "মোট কমিটি:" : "Total Committees:"}</strong> ${toBengaliNumeral(summary.totalCommittees)}
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
      const response = await axios.get(`/api/reports/donations/export/excel?type=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${activeTab}-report-${new Date().toISOString().split("T")[0]}.xlsx`);
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
      const response = await axios.get(`/api/reports/donations/export/pdf?type=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${activeTab}-report-${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(isBangla ? "পিডিএফ ডাউনলোড হয়েছে" : "PDF downloaded");
    } catch (error) {
      toast.error(isBangla ? "এক্সপোর্ট ব্যর্থ" : "Export failed");
    }
  };

  const tabs = [
    { key: "donations", label: isBangla ? "ডোনেশন" : "Donations", icon: Heart },
    { key: "committees", label: isBangla ? "কমিটি" : "Committees", icon: Users },
    { key: "donors", label: isBangla ? "দাতা" : "Donors", icon: Users }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isBangla ? "ডোনেশন / কমিটি রিপোর্ট" : "Donation / Committee Report"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isBangla ? "দান ও কমিটির সম্পূর্ণ তথ্য" : "Complete donation and committee information"}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-purple-50 dark:bg-purple-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isBangla ? "মোট ডোনেশন" : "Total Donations"}
            </p>
            <p className="text-2xl font-bold text-purple-600">
              ৳ {toBengaliNumeral(summary.totalDonations)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isBangla ? "মোট দাতা" : "Total Donors"}
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {toBengaliNumeral(summary.totalDonors)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isBangla ? "মোট কমিটি" : "Total Committees"}
            </p>
            <p className="text-2xl font-bold text-green-600">
              {toBengaliNumeral(summary.totalCommittees)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {isBangla ? "ফিল্টার" : "Filter"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={isBangla ? "নাম খুঁজুন..." : "Search name..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {activeTab === "donations" && (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "ক্রম" : "SL"}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "দাতার নাম" : "Donor Name"}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "কমিটি" : "Committee"}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "টাকা" : "Amount"}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "তারিখ" : "Date"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        {isBangla ? "কোনো তথ্য পাওয়া যায়নি" : "No records found"}
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm">{toBengaliNumeral(index + 1)}</td>
                        <td className="px-4 py-3 text-sm">{item.donor_name}</td>
                        <td className="px-4 py-3 text-sm">{item.committee_name}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-purple-600">৳ {toBengaliNumeral(item.amount)}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(item.payment_date)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "committees" && (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "ক্রম" : "SL"}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "কমিটির নাম" : "Committee Name"}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "সদস্য সংখ্যা" : "Members"}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "মোট আদায়" : "Total Collected"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                        {isBangla ? "কোনো তথ্য পাওয়া যায়নি" : "No records found"}
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm">{toBengaliNumeral(index + 1)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-sm">{toBengaliNumeral(item.active_members || 0)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-purple-600">৳ {toBengaliNumeral(item.total_collected || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "donors" && (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "ক্রম" : "SL"}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "দাতার নাম" : "Donor Name"}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "মোবাইল" : "Mobile"}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "কমিটি" : "Committee"}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">{isBangla ? "নির্ধারিত টাকা" : "Fixed Amount"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        {isBangla ? "কোনো তথ্য পাওয়া যায়নি" : "No records found"}
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm">{toBengaliNumeral(index + 1)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-sm">{item.phone}</td>
                        <td className="px-4 py-3 text-sm">{item.committee_name}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-purple-600">৳ {toBengaliNumeral(item.fixed_amount || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DonationReport;
