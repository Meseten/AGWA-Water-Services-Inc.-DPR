import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Sparkles, Loader2, Info, Eye } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import CheckoutModal from './CheckoutModal.jsx';
import InvoiceView from '../../components/ui/InvoiceView.jsx';
import * as DataService from '../../services/dataService.js';
import { explainBillWithAI } from '../../services/deepseekService.js';
import { formatDate, calculateDynamicPenalty, calculatePotentialPenalty } from '../../utils/userUtils.js';
import DOMPurify from 'dompurify';
import { Timestamp } from 'firebase/firestore';
import { getStripe } from '../../services/stripeService.js';

const CustomerBillsSection = ({ user, userData, db, showNotification, billingService, systemSettings = {} }) => {
    const [bills, setBills] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [billToPay, setBillToPay] = useState(null);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

    const [billToExplain, setBillToExplain] = useState(null);
    const [explanation, setExplanation] = useState('');
    const [isExplaining, setIsExplaining] = useState(false);

    const [billToView, setBillToView] = useState(null);
    const [isInvoiceViewOpen, setIsInvoiceViewOpen] = useState(false);

    const { isOnlinePaymentsEnabled = true } = systemSettings;
    const stripePromise = getStripe();

    const settingsJson = JSON.stringify(systemSettings);
    const userDataJson = JSON.stringify(userData);

     const fetchBills = useCallback(async () => {
            setIsLoading(true);
            setError('');
            const currentUserData = JSON.parse(userDataJson);
            const currentSettings = JSON.parse(settingsJson);

            if (!user?.uid || !currentUserData?.serviceType) {
                setError("Missing user data for fetching bills.");
                setIsLoading(false);
                return;
            }

            const result = await DataService.getBillsForUser(db, user.uid);
            if (result.success) {
                
                const sortedBills = result.data.sort((a, b) => {
                    const dateA = a.billDate?.toDate ? a.billDate.toDate() : new Date(0);
                    const dateB = b.billDate?.toDate ? b.billDate.toDate() : new Date(0);
                    return dateB - dateA;
                });

                 const billsWithDetails = sortedBills.map(bill => {
                     const calculatedCharges = billingService(bill.consumption ?? 0, currentUserData.serviceType, currentUserData.meterSize, currentSettings);
                     
                     const baseAmount = (bill.totalCalculatedCharges || 0) + (bill.previousUnpaidAmount || 0) - (bill.seniorCitizenDiscount || 0);

                     const potentialPenalty = calculatePotentialPenalty(bill, currentSettings);

                     const dynamicPenalty = calculateDynamicPenalty(bill, currentSettings);
                     
                     const totalAmountDue = baseAmount + dynamicPenalty;

                     return { 
                         ...bill, 
                         calculatedCharges: calculatedCharges,
                         baseAmount: baseAmount,
                         potentialPenalty: potentialPenalty,
                         amount: totalAmountDue,
                         displayPenalty: dynamicPenalty
                     };
                 }).filter(bill => bill.amount !== undefined);


                setBills(billsWithDetails);
            } else {
                setError(result.error || "Failed to fetch your bills.");
                showNotification(result.error || "Failed to fetch bills.", "error");
            }
            setIsLoading(false);
        }, [db, user?.uid, showNotification, billingService, userDataJson, settingsJson]);


    useEffect(() => {
        fetchBills();
    }, [fetchBills]);
    
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        
        if (query.get('payment') === 'success') {
            showNotification('Payment successful! Your bill is being updated.', 'success');
            fetchBills();
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
        if (query.get('payment') === 'cancel') {
            showNotification('Payment was cancelled. Your bill remains unpaid.', 'warning');
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [fetchBills, showNotification]);

    const handlePayBillClick = (bill) => {
        setBillToPay(bill);
        setIsCheckoutModalOpen(true);
    };

     const handleExplainBill = async (bill) => {
        if (!bill || !bill.calculatedCharges) {
             showNotification("Bill details unavailable for explanation.", "warning");
             return;
        }
        setBillToExplain(bill);
        setExplanation('');
        setIsExplaining(true);
        try {
            const billForAI = {
                ...bill,
                amount: bill.baseAmount
            }
            
            const aiExplanation = await explainBillWithAI({
                billDetails: billForAI,
                charges: bill.calculatedCharges,
                customerName: userData.displayName || 'Valued Customer',
                serviceType: userData.serviceType || 'Residential'
            });

            const penaltyHtml = (bill.potentialPenalty > 0 && bill.status === 'Unpaid')
                ? `<p><strong>Note on Late Payment:</strong> A penalty of <strong>₱${bill.potentialPenalty.toFixed(2)}</strong> will be applied if not paid by the due date.</p>`
                : '';

            setExplanation(aiExplanation + penaltyHtml);
        } catch (error) {
            const errorMessage = error?.message || "AI explanation failed.";
            setExplanation("<p>Sorry, an error occurred while generating the explanation. Please view the detailed invoice instead.</p>");
            showNotification(errorMessage, "error");
        } finally {
            setIsExplaining(false);
        }
    };


    const handleViewInvoice = (bill) => {
        setBillToView(bill);
        setIsInvoiceViewOpen(true);
    };
    
    const getInvoiceNumber = (bill) => {
        if (bill.invoiceNumber) return bill.invoiceNumber;
        const billDateObj = bill.billDate?.toDate ? bill.billDate.toDate() : null;
        const formattedDateForInvoiceNum = billDateObj ? `${billDateObj.getFullYear()}${String(billDateObj.getMonth() + 1).padStart(2, '0')}${String(billDateObj.getDate()).padStart(2, '0')}` : Date.now().toString().slice(-6);
        return `AGWA-${bill.id?.slice(0,4).toUpperCase()}-${formattedDateForInvoiceNum}`;
    };

    if (isLoading) {
        return <LoadingSpinner message="Loading your bills..." />;
    }

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn">
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center mb-6 pb-4 border-b border-gray-200">
                <FileText size={30} className="mr-3 text-blue-600" /> My Bills & Payment History
            </h2>
            {error && <div className="text-red-500 bg-red-50 p-3 rounded-md text-center">{error}</div>}

            {bills.length === 0 && !error && (
                <div className="text-center py-10 bg-gray-50 p-6 rounded-lg shadow-inner">
                    <Info size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 text-lg">No billing history found.</p>
                </div>
            )}

            <div className="space-y-4">
                {bills.map(bill => {
                    const invoiceNumber = getInvoiceNumber(bill);
                    const isPaid = bill.status === 'Paid';
                    const amountAfterDueDate = (bill.baseAmount + bill.potentialPenalty).toFixed(2);

                    return (
                        <div key={bill.id} className={`p-4 rounded-lg shadow-md border-l-4 ${isPaid ? 'bg-green-50 border-green-400' : 'bg-yellow-50 border-yellow-400'}`}>
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">{bill.monthYear || bill.billingPeriod || 'N/A'}</h3>
                                    <p className={`text-sm font-semibold ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                        Due: {formatDate(bill.dueDate, {month: 'long', day: 'numeric'})}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1" title={invoiceNumber}>Invoice No: {invoiceNumber}</p>
                                </div>
                                <div className="text-right">
                                    {isPaid ? (
                                        <>
                                            <p className="text-2xl font-bold text-gray-700">₱{bill.amountPaid?.toFixed(2) ?? bill.amount?.toFixed(2)}</p>
                                            <p className="text-sm font-semibold text-green-600">Paid on {formatDate(bill.paymentDate, {month: 'short', day: 'numeric'})}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-2xl font-bold text-gray-700">₱{bill.baseAmount?.toFixed(2)}</p>
                                            <p className="text-sm font-semibold text-red-600">
                                                (After Due Date: ₱{amountAfterDueDate})
                                            </p>
                                            {bill.displayPenalty > 0 && (
                                                <span className="text-xs text-red-500 font-semibold block">(Currently includes ₱{bill.displayPenalty.toFixed(2)} penalty)</span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-200/80 flex flex-wrap gap-2 justify-end">
                                <button onClick={() => handleViewInvoice(bill)} className="text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-md transition flex items-center"><Eye size={14} className="mr-1"/>View Invoice</button>
                                <button onClick={() => handleExplainBill(bill)} className="text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5 rounded-md transition flex items-center" disabled={isExplaining && billToExplain?.id === bill.id}>
                                    {isExplaining && billToExplain?.id === bill.id ? <Loader2 size={14} className="animate-spin mr-1"/> : <Sparkles size={14} className="mr-1"/>} Explain Bill (AI)
                                </button>
                                {!isPaid && isOnlinePaymentsEnabled && (
                                    <button onClick={() => handlePayBillClick(bill)} className="text-xs font-bold bg-green-500 text-white hover:bg-green-600 px-4 py-1.5 rounded-md transition flex items-center">
                                        <span className="mr-1 font-bold">₱</span> Pay Now (₱{bill.amount.toFixed(2)})
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={!!billToExplain} onClose={() => setBillToExplain(null)} title={`✨ AI Explanation for ${billToExplain?.monthYear || 'Bill'}`} size="lg">
                {isExplaining
                    ? <LoadingSpinner message="Agie is analyzing your bill..."/>
                    : <div className="prose prose-sm max-w-none leading-relaxed p-2" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(explanation || '') }} />
                }
            </Modal>

            {isCheckoutModalOpen && billToPay && (
                <CheckoutModal 
                    isOpen={isCheckoutModalOpen} 
                    onClose={() => setIsCheckoutModalOpen(false)} 
                    billToPay={billToPay} 
                    userData={userData} 
                    showNotification={showNotification}
                    stripePromise={stripePromise}
                />
            )}

            {isInvoiceViewOpen && billToView && (
                <InvoiceView 
                    isOpen={isInvoiceViewOpen} 
                    onClose={() => setIsInvoiceViewOpen(false)} 
                    bill={billToView} 
                    userData={userData} 
                    calculateBillDetails={billingService} 
                    showNotification={showNotification}
                    systemSettings={systemSettings}
                />
            )}
        </div>
    );
};


export default CustomerBillsSection;