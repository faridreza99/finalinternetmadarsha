import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const StudentPayment = () => {
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [feeSummary, setFeeSummary] = useState(null);
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [error, setError] = useState(null);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

    useEffect(() => {
        fetchPaymentSummary();
    }, []);

    const fetchPaymentSummary = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/student/payment/summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeeSummary(response.data);
        } catch (err) {
            console.error(err);
            setError("Failed to load payment summary");
            // Fallback data for demo if API fails
            //   setFeeSummary({
            //       monthly_fee: 1000,
            //       total_due: 3000,
            //       unpaid_months: ["January", "February", "March"],
            //       paid_months: []
            //   });
        } finally {
            setLoading(false);
        }
    };

    const handleMonthToggle = (month) => {
        setSelectedMonths(prev => {
            if (prev.includes(month)) {
                return prev.filter(m => m !== month);
            } else {
                return [...prev, month];
            }
        });
    };

    const calculateTotal = () => {
        if (!feeSummary) return 0;
        return selectedMonths.length * feeSummary.monthly_fee;
    };

    const handlePayNow = async () => {
        if (selectedMonths.length === 0) {
            toast.error("Please select at least one month");
            return;
        }

        try {
            setProcessing(true);
            const token = localStorage.getItem('token');

            const payload = {
                months: selectedMonths,
                year: new Date().getFullYear() // Assuming current year for simplicity
            };

            const response = await axios.post(`${API_BASE_URL}/student/payment/initiate`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data && response.data.gateway_url) {
                window.location.href = response.data.gateway_url;
            } else {
                toast.error("Failed to initiate payment");
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Payment initiation failed");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
    if (!feeSummary) return <div className="p-4 text-center">No fee information available.</div>;

    return (
        <Card className="w-full max-w-2xl mx-auto mt-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-6 w-6" />
                    অনলাইন ফি পেমেন্ট (Online Fee Payment)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                        <span className="font-semibold">মাসিক ফি (Monthly Fee):</span>
                        <span>৳ {feeSummary.monthly_fee}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                        <span className="font-semibold">মোট বকেয়া (Total Due):</span>
                        <span>৳ {feeSummary.total_due}</span>
                    </div>
                </div>

                <div>
                    <Label className="mb-4 block text-lg font-medium">যে সব মাসের বেতন দিতে চান তা সিলেক্ট করুন (Select Months)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {feeSummary.unpaid_months.map(month => (
                            <div
                                key={month}
                                className={`flex items-center space-x-2 border p-3 rounded cursor-pointer transition-colors ${selectedMonths.includes(month) ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'}`}
                                onClick={() => handleMonthToggle(month)}
                            >
                                <Checkbox
                                    id={`month-${month}`}
                                    checked={selectedMonths.includes(month)}
                                    onCheckedChange={() => handleMonthToggle(month)}
                                />
                                <label htmlFor={`month-${month}`} className="cursor-pointer flex-1 user-select-none">
                                    {month}
                                </label>
                            </div>
                        ))}
                    </div>
                    {feeSummary.unpaid_months.length === 0 && (
                        <Alert className="bg-green-50 border-green-200 mt-4">
                            <AlertDescription className="text-green-800">
                                🎉 আপনার কোন বকেয়া নেই! (No dues pending)
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                {selectedMonths.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between items-center text-xl font-bold">
                            <span>সর্বমোট (Total Amount):</span>
                            <span>৳ {calculateTotal()}</span>
                        </div>
                    </div>
                )}

            </CardContent>
            <CardFooter>
                <Button
                    className="w-full text-lg py-6 bg-emerald-600 hover:bg-emerald-700"
                    onClick={handlePayNow}
                    disabled={selectedMonths.length === 0 || processing}
                >
                    {processing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                    {processing ? "প্রসেসিং হচ্ছে..." : `পেমেন্ট করুন ৳ ${calculateTotal()}`}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default StudentPayment;
