import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import {
  Building2,
  Plus,
  Settings,
  Users,
  BookOpen,
  DollarSign,
  Award,
  Calendar,
  BarChart3,
  MessageSquare,
  Sparkles,
  Target,
  FileText,
  Car,
  Clock,
  GraduationCap,
  Fingerprint,
  UserPlus,
  ClipboardCheck,
  FileSpreadsheet,
  Calculator,
  Home,
  UserCheck,
  Trash2,
  Eye,
  EyeOff,
  Edit,
  Key,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

const ALL_MODULES = [
  { key: 'home', label: 'Dashboard', icon: Home, category: 'Core' },
  { key: 'admission-summary', label: 'Admission Summary', icon: ClipboardCheck, category: 'Core' },
  { key: 'students', label: 'Students', icon: Users, category: 'Core' },
  { key: 'staff', label: 'Staff', icon: UserCheck, category: 'Core' },
  { key: 'class', label: 'Classes', icon: BookOpen, category: 'Core' },
  { key: 'attendance', label: 'Attendance', icon: ClipboardCheck, category: 'Academic' },
  { key: 'results', label: 'Results', icon: FileSpreadsheet, category: 'Academic' },
  { key: 'hss-module', label: 'HSS Module', icon: GraduationCap, category: 'Academic' },
  { key: 'fees', label: 'Fees', icon: DollarSign, category: 'Financial' },
  { key: 'accounts', label: 'Accounts', icon: Calculator, category: 'Financial' },
  { key: 'certificates', label: 'Certificates', icon: Award, category: 'Administration' },
  { key: 'vehicle', label: 'Vehicle/Transport', icon: Car, category: 'Administration' },
  { key: 'calendar', label: 'Calendar', icon: Calendar, category: 'Administration' },
  { key: 'timetable', label: 'TimeTable', icon: Clock, category: 'Administration' },
  { key: 'cms', label: 'Academic CMS', icon: BookOpen, category: 'AI & Learning' },
  { key: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, category: 'AI & Learning' },
  { key: 'quiz-tool', label: 'Quiz Tool', icon: Target, category: 'AI & Learning' },
  { key: 'test-generator', label: 'Test Generator', icon: FileText, category: 'AI & Learning' },
  { key: 'ai-summary', label: 'AI Summary', icon: BookOpen, category: 'AI & Learning' },
  { key: 'ai-notes', label: 'AI Notes', icon: FileText, category: 'AI & Learning' },
  { key: 'reports', label: 'Reports', icon: BarChart3, category: 'Analytics' },
  { key: 'biometric', label: 'Biometric Devices', icon: Fingerprint, category: 'Hardware' },
  { key: 'online-admission', label: 'Online Admission', icon: UserPlus, category: 'Admission' },
  { key: 'settings', label: 'Settings', icon: Settings, category: 'System' },
  { key: 'communication', label: 'Communication', icon: MessageSquare, category: 'Communication' }
];

const ROLES = [
  { value: 'admin', label: 'School Admin' },
  { value: 'principal', label: 'Principal' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'staff', label: 'Staff' },
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' }
];

const TenantManagement = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState([]);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState({
    name: '',
    domain: '',
    contact_email: '',
    contact_phone: '',
    address: ''
  });
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'admin',
    phone: ''
  });
  
  // Edit User state
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    full_name: '',
    email: '',
    role: '',
    is_active: true
  });
  const [savingUser, setSavingUser] = useState(false);
  
  // Reset Password state
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/tenants');
      setTenants(response.data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchTenants();
    }
  }, [user, fetchTenants]);

  const handleOpenModuleDialog = async (tenant) => {
    try {
      const response = await axios.get(`/api/tenants/${tenant.id}`);
      setSelectedTenant(response.data);
      setSelectedModules(response.data.allowed_modules || ALL_MODULES.map(m => m.key));
      setIsModuleDialogOpen(true);
    } catch (error) {
      toast.error('Failed to fetch tenant details');
    }
  };

  const handleOpenUserDialog = async (tenant) => {
    try {
      setSelectedTenant(tenant);
      setLoadingUsers(true);
      setIsUserDialogOpen(true);
      const response = await axios.get(`/api/tenants/${tenant.id}/users`);
      setTenantUsers(response.data.users || []);
    } catch (error) {
      toast.error('Failed to fetch users');
      setTenantUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleModuleToggle = (moduleKey) => {
    setSelectedModules(prev => {
      if (prev.includes(moduleKey)) {
        return prev.filter(m => m !== moduleKey);
      } else {
        return [...prev, moduleKey];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedModules(ALL_MODULES.map(m => m.key));
  };

  const handleDeselectAll = () => {
    setSelectedModules([]);
  };

  const handleSaveModules = async () => {
    try {
      await axios.put(`/api/tenants/${selectedTenant.id}/modules`, {
        allowed_modules: selectedModules
      });
      toast.success('Module access updated successfully');
      setIsModuleDialogOpen(false);
      fetchTenants();
    } catch (error) {
      toast.error('Failed to update modules');
    }
  };

  const handleOpenDeleteDialog = (tenant) => {
    setTenantToDelete(tenant);
    setDeleteConfirmText('');
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTenant = async () => {
    if (!tenantToDelete || deleteConfirmText !== tenantToDelete.name) {
      toast.error('Please type the school name correctly to confirm deletion');
      return;
    }
    
    try {
      setDeleting(true);
      await axios.delete(`/api/tenants/${tenantToDelete.id}`);
      toast.success(`School "${tenantToDelete.name}" and all its data deleted successfully`);
      setIsDeleteDialogOpen(false);
      setTenantToDelete(null);
      setDeleteConfirmText('');
      fetchTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete school');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateTenant = async () => {
    try {
      if (!newTenantForm.name || !newTenantForm.domain || !newTenantForm.contact_email) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      await axios.post('/api/tenants', {
        ...newTenantForm,
        id: newTenantForm.domain.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        allowed_modules: selectedModules.length > 0 ? selectedModules : ALL_MODULES.map(m => m.key)
      });
      
      toast.success('School created successfully');
      setIsCreateDialogOpen(false);
      setNewTenantForm({ name: '', domain: '', contact_email: '', contact_phone: '', address: '' });
      setSelectedModules([]);
      fetchTenants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create school');
    }
  };

  const handleAddUser = async () => {
    try {
      if (!newUserForm.username || !newUserForm.email || !newUserForm.password || !newUserForm.full_name) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      await axios.post(`/api/admin/users?target_tenant_id=${selectedTenant.id}`, newUserForm);
      
      toast.success('User created successfully');
      setIsAddUserDialogOpen(false);
      setNewUserForm({ username: '', email: '', password: '', full_name: '', role: 'admin', phone: '' });
      
      // Refresh users list
      const response = await axios.get(`/api/tenants/${selectedTenant.id}/users`);
      setTenantUsers(response.data.users || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  // Open Edit User Dialog
  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setEditUserForm({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'teacher',
      is_active: user.is_active !== false
    });
    setIsEditUserDialogOpen(true);
  };

  // Save User Changes
  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    try {
      setSavingUser(true);
      await axios.put(
        `/api/admin/users/${editingUser.id}?target_tenant_id=${selectedTenant.id}`,
        editUserForm
      );
      
      toast.success('User updated successfully');
      setIsEditUserDialogOpen(false);
      setEditingUser(null);
      
      // Refresh users list
      const response = await axios.get(`/api/tenants/${selectedTenant.id}/users`);
      setTenantUsers(response.data.users || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    } finally {
      setSavingUser(false);
    }
  };

  // Open Reset Password Dialog
  const handleOpenResetPassword = (user) => {
    setResetPasswordUser(user);
    setNewPassword('');
    setShowNewPassword(false);
    setPasswordCopied(false);
    setIsResetPasswordDialogOpen(true);
  };

  // Generate Random Password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setShowNewPassword(true);
  };

  // Copy Password to Clipboard
  const copyPassword = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      setPasswordCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy password');
    }
  };

  // Reset User Password
  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      setResettingPassword(true);
      await axios.post(
        `/api/admin/users/${resetPasswordUser.id}/reset-password?target_tenant_id=${selectedTenant.id}`,
        { new_password: newPassword }
      );
      
      toast.success('Password reset successfully');
      setIsResetPasswordDialogOpen(false);
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  // Toggle User Status
  const handleStatusToggle = async (user) => {
    try {
      await axios.post(
        `/api/admin/users/${user.id}/status?target_tenant_id=${selectedTenant.id}`,
        { is_active: !user.is_active }
      );
      
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      
      // Refresh users list
      const response = await axios.get(`/api/tenants/${selectedTenant.id}/users`);
      setTenantUsers(response.data.users || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user status');
    }
  };

  const groupedModules = ALL_MODULES.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {});

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You don't have permission to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-gray-600 mt-1">Manage schools, users, and module access</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="h-4 w-4 mr-2" />
              Add New School
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New School Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>School Name *</Label>
                  <Input
                    value={newTenantForm.name}
                    onChange={(e) => setNewTenantForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter school name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Domain/Code *</Label>
                  <Input
                    value={newTenantForm.domain}
                    onChange={(e) => setNewTenantForm(prev => ({ ...prev, domain: e.target.value }))}
                    placeholder="e.g., school-code"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Email *</Label>
                  <Input
                    type="email"
                    value={newTenantForm.contact_email}
                    onChange={(e) => setNewTenantForm(prev => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="admin@school.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    value={newTenantForm.contact_phone}
                    onChange={(e) => setNewTenantForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={newTenantForm.address}
                  onChange={(e) => setNewTenantForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="School address"
                />
              </div>
              
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-lg font-semibold">Module Access</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>Select All</Button>
                    <Button variant="outline" size="sm" onClick={handleDeselectAll}>Deselect All</Button>
                  </div>
                </div>
                
                {Object.entries(groupedModules).map(([category, modules]) => (
                  <div key={category} className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{category}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {modules.map((module) => {
                        const Icon = module.icon;
                        return (
                          <div
                            key={module.key}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                              selectedModules.includes(module.key)
                                ? 'bg-emerald-50 border-emerald-300'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                            onClick={() => handleModuleToggle(module.key)}
                          >
                            <Checkbox
                              checked={selectedModules.includes(module.key)}
                              onCheckedChange={() => handleModuleToggle(module.key)}
                            />
                            <Icon className="h-4 w-4 text-gray-600" />
                            <span className="text-sm">{module.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleCreateTenant}>
                Create School
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{tenant.name}</CardTitle>
                    <p className="text-sm text-gray-500">{tenant.domain || tenant.id}</p>
                  </div>
                </div>
                <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                  {tenant.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>{tenant.contact_email}</p>
                <p>{tenant.contact_phone}</p>
                <p className="truncate">{tenant.address}</p>
              </div>
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {tenant.allowed_modules?.length || ALL_MODULES.length} modules enabled
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModuleDialog(tenant)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Modules
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Manage school users</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenUserDialog(tenant)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Users
                  </Button>
                </div>
                <div className="flex items-center justify-between pt-2 border-t mt-2">
                  <span className="text-sm text-red-500">Delete this school</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleOpenDeleteDialog(tenant)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Module Management Dialog */}
      <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Module Access - {selectedTenant?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                Select which modules this school can access
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>Select All</Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>Deselect All</Button>
              </div>
            </div>
            
            {Object.entries(groupedModules).map(([category, modules]) => (
              <div key={category} className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{category}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {modules.map((module) => {
                    const Icon = module.icon;
                    return (
                      <div
                        key={module.key}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedModules.includes(module.key)
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => handleModuleToggle(module.key)}
                      >
                        <Checkbox
                          checked={selectedModules.includes(module.key)}
                          onCheckedChange={() => handleModuleToggle(module.key)}
                        />
                        <Icon className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">{module.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModuleDialogOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleSaveModules}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Management Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Users - {selectedTenant?.name}</span>
              <Button 
                size="sm" 
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={() => setIsAddUserDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : tenantUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No users found for this school</p>
                <p className="text-sm mt-2">Click "Add User" to create the first user</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-6 gap-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg font-medium text-sm">
                  <span>Name</span>
                  <span>Username</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>
                {tenantUsers.map((u) => (
                  <div key={u.id} className="grid grid-cols-6 gap-4 p-2 border dark:border-gray-700 rounded-lg text-sm items-center">
                    <span className="truncate">{u.full_name}</span>
                    <span className="truncate text-gray-600 dark:text-gray-400">{u.username}</span>
                    <span className="truncate text-gray-600 dark:text-gray-400">{u.email}</span>
                    <Badge variant="outline" className="w-fit capitalize">{u.role}</Badge>
                    <Badge 
                      variant={u.is_active !== false ? 'default' : 'secondary'} 
                      className={`w-fit cursor-pointer ${u.is_active !== false ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 hover:bg-gray-500'}`}
                      onClick={() => handleToggleUserStatus(u)}
                    >
                      {u.is_active !== false ? 'Active' : 'Inactive'}
                    </Badge>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleOpenEditUser(u)}
                        title="Edit User"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-orange-500 hover:text-orange-600"
                        onClick={() => handleOpenResetPassword(u)}
                        title="Reset Password"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User to {selectedTenant?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={newUserForm.full_name}
                onChange={(e) => setNewUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="username"
                />
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value }))}
                >
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@school.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={newUserForm.phone}
                onChange={(e) => setNewUserForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleAddUser}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete School
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium">Warning: This action cannot be undone!</p>
              <p className="text-sm text-red-700 mt-2">
                Deleting this school will permanently remove:
              </p>
              <ul className="text-sm text-red-700 mt-2 list-disc list-inside space-y-1">
                <li>All students and their records</li>
                <li>All staff members</li>
                <li>All attendance records</li>
                <li>All fee payments and financial data</li>
                <li>All certificates and results</li>
                <li>All users associated with this school</li>
                <li>All other data for this school</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-700">
                To confirm, type the school name: <span className="font-bold">{tenantToDelete?.name}</span>
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type school name to confirm"
                className="border-red-300 focus:border-red-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setTenantToDelete(null);
                setDeleteConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteTenant}
              disabled={deleting || deleteConfirmText !== tenantToDelete?.name}
            >
              {deleting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete School
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-500" />
              Edit User - {editingUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editUserForm.full_name}
                onChange={(e) => setEditUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editUserForm.email}
                onChange={(e) => setEditUserForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@school.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background dark:bg-gray-800 dark:text-white"
                value={editUserForm.role}
                onChange={(e) => setEditUserForm(prev => ({ ...prev, role: e.target.value }))}
              >
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox 
                id="user-active"
                checked={editUserForm.is_active}
                onCheckedChange={(checked) => setEditUserForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="user-active" className="cursor-pointer">
                User is Active
              </Label>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="text-orange-500 border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2"
              onClick={() => {
                setIsEditUserDialogOpen(false);
                handleOpenResetPassword(editingUser);
              }}
            >
              <Key className="h-4 w-4" />
              Reset Password
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-blue-500 hover:bg-blue-600"
                onClick={handleSaveUser}
                disabled={savingUser}
              >
                {savingUser ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-orange-500" />
              Reset Password - {resetPasswordUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <p className="text-sm text-orange-800 dark:text-orange-300">
                You are about to reset the password for <strong>{resetPasswordUser?.username}</strong>.
                The user will need to use the new password to log in.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>New Password</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generatePassword}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Generate
                </Button>
              </div>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="pr-20"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                  {newPassword && (
                    <button
                      type="button"
                      className="p-1.5 text-gray-500 hover:text-gray-700"
                      onClick={copyPassword}
                      title="Copy password"
                    >
                      {passwordCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-1.5 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="text-xs text-red-500">Password must be at least 6 characters</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleResetPassword}
              disabled={resettingPassword || !newPassword || newPassword.length < 6}
            >
              {resettingPassword ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantManagement;
