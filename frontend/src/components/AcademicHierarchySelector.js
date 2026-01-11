import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '/api';

const AcademicHierarchySelector = ({
  onSelectionChange,
  selectedMarhalaId = '',
  selectedDepartmentId = '',
  selectedSemesterId = '',
  showMarhala = true,
  showDepartment = true,
  showSemester = true,
  showLabels = true,
  labelMarhala = 'মারহালা',
  labelDepartment = 'বিভাগ/জামাত',
  labelSemester = 'সেমিস্টার',
  placeholderMarhala = 'মারহালা নির্বাচন করুন',
  placeholderDepartment = 'বিভাগ/জামাত নির্বাচন করুন',
  placeholderSemester = 'সেমিস্টার নির্বাচন করুন',
  showAllOption = false,
  allOptionLabel = 'সকল',
  className = '',
  inline = false,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [hierarchy, setHierarchy] = useState({ marhalas: [], departments: [], semesters: [] });
  const [marhalaId, setMarhalaId] = useState(selectedMarhalaId);
  const [departmentId, setDepartmentId] = useState(selectedDepartmentId);
  const [semesterId, setSemesterId] = useState(selectedSemesterId);

  const fetchHierarchy = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/academic-hierarchy`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.flat || response.data.hierarchy || { marhalas: [], departments: [], semesters: [] };
      if (Array.isArray(response.data.hierarchy)) {
        const marhalas = response.data.hierarchy;
        const departments = [];
        const semesters = [];
        marhalas.forEach(m => {
          (m.departments || []).forEach(d => {
            departments.push({ ...d, marhala_id: m.id });
            (d.semesters || []).forEach(s => {
              semesters.push({ ...s, department_id: d.id, marhala_id: m.id });
            });
          });
        });
        setHierarchy({ marhalas, departments, semesters });
      } else {
        setHierarchy({
          marhalas: data.marhalas || [],
          departments: data.departments || [],
          semesters: data.semesters || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch academic hierarchy:', error);
      setHierarchy({ marhalas: [], departments: [], semesters: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  useEffect(() => {
    setMarhalaId(selectedMarhalaId);
  }, [selectedMarhalaId]);

  useEffect(() => {
    setDepartmentId(selectedDepartmentId);
  }, [selectedDepartmentId]);

  useEffect(() => {
    setSemesterId(selectedSemesterId);
  }, [selectedSemesterId]);

  const filteredDepartments = useMemo(() => {
    if (!marhalaId || marhalaId === 'all') {
      return hierarchy.departments;
    }
    return hierarchy.departments.filter(d => d.marhala_id === marhalaId);
  }, [hierarchy.departments, marhalaId]);

  const filteredSemesters = useMemo(() => {
    if (!departmentId || departmentId === 'all') {
      if (!marhalaId || marhalaId === 'all') {
        return hierarchy.semesters;
      }
      return hierarchy.semesters.filter(s => s.marhala_id === marhalaId);
    }
    return hierarchy.semesters.filter(s => s.department_id === departmentId);
  }, [hierarchy.semesters, departmentId, marhalaId]);

  const getSelectionWithNames = (mId, dId, sId) => {
    const marhala = hierarchy.marhalas.find(m => m.id === mId);
    const department = hierarchy.departments.find(d => d.id === dId);
    const semester = hierarchy.semesters.find(s => s.id === sId);
    
    const getName = (item) => item?.name_bn || item?.name_en || item?.name || item?.display_name || '';
    
    return {
      marhala_id: mId || '',
      department_id: dId || '',
      semester_id: sId || '',
      marhala_name: getName(marhala),
      department_name: getName(department),
      semester_name: getName(semester),
    };
  };

  const handleMarhalaChange = (value) => {
    const newMarhalaId = value === 'all' ? '' : value;
    setMarhalaId(newMarhalaId);
    setDepartmentId('');
    setSemesterId('');
    onSelectionChange?.(getSelectionWithNames(newMarhalaId, '', ''));
  };

  const handleDepartmentChange = (value) => {
    const newDepartmentId = value === 'all' ? '' : value;
    setDepartmentId(newDepartmentId);
    setSemesterId('');
    
    let newMarhalaId = marhalaId;
    if (newDepartmentId && !marhalaId) {
      const dept = hierarchy.departments.find(d => d.id === newDepartmentId);
      if (dept?.marhala_id) {
        newMarhalaId = dept.marhala_id;
        setMarhalaId(newMarhalaId);
      }
    }
    
    onSelectionChange?.(getSelectionWithNames(newMarhalaId, newDepartmentId, ''));
  };

  const handleSemesterChange = (value) => {
    const newSemesterId = value === 'all' ? '' : value;
    setSemesterId(newSemesterId);
    
    let newMarhalaId = marhalaId;
    let newDepartmentId = departmentId;
    
    if (newSemesterId) {
      const semester = hierarchy.semesters.find(s => s.id === newSemesterId);
      if (semester) {
        if (semester.department_id && !departmentId) {
          newDepartmentId = semester.department_id;
          setDepartmentId(newDepartmentId);
        }
        if (semester.marhala_id && !marhalaId) {
          newMarhalaId = semester.marhala_id;
          setMarhalaId(newMarhalaId);
        }
      }
    }
    
    onSelectionChange?.(getSelectionWithNames(newMarhalaId, newDepartmentId, newSemesterId));
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">লোড হচ্ছে...</span>
      </div>
    );
  }

  const containerClass = inline
    ? `flex flex-wrap items-end gap-4 ${className}`
    : `grid gap-4 ${className}`;

  const gridCols = [showMarhala, showDepartment, showSemester].filter(Boolean).length;
  const gridClass = inline ? '' : `md:grid-cols-${gridCols}`;

  return (
    <div className={`${containerClass} ${gridClass}`}>
      {showMarhala && (
        <div className={inline ? 'min-w-[180px]' : ''}>
          {showLabels && <Label className="mb-2 block">{labelMarhala}</Label>}
          <Select
            value={marhalaId || (showAllOption ? 'all' : '')}
            onValueChange={handleMarhalaChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholderMarhala} />
            </SelectTrigger>
            <SelectContent>
              {showAllOption && (
                <SelectItem value="all">{allOptionLabel} {labelMarhala}</SelectItem>
              )}
              {hierarchy.marhalas.map((marhala) => (
                <SelectItem key={marhala.id} value={marhala.id}>
                  {marhala.name_bn || marhala.name_en || marhala.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showDepartment && (
        <div className={inline ? 'min-w-[180px]' : ''}>
          {showLabels && <Label className="mb-2 block">{labelDepartment}</Label>}
          <Select
            value={departmentId || (showAllOption ? 'all' : '')}
            onValueChange={handleDepartmentChange}
            disabled={disabled || (!showAllOption && !marhalaId)}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholderDepartment} />
            </SelectTrigger>
            <SelectContent>
              {showAllOption && (
                <SelectItem value="all">{allOptionLabel} {labelDepartment}</SelectItem>
              )}
              {filteredDepartments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name_bn || dept.name_en || dept.name}
                  {dept.code && ` (${dept.code})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showSemester && (
        <div className={inline ? 'min-w-[180px]' : ''}>
          {showLabels && <Label className="mb-2 block">{labelSemester}</Label>}
          <Select
            value={semesterId || (showAllOption ? 'all' : '')}
            onValueChange={handleSemesterChange}
            disabled={disabled || (!showAllOption && !departmentId)}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholderSemester} />
            </SelectTrigger>
            <SelectContent>
              {showAllOption && (
                <SelectItem value="all">{allOptionLabel} {labelSemester}</SelectItem>
              )}
              {filteredSemesters.map((semester) => (
                <SelectItem key={semester.id} value={semester.id}>
                  {semester.name_bn || semester.name_en || semester.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default AcademicHierarchySelector;
