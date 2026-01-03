import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import {
  CreditCard,
  Smartphone,
  Copy,
  Check,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const SubscriptionPopup = ({ isOpen, onClose, onPaymentSuccess, isBlocking = false, subscriptionStatus = null }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('plans');
  const [paymentMethod, setPaymentMethod] = useState('bkash');
  const [paymentForm, setPaymentForm] = useState({
    bkash_number: '',
    transaction_id: '',
    sslcommerz_tran_id: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // If subscription is pending verification, show pending step immediately
  useEffect(() => {
    if (isOpen && subscriptionStatus === 'pending') {
      setStep('pending');
    }
  }, [isOpen, subscriptionStatus]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [plansRes, configRes] = await Promise.all([
        axios.get('/api/subscription-plans'),
        axios.get('/api/payments/config')
      ]);
      setPlans(plansRes.data || []);
      setPaymentConfig(configRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      // Don't reset to 'plans' if subscription is pending - keep showing pending view
      if (subscriptionStatus !== 'pending') {
        setStep('plans');
        setSelectedPlan(null);
        setPaymentForm({ bkash_number: '', transaction_id: '' });
      }
    }
  }, [isOpen, fetchData, subscriptionStatus]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard!');
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setStep('payment');
  };

  const handleSubmitPayment = async () => {
    if (paymentMethod === 'bkash') {
      if (!paymentForm.bkash_number || !paymentForm.transaction_id) {
        toast.error('Please fill in all payment details');
        return;
      }
    }

    try {
      setProcessingPayment(true);
      
      if (paymentMethod === 'sslcommerz') {
        // Initiate SSLCommerz payment
        const response = await axios.post('/api/payments/sslcommerz/init', {
          tenant_id: user.tenant_id,
          amount: selectedPlan.price,
          currency: selectedPlan.currency || 'BDT',
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name
        });
        
        if (response.data.gateway_url) {
          window.location.href = response.data.gateway_url;
        } else {
          toast.error('Failed to initialize payment gateway');
        }
      } else {
        // bKash manual payment
        await axios.post('/api/payments', {
          tenant_id: user.tenant_id,
          amount: selectedPlan.price,
          currency: selectedPlan.currency || 'BDT',
          payment_method: 'bkash',
          bkash_number: paymentForm.bkash_number,
          transaction_id: paymentForm.transaction_id,
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name
        });

        toast.success('Payment submitted! Waiting for verification.');
        setStep('pending');
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <Dialog open={isOpen} onOpenChange={isBlocking ? () => {} : onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto dark:bg-gray-800" onInteractOutside={isBlocking ? (e) => e.preventDefault() : undefined}>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 dark:text-white">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            {subscriptionStatus === 'pending' ? 'Payment Verification Pending' : 'Subscription Required'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        ) : step === 'pending' ? (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Payment is Pending
              </h3>
              <p className="text-gray-600 dark:text-gray-300 max-w-md">
                Your payment has been submitted and is awaiting verification by the administrator.
              </p>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">Access Restricted</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    You cannot access the system until your payment is verified. This usually takes 24-48 hours during business days.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>If you have any questions, please contact support.</p>
            </div>
          </div>
        ) : step === 'plans' ? (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              Your school doesn't have an active subscription. Please select a plan to continue using the system.
            </p>
            
            <div className="grid gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className="p-4 border rounded-lg cursor-pointer hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all dark:border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg dark:text-white">{plan.name}</h3>
                      <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                        {formatPrice(plan.price)}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/{plan.period || 'month'}</span>
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                  {plan.features && (
                    <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {plan.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : step === 'payment' ? (
          <div className="space-y-4">
            <div className="p-4 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Selected Plan</p>
                  <p className="font-semibold dark:text-white">{selectedPlan?.name}</p>
                </div>
                <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
                  {formatPrice(selectedPlan?.price)}
                </p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="flex gap-2">
              <Button
                variant={paymentMethod === 'bkash' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('bkash')}
                className={`flex-1 ${paymentMethod === 'bkash' ? 'bg-pink-600 hover:bg-pink-700' : 'dark:border-gray-600 dark:text-gray-300'}`}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                bKash
              </Button>
              <Button
                variant={paymentMethod === 'sslcommerz' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('sslcommerz')}
                className={`flex-1 ${paymentMethod === 'sslcommerz' ? 'bg-green-600 hover:bg-green-700' : 'dark:border-gray-600 dark:text-gray-300'}`}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                SSLCommerz
              </Button>
            </div>

            {paymentMethod === 'bkash' ? (
              <div className="p-4 bg-pink-50 dark:bg-pink-900/30 rounded-lg border border-pink-200 dark:border-pink-800">
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-5 h-5 text-pink-600" />
                  <span className="font-medium text-pink-600 dark:text-pink-400">bKash Payment</span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Send money to this bKash number:</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-mono font-bold text-pink-600 dark:text-pink-400">
                        {paymentConfig?.bkash_merchant_number || '01712-345678'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(paymentConfig?.bkash_merchant_number || '01712-345678')}
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Merchant: {paymentConfig?.bkash_merchant_name || 'Cloud School ERP'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-pink-200 dark:border-pink-700 space-y-3">
                    <div>
                      <Label className="dark:text-gray-300">Your bKash Number</Label>
                      <Input
                        placeholder="01XXXXXXXXX"
                        value={paymentForm.bkash_number}
                        onChange={(e) => setPaymentForm({...paymentForm, bkash_number: e.target.value})}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label className="dark:text-gray-300">Transaction ID (TrxID)</Label>
                      <Input
                        placeholder="Enter bKash Transaction ID"
                        value={paymentForm.transaction_id}
                        onChange={(e) => setPaymentForm({...paymentForm, transaction_id: e.target.value})}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-600 dark:text-green-400">SSLCommerz Payment</span>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pay securely using credit/debit card, mobile banking, or internet banking through SSLCommerz.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded">Visa</span>
                    <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded">Mastercard</span>
                    <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded">bKash</span>
                    <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded">Nagad</span>
                    <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded">Rocket</span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    You will be redirected to SSLCommerz secure payment page.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('plans')} className="flex-1 dark:border-gray-600 dark:text-gray-300">
                Back
              </Button>
              <Button
                onClick={handleSubmitPayment}
                disabled={processingPayment}
                className={`flex-1 ${paymentMethod === 'bkash' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {processingPayment ? 'Processing...' : paymentMethod === 'sslcommerz' ? 'Pay Now' : 'Submit Payment'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <Clock className="w-16 h-16 text-amber-500 mx-auto" />
            <h3 className="text-xl font-semibold dark:text-white">Payment Pending Verification</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your payment has been submitted and is awaiting verification by the administrator.
              You will be notified once your subscription is activated.
            </p>
            {isBlocking && (
              <p className="text-sm text-red-500 dark:text-red-400 font-medium">
                You cannot access the system until your payment is verified.
              </p>
            )}
            {!isBlocking && (
              <Button onClick={onClose} className="mt-4">
                Close
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPopup;
