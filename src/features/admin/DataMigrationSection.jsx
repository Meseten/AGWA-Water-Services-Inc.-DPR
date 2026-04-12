import React, { useState, useRef } from 'react';
import { Upload, AlertTriangle, CheckCircle, Database, Loader2, XCircle } from 'lucide-react';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { profilesCollectionPath, userProfileDocumentPath } from '../../firebase/firestorePaths';
import { determineServiceTypeAndRole } from '../../utils/userUtils';

export default function DataMigrationSection({ showNotification }) {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [validationResults, setValidationResults] = useState({ valid: [], invalid: [] });
    const [isProcessing, setIsProcessing] = useState(false);
    const [migrationComplete, setMigrationComplete] = useState(false);
    const fileInputRef = useRef(null);

    const expectedHeaders = ['accountNumber', 'displayName', 'email', 'barangay', 'meterSerialNumber', 'role', 'serviceType'];

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.name.endsWith('.csv')) {
            setFile(selectedFile);
            setParsedData([]);
            setValidationResults({ valid: [], invalid: [] });
            setMigrationComplete(false);
            parseCSV(selectedFile);
        } else {
            showNotification("Please select a valid CSV file.", "error");
            e.target.value = null;
        }
    };

    const parseCSV = (file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                showNotification("CSV file is empty or missing data rows.", "error");
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim());
            const dataRows = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                let rowObject = {};
                headers.forEach((header, index) => {
                    rowObject[header] = values[index] !== undefined ? values[index] : '';
                });
                rowObject.rowIndex = i + 1;
                dataRows.push(rowObject);
            }
            
            setParsedData(dataRows);
            validateData(dataRows, headers);
        };
        reader.onerror = () => {
            showNotification("Error reading the file.", "error");
        };
        reader.readAsText(file);
    };

    const validateData = (data, headers) => {
        const validRows = [];
        const invalidRows = [];

        const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            showNotification(`Warning: Missing expected headers: ${missingHeaders.join(', ')}`, "warning");
        }

        data.forEach(row => {
            const errors = [];
            
            if (!row.accountNumber || row.accountNumber.trim() === '') {
                errors.push("CRITICAL: Missing Account Number");
            } else {
                const derivedClassification = determineServiceTypeAndRole(row.accountNumber);
                if (!row.role || row.role.trim() === '') {
                    row.role = derivedClassification.role;
                }
                if (!row.serviceType || row.serviceType.trim() === '') {
                    row.serviceType = derivedClassification.serviceType;
                }
            }

            if (!row.displayName || row.displayName.trim() === '') {
                errors.push("CRITICAL: Missing Display Name");
            }
            if (row.email && row.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
                errors.push("INVALID: Email format incorrect");
            }

            if (errors.length > 0) {
                invalidRows.push({ ...row, validationErrors: errors });
            } else {
                validRows.push(row);
            }
        });

        setValidationResults({ valid: validRows, invalid: invalidRows });
    };

    const executeMigration = async () => {
        if (validationResults.invalid.length > 0) {
            showNotification("Cannot migrate. Please fix all validation errors in the CSV first.", "error");
            return;
        }

        if (validationResults.valid.length === 0) {
            showNotification("No valid data rows to migrate.", "warning");
            return;
        }

        setIsProcessing(true);
        try {
            const batchSize = 400;
            const validData = [...validationResults.valid];
            
            for (let i = 0; i < validData.length; i += batchSize) {
                const batch = writeBatch(db);
                const currentBatch = validData.slice(i, i + batchSize);

                for (const userRow of currentBatch) {
                    const cleanAccountNumber = userRow.accountNumber.trim().toUpperCase();
                    const docId = `migrated_${cleanAccountNumber}`;
                    
                    const profileData = {
                        accountNumber: cleanAccountNumber,
                        displayName: userRow.displayName.trim(),
                        displayNameLower: userRow.displayName.trim().toLowerCase(),
                        email: userRow.email ? userRow.email.trim() : '',
                        meterSerialNumber: userRow.meterSerialNumber ? userRow.meterSerialNumber.trim() : '',
                        role: userRow.role.trim(),
                        serviceType: userRow.serviceType.trim(),
                        serviceAddress: { barangay: userRow.barangay ? userRow.barangay.trim() : '' },
                        discountStatus: 'none',
                        createdAt: serverTimestamp(),
                        migratedAt: serverTimestamp(),
                        isMigrated: true
                    };

                    batch.set(doc(db, profilesCollectionPath(), docId), profileData, { merge: true });
                    batch.set(doc(db, userProfileDocumentPath(docId), 'profile'), profileData, { merge: true });
                }

                await batch.commit();
            }

            setMigrationComplete(true);
            showNotification(`Successfully migrated ${validationResults.valid.length} records to AGWA Database.`, "success");
        } catch (error) {
            showNotification(`Migration failed: ${error.message}`, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg">
            <div className="flex items-center mb-6 border-b pb-4">
                <Database className="w-8 h-8 text-emerald-600 mr-3" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">AGWA Data Migration Protocol</h2>
                    <p className="text-sm text-gray-500">Securely import, classify, and validate offline legacy collections natively using Account Number analytics.</p>
                </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-6 text-center">
                <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} disabled={isProcessing} />
                <button onClick={triggerFileInput} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-8 rounded-lg flex items-center justify-center mx-auto transition-colors disabled:opacity-60 shadow-md">
                    <Upload className="mr-2" size={20} />
                    {isProcessing ? 'Processing File...' : 'Upload Legacy Database (CSV)'}
                </button>
                {file && <p className="mt-3 text-sm font-bold text-emerald-900">Selected File: {file.name}</p>}
                <p className="mt-4 text-xs font-semibold text-emerald-700 uppercase tracking-wide">Expected columns: accountNumber, displayName, email, barangay, meterSerialNumber. (Role & Service Type Auto-Extracted if omitted)</p>
            </div>

            {parsedData.length > 0 && !migrationComplete && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-50 border border-green-300 p-5 rounded-xl shadow-sm flex items-start">
                            <CheckCircle className="text-green-600 mt-1 mr-4 flex-shrink-0" size={28} />
                            <div>
                                <h4 className="font-extrabold text-green-900 uppercase tracking-wide text-sm mb-1">Passed Validation</h4>
                                <p className="text-3xl font-black text-green-700">{validationResults.valid.length} <span className="text-lg font-medium text-green-600">Rows</span></p>
                            </div>
                        </div>
                        <div className={`border p-5 rounded-xl shadow-sm flex items-start ${validationResults.invalid.length > 0 ? 'bg-red-50 border-red-400' : 'bg-gray-50 border-gray-200'}`}>
                            <AlertTriangle className={`${validationResults.invalid.length > 0 ? 'text-red-600' : 'text-gray-400'} mt-1 mr-4 flex-shrink-0`} size={28} />
                            <div>
                                <h4 className={`font-extrabold uppercase tracking-wide text-sm mb-1 ${validationResults.invalid.length > 0 ? 'text-red-900' : 'text-gray-500'}`}>Validation Errors</h4>
                                <p className={`text-3xl font-black ${validationResults.invalid.length > 0 ? 'text-red-700' : 'text-gray-400'}`}>{validationResults.invalid.length} <span className={`text-lg font-medium ${validationResults.invalid.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>Rows</span></p>
                            </div>
                        </div>
                    </div>

                    {validationResults.invalid.length > 0 && (
                        <div className="border-2 border-red-300 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-red-100 px-5 py-4 border-b border-red-300 flex items-center justify-between">
                                <h4 className="font-bold text-red-900 flex items-center">
                                    <XCircle className="w-5 h-5 mr-2" />
                                    Rows Requiring Mandatory Fixes Before Migration
                                </h4>
                                <span className="text-xs font-bold bg-red-200 text-red-800 px-3 py-1 rounded-full">Upload Blocked</span>
                            </div>
                            <div className="max-h-80 overflow-y-auto bg-white">
                                <table className="w-full text-sm text-left text-gray-600">
                                    <thead className="text-xs text-gray-800 uppercase bg-gray-100 sticky top-0 shadow-sm">
                                        <tr>
                                            <th className="px-5 py-3 font-bold">Row</th>
                                            <th className="px-5 py-3 font-bold">Account No</th>
                                            <th className="px-5 py-3 font-bold">Display Name</th>
                                            <th className="px-5 py-3 font-bold">Identified Errors</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {validationResults.invalid.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-red-50 transition-colors">
                                                <td className="px-5 py-3 font-bold text-gray-900">{row.rowIndex}</td>
                                                <td className="px-5 py-3 font-mono text-xs">{row.accountNumber || <span className="text-red-500 font-bold italic">[BLANK]</span>}</td>
                                                <td className="px-5 py-3 font-medium">{row.displayName || <span className="text-red-500 font-bold italic">[BLANK]</span>}</td>
                                                <td className="px-5 py-3">
                                                    <ul className="list-disc list-inside text-red-700 font-bold text-xs">
                                                        {row.validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                                                    </ul>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-5 border-t border-gray-200 mt-6">
                        <button 
                            onClick={executeMigration} 
                            disabled={isProcessing || validationResults.valid.length === 0 || validationResults.invalid.length > 0} 
                            className={`font-bold py-3 px-8 rounded-xl flex items-center transition-all shadow-md ${validationResults.invalid.length > 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        >
                            {isProcessing ? <Loader2 className="animate-spin mr-2" size={20} /> : <Database className="mr-2" size={20} />}
                            {isProcessing ? 'Committing to Cloud...' : validationResults.invalid.length > 0 ? 'Fix Errors to Commit' : `Commit ${validationResults.valid.length} Valid Records to AGWA`}
                        </button>
                    </div>
                </div>
            )}

            {migrationComplete && (
                <div className="bg-emerald-100 border-2 border-emerald-400 text-emerald-900 p-8 rounded-xl text-center mt-6 shadow-sm">
                    <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-5" />
                    <h3 className="text-3xl font-black mb-3">Migration Deployed Successfully</h3>
                    <p className="text-lg font-medium text-emerald-800">The legacy data has been strictly validated, dynamically classified, and perfectly committed to the AGWA cloud infrastructure.</p>
                </div>
            )}
        </div>
    );
}