import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Banknote, FileSearch, Clock, RotateCcw, Loader2, AlertTriangle, Info, Printer } from 'lucide-react';
import DashboardInfoCard from '../../components/ui/DashboardInfoCard.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import * as DataService from '../../services/dataService.js';
import { formatDate } from '../../utils/userUtils.js';

const ClerkDashboardMain = ({ userData, showNotification, setActiveSection, db }) => {
    const [dashboardStats, setDashboardStats] = useState({
        paymentsTodayCount: 0,
        totalCollectedToday: 0,
        avgPaymentAmount: 0,
    });
    const [todaysTransactions, setTodaysTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchClerkStats = useCallback(async () => {
        if (!userData || !userData.uid) {
            setIsLoading(false);
            setError("Clerk user data is not available.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const paymentsResult = await DataService.getPaymentsByClerkForToday(db, userData.uid);
            if (paymentsResult.success && paymentsResult.data) {
                const { paymentsTodayCount, totalCollectedToday, transactions } = paymentsResult.data;
                const paymentMethodSummary = transactions.reduce((acc, tx) => {
                    const method = tx.paymentMethod || 'Other';
                    acc[method] = (acc[method] || 0) + (tx.amountPaid || 0);
                    return acc;
                }, {});

                setDashboardStats({
                    paymentsTodayCount,
                    totalCollectedToday,
                    avgPaymentAmount: paymentsTodayCount > 0 ? totalCollectedToday / paymentsTodayCount : 0,
                    paymentMethodSummary
                });
                setTodaysTransactions(transactions);
            } else {
                setError(paymentsResult.error || "Today's payment data unavailable.");
            }
        } catch {
            const fetchErr = "Could not load clerk dashboard statistics. Please try refreshing.";
            setError(fetchErr);
        } finally {
            setIsLoading(false);
        }
    }, [userData, db]);

    useEffect(() => {
        fetchClerkStats();
    }, [fetchClerkStats]);

    const handlePrintReport = () => {
        const reportContent = document.getElementById('eod-report-content');
        if (reportContent) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            printWindow.document.write('<html><head><title>Cashier Daily Collection Report</title>');
            printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow.document.write(`
                <style>
                    body { 
                        font-family: 'Times New Roman', Times, serif; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                        color: #000;
                        font-size: 10pt;
                    }
                    .printable-area { 
                        max-width: 800px; 
                        margin: auto; 
                        padding: 2.5rem; 
                    }
                    .report-header { 
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        text-align: left;
                        border-bottom: 2px solid #000; 
                        padding-bottom: 1rem; 
                    }
                    .report-header .logo-print { 
                        font-size: 2.5rem; 
                        font-weight: 700; 
                        color: #1e3a8a !important; 
                        line-height: 1;
                        margin: 0; 
                    }
                    .report-header .tagline-print { 
                        font-size: 0.8rem; 
                        color: #1d4ed8 !important; 
                        font-style: italic;
                        margin: 0;
                    }
                    .report-header .company-address-print {
                        text-align: right;
                        font-size: 0.8rem;
                        line-height: 1.4;
                        color: #374151;
                    }
                    h1.report-title { 
                        font-size: 1.5rem; 
                        font-weight: 700; 
                        color: #000 !important; 
                        margin-top: 1.5rem; 
                        margin-bottom: 1rem; 
                        text-align: center;
                        text-transform: uppercase;
                    }
                    .report-section { 
                        margin-top: 1.5rem; 
                        page-break-inside: avoid;
                    }
                    .report-section h2 { 
                        font-size: 1.25rem; 
                        font-weight: 700; 
                        border-bottom: 1px solid #4b5563; 
                        padding-bottom: 0.25rem; 
                        margin-bottom: 1rem; 
                        color: #111827 !important;
                    }
                    .info-table { 
                        width: 100%; 
                        font-size: 10pt;
                    }
                    .info-table td { 
                        padding: 4px 0; 
                        vertical-align: top;
                    }
                    .info-table td:nth-child(odd) { 
                        font-weight: 700; 
                        color: #374151 !important; 
                        width: auto; 
                        white-space: nowrap; 
                        padding-right: 1rem; 
                    }
                    .summary-grid { 
                        display: grid; 
                        grid-template-columns: repeat(3, 1fr); 
                        gap: 1.5rem; 
                    }
                    .summary-card { 
                        background-color: #f9fafb !important; 
                        border: 1px solid #e5e7eb; 
                        padding: 1.25rem; 
                        border-radius: 0.5rem; 
                        text-align: center; 
                    }
                    .summary-card p { 
                        margin: 0; 
                        font-size: 0.875rem; 
                        font-weight: 600;
                        text-transform: uppercase; 
                        color: #4b5563 !important; 
                    }
                    .summary-card span { 
                        font-size: 1.875rem; 
                        font-weight: 700; 
                        color: #000 !important; 
                        display: block; 
                        margin-top: 0.25rem;
                    }
                    table.data-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 1rem; 
                        font-size: 9.5pt;
                    }
                    .data-table th, .data-table td { 
                        border: 1px solid #d1d5db; 
                        padding: 0.5rem 0.75rem; 
                        text-align: left; 
                    }
                    .data-table th { 
                        background-color: #f3f4f6 !important; 
                        font-weight: 700; 
                        text-transform: uppercase;
                        font-size: 0.75rem;
                        color: #374151 !important;
                    }
                    .data-table .text-right { text-align: right; }
                    .data-table .font-mono { font-family: "Courier New", Courier, monospace; }
                    .data-table .font-semibold { font-weight: 600; }
                    .data-table .total-row td {
                        font-weight: 700;
                        font-size: 1.125rem;
                        background-color: #f3f4f6 !important;
                        border-top: 2px solid #374151;
                    }
                    .report-footer { 
                        margin-top: 4rem; 
                        padding-top: 2rem; 
                        border-top: 1px solid #9ca3af; 
                    }
                    .signature-line { 
                        width: 60%; 
                        margin: 2rem auto 0 auto; 
                        border-top: 1px solid #333; 
                        padding-top: 8px; 
                        text-align: center; 
                    }
                    @media print {
                        .no-print { display: none !important; }
                        body { margin: 0; font-size: 10pt; }
                        .printable-area { padding: 0.5rem; box-shadow: none; border: none; }
                        .summary-grid { grid-template-columns: repeat(3, 1fr); }
                    }
                </style>
            `);
            printWindow.document.write('</head><body><div class="printable-area">');
            printWindow.document.write(reportContent.innerHTML);
            printWindow.document.write('</div></body></html>');
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
        }
    };

    const quickActionCards = [
        { title: "Process Walk-in Payment", icon: Banknote, section: 'walkInPayments', description: "Record payments for customers paying in person at the counter.", color: "blue" },
        { title: "Search Account / Bill", icon: FileSearch, section: 'searchAccountOrBill', description: "Look up customer account details, outstanding bills, or payment history.", color: "teal" },
    ];
    
    const PesoIcon = () => <span className="font-bold">₱</span>;

    if (isLoading) {
        return <LoadingSpinner message="Loading clerk dashboard..." className="mt-10 h-48" />;
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-xl no-print">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold">Clerk / Cashier Dashboard</h2>
                        <p className="mt-1 text-indigo-100">Welcome, {userData.displayName || 'Clerk'}! Manage payments and customer inquiries.</p>
                    </div>
                     <button onClick={fetchClerkStats} className="mt-3 sm:mt-0 text-sm flex items-center bg-indigo-400 hover:bg-indigo-300 text-white font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-70 self-start sm:self-center" disabled={isLoading} title="Refresh Statistics">
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                         <span className="ml-2 hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>
            
            {error && <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md text-center my-4 flex items-center justify-center gap-2 no-print"><Info size={16}/> {error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 no-print">
                <DashboardInfoCard title="Payments Today" value={dashboardStats.paymentsTodayCount} icon={Banknote} borderColor="border-green-500" iconColor="text-green-500" onClick={() => document.getElementById('eod-report-wrapper')?.scrollIntoView({behavior:'smooth'})} />
                <DashboardInfoCard title="Total Collected Today" value={`₱${dashboardStats.totalCollectedToday.toLocaleString('en-US', {minimumFractionDigits: 2})}`} icon={PesoIcon} borderColor="border-emerald-500" iconColor="text-emerald-500" />
                <DashboardInfoCard title="Avg. Payment Today" value={`₱${dashboardStats.avgPaymentAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}`} icon={PesoIcon} borderColor="border-teal-500" iconColor="text-teal-500" />
            </div>

            <div className="no-print">
                <h3 className="text-xl font-semibold text-gray-700 mb-5 mt-8 pt-5 border-t border-gray-200">Primary Tasks</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {quickActionCards.map((action) => (
                        <button key={action.section} onClick={() => setActiveSection(action.section)} className={`p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1.5 transition-all duration-300 ease-in-out text-left focus:outline-none focus:ring-2 focus:ring-${action.color}-500 focus:ring-opacity-75 group h-full flex flex-col`}>
                            <div className={`p-3 bg-${action.color}-100 rounded-full inline-block mb-3 self-start group-hover:scale-110 transition-transform`}>
                                <action.icon size={28} className={`text-${action.color}-600`} />
                            </div>
                            <h4 className={`text-lg font-semibold text-gray-800 group-hover:text-${action.color}-700 transition-colors`}>{action.title}</h4>
                            <p className="text-sm text-gray-500 mt-1 leading-normal flex-grow">{action.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div id="eod-report-wrapper" className="mt-8 p-3 sm:p-5 bg-gray-50 rounded-xl shadow">
                <div className="flex justify-between items-center mb-4 no-print">
                    <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                        <Clock size={20} className="mr-2 text-gray-500" /> Shift Summary / End-of-Day Report
                    </h3>
                    <button onClick={handlePrintReport} className="flex items-center bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors">
                        <Printer size={14} className="mr-1.5" /> Print Report
                    </button>
                </div>
                
                <div id="eod-report-content" className="bg-white p-6 sm:p-10 rounded-lg border border-gray-200 text-gray-800 text-[10pt] leading-normal printable-area">
                    <div className="report-header">
                        <div>
                            <h1 className="logo-print">AGWA</h1>
                            <p className="tagline-print">Ensuring Clarity, Sustaining Life.</p>
                        </div>
                        <div className="company-address-print">
                            <strong>AGWA Water Services, Inc.</strong><br/>
                            123 Aqua Drive, Hydro Business Park<br/>
                            Naic, Cavite, Philippines 4110<br/>
                            VAT Reg. TIN: 000-123-456-789
                        </div>
                    </div>

                    <h1 className="report-title">CASHIER'S DAILY COLLECTION REPORT</h1>

                    <div className="report-section mt-6">
                        <table className="info-table w-full">
                            <tbody>
                                <tr className="!border-none">
                                    <td className="font-semibold text-gray-600 !pr-4 !border-none !p-1">Cashier Name:</td>
                                    <td className="font-medium !border-none !p-1">{userData.displayName}</td>
                                    <td className="font-semibold text-gray-600 !pr-4 !border-none !p-1">Report Date:</td>
                                    <td className="font-medium !border-none !p-1">{formatDate(new Date(), {year: 'numeric', month: 'long', day: 'numeric'})}</td>
                                </tr>
                                <tr className="!border-none">
                                    <td className="font-semibold text-gray-600 !pr-4 !border-none !p-1">Cashier ID:</td>
                                    <td className="font-mono !border-none !p-1">{userData.accountNumber || userData.uid.substring(0,10)}</td>
                                    <td className="font-semibold text-gray-600 !pr-4 !border-none !p-1">Time Generated:</td>
                                    <td className="font-medium !border-none !p-1">{formatDate(new Date(), {hour:'2-digit', minute:'2-digit', hour12: true})}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <section className="report-section mt-8">
                        <h2 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-4 text-gray-700">Collection Summary</h2>
                        <div className="summary-grid grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="summary-card bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                                <p className="text-sm font-medium text-gray-500 uppercase">Total Collected</p>
                                <span className="text-2xl font-bold text-gray-800">₱{dashboardStats.totalCollectedToday.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="summary-card bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                                <p className="text-sm font-medium text-gray-500 uppercase">Total Transactions</p>
                                <span className="text-2xl font-bold text-gray-800">{dashboardStats.paymentsTodayCount}</span>
                            </div>
                             <div className="summary-card bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                                <p className="text-sm font-medium text-gray-500 uppercase">Average Transaction</p>
                                <span className="text-2xl font-bold text-gray-800">₱{dashboardStats.avgPaymentAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                    </section>

                    {dashboardStats.paymentMethodSummary && Object.keys(dashboardStats.paymentMethodSummary).length > 0 &&
                        <section className="report-section mt-8">
                            <h2 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-4 text-gray-700">Breakdown by Payment Method</h2>
                            <table className="data-table w-full border-collapse text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="border p-2 text-left text-xs font-semibold text-gray-600 uppercase">Payment Method</th>
                                        <th className="border p-2 text-right text-xs font-semibold text-gray-600 uppercase">Total Amount (PHP)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(dashboardStats.paymentMethodSummary).map(([method, amount]) => (
                                        <tr key={method} className="border-b">
                                            <td className="border p-2.5">{method}</td>
                                            <td className="border p-2.5 text-right font-semibold">₱{amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    ))}
                                    <tr className="total-row bg-gray-100">
                                        <td className="border p-3 font-bold text-base">GRAND TOTAL</td>
                                        <td className="border p-3 text-right font-bold text-base">₱{dashboardStats.totalCollectedToday.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>
                    }

                    <section className="report-section mt-8">
                        <h2 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-4 text-gray-700">Transaction Log (Today)</h2>
                        {todaysTransactions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="data-table w-full border-collapse text-sm">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border p-2 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                                            <th className="border p-2 text-left text-xs font-semibold text-gray-600 uppercase">Account #</th>
                                            <th className="border p-2 text-left text-xs font-semibold text-gray-600 uppercase">Reference #</th>
                                            <th className="border p-2 text-right text-xs font-semibold text-gray-600 uppercase">Amount (PHP)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {todaysTransactions.map(tx => (
                                            <tr key={tx.id} className="border-b">
                                                <td className="border p-2.5 whitespace-nowrap">{formatDate(tx.paymentTimestamp?.toDate(), {hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: true})}</td>
                                                <td className="border p-2.5 whitespace-nowrap font-mono">{tx.accountNumber}</td>
                                                <td className="border p-2.5 whitespace-nowrap font-mono">{tx.paymentReference}</td>
                                                <td className="border p-2.5 whitespace-nowrap text-right font-semibold">₱{tx.amountPaid?.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-md border">
                                <Info size={32} className="mx-auto text-gray-400 mb-2"/>
                                <p className="text-gray-500">No payments have been processed yet today.</p>
                            </div>
                        )}
                    </section>
                     
                    <footer className="report-footer mt-16 pt-8 border-t border-gray-400">
                        <div className="signature-line w-3/5 mx-auto border-t border-gray-700 pt-2 text-center">
                            <p className="text-sm font-semibold">{userData.displayName}</p>
                            <p className="text-xs text-gray-600">Cashier's Signature Over Printed Name</p>
                        </div>
                    </footer>
                </div>
            </div>

            <style>
                {`
                    .printable-area { 
                        font-family: 'Times New Roman', Times, serif; 
                        color: #000;
                    }
                    .report-header { 
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        text-align: left;
                        border-bottom: 2px solid #000; 
                        padding-bottom: 1rem; 
                    }
                    .report-header .logo-print { 
                        font-size: 2.5rem; 
                        font-weight: 700; 
                        color: #1e3a8a; 
                        line-height: 1;
                        margin: 0; 
                    }
                    .report-header .tagline-print { 
                        font-size: 0.8rem; 
                        color: #1d4ed8; 
                        font-style: italic;
                        margin: 0;
                    }
                    .report-header .company-address-print {
                        text-align: right;
                        font-size: 0.8rem;
                        line-height: 1.4;
                        color: #374151;
                    }
                    h1.report-title { 
                        font-size: 1.5rem; 
                        font-weight: 700; 
                        color: #000; 
                        margin-top: 1.5rem; 
                        margin-bottom: 1rem; 
                        text-align: center;
                        text-transform: uppercase;
                    }
                    .report-section { 
                        margin-top: 1.5rem; 
                    }
                    .report-section h2 { 
                        font-size: 1.25rem; 
                        font-weight: 700; 
                        border-bottom: 1px solid #4b5563; 
                        padding-bottom: 0.25rem; 
                        margin-bottom: 1rem; 
                        color: #111827;
                    }
                    .info-table { 
                        width: 100%; 
                    }
                    .info-table td { 
                        padding: 4px 0; 
                        vertical-align: top;
                    }
                    .info-table td:nth-child(odd) { 
                        font-weight: 700; 
                        color: #374151; 
                        width: auto; 
                        white-space: nowrap; 
                        padding-right: 1rem; 
                    }
                    .summary-grid { 
                        display: grid; 
                        grid-template-columns: repeat(1, 1fr);
                    }
                    @media (min-width: 640px) {
                        .summary-grid { 
                            grid-template-columns: repeat(3, 1fr); 
                        }
                    }
                    .summary-card { 
                        background-color: #f9fafb; 
                        border: 1px solid #e5e7eb; 
                        padding: 1.25rem; 
                        border-radius: 0.5rem; 
                        text-align: center; 
                    }
                    .summary-card p { 
                        margin: 0; 
                        font-size: 0.875rem; 
                        font-weight: 600;
                        text-transform: uppercase; 
                        color: #4b5563; 
                    }
                    .summary-card span { 
                        font-size: 1.875rem; 
                        font-weight: 700; 
                        color: #000; 
                        display: block; 
                        margin-top: 0.25rem;
                    }
                    table.data-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 1rem; 
                    }
                    .data-table th, .data-table td { 
                        border: 1px solid #d1d5db; 
                        padding: 0.5rem 0.75rem; 
                        text-align: left; 
                    }
                    .data-table th { 
                        background-color: #f3f4f6; 
                        font-weight: 700; 
                        text-transform: uppercase;
                        font-size: 0.75rem;
                        color: #374151;
                    }
                    .data-table .text-right { text-align: right; }
                    .data-table .font-mono { font-family: "Courier New", Courier, monospace; }
                    .data-table .font-semibold { font-weight: 600; }
                    .data-table .total-row td {
                        font-weight: 700;
                        font-size: 1.125rem;
                        background-color: #f3f4f6;
                        border-top: 2px solid #374151;
                    }
                    .report-footer { 
                        margin-top: 4rem; 
                        padding-top: 2rem; 
                        border-top: 1px solid #9ca3af; 
                    }
                    .signature-line { 
                        width: 60%; 
                        margin: 2rem auto 0 auto; 
                        border-top: 1px solid #333; 
                        padding-top: 8px; 
                        text-align: center; 
                    }
                `}
            </style>
        </div>
    );
};

export default ClerkDashboardMain;