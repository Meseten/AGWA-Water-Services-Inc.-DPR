import React, { useState, useEffect } from 'react';
import { 
    Banknote, UserCircle, Hash, FileText, CalendarDays, CheckCircle, Printer, Search, Loader2, AlertTriangle 
} from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import * as DataService from '../../services/dataService.js';
import { formatDate, calculateDynamicPenalty } from '../../utils/userUtils.js';
import Barcode from '../../components/ui/Barcode.jsx';
import { serverTimestamp } from 'firebase/firestore';

const commonInputClass = "w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none transition duration-150 text-sm placeholder-gray-400";

const WalkInPaymentSection = ({ db, userData: clerkData, showNotification, billingService }) => {
    const [accountNumberSearch, setAccountNumberSearch] = useState('');
    const [searchedCustomer, setSearchedCustomer] = useState(null);
    const [customerBills, setCustomerBills] = useState([]);
    const [selectedBill, setSelectedBill] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [systemSettings, setSystemSettings] = useState({});
    
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
    const [isLoadingBills, setIsLoadingBills] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentSuccessData, setPaymentSuccessData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        DataService.getSystemSettings(db).then(result => {
            if (result.success) setSystemSettings(result.data || {});
        });
    }, [db]);

    const handleSearchCustomer = async (e) => {
        if (e) e.preventDefault();
        if (!accountNumberSearch.trim()) {
            showNotification("Please enter an Account Number to search.", "warning");
            return;
        }
        setIsLoadingCustomer(true);
        setError('');
        setSearchedCustomer(null);
        setCustomerBills([]);
        setSelectedBill(null);
        setPaymentAmount('');
        setPaymentSuccessData(null);
        try {
            const usersResult = await DataService.searchUserProfiles(db, accountNumberSearch.trim());
            if (usersResult.success && usersResult.data.length > 0) {
                const foundUser = usersResult.data.find(u => u.accountNumber.toLowerCase() === accountNumberSearch.trim().toLowerCase());
                if (foundUser) {
                    setSearchedCustomer(foundUser);
                    fetchCustomerBills(foundUser);
                } else {
                     setError(`No customer found with Account Number: "${accountNumberSearch}".`);
                }
            } else {
                setError(`No customer found with Account Number: "${accountNumberSearch}".`);
            }
        } catch (err) {
            setError("An error occurred during customer search.");
        }
        setIsLoadingCustomer(false);
    };

    const fetchCustomerBills = async (customer) => {
        setIsLoadingBills(true);
        const billsResult = await DataService.getBillsForUser(db, customer.id);
        if (billsResult.success) {
            const unpaidBills = billsResult.data
                .filter(bill => bill.status === 'Unpaid')
                .map(bill => {
                    const charges = bill.calculatedCharges || billingService(bill.consumption, customer.serviceType, customer.meterSize, systemSettings);
                    const baseAmount = (charges.totalCalculatedCharges || 0) + (bill.previousUnpaidAmount || 0) - (bill.seniorCitizenDiscount || 0);
                    const dynamicPenalty = calculateDynamicPenalty(bill, systemSettings);
                    const totalAmountDue = baseAmount + dynamicPenalty;
                    return { ...bill, amount: totalAmountDue, displayPenalty: dynamicPenalty };
                })
                .sort((a, b) => new Date(a.dueDate?.toDate() || 0) - new Date(b.dueDate?.toDate() || 0));
            
            setCustomerBills(unpaidBills);
            if (unpaidBills.length === 0) {
                showNotification(`No unpaid bills found for Account #${customer.accountNumber}.`, "info");
            }
        } else {
            showNotification(billsResult.error || "Failed to fetch customer bills.", "error");
        }
        setIsLoadingBills(false);
    };
    
    useEffect(() => {
        if (selectedBill) {
            setPaymentAmount(selectedBill.amount?.toFixed(2) || '');
        } else {
            if (customerBills.length === 0) {
                setPaymentAmount('');
            } else if (customerBills.length > 0 && !customerBills.find(b => b.id === selectedBill?.id)){
                const totalUnpaid = customerBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
                setPaymentAmount(totalUnpaid > 0 ? totalUnpaid.toFixed(2) : '');
            }
        }
    }, [selectedBill, customerBills]);

    const handleProcessPayment = async (e) => {
        e.preventDefault();
        if (!selectedBill && customerBills.length === 0) {
            showNotification("No bill selected or available for payment.", "warning");
            return;
        }
        const amountToPay = parseFloat(paymentAmount);
        if (isNaN(amountToPay) || amountToPay <= 0) {
            showNotification("Please enter a valid payment amount.", "warning");
            return;
        }
        if ((paymentMethod !== 'Cash') && !referenceNumber.trim()) {
            showNotification("Reference number is required for this payment method.", "warning");
            return;
        }
        setIsProcessingPayment(true);
        setPaymentSuccessData(null);
        
        const billToPay = selectedBill || customerBills.find(b => b.status === 'Unpaid');
        if (!billToPay) {
             showNotification("Cannot determine which bill to pay. Please select a bill.", "warning");
             setIsProcessingPayment(false);
             return;
        }

        if (amountToPay < billToPay.amount) {
            showNotification(`Partial payments are not supported. Amount must be ₱${billToPay.amount.toFixed(2)}.`, "warning");
            setIsProcessingPayment(false);
            return;
        }

        try {
            const paymentTimestamp = serverTimestamp();
            const paymentDate = new Date();
            const billUpdateResult = await DataService.updateBill(db, billToPay.id, {
                status: 'Paid',
                paymentDate,
                paymentTimestamp,
                amountPaid: amountToPay,
                paymentMethod: paymentMethod,
                paymentReference: referenceNumber.trim() || `CASH-${Date.now().toString().slice(-8)}`,
                processedByClerkId: clerkData.uid,
                processedByClerkName: clerkData.displayName,
            });
            if (!billUpdateResult.success) {
                throw new Error(billUpdateResult.error || "Failed to update bill status.");
            }
            const receiptData = {
                customerName: searchedCustomer.displayName,
                accountNumber: searchedCustomer.accountNumber,
                serviceAddress: searchedCustomer.serviceAddress,
                billId: billToPay.id,
                billMonthYear: billToPay.monthYear || billToPay.billingPeriod,
                amountPaid: amountToPay,
                paymentDate: paymentDate,
                paymentMethod: paymentMethod,
                referenceNumber: referenceNumber.trim() || `CASH-${Date.now().toString().slice(-8)}`,
                processedBy: clerkData.displayName,
                receiptId: `OR-${Date.now()}`
            };
            setPaymentSuccessData(receiptData);
            showNotification(`Payment of ₱${amountToPay.toFixed(2)} processed successfully!`, "success");
            setPaymentAmount('');
            setReferenceNumber('');
            setSelectedBill(null);
            fetchCustomerBills(searchedCustomer);
        } catch (err) {
            showNotification(err.message || "An error occurred while processing the payment.", "error");
        }
        setIsProcessingPayment(false);
    };

    const handlePrintReceipt = () => {
        const printableContent = document.getElementById('payment-receipt-content');
        if (printableContent) {
            const printWindow = window.open('', '_blank', 'height=800,width=1000');
            printWindow.document.write('<html><head><title>AGWA Payment Receipt</title>');
            printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow.document.write(`
                <style>
                    body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .paid-stamp {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-30deg);
                        font-size: 4rem;
                        font-weight: bold;
                        color: rgba(0, 128, 0, 0.15);
                        z-index: -1;
                        letter-spacing: 0.1em;
                        border: 8px solid rgba(0, 128, 0, 0.15);
                        padding: 0.5em 1em;
                        border-radius: 10px;
                        text-transform: uppercase;
                    }
                    .no-print { display: none; }
                </style>
            `);
            printWindow.document.write('</head><body class="bg-gray-100 p-4">');
            printWindow.document.write(printableContent.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 700);
        }
    };

    const paymentMethods = ['Cash', 'Check', 'Card (Debit/Credit)', 'E-wallet (GCash/Maya)'];
    const InfoRow = ({ label, value }) => (
        <div className="flex justify-between py-1.5 text-sm border-b border-gray-200 last:border-b-0">
            <span className="text-gray-500">{label}:</span>
            <span className="font-medium text-gray-800 text-right">{value}</span>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn">
            {!paymentSuccessData && (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                            <Banknote size={30} className="mr-3 text-green-600" /> Process Walk-in Payment
                        </h2>
                    </div>
                    <form onSubmit={handleSearchCustomer} className="mb-6 p-4 bg-gray-50 rounded-lg shadow">
                        <label htmlFor="accountNumberSearch" className="block text-sm font-medium text-gray-700 mb-1">Search Customer by Account Number</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-grow">
                                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input type="text" id="accountNumberSearch" value={accountNumberSearch} onChange={(e) => setAccountNumberSearch(e.target.value)} className={`${commonInputClass} pl-9`} placeholder="Enter Account Number"/>
                            </div>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-lg flex items-center justify-center sm:w-auto w-full" disabled={isLoadingCustomer}>
                                {isLoadingCustomer ? <Loader2 size={18} className="animate-spin mr-2" /> : <Search size={18} className="mr-2" />} Find Customer
                            </button>
                        </div>
                        {error && !isLoadingCustomer && <p className="text-red-500 text-xs mt-2">{error}</p>}
                    </form>
                </>
            )}
            {isLoadingCustomer && <LoadingSpinner message="Searching for customer..." />}
            {searchedCustomer && !paymentSuccessData && (
                <>
                    <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-blue-700 mb-2 flex items-center">
                            <UserCircle size={20} className="mr-2" /> {searchedCustomer.displayName}
                            <span className="ml-2 text-sm text-gray-600">({searchedCustomer.accountNumber})</span>
                        </h3>
                        {isLoadingBills && <LoadingSpinner message="Loading bills..." />}
                        {!isLoadingBills && customerBills.length === 0 && <p className="text-sm text-green-600 mt-2">No unpaid bills found for this customer.</p>}
                        {!isLoadingBills && customerBills.length > 0 && (
                            <div className="mt-3">
                                <label htmlFor="selectBill" className="block text-sm font-medium text-gray-700 mb-1">Select Bill to Pay (or pay total outstanding):</label>
                                <select id="selectBill" className={commonInputClass} value={selectedBill ? selectedBill.id : ""} onChange={(e) => { const bill = customerBills.find(b => b.id === e.target.value); setSelectedBill(bill || null); }}>
                                    <option value="">Pay Total Unpaid / Select Specific Bill</option>
                                    {customerBills.map(bill => (
                                        <option key={bill.id} value={bill.id}>
                                            {bill.monthYear || bill.billingPeriod} - ₱{bill.amount?.toFixed(2)} (Due: {formatDate(bill.dueDate?.toDate(), {month: 'short', day: 'numeric'})})
                                            {bill.displayPenalty > 0 && ` (Penalty: ₱${bill.displayPenalty.toFixed(2)})`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    {(customerBills.length > 0) && (
                        <form onSubmit={handleProcessPayment} className="space-y-5 p-4 border border-gray-200 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-700 mb-1">Payment Details</h3>
                            <div>
                                <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-1">Amount to Pay (PHP) *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₱</span>
                                    <input type="number" id="paymentAmount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className={`${commonInputClass} pl-7`} step="0.01" required />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                                <select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={commonInputClass} required>
                                   {paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}
                                </select>
                            </div>
                            {(paymentMethod !== 'Cash') && (
                                <div>
                                    <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700 mb-1">Reference / Transaction No. *</label>
                                    <input type="text" id="referenceNumber" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className={commonInputClass} placeholder="e.g., Check No., Card Approval Code" required />
                                </div>
                            )}
                             <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-lg flex items-center justify-center transition-colors active:scale-95" disabled={isProcessingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}>
                                {isProcessingPayment ? <Loader2 size={20} className="animate-spin mr-2" /> : <CheckCircle size={20} className="mr-2" />}
                                {isProcessingPayment ? 'Processing...' : 'Process Payment'}
                            </button>
                        </form>
                    )}
                </>
            )}

            {paymentSuccessData && (
                <div className="mt-6 p-6 bg-green-50 rounded-lg">
                    <div className="text-center mb-5">
                        <CheckCircle size={48} className="mx-auto text-green-500 mb-2" />
                        <h3 className="text-2xl font-semibold text-green-800">Payment Successful!</h3>
                        <p className="text-sm text-gray-600">Official Receipt has been generated.</p>
                    </div>

                    <div id="payment-receipt-content" className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto font-sans relative overflow-hidden">
                        <div className="paid-stamp">PAID</div>
                        <div className="flex justify-between items-start mb-5 pb-4 border-b-2 border-blue-700">
                            <div>
                                <div className="text-3xl font-bold text-blue-700">AGWA</div>
                                <div className="text-xs text-blue-600 italic">Ensuring Clarity, Sustaining Life.</div>
                            </div>
                            <div className="text-right text-xs">
                                <p className="font-semibold">AGWA Water Services, Inc.</p>
                                <p>123 Aqua Drive, Hydro Business Park</p>
                                <p>Naic, Cavite, Philippines 4110</p>
                            </div>
                        </div>
                        <div className="text-center mb-6">
                            <h4 className="text-xl font-bold text-gray-800">OFFICIAL RECEIPT</h4>
                            <p className="text-sm text-gray-500">Receipt No: {paymentSuccessData.receiptId}</p>
                        </div>
                        <div className="mb-4">
                            <InfoRow label="Received From" value={paymentSuccessData.customerName} />
                            <InfoRow label="Account Number" value={paymentSuccessData.accountNumber} />
                        </div>
                        <div className="mb-4">
                            <InfoRow label="Payment For" value={`Water Bill - ${paymentSuccessData.billMonthYear}`} />
                            <InfoRow label="Payment Date" value={formatDate(paymentSuccessData.paymentDate, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })} />
                            <InfoRow label="Payment Method" value={paymentSuccessData.paymentMethod} />
                            {paymentSuccessData.referenceNumber && !paymentSuccessData.referenceNumber.startsWith('CASH-') &&
                                <InfoRow label="Reference No." value={paymentSuccessData.referenceNumber} />
                            }
                        </div>
                        <div className="mt-4 p-3 bg-gray-100 rounded-lg flex justify-between items-center">
                            <span className="text-lg font-semibold text-gray-800">AMOUNT PAID</span>
                            <span className="text-2xl font-bold text-green-600">₱{paymentSuccessData.amountPaid.toFixed(2)}</span>
                        </div>
                         <div className="mt-4 pt-4 border-t border-dashed">
                           <Barcode value={paymentSuccessData.receiptId}/>
                        </div>
                        <div className="text-xs text-gray-500 mt-4">
                            <p>Cashier: {paymentSuccessData.processedBy}</p>
                            <p>This is a system-generated receipt. Thank you for your payment.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6 no-print">
                        <button onClick={handlePrintReceipt} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center">
                           <Printer size={18} className="mr-2"/> Print Receipt
                        </button>
                        <button onClick={() => { setPaymentSuccessData(null); setAccountNumberSearch(''); setSearchedCustomer(null); setCustomerBills([]); setSelectedBill(null); }} className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center">
                           Process Another Payment
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalkInPaymentSection;