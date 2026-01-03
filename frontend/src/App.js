import React, { useState, useEffect, createContext, useContext, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import axios from "axios";
import "./App.css";

// Import contexts
import { CurrencyProvider } from "./context/CurrencyContext";
import { InstitutionProvider } from "./context/InstitutionContext";
import { LoadingProvider } from "./context/LoadingContext";

// Core components (loaded immediately)
import LoginPage from "./components/LoginPage";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import GlobalLoader from "./components/GlobalLoader";
import { Toaster } from "./components/ui/sonner";
import { useInstitution } from "./context/InstitutionContext";

// Lazy loaded components for better performance
const Dashboard = lazy(() => import("./components/Dashboard"));
const MadrasahDashboard = lazy(() => import("./components/MadrasahDashboard"));
const StudentList = lazy(() => import("./components/StudentList"));
const StaffList = lazy(() => import("./components/StaffList"));
const ClassManagement = lazy(() => import("./components/ClassManagement"));
const AdmissionSummary = lazy(() => import("./components/AdmissionSummary"));
const HSS = lazy(() => import("./components/HSS"));
const Fees = lazy(() => import("./components/Fees"));
const Accounts = lazy(() => import("./components/Accounts"));
const Certificates = lazy(() => import("./components/Certificates"));
const Vehicle = lazy(() => import("./components/Vehicle"));
const Reports = lazy(() => import("./components/Reports"));
const Payroll = lazy(() => import("./components/Payroll"));
const BiometricDevices = lazy(() => import("./components/BiometricDevices"));
const OnlineAdmission = lazy(() => import("./components/OnlineAdmission"));
const Attendance = lazy(() => import("./components/Attendance"));
const StudentAttendance = lazy(() => import("./components/StudentAttendance"));
const Calendar = lazy(() => import("./components/Calendar"));
const Settings = lazy(() => import("./components/Settings"));
const AIAssistant = lazy(() => import("./components/AIAssistant"));
const AILogs = lazy(() => import("./components/AILogs"));
const AcademicCMS = lazy(() => import("./components/AcademicCMS"));
const QuizTool = lazy(() => import("./components/QuizTool"));
const TestGenerator = lazy(() => import("./components/TestGenerator"));
const QuestionPaperBuilder = lazy(() => import("./components/QuestionPaperBuilder"));
const SchoolBranding = lazy(() => import("./components/SchoolBranding"));
const AISummary = lazy(() => import("./components/AISummary"));
const AINotes = lazy(() => import("./components/AINotes"));
const Notifications = lazy(() => import("./components/Notifications"));
const RatingSurveys = lazy(() => import("./components/RatingSurveys"));
const Results = lazy(() => import("./components/Results"));
const StudentResults = lazy(() => import("./components/StudentResults"));
const ParentResults = lazy(() => import("./components/ParentResults"));
const MadrasahSimpleResult = lazy(() => import("./components/MadrasahSimpleResult"));
const MadrasahSimpleRoutine = lazy(() => import("./components/MadrasahSimpleRoutine"));
const MadrasahReportPage = lazy(() => import("./components/MadrasahReportPage"));
const MadrasahSimpleSettings = lazy(() => import("./components/MadrasahSimpleSettings"));
const ResultConfiguration = lazy(() => import("./components/ResultConfiguration"));
const TenantManagement = lazy(() => import("./components/TenantManagement"));
const SubscriptionManagement = lazy(() => import("./components/SubscriptionManagement"));
const SubscriptionHistory = lazy(() => import("./components/SubscriptionHistory"));
const SystemSettings = lazy(() => import("./components/SystemSettings"));
const StudentDashboard = lazy(() => import("./components/StudentDashboard"));
const StudentProfile = lazy(() => import("./components/StudentProfile"));
const StudentFees = lazy(() => import("./components/StudentFees"));
const StudentAdmitCard = lazy(() => import("./components/StudentAdmitCard"));
const StudentAttendanceView = lazy(() => import("./components/StudentAttendanceView"));
const StudentLiveClasses = lazy(() => import("./components/StudentLiveClasses"));
const StudentHomework = lazy(() => import("./components/StudentHomework"));
const StudentContactLinks = lazy(() => import("./components/StudentContactLinks"));
const StudentIDCard = lazy(() => import("./components/StudentIDCard"));
const StaffIDCard = lazy(() => import("./components/StaffIDCard"));
const TeacherDashboard = lazy(() => import("./components/TeacherDashboard"));
const Homework = lazy(() => import("./components/Homework"));
const LessonPlans = lazy(() => import("./components/LessonPlans"));
const Search = lazy(() => import("./components/Search"));
const AdmissionFees = lazy(() => import("./components/AdmissionFees"));
const CommitteeDonation = lazy(() => import("./components/CommitteeDonation"));
const FinancialSummary = lazy(() => import("./components/reports/FinancialSummary"));
const AdmissionFeeReport = lazy(() => import("./components/reports/AdmissionFeeReport"));
const MonthlyFeeReport = lazy(() => import("./components/reports/MonthlyFeeReport"));
const DonationReport = lazy(() => import("./components/reports/DonationReport"));
const DateWiseReport = lazy(() => import("./components/reports/DateWiseReport"));
const LiveClassManagement = lazy(() => import("./components/LiveClassManagement"));
const FeeTypeManagement = lazy(() => import("./components/FeeTypeManagement"));
const DonationManagement = lazy(() => import("./components/DonationManagement"));
const ContactLinksManagement = lazy(() => import("./components/ContactLinksManagement"));
const MonthlyPayments = lazy(() => import("./components/MonthlyPayments"));

// Loading spinner for lazy components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
  </div>
);

const API = process.env.REACT_APP_API_URL || "/api";
console.log("API URL - ", API);

// Dynamic Title and Favicon Hook
const useDynamicBranding = () => {
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const token = localStorage.getItem("token");
        let response;
        
        if (token) {
          response = await axios.get(`${API}/institution`, {
            headers: { Authorization: `Bearer ${token}`, skipLoader: 'true' }
          });
        } else {
          response = await axios.get(`${API}/institution/public/mham5678`, {
            headers: { skipLoader: 'true' }
          });
        }
        
        if (response.data) {
          if (response.data.site_title) {
            document.title = response.data.site_title;
          }
          if (response.data.favicon_url) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = response.data.favicon_url;
          }
        }
      } catch (error) {
        console.log("Could not load branding settings");
      }
    };
    
    fetchBranding();
  }, []);
};

// Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  console.log("🔐 AuthProvider render:", { hasToken: !!token, hasUser: !!user, loading });

  useEffect(() => {
    console.log("🔐 AuthProvider useEffect triggered, token:", token ? "EXISTS" : "MISSING");
    
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      console.log("🔐 No token, setting loading to false");
      setLoading(false);
    }

    // Setup axios interceptor for 401 responses
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        console.log("🔐 Axios interceptor caught error:", error.response?.status, error.config?.url);
        if (error.response?.status === 401) {
          // Clear auth state and redirect to login
          console.log("❌ 401 error detected - clearing auth and redirecting");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setToken(null);
          setUser(null);
          delete axios.defaults.headers.common["Authorization"];
          window.location.href = "/login";
        }
        return Promise.reject(error);
      },
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      // Only logout on 401 (unauthorized), not on other errors
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password, tenantId = null) => {
    console.log("🔄 Login function called with:", {
      username,
      password: "***",
      tenantId,
    });
    try {
      console.log("🔄 Making API request to:", `${API}/auth/login`);
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password,
        tenant_id: tenantId,
      });

      console.log("✅ Login API response:", response.data);
      const { access_token, user: userData } = response.data;

      localStorage.setItem("token", access_token);
      window.dispatchEvent(new Event("userLoggedIn"));
      localStorage.setItem("user", JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);

      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

      return { success: true };
    } catch (error) {
      console.error("❌ Login API failed:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Login failed",
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || "Registration failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log("🔒 ProtectedRoute check:", {
    loading,
    hasUser: !!user,
    userRole: user?.role,
    path: location.pathname,
    hasToken: !!localStorage.getItem("token")
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    console.log("❌ ProtectedRoute: No user, redirecting to login. Token in localStorage:", localStorage.getItem("token") ? "EXISTS" : "MISSING");
  }

  return user ? children : <Navigate to="/login" replace />;
};

// Results Router - routes to appropriate results page based on user role
const ResultsRouter = () => {
  const { user } = useAuth();

  if (user?.role === "student") {
    return <StudentResults />;
  } else if (user?.role === "parent") {
    return <ParentResults />;
  } else {
    // For admin, principal, teacher roles - show main Results management
    return <Results />;
  }
};

// Main Layout Component
const Layout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const mainRef = React.useRef(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const isLoginPage = location.pathname === "/login";

  // Smooth scroll to top on route change
  React.useEffect(() => {
    if (mainRef.current && !isLoginPage) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        if (mainRef.current) {
          mainRef.current.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
          });
        }
      });
    }
  }, [location.pathname, isLoginPage]);

  if (isLoginPage) {
    return children;
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar
        isOpen={isMobileSidebarOpen}
        setIsOpen={setIsMobileSidebarOpen}
      />
      <div className="flex flex-col flex-1 min-w-0 w-full md:pl-64">
        <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8"
        >
          <div className="pb-6 max-w-full overflow-x-hidden">
            {children}
          </div>
          <footer className="py-3 text-center border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 mt-auto">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Developed By <a href="https://maxtechbd.com" target="_blank" rel="noopener noreferrer" className="text-red-600 font-bold hover:underline">Maxtechbd.com</a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
};

const DashboardWrapper = () => {
  const { isMadrasahSimpleUI } = useInstitution();
  return isMadrasahSimpleUI ? <MadrasahDashboard /> : <Dashboard />;
};

const BrandingLoader = () => {
  useDynamicBranding();
  return null;
};

function App() {
  return (
    <LoadingProvider>
    <CurrencyProvider>
      <AuthProvider>
      <InstitutionProvider>
        <Router>
          <BrandingLoader />
          <GlobalLoader />
          <div className="App">
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardWrapper />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardWrapper />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/search"
                  element={
                    <ProtectedRoute>
                      <Search />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admission-summary"
                  element={
                    <ProtectedRoute>
                      <AdmissionSummary />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/students/attendance/*"
                  element={
                    <ProtectedRoute>
                      <StudentAttendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/students/id-cards"
                  element={
                    <ProtectedRoute>
                      <StudentIDCard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/students/*"
                  element={
                    <ProtectedRoute>
                      <StudentList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/staff/id-cards"
                  element={
                    <ProtectedRoute>
                      <StaffIDCard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/staff/*"
                  element={
                    <ProtectedRoute>
                      <StaffList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/classes"
                  element={
                    <ProtectedRoute>
                      <ClassManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/attendance/*"
                  element={
                    <ProtectedRoute>
                      <Attendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/results"
                  element={
                    <ProtectedRoute>
                      <ResultsRouter />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/result-configuration"
                  element={
                    <ProtectedRoute>
                      <ResultConfiguration />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/madrasah/simple-result"
                  element={
                    <ProtectedRoute>
                      <MadrasahSimpleResult />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/madrasah/simple-routine"
                  element={
                    <ProtectedRoute>
                      <MadrasahSimpleRoutine />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/madrasah/simple-settings"
                  element={
                    <ProtectedRoute>
                      <MadrasahSimpleSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/madrasah/reports"
                  element={
                    <ProtectedRoute>
                      <MadrasahReportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <ProtectedRoute>
                      <Calendar />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rating-surveys"
                  element={
                    <ProtectedRoute>
                      <RatingSurveys />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/hss/*"
                  element={
                    <ProtectedRoute>
                      <HSS />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/fees/*"
                  element={
                    <ProtectedRoute>
                      <Fees />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admission-fees"
                  element={
                    <ProtectedRoute>
                      <AdmissionFees />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/committee-donation"
                  element={
                    <ProtectedRoute>
                      <CommitteeDonation />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payroll/*"
                  element={
                    <ProtectedRoute>
                      <Payroll />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/accounts"
                  element={
                    <ProtectedRoute>
                      <Accounts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/certificates/*"
                  element={
                    <ProtectedRoute>
                      <Certificates />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vehicle/*"
                  element={
                    <ProtectedRoute>
                      <Vehicle />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/*"
                  element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/biometric/*"
                  element={
                    <ProtectedRoute>
                      <BiometricDevices />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/online-admission/*"
                  element={
                    <ProtectedRoute>
                      <OnlineAdmission />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/*"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tenant-management"
                  element={
                    <ProtectedRoute>
                      <TenantManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subscription-management"
                  element={
                    <ProtectedRoute>
                      <SubscriptionManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/system-settings"
                  element={
                    <ProtectedRoute>
                      <SystemSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/school-branding"
                  element={
                    <ProtectedRoute>
                      <SchoolBranding />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subscription-history"
                  element={
                    <ProtectedRoute>
                      <SubscriptionHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cms"
                  element={
                    <ProtectedRoute>
                      <AcademicCMS />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai-assistant"
                  element={
                    <ProtectedRoute>
                      <AIAssistant />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai-assistant/logs"
                  element={
                    <ProtectedRoute>
                      <AILogs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/quiz-tool"
                  element={
                    <ProtectedRoute>
                      <QuizTool />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/test-generator"
                  element={
                    <ProtectedRoute>
                      <TestGenerator />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/question-paper-builder"
                  element={
                    <ProtectedRoute>
                      <QuestionPaperBuilder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai-summary"
                  element={
                    <ProtectedRoute>
                      <AISummary />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai-notes"
                  element={
                    <ProtectedRoute>
                      <AINotes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/dashboard"
                  element={
                    <ProtectedRoute>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/profile"
                  element={
                    <ProtectedRoute>
                      <StudentProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/fees"
                  element={
                    <ProtectedRoute>
                      <StudentFees />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/admit-card"
                  element={
                    <ProtectedRoute>
                      <StudentAdmitCard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/attendance"
                  element={
                    <ProtectedRoute>
                      <StudentAttendanceView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/dashboard"
                  element={
                    <ProtectedRoute>
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/live-classes"
                  element={
                    <ProtectedRoute>
                      <StudentLiveClasses />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/homework"
                  element={
                    <ProtectedRoute>
                      <StudentHomework />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/contact"
                  element={
                    <ProtectedRoute>
                      <StudentContactLinks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/homework"
                  element={
                    <ProtectedRoute>
                      <Homework />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/live-classes"
                  element={
                    <ProtectedRoute>
                      <LiveClassManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/fee-types"
                  element={
                    <ProtectedRoute>
                      <FeeTypeManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/donations"
                  element={
                    <ProtectedRoute>
                      <DonationManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contact-links"
                  element={
                    <ProtectedRoute>
                      <ContactLinksManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/monthly-payments"
                  element={
                    <ProtectedRoute>
                      <MonthlyPayments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lesson-plans"
                  element={
                    <ProtectedRoute>
                      <LessonPlans />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/financial-summary"
                  element={
                    <ProtectedRoute>
                      <FinancialSummary />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/admission-fees"
                  element={
                    <ProtectedRoute>
                      <AdmissionFeeReport />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/monthly-fees"
                  element={
                    <ProtectedRoute>
                      <MonthlyFeeReport />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/donations"
                  element={
                    <ProtectedRoute>
                      <DonationReport />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/date-wise"
                  element={
                    <ProtectedRoute>
                      <DateWiseReport />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>
            </Layout>
            <Toaster />
          </div>
        </Router>
      </InstitutionProvider>
    </AuthProvider>
    </CurrencyProvider>
    </LoadingProvider>
  );
}

export default App;
