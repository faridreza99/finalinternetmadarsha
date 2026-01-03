import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { 
  Building2, 
  Upload, 
  Palette, 
  Phone, 
  Mail, 
  Globe, 
  MapPin,
  Save,
  Image,
  FileImage,
  Award,
  User,
  Calendar,
  Hash
} from 'lucide-react';

const SchoolBranding = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState({
    school_name: '',
    tagline: '',
    logo_url: null,
    favicon_url: null,
    primary_color: '#10B981',
    secondary_color: '#3B82F6',
    accent_color: '#8B5CF6',
    address: '',
    phone: '',
    email: '',
    website: '',
    eiin_number: '',
    established_year: '',
    principal_name: '',
    principal_signature_url: null
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://portal.mahajampurdarbarsharif.org/api';

  const fetchBranding = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/school-branding`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranding(response.data);
    } catch (error) {
      console.error('Error fetching branding:', error);
      toast.error('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const handleInputChange = (field, value) => {
    setBranding(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_BASE_URL}/school-branding/upload-logo`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setBranding(prev => ({ ...prev, [field]: response.data.logo_url }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/school-branding`, branding, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Branding settings saved successfully');
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error(error.response?.data?.detail || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">School Branding</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Customize your school's appearance across the system</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-500" />
                Basic Information
              </CardTitle>
              <CardDescription>School name and details shown throughout the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>School Name *</Label>
                  <Input
                    value={branding.school_name}
                    onChange={(e) => handleInputChange('school_name', e.target.value)}
                    placeholder="Your School Name"
                  />
                </div>
                <div>
                  <Label>Tagline / Slogan</Label>
                  <Input
                    value={branding.tagline}
                    onChange={(e) => handleInputChange('tagline', e.target.value)}
                    placeholder="e.g., Excellence in Education"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <Hash className="h-4 w-4" /> EIIN Number
                  </Label>
                  <Input
                    value={branding.eiin_number}
                    onChange={(e) => handleInputChange('eiin_number', e.target.value)}
                    placeholder="e.g., 123456"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Established Year
                  </Label>
                  <Input
                    value={branding.established_year}
                    onChange={(e) => handleInputChange('established_year', e.target.value)}
                    placeholder="e.g., 1990"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <User className="h-4 w-4" /> Principal Name
                  </Label>
                  <Input
                    value={branding.principal_name}
                    onChange={(e) => handleInputChange('principal_name', e.target.value)}
                    placeholder="Principal's Full Name"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> Address
                  </Label>
                  <Input
                    value={branding.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="School Address"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-500" />
                Contact Information
              </CardTitle>
              <CardDescription>Contact details for reports and certificates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <Phone className="h-4 w-4" /> Phone
                  </Label>
                  <Input
                    value={branding.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+880 1XXX-XXXXXX"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Mail className="h-4 w-4" /> Email
                  </Label>
                  <Input
                    type="email"
                    value={branding.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="school@example.com"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Globe className="h-4 w-4" /> Website
                  </Label>
                  <Input
                    value={branding.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="www.yourschool.edu.bd"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-purple-500" />
                Theme Colors
              </CardTitle>
              <CardDescription>Customize the color scheme of your school portal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={branding.primary_color}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={branding.primary_color}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Buttons, links, sidebar</p>
                </div>
                <div>
                  <Label>Secondary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={branding.secondary_color}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={branding.secondary_color}
                      onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Accents, badges</p>
                </div>
                <div>
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={branding.accent_color}
                      onChange={(e) => handleInputChange('accent_color', e.target.value)}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={branding.accent_color}
                      onChange={(e) => handleInputChange('accent_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Highlights, icons</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-orange-500" />
                School Logo
              </CardTitle>
              <CardDescription>Upload your school's logo (PNG, JPG, SVG)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600">
                  {branding.logo_url ? (
                    <img src={branding.logo_url} alt="School Logo" className="max-w-full max-h-full object-contain p-4" />
                  ) : (
                    <div className="text-center p-4">
                      <FileImage className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No logo uploaded</p>
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, 'logo_url')}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById('logo-upload').click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Principal Signature
              </CardTitle>
              <CardDescription>For certificates and official documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600">
                  {branding.principal_signature_url ? (
                    <img src={branding.principal_signature_url} alt="Signature" className="max-w-full max-h-full object-contain p-2" />
                  ) : (
                    <p className="text-sm text-gray-500">No signature uploaded</p>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    id="signature-upload"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, 'principal_signature_url')}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById('signature-upload').click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Signature
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 text-center space-y-2">
                {branding.logo_url && (
                  <img src={branding.logo_url} alt="Preview" className="h-16 w-16 mx-auto object-contain" />
                )}
                <h3 className="font-bold text-lg" style={{ color: branding.primary_color }}>
                  {branding.school_name || 'Your School Name'}
                </h3>
                <p className="text-sm text-gray-500">{branding.tagline || 'Your School Tagline'}</p>
                <div className="flex justify-center gap-2 mt-3">
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: branding.primary_color }} title="Primary"></div>
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: branding.secondary_color }} title="Secondary"></div>
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: branding.accent_color }} title="Accent"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SchoolBranding;
