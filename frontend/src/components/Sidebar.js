import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";
import { useInstitution } from "../context/InstitutionContext";
import i18n from "../i18n";
import {
  Home,
  Users,
  User,
  UserCheck,
  BookOpen,
  GraduationCap,
  DollarSign,
  Calculator,
  Award,
  Car,
  BarChart3,
  Fingerprint,
  UserPlus,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  ClipboardCheck,
  ClipboardList,
  Sparkles,
  Target,
  FileText,
  Bell,
  Star,
  MessageSquare,
  Calendar,
  Clock,
  FileSpreadsheet,
  Video,
  Heart,
  Globe,
  Link,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { ScrollArea } from "./ui/scroll-area";

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isMadrasahSimpleUI, loading: institutionLoading } = useInstitution();
  const [openMenus, setOpenMenus] = useState({});
  const [, forceUpdate] = useState(0);
  const [allowedModules, setAllowedModules] = useState(null);
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [schoolBranding, setSchoolBranding] = useState({
    school_name: "School ERP",
    logo_url: null,
    primary_color: "#10B981",
  });

  useEffect(() => {
    const handleLanguageChange = () => forceUpdate((n) => n + 1);
    i18n.on("languageChanged", handleLanguageChange);
    return () => i18n.off("languageChanged", handleLanguageChange);
  }, []);

  useEffect(() => {
    const fetchSchoolBranding = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const [brandingRes, institutionRes] = await Promise.all([
          fetch("/api/school-branding", {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
          fetch("/api/institution", {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
        ]);

        let schoolName = "School ERP";
        let logoUrl = null;
        let primaryColor = "#10B981";

        if (brandingRes?.ok) {
          const brandingData = await brandingRes.json();
          schoolName =
            brandingData.school_name || brandingData.site_title || schoolName;
          logoUrl = brandingData.logo_url || logoUrl;
          primaryColor = brandingData.primary_color || primaryColor;
        }

        if (institutionRes?.ok) {
          const institutionData = await institutionRes.json();
          if (institutionData.school_name || institutionData.name) {
            schoolName =
              institutionData.school_name || institutionData.name || schoolName;
          }
          if (institutionData.logo_url || institutionData.logo) {
            logoUrl =
              institutionData.logo_url || institutionData.logo || logoUrl;
          }
        }

        setSchoolBranding({
          school_name: schoolName,
          logo_url: logoUrl,
          primary_color: primaryColor,
        });
      } catch (error) {
        console.error("Error fetching branding:", error);
      }
    };
    fetchSchoolBranding();
  }, [user]);

  useEffect(() => {
    const fetchAllowedModules = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setModulesLoaded(true);
          return;
        }

        const response = await fetch("/api/tenant/allowed-modules", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setAllowedModules(data.allowed_modules || []);
        }
      } catch (error) {
        console.error("Error fetching allowed modules:", error);
      } finally {
        setModulesLoaded(true);
      }
    };

    fetchAllowedModules();
  }, [user, location.pathname]);

  const t = (key) => i18n.t(key);

  const toggleMenu = (menuKey) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  const menuItems = [
    {
      key: "home",
      title: "Dashboard",
      madrasahTitle: "ড্যাশবোর্ড",
      icon: Home,
      path: "/dashboard",
      roles: ["super_admin", "admin", "teacher", "parent"],
    },
    {
      key: "student_portal",
      title: "My Portal",
      madrasahTitle: "আমার পোর্টাল",
      icon: User,
      roles: ["student"],
      subItems: [
        {
          title: "Dashboard",
          madrasahTitle: "ড্যাশবোর্ড",
          path: "/student/dashboard",
          roles: ["student"],
        },
        {
          title: "My Profile",
          madrasahTitle: "আমার প্রোফাইল",
          path: "/student/profile",
          roles: ["student"],
        },
        {
          title: "My Fees",
          madrasahTitle: "আমার ফি",
          path: "/student/fees",
          roles: ["student"],
        },
        {
          title: "Admit Card",
          madrasahTitle: "প্রবেশপত্র",
          path: "/student/admit-card",
          roles: ["student"],
        },
        {
          title: "My Results",
          madrasahTitle: "আমার ফলাফল",
          path: "/student-results",
          roles: ["student"],
        },
        {
          title: "My Attendance",
          madrasahTitle: "আমার হাজিরা",
          path: "/student/attendance",
          roles: ["student"],
        },
        {
          title: "Calendar",
          madrasahTitle: "ক্যালেন্ডার",
          path: "/calendar",
          roles: ["student"],
        },
        {
          title: "Live Classes",
          madrasahTitle: "লাইভ ক্লাস",
          path: "/student/live-classes",
          roles: ["student"],
        },
        {
          title: "Homework",
          madrasahTitle: "হোমওয়ার্ক",
          path: "/student/homework",
          roles: ["student"],
        },
        {
          title: "Video Lessons",
          madrasahTitle: "ভিডিও পাঠ",
          path: "/student/video-lessons",
          roles: ["student"],
        },
        {
          title: "Contact Us",
          madrasahTitle: "যোগাযোগ",
          path: "/student/contact",
          roles: ["student"],
        },
      ],
    },
    {
      key: "teacher-portal",
      title: "My Work",
      madrasahTitle: "আমার কাজ",
      icon: ClipboardList,
      roles: ["teacher", "admin", "super_admin"],
      subItems: [
        {
          title: "My Dashboard",
          madrasahTitle: "আমার ড্যাশবোর্ড",
          path: "/teacher/dashboard",
          roles: ["teacher"],
        },
        {
          title: "Homework",
          madrasahTitle: "হোমওয়ার্ক",
          path: "/homework",
          roles: ["teacher", "admin", "super_admin"],
        },
        {
          title: "Live Classes",
          madrasahTitle: "লাইভ ক্লাস",
          path: "/live-classes",
          roles: ["teacher", "admin", "super_admin"],
        },
        {
          title: "Lesson Plans",
          madrasahTitle: "পাঠ পরিকল্পনা",
          path: "/lesson-plans",
          roles: ["teacher"],
        },
      ],
    },
    {
      key: "academic",
      title: "Academic",
      madrasahTitle: "একাডেমিক",
      icon: GraduationCap,
      roles: ["super_admin", "admin", "teacher", "parent", "principal"],
      subItems: [
        {
          title: "Results",
          madrasahTitle: "ফলাফল",
          path: "/results",
          roles: ["super_admin", "admin", "principal", "teacher", "parent"],
          hideInMadrasah: true,
        },
        {
          title: "TimeTable",
          madrasahTitle: "টাইমটেবিল",
          path: "/settings/timetable",
          roles: ["super_admin", "admin", "teacher"],
          hideInMadrasah: true,
        },
        {
          title: "সহজ ফলাফল",
          path: "/madrasah/simple-result",
          roles: ["super_admin", "admin", "principal", "teacher"],
          madrasahOnly: true,
        },
        {
          title: "সহজ রুটিন",
          path: "/madrasah/simple-routine",
          roles: ["super_admin", "admin", "principal", "teacher"],
          madrasahOnly: true,
        },
        {
          title: "Calendar",
          madrasahTitle: "ক্যালেন্ডার",
          path: "/calendar",
          roles: ["super_admin", "admin", "teacher"],
        },
        {
          title: "Classes",
          madrasahTitle: "মারহালা / শ্রেণি",
          path: "/classes",
          roles: ["super_admin", "admin", "teacher"],
        },
        {
          title: "Video Lessons",
          madrasahTitle: "ভিডিও পাঠ",
          path: "/video-lessons",
          roles: ["super_admin", "admin"],
        },
      ],
    },
    {
      key: "students",
      title: "Students",
      madrasahTitle: "ছাত্র",
      icon: Users,
      roles: ["super_admin", "admin", "teacher"],
      subItems: [
        {
          title: "Student List",
          madrasahTitle: "ছাত্র তালিকা",
          path: "/students",
          roles: ["super_admin", "admin", "teacher"],
        },
        {
          title: "Student Attendance",
          madrasahTitle: "ছাত্র হাজিরা",
          path: "/students/attendance",
          roles: ["super_admin", "admin", "teacher"],
        },
        {
          title: "Student ID Cards",
          madrasahTitle: "ছাত্র আইডি কার্ড",
          path: "/students/id-cards",
          roles: ["super_admin", "admin", "teacher"],
        },
        {
          title: "Admission Summary",
          madrasahTitle: "ভর্তি সারাংশ",
          path: "/admission-summary",
          roles: ["super_admin", "admin"],
        },
      ],
    },
    {
      key: "staff",
      title: "Staff",
      madrasahTitle: "শিক্ষক / স্টাফ",
      icon: UserCheck,
      roles: ["super_admin", "admin", "teacher"],
      subItems: [
        {
          title: "Staff List",
          madrasahTitle: "শিক্ষক তালিকা",
          path: "/staff",
          roles: ["super_admin", "admin", "teacher"],
        },
        {
          title: "Staff Attendance",
          madrasahTitle: "শিক্ষক হাজিরা",
          path: "/attendance",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Staff ID Cards",
          madrasahTitle: "শিক্ষক আইডি কার্ড",
          path: "/staff/id-cards",
          roles: ["super_admin", "admin"],
        },
      ],
    },
    {
      key: "finance",
      title: "Finance",
      madrasahTitle: "আর্থিক",
      icon: DollarSign,
      roles: ["super_admin", "admin"],
      subItems: [
        {
          title: "Fee Setup",
          madrasahTitle: "ফি সেটআপ",
          path: "/fee-setup",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Fee Collection",
          madrasahTitle: "ফি আদায়",
          path: "/fees/collection",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Admission Fees",
          madrasahTitle: "ভর্তি ফি",
          path: "/admission-fees",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Committee/Donation",
          madrasahTitle: "কমিটি / দান",
          path: "/committee-donation",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Donations",
          madrasahTitle: "ডোনেশন",
          path: "/donations",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Fee Structure",
          madrasahTitle: "ফি কাঠামো",
          path: "/fees/structure",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Fee Types",
          madrasahTitle: "ফি প্রকার",
          path: "/fee-types",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Monthly Payments",
          madrasahTitle: "মাসিক পেমেন্ট",
          path: "/monthly-payments",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Fee Reports",
          madrasahTitle: "ফি রিপোর্ট",
          path: "/fees/reports",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Accounts",
          madrasahTitle: "হিসাব",
          path: "/accounts",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Payroll",
          madrasahTitle: "বেতন",
          path: "/payroll",
          roles: ["super_admin", "admin", "accountant"],
        },
        {
          title: "Certificates",
          madrasahTitle: "সনদ",
          path: "/certificates",
          roles: ["super_admin", "admin"],
        },
      ],
    },
    {
      key: "content",
      title: "Content",
      madrasahTitle: "কন্টেন্ট",
      icon: BookOpen,
      roles: ["super_admin", "admin", "teacher"],
      subItems: [
        {
          title: "Academic CMS",
          madrasahTitle: "একাডেমিক সিএমএস",
          path: "/cms",
          roles: ["super_admin", "admin"],
        },
        {
          title: "View Content",
          madrasahTitle: "কন্টেন্ট দেখুন",
          path: "/cms/view",
          roles: ["teacher"],
        },
      ],
    },
    {
      key: "ai-tools",
      title: "AI Tools",
      madrasahTitle: "এআই টুলস",
      icon: Sparkles,
      roles: ["super_admin", "admin", "teacher", "student"],
      subItems: [
        {
          title: "AI Assistant",
          madrasahTitle: "এআই সহকারী",
          path: "/ai-assistant",
          roles: ["super_admin", "admin", "teacher", "student"],
        },
        {
          title: "Quiz Tool",
          madrasahTitle: "কুইজ টুল",
          path: "/quiz-tool",
          roles: ["super_admin", "admin", "teacher", "student"],
        },
        {
          title: "Test Generator",
          madrasahTitle: "পরীক্ষা তৈরি",
          path: "/test-generator",
          roles: ["super_admin", "admin", "teacher"],
        },
        {
          title: "প্রশ্নপত্র তৈরি",
          path: "/question-paper-builder",
          roles: ["super_admin", "admin", "teacher"],
        },
        {
          title: "AI Summary",
          madrasahTitle: "এআই সারাংশ",
          path: "/ai-summary",
          roles: ["super_admin", "admin", "teacher", "student"],
        },
        {
          title: "AI Notes",
          madrasahTitle: "এআই নোটস",
          path: "/ai-notes",
          roles: ["super_admin", "admin", "teacher", "student"],
        },
        {
          title: "AI Activity Logs",
          madrasahTitle: "এআই লগ",
          path: "/ai-assistant/logs",
          roles: ["super_admin", "admin"],
        },
      ],
    },
    {
      key: "reports",
      title: "Reports",
      madrasahTitle: "রিপোর্ট",
      icon: BarChart3,
      roles: ["super_admin", "admin"],
      subItems: [
        {
          title: "Financial Summary",
          madrasahTitle: "আর্থিক সারাংশ",
          path: "/reports/financial-summary",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Admission Fee Report",
          madrasahTitle: "ভর্তি ফি রিপোর্ট",
          path: "/reports/admission-fees",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Monthly Fee Report",
          madrasahTitle: "মাসিক ফি রিপোর্ট",
          path: "/reports/monthly-fees",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Donation Report",
          madrasahTitle: "ডোনেশন / কমিটি রিপোর্ট",
          path: "/reports/donations",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Date-wise Report",
          madrasahTitle: "তারিখভিত্তিক রিপোর্ট",
          path: "/reports/date-wise",
          roles: ["super_admin", "admin"],
        },
      ],
    },
    {
      key: "communication",
      title: "Communication",
      madrasahTitle: "যোগাযোগ",
      icon: MessageSquare,
      roles: ["super_admin", "admin", "teacher", "student"],
      subItems: [
        {
          title: "Notifications",
          madrasahTitle: "নোটিফিকেশন",
          path: "/notifications",
          roles: ["super_admin", "admin", "teacher", "student"],
        },
        {
          title: "Rating & Reviews",
          madrasahTitle: "রেটিং ও রিভিউ",
          path: "/rating-surveys",
          roles: ["super_admin", "admin"],
        },
      ],
    },
    {
      key: "settings",
      title: "Settings",
      madrasahTitle: "সেটিংস",
      icon: Settings,
      roles: ["super_admin", "admin"],
      subItems: [
        {
          title: "Simple Settings",
          madrasahTitle: "সহজ সেটিংস",
          path: "/madrasah/simple-settings",
          roles: ["super_admin", "admin"],
          madrasahOnly: true,
        },
        {
          title: "User Management",
          madrasahTitle: "ব্যবহারকারী ব্যবস্থাপনা",
          path: "/admin/user-management",
          roles: ["super_admin", "admin"],
        },
        {
          title: "Contact Links",
          madrasahTitle: "যোগাযোগ লিংক",
          path: "/contact-links",
          roles: ["super_admin", "admin"],
        },
        {
          title: "School Settings",
          path: "/settings",
          roles: ["super_admin", "admin"],
          hideInMadrasah: true,
        },
        {
          title: "Tenant Management",
          path: "/tenant-management",
          roles: ["super_admin"],
        },
        {
          title: "Subscriptions",
          path: "/subscription-management",
          roles: ["super_admin"],
        },
        {
          title: "My Subscription",
          madrasahTitle: "সাবস্ক্রিপশন",
          path: "/subscription-history",
          roles: ["admin"],
          hideInMadrasah: true,
        },
        {
          title: "System Settings",
          path: "/system-settings",
          roles: ["super_admin"],
        },
        {
          title: "School Branding",
          madrasahTitle: "ব্র্যান্ডিং",
          path: "/school-branding",
          roles: ["super_admin", "admin"],
          hideInMadrasah: true,
        },
        {
          title: "Vehicle/Transport",
          path: "/transport/routes",
          roles: ["super_admin", "admin"],
          hideInMadrasah: true,
        },
        {
          title: "Biometric Devices",
          path: "/biometric",
          roles: ["super_admin", "admin"],
          hideInMadrasah: true,
        },
        {
          title: "Online Admission",
          path: "/online-admission",
          roles: ["super_admin", "admin"],
          hideInMadrasah: true,
        },
        {
          title: "HSS Module",
          path: "/hss/students",
          roles: ["super_admin", "admin"],
          hideInMadrasah: true,
        },
      ],
    },
  ];

  // Module key mapping: sidebar keys to backend module names (match exact backend format)
  const moduleKeyMapping = {
    home: ["home", "dashboard"],
    student_portal: ["student_portal"], // Always allowed for students via role check
    academic: [
      "attendance",
      "results",
      "timetable",
      "calendar",
      "class",
      "classes",
    ],
    students: ["students", "admission-summary", "admission_summary"],
    staff: ["staff"],
    finance: ["fees", "accounts", "certificates", "payroll"],
    content: ["cms", "academic_cms", "academic-cms"],
    "ai-tools": [
      "cms",
      "academic_cms",
      "ai-assistant",
      "ai_assistant",
      "quiz-tool",
      "quiz_tool",
      "test-generator",
      "test_generator",
      "ai-summary",
      "ai_summary",
      "ai-notes",
      "ai_notes",
    ],
    reports: ["reports"],
    certificates: ["certificates"],
    communication: ["communication", "notifications"],
    settings: [
      "settings",
      "vehicle",
      "vehicle_transport",
      "biometric",
      "biometric_devices",
      "online-admission",
      "online_admission",
      "hss-module",
      "hss_module",
      "tenant_management",
    ],
  };

  // Keys that bypass module restrictions (shown based on role only)
  const bypassModuleRestrictions = ["student_portal", "home", "teacher-portal"];

  // Sub-item module mapping: maps each sub-item path to its required module(s)
  const subItemModuleMapping = {
    "/ai-assistant": ["ai-assistant", "ai_assistant"],
    "/quiz-tool": ["quiz-tool", "quiz_tool"],
    "/test-generator": ["test-generator", "test_generator"],
    "/ai-summary": ["ai-summary", "ai_summary"],
    "/ai-notes": ["ai-notes", "ai_notes"],
    "/ai-assistant/logs": ["ai-assistant", "ai_assistant"],
    "/cms": ["cms", "academic_cms", "academic-cms"],
    "/cms/view": ["cms", "academic_cms", "academic-cms"],
    "/biometric": ["biometric", "biometric_devices", "biometric-devices"],
    "/online-admission": ["online-admission", "online_admission"],
    "/hss/students": ["hss-module", "hss_module"],
    "/transport/routes": ["vehicle", "vehicle_transport", "vehicle-transport"],
    "/certificates": ["certificates"],
    "/students/attendance": [
      "student-attendance",
      "student_attendance",
      "attendance",
    ],
    "/attendance": ["staff-attendance", "staff_attendance", "attendance"],
  };

  // Helper to check if a sub-item should be visible based on allowed modules
  const isSubItemAllowed = (subItemPath) => {
    // Super admin sees all
    if (user?.role === "super_admin") return true;
    // No restrictions set - show all
    if (!allowedModules || allowedModules.length === 0) return true;
    // Check if this sub-item has module restrictions
    const requiredModules = subItemModuleMapping[subItemPath];
    if (!requiredModules) return true; // No mapping = always show
    return requiredModules.some((mod) => allowedModules.includes(mod));
  };

  // Don't show any menu items until modules are loaded (except for super_admin who sees all)
  const filteredMenuItems = menuItems.filter((item) => {
    const hasRole = item.roles.includes(user?.role);

    // Super admin always sees all modules they have role access to
    if (user?.role === "super_admin") {
      return hasRole;
    }

    // Items that bypass module restrictions (like student_portal) - show based on role only
    if (bypassModuleRestrictions.includes(item.key)) {
      return hasRole;
    }

    // For other users, don't show anything until modules are loaded
    if (!modulesLoaded) {
      return false;
    }

    // If no module restrictions set (empty array or null), show all role-allowed items
    if (!allowedModules || allowedModules.length === 0) {
      return hasRole;
    }

    // Check if any of the mapped modules for this menu item are allowed
    const mappedModules = moduleKeyMapping[item.key] || [item.key];
    const hasAllowedModule = mappedModules.some((mod) =>
      allowedModules.includes(mod),
    );

    return hasRole && hasAllowedModule;
  });

  // Flag to show loading state for non-super_admin users
  const isLoadingModules = user?.role !== "super_admin" && !modulesLoaded;

  const isActiveMenu = (item) => {
    if (item.path) {
      return location.pathname === item.path;
    }
    if (item.subItems) {
      return item.subItems.some(
        (subItem) => location.pathname === subItem.path,
      );
    }
    return false;
  };

  const handleNavigation = (path) => {
    if (path) {
      navigate(path);
      setIsOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    setIsOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header - Dynamic School Branding */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          {schoolBranding.logo_url ? (
            <img
              src={schoolBranding.logo_url}
              alt={schoolBranding.school_name}
              className="h-10 w-10 object-contain rounded-lg bg-white p-1"
            />
          ) : (
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: schoolBranding.primary_color }}
            >
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg truncate">
              {schoolBranding.school_name}
            </h1>
            <p className="text-gray-300 text-xs truncate">{user?.full_name}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4">
        <nav className="py-4 space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveMenu(item);
            const isOpen = openMenus[item.key];

            if (item.subItems) {
              return (
                <Collapsible
                  key={item.key}
                  open={isOpen}
                  onOpenChange={() => toggleMenu(item.key)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all hover:bg-white/10 ${
                        isActive
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "text-gray-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">
                          {isMadrasahSimpleUI && item.madrasahTitle
                            ? item.madrasahTitle
                            : item.title}
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-2 ml-8">
                    {item.subItems
                      .filter(
                        (subItem) =>
                          (!subItem.roles ||
                            subItem.roles.includes(user?.role)) &&
                          isSubItemAllowed(subItem.path) &&
                          !(
                            isMadrasahSimpleUI &&
                            [
                              "/fees/structure",
                              "/fees/reports",
                              "/accounts",
                              "/results",
                              "/settings/timetable",
                            ].includes(subItem.path)
                          ) &&
                          (subItem.madrasahOnly ? isMadrasahSimpleUI : true) &&
                          !(isMadrasahSimpleUI && subItem.hideInMadrasah),
                      )
                      .map((subItem, index) => (
                        <button
                          key={index}
                          onClick={() => handleNavigation(subItem.path)}
                          className={`w-full text-left p-2 rounded-md text-sm transition-all hover:bg-white/10 ${
                            location.pathname === subItem.path
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          {isMadrasahSimpleUI && subItem.madrasahTitle
                            ? subItem.madrasahTitle
                            : subItem.title}
                        </button>
                      ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            return (
              <button
                key={item.key}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all hover:bg-white/10 ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">
                  {isMadrasahSimpleUI && item.madrasahTitle
                    ? item.madrasahTitle
                    : item.title}
                </span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/10"
        >
          <LogOut className="h-5 w-5 mr-3" />
          {t("common.logout")}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40 overflow-y-auto">
        <div className="glass-sidebar min-h-full">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative flex w-64 h-full glass-sidebar overflow-y-auto">
            <div className="flex flex-col w-full min-h-full">
              {/* Close button only - no duplicate header */}
              <div className="absolute top-4 right-4 z-10">
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <SidebarContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
