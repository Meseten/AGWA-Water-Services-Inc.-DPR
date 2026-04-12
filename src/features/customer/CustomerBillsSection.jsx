import React, { useState, useEffect } from 'react';
import { CreditCard, FileText, Download, CheckCircle, Clock, AlertTriangle, Eye, Printer, Filter } from 'lucide-react';
import * as DataService from '../../services/dataService.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import InvoiceView from '../../components/ui/InvoiceView.jsx';
import { formatDate, calculateDynamicPenalty } from '../../utils/userUtils.js';

const CustomerBillsSection = ({ db, user, userData, showNotification, systemSettings }) => {
    const [bills, setBills] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedBillForDetails, setSelectedBillForDetails] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        const fetchBills = async () => {
            if (!user || !user.uid) return;
            setIsLoading(true);
            try {
                const billsResult = await DataService.getBillsForUser(db, user.uid);
                if (billsResult.success) {
                    const processedBills = billsResult.data.map(bill => {
                        const dynamicPenalty = calculateDynamicPenalty(bill, systemSettings);
                        const finalAmount = (bill.amount || 0) + dynamicPenalty;
                        return { 
                            ...bill, 
                            amount: finalAmount,
                            displayPenalty: dynamicPenalty,
                            billDateTimestamp: bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate) 
                        };
                    }).sort((a, b) => b.billDateTimestamp - a.billDateTimestamp);
                    
                    setBills(processedBills);
                } else {
                    setError("Failed to load bills. " + (billsResult.error || ""));
                }
            } catch (err) {
                setError("An error occurred while fetching bills.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBills();
    }, [db, user, systemSettings]);

    const handleViewDetails = (bill) => {
        setSelectedBillForDetails(bill);
        setIsDetailsModalOpen(true);
    };

    const handlePrintInvoice = () => {
        const printContent = document.getElementById('invoice-print-area');
        if (printContent) {
            const printWindow = window.open('', '_blank', 'height=800,width=800');
            printWindow.document.write('<html><head><title>Print Invoice</title>');
            printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            
            // Added explicit @page styles to force the 1/4 A4 constraints
            printWindow.document.write(`
                <style>
                    @media print { 
                        @page { margin: 10mm; }
                        body { 
                            -webkit-print-color-adjust: exact; 
                            print-color-adjust: exact; 
                            margin: 0;
                            padding: 0;
                        }
                    }
                </style>
            `);
            
            printWindow.document.write('</head><body class="p-4 font-sans bg-white text-black flex justify-center items-start">');
            printWindow.document.write(printContent.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    const filteredBills = bills.filter(bill => {
        if (filterStatus === 'All') return true;
        return bill.status === filterStatus;
    });

    const unpaidTotal = bills.filter(b => b.status === 'Unpaid').reduce((sum, b) => sum + (b.amount || 0), 0);

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                <div className="mb-4 sm:mb-0">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <FileText size={26} className="mr-3 text-blue-600"/> My Bills & Payment History
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your account balances and view past invoices.</p>
                </div>
                <div className="text-center sm:text-right bg-blue-50 py-3 px-6 rounded-lg border border-blue-100">
                    <p className="text-sm font-semibold text-blue-800 uppercase tracking-wider">Total Outstanding Balance</p>
                    <p className={`text-3xl font-bold mt-1 ${unpaidTotal > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₱{unpaidTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center text-gray-700 font-medium">
                        <Filter size={18} className="mr-2 text-gray-500" /> Filter Bills:
                    </div>
                    <div className="flex bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                        {['All', 'Unpaid', 'Paid'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${filterStatus === status ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'} ${status !== 'Paid' ? 'border-r border-gray-200' : ''}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-0 sm:p-5">
                    {isLoading ? (
                        <div className="py-12"><LoadingSpinner message="Loading your bills..." /></div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg my-4 mx-5 border border-red-100">
                            <AlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
                            <p className="font-medium">{error}</p>
                        </div>
                    ) : filteredBills.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300 my-4 mx-5">
                            <CheckCircle size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium text-gray-600">No {filterStatus !== 'All' ? filterStatus.toLowerCase() : ''} bills found.</p>
                            <p className="text-sm mt-1">You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Billing Period</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredBills.map(bill => {
                                        const isPaid = bill.status === 'Paid';
                                        const amountToShow = isPaid ? (bill.amountPaid || bill.amount) : bill.amount;
                                        
                                        return (
                                        <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{bill.monthYear || bill.billingPeriod}</div>
                                                <div className="text-xs text-gray-500 mt-1">Issued: {formatDate(bill.billDate?.toDate())}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`text-sm ${!isPaid && new Date() > new Date(bill.dueDate?.toDate()) ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                                                    {formatDate(bill.dueDate?.toDate(), {year: 'numeric', month: 'short', day: 'numeric'})}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-900">₱{amountToShow?.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                                                {bill.displayPenalty > 0 && !isPaid && (
                                                    <div className="text-xs text-red-500 font-medium">Incl. ₱{bill.displayPenalty.toLocaleString('en-US', {minimumFractionDigits: 2})} penalty</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    isPaid ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                                }`}>
                                                    {isPaid ? <CheckCircle size={12} className="mr-1"/> : <Clock size={12} className="mr-1"/>}
                                                    {bill.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2">
                                                    <button onClick={() => handleViewDetails(bill)} className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-2 rounded-md transition-colors" title="View Details / Print">
                                                        <Eye size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title="Bill Statement" size="2xl">
                {selectedBillForDetails && (
                    <div className="space-y-6 bg-gray-100 p-4 rounded-b-lg">
                        <div id="invoice-print-area" className="flex justify-center">
                            <InvoiceView billData={selectedBillForDetails} userData={userData} systemSettings={systemSettings} isCustomerView={true} />
                        </div>
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-300">
                             <button onClick={handlePrintInvoice} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                                <Printer size={18} className="mr-2" /> Print / Save PDF
                            </button>
                            <button onClick={() => setIsDetailsModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium rounded-lg transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default CustomerBillsSection;