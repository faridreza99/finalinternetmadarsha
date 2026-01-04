# Overview

This Cloud School ERP is a **Single Madrasah** management system (fixed tenant: MHAM5678) with comprehensive educational modules and AI capabilities. The system includes student management, attendance tracking, results, ID card generation, fee management, and AI tools. It provides a simplified, Bengali-first interface optimized for Madrasah institutions with professional reporting and scalable architecture supporting 100k+ students.

## Recent Changes (January 2026)
- **Fee Setup Module (Single Source of Truth)**: New centralized fee configuration system:
  - Dedicated Fee Setup page (/fee-setup) for admin to define class-wise fees
  - Fee types: মাসিক বেতন (Monthly), ভর্তি ফি (Admission), পরীক্ষা ফি (Exam), and more
  - Class/Marhala-specific or "All Classes" fee configuration
  - Enable/disable fees per configuration with toggle switch
  - Frequency options: Monthly, Yearly, One-time, Per Semester
  - Due date and late fee settings
  - Fee Collection page now shows fee breakdown from Fee Setup (not hardcoded)
  - Warning shown if no fees configured for selected student's class
  - Sidebar updated: আর্থিক → ফি সেটআপ as first item
  - Backend APIs: GET/POST/PUT/DELETE /fees/configurations
  - Auto-generates student_fees records when fee config is created
- **Fee Collection UI Improvements**:
  - Dashboard summary cards: আজ আদায়, মোট বকেয়া, আজকের রসিদ
  - Branch filter hidden (data not fully implemented)
  - Fee breakdown shows configured fees per student's marhala
  - Quick action buttons: History (📋), Download Receipt (🧾)
  - Fee status badges: Green (পরিশোধিত), Yellow (আংশিক পরিশোধ), Red (বকেয়া)
  - Fee type dropdown in payment form
- **Video Lessons & Semester System**: Complete video-based learning module with:
  - Semester management linked to classes (জামাত) with Bengali titles
  - Video lesson CRUD with YouTube/Cloudinary support
  - Question system: MCQ (বহু নির্বাচনী), Fill-in-blanks (শূন্যস্থান পূরণ), Matching (মিলকরণ)
  - Student-semester enrollment system
  - Auto-grading with point system and progress tracking
  - Admin UI: VideoLessons.js for managing semesters, lessons, questions
  - Student UI: StudentVideoLessons.js for viewing videos and answering questions
  - Full Bengali localization for all error messages and UI
  - Database collections: semesters, video_lessons, assessment_questions, student_lesson_responses, student_semester_enrollments
  - Routes: /video-lessons (admin), /student/video-lessons (student)
- **User Credential System Overhaul**: Complete redesign of student/user account creation:
  - Institution `short_name` field for clean username prefixes (e.g., `imquran` instead of `mham5678`)
  - New `student_identifier` field in student form for custom login IDs
  - Username format: `{short_name}_{identifier}` (e.g., `imquran_farid66`)
  - Secure password generation with per-student entropy: `{Name}{RandomDigits}@{Year}` (e.g., `Farid786@2026`)
  - Auto-duplicate handling for usernames (appends counter if exists)
  - Enhanced Admin User Management UI with password reset buttons, enable/disable toggle
  - `must_change_password` flag for first-time login requirement
- **Live Class Attendance Fix**: Fixed critical bug where main attendance upsert was skipped when live_class_attendance record existed; now always upserts to main attendance collection for dashboard visibility
- **Class Management Bangla Localization**: Complete Madrasah-specific terminology throughout ClassManagement component:
  - Page title: জামাত ব্যবস্থাপনা (Class Management)
  - Stats cards with Bengali numerals: মোট জামাত, মোট শাখা, মোট কিতাব, নিয়োজিত উস্তাদ
  - Tab labels: জামাত সমূহ, শাখা সমূহ, জামাতের কিতাব
  - All form labels, buttons, and placeholders localized (মারহালা, দায়িত্বপ্রাপ্ত উস্তাদ, শাখার উস্তাদ, etc.)
  - Table headers: প্রদর্শন নাম, মারহালা, সর্বোচ্চ ছাত্র সংখ্যা, অবস্থা, অ্যাকশন
  - Conditional terminology: ঐচ্ছিক/আবশ্যিক for Elective/Core subjects
  - Bengali numeral conversion (toBengaliNumeral) for all counts in Madrasah mode
- **Live Class Management System**: Complete live class module with Telegram integration, gender-based filtering, automatic attendance marking on join, and payment-based access control
- **Fee Type Management**: Configurable fee types (General, Foreign, Zakat, Nafol, Sadaqah) with amounts in BDT
- **Monthly Payment System**: Track student payments by month/year with future month payment support
- **Donation/Fund Module**: Record donations with purpose selection (Zakat, Sadaqah, Nafol, Donation) and donor tracking
- **Homework Module**: Teachers assign homework by class, students view and submit with full Bengali support
- **Contact Links Management**: Editable social media/contact links for student dashboard
- **Student Access Control**: Payment-based feature gating for Live Classes, Homework, and Attendance
- **Central Financial Reports Hub**: Comprehensive reporting system with 5 financial report pages:
  - Financial Summary (আর্থিক সারাংশ): Overview of all fees, donations, today's collection, and dues
  - Admission Fee Report (ভর্তি ফি রিপোর্ট): Detailed admission fee collection history
  - Monthly Fee Report (মাসিক ফি রিপোর্ট): Monthly fee payment tracking
  - Donation Report (দান রিপোর্ট): Committee/donation payment summaries
  - Date-wise Report (তারিখভিত্তিক রিপোর্ট): Cross-category financial data by date range
- All reports support Print, PDF export (reportlab), and Excel export (pandas/openpyxl)
- Bengali numeral rendering and Bangla date formatting across all report exports
- Reports section added to sidebar navigation with Bengali labels
- **Admission Fee Collection Module**: New student-based admission fee collection with receipt generation, class/jamaat selection, payment mode tracking, and full Bangla support (ভর্তি ফি)
- **Committee/Donation Management Module**: Non-student donation management with donor registration, committee tracking (e.g., ৩১৩ বদরী সাদৃশ্য কমিটি), monthly/yearly donation types, payment history, summary reports, and full Bangla support (কমিটি / দান)
- Bengali numeral conversion (toBengaliNumeral) and Bangla date formatting (toBanglaDate) for all receipts
- Fixed backend API bug using `.pop("_id", None)` instead of `del` to prevent KeyError exceptions

## Recent Changes (December 2024)
- Converted from multi-tenant to Single Madrasah mode with fixed tenant MHAM5678
- Removed School CODE field from login/registration
- Added comprehensive database indexing for 50-70% query performance improvement
- Implemented in-memory TTL caching layer (Redis-ready architecture)
- Cache invalidation on all create/update/delete operations
- Updated ID card back side with professional Bengali text
- Added pagination support for student listings (backward compatible)
- Created background job queue for long-running operations (PDF/ID Card generation)
- Bulk ID card generation with ZIP download and progress tracking
- **ID Card Dynamic Institution Names**: Removed all hardcoded text, names now come 100% from School Branding/Settings
- **Bengali Font Improvements**: Added Noto Sans Bengali font for proper Unicode Bengali text rendering in PDFs
- **Bulk ID Card Generation**: Added checkbox-based bulk selection for both Student and Staff ID cards with ZIP download, progress tracking, and sequential PDF generation via JSZip
- **Madrasah Dashboard**: Beautiful visual dashboard with gradient summary cards (students, fees, attendance), Recharts-based area/bar/pie charts for fee collection trends, weekly attendance, class-wise distribution, and recent payments widget with Bengali labels

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
- **Frontend Framework**: React 19 SPA using functional components and hooks.
- **Styling**: Tailwind CSS and Shadcn/ui for consistent and accessible UI components.
- **Dark Mode**: Comprehensive dark mode support across all routes with automatic theme detection.
- **Responsiveness**: Fully responsive design across all devices using Tailwind CSS breakpoints.
- **Madrasah UX Simplification**: Dedicated UI/UX for Madrasah tenants, featuring simplified menus, 100% Bengali language interfaces, and streamlined workflows for specific modules (e.g., Fee Wizard, Certificates).

## Technical Implementations
- **Frontend**: React 19, React Router DOM, Axios, Context API.
- **Backend**: FastAPI with async/await, JWT authentication, RBAC, and custom middleware.
- **Database**: MongoDB with compound indexes for optimized queries, designed with Single Madrasah tenant_id.
- **Performance**: In-memory TTL caching (Redis-ready), 50-70% query improvement via compound indexes.
- **API**: RESTful design, modular organization, consistent error handling, Pydantic for data validation.
- **Mobile App**: React Native (Expo) for iOS/Android, integrating with the backend API.

## Feature Specifications
- **Multi-tenancy & RBAC**: Strict data isolation with granular permissions.
- **Core Modules**: Student admissions, attendance, fee management, curriculum, transport, staff, certificate, user management.
- **Academic Content CMS**: Hierarchical content management for books, question papers, and Q&A.
- **AI Modules**: AI Assistant (GPT-4o-mini with multi-modal input), AI Quiz Tool, AI Test Generator, AI Summary Generator, AI Notes Generator (all CMS-first and RAG-based).
- **GiNi School Dashboard**: Professional analytics for AI module usage.
- **Enhanced Class & Subject Management**: Dynamic subject integration.
- **Calendar & Timetable Modules**: Event management and advanced timetable scheduling.
- **Notification Module**: Event-driven system with in-app, email, and customizable templates.
- **Pop-up Rating/Review Module**: Flexible feedback collection.
- **Bulk Student Upload**: Excel/CSV import with validation.
- **Student Result Automation**: Comprehensive result management, grading, and publication.
- **Dynamic Currency System**: Global currency configuration for financial modules.
- **Enterprise Payroll Management System**: Complete payroll solution with salary structure, attendance/leave integration, payment tracking, payslip generation, and comprehensive reports.
- **Enterprise Attendance Management System**: Rule-based attendance, biometric integration, offline sync, parent notifications, and AI insights.
- **ID Card Generation System**: Student and staff ID card generation with QR codes and school branding.
- **Madrasah Specific Features**: Madrasah Class Management, Madrasah Simple Fee Wizard, Professional Madrasah Receipt, Simplified Madrasah Certificate System, **Madrasah Simple Result System** (মুমতাজ/জায়্যিদ জিদ্দান/জায়্যিদ/মাকবুল/রাসেব grading with print), **Madrasah Simple Routine System** (সহজ সাপ্তাহিক রুটিন with print), **Madrasah Simple Settings** (5 simplified sections: প্রতিষ্ঠান তথ্য, শিক্ষাবর্ষ ও মারহালা, হাজিরা সেটিং, ব্যবহারকারী ব্যবস্থাপনা, সাবস্ক্রিপশন তথ্য). All with full Bengali support and Madrasah-specific nomenclature. Madrasah sidebar shows 100% Bengali menu labels with `madrasahTitle` property for all items. Advanced settings (Biometric Devices, Semester System, Permission Matrix, etc.) are hidden in Madrasah mode via `hideInMadrasah` flag.

## System Design Choices
- **Build Tooling**: Create React App with Craco and Webpack.
- **Development Environment**: Hot reloading.
- **React Performance**: Consistent use of `useCallback` with `useEffect`.

# External Dependencies

## Frontend
- **React Ecosystem**: React 19, React DOM, React Router DOM.
- **UI & Styling**: Shadcn/ui (Radix UI), Tailwind CSS.
- **Forms & Validation**: React Hook Form.
- **Utilities**: Axios, Recharts, Lucide React, date-fns, Sonner.

## Backend
- **Web Framework**: FastAPI, Uvicorn.
- **Database Drivers**: MongoDB, Motor, PyMongo.
- **Authentication/Security**: PyJWT, bcrypt, python-jose.
- **Data & Configuration**: Pydantic, python-dotenv, Pandas, NumPy.
- **File Handling**: python-multipart.
- **AI/ML**: OpenAI (GPT-4o-mini, Whisper, TTS), Tesseract OCR (Pytesseract), Pillow.
- **Reporting**: ReportLab (PDF), openpyxl (Excel).

## Cloud Services & Integrations
- **Database Hosting**: MongoDB Atlas.
- **Multi-tenancy**: Subdomain or header-based tenant detection.
- **Email Integration**: Replit Mail API.

## Mobile App (React Native / Expo)
- **Framework**: React Native 0.81.5 with Expo SDK 54.
- **Navigation**: React Navigation.
- **Dependencies**: axios, @react-native-async-storage/async-storage, expo-linear-gradient, @react-native-picker/picker.
- **API Integration**: Centralized API service layer with axios interceptors for JWT token and tenant ID.