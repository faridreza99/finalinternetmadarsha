import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Settings,
  CreditCard,
  Smartphone,
  Shield,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';

const SystemSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});

  const [bkashConfig, setBkashConfig] = useState({
    bkash_merchant_number: '',
    bkash_merchant_name: ''
  });

  const [sslCommerzConfig, setSslCommerzConfig] = useState({
    store_id: '',
    store_password: '',
    is_sandbox: true,
    is_configured: false
  });

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const API = process.env.REACT_APP_API_URL || '/api';
      const [bkashRes, sslRes] = await Promise.all([
        axios.get(`${API}/payments/config`),
        axios.get(`${API}/payments/sslcommerz/config`).catch(() => ({ data: { store_id: '', is_sandbox: true, is_configured: false } }))
      ]);
      
      setBkashConfig({
        bkash_merchant_number: bkashRes.data.bkash_merchant_number || '',
        bkash_merchant_name: bkashRes.data.bkash_merchant_name || ''
      });
      
      setSslCommerzConfig({
        store_id: sslRes.data.store_id || '',
        store_password: '',
        is_sandbox: sslRes.data.is_sandbox !== false,
        is_configured: sslRes.data.is_configured || false
      });
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchConfigs();
    }
  }, [user, fetchConfigs]);

  const saveBkashConfig = async () => {
    try {
      setSaving(true);
      const API = process.env.REACT_APP_API_URL || '/api';
      await axios.put(`${API}/payments/config`, bkashConfig);
      toast.success('bKash settings saved successfully');
    } catch (error) {
      console.error('Error saving bKash config:', error);
      toast.error('Failed to save bKash settings');
    } finally {
      setSaving(false);
    }
  };

  const saveSslCommerzConfig = async () => {
    try {
      setSaving(true);
      const dataToSave = { ...sslCommerzConfig };
      if (!dataToSave.store_password) {
        delete dataToSave.store_password;
      }
      const API = process.env.REACT_APP_API_URL || '/api';
      await axios.put(`${API}/payments/sslcommerz/config`, dataToSave);
      toast.success('SSLCommerz settings saved successfully');
      fetchConfigs();
    } catch (error) {
      console.error('Error saving SSLCommerz config:', error);
      toast.error('Failed to save SSLCommerz settings');
    } finally {
      setSaving(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="p-6">
        <Card className="dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Access Restricted</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Only super administrators can access system settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-teal-600" />
            System Settings
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configure payment gateways and system integrations
          </p>
        </div>
        <Button variant="outline" onClick={fetchConfigs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="payment" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payment Gateways
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* bKash Configuration */}
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Smartphone className="w-5 h-5 text-pink-600" />
                  bKash Configuration
                  <Badge variant="outline" className="ml-auto bg-pink-50 text-pink-600 dark:bg-pink-900/30">
                    Manual Verification
                  </Badge>
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Configure bKash merchant details for manual payment collection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="dark:text-gray-300">Merchant Number</Label>
                  <Input
                    placeholder="01XXXXXXXXX"
                    value={bkashConfig.bkash_merchant_number}
                    onChange={(e) => setBkashConfig({ ...bkashConfig, bkash_merchant_number: e.target.value })}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This number will be shown to schools for sending payment
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="dark:text-gray-300">Merchant Name</Label>
                  <Input
                    placeholder="Cloud School ERP"
                    value={bkashConfig.bkash_merchant_name}
                    onChange={(e) => setBkashConfig({ ...bkashConfig, bkash_merchant_name: e.target.value })}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <Button 
                  onClick={saveBkashConfig} 
                  disabled={saving}
                  className="w-full bg-pink-600 hover:bg-pink-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save bKash Settings'}
                </Button>
              </CardContent>
            </Card>

            {/* SSLCommerz Configuration */}
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  SSLCommerz Configuration
                  {sslCommerzConfig.is_configured ? (
                    <Badge className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-auto text-amber-600">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Not Configured
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Configure SSLCommerz for automatic online payment processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="dark:text-gray-300">Store ID</Label>
                  <Input
                    placeholder="your_store_id"
                    value={sslCommerzConfig.store_id}
                    onChange={(e) => setSslCommerzConfig({ ...sslCommerzConfig, store_id: e.target.value })}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="dark:text-gray-300">Store Password</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords.sslPassword ? 'text' : 'password'}
                      placeholder="Enter new password to update"
                      value={sslCommerzConfig.store_password}
                      onChange={(e) => setSslCommerzConfig({ ...sslCommerzConfig, store_password: e.target.value })}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => togglePasswordVisibility('sslPassword')}
                    >
                      {showPasswords.sslPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Leave blank to keep existing password
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <Label className="dark:text-gray-300">Sandbox Mode</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Enable for testing with sandbox credentials
                    </p>
                  </div>
                  <Switch
                    checked={sslCommerzConfig.is_sandbox}
                    onCheckedChange={(checked) => setSslCommerzConfig({ ...sslCommerzConfig, is_sandbox: checked })}
                  />
                </div>

                <Button 
                  onClick={saveSslCommerzConfig} 
                  disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save SSLCommerz Settings'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Payment Gateway Info */}
          <Card className="dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                  <h4 className="font-medium text-pink-700 dark:text-pink-400 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    bKash Manual Flow
                  </h4>
                  <ol className="mt-2 text-sm text-pink-600 dark:text-pink-300 space-y-1 list-decimal list-inside">
                    <li>School sees your merchant number</li>
                    <li>School sends money via bKash app</li>
                    <li>School enters transaction ID</li>
                    <li>You verify payment manually</li>
                    <li>Subscription activates automatically</li>
                  </ol>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    SSLCommerz Automatic Flow
                  </h4>
                  <ol className="mt-2 text-sm text-green-600 dark:text-green-300 space-y-1 list-decimal list-inside">
                    <li>School clicks "Pay Now"</li>
                    <li>Redirected to SSLCommerz gateway</li>
                    <li>Payment via card/mobile banking</li>
                    <li>Auto-verified by SSLCommerz IPN</li>
                    <li>You approve subscription</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-white">System Integrations</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Configure external service integrations and API keys
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Additional integrations coming soon.</p>
                <p className="text-sm mt-2">
                  Sensitive API keys like OpenAI, Twilio etc. should be configured through the Replit Secrets panel for security.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemSettings;
