import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Facebook, Youtube, MessageCircle, Globe, Star, Save } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '/api';

const LINK_TYPES = [
  { type: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600' },
  { type: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-600' },
  { type: 'facebook_review', label: 'Facebook Review', icon: Star, color: 'text-yellow-600' },
  { type: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600' },
  { type: 'website', label: 'Website', icon: Globe, color: 'text-purple-600' }
];

const ContactLinksManagement = () => {
  const [links, setLinks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/contact-links`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const linksMap = {};
      (response.data.links || []).forEach(link => {
        linksMap[link.link_type] = link.url;
      });
      setLinks(linksMap);
    } catch (error) {
      console.error('Failed to fetch links:', error);
      toast.error('Failed to load contact links');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleSave = async (linkType, url) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.post(`${API}/contact-links`, {
        link_type: linkType,
        url: url,
        is_active: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Link saved successfully');
    } catch (error) {
      console.error('Failed to save link:', error);
      toast.error('Failed to save link');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (type, value) => {
    setLinks(prev => ({
      ...prev,
      [type]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Contact Links Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage social media and contact links shown to students
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {LINK_TYPES.map(({ type, label, icon: Icon, color }) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icon className={`w-5 h-5 mr-2 ${color}`} />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor={type}>URL</Label>
                  <Input
                    id={type}
                    value={links[type] || ''}
                    onChange={(e) => handleChange(type, e.target.value)}
                    placeholder={`Enter ${label} URL`}
                  />
                </div>
                <Button
                  onClick={() => handleSave(type, links[type] || '')}
                  disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ContactLinksManagement;
