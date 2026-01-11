import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useInstitution } from '../context/InstitutionContext';
import { useDebounce } from '../hooks/useDebounce';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Label } from './ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Camera,
  FileUp,
  Image,
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  Printer,
  User,
  Home,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import AcademicHierarchySelector from './AcademicHierarchySelector';

const API = process.env.REACT_APP_API_URL || '/api';
const BASE_URL = API ? API.replace('/api', '') : '';

const withTimeout = (promise, timeoutMs = 10000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
};

const safeBackgroundRefresh = (refreshFn) => {
  Promise.resolve(refreshFn()).catch(err => console.error('Background refresh failed:', err));
};

const StudentList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMadrasahSimpleUI } = useInstitution();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all_classes');
  const [selectedSection, setSelectedSection] = useState('all_sections');
  const [selectedMarhalaId, setSelectedMarhalaId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isPhotoUploadModalOpen, setIsPhotoUploadModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [dateError, setDateError] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [isQuickAddSectionModalOpen, setIsQuickAddSectionModalOpen] = useState(false);
  const [quickSectionData, setQuickSectionData] = useState({
    name: '',
    max_students: 40
  });
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [importErrors, setImportErrors] = useState([]);
  const [importSummary, setImportSummary] = useState(null);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [studentCredentials, setStudentCredentials] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [autoRoll, setAutoRoll] = useState(true);
  const autoRollRef = useRef(true);
  const [rollDuplicateWarning, setRollDuplicateWarning] = useState(null);
  const [isCheckingRoll, setIsCheckingRoll] = useState(false);

  const getCurrentView = () => {
    const path = location.pathname;
    if (path === '/students/add') return 'add';
    if (path === '/students/import') return 'import';
    if (path === '/students/photos') return 'photos';
    return 'list';
  };

  const currentView = getCurrentView();

  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterIds, setSelectedSemesterIds] = useState([]);
  const [academicHierarchy, setAcademicHierarchy] = useState({ marhalas: [], departments: [], semesters: [] });
  const [formData, setFormData] = useState({
    admission_no: '',
    roll_no: '',
    student_identifier: '',
    name: '',
    father_name: '',
    father_phone: '',
    father_whatsapp: '',
    mother_name: '',
    mother_phone: '',
    mother_whatsapp: '',
    date_of_birth: '',
    gender: '',
    class_id: '',
    section_id: '',
    marhala_id: '',
    department_id: '',
    semester_id: '',
    phone: '',
    email: '',
    address: '',
    guardian_name: '',
    guardian_phone: ''
  });
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchData();
      setLoading(false);
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSections(selectedClass);
    }
  }, [selectedClass]);

  useEffect(() => {
    setIsAddModalOpen(false);
    setEditingStudent(null);
    resetForm();
  }, [location.pathname]);

  const fetchData = async () => {
    try {
      const [studentsRes, classesRes, semestersRes, hierarchyRes] = await Promise.all([
        axios.get(`${API}/students`),
        axios.get(`${API}/classes`),
        axios.get(`${API}/admin/semesters`).catch(() => ({ data: { semesters: [] } })),
        axios.get(`${API}/academic-hierarchy`).catch(() => ({ data: { marhalas: [], departments: [], semesters: [] } }))
      ]);
      
      setStudents(studentsRes.data);
      setClasses(classesRes.data);
      setSemesters(semestersRes.data?.semesters || []);
      setAcademicHierarchy(hierarchyRes.data || { marhalas: [], departments: [], semesters: [] });
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    }
  };

  const fetchSections = async (classId) => {
    try {
      const response = await axios.get(`${API}/sections?class_id=${classId}`);
      setSections(response.data);
    } catch (error) {
      console.error('Failed to fetch sections:', error);
    }
  };

  const fetchNextRollNumber = async (classId, sectionId, semesterId = null) => {
    try {
      let url = `${API}/students/next-roll?`;
      if (semesterId) {
        url += `semester_id=${semesterId}`;
      } else if (classId) {
        url += `class_id=${classId}`;
        if (sectionId) {
          url += `&section_id=${sectionId}`;
        }
      } else {
        return null;
      }
      const response = await axios.get(url);
      if (autoRollRef.current) {
        setFormData(prev => ({ ...prev, roll_no: String(response.data.next_roll) }));
      }
      return response.data.next_roll;
    } catch (error) {
      console.error('Failed to fetch next roll number:', error);
      return null;
    }
  };

  const fetchNextAdmissionNumber = async () => {
    try {
      const response = await axios.get(`${API}/students/next-admission`);
      setFormData(prev => ({ ...prev, admission_no: response.data.next_admission }));
      return response.data.next_admission;
    } catch (error) {
      console.error('Failed to fetch next admission number:', error);
      return null;
    }
  };

  const checkRollDuplicate = async (classId, rollNo, sectionId) => {
    if (!classId || !rollNo) {
      setRollDuplicateWarning(null);
      return;
    }
    setIsCheckingRoll(true);
    try {
      let url = `${API}/students/check-roll-duplicate?class_id=${classId}&roll_no=${rollNo}`;
      if (sectionId) {
        url += `&section_id=${sectionId}`;
      }
      const response = await axios.get(url);
      if (response.data.is_duplicate) {
        setRollDuplicateWarning(`এই রোল নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে (${response.data.existing_student_name})`);
      } else {
        setRollDuplicateWarning(null);
      }
    } catch (error) {
      console.error('Failed to check roll duplicate:', error);
    } finally {
      setIsCheckingRoll(false);
    }
  };

  const handleQuickAddSection = async (e) => {
    e.preventDefault();
    
    if (!formData.class_id) {
      toast.error('প্রথমে মারহালা নির্বাচন করুন');
      return;
    }

    if (!quickSectionData.name.trim()) {
      toast.error('Please enter a section name');
      return;
    }

    setIsSavingSection(true);
    try {
      const sectionPayload = {
        class_id: formData.class_id,
        name: quickSectionData.name.trim(),
        max_students: parseInt(quickSectionData.max_students),
        section_teacher_id: null
      };

      const response = await axios.post(`${API}/sections`, sectionPayload);
      toast.success('Section added successfully!');
      
      // Refresh sections for the current class
      await fetchSections(formData.class_id);
      
      // Auto-select the newly created section
      setFormData({...formData, section_id: response.data.id});
      
      // Reset and close modal
      setQuickSectionData({ name: '', max_students: 40 });
      setIsQuickAddSectionModalOpen(false);
    } catch (error) {
      console.error('Failed to add section:', error);
      toast.error(error.response?.data?.detail || 'Failed to add section');
    } finally {
      setIsSavingSection(false);
    }
  };

  const getDaysInMonth = (year, month) => {
    if (!year || !month) return 31;
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };

  const getYearRange = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 1990; year--) {
      years.push(year);
    }
    return years;
  };

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const handleDateChange = (type, value) => {
    let newYear = birthYear;
    let newMonth = birthMonth;
    let newDay = birthDay;

    if (type === 'year') {
      newYear = value;
      setBirthYear(value);
    } else if (type === 'month') {
      newMonth = value;
      setBirthMonth(value);
      const daysInMonth = getDaysInMonth(birthYear, value);
      if (birthDay && parseInt(birthDay) > daysInMonth) {
        newDay = daysInMonth.toString().padStart(2, '0');
        setBirthDay(newDay);
      }
    } else if (type === 'day') {
      newDay = value;
      setBirthDay(value);
    }

    if (newYear && newMonth && newDay) {
      const selectedDate = new Date(parseInt(newYear), parseInt(newMonth) - 1, parseInt(newDay));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        setDateError('Future dates are not allowed');
        toast.error('Date of Birth cannot be a future date');
        return;
      }

      setDateError('');
      const formattedDate = `${newYear}-${newMonth}-${newDay}`;
      setFormData({ ...formData, date_of_birth: formattedDate });
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Photo size should be less than 2MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (submittingRef.current) {
      return;
    }

    // Photo is required for new students in simple form
    if (!editingStudent && isMadrasahSimpleUI && !photoFile) {
      toast.error('ছবি আপলোড করা আবশ্যক');
      return;
    }
    
    submittingRef.current = true;
    setIsSubmitting(true);

    const unlockTimeout = setTimeout(() => {
      submittingRef.current = false;
      setIsSubmitting(false);
      toast.warning('Operation is taking longer than expected. Please check the list.');
    }, 15000);

    try {
      let studentId = null;
      let newCredentials = null;
      const wasEditing = !!editingStudent;
      
      if (editingStudent) {
        await withTimeout(axios.put(`${API}/students/${editingStudent.id}`, formData), 10000);
        studentId = editingStudent.id;
        toast.success('Student updated successfully');
      } else {
        const response = await withTimeout(axios.post(`${API}/students`, formData), 10000);
        const responseData = response.data;
        studentId = responseData.id;
        
        if (responseData.credentials) {
          newCredentials = {
            studentName: responseData.name,
            admissionNo: responseData.admission_no,
            ...responseData.credentials
          };
          setStudentCredentials(newCredentials);
        }
        toast.success('Student admission created successfully!');
      }
      
      if (photoFile && studentId) {
        const photoFormData = new FormData();
        photoFormData.append('file', photoFile);
        withTimeout(
          axios.post(`${API}/students/${studentId}/photo`, photoFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          }),
          8000
        ).then(() => { safeBackgroundRefresh(fetchData); }).catch(photoError => {
          console.error('Failed to upload photo:', photoError);
          toast.warning('Student saved but photo upload failed');
        });
      }
      
      if (studentId && selectedSemesterIds.length > 0) {
        try {
          await Promise.all(
            selectedSemesterIds.map(semId => 
              axios.post(`${API}/admin/semesters/${semId}/enroll`, [studentId])
            )
          );
        } catch (err) {
          console.error('Failed to enroll in semester:', err);
          toast.error('সেমিস্টারে ভর্তি করতে সমস্যা হয়েছে');
        }
      }
      
      if (wasEditing) {
        setIsAddModalOpen(false);
      } else {
        setIsAddStudentModalOpen(false);
      }
      
      setEditingStudent(null);
      resetForm();
      
      safeBackgroundRefresh(fetchData);
      
      if (!wasEditing && newCredentials) {
        setTimeout(() => {
          setIsCredentialsModalOpen(true);
        }, 100);
      }
    } catch (error) {
      console.error('Failed to save student:', error);
      const errorMessage = error.message === 'Request timeout' 
        ? 'Request timed out. Please try again.'
        : (error.response?.data?.detail || 'Failed to save student');
      toast.error(errorMessage);
    } finally {
      clearTimeout(unlockTimeout);
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (student) => {
    setFormData({
      admission_no: student.admission_no,
      roll_no: student.roll_no,
      name: student.name,
      father_name: student.father_name,
      father_phone: student.father_phone || '',
      father_whatsapp: student.father_whatsapp || '',
      mother_name: student.mother_name,
      mother_phone: student.mother_phone || '',
      mother_whatsapp: student.mother_whatsapp || '',
      date_of_birth: student.date_of_birth,
      gender: student.gender,
      class_id: student.class_id,
      section_id: student.section_id,
      marhala_id: student.marhala_id || '',
      department_id: student.department_id || '',
      semester_id: student.semester_id || '',
      phone: student.phone,
      email: student.email || '',
      address: student.address,
      guardian_name: student.guardian_name,
      guardian_phone: student.guardian_phone
    });
    setEditingStudent(student);
    setPhotoFile(null);
    setPhotoPreview(student.photo_url || '');
    try {
      const res = await axios.get(`${API}/admin/students/${student.id}/semesters`);
      setSelectedSemesterIds(res.data?.semester_ids || []);
    } catch (e) {
      console.error('Failed to fetch student semesters:', e);
      setSelectedSemesterIds([]);
    }
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (student) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;

    setLoading(true);
    try {
      await axios.delete(`${API}/students/${studentToDelete.id}`);
      toast.success('Student deleted successfully');
      await fetchData();
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
    } catch (error) {
      console.error('Failed to delete student:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete student');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSemesterIds([]);
    setFormData({
      admission_no: '',
      roll_no: '',
      student_identifier: '',
      name: '',
      father_name: '',
      father_phone: '',
      father_whatsapp: '',
      mother_name: '',
      mother_phone: '',
      mother_whatsapp: '',
      date_of_birth: '',
      gender: '',
      class_id: '',
      section_id: '',
      marhala_id: '',
      department_id: '',
      semester_id: '',
      phone: '',
      email: '',
      address: '',
      guardian_name: '',
      guardian_phone: ''
    });
    setDateError('');
    setBirthYear('');
    setBirthMonth('');
    setBirthDay('');
    setPhotoFile(null);
    setPhotoPreview('');
    setSelectedSemesterIds([]);
  };
  
  const getFilteredDepartments = () => {
    if (!formData.marhala_id) return [];
    return academicHierarchy.departments?.filter(d => d.marhala_id === formData.marhala_id) || [];
  };
  
  const getFilteredAcademicSemesters = () => {
    if (!formData.department_id) return [];
    return academicHierarchy.semesters?.filter(s => s.department_id === formData.department_id) || [];
  };

  const handleBulkPhotoUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }

    // Validate files before upload
    const validatedFiles = [];
    const errors = [];
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

    // Get list of valid admission numbers from current students
    const validAdmissionNumbers = students.map(s => s.admission_no?.toUpperCase());

    Array.from(selectedFiles).forEach((file) => {
      // File type validation
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Only JPEG and PNG are allowed.`);
        return;
      }

      // File size validation
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File size exceeds 2MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB).`);
        return;
      }

      // Filename validation (should match student admission number)
      const filename = file.name.split('.')[0].toUpperCase();
      if (!filename || filename.length < 3) {
        errors.push(`${file.name}: Filename must contain student admission number.`);
        return;
      }

      // Check if filename matches any student admission number
      const matchingStudent = validAdmissionNumbers.includes(filename);
      if (!matchingStudent) {
        errors.push(`${file.name}: No matching student found with admission number '${filename}'.`);
        return;
      }

      validatedFiles.push(file);
    });

    // Show validation errors
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      if (validatedFiles.length === 0) {
        return;
      }
      toast.warning(`${validatedFiles.length} valid files will be uploaded. ${errors.length} files rejected.`);
    }

    setLoading(true);
    setUploadProgress('Uploading...');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      validatedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await axios.post(`${API}/students/bulk-photo-upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const { uploaded_count, total_files, failed_uploads } = response.data;
      
      if (failed_uploads && failed_uploads.length > 0) {
        toast.warning(`Uploaded ${uploaded_count}/${total_files} photos. ${failed_uploads.length} failed.`);
        console.log('Failed uploads:', failed_uploads);
        
        // Show specific failure reasons
        failed_uploads.slice(0, 3).forEach((failure) => {
          toast.error(`${failure.filename}: ${failure.reason || 'Upload failed'}`);
        });
      } else {
        toast.success(`✅ Successfully uploaded ${uploaded_count} photo(s)!`);
      }

      setIsPhotoUploadModalOpen(false);
      setSelectedFiles([]);
      fetchData();
    } catch (error) {
      console.error('Failed to upload photos:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload photos');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleImportStudents = async () => {
    if (!importFile) {
      toast.error('Please select a file to import');
      return;
    }

    setLoading(true);
    setUploadProgress('Importing...');
    setImportErrors([]);
    setImportSummary(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await axios.post(`${API}/students/import`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const { imported_count, total_rows, failed_imports } = response.data;
      
      setImportSummary({
        imported_count,
        total_rows,
        failed_count: failed_imports.length
      });
      
      if (failed_imports.length > 0) {
        setImportErrors(failed_imports);
        if (imported_count > 0) {
          toast.warning(`Imported ${imported_count}/${total_rows} students. ${failed_imports.length} record(s) need attention.`);
        } else {
          toast.error(`Import failed for all ${failed_imports.length} record(s). Please review the errors below.`);
        }
      } else {
        toast.success(`Successfully imported all ${imported_count} students!`);
        setIsImportModalOpen(false);
        setImportFile(null);
      }
      
      fetchData();
    } catch (error) {
      console.error('Failed to import students:', error);
      toast.error(error.response?.data?.detail || 'Failed to import students');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const downloadSampleTemplate = (format = 'excel') => {
    // Sample data for student import template matching the user's Excel format
    const templateData = [
      {
        admission_no: 'HSS001',
        roll_no: '001',
        name: 'John Smith',
        gender: 'Male',
        date_of_birth: '2008-05-12',
        class_id: '8',
        section_id: 'A',
        father_name: 'Robert Smith',
        'F/phone': '9876543210',
        'F/ Whatsapp no': '9876543210',
        mother_name: 'Anna Smith',
        'M/phone': '9876543212',
        'M/whatsapp no': '9876543212',
        address: '123 Main Street, New York',
        'email id': 'john.smith@email.com',
        guardian_name: 'Robert Smith',
        guardian_phone: '9876543210'
      },
      {
        admission_no: 'HSS002',
        roll_no: '002',
        name: 'Sarah Johnson',
        gender: 'Female',
        date_of_birth: '2009-02-20',
        class_id: '8',
        section_id: 'A',
        father_name: 'David Johnson',
        'F/phone': '9876543211',
        'F/ Whatsapp no': '9876543211',
        mother_name: 'Linda Johnson',
        'M/phone': '9876543213',
        'M/whatsapp no': '9876543213',
        address: '456 Oak Avenue, California',
        'email id': 'sarah.johnson@email.com',
        guardian_name: 'David Johnson',
        guardian_phone: '9876543211'
      }
    ];

    if (format === 'excel') {
      // Create Excel workbook
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      
      // Set column widths for better readability
      worksheet['!cols'] = [
        { wch: 15 }, // admission_no
        { wch: 10 }, // roll_no
        { wch: 20 }, // name
        { wch: 10 }, // gender
        { wch: 15 }, // date_of_birth
        { wch: 10 }, // class_id
        { wch: 12 }, // section_id
        { wch: 18 }, // father_name
        { wch: 15 }, // F/phone
        { wch: 18 }, // F/ Whatsapp no
        { wch: 18 }, // mother_name
        { wch: 15 }, // M/phone
        { wch: 18 }, // M/whatsapp no
        { wch: 30 }, // address
        { wch: 25 }, // email id
        { wch: 18 }, // guardian_name
        { wch: 15 }  // guardian_phone
      ];
      
      // Download Excel file
      XLSX.writeFile(workbook, 'student_import_template.xlsx');
      toast.success('Excel template downloaded!');
    } else {
      // Create CSV
      const headers = Object.keys(templateData[0]).join(',');
      const rows = templateData.map(row => Object.values(row).join(','));
      const csvContent = [headers, ...rows].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'student_import_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV template downloaded!');
    }
  };

  const handleExport = async (format) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ format });
      
      if (selectedClass !== 'all_classes') {
        params.append('class_id', selectedClass);
      }
      if (selectedSection !== 'all_sections') {
        params.append('section_id', selectedSection);
      }

      const response = await axios.get(`${API}/students/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const fileExtension = format === 'csv' ? 'csv' : format === 'excel' ? 'xlsx' : 'pdf';
      link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.${fileExtension}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Students exported as ${format.toUpperCase()}`);
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Failed to export students:', error);
      toast.error(error.response?.data?.detail || 'Failed to export students');
    }
  };

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = !debouncedSearchTerm || 
        student.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        student.admission_no.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        student.roll_no.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesClass = selectedClass === 'all_classes' || student.class_id === selectedClass;
      const matchesSection = selectedSection === 'all_sections' || student.section_id === selectedSection;
      
      // Semester-based filtering (Madrasah hierarchy)
      const matchesMarhala = !selectedMarhalaId || student.marhala_id === selectedMarhalaId || student.class_id === selectedMarhalaId;
      const matchesDepartment = !selectedDepartmentId || student.department_id === selectedDepartmentId;
      const matchesSemester = !selectedSemesterId || student.semester_id === selectedSemesterId;
      
      return matchesSearch && matchesClass && matchesSection && matchesMarhala && matchesDepartment && matchesSemester;
    });
  }, [students, debouncedSearchTerm, selectedClass, selectedSection, selectedMarhalaId, selectedDepartmentId, selectedSemesterId]);

  const handleHierarchyChange = (selection) => {
    setSelectedMarhalaId(selection.marhala_id);
    setSelectedDepartmentId(selection.department_id);
    setSelectedSemesterId(selection.semester_id);
    // When using hierarchy selector, reset class/section filters
    if (selection.marhala_id || selection.department_id || selection.semester_id) {
      setSelectedClass('all_classes');
      setSelectedSection('all_sections');
    }
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? cls.name : 'অজানা';
  };

  const getSectionName = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : 'অজানা';
  };

  if (loading && students.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Add Student View
  if (currentView === 'add') {
    return (
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              তালিকায় ফিরে যান
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">নতুন ছাত্র যোগ করুন</h1>
              <p className="text-gray-600 mt-1">নিচে ছাত্রের তথ্য পূরণ করুন</p>
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="admission_no">ভর্তি নম্বর *</Label>
                  <Input
                    id="admission_no"
                    value={formData.admission_no}
                    onChange={(e) => setFormData({...formData, admission_no: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="roll_no">রোল নম্বর *</Label>
                  <Input
                    id="roll_no"
                    value={formData.roll_no}
                    onChange={(e) => setFormData({...formData, roll_no: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="student_identifier">ইউজার আইডি (ঐচ্ছিক)</Label>
                  <Input
                    id="student_identifier"
                    value={formData.student_identifier}
                    onChange={(e) => setFormData({...formData, student_identifier: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')})}
                    placeholder="যেমন: farid66"
                  />
                  <p className="text-xs text-muted-foreground mt-1">লগইনের জন্য ইউজার আইডি হবে: [মাদ্রাসা]_{formData.student_identifier || 'নাম থেকে স্বয়ংক্রিয়'}</p>
                </div>
                <div>
                  <Label htmlFor="name">পূর্ণ নাম *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="father_name">পিতার নাম *</Label>
                  <Input
                    id="father_name"
                    value={formData.father_name}
                    onChange={(e) => setFormData({...formData, father_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="mother_name">মাতার নাম *</Label>
                  <Input
                    id="mother_name"
                    value={formData.mother_name}
                    onChange={(e) => setFormData({...formData, mother_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date_of_birth">জন্ম তারিখ *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="gender">লিঙ্গ *</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="লিঙ্গ নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">পুরুষ</SelectItem>
                      <SelectItem value="Female">মহিলা</SelectItem>
                      <SelectItem value="Other">অন্যান্য</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Legacy Class/Section - only show when NOT using academic hierarchy in Madrasah mode */}
                {!(isMadrasahSimpleUI && academicHierarchy.marhalas?.length > 0) && (
                  <>
                    <div>
                      <Label htmlFor="class_id">মারহালা *</Label>
                      <Select 
                        value={formData.class_id} 
                        onValueChange={(value) => {
                          setFormData({...formData, class_id: value});
                          fetchSections(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="মারহালা নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name} ({cls.standard})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="section_id">শাখা *</Label>
                      <Select value={formData.section_id} onValueChange={(value) => setFormData({...formData, section_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="শাখা নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>
                              {section.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {/* Madrasha Academic Hierarchy - Cascaded Pickers (Primary for Madrasah mode) */}
                {isMadrasahSimpleUI && academicHierarchy.marhalas?.length > 0 && (
                  <>
                    <div className="md:col-span-2 mt-4 mb-2">
                      <div className="text-sm font-medium text-muted-foreground border-b pb-2">
                        একাডেমিক স্ট্রাকচার (মারহালা → বিভাগ → সেমিস্টার)
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="marhala_id">মারহালা</Label>
                      <Select 
                        value={formData.marhala_id} 
                        onValueChange={(value) => {
                          setFormData({...formData, marhala_id: value, department_id: '', semester_id: ''});
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="মারহালা নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicHierarchy.marhalas?.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name_bn || m.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="department_id">বিভাগ/জামাত</Label>
                      <Select 
                        value={formData.department_id} 
                        onValueChange={(value) => {
                          setFormData({...formData, department_id: value, semester_id: ''});
                        }}
                        disabled={!formData.marhala_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={formData.marhala_id ? "বিভাগ নির্বাচন করুন" : "প্রথমে মারহালা নির্বাচন করুন"} />
                        </SelectTrigger>
                        <SelectContent>
                          {getFilteredDepartments().map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name_bn || d.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="semester_id">সেমিস্টার</Label>
                      <Select 
                        value={formData.semester_id} 
                        onValueChange={(value) => {
                          setFormData({...formData, semester_id: value});
                        }}
                        disabled={!formData.department_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={formData.department_id ? "সেমিস্টার নির্বাচন করুন" : "প্রথমে বিভাগ নির্বাচন করুন"} />
                        </SelectTrigger>
                        <SelectContent>
                          {getFilteredAcademicSemesters().map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name_bn || s.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {/* Legacy semester enrollment - only show when NOT using academic hierarchy */}
                {!(isMadrasahSimpleUI && academicHierarchy.marhalas?.length > 0) && semesters.length > 0 && (
                  <div className="col-span-2">
                    <Label>সেমিস্টার ভর্তি (ভিডিও পাঠের জন্য)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                      {semesters.map((sem) => (
                        <label key={sem.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSemesterIds.includes(sem.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSemesterIds([...selectedSemesterIds, sem.id]);
                              } else {
                                setSelectedSemesterIds(selectedSemesterIds.filter(id => id !== sem.id));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm">{sem.title_bn} ({sem.class_name})</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">সেমিস্টারে ভর্তি করলে ছাত্র ভিডিও পাঠ দেখতে পারবে</p>
                  </div>
                )}
                <div>
                  <Label htmlFor="phone">ফোন নম্বর *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">ইমেইল</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">ঠিকানা *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guardian_name">অভিভাবকের নাম *</Label>
                  <Input
                    id="guardian_name"
                    value={formData.guardian_name}
                    onChange={(e) => setFormData({...formData, guardian_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guardian_phone">অভিভাবকের ফোন *</Label>
                  <Input
                    id="guardian_phone"
                    value={formData.guardian_phone}
                    onChange={(e) => setFormData({...formData, guardian_phone: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => navigate('/students')}>
                  বাতিল
                </Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
                  {loading ? 'সংরক্ষণ হচ্ছে...' : 'ছাত্র যোগ করুন'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Bulk Import View
  if (currentView === 'import') {
    return (
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              তালিকায় ফিরে যান
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">বাল্ক ছাত্র আমদানি</h1>
              <p className="text-gray-600 mt-1">CSV বা Excel ফাইল থেকে একাধিক ছাত্র আমদানি করুন</p>
            </div>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileUp className="h-5 w-5 text-emerald-500" />
              <span>ছাত্র ডাটা আপলোড</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">আপনার ফাইল আপলোড করুন</h3>
              <p className="text-gray-600 mb-4">এখানে CSV বা Excel ফাইল টেনে আনুন, বা ব্রাউজ করতে ক্লিক করুন</p>
              <Input 
                type="file" 
                accept=".csv,.xlsx,.xls" 
                className="max-w-xs mx-auto" 
                onChange={(e) => setImportFile(e.target.files[0])}
              />
              {importFile && (
                <p className="text-sm text-emerald-600 mt-2 font-medium">
                  ✓ Selected: {importFile.name}
                </p>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">ফাইল ফরম্যাট প্রয়োজনীয়তা:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>ফাইল CSV বা Excel ফরম্যাটে হতে হবে (.csv, .xlsx, .xls)</li>
                <li>প্রথম সারিতে কলাম হেডার থাকতে হবে</li>
                <li>প্রয়োজনীয় কলাম: admission_no, roll_no, name, father_name, mother_name, date_of_birth, gender, class_id, section_id, phone, email, address, guardian_name, guardian_phone</li>
                <li>তারিখ ফরম্যাট YYYY-MM-DD হতে হবে (যেমন: 2008-05-15)</li>
                <li>লিঙ্গ মান: Male বা Female</li>
              </ul>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => downloadSampleTemplate('excel')}>
                  <Download className="h-4 w-4 mr-2" />
                  Excel টেমপ্লেট ডাউনলোড
                </Button>
                <Button variant="outline" onClick={() => downloadSampleTemplate('csv')}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV টেমপ্লেট ডাউনলোড
                </Button>
              </div>
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={handleImportStudents}
                disabled={loading || !importFile}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadProgress || 'আমদানি শুরু করুন'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Photo Upload View
  if (currentView === 'photos') {
    return (
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              তালিকায় ফিরে যান
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ছাত্র ছবি আপলোড</h1>
              <p className="text-gray-600 mt-1">বাল্ক ছাত্রদের ছবি আপলোড করুন</p>
            </div>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-emerald-500" />
              <span>বাল্ক ছবি আপলোড</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">ছাত্রদের ছবি আপলোড করুন</h3>
              <p className="text-gray-600 mb-4">আপলোড করতে একাধিক ছবি নির্বাচন করুন। ফাইলের নাম ভর্তি নম্বর হওয়া উচিত।</p>
              <Input 
                type="file" 
                accept="image/*" 
                multiple 
                className="max-w-xs mx-auto"
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
              />
              {selectedFiles.length > 0 && (
                <p className="text-sm text-emerald-600 mt-2 font-medium">
                  ✓ Selected: {selectedFiles.length} photo(s)
                </p>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Photo Upload Guidelines:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Accepted formats: JPG, PNG, JPEG</li>
                <li>File name should match student's admission number (e.g., ADM001.jpg)</li>
                <li>Maximum file size: 2MB per photo</li>
                <li>Recommended dimensions: 300x400 pixels (passport size)</li>
                <li>Photos should have clear, well-lit faces</li>
              </ul>
            </div>
            <div className="flex justify-end">
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={handleBulkPhotoUpload}
                disabled={loading || selectedFiles.length === 0}
              >
                <Camera className="h-4 w-4 mr-2" />
                {uploadProgress || 'ছবি আপলোড করুন'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Student List View (default)
  return (
    <div className="space-y-4 sm:space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">ছাত্র তালিকা</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">ছাত্রদের তথ্য এবং রেকর্ড পরিচালনা করুন</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9" onClick={() => setIsPhotoUploadModalOpen(true)}>
            <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">বাল্ক </span>ছবি
          </Button>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            আমদানি
          </Button>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9" onClick={() => setIsExportModalOpen(true)}>
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            রপ্তানি
          </Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-xs sm:text-sm h-8 sm:h-9" onClick={() => { resetForm(); fetchNextAdmissionNumber(); setIsAddStudentModalOpen(true); }}>
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            যোগ করুন
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ছাত্র খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 text-sm"
                />
              </div>
            </div>
            
            {/* Academic Hierarchy Selector for Madrasah */}
            {isMadrasahSimpleUI && (
              <AcademicHierarchySelector 
                onSelectionChange={handleHierarchyChange}
                showAllOption={true}
                layout="horizontal"
              />
            )}
            
            {/* Legacy Class/Section Filter (for non-Madrasah or fallback) */}
            {!isMadrasahSimpleUI && (
              <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:flex sm:flex-row">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full sm:w-40 md:w-48 text-xs sm:text-sm">
                    <SelectValue placeholder="সকল মারহালা" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_classes">সকল মারহালা</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} ({cls.standard})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                  <SelectTrigger className="w-full sm:w-40 md:w-48 text-xs sm:text-sm">
                    <SelectValue placeholder="সকল শাখা" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_sections">সকল শাখা</SelectItem>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
              <span className="text-base sm:text-lg">ছাত্র তালিকা</span>
              <Badge variant="secondary" className="text-xs">{filteredStudents.length} ছাত্র</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-4">
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 sm:w-12 px-2 sm:px-4">#</TableHead>
                  <TableHead className="px-2 sm:px-4">ছাত্র</TableHead>
                  <TableHead className="px-2 sm:px-4 hidden sm:table-cell">ভর্তি নম্বর</TableHead>
                  <TableHead className="px-2 sm:px-4 hidden md:table-cell">রোল নম্বর</TableHead>
                  <TableHead className="px-2 sm:px-4">মারহালা</TableHead>
                  <TableHead className="px-2 sm:px-4 hidden lg:table-cell">অভিভাবক</TableHead>
                  <TableHead className="px-2 sm:px-4 hidden md:table-cell">যোগাযোগ</TableHead>
                  <TableHead className="px-2 sm:px-4">কার্যক্রম</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {searchTerm || selectedClass || selectedSection 
                        ? 'আপনার অনুসন্ধান অনুযায়ী কোনো ছাত্র পাওয়া যায়নি'
                        : 'এখনো কোনো ছাত্র যোগ করা হয়নি'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student, index) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium px-2 sm:px-4 text-xs sm:text-sm">{index + 1}</TableCell>
                      <TableCell className="px-2 sm:px-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                            <AvatarImage src={student.photo_url ? `${BASE_URL}${student.photo_url}` : ''} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs sm:text-sm">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{student.name}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[100px] sm:max-w-none">{student.father_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">{student.admission_no}</Badge>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs">{student.roll_no}</Badge>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4">
                        <div className="text-xs sm:text-sm">
                          <p className="font-medium">{getClassName(student.class_id)}</p>
                          <p className="text-gray-500 text-xs">Sec {getSectionName(student.section_id)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 hidden lg:table-cell">
                        <div className="text-xs sm:text-sm">
                          <p className="font-medium truncate max-w-[120px]">{student.guardian_name}</p>
                          <div className="flex items-center text-gray-500 text-xs">
                            <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{student.guardian_phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 hidden md:table-cell">
                        <div className="text-xs sm:text-sm">
                          <div className="flex items-center text-gray-500">
                            <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{student.phone}</span>
                          </div>
                          {student.email && (
                            <div className="flex items-center text-gray-500 mt-1">
                              <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate max-w-[100px]">{student.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 h-7 w-7 sm:h-8 sm:w-8 p-0"
                            onClick={() => {
                              setViewingStudent(student);
                              setIsViewModalOpen(true);
                            }}
                            title="দেখুন"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            onClick={() => handleEdit(student)}
                            title="সম্পাদনা"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 h-7 w-7 sm:h-8 sm:w-8 p-0"
                            onClick={() => handleDeleteClick(student)}
                            title="মুছুন"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Photo Upload Modal */}
      <Dialog open={isPhotoUploadModalOpen} onOpenChange={setIsPhotoUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-emerald-500" />
              <span>বাল্ক ছবি আপলোড</span>
            </DialogTitle>
            <DialogDescription>
              একসাথে একাধিক ছাত্রের ছবি আপলোড করুন। ফাইলের নাম ছাত্রের ভর্তি নম্বরের সাথে মিল থাকতে হবে।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="photo-files">ছবি নির্বাচন করুন</Label>
              <Input
                id="photo-files"
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                multiple
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="mt-2"
              />
              {selectedFiles && selectedFiles.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {selectedFiles.length}টি ফাইল নির্বাচিত
                </p>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-medium text-blue-900 text-sm mb-2">নির্দেশিকা:</h4>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>ফরম্যাট: JPG, PNG</li>
                <li>ফাইলের নাম = ভর্তি নম্বর (যেমন: ADM001.jpg)</li>
                <li>সর্বোচ্চ আকার: প্রতি ছবি 2MB</li>
                <li>প্রস্তাবিত: 300x400 পিক্সেল</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPhotoUploadModalOpen(false);
                setSelectedFiles([]);
              }}
            >
              বাতিল
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={handleBulkPhotoUpload}
              disabled={loading || !selectedFiles || selectedFiles.length === 0}
            >
              {uploadProgress || 'ছবি আপলোড করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Students Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={(open) => {
        setIsImportModalOpen(open);
        if (!open) {
          setImportErrors([]);
          setImportSummary(null);
          setImportFile(null);
        }
      }}>
        <DialogContent className={importErrors.length > 0 ? "max-w-2xl max-h-[80vh] overflow-y-auto" : "max-w-md"}>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-emerald-500" />
              <span>ছাত্র আমদানি</span>
            </DialogTitle>
            <DialogDescription>
              CSV বা Excel ফাইল থেকে ছাত্রের তথ্য আমদানি করুন।
            </DialogDescription>
          </DialogHeader>
          
          {/* আমদানি সারসংক্ষেপ */}
          {importSummary && (
            <div className={`p-4 rounded-lg border ${
              importSummary.failed_count === 0 
                ? 'bg-green-50 border-green-200' 
                : importSummary.imported_count > 0 
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-semibold ${
                    importSummary.failed_count === 0 
                      ? 'text-green-800' 
                      : importSummary.imported_count > 0 
                        ? 'text-amber-800'
                        : 'text-red-800'
                  }`}>
                    আমদানি সারসংক্ষেপ
                  </h4>
                  <p className="text-sm mt-1">
                    <span className="text-green-600 font-medium">{importSummary.imported_count} successful</span>
                    {importSummary.failed_count > 0 && (
                      <span className="text-red-600 font-medium ml-2">• {importSummary.failed_count} failed</span>
                    )}
                    <span className="text-gray-500 ml-2">/ {importSummary.total_rows} total</span>
                  </p>
                </div>
                {importSummary.failed_count === 0 && (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                )}
              </div>
            </div>
          )}

          {/* Error Details Table */}
          {importErrors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-red-800 mb-2 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Failed Records ({importErrors.length})
              </h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Row</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Admission No</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Student</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Issue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importErrors.map((error, index) => (
                      <tr key={index} className="hover:bg-red-50">
                        <td className="px-3 py-2 text-gray-600">{error.row}</td>
                        <td className="px-3 py-2 font-mono text-xs">{error.admission_no}</td>
                        <td className="px-3 py-2 text-gray-800">{error.student_name || 'Unknown'}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-start space-x-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              error.error_type === 'duplicate' 
                                ? 'bg-orange-100 text-orange-800'
                                : error.error_type === 'missing_fields'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {error.error_type === 'duplicate' ? 'Duplicate' : 
                               error.error_type === 'missing_fields' ? 'Missing Data' : 'Error'}
                            </span>
                          </div>
                          <p className="text-red-600 text-xs mt-1">{error.error}</p>
                          {error.suggestion && (
                            <p className="text-gray-500 text-xs mt-0.5 italic">{error.suggestion}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Please fix these issues in your file and re-upload, or add these students manually.
              </p>
            </div>
          )}

          {/* File Upload Section - only show if no errors or before upload */}
          {importErrors.length === 0 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="import-file">Select File</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="text-emerald-600 hover:text-emerald-700 text-sm p-0 h-auto"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const response = await axios.get(`${API}/download/student-import-sample?format=excel`, {
                          responseType: 'blob',
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        });
                        
                        const blob = new Blob([response.data], { 
                          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                        });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'student_import_sample.xlsx';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        toast.success('Sample Excel template downloaded successfully');
                      } catch (error) {
                        console.error('Download failed:', error);
                        toast.error('Failed to download template');
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    স্যাম্পল Excel ডাউনলোড
                  </Button>
                </div>
                <Input
                  id="import-file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="mt-2"
                />
                {importFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {importFile.name}
                  </p>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h4 className="font-medium text-amber-900 text-sm mb-2">Required Columns:</h4>
                <p className="text-xs text-amber-800">
                  admission_no, roll_no, name, gender, date_of_birth, class_id, section_id, 
                  father_name, F/phone, mother_name, address, guardian_name, guardian_phone
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  ঐচ্ছিক: পিতার হোয়াটসঅ্যাপ নং, মাতার ফোন, মাতার হোয়াটসঅ্যাপ নং, ইমেইল
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            {importErrors.length > 0 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportErrors([]);
                    setImportSummary(null);
                    setImportFile(null);
                  }}
                >
                  নতুন ফাইল আপলোড
                </Button>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportErrors([]);
                    setImportSummary(null);
                    setImportFile(null);
                  }}
                >
                  বন্ধ করুন
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportFile(null);
                  }}
                >
                  বাতিল
                </Button>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={handleImportStudents}
                  disabled={loading || !importFile}
                >
                  {uploadProgress || 'ছাত্র আমদানি'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Modal */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-emerald-500" />
              <span>ছাত্র রপ্তানি</span>
            </DialogTitle>
            <DialogDescription>
              আপনার পছন্দের ফরম্যাটে ছাত্র তালিকা ডাউনলোড করুন।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              বর্তমান ফিল্টার: {selectedClass !== 'all_classes' || selectedSection !== 'all_sections' 
                ? 'ফিল্টার করা ডাটা রপ্তানি হবে' 
                : 'সকল ছাত্র রপ্তানি হবে'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex flex-col items-center py-6 h-auto hover:border-emerald-500"
                onClick={() => handleExport('csv')}
              >
                <FileUp className="h-8 w-8 mb-2 text-blue-500" />
                <span className="text-sm font-medium">CSV</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center py-6 h-auto hover:border-emerald-500"
                onClick={() => handleExport('excel')}
              >
                <FileUp className="h-8 w-8 mb-2 text-green-500" />
                <span className="text-sm font-medium">Excel</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center py-6 h-auto hover:border-emerald-500"
                onClick={() => handleExport('pdf')}
              >
                <FileUp className="h-8 w-8 mb-2 text-red-500" />
                <span className="text-sm font-medium">PDF</span>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsExportModalOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Modal */}
      <Dialog open={isAddStudentModalOpen} onOpenChange={setIsAddStudentModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>নতুন ছাত্র যোগ করুন</DialogTitle>
            <DialogDescription>
              নিচে ছাত্রের তথ্য দিন। * চিহ্নিত ঘর অবশ্যই পূরণ করতে হবে।
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Enhanced Sohoj Form */}
            {isMadrasahSimpleUI ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="add_name" className="text-base font-semibold">ছাত্রের নাম *</Label>
                  <Input
                    id="add_name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="ছাত্রের পুরো নাম লিখুন"
                    className="text-lg py-3"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="add_father_name" className="text-base font-semibold">পিতার নাম *</Label>
                  <Input
                    id="add_father_name"
                    value={formData.father_name}
                    onChange={(e) => setFormData({...formData, father_name: e.target.value})}
                    placeholder="পিতার নাম লিখুন"
                    className="text-lg py-3"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="add_phone" className="text-base font-semibold">মোবাইল নম্বর *</Label>
                  <Input
                    id="add_phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="০১XXXXXXXXX"
                    className="text-lg py-3"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="add_guardian_name_simple" className="text-base font-semibold">অভিভাবকের নাম *</Label>
                  <Input
                    id="add_guardian_name_simple"
                    value={formData.guardian_name}
                    onChange={(e) => setFormData({...formData, guardian_name: e.target.value})}
                    placeholder="অভিভাবকের নাম লিখুন"
                    className="text-lg py-3"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="add_guardian_phone_simple" className="text-base font-semibold">অভিভাবকের ফোন *</Label>
                  <Input
                    id="add_guardian_phone_simple"
                    value={formData.guardian_phone}
                    onChange={(e) => setFormData({...formData, guardian_phone: e.target.value})}
                    placeholder="০১XXXXXXXXX"
                    className="text-lg py-3"
                    required
                  />
                </div>
                {/* Academic Hierarchy - Marhala → Department → Semester */}
                <div>
                  <Label htmlFor="add_marhala_id" className="text-base font-semibold">মারহালা *</Label>
                  <Select 
                    value={formData.marhala_id} 
                    onValueChange={(value) => {
                      setFormData({...formData, marhala_id: value, department_id: '', semester_id: ''});
                    }}
                  >
                    <SelectTrigger className="text-lg py-3">
                      <SelectValue placeholder="মারহালা নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicHierarchy.marhalas?.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          কোনো মারহালা পাওয়া যায়নি। প্রথমে সেটিংস থেকে মারহালা যোগ করুন।
                        </div>
                      ) : (
                        academicHierarchy.marhalas?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name_bn || m.name_en || m.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {formData.marhala_id && (
                  <div>
                    <Label htmlFor="add_department_id" className="text-base font-semibold">বিভাগ/জামাত</Label>
                    <Select 
                      value={formData.department_id} 
                      onValueChange={(value) => {
                        setFormData({...formData, department_id: value, semester_id: ''});
                      }}
                    >
                      <SelectTrigger className="text-lg py-3">
                        <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredDepartments().map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name_bn || d.name_en || d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.department_id && (
                  <div>
                    <Label htmlFor="add_semester_id" className="text-base font-semibold">সেমিস্টার *</Label>
                    <Select 
                      value={formData.semester_id} 
                      onValueChange={(value) => {
                        setFormData({...formData, semester_id: value});
                        if (autoRoll) {
                          fetchNextRollNumber(null, null, value);
                        }
                      }}
                    >
                      <SelectTrigger className="text-lg py-3">
                        <SelectValue placeholder="সেমিস্টার নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredAcademicSemesters().map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name_bn || s.name_en || s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="add_roll_no" className="text-base font-semibold">রোল নম্বর *</Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAutoRoll(true);
                          autoRollRef.current = true;
                          setRollDuplicateWarning(null);
                          // Fetch roll based on semester_id or class_id
                          if (formData.semester_id) {
                            fetchNextRollNumber(null, null, formData.semester_id);
                          } else if (formData.class_id) {
                            fetchNextRollNumber(formData.class_id, formData.section_id);
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded ${autoRoll ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                      >
                        স্বয়ংক্রিয়
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAutoRoll(false);
                          autoRollRef.current = false;
                          setFormData(prev => ({ ...prev, roll_no: '' }));
                        }}
                        className={`px-2 py-1 text-xs rounded ${!autoRoll ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                      >
                        ম্যানুয়াল
                      </button>
                    </div>
                  </div>
                  <Input
                    id="add_roll_no"
                    value={formData.roll_no}
                    onChange={(e) => {
                      const newRoll = e.target.value;
                      setFormData({...formData, roll_no: newRoll});
                      if (!autoRoll && formData.class_id && newRoll) {
                        checkRollDuplicate(formData.class_id, newRoll, formData.section_id);
                      }
                    }}
                    placeholder={autoRoll ? "সেমিস্টার নির্বাচন করলে স্বয়ংক্রিয়ভাবে হবে" : "যেমন: ১, ২, ৩..."}
                    className={`text-lg py-3 ${autoRoll ? 'bg-gray-50' : ''}`}
                    readOnly={autoRoll}
                    required
                  />
                  {rollDuplicateWarning && (
                    <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {rollDuplicateWarning}
                    </p>
                  )}
                  {isCheckingRoll && (
                    <p className="text-xs text-gray-500 mt-1">যাচাই করা হচ্ছে...</p>
                  )}
                </div>
                
                {/* Gender field - visible in main form */}
                <div>
                  <Label htmlFor="add_gender" className="text-base font-semibold">লিঙ্গ</Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(value) => setFormData({...formData, gender: value})}
                  >
                    <SelectTrigger className="text-lg py-3">
                      <SelectValue placeholder="লিঙ্গ নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">পুরুষ</SelectItem>
                      <SelectItem value="female">মহিলা</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date of Birth field - visible in main form */}
                <div>
                  <Label htmlFor="add_dob" className="text-base font-semibold">জন্ম তারিখ</Label>
                  <Input
                    id="add_dob"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                    className="text-lg py-3"
                  />
                </div>

                {/* Address field - visible in main form */}
                <div>
                  <Label htmlFor="add_address_main" className="text-base font-semibold">ঠিকানা</Label>
                  <Input
                    id="add_address_main"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="গ্রাম, থানা, জেলা"
                    className="text-lg py-3"
                  />
                </div>

                {/* Photo Upload - Required */}
                <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg bg-gray-50">
                  <Label className="text-base font-semibold">ছবি *</Label>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Student" className="w-24 h-24 rounded-full object-cover border-4 border-emerald-200" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <Label htmlFor="student-photo-simple" className="cursor-pointer px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
                    {photoPreview ? 'ছবি পরিবর্তন করুন' : 'ছবি আপলোড করুন'}
                    <Input
                      id="student-photo-simple"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </Label>
                  {!photoPreview && (
                    <p className="text-xs text-red-500">ছবি আপলোড করা আবশ্যক</p>
                  )}
                </div>
                
                {/* Optional fields collapsed */}
                <details className="border rounded-lg p-3">
                  <summary className="cursor-pointer text-sm text-muted-foreground">ঐচ্ছিক তথ্য (ক্লিক করুন)</summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label htmlFor="add_email">ইমেইল</Label>
                      <Input
                        id="add_email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="example@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="add_father_whatsapp">পিতার হোয়াটসঅ্যাপ</Label>
                      <Input
                        id="add_father_whatsapp"
                        value={formData.father_whatsapp}
                        onChange={(e) => setFormData({...formData, father_whatsapp: e.target.value})}
                        placeholder="হোয়াটসঅ্যাপ নম্বর"
                      />
                    </div>
                  </div>
                </details>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                <p>সহজ ফর্ম শুধুমাত্র মাদ্রাসা মোডে উপলব্ধ।</p>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddStudentModalOpen(false);
                  resetForm();
                }}
              >
                বাতিল
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
                {loading ? 'সংরক্ষণ হচ্ছে...' : 'ছাত্র যোগ করুন'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Section Modal */}
      <Dialog open={isQuickAddSectionModalOpen} onOpenChange={setIsQuickAddSectionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>নতুন শাখা যোগ করুন</DialogTitle>
            <DialogDescription>
              {classes.find(c => c.id === formData.class_id)?.name || 'নির্বাচিত মারহালা'}-এর জন্য একটি শাখা যোগ করুন।
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickAddSection} className="space-y-4">
            <div>
              <Label htmlFor="quick_section_name">শাখার নাম *</Label>
              <Input
                id="quick_section_name"
                value={quickSectionData.name}
                onChange={(e) => setQuickSectionData({...quickSectionData, name: e.target.value})}
                placeholder="যেমন: ক, খ, গ"
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="quick_max_students">সর্বোচ্চ ছাত্র সংখ্যা</Label>
              <Input
                id="quick_max_students"
                type="number"
                min="1"
                value={quickSectionData.max_students}
                onChange={(e) => setQuickSectionData({...quickSectionData, max_students: e.target.value})}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsQuickAddSectionModalOpen(false);
                  setQuickSectionData({ name: '', max_students: 40 });
                }}
              >
                বাতিল
              </Button>
              <Button 
                type="submit" 
                className="bg-emerald-500 hover:bg-emerald-600" 
                disabled={isSavingSection}
              >
                {isSavingSection ? 'যোগ হচ্ছে...' : 'শাখা যোগ করুন'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">ছাত্র মুছুন</DialogTitle>
            <DialogDescription>
              আপনি কি নিশ্চিত যে এই ছাত্রকে মুছতে চান?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {studentToDelete && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm"><span className="font-semibold">নাম:</span> {studentToDelete.name}</p>
                <p className="text-sm"><span className="font-semibold">ভর্তি নম্বর:</span> {studentToDelete.admission_no}</p>
                <p className="text-sm"><span className="font-semibold">রোল নম্বর:</span> {studentToDelete.roll_no}</p>
              </div>
            )}
            <p className="text-sm text-red-600 mt-4 font-medium">
              ⚠️ এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setStudentToDelete(null);
              }}
              disabled={loading}
            >
              বাতিল
            </Button>
            <Button 
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'মুছা হচ্ছে...' : 'ছাত্র মুছুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Credentials Modal */}
      <Dialog open={isCredentialsModalOpen} onOpenChange={setIsCredentialsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-emerald-600">
              <Check className="h-5 w-5" />
              <span>ছাত্রের অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!</span>
            </DialogTitle>
            <DialogDescription>
              এই ছাত্রের জন্য স্বয়ংক্রিয়ভাবে একটি লগইন অ্যাকাউন্ট তৈরি হয়েছে। অনুগ্রহ করে এই তথ্য ছাত্র বা অভিভাবকের সাথে শেয়ার করুন।
            </DialogDescription>
          </DialogHeader>
          {studentCredentials && (
            <div className="py-4 space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ছাত্রের নাম:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{studentCredentials.studentName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ভর্তি নম্বর:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{studentCredentials.admissionNo}</span>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3 border-2 border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 text-center">লগইন তথ্য</h4>
                <div className="flex justify-between items-center py-2 border-b border-blue-100 dark:border-blue-800">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ব্যবহারকারীর নাম:</span>
                  <code className="bg-white dark:bg-gray-800 px-3 py-1 rounded font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{studentCredentials.username}</code>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">অস্থায়ী পাসওয়ার্ড:</span>
                  <code className="bg-white dark:bg-gray-800 px-3 py-1 rounded font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{studentCredentials.temporary_password}</code>
                </div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-300 flex items-start">
                  <span className="mr-2">⚠️</span>
                  <span>{studentCredentials.message}</span>
                </p>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const text = `Student Login Credentials\n\nStudent: ${studentCredentials.studentName}\nAdmission No: ${studentCredentials.admissionNo}\nUsername: ${studentCredentials.username}\nPassword: ${studentCredentials.temporary_password}\n\nPlease change password on first login.`;
                    navigator.clipboard.writeText(text);
                    toast.success('Credentials copied to clipboard!');
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  তথ্য কপি করুন
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setIsCredentialsModalOpen(false);
                setStudentCredentials(null);
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              সম্পন্ন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Student Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-emerald-500" />
              <span>ছাত্রের বিবরণ</span>
            </DialogTitle>
          </DialogHeader>
          {viewingStudent && (
            <div id="student-print-content" className="space-y-6">
              {/* Student Header */}
              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={viewingStudent.photo_url ? `${BASE_URL}${viewingStudent.photo_url}` : ''} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl">
                    {viewingStudent.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{viewingStudent.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline">{viewingStudent.admission_no}</Badge>
                    <Badge variant="secondary">Roll: {viewingStudent.roll_no}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {getClassName(viewingStudent.class_id)} - Section {getSectionName(viewingStudent.section_id)}
                  </p>
                </div>
              </div>

              {/* ব্যক্তিগত তথ্য */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2 text-emerald-500" />
                    ব্যক্তিগত তথ্য
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gender:</span>
                      <span className="font-medium">{viewingStudent.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date of Birth:</span>
                      <span className="font-medium">{viewingStudent.date_of_birth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium">{viewingStudent.email || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium">{viewingStudent.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Home className="h-4 w-4 mr-2 text-emerald-500" />
                    Address
                  </h4>
                  <p className="text-sm text-gray-700">{viewingStudent.address || '-'}</p>
                </div>
              </div>

              {/* Father's Information */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Father's Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{viewingStudent.father_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <p className="font-medium">{viewingStudent.father_phone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">WhatsApp:</span>
                    <p className="font-medium">{viewingStudent.father_whatsapp || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Mother's Information */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Mother's Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{viewingStudent.mother_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <p className="font-medium">{viewingStudent.mother_phone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">WhatsApp:</span>
                    <p className="font-medium">{viewingStudent.mother_whatsapp || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Guardian Information */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Guardian Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium">{viewingStudent.guardian_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <p className="font-medium">{viewingStudent.guardian_phone}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
              onClick={() => {
                setIsViewModalOpen(false);
                navigate(`/results?student_id=${viewingStudent?.id}&class_id=${viewingStudent?.class_id}&section_id=${viewingStudent?.section_id}`);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Results
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const printContent = document.getElementById('student-print-content');
                if (printContent) {
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Student Details - ${viewingStudent?.name}</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; }
                          .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding: 16px; background: #f0fdf4; border-radius: 8px; }
                          .avatar { width: 80px; height: 80px; border-radius: 50%; background: #d1fae5; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #047857; }
                          .name { font-size: 20px; font-weight: bold; }
                          .badge { display: inline-block; padding: 2px 8px; background: #e5e7eb; border-radius: 4px; margin-right: 8px; font-size: 12px; }
                          .section { margin: 16px 0; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
                          .section h4 { margin: 0 0 12px 0; font-weight: 600; }
                          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
                          .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
                          .label { color: #6b7280; font-size: 12px; }
                          .value { font-weight: 500; }
                          @media print { body { padding: 0; } }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <div class="avatar">${viewingStudent?.name?.split(' ').map(n => n[0]).join('')}</div>
                          <div>
                            <div class="name">${viewingStudent?.name}</div>
                            <div><span class="badge">${viewingStudent?.admission_no}</span><span class="badge">Roll: ${viewingStudent?.roll_no}</span></div>
                            <div style="color: #6b7280; margin-top: 4px;">${getClassName(viewingStudent?.class_id)} - Section ${getSectionName(viewingStudent?.section_id)}</div>
                          </div>
                        </div>
                        
                        <div class="section">
                          <h4>ব্যক্তিগত তথ্য</h4>
                          <div class="grid-2">
                            <div><div class="label">Gender</div><div class="value">${viewingStudent?.gender}</div></div>
                            <div><div class="label">Date of Birth</div><div class="value">${viewingStudent?.date_of_birth}</div></div>
                            <div><div class="label">Email</div><div class="value">${viewingStudent?.email || '-'}</div></div>
                            <div><div class="label">Phone</div><div class="value">${viewingStudent?.phone}</div></div>
                          </div>
                        </div>
                        
                        <div class="section">
                          <h4>Address</h4>
                          <p>${viewingStudent?.address || '-'}</p>
                        </div>
                        
                        <div class="section">
                          <h4>Father's Information</h4>
                          <div class="grid">
                            <div><div class="label">Name</div><div class="value">${viewingStudent?.father_name}</div></div>
                            <div><div class="label">Phone</div><div class="value">${viewingStudent?.father_phone || '-'}</div></div>
                            <div><div class="label">WhatsApp</div><div class="value">${viewingStudent?.father_whatsapp || '-'}</div></div>
                          </div>
                        </div>
                        
                        <div class="section">
                          <h4>Mother's Information</h4>
                          <div class="grid">
                            <div><div class="label">Name</div><div class="value">${viewingStudent?.mother_name}</div></div>
                            <div><div class="label">Phone</div><div class="value">${viewingStudent?.mother_phone || '-'}</div></div>
                            <div><div class="label">WhatsApp</div><div class="value">${viewingStudent?.mother_whatsapp || '-'}</div></div>
                          </div>
                        </div>
                        
                        <div class="section">
                          <h4>অভিভাবকের তথ্য</h4>
                          <div class="grid-2">
                            <div><div class="label">Name</div><div class="value">${viewingStudent?.guardian_name}</div></div>
                            <div><div class="label">Phone</div><div class="value">${viewingStudent?.guardian_phone}</div></div>
                          </div>
                        </div>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                }
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              প্রিন্ট
            </Button>
            <Button onClick={() => setIsViewModalOpen(false)}>
              বন্ধ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog - Same style as Add form */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className={`${isMadrasahSimpleUI ? 'max-w-lg' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle>ছাত্র সম্পাদনা</DialogTitle>
            <DialogDescription>
              ছাত্রের তথ্য আপডেট করুন। * চিহ্নিত ঘর অবশ্যই পূরণ করতে হবে।
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Madrasah Simple Edit Form */}
            {isMadrasahSimpleUI ? (
              <div className="space-y-4">
                {/* Photo Section */}
                <div className="flex flex-col items-center space-y-2 pb-4 border-b">
                  {photoPreview || editingStudent?.photo_url ? (
                    <img 
                      src={photoPreview || (editingStudent?.photo_url ? `${BASE_URL}${editingStudent.photo_url}` : '')} 
                      alt="Student" 
                      className="w-20 h-20 rounded-full object-cover border-4 border-emerald-100"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                      <Camera className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <Label htmlFor="edit-student-photo-simple" className="cursor-pointer text-emerald-600 text-sm">
                    {photoPreview || editingStudent?.photo_url ? 'ছবি পরিবর্তন' : 'ছবি আপলোড'}
                    <Input
                      id="edit-student-photo-simple"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </Label>
                </div>
                
                <div>
                  <Label htmlFor="edit_name" className="text-base font-semibold">ছাত্রের নাম *</Label>
                  <Input
                    id="edit_name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="ছাত্রের পুরো নাম লিখুন"
                    className="text-lg py-3"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit_father_name" className="text-base font-semibold">পিতার নাম *</Label>
                  <Input
                    id="edit_father_name"
                    value={formData.father_name}
                    onChange={(e) => setFormData({...formData, father_name: e.target.value})}
                    placeholder="পিতার নাম লিখুন"
                    className="text-lg py-3"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit_phone" className="text-base font-semibold">মোবাইল নম্বর *</Label>
                  <Input
                    id="edit_phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="০১XXXXXXXXX"
                    className="text-lg py-3"
                    required
                  />
                </div>
                {/* Academic Hierarchy - Marhala → Department → Semester */}
                <div>
                  <Label htmlFor="edit_marhala_id" className="text-base font-semibold">মারহালা *</Label>
                  <Select 
                    value={formData.marhala_id} 
                    onValueChange={(value) => {
                      setFormData({...formData, marhala_id: value, department_id: '', semester_id: ''});
                    }}
                  >
                    <SelectTrigger className="text-lg py-3">
                      <SelectValue placeholder="মারহালা নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicHierarchy.marhalas?.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          কোনো মারহালা পাওয়া যায়নি।
                        </div>
                      ) : (
                        academicHierarchy.marhalas?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name_bn || m.name_en || m.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {formData.marhala_id && (
                  <div>
                    <Label htmlFor="edit_department_id" className="text-base font-semibold">বিভাগ/জামাত</Label>
                    <Select 
                      value={formData.department_id} 
                      onValueChange={(value) => {
                        setFormData({...formData, department_id: value, semester_id: ''});
                      }}
                    >
                      <SelectTrigger className="text-lg py-3">
                        <SelectValue placeholder="বিভাগ নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredDepartments().map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name_bn || d.name_en || d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.department_id && (
                  <div>
                    <Label htmlFor="edit_semester_id" className="text-base font-semibold">সেমিস্টার *</Label>
                    <Select 
                      value={formData.semester_id} 
                      onValueChange={(value) => {
                        setFormData({...formData, semester_id: value});
                      }}
                    >
                      <SelectTrigger className="text-lg py-3">
                        <SelectValue placeholder="সেমিস্টার নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredAcademicSemesters().map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name_bn || s.name_en || s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label htmlFor="edit_roll_no" className="text-base font-semibold">রোল নম্বর *</Label>
                  <Input
                    id="edit_roll_no"
                    value={formData.roll_no}
                    onChange={(e) => setFormData({...formData, roll_no: e.target.value})}
                    placeholder="যেমন: ১, ২, ৩..."
                    className="text-lg py-3"
                    required
                  />
                </div>
                
                {/* Optional fields collapsed */}
                <details className="border rounded-lg p-3">
                  <summary className="cursor-pointer text-sm text-muted-foreground">অতিরিক্ত তথ্য (ক্লিক করুন)</summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label htmlFor="edit_admission_no">ভর্তি নম্বর</Label>
                      <Input
                        id="edit_admission_no"
                        value={formData.admission_no}
                        onChange={(e) => setFormData({...formData, admission_no: e.target.value})}
                        placeholder="ভর্তি নম্বর"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_email">ইমেইল</Label>
                      <Input
                        id="edit_email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="example@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_father_whatsapp">পিতার হোয়াটসঅ্যাপ</Label>
                      <Input
                        id="edit_father_whatsapp"
                        value={formData.father_whatsapp}
                        onChange={(e) => setFormData({...formData, father_whatsapp: e.target.value})}
                        placeholder="হোয়াটসঅ্যাপ নম্বর"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_mother_name">মাতার নাম</Label>
                      <Input
                        id="edit_mother_name"
                        value={formData.mother_name}
                        onChange={(e) => setFormData({...formData, mother_name: e.target.value})}
                        placeholder="মাতার নাম"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_address">ঠিকানা</Label>
                      <Input
                        id="edit_address"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        placeholder="গ্রাম, থানা, জেলা"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_date_of_birth">জন্ম তারিখ</Label>
                      <Input
                        id="edit_date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_gender">লিঙ্গ</Label>
                      <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="লিঙ্গ নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">পুরুষ</SelectItem>
                          <SelectItem value="Female">মহিলা</SelectItem>
                          <SelectItem value="Other">অন্যান্য</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </details>
              </div>
            ) : (
              /* Full Edit Form for non-Madrasah */
              <>
                <div className="flex flex-col items-center space-y-3 pb-4 border-b">
                  <div className="relative">
                    {photoPreview || editingStudent?.photo_url ? (
                      <img 
                        src={photoPreview || (editingStudent?.photo_url ? `${BASE_URL}${editingStudent.photo_url}` : '')} 
                        alt="Student" 
                        className="w-24 h-24 rounded-full object-cover border-4 border-emerald-100"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                        <Camera className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <Label htmlFor="edit-student-photo" className="cursor-pointer">
                    <div className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700">
                      <Camera className="h-4 w-4" />
                      <span>{photoPreview || editingStudent?.photo_url ? 'Change Photo' : 'Upload Photo'}</span>
                    </div>
                    <Input
                      id="edit-student-photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admission_no">ভর্তি নম্বর *</Label>
                    <Input
                      id="admission_no"
                      value={formData.admission_no}
                      onChange={(e) => setFormData({...formData, admission_no: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="roll_no">রোল নম্বর *</Label>
                    <Input
                      id="roll_no"
                      value={formData.roll_no}
                      onChange={(e) => setFormData({...formData, roll_no: e.target.value})}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="name">পূর্ণ নাম *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="father_name">পিতার নাম *</Label>
                    <Input
                      id="father_name"
                      value={formData.father_name}
                      onChange={(e) => setFormData({...formData, father_name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_father_phone">পিতার ফোন</Label>
                    <Input
                      id="edit_father_phone"
                      value={formData.father_phone}
                      onChange={(e) => setFormData({...formData, father_phone: e.target.value})}
                      placeholder="পিতার ফোন নম্বর"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mother_name">মাতার নাম *</Label>
                    <Input
                      id="mother_name"
                      value={formData.mother_name}
                      onChange={(e) => setFormData({...formData, mother_name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">জন্ম তারিখ *</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">লিঙ্গ *</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="লিঙ্গ নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="class_id">মারহালা *</Label>
                    <Select 
                      value={formData.class_id} 
                      onValueChange={(value) => {
                        setFormData({...formData, class_id: value, section_id: ''});
                        fetchSections(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="মারহালা নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} ({cls.standard})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="section_id">শাখা</Label>
                    <Select 
                      value={formData.section_id} 
                      onValueChange={(value) => setFormData({...formData, section_id: value})}
                      disabled={!formData.class_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="শাখা নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="phone">ফোন *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">ইমেইল</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">ঠিকানা *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardian_name">অভিভাবকের নাম</Label>
                    <Input
                      id="guardian_name"
                      value={formData.guardian_name}
                      onChange={(e) => setFormData({...formData, guardian_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardian_phone">অভিভাবকের ফোন</Label>
                    <Input
                      id="guardian_phone"
                      value={formData.guardian_phone}
                      onChange={(e) => setFormData({...formData, guardian_phone: e.target.value})}
                    />
                  </div>
                </div>
              </>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingStudent(null);
                  resetForm();
                }}
              >
                বাতিল
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={isSubmitting}>
                {isSubmitting 
                  ? 'সংরক্ষণ হচ্ছে...' 
                  : 'আপডেট করুন'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentList;