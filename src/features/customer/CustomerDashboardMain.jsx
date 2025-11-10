import React, { useState, useEffect, useCallback } from "react";
import { ShieldCheck, UserCircle, Home, CreditCard, AlertTriangle, Sparkles, FileText, Loader2, Info } from "lucide-react";
import DashboardInfoCard from "../../components/ui/DashboardInfoCard.jsx";
import Modal from "../../components/ui/Modal.jsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import * as DataService from "../../services/dataService.js";
import { callDeepseekAPI } from "../../services/deepseekService.js";
import { formatDate, calculateDynamicPenalty } from "../../utils/userUtils.js";

const CustomerDashboardMain = ({ user, userData, db, showNotification, setActiveSection, billingService: calculateBillDetails, systemSettings }) => {
    const [recentBills, setRecentBills] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [dataError, setDataError] = useState('');

    const [currentBalance, setCurrentBalance] = useState(0);
    const [nextDueDate, setNextDueDate] = useState('');

    const [waterSavingTips, setWaterSavingTips] = useState('');
    const [isLoadingTips, setIsLoadingTips] = useState(false);
    const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);

    const fetchCustomerDashboardData = useCallback(async () => {
        if (!user || !user.uid || !userData || !calculateBillDetails) {
            setIsLoadingData(false);
            setDataError("User data or essential services are unavailable.");
            return;
        }
        setIsLoadingData(true);
        setDataError('');
        try {
            const billsResult = await DataService.getBillsForUser(db, user.uid);
            if (billsResult.success) {
                const billsWithCalculatedAmounts = billsResult.data.map(bill => {
                    const charges = calculateBillDetails(bill.consumption, userData.serviceType, userData.meterSize, systemSettings || {});
                    
                    const dynamicPenalty = calculateDynamicPenalty(bill, systemSettings);
                    const finalAmount = (bill.amount || 0) + dynamicPenalty;

                    return { 
                        ...bill, 
                        calculatedCharges: charges, 
                        amount: finalAmount,
                        displayPenalty: dynamicPenalty,
                        billDateTimestamp: bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate) 
                    };
                }).sort((a, b) => b.billDateTimestamp - a.billDateTimestamp);

                setRecentBills(billsWithCalculatedAmounts.slice(0, 3));

                const unpaidBills = billsWithCalculatedAmounts.filter(b => b.status === 'Unpaid');
                if (unpaidBills.length > 0) {
                    const sortedUnpaidBills = unpaidBills.sort((a, b) => new Date(a.dueDate?.toDate() || 0) - new Date(b.dueDate?.toDate() || 0));
                    const oldestDueBill = sortedUnpaidBills[0];
                    
                    const totalBalance = unpaidBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
                    
                    setCurrentBalance(totalBalance);
                    setNextDueDate(oldestDueBill.dueDate);
                } else {
                    setCurrentBalance(0);
                    setNextDueDate('');
                }
            } else {
                setDataError(billsResult.error || "Failed to fetch recent bills.");
                showNotification(billsResult.error || "Failed to fetch recent bills.", "error");
            }
        } catch (error) {
            console.error("Error fetching customer dashboard data:", error);
            const errMsg = "An error occurred while loading your dashboard information.";
            setDataError(errMsg);
            showNotification(errMsg, "error");
        }
        setIsLoadingData(false);
    }, [user, userData, db, showNotification, calculateBillDetails, systemSettings]);

    useEffect(() => {
        fetchCustomerDashboardData();
    }, [fetchCustomerDashboardData]);

    const handleFetchWaterSavingTips = async () => {
        setIsLoadingTips(true);
        setIsTipsModalOpen(true);
        setWaterSavingTips('');
        try {
            const serviceArea = (userData.serviceAddress && userData.serviceAddress.barangay)
                ? `for a household in ${userData.serviceAddress.barangay}`
                : 'for a household';
            
            const prompt = `
                You are Agie, a professional and helpful AI assistant for AGWA Water Services.
                Please provide 8 practical water-saving tips and 2 surprising water trivia facts for a customer in the Philippines.
                
                Instructions:
                1.  Provide a short, friendly opening paragraph (e.g., "Hello! I'm Agie...").
                2.  Create a section titled "<strong>Practical Water-Saving Tips</strong>".
                3.  List 8 tips using a <ul> with <li> elements.
                4.  Include at least one Philippines-specific tip (like using a "tabo" or "timba" / pail).
                5.  Create a second section titled "<strong>Water Trivia</strong>".
                6.  List 2 surprising facts, also in a <ul>.
                7.  Wrap all content in simple HTML tags: <p>, <ul>, <li>, <strong>.
                8.  Do NOT use any markdown (like *, **, or #).
            `;
            
            const messages = [{ role: 'user', content: prompt }];
            const tips = await callDeepseekAPI(messages);
            
            setWaterSavingTips(tips);
        } catch (error) {
            const errorMessage = error?.message || "Could not fetch water saving tips at the moment.";
            showNotification(errorMessage, "error");
            setWaterSavingTips("<p>Sorry, couldn't fetch tips right now. A simple tip: Always check for leaky faucets and toilets, as they are the most common sources of water waste!</p>");
        } finally {
            setIsLoadingTips(false);
        }
    };

    const currentBalanceDisplay = `₱${currentBalance.toFixed(2)}`;
    const balanceSubtext = currentBalance > 0 && nextDueDate ? `Next Due: ${formatDate(nextDueDate, {month: 'short', day: 'numeric', year: 'numeric'})}` : (currentBalance === 0 ? 'All bills settled!' : '');
    
    const quickActionCardClass = "p-5 bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out text-left focus:outline-none focus:ring-2 focus:ring-opacity-75 flex flex-col items-start h-full";
    const PesoIcon = () => <span className="font-bold">₱</span>;

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <DashboardInfoCard title="Account Status" value={isLoadingData && !userData.accountStatus ? <Loader2 className="animate-spin h-5 w-5"/> : userData.accountStatus || 'Active'} icon={ShieldCheck} borderColor="border-green-500" iconColor="text-green-500" />
                <DashboardInfoCard title="Current Balance" value={isLoadingData && currentBalance === 0 && nextDueDate === '' ? <Loader2 className="animate-spin h-5 w-5"/> : currentBalanceDisplay} subtext={balanceSubtext} icon={PesoIcon} borderColor={currentBalance > 0 ? "border-red-500" : "border-green-500"} iconColor={currentBalance > 0 ? "text-red-500" : "text-green-500"} />
                <DashboardInfoCard title="Account Number" value={userData.accountNumber || 'N/A'} icon={UserCircle} borderColor="border-blue-500" iconColor="text-blue-500" />
                <DashboardInfoCard title="Service Type" value={userData.serviceType || 'Residential'} icon={Home} borderColor="border-purple-500" iconColor="text-purple-500" />
            </div>

            {dataError && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-center justify-center">
                    <AlertTriangle size={20} className="mr-2"/> {dataError}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3 bg-white p-5 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                        <FileText size={22} className="mr-2 text-gray-500"/>Recent Bills Summary
                    </h3>
                    {isLoadingData ? (
                        <LoadingSpinner message="Loading recent bills..." />
                    ) : recentBills.length > 0 ? (
                        <div className="space-y-3">
                            {recentBills.map(bill => {
                                const isPaid = bill.status === 'Paid';
                                const amountToShow = isPaid ? (bill.amountPaid || bill.amount) : bill.amount;
                                
                                return (
                                <div key={bill.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 border rounded-lg hover:bg-gray-50/70 transition-colors duration-150 ${isPaid ? 'border-green-200 bg-green-50/50' : 'border-yellow-200 bg-yellow-50/30'}`}>
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">
                                            {bill.monthYear || bill.billingPeriod} - <span className="font-bold">₱{amountToShow?.toFixed(2)}</span>
                                        </p>
                                        <p className={`text-xs mt-0.5 font-semibold ${isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                                            Status: {bill.status} {!isPaid && `(Due: ${formatDate(bill.dueDate, {month: 'short', day: 'numeric'})})`}
                                            {bill.displayPenalty > 0 && !isPaid && (
                                                <span className="text-xs text-red-500 font-semibold block">(Includes ₱{bill.displayPenalty.toFixed(2)} penalty)</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 mt-2 sm:mt-0">
                                        {!isPaid && (
                                            <button onClick={() => setActiveSection('myBills')} className="text-xs bg-red-500 hover:bg-red-600 text-white py-1.5 px-3 rounded-md transition-all active:scale-95 font-medium">Pay Now</button>
                                        )}
                                        <button onClick={() => setActiveSection('myBills')} className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 py-1.5 px-3 rounded-md transition-all font-medium">View Details</button>
                                    </div>
                                </div>
                            )})}
                             <button onClick={() => setActiveSection('myBills')} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline">
                                View All Bills & Payment History &rarr;
                            </button>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 py-4 text-center">
                            <Info size={24} className="mx-auto mb-1 text-gray-400" />
                            No recent bills to display. All up to date!
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button onClick={() => setActiveSection('myBills')} className={`${quickActionCardClass} focus:ring-green-500 border-l-4 border-green-500`}>
                    <CreditCard size={26} className="mb-2 text-green-500" />
                    <h4 className="font-semibold text-green-700 text-md">Pay My Bill</h4>
                    <p className="text-xs text-gray-500 mt-0.5">View outstanding bills and make (simulated) payments.</p>
                </button>
                <button onClick={() => setActiveSection('reportIssue')} className={`${quickActionCardClass} focus:ring-orange-500 border-l-4 border-orange-500`}>
                    <AlertTriangle size={26} className="mb-2 text-orange-500" />
                    <h4 className="font-semibold text-orange-700 text-md">Report an Issue</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Report leaks, service interruptions, or other concerns.</p>
                </button>
                <button onClick={handleFetchWaterSavingTips} className={`${quickActionCardClass} focus:ring-teal-500 border-l-4 border-teal-500`} disabled={isLoadingTips}>
                    <div className="flex items-center justify-between w-full">
                            <Sparkles size={26} className="mb-2 text-teal-500" />
                            {isLoadingTips && <Loader2 className="animate-spin text-teal-500" size={20}/>}
                    </div>
                    <h4 className="font-semibold text-teal-700 text-md">{isLoadingTips ? 'Getting Tips...' : '✨ Get Water Saving Tips'}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Discover ways to conserve water and save money.</p>
                </button>
            </div>

            <Modal isOpen={isTipsModalOpen} onClose={() => setIsTipsModalOpen(false)} title="✨ Water Saving Tips by Agie" size="lg">
                {isLoadingTips ? (
                    <div className="flex justify-center items-center h-40"><LoadingSpinner message="Agie is thinking of the best tips for you..." /></div>
                ) : (
                    <div 
                        className="prose prose-sm sm:prose max-w-none p-2 leading-relaxed text-gray-700" 
                        dangerouslySetInnerHTML={{ __html: waterSavingTips || "<p>No tips available at the moment. Please try again!</p>" }} 
                    />
                )}
            </Modal>
        </div>
    );
};

export default CustomerDashboardMain;