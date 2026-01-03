import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, Users, BookOpen, Award, Shield, Clock, Globe } from 'lucide-react';
import i18n from '../i18n';

const FIXED_TENANT_ID = 'mham5678';

const LoginPage = () => {
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
    tenantId: FIXED_TENANT_ID
  });
  
  const [schoolBranding, setSchoolBranding] = useState({
    school_name: 'মাহাজামপুর দরবার শরীফ',
    school_name_en: 'Mahajampur Darbar Sharif',
    tagline: 'আপনার অ্যাকাউন্টে প্রবেশ করুন',
    logo_url: null,
    primary_color: '#10B981'
  });
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://portal.mahajampurdarbarsharif.org/api';

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState('bn');
  const { login } = useAuth();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'bn' : 'en';
    i18n.changeLanguage(newLang);
    setCurrentLang(newLang);
  };

  const fetchSchoolBranding = useCallback(async (tenantCode) => {
    if (!tenantCode || tenantCode.length < 2) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/school-branding/public/${tenantCode}`);
      if (response.data && response.data.school_name) {
        setSchoolBranding({
          school_name: response.data.school_name || 'মাহাজামপুর দরবার শরীফ',
          school_name_en: response.data.school_name_en || 'Mahajampur Darbar Sharif',
          tagline: response.data.tagline || 'আপনার অ্যাকাউন্টে প্রবেশ করুন',
          logo_url: response.data.logo_url,
          primary_color: response.data.primary_color || '#10B981'
        });
      }
    } catch (error) {
      console.log('Using default branding');
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchSchoolBranding(FIXED_TENANT_ID);
  }, [fetchSchoolBranding]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await login(loginData.username, loginData.password, loginData.tenantId);
      
      if (result.success) {
        toast.success(currentLang === 'bn' ? 'সফলভাবে লগইন হয়েছে!' : 'Login successful!');
        navigate('/dashboard');
      } else {
        toast.error(result.error || (currentLang === 'bn' ? 'লগইন ব্যর্থ হয়েছে' : 'Login failed'));
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(currentLang === 'bn' ? 'লগইন ব্যর্থ হয়েছে' : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const features = currentLang === 'bn' ? [
    { icon: Users, title: 'ছাত্র ব্যবস্থাপনা', color: 'from-emerald-400 to-emerald-600' },
    { icon: BookOpen, title: 'একাডেমিক ট্র্যাকিং', color: 'from-blue-400 to-blue-600' },
    { icon: Award, title: 'ফলাফল প্রকাশ', color: 'from-purple-400 to-purple-600' },
    { icon: Shield, title: 'নিরাপদ সিস্টেম', color: 'from-orange-400 to-orange-600' },
  ] : [
    { icon: Users, title: 'Student Management', color: 'from-emerald-400 to-emerald-600' },
    { icon: BookOpen, title: 'Academic Tracking', color: 'from-blue-400 to-blue-600' },
    { icon: Award, title: 'Result Publishing', color: 'from-purple-400 to-purple-600' },
    { icon: Shield, title: 'Secure System', color: 'from-orange-400 to-orange-600' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600"></div>
        
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        {/* Floating Circles */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-48 h-48 bg-white/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          {/* Logo */}
          <div className="mb-8">
            {schoolBranding.logo_url ? (
              <img 
                src={schoolBranding.logo_url} 
                alt={schoolBranding.school_name} 
                className="h-28 w-28 object-contain rounded-2xl shadow-2xl bg-white/10 p-2"
              />
            ) : (
              <div className="h-28 w-28 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl">
                <GraduationCap className="h-16 w-16 text-white" />
              </div>
            )}
          </div>

          {/* School Name */}
          <h1 className="text-4xl font-bold text-center mb-2 drop-shadow-lg">
            {schoolBranding.school_name}
          </h1>
          <p className="text-xl text-white/80 text-center mb-12">
            {currentLang === 'bn' ? 'মাদ্রাসা ম্যানেজমেন্ট সিস্টেম' : 'Madrasah Management System'}
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-6 w-full max-w-md">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 shadow-lg`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-white/90">{feature.title}</h3>
              </div>
            ))}
          </div>

          {/* Bottom Text */}
          <div className="mt-12 text-center">
            <p className="text-white/60 text-sm">
              {currentLang === 'bn' 
                ? '© ২০২৪ সর্বস্বত্ব সংরক্ষিত' 
                : '© 2024 All Rights Reserved'}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md">
          {/* Language Toggle */}
          <div className="flex justify-end mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="flex items-center gap-2 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <Globe className="h-4 w-4" />
              {currentLang === 'en' ? 'বাংলা' : 'English'}
            </Button>
          </div>

          {/* Mobile Logo - Only visible on mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              {schoolBranding.logo_url ? (
                <img 
                  src={schoolBranding.logo_url} 
                  alt={schoolBranding.school_name} 
                  className="h-20 w-20 object-contain rounded-xl shadow-lg"
                />
              ) : (
                <div className="h-20 w-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <GraduationCap className="h-10 w-10 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {schoolBranding.school_name}
            </h1>
          </div>

          {/* Login Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {currentLang === 'bn' ? 'স্বাগতম!' : 'Welcome Back!'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {currentLang === 'bn' 
                  ? 'আপনার অ্যাকাউন্টে লগইন করুন' 
                  : 'Sign in to your account'}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700 dark:text-gray-300 font-medium">
                  {currentLang === 'bn' ? 'ইউজারনেম' : 'Username'}
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={currentLang === 'bn' ? 'আপনার ইউজারনেম লিখুন' : 'Enter your username'}
                  value={loginData.username}
                  onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                  required
                  className="h-12 px-4 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-medium">
                  {currentLang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={currentLang === 'bn' ? 'আপনার পাসওয়ার্ড লিখুন' : 'Enter your password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    required
                    className="h-12 px-4 pr-12 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{currentLang === 'bn' ? 'লগইন হচ্ছে...' : 'Signing in...'}</span>
                  </div>
                ) : (
                  <span>{currentLang === 'bn' ? 'লগইন করুন' : 'Sign In'}</span>
                )}
              </Button>
            </form>

            {/* Security Note */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Shield className="h-4 w-4" />
              <span>{currentLang === 'bn' ? 'নিরাপদ সংযোগ' : 'Secure Connection'}</span>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              {currentLang === 'bn' 
                ? 'রিয়েল-টাইম ডেটা সিঙ্ক' 
                : 'Real-time Data Sync'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Developed By Maxtechbd.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
