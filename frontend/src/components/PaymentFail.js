import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentFail = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const status = searchParams.get('status') || 'FAILED'; // FAILED or CANCELLED

    const isCancelled = status === 'CANCELLED';

    return (
        <div className="flex items-center justify-center min-h-[80vh] p-4">
            <Card className={`w-full max-w-md text-center border-2 ${isCancelled ? 'border-orange-500' : 'border-red-500'}`}>
                <CardHeader>
                    <div className={`mx-auto p-4 rounded-full mb-4 ${isCancelled ? 'bg-orange-100' : 'bg-red-100'}`}>
                        {isCancelled ? (
                            <AlertTriangle className={`h-12 w-12 ${isCancelled ? 'text-orange-600' : 'text-red-600'}`} />
                        ) : (
                            <XCircle className="h-12 w-12 text-red-600" />
                        )}
                    </div>
                    <CardTitle className={`text-2xl ${isCancelled ? 'text-orange-700' : 'text-red-700'}`}>
                        {isCancelled ? 'Payment Cancelled' : 'Payment Failed'}
                    </CardTitle>
                    <CardDescription>
                        {isCancelled
                            ? "You have cancelled the payment process."
                            : "We couldn't process your payment. Please try again."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">
                        {isCancelled
                            ? "If this was a mistake, you can try paying again."
                            : "No money has been deducted. If you faced any issues, please contact support."}
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button
                        className={`w-full ${isCancelled ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
                        onClick={() => navigate('/student/payment')}
                    >
                        <RefreshCw className="ml-2 h-4 w-4" />
                        Try Again
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

export default PaymentFail;
