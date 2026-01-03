import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Facebook, Youtube, MessageCircle, Globe, Star, ExternalLink, Phone } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '/api';

const LINK_ICONS = {
  facebook: { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-100' },
  youtube: { icon: Youtube, color: 'text-red-600', bg: 'bg-red-100' },
  facebook_review: { icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  whatsapp: { icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-100' },
  website: { icon: Globe, color: 'text-purple-600', bg: 'bg-purple-100' }
};

const LINK_LABELS = {
  facebook: 'Facebook Page',
  youtube: 'YouTube Channel',
  facebook_review: 'Leave a Review',
  whatsapp: 'WhatsApp Support',
  website: 'Official Website'
};

const StudentContactLinks = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/contact-links`, {
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
    } else {
      toast.info('Link not available');
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
          Contact Us
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect with us through various channels
        </p>
      </div>

      {links.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Phone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No contact links available.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link) => {
            const config = LINK_ICONS[link.link_type] || { icon: Globe, color: 'text-gray-600', bg: 'bg-gray-100' };
            const Icon = config.icon;
            const label = LINK_LABELS[link.link_type] || link.label || link.link_type;
            
            return (
              <Card 
                key={link.link_type} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleOpenLink(link)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${config.bg}`}>
                      <Icon className={`w-6 h-6 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {label}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {link.url || 'Not available'}
                      </p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
        <CardHeader>
          <CardTitle className="text-emerald-800 dark:text-emerald-200">Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-emerald-700 dark:text-emerald-300 mb-4">
            If you have any questions or need assistance, feel free to reach out to us through any of the channels above.
            We're here to help!
          </p>
          <div className="flex flex-wrap gap-2">
            {links.filter(l => l.link_type === 'whatsapp' && l.url).map((link) => (
              <Button 
                key={link.link_type}
                onClick={() => handleOpenLink(link)}
                className="bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat on WhatsApp
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentContactLinks;
