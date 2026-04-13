import React, { useState } from 'react';
import { UploadCloud, Database, Users, FileText, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { collection, doc, writeBatch, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { profilesCollectionPath, allBillsCollectionPath } from '../../firebase/firestorePaths';

const DataMigrationSection = ({ db, showNotification }) => {
    const [activeTab, setActiveTab] = useState('accounts');
    const [isLoading, setIsLoading] = useState(false);
    const [migrationLogs, setMigrationLogs] = useState([]);

    const logMessage = (msg, type = 'info') => {
        setMigrationLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
    };

    const processAccountsCSV = async (file) => {
        setIsLoading(true);
        setMigrationLogs([]);
        logMessage(`Starting account migration from ${file.name}...`);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data;
                logMessage(`Parsed ${data.length} rows. Preparing batches...`);

                try {
                    const profilesRef = collection(db, profilesCollectionPath());
                    let batch = writeBatch(db);
                    let operationCount = 0;
                    let totalMigrated = 0;

                    for (const row of data) {
                        if (!row.AccountNumber || !row.FullName) {
                            logMessage(`Skipping invalid row: missing AccountNumber or FullName.`, 'error');
                            continue;
                        }

                        const acctNum = String(row.AccountNumber).trim().toUpperCase();
                        
                        const q = query(profilesRef, where("accountNumber", "==", acctNum));
                        const snapshot = await getDocs(q);
                        
                        if (!snapshot.empty) {
                            logMessage(`Account ${acctNum} already exists. Skipping.`, 'warning');
                            continue;
                        }

                        const docRef = doc(profilesRef);
                        const profileData = {
                            accountNumber: acctNum,
                            displayName: String(row.FullName).trim(),
                            displayNameLower: String(row.FullName).trim().toLowerCase(),
                            serviceType: row.ServiceType || 'Residential',
                            role: 'customer',
                            meterSerialNumber: row.MeterNumber || '',
                            serviceAddress: {
                                barangay: row.Barangay || '',
                                municipality: 'Maragondon',
                                province: 'Cavite',
                                street: row.Street || ''
                            },
                            discountStatus: row.DiscountStatus || 'none',
                            accountStatus: 'Active',
                            createdAt: serverTimestamp(),
                            isUnclaimedLegacy: true, 
                            uid: null 
                        };

                        batch.set(docRef, profileData);
                        operationCount++;
                        totalMigrated++;

                        if (operationCount === 450) {
                            await batch.commit();
                            logMessage(`Committed batch of 450 accounts.`, 'success');
                            batch = writeBatch(db);
                            operationCount = 0;
                        }
                    }

                    if (operationCount > 0) {
                        await batch.commit();
                    }

                    logMessage(`Migration complete. Successfully migrated ${totalMigrated} accounts.`, 'success');
                    showNotification(`Migrated ${totalMigrated} accounts.`, 'success');
                } catch (error) {
                    logMessage(`Critical Error: ${error.message}`, 'error');
                    showNotification("Migration failed.", 'error');
                }
                setIsLoading(false);
            },
            error: (err) => {
                logMessage(`CSV Parse Error: ${err.message}`, 'error');
                setIsLoading(false);
            }
        });
    };

    const processBillsCSV = async (file) => {
        setIsLoading(true);
        setMigrationLogs([]);
        logMessage(`Starting legacy bills migration from ${file.name}...`);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: async (results) => {
                const data = results.data;
                logMessage(`Parsed ${data.length} billing records. Preparing batches...`);

                try {
                    const profilesRef = collection(db, profilesCollectionPath());
                    const billsRef = collection(db, allBillsCollectionPath());
                    
                    const accountsSnapshot = await getDocs(profilesRef);
                    const accountMap = {};
                    accountsSnapshot.forEach(doc => {
                        const d = doc.data();
                        if (d.accountNumber) accountMap[d.accountNumber] = { id: doc.id, ...d };
                    });

                    let batch = writeBatch(db);
                    let operationCount = 0;
                    let totalMigrated = 0;

                    for (const row of data) {
                        if (!row.AccountNumber || !row.MonthYear || row.Consumption == null) {
                            logMessage(`Skipping row: Missing AcctNum, MonthYear, or Consumption.`, 'error');
                            continue;
                        }

                        const acctNum = String(row.AccountNumber).trim().toUpperCase();
                        const targetProfile = accountMap[acctNum];

                        if (!targetProfile) {
                            logMessage(`Skipping bill for ${acctNum}: Account not found in system.`, 'warning');
                            continue;
                        }

                        const docRef = doc(billsRef);
                        
                        const billDate = new Date(row.BillDate || Date.now());
                        const dueDate = new Date(row.DueDate || Date.now());
                        const isPaid = row.Status === 'Paid';

                        const billData = {
                            userId: targetProfile.uid || targetProfile.id, 
                            accountNumber: acctNum,
                            userName: targetProfile.displayName,
                            serviceType: targetProfile.serviceType,
                            billingPeriod: row.BillingPeriod || row.MonthYear,
                            monthYear: row.MonthYear,
                            billDate: billDate,
                            dueDate: dueDate,
                            previousReading: row.PreviousReading || 0,
                            currentReading: row.CurrentReading || row.Consumption,
                            consumption: row.Consumption,
                            amount: row.Amount || 0,
                            status: isPaid ? 'Paid' : 'Unpaid',
                            amountPaid: isPaid ? (row.AmountPaid || row.Amount) : 0,
                            paymentMethod: isPaid ? (row.PaymentMethod || 'Legacy System') : null,
                            paymentDate: isPaid ? new Date(row.PaymentDate || billDate) : null,
                            createdAt: serverTimestamp(),
                            isLegacyRecord: true
                        };

                        batch.set(docRef, billData);
                        operationCount++;
                        totalMigrated++;

                        if (operationCount === 450) {
                            await batch.commit();
                            logMessage(`Committed batch of 450 bills.`, 'success');
                            batch = writeBatch(db);
                            operationCount = 0;
                        }
                    }

                    if (operationCount > 0) {
                        await batch.commit();
                    }

                    logMessage(`Migration complete. Successfully migrated ${totalMigrated} bills.`, 'success');
                    showNotification(`Migrated ${totalMigrated} historical bills.`, 'success');
                } catch (error) {
                    logMessage(`Critical Error: ${error.message}`, 'error');
                    showNotification("Migration failed.", 'error');
                }
                setIsLoading(false);
            },
            error: (err) => {
                logMessage(`CSV Parse Error: ${err.message}`, 'error');
                setIsLoading(false);
            }
        });
    };

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn space-y-6">
            <div className="flex items-center mb-6">
                <Database size={28} className="mr-3 text-blue-600" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Legacy Data Migration</h2>
                    <p className="text-sm text-gray-500 mt-1">Upload records from the old system to populate AGWA.</p>
                </div>
            </div>

            <div className="flex border-b border-gray-200 mb-6">
                <button onClick={() => setActiveTab('accounts')} className={`pb-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'accounts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <div className="flex items-center"><Users size={18} className="mr-2"/> 1. Migrate Accounts</div>
                </button>
                <button onClick={() => setActiveTab('bills')} className={`pb-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'bills' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                     <div className="flex items-center"><FileText size={18} className="mr-2"/> 2. Migrate Billing History</div>
                </button>
            </div>

            {activeTab === 'accounts' && (
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
                    <h3 className="font-bold text-blue-800 mb-2">Step 1: Upload Customer Masterlist</h3>
                    <p className="text-sm text-blue-700 mb-4">Required CSV Headers: <code className="bg-white px-1 py-0.5 rounded text-blue-900 font-bold">AccountNumber, FullName, Barangay, ServiceType, MeterNumber</code></p>
                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-400 rounded-lg cursor-pointer bg-white hover:bg-blue-50 transition-colors ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {isLoading ? <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" /> : <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />}
                            <p className="text-sm text-gray-500 font-semibold">{isLoading ? 'Processing Accounts...' : 'Click to select Accounts CSV'}</p>
                        </div>
                        <input type="file" className="hidden" accept=".csv" onChange={(e) => processAccountsCSV(e.target.files[0])} disabled={isLoading} />
                    </label>
                </div>
            )}

            {activeTab === 'bills' && (
                <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
                    <h3 className="font-bold text-green-800 mb-2">Step 2: Upload Historical Billing Data (3-5 Years)</h3>
                    <p className="text-sm text-green-700 mb-4">Required CSV Headers: <code className="bg-white px-1 py-0.5 rounded text-green-900 font-bold">AccountNumber, MonthYear, Consumption, Amount, Status</code></p>
                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-green-400 rounded-lg cursor-pointer bg-white hover:bg-green-50 transition-colors ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {isLoading ? <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-2" /> : <UploadCloud className="w-8 h-8 text-green-500 mb-2" />}
                            <p className="text-sm text-gray-500 font-semibold">{isLoading ? 'Processing Bills...' : 'Click to select Bills CSV'}</p>
                        </div>
                        <input type="file" className="hidden" accept=".csv" onChange={(e) => processBillsCSV(e.target.files[0])} disabled={isLoading} />
                    </label>
                </div>
            )}

            {migrationLogs.length > 0 && (
                <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-800 text-white px-4 py-2 font-semibold text-sm flex justify-between">
                        <span>Migration Terminal</span>
                        <span className="text-gray-400 font-mono">{migrationLogs.length} events</span>
                    </div>
                    <div className="bg-gray-900 p-4 h-64 overflow-y-auto font-mono text-xs space-y-1">
                        {migrationLogs.map((log, idx) => (
                            <div key={idx} className={`flex items-start ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : log.type === 'warning' ? 'text-yellow-400' : 'text-gray-300'}`}>
                                <span className="text-gray-500 mr-2 whitespace-nowrap">[{log.time}]</span>
                                <span>{log.msg}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataMigrationSection;