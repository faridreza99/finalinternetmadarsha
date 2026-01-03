import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Building2,
  GraduationCap,
  Clock,
  Users,
  CreditCard,
  Save,
  Plus,
  Trash2,
  Edit,
  Upload,
  Check,
  Calendar,
  Phone,
  MapPin,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Globe,
  Image,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const MadrasahSimpleSettings = () => {
  const [activeTab, setActiveTab] = useState("institution");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "/api";

  const [institutionData, setInstitutionData] = useState({
    name: "",
    shortName: "",
    logo: "",
    address: "",
    mobile: "",
    muhtamimName: "",
    signature: "",
    siteTitle: "",
    faviconUrl: "",
  });

  const [academicData, setAcademicData] = useState({
    currentYear: new Date().getFullYear().toString(),
    classes: [],
    sections: [],
  });

  const [attendanceSettings, setAttendanceSettings] = useState({
    method: "manual",
    startTime: "08:00",
    endTime: "14:00",
    lateThreshold: 15,
  });

  const [users, setUsers] = useState([]);
  const [subscription, setSubscription] = useState(null);

  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newUserData, setNewUserData] = useState({
    name: "",
    username: "",
    password: "",
    role: "teacher",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        institutionRes,
        classesRes,
        usersRes,
        subscriptionRes,
        settingsRes,
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/institution`).catch(() => ({ data: {} })),
        axios.get(`${API_BASE_URL}/classes`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/users`).catch(() => ({ data: [] })),
        axios
          .get(`${API_BASE_URL}/subscriptions/current`)
          .catch(() => ({ data: null })),
        axios
          .get(`${API_BASE_URL}/institution/settings`)
          .catch(() => ({ data: {} })),
      ]);

      if (institutionRes.data) {
        setInstitutionData({
          name:
            institutionRes.data.name || institutionRes.data.school_name || "",
          shortName: institutionRes.data.short_name || "",
          logo: institutionRes.data.logo_url || institutionRes.data.logo || "",
          address: institutionRes.data.address || "",
          mobile: institutionRes.data.phone || institutionRes.data.mobile || "",
          muhtamimName:
            institutionRes.data.principal_name ||
            institutionRes.data.muhtamim_name ||
            "",
          signature: institutionRes.data.principal_signature || "",
          siteTitle: institutionRes.data.site_title || "",
          faviconUrl: institutionRes.data.favicon_url || "",
        });
      }

      if (classesRes.data) {
        setAcademicData((prev) => ({
          ...prev,
          classes: Array.isArray(classesRes.data) ? classesRes.data : [],
        }));
      }

      if (usersRes.data) {
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      }

      if (subscriptionRes.data) {
        setSubscription(subscriptionRes.data);
      }

      if (settingsRes.data) {
        setAttendanceSettings((prev) => ({
          ...prev,
          method: settingsRes.data.attendance_method || "manual",
          startTime: settingsRes.data.attendance_start_time || "08:00",
          endTime: settingsRes.data.attendance_end_time || "14:00",
        }));

        if (settingsRes.data.current_academic_year) {
          setAcademicData((prev) => ({
            ...prev,
            currentYear: settingsRes.data.current_academic_year,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveInstitution = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}/institution`, {
        school_name: institutionData.name,
        short_name: institutionData.shortName,
        address: institutionData.address,
        phone: institutionData.mobile,
        principal_name: institutionData.muhtamimName,
        site_title: institutionData.siteTitle,
        favicon_url: institutionData.faviconUrl,
      });
      
      if (institutionData.siteTitle) {
        document.title = institutionData.siteTitle;
      }
      if (institutionData.faviconUrl) {
        const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'icon';
        link.href = institutionData.faviconUrl;
        document.head.appendChild(link);
      }
      
      toast.success("প্রতিষ্ঠান তথ্য সংরক্ষিত হয়েছে");
      fetchData();
    } catch (error) {
      toast.error("সংরক্ষণ করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  const handleFaviconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validTypes = ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/ico"];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.ico')) {
      toast.error("শুধুমাত্র PNG বা ICO ফাইল আপলোড করুন");
      return;
    }
    
    if (file.size > 500 * 1024) {
      toast.error("ফাইল সাইজ ৫০০KB এর বেশি হতে পারবে না");
      return;
    }
    
    setUploadingFavicon(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await axios.post(`${API_BASE_URL}/institution/favicon`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      if (response.data.favicon_url) {
        setInstitutionData(prev => ({ ...prev, faviconUrl: response.data.favicon_url }));
        const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'icon';
        link.href = response.data.favicon_url;
        document.head.appendChild(link);
        toast.success("ফেভিকন আপলোড হয়েছে");
      }
    } catch (error) {
      toast.error("ফেভিকন আপলোড করতে সমস্যা হয়েছে");
    } finally {
      setUploadingFavicon(false);
    }
  };

  const openResetPasswordModal = (user) => {
    setSelectedUserForReset(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setIsResetPasswordModalOpen(true);
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      toast.error("নতুন পাসওয়ার্ড দিন");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("পাসওয়ার্ড মিলছে না");
      return;
    }

    setResettingPassword(true);
    try {
      const userId = selectedUserForReset.id || selectedUserForReset.user_id;
      await axios.post(
        `${API_BASE_URL}/admin/users/${userId}/reset-password`,
        { new_password: newPassword }
      );
      toast.success(`${selectedUserForReset.name || selectedUserForReset.username} এর পাসওয়ার্ড রিসেট হয়েছে`);
      setIsResetPasswordModalOpen(false);
      setSelectedUserForReset(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleToggleUserActive = async (user) => {
    const userId = user.id || user.user_id;
    const newStatus = user.is_active === false ? true : false;
    
    try {
      await axios.put(`${API_BASE_URL}/admin/users/${userId}`, {
        is_active: newStatus
      });
      toast.success(newStatus ? "ব্যবহারকারী সক্রিয় করা হয়েছে" : "ব্যবহারকারী নিষ্ক্রিয় করা হয়েছে");
      fetchData();
    } catch (error) {
      toast.error("আপডেট করতে সমস্যা হয়েছে");
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "logo");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/school-branding/upload-logo`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      const logoUrl = response.data.url || response.data.logo_url;

      await axios.put(`${API_BASE_URL}/institution`, { logo_url: logoUrl });

      setInstitutionData((prev) => ({ ...prev, logo: logoUrl }));
      toast.success("লোগো আপলোড হয়েছে");
      fetchData();
    } catch (error) {
      toast.error("লোগো আপলোড করতে সমস্যা হয়েছে");
    }
  };

  const handleSaveAcademic = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}/institution/settings`, {
        current_academic_year: academicData.currentYear,
      });
      toast.success("শিক্ষাবর্ষ সংরক্ষিত হয়েছে");
    } catch (error) {
      toast.error("সংরক্ষণ করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}/institution/settings`, {
        attendance_method: attendanceSettings.method,
        attendance_start_time: attendanceSettings.startTime,
        attendance_end_time: attendanceSettings.endTime,
        late_threshold_minutes: attendanceSettings.lateThreshold,
      });
      toast.success("হাজিরা সেটিং সংরক্ষিত হয়েছে");
    } catch (error) {
      toast.error("সংরক্ষণ করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  const handleAddClass = async () => {
    if (!newClassName.trim()) {
      toast.error("মারহালার নাম দিন");
      return;
    }
    try {
      const classNumber = academicData.classes.length + 1;
      await axios.post(`${API_BASE_URL}/classes`, {
        name: newClassName,
        standard: `Class ${classNumber}`,
        display_name: newClassName,
        internal_standard: classNumber,
        institution_type: "madrasah",
      });
      toast.success("মারহালা যোগ হয়েছে");
      setNewClassName("");
      setIsAddClassModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error("মারহালা যোগ করতে সমস্যা হয়েছে");
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm("এই মারহালা মুছে ফেলতে চান?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/classes/${classId}`);
      toast.success("মারহালা মুছে ফেলা হয়েছে");
      fetchData();
    } catch (error) {
      toast.error("মুছতে সমস্যা হয়েছে");
    }
  };

  const handleAddUser = async () => {
    if (!newUserData.name || !newUserData.username || !newUserData.password) {
      toast.error("সব তথ্য দিন");
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/users`, newUserData);
      toast.success("ব্যবহারকারী যোগ হয়েছে");
      setNewUserData({ name: "", username: "", password: "", role: "teacher" });
      setIsAddUserModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error("ব্যবহারকারী যোগ করতে সমস্যা হয়েছে");
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-emerald-100 text-emerald-800";
      case "teacher":
        return "bg-blue-100 text-blue-800";
      case "office":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "admin":
        return "মুহতামিম";
      case "teacher":
        return "উস্তাদ";
      case "office":
        return "অফিস";
      case "super_admin":
        return "সুপার এডমিন";
      default:
        return role;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("bn-BD", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            সেটিংস
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            মাদ্রাসার সেটিংস পরিবর্তন করুন
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1 h-auto p-1">
          <TabsTrigger
            value="institution"
            className="flex items-center gap-2 py-3 text-sm"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">প্রতিষ্ঠান তথ্য</span>
          </TabsTrigger>
          <TabsTrigger
            value="academic"
            className="flex items-center gap-2 py-3 text-sm"
          >
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">শিক্ষাবর্ষ ও মারহালা</span>
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="flex items-center gap-2 py-3 text-sm"
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">হাজিরা সেটিং</span>
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="flex items-center gap-2 py-3 text-sm"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">ব্যবহারকারী ব্যবস্থাপনা</span>
          </TabsTrigger>
          <TabsTrigger
            value="subscription"
            className="flex items-center gap-2 py-3 text-sm"
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">সাবস্ক্রিপশন তথ্য</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="institution" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-emerald-500" />
                প্রতিষ্ঠান তথ্য
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    মাদ্রাসার নাম *
                  </Label>
                  <Input
                    value={institutionData.name}
                    onChange={(e) =>
                      setInstitutionData({
                        ...institutionData,
                        name: e.target.value,
                      })
                    }
                    placeholder="মাদ্রাসার নাম লিখুন"
                    className="text-lg py-3"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    সংক্ষিপ্ত নাম (ইউজার আইডির জন্য)
                  </Label>
                  <Input
                    value={institutionData.shortName}
                    onChange={(e) =>
                      setInstitutionData({
                        ...institutionData,
                        shortName: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''),
                      })
                    }
                    placeholder="যেমন: imquran, mham"
                    className="text-lg py-3"
                  />
                  <p className="text-xs text-muted-foreground">
                    ছাত্রদের ইউজার আইডি এই নাম দিয়ে শুরু হবে (যেমন: imquran_farid66)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    মোবাইল নম্বর
                  </Label>
                  <Input
                    value={institutionData.mobile}
                    onChange={(e) =>
                      setInstitutionData({
                        ...institutionData,
                        mobile: e.target.value,
                      })
                    }
                    placeholder="০১৭xxxxxxxx"
                    className="text-lg py-3"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    ঠিকানা
                  </Label>
                  <Input
                    value={institutionData.address}
                    onChange={(e) =>
                      setInstitutionData({
                        ...institutionData,
                        address: e.target.value,
                      })
                    }
                    placeholder="পূর্ণ ঠিকানা লিখুন"
                    className="text-lg py-3"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    মুহতামিমের নাম
                  </Label>
                  <Input
                    value={institutionData.muhtamimName}
                    onChange={(e) =>
                      setInstitutionData({
                        ...institutionData,
                        muhtamimName: e.target.value,
                      })
                    }
                    placeholder="মুহতামিমের পূর্ণ নাম"
                    className="text-lg py-3"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">লোগো</Label>
                  <div className="flex items-center gap-4">
                    {institutionData.logo ? (
                      <img
                        src={institutionData.logo}
                        alt="Logo"
                        className="h-16 w-16 object-contain border rounded"
                      />
                    ) : (
                      <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document.getElementById("logo-upload").click()
                      }
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      আপলোড
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    সাইট টাইটেল (ব্রাউজার ট্যাব)
                  </Label>
                  <Input
                    value={institutionData.siteTitle}
                    onChange={(e) =>
                      setInstitutionData({
                        ...institutionData,
                        siteTitle: e.target.value,
                      })
                    }
                    placeholder="যেমন: মহাজামপুর দরবার শরীফ হাফিজিয়া মাদ্রাসা"
                    className="text-lg py-3"
                  />
                  <p className="text-xs text-gray-500">ব্রাউজার ট্যাবে এই নাম দেখাবে</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    ফেভিকন (ব্রাউজার আইকন)
                  </Label>
                  <div className="flex items-center gap-4">
                    {institutionData.faviconUrl && (
                      <div className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50">
                        <img 
                          src={institutionData.faviconUrl} 
                          alt="Favicon" 
                          className="w-8 h-8 object-contain"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                        <span className="text-sm text-green-600">আপলোড করা হয়েছে</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="cursor-pointer">
                        <div className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors ${uploadingFavicon ? 'bg-gray-100' : ''}`}>
                          {uploadingFavicon ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
                              <span className="text-gray-600">আপলোড হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-5 w-5 text-gray-500" />
                              <span className="text-gray-600">ফেভিকন আপলোড করুন</span>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".png,.ico,image/png,image/x-icon"
                          onChange={handleFaviconUpload}
                          className="hidden"
                          disabled={uploadingFavicon}
                        />
                      </label>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">ব্রাউজার ট্যাবে ছোট আইকন হিসেবে দেখাবে (PNG বা ICO ফরম্যাট, সর্বোচ্চ ৫০০KB)</p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSaveInstitution}
                  disabled={saving}
                  size="lg"
                  className="px-8"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <KeyRound className="h-5 w-5 text-orange-500" />
                পাসওয়ার্ড রিসেট
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                কোনো ব্যবহারকারী তাদের পাসওয়ার্ড ভুলে গেলে এখান থেকে রিসেট করুন।
              </p>
              <div className="space-y-3">
                <Label className="text-base font-medium">ব্যবহারকারী নির্বাচন করুন</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {users.map((user) => (
                    <div
                      key={user.id || user.user_id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{user.name || user.username}</p>
                        <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {user.role === "admin" ? "অ্যাডমিন" : user.role === "teacher" ? "শিক্ষক" : user.role === "office" ? "অফিস" : user.role}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResetPasswordModal(user)}
                        className="ml-2 shrink-0"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-gray-500 col-span-full text-center py-4">
                      কোনো ব্যবহারকারী নেই
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-blue-500" />
                শিক্ষাবর্ষ ও মারহালা
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    বর্তমান শিক্ষাবর্ষ
                  </Label>
                  <Select
                    value={academicData.currentYear || new Date().getFullYear().toString()}
                    onValueChange={(value) =>
                      setAcademicData({ ...academicData, currentYear: value })
                    }
                  >
                    <SelectTrigger className="text-lg py-3">
                      <SelectValue placeholder="শিক্ষাবর্ষ নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">২০২৪</SelectItem>
                      <SelectItem value="2025">২০২৫</SelectItem>
                      <SelectItem value="2026">২০২৬</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    মারহালা তালিকা
                  </Label>
                  <Button
                    onClick={() => setIsAddClassModalOpen(true)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    নতুন মারহালা
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {academicData.classes.map((cls) => (
                    <div
                      key={cls.id || cls.class_id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{cls.name}</p>
                        {cls.sections && cls.sections.length > 0 && (
                          <p className="text-sm text-gray-500">
                            শাখা: {cls.sections.join(", ")}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDeleteClass(cls.id || cls.class_id)
                        }
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {academicData.classes.length === 0 && (
                    <p className="text-gray-500 col-span-full text-center py-8">
                      কোনো মারহালা নেই
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSaveAcademic}
                  disabled={saving}
                  size="lg"
                  className="px-8"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-orange-500" />
                হাজিরা সেটিং
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-base font-medium">হাজিরা পদ্ধতি</Label>
                  <Select
                    value={attendanceSettings.method || "manual"}
                    onValueChange={(value) =>
                      setAttendanceSettings({
                        ...attendanceSettings,
                        method: value,
                      })
                    }
                  >
                    <SelectTrigger className="text-lg py-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">ম্যানুয়াল (হাতে)</SelectItem>
                      <SelectItem value="biometric">
                        বায়োমেট্রিক (ফিঙ্গারপ্রিন্ট)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    দেরি গণনা (মিনিট)
                  </Label>
                  <Select
                    value={(attendanceSettings.lateThreshold || 15).toString()}
                    onValueChange={(value) =>
                      setAttendanceSettings({
                        ...attendanceSettings,
                        lateThreshold: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="text-lg py-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">১০ মিনিট</SelectItem>
                      <SelectItem value="15">১৫ মিনিট</SelectItem>
                      <SelectItem value="20">২০ মিনিট</SelectItem>
                      <SelectItem value="30">৩০ মিনিট</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    হাজিরা শুরুর সময়
                  </Label>
                  <Input
                    type="time"
                    value={attendanceSettings.startTime}
                    onChange={(e) =>
                      setAttendanceSettings({
                        ...attendanceSettings,
                        startTime: e.target.value,
                      })
                    }
                    className="text-lg py-3"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">
                    হাজিরা শেষের সময়
                  </Label>
                  <Input
                    type="time"
                    value={attendanceSettings.endTime}
                    onChange={(e) =>
                      setAttendanceSettings({
                        ...attendanceSettings,
                        endTime: e.target.value,
                      })
                    }
                    className="text-lg py-3"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  size="lg"
                  className="px-8"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-purple-500" />
                ব্যবহারকারী ব্যবস্থাপনা
              </CardTitle>
              <Button onClick={() => setIsAddUserModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                নতুন ব্যবহারকারী
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id || user.user_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border gap-3"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${user.is_active !== false ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        <User className={`h-6 w-6 ${user.is_active !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-lg">
                            {user.name || user.full_name}
                          </p>
                          {user.is_active === false && (
                            <Badge variant="destructive" className="text-xs">নিষ্ক্রিয়</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {user.username || user.email}
                        </p>
                        {user.role === 'student' && user.linked_student && (
                          <p className="text-xs text-blue-500">ছাত্র: {user.linked_student}</p>
                        )}
                        {user.role === 'teacher' && user.linked_staff && (
                          <p className="text-xs text-purple-500">শিক্ষক: {user.linked_staff}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedUserForReset(user);
                          setIsResetPasswordModalOpen(true);
                        }}
                        title="পাসওয়ার্ড রিসেট"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={user.is_active !== false ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleToggleUserActive(user)}
                        title={user.is_active !== false ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                      >
                        {user.is_active !== false ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    কোনো ব্যবহারকারী নেই
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-indigo-500" />
                সাবস্ক্রিপশন তথ্য
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        প্ল্যান
                      </p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {subscription.plan_name ||
                          subscription.plan ||
                          "Basic Plan"}
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        স্ট্যাটাস
                      </p>
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-blue-600" />
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {subscription.status === "active"
                            ? "সক্রিয়"
                            : subscription.status}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        শুরু হয়েছে
                      </p>
                      <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        {formatDate(
                          subscription.start_date || subscription.started_at,
                        )}
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        মেয়াদ শেষ
                      </p>
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        {formatDate(
                          subscription.end_date || subscription.expires_at,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <p className="text-sm text-gray-500">
                      সাবস্ক্রিপশন সংক্রান্ত যেকোনো সমস্যায় যোগাযোগ করুন:
                      info@maxtechbd.com
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    সাবস্ক্রিপশন তথ্য পাওয়া যায়নি
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddClassModalOpen} onOpenChange={setIsAddClassModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-emerald-500" />
              নতুন মারহালা যোগ করুন
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>মারহালার নাম</Label>
              <Input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="যেমন: নূরানি, কিতাব, হিফজ"
                className="text-lg py-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddClassModalOpen(false)}
            >
              বাতিল
            </Button>
            <Button onClick={handleAddClass}>
              <Plus className="h-4 w-4 mr-2" />
              যোগ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              নতুন ব্যবহারকারী যোগ করুন
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>নাম</Label>
              <Input
                value={newUserData.name}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, name: e.target.value })
                }
                placeholder="পূর্ণ নাম"
                className="text-lg py-3"
              />
            </div>
            <div className="space-y-2">
              <Label>ইউজারনেম</Label>
              <Input
                value={newUserData.username}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, username: e.target.value })
                }
                placeholder="লগইন আইডি"
                className="text-lg py-3"
              />
            </div>
            <div className="space-y-2">
              <Label>পাসওয়ার্ড</Label>
              <Input
                type="password"
                value={newUserData.password}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, password: e.target.value })
                }
                placeholder="পাসওয়ার্ড"
                className="text-lg py-3"
              />
            </div>
            <div className="space-y-2">
              <Label>ভূমিকা</Label>
              <Select
                value={newUserData.role || "teacher"}
                onValueChange={(value) =>
                  setNewUserData({ ...newUserData, role: value })
                }
              >
                <SelectTrigger className="text-lg py-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">মুহতামিম (Admin)</SelectItem>
                  <SelectItem value="office">অফিস (Office)</SelectItem>
                  <SelectItem value="teacher">উস্তাদ (Teacher)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddUserModalOpen(false)}
            >
              বাতিল
            </Button>
            <Button onClick={handleAddUser}>
              <Plus className="h-4 w-4 mr-2" />
              যোগ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetPasswordModalOpen} onOpenChange={setIsResetPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-orange-500" />
              পাসওয়ার্ড রিসেট করুন
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">ব্যবহারকারী:</p>
              <p className="font-medium">{selectedUserForReset?.name || selectedUserForReset?.username}</p>
              <p className="text-xs text-gray-500">@{selectedUserForReset?.username}</p>
            </div>
            <div className="space-y-2">
              <Label>নতুন পাসওয়ার্ড</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ড লিখুন (কমপক্ষে ৬ অক্ষর)"
                  className="text-lg py-3 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>পাসওয়ার্ড নিশ্চিত করুন</Label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="পাসওয়ার্ড আবার লিখুন"
                className="text-lg py-3"
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-red-500">পাসওয়ার্ড মিলছে না</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsResetPasswordModalOpen(false);
                setSelectedUserForReset(null);
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              বাতিল
            </Button>
            <Button 
              onClick={handleResetPassword}
              disabled={resettingPassword || !newPassword || newPassword !== confirmPassword}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              {resettingPassword ? "রিসেট হচ্ছে..." : "পাসওয়ার্ড রিসেট করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MadrasahSimpleSettings;
