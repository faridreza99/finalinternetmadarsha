# Overview

This Cloud School ERP is a **Single Madrasah** management system (fixed tenant: MHAM5678) with comprehensive educational modules and AI capabilities. It includes student management, attendance tracking, results, ID card generation, fee management, and advanced AI tools. The system provides a simplified, Bengali-first interface optimized for Madrasah institutions, featuring professional reporting and a scalable architecture designed to support over 100,000 students. The business vision is to provide a robust, AI-powered ERP solution tailored for Madrasah education, enhancing administrative efficiency and learning experiences.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
- **Frontend Framework**: React 19 SPA using functional components and hooks.
- **Styling**: Tailwind CSS and Shadcn/ui for consistent and accessible UI components.
- **Theming**: Comprehensive dark mode support with automatic theme detection.
- **Responsiveness**: Fully responsive design across all devices.
- **Madrasah UX Simplification**: Dedicated UI/UX for Madrasah tenants, featuring simplified menus, 100% Bengali language interfaces, and streamlined workflows.

## Technical Implementations
- **Frontend**: React 19, React Router DOM, Axios, Context API.
- **Backend**: FastAPI with async/await, JWT authentication, RBAC, and custom middleware.
- **Database**: MongoDB with compound indexes for optimized queries, designed with a Single Madrasah `tenant_id`.
- **Performance**: In-memory TTL caching (Redis-ready architecture), 50-70% query improvement via compound indexes, and cache invalidation on CUD operations.
- **API**: RESTful design, modular organization, consistent error handling, Pydantic for data validation.
- **Mobile App**: React Native (Expo) for iOS/Android, integrating with the backend API.
- **Key Features**:
    - **Fee Setup Module**: Centralized fee configuration (class-wise, various fee types, frequencies, due dates, late fees).
    - **Video Lessons & Semester System**: Complete video-based learning module with semester management, video lesson CRUD, and an MCQ/Fill-in-blanks/Matching question system.
    - **User Credential System**: Redesigned student/user account creation with custom identifiers, secure password generation, and enhanced admin user management.
    - **Live Class Management**: Live class module with Telegram integration, gender-based filtering, automatic attendance, and payment-based access control.
    - **Financial Reporting Hub**: Comprehensive reporting (Financial Summary, Admission Fee, Monthly Fee, Donation, Date-wise) with Print, PDF, and Excel export.
    - **Madrasah Specific Features**: Madrasah Class Management, Simplified Fee Wizard, Professional Receipts, Simplified Certificate System, Simple Result System (MUMTAZ grading), Simple Routine System, and Simplified Settings, all with full Bengali support and nomenclature.
    - **Madrasha Academic Hierarchy**: Semester-centric academic structure following Marhala → Department/Jamaat → Semester → Student flow. All operations (Attendance, Video Classes, Exams, Fees, Reports) designed to be semester-based with `semester_id` as the primary operational reference for student enrollment.
    - **AcademicHierarchySelector Component**: Reusable component for semester-centric filtering across modules (StudentList, StudentIDCard, Certificates, Reports). Uses `onSelectionChange` callback returning `{ marhala_id, department_id, semester_id, marhala_name, department_name, semester_name }`. Supports `showAllOption` and `layout` props.

## Feature Specifications
- **Multi-tenancy & RBAC**: Strict data isolation with granular permissions (for future multi-tenancy, currently single tenant).
- **Core Modules**: Student admissions, attendance, fee management, curriculum, transport, staff, certificate, user management.
- **Academic Content CMS**: Hierarchical content management for books, question papers, and Q&A.
- **AI Modules**: AI Assistant (GPT-4o-mini), AI Quiz Tool, AI Test Generator, AI Summary Generator, AI Notes Generator (all CMS-first and RAG-based).
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
- **Multi-tenancy**: Subdomain or header-based tenant detection (architectural provision, currently single tenant).
- **Email Integration**: Replit Mail API.
- **Communication**: Telegram integration for live classes.

## Mobile App (React Native / Expo)
- **Framework**: React Native 0.81.5 with Expo SDK 54.
- **Navigation**: React Navigation.
- **Dependencies**: axios, @react-native-async-storage/async-storage, expo-linear-gradient, @react-native-picker/picker.
- **API Integration**: Centralized API service layer with axios interceptors for JWT token and tenant ID.    - **Consolidated Branding System**: Single source of truth for school branding via institutions collection (সহজ সেটিংস). All reports, PDFs, and frontend components read branding data from the institution settings. Removed separate SchoolBranding component and school_branding collection dependency.
