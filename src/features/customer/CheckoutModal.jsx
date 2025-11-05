import React, { useState } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import { CreditCard, Loader2, X, Landmark, AlertTriangle } from 'lucide-react';
import { createCheckoutSession } from '../../services/stripeService.js';

const CheckoutModal = ({ isOpen, onClose, billToPay, userData, showNotification, stripePromise }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePayment = async () => {
        setIsLoading(true);
        setError('');

        if (!stripePromise || !billToPay || !userData) {
            setError('Payment system is not initialized.');
            setIsLoading(false);
            return;
        }

        try {
            const sessionUrl = await createCheckoutSession(
                billToPay.id,
                billToPay.amount,
                userData.email,
                userData.uid,
                userData.accountNumber
            );
            
            if (sessionUrl && (sessionUrl.startsWith('https://checkout.stripe.com/') || sessionUrl.startsWith('https://test.stripe.com/'))) {
                window.location.href = sessionUrl;
            } else {
                console.error("Invalid or untrusted session URL received:", sessionUrl);
                throw new Error("Received an invalid payment URL. Please try again.");
            }

        } catch (err) {
            const userFriendlyError = "Failed to create payment session. This could be a temporary network issue or a problem with the payment service. Please try again in a moment. (Error: " + (err.message || 'Unknown') + ")";
            setError(userFriendlyError);
            showNotification("Failed to create payment session. Please try again.", 'error');
            setIsLoading(false); 
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Secure Payment with Stripe" size="md">
            <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <p className="text-sm text-blue-700">You are paying for bill:</p>
                    <p className="font-bold text-lg text-blue-800">{billToPay.monthYear}</p>
                    <div className="mt-2 text-3xl font-bold text-gray-800">
                        ₱{billToPay.amount?.toFixed(2) || '0.00'}
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm flex items-center gap-2">
                        <AlertTriangle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="pt-6 border-t border-gray-200">
                    <button 
                        onClick={handlePayment} 
                        className="w-full flex items-center justify-center py-3 px-4 bg-blue-600 text-white font-bold rounded-lg text-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                        disabled={isLoading}
                    >
                        {isLoading 
                            ? <><Loader2 className="animate-spin mr-2"/> Processing...</>
                            : <> <CreditCard className="mr-2" size={20}/> Proceed to Secure Checkout</>
                        }
                    </button>
                    <p className="text-xs text-center text-gray-500 mt-2">
                        You will be redirected to Stripe to complete your payment.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default CheckoutModal;