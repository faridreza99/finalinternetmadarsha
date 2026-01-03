import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Save,
  Camera,
  Lock,
  Calendar,
  GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_API_URL || 'https://portal.mahajampurdarbarsharif.org/api';
const BASE_URL = API.replace('/api', '');

const StudentProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    address: '',
    guardian_phone: ''
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/student/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
      setFormData({
        phone: response.data.phone || '',
        email: response.data.email || '',
        address: response.data.address || '',
        guardian_phone: response.data.guardian_phone || ''
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.put(`${API}/student/me`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Profile updated successfully');
      fetchProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.post(`${API}/student/me/photo`, formDataUpload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Photo uploaded successfully');
      fetchProfile();
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Unable to load profile. Please try again later.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">View and update your personal information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-center">Profile Photo</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="relative inline-block">
              {profile.photo_url ? (
                <img 
                  src={`${BASE_URL}${profile.photo_url}`} 
                  alt={profile.name}
                  className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-blue-500"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto">
                  <User className="h-16 w-16 text-gray-400" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                <Camera className="h-4 w-4" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">{profile.name}</h3>
            <p className="text-gray-600 dark:text-gray-400">{profile.admission_no}</p>
            <Badge className="mt-2" variant="secondary">
              {profile.class_standard} - Section {profile.section_name}
            </Badge>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-400" />
              Academic Information
            </CardTitle>
            <CardDescription>These fields cannot be modified</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-500">Full Name</Label>
                <Input value={profile.name} disabled className="bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-500">Admission No</Label>
                <Input value={profile.admission_no} disabled className="bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-500">Roll No</Label>
                <Input value={profile.roll_no} disabled className="bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-500">Date of Birth</Label>
                <Input value={profile.date_of_birth} disabled className="bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-500">Class</Label>
                <Input value={`${profile.class_name} (${profile.class_standard})`} disabled className="bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-500">Section</Label>
                <Input value={profile.section_name} disabled className="bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-500">Father's Name</Label>
                <Input value={profile.father_name} disabled className="bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-500">Mother's Name</Label>
                <Input value={profile.mother_name} disabled className="bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-500">Gender</Label>
                <Input value={profile.gender} disabled className="bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-500">Guardian Name</Label>
                <Input value={profile.guardian_name} disabled className="bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Editable Information
          </CardTitle>
          <CardDescription>You can update these fields</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardian_phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Guardian Phone
              </Label>
              <Input
                id="guardian_phone"
                value={formData.guardian_phone}
                onChange={(e) => handleInputChange('guardian_phone', e.target.value)}
                placeholder="Enter guardian phone"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter address"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentProfile;
