import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Download } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tran_id = searchParams.get('tran_id');

    return (
        <div className="flex items-center justify-center min-h-[80vh] p-4">
            <Card className="w-full max-w-md text-center border-emerald-500 border-2">
                <CardHeader>
                    <div className="mx-auto bg-emerald-100 p-4 rounded-full mb-4">
                        <CheckCircle className="h-12 w-12 text-emerald-600" />
                    </div>
                    <CardTitle className="text-2xl text-emerald-700">Payment Successful!</CardTitle>
                    <CardDescription>
                        Thank you! Your payment has been received successfully.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg text-left text-sm">
                        <p className="flex justify-between py-1">
                            <span className="text-gray-500">Transaction ID:</span>
                            <span className="font-mono font-medium">{tran_id || 'N/A'}</span>
                        </p>
                        <p className="flex justify-between py-1">
                            <span className="text-gray-500">Status:</span>
                            <span className="font-medium text-emerald-600">VALID</span>
                        </p>
                    </div>
                    <p className="text-gray-600 text-sm">
                        Your payment history has been updated. You can view the receipt in your dashboard.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => navigate('/student/fees')}
                    >
                        View Payment History
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate('/student/dashboard')}
                    >
                        Back to Dashboard
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default PaymentSuccess;
