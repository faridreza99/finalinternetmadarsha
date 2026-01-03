import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  FileText, Plus, Trash2, Search, Printer, Save, Eye, 
  ChevronDown, ChevronUp, GripVertical, X, BookOpen, Sparkles, Loader2,
  Pencil, Check
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';

const QuestionPaperBuilder = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [newQuestionInputs, setNewQuestionInputs] = useState({});
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState(null);
  
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sectionTemplates, setSectionTemplates] = useState([]);
  const [printData, setPrintData] = useState(null);
  
  const [paperForm, setPaperForm] = useState({
    title_bn: 'বার্ষিক পরীক্ষা',
    title_en: 'Annual Examination',
    class_name: '',
    subject: '',
    exam_year: new Date().getFullYear().toString(),
    duration_minutes: 120,
    total_marks: 100,
    sections: []
  });

  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [classRules, setClassRules] = useState(null);
  
  const sectionOptions = [
    { id: 'one_word', name_bn: 'একশব্দে উত্তর', name_en: 'One Word Answer', default_marks: 1 },
    { id: 'fill_blanks', name_bn: 'শূন্যস্থান পূরণ', name_en: 'Fill in the Blanks', default_marks: 1 },
    { id: 'true_false', name_bn: 'সত্য/মিথ্যা', name_en: 'True/False', default_marks: 1 },
    { id: 'mcq', name_bn: 'বহুনির্বাচনী প্রশ্ন', name_en: 'MCQ', default_marks: 1 },
    { id: 'short_answer', name_bn: 'সংক্ষেপে উত্তর', name_en: 'Short Answer', default_marks: 2 },
    { id: 'matching', name_bn: 'মিলকরণ', name_en: 'Matching', default_marks: 1 },
    { id: 'descriptive', name_bn: 'রচনামূলক প্রশ্ন', name_en: 'Descriptive', default_marks: 5 },
    { id: 'application', name_bn: 'প্রয়োগমূলক প্রশ্ন', name_en: 'Application Based', default_marks: 5 }
  ];

  const [aiForm, setAiForm] = useState({
    class_name: '',
    subject: '',
    total_marks: 100,
    duration_minutes: 120,
    exam_type: 'বার্ষিক পরীক্ষা',
    difficulty_mix: 'balanced',
    section_config: {
      one_word: { enabled: true, question_count: 5 },
      fill_blanks: { enabled: true, question_count: 5 },
      true_false: { enabled: true, question_count: 5 },
      short_answer: { enabled: true, question_count: 5 },
      descriptive: { enabled: true, question_count: 5 }
    }
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

  const fetchPapers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/question-papers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPapers(response.data.papers || []);
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  const fetchClasses = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }, [API_BASE_URL]);

  const fetchSubjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const subjectList = response.data || [];
      const normalized = subjectList.map(sub => ({
        ...sub,
        name: sub.name || sub.subject_name
      }));
      setSubjects(normalized);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, [API_BASE_URL]);

  const fetchTemplates = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/question-paper/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSectionTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, [API_BASE_URL]);


  const fetchClassRules = useCallback(async (className) => {
    if (!className) {
      setClassRules(null);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/question-papers/class-rules?class_name=${encodeURIComponent(className)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rules = response.data.rules;
      setClassRules(rules);
      
      // Dynamically update section_config based on allowed question types
      if (rules?.allowed_question_types) {
        setAiForm(prev => {
          const newSectionConfig = { ...prev.section_config };
          // Reset all sections, only enable allowed ones
          sectionOptions.forEach(section => {
            const isAllowed = rules.allowed_question_types.includes(section.id);
            if (newSectionConfig[section.id]) {
              newSectionConfig[section.id] = {
                ...newSectionConfig[section.id],
                enabled: isAllowed && newSectionConfig[section.id].enabled
              };
            } else if (isAllowed) {
              // Enable default sections for this class
              newSectionConfig[section.id] = { enabled: true, question_count: 5 };
            }
          });
          return { ...prev, section_config: newSectionConfig };
        });
      }
    } catch (error) {
      console.error('Error fetching class rules:', error);
    }
  }, [API_BASE_URL, sectionOptions]);
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role || '');
  }, []);
  
  useEffect(() => {
    fetchPapers();
    fetchClasses();
    fetchSubjects();
    fetchTemplates();
  }, [fetchPapers, fetchClasses, fetchSubjects, fetchTemplates]);

  const handleCreatePaper = () => {
    setEditingPaper(null);
    setPaperForm({
      title_bn: 'বার্ষিক পরীক্ষা',
      title_en: 'Annual Examination',
      class_name: '',
      subject: '',
      exam_year: new Date().getFullYear().toString(),
      duration_minutes: 120,
      total_marks: 100,
      sections: []
    });
    setIsEditorOpen(true);
  };

  const handleEditPaper = async (paper) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/question-papers/${paper.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingPaper(response.data);
      setPaperForm({
        title_bn: response.data.title_bn || '',
        title_en: response.data.title_en || '',
        class_name: response.data.class_name || '',
        subject: response.data.subject || '',
        exam_year: response.data.exam_year || new Date().getFullYear().toString(),
        duration_minutes: response.data.duration_minutes || 120,
        total_marks: response.data.total_marks || 100,
        sections: response.data.sections || []
      });
      setIsEditorOpen(true);
    } catch (error) {
      toast.error('Failed to load paper');
    }
  };

  const handleSavePaper = async () => {
    if (!paperForm.class_name || !paperForm.subject) {
      toast.error('Please select class and subject');
      return;
    }
    
    // Validate total marks
    const currentMarks = calculateTotalMarks();
    if (currentMarks !== 100) {
      toast.error(`মোট নম্বর ১০০ হতে হবে। বর্তমান: ${currentMarks} / Total marks must equal 100. Current: ${currentMarks}`);
      return;
    }
    
    // Check if any section has questions
    const hasQuestions = paperForm.sections.some(s => s.questions?.length > 0);
    if (!hasQuestions) {
      toast.error('Please add at least one question to a section');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (editingPaper) {
        await axios.put(`${API_BASE_URL}/question-papers/${editingPaper.id}`, paperForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Question paper updated');
      } else {
        await axios.post(`${API_BASE_URL}/question-papers`, paperForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Question paper created');
      }
      
      setIsEditorOpen(false);
      fetchPapers();
    } catch (error) {
      toast.error('Failed to save paper');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaper = async (paperId) => {
    if (!window.confirm('Are you sure you want to delete this paper?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/question-papers/${paperId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Paper deleted');
      fetchPapers();
    } catch (error) {
      toast.error('Failed to delete paper');
    }
  };

  const handleStatusChange = async (paperId, newStatus) => {
    const statusMessages = {
      submitted: 'Submit this paper for approval?',
      approved: 'Approve this paper?',
      rejected: 'Reject this paper?',
      locked: 'Lock this paper? It cannot be edited after locking.',
      draft: 'Move this paper back to draft?'
    };
    
    if (!window.confirm(statusMessages[newStatus] || 'Change paper status?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/question-papers/${paperId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Paper status changed to ${newStatus}`);
      fetchPapers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change status');
    }
  };

  // Manual question handlers
  const handleAddManualQuestion = (sectionIndex) => {
    const input = newQuestionInputs[sectionIndex] || {};
    const section = paperForm.sections[sectionIndex];
    
    if (!input.text || !input.text.trim()) {
      toast.error('Please enter question text');
      return;
    }
    
    const newQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question_text: input.text.trim(),
      question_type: section.section_type,
      marks: section.marks_per_question || 1
    };
    
    // Add MCQ options if applicable
    if (section.section_type === 'mcq') {
      const opts = input.options || ['', '', '', ''];
      if (opts.some(o => !o.trim())) {
        toast.error('Please fill all MCQ options');
        return;
      }
      newQuestion.options = opts;
      newQuestion.correct_answer = opts[parseInt(input.correctAnswer) || 0];
    }
    
    // Add matching pair
    if (section.section_type === 'matching') {
      if (!input.rightSide || !input.rightSide.trim()) {
        toast.error('Please enter right side for matching');
        return;
      }
      newQuestion.correct_answer = input.rightSide.trim();
    }
    
    const updatedSections = [...paperForm.sections];
    updatedSections[sectionIndex] = {
      ...section,
      questions: [...(section.questions || []), newQuestion]
    };
    
    setPaperForm({ ...paperForm, sections: updatedSections });
    setNewQuestionInputs(prev => ({ ...prev, [sectionIndex]: {} }));
    toast.success('Question added');
  };
  
  const handleEditQuestion = (question) => {
    setEditingQuestionId(question.id);
    setEditingQuestionText(question.question_text);
  };
  
  const handleSaveQuestionEdit = (sectionIndex, questionId) => {
    if (!editingQuestionText.trim()) {
      toast.error('Question text cannot be empty');
      return;
    }
    
    const updatedSections = [...paperForm.sections];
    const qIndex = updatedSections[sectionIndex].questions.findIndex(q => q.id === questionId);
    if (qIndex !== -1) {
      updatedSections[sectionIndex].questions[qIndex].question_text = editingQuestionText.trim();
    }
    
    setPaperForm({ ...paperForm, sections: updatedSections });
    setEditingQuestionId(null);
    setEditingQuestionText('');
    toast.success('Question updated');
  };
  
  const handleUpdateSectionMarks = (sectionIndex, marks) => {
    const updatedSections = [...paperForm.sections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      marks_per_question: marks
    };
    setPaperForm({ ...paperForm, sections: updatedSections });
  };

  const toggleSectionSelection = (sectionId) => {
    setAiForm(prev => {
      const currentConfig = prev.section_config[sectionId] || { enabled: false, question_count: 5 };
      return {
        ...prev,
        section_config: {
          ...prev.section_config,
          [sectionId]: { ...currentConfig, enabled: !currentConfig.enabled }
        }
      };
    });
  };

  const updateSectionQuestionCount = (sectionId, count) => {
    setAiForm(prev => {
      const currentConfig = prev.section_config[sectionId] || { enabled: true, question_count: 5 };
      return {
        ...prev,
        section_config: {
          ...prev.section_config,
          [sectionId]: { ...currentConfig, question_count: parseInt(count) || 1 }
        }
      };
    });
  };

  const getEnabledSections = () => {
    return Object.entries(aiForm.section_config)
      .filter(([_, config]) => config.enabled)
      .map(([id, _]) => id);
  };

  const getTotalQuestions = () => {
    return Object.entries(aiForm.section_config)
      .filter(([_, config]) => config.enabled)
      .reduce((sum, [_, config]) => sum + (config.question_count || 0), 0);
  };

  const handleAIGenerate = async () => {
    if (!aiForm.class_name || !aiForm.subject) {
      toast.error('শ্রেণী এবং বিষয় নির্বাচন করুন');
      return;
    }
    
    const enabledSections = getEnabledSections();
    if (enabledSections.length === 0) {
      toast.error('কমপক্ষে একটি প্রশ্নের ধরন নির্বাচন করুন');
      return;
    }

    // Calculate total marks
    const calculatedMarks = Object.entries(aiForm.section_config).reduce((sum, [id, cfg]) => {
      if (!cfg.enabled) return sum;
      const sec = sectionOptions.find(s => s.id === id);
      return sum + (cfg.question_count * (sec?.default_marks || 1));
    }, 0);

    // Validate marks = 100
    if (calculatedMarks !== aiForm.total_marks) {
      toast.error(`মোট নম্বর ${aiForm.total_marks} হতে হবে (বর্তমান: ${calculatedMarks})`);
      return;
    }

    // Validate MCQ restrictions for class
    if (classRules) {
      const mcqConfig = aiForm.section_config.mcq;
      if (mcqConfig?.enabled) {
        if (!classRules.mcq_allowed) {
          toast.error('এই শ্রেণীতে MCQ অনুমোদিত নয়');
          return;
        }
        const mcqMarks = mcqConfig.question_count * 1;
        if (classRules.max_mcq_marks && mcqMarks > classRules.max_mcq_marks) {
          toast.error(`MCQ সর্বোচ্চ ${classRules.max_mcq_marks} নম্বর (বর্তমান: ${mcqMarks})`);
          return;
        }
      }
    }

    try {
      setAiGenerating(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`${API_BASE_URL}/question-papers/ai-generate`, aiForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Question paper generated successfully!');
      setIsAIDialogOpen(false);
      setAiForm({
        class_name: '',
        subject: '',
        total_marks: 100,
        duration_minutes: 120,
        exam_type: 'বার্ষিক পরীক্ষা',
        difficulty_mix: 'balanced',
        section_config: {
          one_word: { enabled: true, question_count: 5 },
          fill_blanks: { enabled: true, question_count: 5 },
          true_false: { enabled: true, question_count: 5 },
          short_answer: { enabled: true, question_count: 5 },
          descriptive: { enabled: true, question_count: 5 }
        }
      });
      fetchPapers();
      
      if (response.data.paper) {
        handleEditPaper(response.data.paper);
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate question paper');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAddSection = (template) => {
    const newSection = {
      section_number: paperForm.sections.length + 1,
      section_type: template.id || template.type || 'short_answer',  // Use template id as section type
      section_title_bn: template.title_bn,
      section_title_en: template.title_en,
      instructions_bn: template.instructions_bn,
      marks_per_question: template.default_marks || 1,
      question_ids: [],
      questions: []
    };
    setPaperForm(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const handleRemoveSection = (index) => {
    setPaperForm(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveQuestionFromSection = (sectionIndex, questionId) => {
    setPaperForm(prev => {
      const sections = [...prev.sections];
      const section = sections[sectionIndex];
      section.question_ids = section.question_ids.filter(id => id !== questionId);
      section.questions = (section.questions || []).filter(q => q.id !== questionId);
      return { ...prev, sections };
    });
  };

  const handlePrintPreview = async (paper) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/question-papers/${paper.id}/print`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrintData(response.data);
      setIsPrintPreviewOpen(true);
    } catch (error) {
      toast.error('Failed to load print preview');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Create a new window with print content
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow || !printData) return;
    
    const getBengaliNum = (n) => {
      const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return String(n).split('').map(d => bengaliDigits[parseInt(d)] || d).join('');
    };
    
    let sectionsHtml = '';
    printData.paper.sections?.forEach((section, sIndex) => {
      const bengaliLabels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ'];
      const label = bengaliLabels[sIndex] || '';
      
      let questionsHtml = '';
      const isMatchingSection = section.section_title_bn?.includes('মিলকরণ') || section.section_title_en?.toLowerCase().includes('matching');
      
      if (isMatchingSection && section.questions?.length > 0) {
        // Render matching questions as two columns
        const leftItems = [];
        const rightItems = [];
        section.questions?.forEach((q, qIndex) => {
          const bengaliNum = getBengaliNum(qIndex + 1);
          const leftText = q.question_text || q.left_item || q.item_a || `আইটেম ${bengaliNum}`;
          const rightText = q.answer || q.right_item || q.item_b || q.correct_answer || '';
          leftItems.push(`<div style="padding: 4px 0;">${bengaliNum}) ${leftText}</div>`);
          // Shuffle right items for exam - use letters
          const letterLabels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ঞ'];
          rightItems.push(`<div style="padding: 4px 0;">${letterLabels[qIndex] || qIndex + 1}) ${rightText}</div>`);
        });
        questionsHtml = `
          <div style="display: flex; gap: 40px; margin-left: 20px;">
            <div style="flex: 1; border-right: 1px dashed #ccc; padding-right: 20px;">
              <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #999;">বাম পাশ</div>
              ${leftItems.join('')}
            </div>
            <div style="flex: 1;">
              <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #999;">ডান পাশ</div>
              ${rightItems.join('')}
            </div>
          </div>
        `;
      } else {
        section.questions?.forEach((q, qIndex) => {
          const questionLabel = String.fromCharCode(2453 + qIndex);
          questionsHtml += `<div style="margin-left: 20px; margin-bottom: 8px;"><span>${questionLabel})</span> ${q.question_text || ''}</div>`;
        });
      }
      
      sectionsHtml += `
        <div style="border-top: 1px solid #ccc; padding-top: 15px; margin-top: 15px;">
          <div style="margin-bottom: 10px;">
            <strong>${label} বিভাগ: ${section.section_title_bn || ''}</strong>
            <span style="margin-left: 10px; color: #666;">(${section.marks_per_question || 0} × ${section.questions?.length || 0} = ${(section.marks_per_question || 0) * (section.questions?.length || 0)})</span>
          </div>
          ${section.instructions_bn ? `<p style="font-style: italic; color: #666; margin-bottom: 10px;">${section.instructions_bn}</p>` : ''}
          ${questionsHtml}
        </div>
      `;
    });
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${printData.paper.title_bn} - ${printData.paper.class_name}</title>
        <style>
          body { font-family: 'SolaimanLipi', 'Noto Sans Bengali', Arial, sans-serif; margin: 40px; color: black; }
          .header { text-align: center; border-bottom: 2px solid black; padding-bottom: 20px; margin-bottom: 20px; }
          .logo { height: 60px; margin-bottom: 10px; }
          h1 { margin: 5px 0; font-size: 24px; }
          h2 { margin: 10px 0; font-size: 18px; }
          .info { display: flex; justify-content: center; gap: 30px; margin-top: 10px; }
          .meta { display: flex; justify-content: space-between; margin-top: 10px; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          ${printData.branding.logo_url ? `<img src="${printData.branding.logo_url}" class="logo" alt="Logo">` : ''}
          <h1 style="color: ${printData.branding.primary_color};">${printData.branding.school_name_bn || ''}</h1>
          <p style="margin: 5px 0; color: #666;">${printData.branding.school_name_en || ''}</p>
          ${printData.branding.address ? `<p style="font-size: 12px; color: #888;">${printData.branding.address}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h2>${printData.paper.title_bn || ''} - ${printData.paper.exam_year || ''}</h2>
          <div class="info">
            <span>শ্রেণী: ${printData.paper.class_name || ''}</span>
            <span>বিষয়: ${printData.paper.subject || ''}</span>
          </div>
          <div class="meta">
            <span>সময়: ${Math.floor((printData.paper.duration_minutes || 0) / 60)} ঘণ্টা</span>
            <span>পূর্ণমান: ${printData.paper.total_marks || 0}</span>
          </div>
        </div>
        
        <div>${sectionsHtml}</div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for images to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  // Generate Blank Template with School Branding
  const handleBlankTemplate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch school branding
      const brandingResponse = await axios.get(`${API_BASE_URL}/school-branding`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const branding = brandingResponse.data;
      
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        toast.error('Pop-up blocked. Please allow pop-ups.');
        return;
      }

      const blankTemplateHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>ফাঁকা প্রশ্নপত্র টেমপ্লেট - Blank Question Paper Template</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
            * { box-sizing: border-box; }
            body { 
              font-family: 'Noto Sans Bengali', 'SolaimanLipi', Arial, sans-serif; 
              margin: 0; 
              padding: 30px; 
              color: black;
              background: white;
            }
            .page { 
              max-width: 210mm; 
              margin: 0 auto;
              min-height: 297mm;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px double ${branding.primary_color || '#1e40af'}; 
              padding-bottom: 15px; 
              margin-bottom: 20px; 
            }
            .logo { height: 70px; margin-bottom: 8px; }
            .school-name { 
              font-size: 26px; 
              font-weight: 700; 
              color: ${branding.primary_color || '#1e40af'}; 
              margin: 5px 0; 
            }
            .school-name-en { font-size: 16px; color: #555; margin: 3px 0; }
            .address { font-size: 12px; color: #777; }
            
            .exam-info {
              background: #f8f9fa;
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
            .exam-info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .info-row {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .info-label { 
              font-weight: 600; 
              color: #333;
              min-width: 100px;
            }
            .info-input {
              flex: 1;
              border: none;
              border-bottom: 2px dotted #999;
              padding: 5px 10px;
              font-size: 14px;
              background: transparent;
              min-width: 150px;
            }
            
            .section-container {
              margin-top: 25px;
            }
            .section-header {
              background: ${branding.primary_color || '#1e40af'};
              color: white;
              padding: 8px 15px;
              border-radius: 5px 5px 0 0;
              font-weight: 600;
              display: flex;
              justify-content: space-between;
            }
            .section-body {
              border: 1px solid #ddd;
              border-top: none;
              border-radius: 0 0 5px 5px;
              padding: 15px;
              min-height: 200px;
            }
            .question-line {
              border-bottom: 1px dotted #ccc;
              padding: 8px 0;
              display: flex;
              gap: 10px;
              align-items: flex-start;
            }
            .q-num {
              font-weight: 600;
              min-width: 30px;
              color: ${branding.primary_color || '#1e40af'};
              padding-top: 5px;
            }
            .q-input {
              flex: 1;
              border: none;
              border-bottom: 1px dotted #bbb;
              padding: 5px 8px;
              font-size: 14px;
              font-family: inherit;
              background: transparent;
              min-height: 24px;
              outline: none;
            }
            .q-input:focus {
              border-bottom: 2px solid ${branding.primary_color || '#1e40af'};
              background: #f8f9fa;
            }
            .q-input::placeholder {
              color: #aaa;
              font-style: italic;
            }
            .section-title-input {
              background: transparent;
              border: none;
              color: white;
              font-weight: 600;
              font-size: inherit;
              padding: 0;
              flex: 1;
            }
            .section-title-input:focus {
              outline: none;
              background: rgba(255,255,255,0.1);
            }
            .marks-input {
              background: transparent;
              border: none;
              border-bottom: 1px solid white;
              color: white;
              width: 40px;
              text-align: center;
              font-size: inherit;
            }
            .marks-input:focus {
              outline: none;
              background: rgba(255,255,255,0.1);
            }
            .add-question-btn {
              background: #e8f5e9;
              border: 1px dashed #4caf50;
              color: #4caf50;
              padding: 8px 15px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 13px;
              margin-top: 10px;
              width: 100%;
            }
            .add-question-btn:hover {
              background: #c8e6c9;
            }
            .delete-section-btn {
              background: transparent;
              border: none;
              color: rgba(255,255,255,0.7);
              cursor: pointer;
              padding: 2px 8px;
              font-size: 16px;
              margin-left: 10px;
            }
            .delete-section-btn:hover {
              color: #ff6b6b;
            }
            
            .footer {
              margin-top: 30px;
              text-align: center;
              border-top: 2px solid ${branding.primary_color || '#1e40af'};
              padding-top: 15px;
              color: #666;
              font-size: 12px;
            }
            
            @media print {
              body { padding: 15px; }
              .no-print { display: none !important; }
              .page { min-height: auto; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="background: #f0f9ff; padding: 15px; margin-bottom: 20px; border-radius: 8px; text-align: center;">
            <strong>📋 ফাঁকা প্রশ্নপত্র টেমপ্লেট / Blank Question Paper Template</strong><br>
            <small>এই পৃষ্ঠাটি প্রিন্ট করে হাতে প্রশ্ন লিখুন / Print this page and write questions by hand</small><br>
            <button onclick="window.print()" style="margin-top: 10px; padding: 10px 25px; background: ${branding.primary_color || '#1e40af'}; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
              🖨️ প্রিন্ট করুন / Print
            </button>
          </div>
          
          <div class="page">
            <div class="header">
              ${branding.logo_url ? `<img src="${branding.logo_url}" class="logo" alt="School Logo">` : ''}
              <div class="school-name">${branding.school_name || 'বিদ্যালয়ের নাম / School Name'}</div>
              ${branding.tagline ? `<div class="school-name-en">${branding.tagline}</div>` : ''}
              ${branding.address ? `<div class="address">${branding.address}</div>` : ''}
              ${branding.eiin_number ? `<div class="address">EIIN: ${branding.eiin_number}</div>` : ''}
            </div>
            
            <div class="exam-info">
              <div class="exam-info-grid">
                <div class="info-row">
                  <span class="info-label">পরীক্ষার নাম:</span>
                  <input class="info-input" placeholder="বার্ষিক পরীক্ষা / অর্ধ-বার্ষিক...">
                </div>
                <div class="info-row">
                  <span class="info-label">শ্রেণী:</span>
                  <input class="info-input" placeholder="প্রথম / দ্বিতীয়...">
                </div>
                <div class="info-row">
                  <span class="info-label">বিষয়:</span>
                  <input class="info-input" placeholder="বাংলা / গণিত...">
                </div>
                <div class="info-row">
                  <span class="info-label">সাল:</span>
                  <input class="info-input" value="${new Date().getFullYear()}">
                </div>
                <div class="info-row">
                  <span class="info-label">সময়:</span>
                  <input class="info-input" placeholder="২ ঘণ্টা">
                </div>
                <div class="info-row">
                  <span class="info-label">পূর্ণমান:</span>
                  <input class="info-input" value="১০০">
                </div>
              </div>
            </div>
            
            <!-- Section: এক শব্দে উত্তর দাও -->
            <div class="section-container" id="section-1">
              <div class="section-header">
                <input type="text" class="section-title-input" value="ক বিভাগ: এক শব্দে উত্তর দাও">
                <span>নম্বর: <input type="text" class="marks-input" value="১০"></span>
                <button class="delete-section-btn no-print" onclick="deleteSection('section-1')" title="Delete Section">✕</button>
              </div>
              <div class="section-body" id="section-1-body">
                ${[1,2,3,4,5].map(n => `
                  <div class="question-line">
                    <span class="q-num">${getBengaliNumber(n)}।</span>
                    <input type="text" class="q-input" placeholder="এখানে প্রশ্ন লিখুন... / Type question here...">
                  </div>
                `).join('')}
                <button class="add-question-btn no-print" onclick="addQuestion('section-1-body', this)">+ আরো প্রশ্ন যোগ করুন / Add More Questions</button>
              </div>
            </div>
            
            <!-- Section: সংক্ষেপে উত্তর দাও -->
            <div class="section-container" id="section-2">
              <div class="section-header">
                <input type="text" class="section-title-input" value="খ বিভাগ: সংক্ষেপে উত্তর দাও">
                <span>নম্বর: <input type="text" class="marks-input" value="২০"></span>
                <button class="delete-section-btn no-print" onclick="deleteSection('section-2')" title="Delete Section">✕</button>
              </div>
              <div class="section-body" id="section-2-body">
                ${[1,2,3,4,5].map(n => `
                  <div class="question-line">
                    <span class="q-num">${getBengaliNumber(n)}।</span>
                    <input type="text" class="q-input" placeholder="এখানে প্রশ্ন লিখুন... / Type question here...">
                  </div>
                `).join('')}
                <button class="add-question-btn no-print" onclick="addQuestion('section-2-body', this)">+ আরো প্রশ্ন যোগ করুন / Add More Questions</button>
              </div>
            </div>
            
            <!-- Section: বিস্তারিত উত্তর দাও -->
            <div class="section-container" id="section-3">
              <div class="section-header">
                <input type="text" class="section-title-input" value="গ বিভাগ: বিস্তারিত উত্তর দাও / রচনামূলক">
                <span>নম্বর: <input type="text" class="marks-input" value="৭০"></span>
                <button class="delete-section-btn no-print" onclick="deleteSection('section-3')" title="Delete Section">✕</button>
              </div>
              <div class="section-body" id="section-3-body" style="min-height: 300px;">
                ${[1,2,3,4,5].map(n => `
                  <div class="question-line">
                    <span class="q-num">${getBengaliNumber(n)}।</span>
                    <input type="text" class="q-input" placeholder="এখানে প্রশ্ন লিখুন... / Type question here...">
                  </div>
                `).join('')}
                <button class="add-question-btn no-print" onclick="addQuestion('section-3-body', this)">+ আরো প্রশ্ন যোগ করুন / Add More Questions</button>
              </div>
            </div>
            
            <!-- Add New Section Button -->
            <div class="no-print" style="margin-top: 20px; text-align: center;">
              <button onclick="addSection()" style="background: ${branding.primary_color || '#1e40af'}; color: white; padding: 12px 25px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
                + নতুন বিভাগ যোগ করুন / Add New Section
              </button>
            </div>
            
            <script>
              let sectionCount = 3;
              let questionCounts = {1: 5, 2: 5, 3: 5};
              const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
              const bengaliLabels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ঞ'];
              
              function getBengaliNum(n) {
                return String(n).split('').map(d => bengaliDigits[parseInt(d)] || d).join('');
              }
              
              function addQuestion(sectionBodyId, btn) {
                const sectionNum = sectionBodyId.split('-')[1];
                questionCounts[sectionNum] = (questionCounts[sectionNum] || 0) + 1;
                const qNum = questionCounts[sectionNum];
                const div = document.createElement('div');
                div.className = 'question-line';
                div.innerHTML = '<span class="q-num">' + getBengaliNum(qNum) + '।</span><input type="text" class="q-input" placeholder="এখানে প্রশ্ন লিখুন... / Type question here...">';
                btn.parentNode.insertBefore(div, btn);
              }
              
              function deleteSection(sectionId) {
                if (confirm('এই বিভাগটি মুছে ফেলতে চান? / Delete this section?')) {
                  const section = document.getElementById(sectionId);
                  if (section) section.remove();
                }
              }
              
              function addSection() {
                sectionCount++;
                const label = bengaliLabels[sectionCount - 1] || sectionCount;
                const sectionHtml = \`
                  <div class="section-container" id="section-\${sectionCount}">
                    <div class="section-header">
                      <input type="text" class="section-title-input" value="\${label} বিভাগ: বিভাগের নাম লিখুন">
                      <span>নম্বর: <input type="text" class="marks-input" value=""></span>
                      <button class="delete-section-btn no-print" onclick="deleteSection('section-\${sectionCount}')" title="Delete Section">✕</button>
                    </div>
                    <div class="section-body" id="section-\${sectionCount}-body">
                      <div class="question-line">
                        <span class="q-num">১।</span>
                        <input type="text" class="q-input" placeholder="এখানে প্রশ্ন লিখুন... / Type question here...">
                      </div>
                      <button class="add-question-btn no-print" onclick="addQuestion('section-\${sectionCount}-body', this)">+ আরো প্রশ্ন যোগ করুন / Add More Questions</button>
                    </div>
                  </div>
                \`;
                questionCounts[sectionCount] = 1;
                const addBtn = document.querySelector('.no-print[style*="margin-top: 20px"]');
                addBtn.insertAdjacentHTML('beforebegin', sectionHtml);
              }
            </script>
            
            <div class="footer">
              ${branding.school_name || ''} ${branding.phone ? `| ${branding.phone}` : ''} ${branding.email ? `| ${branding.email}` : ''} ${branding.website ? `| ${branding.website}` : ''}
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(blankTemplateHtml);
      printWindow.document.close();
      toast.success('Blank template opened - print it and write questions by hand!');
      
    } catch (error) {
      console.error('Error generating blank template:', error);
      toast.error('Failed to generate blank template');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalMarks = () => {
    if (!paperForm.sections || !Array.isArray(paperForm.sections)) {
      return 0;
    }
    return paperForm.sections.reduce((total, section) => {
      const questionCount = section.question_ids?.length || section.questions?.length || 0;
      return total + (questionCount * (section.marks_per_question || 0));
    }, 0);
  };

  const getBengaliNumber = (num) => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().split('').map(d => bengaliDigits[parseInt(d)] || d).join('');
  };

  return (
    <div className="p-6 space-y-6 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            প্রশ্নপত্র তৈরি / Question Paper Builder
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Create and print exam papers with school branding</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleCreatePaper} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            নতুন প্রশ্নপত্র / New Paper
          </Button>
          <Button onClick={() => setIsAIDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <Sparkles className="h-4 w-4 mr-2" />
            AI প্রশ্নপত্র / AI Generate
          </Button>
          <Button onClick={handleBlankTemplate} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20">
            <Printer className="h-4 w-4 mr-2" />
            ফাঁকা টেমপ্লেট / Blank Template
          </Button>
        </div>
      </div>

      {loading && papers.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : papers.length === 0 ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Question Papers</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first question paper</p>
            <Button onClick={handleCreatePaper} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Paper
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {papers.map(paper => (
            <Card key={paper.id} className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg dark:text-white">{paper.title_bn}</CardTitle>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    paper.status === 'locked' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    paper.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    paper.status === 'submitted' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    paper.status === 'rejected' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {paper.status === 'locked' ? '🔒 Locked' :
                     paper.status === 'approved' ? '✓ Approved' :
                     paper.status === 'submitted' ? '📤 Submitted' :
                     paper.status === 'rejected' ? '✗ Rejected' :
                     '📝 Draft'}
                  </span>
                </div>
                <CardDescription className="dark:text-gray-400">
                  {paper.class_name} | {paper.subject} | {paper.exam_year}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <span>Sections: {paper.sections?.length || 0}</span>
                  <span>Marks: {paper.total_marks}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {paper.status !== 'locked' && (
                    <Button variant="outline" size="sm" onClick={() => handleEditPaper(paper)}>
                      <BookOpen className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handlePrintPreview(paper)}>
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  {paper.status === 'draft' && (
                    <Button variant="outline" size="sm" className="text-blue-600" onClick={() => handleStatusChange(paper.id, 'submitted')}>
                      📤 Submit
                    </Button>
                  )}
                  {/* Admin controls */}
                  {(userRole === 'admin' || userRole === 'super_admin') && paper.status === 'submitted' && (
                    <>
                      <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleStatusChange(paper.id, 'approved')}>
                        ✓ Approve
                      </Button>
                      <Button variant="outline" size="sm" className="text-orange-600" onClick={() => handleStatusChange(paper.id, 'rejected')}>
                        ✗ Reject
                      </Button>
                    </>
                  )}
                  {(userRole === 'admin' || userRole === 'super_admin') && paper.status === 'approved' && (
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleStatusChange(paper.id, 'locked')}>
                      🔒 Lock
                    </Button>
                  )}
                  {(userRole === 'admin' || userRole === 'super_admin') && paper.status === 'locked' && (
                    <Button variant="outline" size="sm" className="text-blue-600" onClick={() => handleStatusChange(paper.id, 'draft')}>
                      🔓 Unlock
                    </Button>
                  )}
                  {paper.status !== 'locked' && (
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeletePaper(paper.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {editingPaper ? 'Edit Question Paper' : 'Create Question Paper'}
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Build your exam paper by adding sections and questions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <Label className="dark:text-gray-300">পরীক্ষার নাম (Bengali) *</Label>
                <Input
                  value={paperForm.title_bn}
                  onChange={(e) => setPaperForm({ ...paperForm, title_bn: e.target.value })}
                  placeholder="বার্ষিক পরীক্ষা"
                  className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <Label className="dark:text-gray-300">Exam Title (English)</Label>
                <Input
                  value={paperForm.title_en}
                  onChange={(e) => setPaperForm({ ...paperForm, title_en: e.target.value })}
                  placeholder="Annual Examination"
                  className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <Label className="dark:text-gray-300">শ্রেণী / Class *</Label>
                <Select value={paperForm.class_name} onValueChange={(value) => setPaperForm({ ...paperForm, class_name: value })}>
                  <SelectTrigger className="dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls.id || cls.name} value={cls.name}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="dark:text-gray-300">বিষয় / Subject *</Label>
                <Select value={paperForm.subject} onValueChange={(value) => setPaperForm({ ...paperForm, subject: value })}>
                  <SelectTrigger className="dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(sub => (
                      <SelectItem key={sub.id || sub.name} value={sub.name}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="dark:text-gray-300">সাল / Year</Label>
                <Input
                  value={paperForm.exam_year}
                  onChange={(e) => setPaperForm({ ...paperForm, exam_year: e.target.value })}
                  placeholder="২০২৫"
                  className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <Label className="dark:text-gray-300">সময় (মিনিট) / Duration</Label>
                <Input
                  type="number"
                  value={paperForm.duration_minutes}
                  onChange={(e) => setPaperForm({ ...paperForm, duration_minutes: parseInt(e.target.value) || 0 })}
                  className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div className="border-t dark:border-gray-700 pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium dark:text-white">প্রশ্ন বিভাগ / Sections</h3>
                <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                  calculateTotalMarks() === 100 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  মোট নম্বর / Total: <strong>{calculateTotalMarks()}</strong> / 100
                  {calculateTotalMarks() === 100 ? ' ✓' : ' ✗'}
                </div>
              </div>

              <div className="mb-4">
                <Label className="dark:text-gray-300 mb-2 block">Add Section Template:</Label>
                <div className="flex flex-wrap gap-2">
                  {sectionTemplates.map(template => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSection(template)}
                      className="dark:border-gray-600 dark:text-gray-300"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {template.title_bn}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {paperForm.sections.map((section, sIndex) => (
                  <Card key={sIndex} className="dark:bg-gray-900 dark:border-gray-700">
                    <CardHeader className="py-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {getBengaliNumber(sIndex + 1)}।
                          </span>
                          <span className="ml-2 font-medium dark:text-white">{section.section_title_bn}</span>
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                            ({section.questions?.length || 0} questions × {section.marks_per_question || 0} marks = {(section.questions?.length || 0) * (section.marks_per_question || 0)} marks)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Label className="text-xs dark:text-gray-400">Marks/Q:</Label>
                            <Input
                              type="number"
                              min="1"
                              value={section.marks_per_question || 1}
                              onChange={(e) => handleUpdateSectionMarks(sIndex, parseInt(e.target.value) || 1)}
                              className="w-16 h-8 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleRemoveSection(sIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2 space-y-3">
                      {/* Existing questions */}
                      {section.questions && section.questions.length > 0 && (
                        <div className="space-y-2">
                          {section.questions.map((q, qIndex) => (
                            <div key={q.id || qIndex} className="flex justify-between items-start p-2 bg-gray-50 dark:bg-gray-800 rounded group">
                              <div className="flex-1">
                                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                                  {getBengaliNumber(qIndex + 1)})
                                </span>
                                {editingQuestionId === q.id ? (
                                  <div className="inline-flex items-center gap-2 flex-1">
                                    <Input
                                      value={editingQuestionText}
                                      onChange={(e) => setEditingQuestionText(e.target.value)}
                                      className="flex-1 h-8 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                      onKeyDown={(e) => e.key === 'Enter' && handleSaveQuestionEdit(sIndex, q.id)}
                                    />
                                    <Button size="sm" className="h-8 bg-green-600" onClick={() => handleSaveQuestionEdit(sIndex, q.id)}>
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingQuestionId(null)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-sm dark:text-gray-300">{q.question_text}</span>
                                )}
                                {/* Show options for MCQ */}
                                {q.options && q.options.length > 0 && (
                                  <div className="ml-6 mt-1 grid grid-cols-2 gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    {q.options.map((opt, i) => (
                                      <span key={i}>({String.fromCharCode(2453 + i)}) {opt}</span>
                                    ))}
                                  </div>
                                )}
                                {/* Show matching pairs */}
                                {section.section_type === 'matching' && q.correct_answer && (
                                  <div className="ml-6 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    → {q.correct_answer}
                                  </div>
                                )}
                              </div>
                              {editingQuestionId !== q.id && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-500 h-8"
                                    onClick={() => handleEditQuestion(q)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 h-8"
                                    onClick={() => handleRemoveQuestionFromSection(sIndex, q.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Add new question form */}
                      <div className="flex gap-2 items-start pt-2 border-t dark:border-gray-700">
                        {section.section_type === 'mcq' ? (
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="প্রশ্ন লিখুন / Type question..."
                              value={newQuestionInputs[sIndex]?.text || ''}
                              onChange={(e) => setNewQuestionInputs(prev => ({
                                ...prev,
                                [sIndex]: { ...prev[sIndex], text: e.target.value }
                              }))}
                              className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              {['ক', 'খ', 'গ', 'ঘ'].map((label, i) => (
                                <Input
                                  key={i}
                                  placeholder={`(${label}) Option ${i + 1}`}
                                  value={newQuestionInputs[sIndex]?.options?.[i] || ''}
                                  onChange={(e) => {
                                    const opts = [...(newQuestionInputs[sIndex]?.options || ['', '', '', ''])];
                                    opts[i] = e.target.value;
                                    setNewQuestionInputs(prev => ({
                                      ...prev,
                                      [sIndex]: { ...prev[sIndex], options: opts }
                                    }));
                                  }}
                                  className="text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                />
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Select
                                value={newQuestionInputs[sIndex]?.correctAnswer || ''}
                                onValueChange={(v) => setNewQuestionInputs(prev => ({
                                  ...prev,
                                  [sIndex]: { ...prev[sIndex], correctAnswer: v }
                                }))}
                              >
                                <SelectTrigger className="w-32 dark:bg-gray-800 dark:border-gray-600">
                                  <SelectValue placeholder="সঠিক উত্তর" />
                                </SelectTrigger>
                                <SelectContent>
                                  {['ক', 'খ', 'গ', 'ঘ'].map((label, i) => (
                                    <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleAddManualQuestion(sIndex)}
                              >
                                <Plus className="h-4 w-4 mr-1" /> Add MCQ
                              </Button>
                            </div>
                          </div>
                        ) : section.section_type === 'matching' ? (
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="বাম পাশ / Left side"
                                value={newQuestionInputs[sIndex]?.text || ''}
                                onChange={(e) => setNewQuestionInputs(prev => ({
                                  ...prev,
                                  [sIndex]: { ...prev[sIndex], text: e.target.value }
                                }))}
                                className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                              />
                              <Input
                                placeholder="ডান পাশ / Right side"
                                value={newQuestionInputs[sIndex]?.rightSide || ''}
                                onChange={(e) => setNewQuestionInputs(prev => ({
                                  ...prev,
                                  [sIndex]: { ...prev[sIndex], rightSide: e.target.value }
                                }))}
                                className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                              />
                            </div>
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleAddManualQuestion(sIndex)}
                            >
                              <Plus className="h-4 w-4 mr-1" /> Add Pair
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Input
                              placeholder="প্রশ্ন লিখুন / Type question..."
                              value={newQuestionInputs[sIndex]?.text || ''}
                              onChange={(e) => setNewQuestionInputs(prev => ({
                                ...prev,
                                [sIndex]: { ...prev[sIndex], text: e.target.value }
                              }))}
                              className="flex-1 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddManualQuestion(sIndex)}
                            />
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleAddManualQuestion(sIndex)}
                            >
                              <Plus className="h-4 w-4 mr-1" /> Add
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)} className="dark:border-gray-600 dark:text-gray-300">
              Cancel
            </Button>
            <Button onClick={handleSavePaper} className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Paper'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPrintPreviewOpen} onOpenChange={setIsPrintPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto dark:bg-white print:shadow-none">
          <div className="print:block">
            {printData && (
              <div className="bg-white text-black p-8 print:p-0" id="print-content">
                <div className="text-center border-b-2 border-black pb-4 mb-6">
                  {printData.branding.logo_url && (
                    <img
                      src={printData.branding.logo_url}
                      alt="School Logo"
                      className="h-16 mx-auto mb-2"
                    />
                  )}
                  <h1 className="text-2xl font-bold" style={{ color: printData.branding.primary_color }}>
                    {printData.branding.school_name_bn}
                  </h1>
                  <p className="text-sm text-gray-600">{printData.branding.school_name_en}</p>
                  {printData.branding.address && (
                    <p className="text-xs text-gray-500">{printData.branding.address}</p>
                  )}
                </div>

                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold">{printData.paper.title_bn} - {printData.paper.exam_year}</h2>
                  <div className="flex justify-center gap-8 mt-2 text-sm">
                    <span>শ্রেণী: {printData.paper.class_name}</span>
                    <span>বিষয়: {printData.paper.subject}</span>
                  </div>
                  <div className="flex justify-between mt-2 text-sm px-8">
                    <span>সময়: {Math.floor(printData.paper.duration_minutes / 60)} ঘণ্টা</span>
                    <span>পূর্ণমান: {printData.paper.total_marks}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {printData.paper.sections.map((section, sIndex) => (
                    <div key={sIndex} className="border-t border-gray-300 pt-4">
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="font-bold">{getBengaliNumber(sIndex + 1)}।</span>
                        <span className="font-bold">{section.section_title_bn}</span>
                        <span className="text-sm text-gray-600">
                          ({section.marks_per_question} × {section.questions?.length || 0} = {(section.marks_per_question || 1) * (section.questions?.length || 0)})
                        </span>
                      </div>
                      {section.instructions_bn && (
                        <p className="text-sm text-gray-600 mb-2 italic">{section.instructions_bn}</p>
                      )}
                      <div className="space-y-2 pl-6">
                        {section.questions?.map((q, qIndex) => (
                          <div key={q.id} className="flex gap-2">
                            <span>{String.fromCharCode(2453 + qIndex)}))</span>
                            <span>{q.question_text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setIsPrintPreviewOpen(false)}>
              Close
            </Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI প্রশ্নপত্র তৈরি / AI Question Paper Generator
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              AI will create a complete question paper with sections and questions in Bengali
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Class / শ্রেণী</Label>
                <Select value={aiForm.class_name} onValueChange={(value) => { setAiForm({ ...aiForm, class_name: value }); fetchClassRules(value); }}>
                  <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-white">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls.id || cls.name} value={cls.name}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Subject / বিষয়</Label>
                <Select value={aiForm.subject} onValueChange={(value) => setAiForm({ ...aiForm, subject: value })}>
                  <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-white">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(sub => (
                      <SelectItem key={sub.id || sub.name} value={sub.name}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Total Marks / মোট নম্বর</Label>
                <Input
                  type="number"
                  value={aiForm.total_marks}
                  onChange={(e) => setAiForm({ ...aiForm, total_marks: parseInt(e.target.value) || 100 })}
                  className="dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Duration (min) / সময়</Label>
                <Input
                  type="number"
                  value={aiForm.duration_minutes}
                  onChange={(e) => setAiForm({ ...aiForm, duration_minutes: parseInt(e.target.value) || 120 })}
                  className="dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-gray-300">Exam Type / পরীক্ষার ধরন</Label>
              <Select value={aiForm.exam_type} onValueChange={(value) => setAiForm({ ...aiForm, exam_type: value })}>
                <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="বার্ষিক পরীক্ষা">বার্ষিক পরীক্ষা (Annual Exam)</SelectItem>
                  <SelectItem value="অর্ধ-বার্ষিক পরীক্ষা">অর্ধ-বার্ষিক পরীক্ষা (Half-Yearly)</SelectItem>
                  <SelectItem value="প্রথম সাময়িক পরীক্ষা">প্রথম সাময়িক পরীক্ষা (1st Term)</SelectItem>
                  <SelectItem value="দ্বিতীয় সাময়িক পরীক্ষা">দ্বিতীয় সাময়িক পরীক্ষা (2nd Term)</SelectItem>
                  <SelectItem value="মডেল টেস্ট">মডেল টেস্ট (Model Test)</SelectItem>
                  <SelectItem value="সাপ্তাহিক পরীক্ষা">সাপ্তাহিক পরীক্ষা (Weekly Test)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-gray-300">Difficulty Mix</Label>
              <Select value={aiForm.difficulty_mix} onValueChange={(value) => setAiForm({ ...aiForm, difficulty_mix: value })}>
                <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Balanced (Easy, Medium, Hard)</SelectItem>
                  <SelectItem value="easy">Mostly Easy</SelectItem>
                  <SelectItem value="medium">Mostly Medium</SelectItem>
                  <SelectItem value="challenging">Challenging</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-gray-300">Select Sections & Question Count / বিভাগ ও প্রশ্ন সংখ্যা নির্বাচন</Label>
              {classRules && (
                <div className="text-xs p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                  <span className="font-medium text-blue-700 dark:text-blue-300">📚 {classRules.description}</span>
                  {!classRules.mcq_allowed && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400">(MCQ অনুমোদিত নয়)</span>
                  )}
                </div>
              )}
              <div className="space-y-2 p-3 border rounded-lg dark:border-gray-600 max-h-64 overflow-y-auto">
                {sectionOptions.map(section => {
                  const config = aiForm.section_config[section.id] || { enabled: false, question_count: 5 };
                  const isAllowed = !classRules || classRules.allowed_question_types?.includes(section.id);
                  if (!isAllowed) return null;
                  return (
                    <div 
                      key={section.id} 
                      className={`flex items-center justify-between p-2 rounded transition-colors ${
                        config.enabled
                          ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={config.enabled}
                          onChange={() => toggleSectionSelection(section.id)}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm dark:text-gray-300">
                          {section.name_bn}
                        </span>
                      </label>
                      {config.enabled && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">প্রশ্ন:</span>
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            value={config.question_count}
                            onChange={(e) => updateSectionQuestionCount(section.id, e.target.value)}
                            className="w-16 h-7 text-center text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Selected: {getEnabledSections().length} section(s) | Total Questions: {getTotalQuestions()}
              </p>
            </div>
          </div>

          {/* Marks Distribution Display */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium dark:text-gray-300">নম্বর বন্টন / Marks Distribution:</span>
              <span className={`font-bold ${
                Object.entries(aiForm.section_config).reduce((sum, [id, cfg]) => {
                  if (!cfg.enabled) return sum;
                  const sec = sectionOptions.find(s => s.id === id);
                  return sum + (cfg.question_count * (sec?.default_marks || 1));
                }, 0) === aiForm.total_marks 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-orange-600 dark:text-orange-400'
              }`}>
                {Object.entries(aiForm.section_config).reduce((sum, [id, cfg]) => {
                  if (!cfg.enabled) return sum;
                  const sec = sectionOptions.find(s => s.id === id);
                  return sum + (cfg.question_count * (sec?.default_marks || 1));
                }, 0)} / {aiForm.total_marks}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(aiForm.section_config)
                .filter(([_, cfg]) => cfg.enabled)
                .map(([id, cfg]) => {
                  const sec = sectionOptions.find(s => s.id === id);
                  const marks = cfg.question_count * (sec?.default_marks || 1);
                  return (
                    <div key={id} className="p-1 bg-white dark:bg-gray-700 rounded text-center">
                      <div className="text-gray-600 dark:text-gray-400">{sec?.name_bn}</div>
                      <div className="font-medium dark:text-white">{cfg.question_count} × {sec?.default_marks || 1} = {marks}</div>
                    </div>
                  );
                })
              }
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIDialogOpen(false)} disabled={aiGenerating}>
              Cancel
            </Button>
            <Button onClick={handleAIGenerate} className="bg-purple-600 hover:bg-purple-700" disabled={aiGenerating}>
              {aiGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Paper
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-content,
          #print-content * {
            visibility: visible !important;
            color: black !important;
          }
          #print-content {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 20px !important;
            background: white !important;
            z-index: 99999 !important;
          }
          #print-content h1,
          #print-content h2,
          #print-content p,
          #print-content span,
          #print-content div {
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QuestionPaperBuilder;
