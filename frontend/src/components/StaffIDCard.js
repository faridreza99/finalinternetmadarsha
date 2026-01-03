import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Download, Printer, Search, CreditCard, Users, Eye, RefreshCw, UserCheck, CheckSquare, Square, FileDown } from 'lucide-react';
import JSZip from 'jszip';

const API = process.env.REACT_APP_API_URL || '/api';

const StaffIDCard = () => {
  const { t } = useTranslation();
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState({});
  const [selectedStaff, setSelectedStaff] = useState(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let staffData = response.data || [];
      
      // Filter by department if selected
      if (selectedDepartment && selectedDepartment !== 'all') {
        staffData = staffData.filter(s => s.department === selectedDepartment);
      }
      
      setStaff(staffData);
      
      // Extract unique departments from full staff list
      const allStaff = response.data || [];
      const depts = [...new Set(allStaff.map(s => s.department).filter(Boolean))];
      setDepartments(depts);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const generateIDCard = async (staffId, staffName) => {
    setGenerating(prev => ({ ...prev, [staffId]: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/id-cards/staff/${staffId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `StaffID-${staffName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate ID card:', error);
      alert(t('idCard.generateError') || 'Failed to generate ID card');
    } finally {
      setGenerating(prev => ({ ...prev, [staffId]: false }));
    }
  };

  const previewIDCard = async (staffId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/id-cards/staff/${staffId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to preview ID card:', error);
    }
  };

  const filteredStaff = staff.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStaffSelection = (staffId) => {
    setSelectedStaff(prev => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStaff.size === filteredStaff.length) {
      setSelectedStaff(new Set());
    } else {
      setSelectedStaff(new Set(filteredStaff.map(s => s.id)));
    }
  };

  const generateBulkIDCards = async () => {
    if (selectedStaff.size === 0) {
      alert(t('idCard.selectStaff') || 'Please select at least one staff member');
      return;
    }

    setBulkGenerating(true);
    setBulkProgress({ current: 0, total: selectedStaff.size });
    
    try {
      const token = localStorage.getItem('token');
      const zip = new JSZip();
      const selectedArray = Array.from(selectedStaff);
      
      for (let i = 0; i < selectedArray.length; i++) {
        const staffId = selectedArray[i];
        const member = staff.find(s => s.id === staffId);
        
        try {
          const response = await axios.get(`${API}/id-cards/staff/${staffId}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'arraybuffer'
          });
          
          const filename = `ID_${member?.name?.replace(/\s+/g, '_') || staffId}.pdf`;
          zip.file(filename, response.data);
          setBulkProgress({ current: i + 1, total: selectedStaff.size });
        } catch (error) {
          console.error(`Failed to generate ID for ${staffId}:`, error);
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Staff_ID_Cards_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSelectedStaff(new Set());
    } catch (error) {
      console.error('Bulk generation failed:', error);
      alert(t('idCard.bulkError') || 'Bulk generation failed');
    } finally {
      setBulkGenerating(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-xl dark:text-white">
                {t('idCard.staffTitle') || 'শিক্ষক আইডি কার্ড'}
              </CardTitle>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchStaff}
              disabled={loading}
              className="dark:border-gray-600 dark:text-gray-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh') || 'রিফ্রেশ'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.department') || 'বিভাগ'}
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">{t('common.allDepartments') || 'সকল বিভাগ'}</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.search') || 'খুঁজুন'}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('idCard.searchStaffPlaceholder') || 'নাম, পদবী দিয়ে খুঁজুন...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <UserCheck className="h-4 w-4" />
              <span>
                {t('idCard.totalStaff') || 'মোট শিক্ষক'}: {filteredStaff.length}
                {selectedStaff.size > 0 && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                    ({selectedStaff.size} {t('common.selected') || 'নির্বাচিত'})
                  </span>
                )}
              </span>
            </div>
            {selectedStaff.size > 0 && (
              <Button
                onClick={generateBulkIDCards}
                disabled={bulkGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {bulkGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {bulkProgress.current}/{bulkProgress.total}
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    {t('idCard.downloadSelected') || 'নির্বাচিত ডাউনলোড'} ({selectedStaff.size})
                  </>
                )}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('idCard.noStaff') || 'কোন শিক্ষক পাওয়া যায়নি'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="text-center px-4 py-3 w-12">
                      <button
                        onClick={toggleSelectAll}
                        className="text-gray-600 dark:text-gray-300 hover:text-blue-600"
                      >
                        {selectedStaff.size === filteredStaff.length && filteredStaff.length > 0 ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('common.photo') || 'ছবি'}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('common.name') || 'নাম'}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('common.designation') || 'পদবী'}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('common.department') || 'বিভাগ'}
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('common.employeeId') || 'কর্মচারী আইডি'}
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('common.actions') || 'একশন'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredStaff.map(member => (
                    <tr key={member.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedStaff.has(member.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                      <td className="text-center px-4 py-3">
                        <button
                          onClick={() => toggleStaffSelection(member.id)}
                          className="text-gray-600 dark:text-gray-300 hover:text-blue-600"
                        >
                          {selectedStaff.has(member.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {member.photo_url ? (
                          <img 
                            src={member.photo_url} 
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <UserCheck className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm dark:text-white font-medium">
                        {member.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {member.designation}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {member.department || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {member.employee_id || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => previewIDCard(member.id)}
                            title={t('common.preview') || 'প্রিভিউ'}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => generateIDCard(member.id, member.name)}
                            disabled={generating[member.id]}
                            title={t('common.download') || 'ডাউনলোড'}
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          >
                            {generating[member.id] ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              previewIDCard(member.id);
                              setTimeout(() => window.print(), 1000);
                            }}
                            title={t('common.print') || 'প্রিন্ট'}
                            className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffIDCard;
