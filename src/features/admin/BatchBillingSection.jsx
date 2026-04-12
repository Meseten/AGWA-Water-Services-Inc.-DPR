import React, { useState, useEffect } from 'react';
import { FileText, Building, Loader2, PlayCircle, Info, CheckCircle, AlertTriangle, Printer, Layers } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { allBillsCollectionPath } from '../../firebase/firestorePaths';
import * as DataService from '../../services/dataService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import InvoiceView from '../../components/ui/InvoiceView';

const BatchBillingSection = ({ db, showNotification }) => {
    const [activeTab, setActiveTab] = useState('generate'); // 'generate' or 'print'

    // Generate Tab State
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [billableAccounts, setBillableAccounts] = useState([]);
    const [isLoadingGenerate, setIsLoadingGenerate] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processLog, setProcessLog] = useState([]);

    // Print Tab State
    const [printLocation, setPrintLocation] = useState('');
    const [unpaidBillsToPrint, setUnpaidBillsToPrint] = useState([]);
    const [userProfilesMap, setUserProfilesMap] = useState({});
    const [isLoadingPrint, setIsLoadingPrint] = useState(false);
    const [systemSettings, setSystemSettings] = useState({});

    useEffect(() => {
        const fetchInitialData = async () => {
            const locResult = await DataService.getUniqueServiceLocations(db);
            if(locResult.success) setLocations(locResult.data);
            
            const settingsResult = await DataService.getSystemSettings(db);
            if(settingsResult.success) setSystemSettings(settingsResult.data);
        };
        fetchInitialData();
    }, [db]);

    const handleLocationSelectForGenerate = async (location) => {
        setSelectedLocation(location);
        if (!location) { setBillableAccounts([]); return; }
        setIsLoadingGenerate(true);
        setBillableAccounts([]);
        const result = await DataService.getBillableAccountsInLocation(db, location);
        if (result.success) setBillableAccounts(result.data);
        else showNotification(result.error, 'error');
        setIsLoadingGenerate(false);
    };

    const handleRunBatchBilling = async () => {
        if (billableAccounts.length === 0) {
            showNotification("No billable accounts in the selected area.", "warning");
            return;
        }
        setIsProcessing(true);
        setProcessLog([]);
        const results = await DataService.generateBillsForMultipleAccounts(db, billableAccounts);
        setProcessLog(results.logs); 
        setIsProcessing(false);
        showNotification("Batch billing process completed. Check logs for details.", "success");
        handleLocationSelectForGenerate(selectedLocation);
    };

    const handleLocationSelectForPrint = async (location) => {
        setPrintLocation(location);
        if (!location) { setUnpaidBillsToPrint([]); return; }
        setIsLoadingPrint(true);
        setUnpaidBillsToPrint([]);
        
        try {
            const accountsResult = await DataService.getAccountsByLocation(db, location);
            if (!accountsResult.success) throw new Error("Failed to fetch accounts for location.");
            
            const accountNumbers = accountsResult.data;
            if (accountNumbers.length === 0) {
                 setIsLoadingPrint(false);
                 return;
            }

            const profilesResult = await DataService.getAllUsersProfiles(db);
            const profilesMap = {};
            if (profilesResult.success) {
                profilesResult.data.forEach(p => profilesMap[p.id] = p);
            }
            setUserProfilesMap(profilesMap);

            const billsRef = collection(db, allBillsCollectionPath());
            const q = query(billsRef, where("status", "==", "Unpaid"));
            const snapshot = await getDocs(q);
            const allUnpaidBills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const relevantBills = allUnpaidBills.filter(bill => 
                accountNumbers.includes(bill.accountNumber)
            ).sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });

            setUnpaidBillsToPrint(relevantBills);
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsLoadingPrint(false);
        }
    };

    const handlePrintBatch = () => {
        const printContent = document.getElementById('batch-print-area');
        if (printContent) {
            const printWindow = window.open('', '_blank', 'height=800,width=1000');
            printWindow.document.write('<html><head><title>Batch Print Bills</title>');
            printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            
            printWindow.document.write(`
                <style>
                    @media print { 
                        @page { size: A4 portrait; margin: 10mm; }
                        body { 
                            -webkit-print-color-adjust: exact; 
                            print-color-adjust: exact; 
                            margin: 0; padding: 0;
                            background: white;
                        }
                        .print-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            grid-template-rows: 1fr 1fr;
                            height: 270mm; /* Fit 4 strictly on A4 */
                            gap: 10mm;
                            page-break-after: always;
                        }
                        .print-item {
                            border: 1px dashed #ccc; /* Cut line guide */
                            padding: 5mm;
                            overflow: hidden;
                        }
                    }
                </style>
            `);
            
            printWindow.document.write('</head><body>');
   
            const chunkSize = 4;
            for (let i = 0; i < unpaidBillsToPrint.length; i += chunkSize) {
                const chunk = unpaidBillsToPrint.slice(i, i + chunkSize);
                printWindow.document.write('<div class="print-grid">');
                
                chunk.forEach(bill => {
                    const billHtml = document.getElementById(`invoice-container-${bill.id}`)?.innerHTML || '';
                    printWindow.document.write(`<div class="print-item">${billHtml}</div>`);
                });
                
                printWindow.document.write('</div>');
            }
            
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); }, 1000);
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center mb-6">
                <Layers size={30} className="mr-3 text-blue-600" /> Batch Bill / Print
            </h2>

  
            <div className="flex border-b border-gray-200 mb-6">
                <button 
                    onClick={() => setActiveTab('generate')}
                    className={`pb-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'generate' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center"><PlayCircle size={18} className="mr-2"/> Generate Bills</div>
                </button>
                <button 
                    onClick={() => setActiveTab('print')}
                    className={`pb-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'print' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                     <div className="flex items-center"><Printer size={18} className="mr-2"/> Batch Print</div>
                </button>
            </div>

            {/* GENERATE TAB */}
            {activeTab === 'generate' && (
                <div className="space-y-6">
                    <p className="text-sm text-gray-500">Select a service area to find eligible accounts and generate bills in bulk. An account is eligible if it has a new reading that has not yet been billed.</p>

                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <label htmlFor="locationGen" className="block text-sm font-medium text-gray-700 mb-1">Select Service Area (Barangay)</label>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <select id="locationGen" value={selectedLocation} onChange={(e) => handleLocationSelectForGenerate(e.target.value)} className="w-full p-2 border rounded-md bg-white focus:ring-blue-500 focus:border-blue-500">
                                <option value="">-- Select an Area --</option>
                                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                            <button onClick={handleRunBatchBilling} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md flex items-center justify-center whitespace-nowrap disabled:bg-gray-400 transition-colors" disabled={isLoadingGenerate || isProcessing || billableAccounts.length === 0}>
                                {isProcessing ? <Loader2 size={18} className="animate-spin mr-2"/> : <PlayCircle size={18} className="mr-2" />}
                                {isProcessing ? 'Processing...' : `Generate ${billableAccounts.length} Bills`}
                            </button>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h3 className="font-semibold text-gray-700">Eligible Accounts in {selectedLocation || "..."}</h3>
                        {isLoadingGenerate && <LoadingSpinner message="Finding billable accounts..."/>}
                        {!isLoadingGenerate && selectedLocation && billableAccounts.length === 0 && (
                            <div className="text-center py-6 bg-gray-50 mt-2 rounded-md border border-dashed border-gray-300">
                                <Info size={32} className="mx-auto text-gray-400 mb-2"/>
                                <p className="text-gray-600">No new readings eligible for billing in this area.</p>
                            </div>
                        )}
                        {!isLoadingGenerate && billableAccounts.length > 0 && (
                            <p className="text-green-700 font-medium my-2 bg-green-50 p-3 rounded-md border border-green-200">{billableAccounts.length} accounts ready for billing.</p>
                        )}
                    </div>

                    {processLog.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <h3 className="font-semibold mb-2 text-gray-700">Processing Log</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-900 text-white font-mono text-xs p-4 rounded-md">
                                {processLog.map((log, index) => (
                                     <div key={index} className={`flex items-start ${log.success ? 'text-green-400' : 'text-red-400'}`}>
                                        {log.success ? <CheckCircle size={14} className="mr-2 mt-0.5 flex-shrink-0"/> : <AlertTriangle size={14} className="mr-2 mt-0.5 flex-shrink-0"/>}
                                        <span>{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* PRINT TAB */}
            {activeTab === 'print' && (
                <div className="space-y-6">
                    <p className="text-sm text-gray-500">Select a service area to fetch all currently <strong className="text-red-500">Unpaid</strong> bills and print them efficiently (4 bills per A4 page, ready to cut).</p>

                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <label htmlFor="locationPrint" className="block text-sm font-medium text-gray-700 mb-1">Select Service Area (Barangay)</label>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <select id="locationPrint" value={printLocation} onChange={(e) => handleLocationSelectForPrint(e.target.value)} className="w-full p-2 border rounded-md bg-white focus:ring-blue-500 focus:border-blue-500">
                                <option value="">-- Select an Area --</option>
                                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                            <button onClick={handlePrintBatch} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md flex items-center justify-center whitespace-nowrap disabled:bg-gray-400 transition-colors" disabled={isLoadingPrint || unpaidBillsToPrint.length === 0}>
                                <Printer size={18} className="mr-2" /> Print {unpaidBillsToPrint.length} Bills
                            </button>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h3 className="font-semibold text-gray-700">Unpaid Bills in {printLocation || "..."}</h3>
                        {isLoadingPrint && <LoadingSpinner message="Fetching unpaid bills..."/>}
                        {!isLoadingPrint && printLocation && unpaidBillsToPrint.length === 0 && (
                            <div className="text-center py-6 bg-gray-50 mt-2 rounded-md border border-dashed border-gray-300">
                                <CheckCircle size={32} className="mx-auto text-green-400 mb-2"/>
                                <p className="text-gray-600">All accounts in this area are fully paid, or no bills exist.</p>
                            </div>
                        )}
                        {!isLoadingPrint && unpaidBillsToPrint.length > 0 && (
                            <p className="text-blue-700 font-medium my-2 bg-blue-50 p-3 rounded-md border border-blue-200">
                                Ready to print {unpaidBillsToPrint.length} bills. This will require {Math.ceil(unpaidBillsToPrint.length / 4)} A4 sheet(s).
                            </p>
                        )}
                    </div>

                    {/* Hidden Print Area: Renders InvoiceViews invisibly so JS can grab their HTML for the print window */}
                    <div id="batch-print-area" style={{ display: 'none' }}>
                        {unpaidBillsToPrint.map(bill => {
                            const userData = userProfilesMap[bill.userId] || { 
                                displayName: bill.userName || 'Unknown', 
                                accountNumber: bill.accountNumber 
                            };
                            return (
                                <div key={bill.id} id={`invoice-container-${bill.id}`}>
                                    <InvoiceView billData={bill} userData={userData} systemSettings={systemSettings} isCustomerView={false} />
                                </div>
                            );
                        })}
                    </div>

                </div>
            )}
        </div>
    );
};

export default BatchBillingSection;