import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { 
  Users,
  Plus,
  Edit,
  UserX,
  UserCheck,
  Key,
  AlertTriangle,
  Shield,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Search,
  Filter,
  GraduationCap,
  BookOpen,
  Eye,
  EyeOff
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';

const toBengaliNumeral = (num) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).split('').map(d => bengaliDigits[parseInt(d)] || d).join('');
};

const AdminUserManagement = () => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [institutionShortName, setInstitutionShortName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false);
  const [isBulkActionConfirmOpen, setIsBulkActionConfirmOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [bulkAction, setBulkAction] = useState(null);
  
  const [userFormData, setUserFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    role: 'student',
    student_identifier: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedLinkedEntity, setSelectedLinkedEntity] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/users/with-details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setUsers(response.data.users || []);
        setInstitutionShortName(response.data.institution_short_name || '');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('ব্যবহারকারী তালিকা লোড করতে সমস্যা');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.linked_entity?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesFormat = formatFilter === 'all' || 
      (formatFilter === 'old' && user.is_old_format) ||
      (formatFilter === 'new' && !user.is_old_format);
    
    return matchesSearch && matchesRole && matchesFormat;
  });

  const oldFormatUsers = users.filter(u => u.is_old_format && u.role !== 'admin' && u.role !== 'super_admin');

  const handleCopy = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('কপি করা হয়েছে');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('কপি করতে ব্যর্থ');
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = !user.is_active;
      
      await axios.patch(
        `${API_BASE_URL}/admin/users/${user.id}/status`,
        { is_active: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(newStatus ? 'ব্যবহারকারী সক্রিয় করা হয়েছে' : 'ব্যবহারকারী নিষ্ক্রিয় করা হয়েছে');
      fetchUsers();
    } catch (error) {
      toast.error('স্ট্যাটাস পরিবর্তন করতে সমস্যা');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/admin/users/${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('ব্যবহারকারী মুছে ফেলা হয়েছে');
      setIsDeleteConfirmOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'মুছতে সমস্যা');
    }
  };

  const handleRegenerateCredentials = async () => {
    if (!selectedUser) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/admin/users/${selectedUser.id}/regenerate-credentials`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setGeneratedCredentials({
        username: response.data.username,
        password: response.data.password,
        oldUsername: response.data.old_username
      });
      setIsRegenerateConfirmOpen(false);
      setIsCredentialsModalOpen(true);
      fetchUsers();
      toast.success('নতুন লগইন তথ্য তৈরি হয়েছে');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'লগইন তথ্য তৈরি করতে সমস্যা');
    }
  };

  const handleBulkAction = async () => {
    if (selectedUsers.length === 0) return;
    
    const token = localStorage.getItem('token');
    let successCount = 0;
    let errorCount = 0;
    
    for (const userId of selectedUsers) {
      try {
        if (bulkAction === 'delete') {
          await axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else if (bulkAction === 'regenerate') {
          await axios.post(
            `${API_BASE_URL}/admin/users/${userId}/regenerate-credentials`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else if (bulkAction === 'disable') {
          await axios.patch(
            `${API_BASE_URL}/admin/users/${userId}/status`,
            { is_active: false },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }
    
    if (successCount > 0) {
      toast.success(`${toBengaliNumeral(successCount)} জন সফল`);
    }
    if (errorCount > 0) {
      toast.error(`${toBengaliNumeral(errorCount)} জন ব্যর্থ`);
    }
    
    setIsBulkActionConfirmOpen(false);
    setSelectedUsers([]);
    fetchUsers();
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const selectableUsers = filteredUsers
        .filter(u => u.role !== 'admin' && u.role !== 'super_admin' && u.id !== currentUser?.id)
        .map(u => u.id);
      setSelectedUsers(selectableUsers);
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectAllOldFormat = () => {
    const oldFormatIds = oldFormatUsers.map(u => u.id);
    setSelectedUsers(oldFormatIds);
    toast.info(`${toBengaliNumeral(oldFormatIds.length)} জন পুরাতন ফরম্যাটের ব্যবহারকারী নির্বাচিত`);
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      super_admin: { label: 'সুপার অ্যাডমিন', variant: 'destructive' },
      admin: { label: 'অ্যাডমিন', variant: 'default' },
      teacher: { label: 'উস্তাদ', variant: 'secondary' },
      student: { label: 'ছাত্র', variant: 'outline' }
    };
    const config = roleConfig[role] || { label: role, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLinkedEntityDisplay = (entity) => {
    if (!entity) return <span className="text-gray-400">সংযুক্ত নেই</span>;
    
    if (entity.type === 'student') {
      return (
        <div className="flex items-center gap-2 text-sm">
          <GraduationCap className="h-4 w-4 text-blue-500" />
          <div>
            <div className="font-medium">{entity.name}</div>
            <div className="text-gray-500 text-xs">
              {entity.class_name && `${entity.class_name}`}
              {entity.roll_number && ` | রোল: ${toBengaliNumeral(entity.roll_number)}`}
            </div>
          </div>
        </div>
      );
    } else if (entity.type === 'staff') {
      return (
        <div className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4 text-green-500" />
          <div>
            <div className="font-medium">{entity.name}</div>
            <div className="text-gray-500 text-xs">{entity.designation || entity.department}</div>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/admin/users/create-direct`,
        userFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setGeneratedCredentials({
        username: response.data.username,
        password: response.data.password
      });
      setIsCreateUserModalOpen(false);
      setIsCredentialsModalOpen(true);
      setUserFormData({
        email: '',
        username: '',
        full_name: '',
        password: '',
        role: 'student',
        student_identifier: ''
      });
      toast.success('নতুন ব্যবহারকারী তৈরি হয়েছে');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'ব্যবহারকারী তৈরি করতে সমস্যা');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/admin/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('রোল পরিবর্তন করা হয়েছে');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'রোল পরিবর্তন করতে সমস্যা');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            ব্যবহারকারী ব্যবস্থাপনা
          </CardTitle>
          <Button onClick={() => setIsCreateUserModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            নতুন ব্যবহারকারী তৈরি
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{toBengaliNumeral(users.length)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">মোট ব্যবহারকারী</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-900/20">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {toBengaliNumeral(users.filter(u => u.role === 'student').length)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">ছাত্র অ্যাকাউন্ট</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {toBengaliNumeral(oldFormatUsers.length)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">পুরাতন ফরম্যাট</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 dark:bg-purple-900/20">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {institutionShortName || 'সেট করুন'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">প্রতিষ্ঠান কোড</div>
              </CardContent>
            </Card>
          </div>

          {oldFormatUsers.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">
                  {toBengaliNumeral(oldFormatUsers.length)} জন পুরাতন ফরম্যাটের ব্যবহারকারী আছে
                </span>
              </div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-3">
                এই ব্যবহারকারীদের নতুন ফরম্যাটে ({institutionShortName || 'short_name'}_identifier) রূপান্তর করুন
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleSelectAllOldFormat}
                >
                  <Check className="h-4 w-4 mr-1" />
                  সব নির্বাচন করুন
                </Button>
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => {
                    if (selectedUsers.length > 0) {
                      setBulkAction('regenerate');
                      setIsBulkActionConfirmOpen(true);
                    } else {
                      toast.error('প্রথমে ব্যবহারকারী নির্বাচন করুন');
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  নতুন ফরম্যাটে রূপান্তর
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="নাম, ইউজারনেম বা ইমেইল দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="রোল" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব রোল</SelectItem>
                <SelectItem value="student">ছাত্র</SelectItem>
                <SelectItem value="teacher">উস্তাদ</SelectItem>
                <SelectItem value="admin">অ্যাডমিন</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ফরম্যাট" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ফরম্যাট</SelectItem>
                <SelectItem value="old">পুরাতন ফরম্যাট</SelectItem>
                <SelectItem value="new">নতুন ফরম্যাট</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedUsers.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="text-blue-700 dark:text-blue-300">
                {toBengaliNumeral(selectedUsers.length)} জন নির্বাচিত
              </span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setBulkAction('regenerate');
                    setIsBulkActionConfirmOpen(true);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  লগইন তথ্য পুনরায় তৈরি
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setBulkAction('disable');
                    setIsBulkActionConfirmOpen(true);
                  }}
                >
                  <UserX className="h-4 w-4 mr-1" />
                  নিষ্ক্রিয় করুন
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => {
                    setBulkAction('delete');
                    setIsBulkActionConfirmOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  মুছে ফেলুন
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>
                  বাতিল
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">লোড হচ্ছে...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="p-3 text-left w-10">
                      <Checkbox
                        checked={selectedUsers.length > 0 && selectedUsers.length === filteredUsers.filter(u => u.role !== 'admin' && u.role !== 'super_admin').length}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-3 text-left">ইউজারনেম</th>
                    <th className="p-3 text-left">নাম</th>
                    <th className="p-3 text-left">রোল</th>
                    <th className="p-3 text-left">সংযুক্ত</th>
                    <th className="p-3 text-left">স্ট্যাটাস</th>
                    <th className="p-3 text-left">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${user.is_old_format ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>
                      <td className="p-3">
                        {user.role !== 'admin' && user.role !== 'super_admin' && user.id !== currentUser?.id && (
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers([...selectedUsers, user.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                              }
                            }}
                          />
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {user.username}
                          </code>
                          {user.is_old_format && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-400 text-xs">
                              পুরাতন
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">{user.full_name}</td>
                      <td className="p-3">{getRoleBadge(user.role)}</td>
                      <td className="p-3">{getLinkedEntityDisplay(user.linked_entity)}</td>
                      <td className="p-3">
                        {user.is_active !== false ? (
                          <Badge variant="outline" className="text-green-600 border-green-400">
                            <UserCheck className="h-3 w-3 mr-1" />
                            সক্রিয়
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-400">
                            <UserX className="h-3 w-3 mr-1" />
                            নিষ্ক্রিয়
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {user.role !== 'admin' && user.role !== 'super_admin' && user.id !== currentUser?.id && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                title="লগইন তথ্য পুনরায় তৈরি"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsRegenerateConfirmOpen(true);
                                }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title={user.is_active !== false ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                                onClick={() => handleToggleUserStatus(user)}
                              >
                                {user.is_active !== false ? (
                                  <UserX className="h-4 w-4 text-orange-500" />
                                ) : (
                                  <UserCheck className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title="মুছে ফেলুন"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          {(user.role === 'admin' || user.role === 'super_admin') && (
                            <Badge variant="outline" className="text-gray-400">
                              <Shield className="h-3 w-3 mr-1" />
                              সুরক্ষিত
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  কোন ব্যবহারকারী পাওয়া যায়নি
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCredentialsModalOpen} onOpenChange={setIsCredentialsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-green-500" />
              নতুন লগইন তথ্য তৈরি হয়েছে
            </DialogTitle>
          </DialogHeader>
          
          {generatedCredentials && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                  এই তথ্য একবারই দেখানো হবে। এখনই কপি করে সংরক্ষণ করুন।
                </p>
              </div>
              
              {generatedCredentials.oldUsername && (
                <div className="text-sm text-gray-500">
                  পুরাতন ইউজারনেম: <code className="line-through">{generatedCredentials.oldUsername}</code>
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-500">নতুন ইউজারনেম</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      value={generatedCredentials.username} 
                      readOnly 
                      className="font-mono bg-gray-50"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(generatedCredentials.username, 'username')}
                    >
                      {copiedField === 'username' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm text-gray-500">নতুন পাসওয়ার্ড</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      value={generatedCredentials.password} 
                      readOnly 
                      className="font-mono bg-gray-50"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(generatedCredentials.password, 'password')}
                    >
                      {copiedField === 'password' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <Button
                className="w-full"
                onClick={() => {
                  const text = `ইউজারনেম: ${generatedCredentials.username}\nপাসওয়ার্ড: ${generatedCredentials.password}`;
                  handleCopy(text, 'both');
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                সব কপি করুন
              </Button>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCredentialsModalOpen(false);
              setGeneratedCredentials(null);
            }}>
              বন্ধ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              ব্যবহারকারী মুছে ফেলুন?
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium">{selectedUser?.full_name}</span> ({selectedUser?.username}) 
              এর অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলা হবে। এই কাজ পূর্বাবস্থায় ফেরানো যাবে না।
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              বাতিল
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              <Trash2 className="h-4 w-4 mr-2" />
              মুছে ফেলুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRegenerateConfirmOpen} onOpenChange={setIsRegenerateConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              লগইন তথ্য পুনরায় তৈরি করুন?
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium">{selectedUser?.full_name}</span> এর জন্য নতুন ইউজারনেম ও পাসওয়ার্ড তৈরি হবে।
              পুরাতন লগইন তথ্য আর কাজ করবে না।
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegenerateConfirmOpen(false)}>
              বাতিল
            </Button>
            <Button onClick={handleRegenerateCredentials}>
              <RefreshCw className="h-4 w-4 mr-2" />
              তৈরি করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkActionConfirmOpen} onOpenChange={setIsBulkActionConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkAction === 'delete' && <Trash2 className="h-5 w-5 text-red-500" />}
              {bulkAction === 'regenerate' && <RefreshCw className="h-5 w-5 text-blue-500" />}
              {bulkAction === 'disable' && <UserX className="h-5 w-5 text-orange-500" />}
              {bulkAction === 'delete' && 'সব মুছে ফেলুন?'}
              {bulkAction === 'regenerate' && 'সবার লগইন তথ্য পুনরায় তৈরি করুন?'}
              {bulkAction === 'disable' && 'সব নিষ্ক্রিয় করুন?'}
            </DialogTitle>
            <DialogDescription>
              {toBengaliNumeral(selectedUsers.length)} জন ব্যবহারকারীর জন্য এই অ্যাকশন প্রয়োগ হবে।
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkActionConfirmOpen(false)}>
              বাতিল
            </Button>
            <Button 
              variant={bulkAction === 'delete' ? 'destructive' : 'default'}
              onClick={handleBulkAction}
            >
              নিশ্চিত করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateUserModalOpen} onOpenChange={setIsCreateUserModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-500" />
              নতুন ব্যবহারকারী তৈরি করুন
            </DialogTitle>
            <DialogDescription>
              নতুন ছাত্র, উস্তাদ বা অ্যাডমিন অ্যাকাউন্ট তৈরি করুন
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>পূর্ণ নাম *</Label>
              <Input
                value={userFormData.full_name}
                onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                placeholder="যেমন: মুহাম্মদ ফরিদ"
              />
            </div>
            
            <div>
              <Label>রোল *</Label>
              <Select 
                value={userFormData.role} 
                onValueChange={(value) => setUserFormData({ ...userFormData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="রোল নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-blue-500" />
                      ছাত্র
                    </div>
                  </SelectItem>
                  <SelectItem value="teacher">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-green-500" />
                      উস্তাদ
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      অ্যাডমিন
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>ইউজার আইডি (Student Identifier) *</Label>
              <Input
                value={userFormData.student_identifier}
                onChange={(e) => setUserFormData({ ...userFormData, student_identifier: e.target.value })}
                placeholder="যেমন: farid66"
              />
              <p className="text-xs text-gray-500 mt-1">
                ইউজারনেম হবে: {institutionShortName || 'short_name'}_{userFormData.student_identifier || 'identifier'}
              </p>
            </div>
            
            <div>
              <Label>ইমেইল (ঐচ্ছিক)</Label>
              <Input
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                <Key className="h-4 w-4" />
                <span>পাসওয়ার্ড স্বয়ংক্রিয়ভাবে তৈরি হবে</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                ফরম্যাট: {userFormData.full_name?.split(' ')[0] || 'Name'}XXX@2026
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <h4 className="text-sm font-medium mb-2">এই রোলের অনুমতি:</h4>
              {userFormData.role === 'student' && (
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• স্টুডেন্ট পোর্টাল অ্যাক্সেস</li>
                  <li>• লাইভ ক্লাস দেখা</li>
                  <li>• হোমওয়ার্ক জমা দেওয়া</li>
                  <li>• হাজিরা দেখা</li>
                </ul>
              )}
              {userFormData.role === 'teacher' && (
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• হাজিরা নেওয়া</li>
                  <li>• হোমওয়ার্ক দেওয়া</li>
                  <li>• লাইভ ক্লাস পরিচালনা</li>
                  <li>• ছাত্র তথ্য দেখা</li>
                </ul>
              )}
              {userFormData.role === 'admin' && (
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• সম্পূর্ণ সিস্টেম নিয়ন্ত্রণ</li>
                  <li>• ছাত্র ও উস্তাদ ব্যবস্থাপনা</li>
                  <li>• ফি ব্যবস্থাপনা</li>
                  <li>• সেটিংস পরিবর্তন</li>
                </ul>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateUserModalOpen(false);
              setUserFormData({
                email: '',
                username: '',
                full_name: '',
                password: '',
                role: 'student',
                student_identifier: ''
              });
            }}>
              বাতিল
            </Button>
            <Button 
              onClick={handleCreateUser}
              disabled={!userFormData.full_name || !userFormData.student_identifier}
            >
              <Plus className="h-4 w-4 mr-2" />
              তৈরি করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserManagement;
