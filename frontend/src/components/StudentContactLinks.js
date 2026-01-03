import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Facebook, Youtube, MessageCircle, Globe, Star, ExternalLink, Phone, Mail, MapPin } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '/api';

const LINK_ICONS = {
  facebook: { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900' },
  youtube: { icon: Youtube, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900' },
  facebook_review: { icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900' },
  whatsapp: { icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900' },
  telegram: { icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900' },
  website: { icon: Globe, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900' },
  phone: { icon: Phone, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900' },
  mail: { icon: Mail, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900' },
  'map-pin': { icon: MapPin, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900' },
  social: { icon: Globe, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900' },
  contact: { icon: Phone, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900' },
  address: { icon: MapPin, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900' }
};

const LINK_LABELS = {
  facebook: 'ফেসবুক পেজ',
  youtube: 'ইউটিউব চ্যানেল',
  facebook_review: 'রিভিউ দিন',
  whatsapp: 'হোয়াটসঅ্যাপ',
  telegram: 'টেলিগ্রাম',
  website: 'ওয়েবসাইট',
  phone: 'ফোন',
  email: 'ইমেইল',
  address: 'ঠিকানা'
};

const StudentContactLinks = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/student/contact-links`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLinks(response.data.links || []);
    } catch (error) {
      console.error('Failed to fetch contact links:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleOpenLink = (link) => {
    if (link.url) {
      window.open(link.url, '_blank');
    } else if (link.value) {
      if (link.type === 'contact' && link.icon === 'phone') {
        window.open(`tel:${link.value}`, '_self');
      } else if (link.type === 'contact' && link.icon === 'mail') {
        window.open(`mailto:${link.value}`, '_self');
      } else {
        toast.info(link.value);
      }
    } else {
      toast.info('লিংক পাওয়া যায়নি');
    }
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Phone className="w-6 h-6 text-emerald-600" />
          যোগাযোগ
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          বিভিন্ন মাধ্যমে আমাদের সাথে যোগাযোগ করুন
        </p>
      </div>

      {links.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500 dark:text-gray-400">
            <Phone className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>যোগাযোগের তথ্য পাওয়া যায়নি।</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link, index) => {
            const iconKey = link.icon || link.type || 'social';
            const config = LINK_ICONS[iconKey] || LINK_ICONS.social;
            const Icon = config.icon;
            const label = link.name || LINK_LABELS[link.icon] || LINK_LABELS[link.type] || link.name_en || 'লিংক';
            
            return (
              <Card 
                key={link.id || index} 
                className="hover:shadow-lg transition-shadow cursor-pointer dark:bg-gray-800 dark:border-gray-700"
                onClick={() => handleOpenLink(link)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${config.bg}`}>
                      <Icon className={`w-6 h-6 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {label}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {link.value || link.url || 'উপলব্ধ নেই'}
                      </p>
                    </div>
                    {(link.url || (link.type !== 'address')) && (
                      <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 dark:border-emerald-800">
        <CardHeader>
          <CardTitle className="text-emerald-800 dark:text-emerald-200">সাহায্য প্রয়োজন?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-emerald-700 dark:text-emerald-300 mb-4">
            কোনো প্রশ্ন থাকলে বা সাহায্যের প্রয়োজন হলে উপরের যেকোনো মাধ্যমে আমাদের সাথে যোগাযোগ করুন।
            আমরা সাহায্য করতে প্রস্তুত!
          </p>
          <div className="flex flex-wrap gap-2">
            {links.filter(l => (l.icon === 'whatsapp' || l.type === 'whatsapp') && (l.url || l.value)).map((link, index) => (
              <Button 
                key={index}
                onClick={() => handleOpenLink(link)}
                className="bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                হোয়াটসঅ্যাপে মেসেজ করুন
              </Button>
            ))}
            {links.filter(l => l.icon === 'phone' && l.value).map((link, index) => (
              <Button 
                key={`phone-${index}`}
                onClick={() => handleOpenLink(link)}
                variant="outline"
                className="dark:border-emerald-700 dark:text-emerald-300"
              >
                <Phone className="w-4 h-4 mr-2" />
                কল করুন
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentContactLinks;
