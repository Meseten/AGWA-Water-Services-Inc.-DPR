import React, { useState, useRef } from 'react';
import { Upload, AlertTriangle, CheckCircle, Database, Loader2, XCircle } from 'lucide-react';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { profilesCollectionPath, userProfileDocumentPath } from '../../firebase/firestorePaths';

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
                    rowObject[header] = values[index] || '';
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
            if (!row.accountNumber) errors.push("Missing Account Number");
            if (!row.displayName) errors.push("Missing Display Name");
            if (!row.role) row.role = 'customer'; 
            if (!row.serviceType) row.serviceType = 'Residential'; 

            if (errors.length > 0) {
                invalidRows.push({ ...row, validationErrors: errors });
            } else {
                validRows.push(row);
            }
        });

        setValidationResults({ valid: validRows, invalid: invalidRows });
    };

    const executeMigration = async () => {
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

                currentBatch.forEach(userRow => {
                    const docId = `migrated_${userRow.accountNumber}`;
                    const profileData = {
                        accountNumber: userRow.accountNumber.toUpperCase(),
                        displayName: userRow.displayName,
                        displayNameLower: userRow.displayName.toLowerCase(),
                        email: userRow.email || '',
                        meterSerialNumber: userRow.meterSerialNumber || '',
                        role: userRow.role,
                        serviceType: userRow.serviceType,
                        serviceAddress: { barangay: userRow.barangay || '' },
                        discountStatus: 'none',
                        createdAt: serverTimestamp(),
                        migratedAt: serverTimestamp(),
                        isMigrated: true
                    };

                    batch.set(doc(db, profilesCollectionPath(), docId), profileData, { merge: true });
                    batch.set(doc(db, userProfileDocumentPath(docId), 'profile'), profileData, { merge: true });
                });

                await batch.commit();
            }

            setMigrationComplete(true);
            showNotification(`Successfully migrated ${validationResults.valid.length} records to AGWA Database.`, "success");
        } catch (error) {
            console.error("Migration Error:", error);
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
                    <p className="text-sm text-gray-500">Securely import and validate offline legacy collections.</p>
                </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-6 text-center">
                <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} disabled={isProcessing} />
                <button onClick={triggerFileInput} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-8 rounded-lg flex items-center justify-center mx-auto transition-colors disabled:opacity-60">
                    <Upload className="mr-2" size={20} />
                    {isProcessing ? 'Processing File...' : 'Upload Legacy Database (CSV)'}
                </button>
                {file && <p className="mt-3 text-sm font-medium text-emerald-800">Selected: {file.name}</p>}
                <p className="mt-4 text-xs text-emerald-600">Expected columns: accountNumber, displayName, email, barangay, meterSerialNumber, role, serviceType</p>
            </div>

            {parsedData.length > 0 && !migrationComplete && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-start">
                            <CheckCircle className="text-green-500 mt-1 mr-3 flex-shrink-0" size={24} />
                            <div>
                                <h4 className="font-bold text-green-800">Ready for Migration</h4>
                                <p className="text-2xl font-black text-green-600">{validationResults.valid.length} Rows</p>
                            </div>
                        </div>
                        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start">
                            <AlertTriangle className="text-red-500 mt-1 mr-3 flex-shrink-0" size={24} />
                            <div>
                                <h4 className="font-bold text-red-800">Validation Errors</h4>
                                <p className="text-2xl font-black text-red-600">{validationResults.invalid.length} Rows</p>
                            </div>
                        </div>
                    </div>

                    {validationResults.invalid.length > 0 && (
                        <div className="border border-red-200 rounded-lg overflow-hidden">
                            <div className="bg-red-100 px-4 py-3 border-b border-red-200">
                                <h4 className="font-semibold text-red-800">Rows Requiring Manual Fixes</h4>
                            </div>
                            <div className="max-h-60 overflow-y-auto bg-white">
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2">Row</th>
                                            <th className="px-4 py-2">Account No</th>
                                            <th className="px-4 py-2">Name</th>
                                            <th className="px-4 py-2">Errors</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {validationResults.invalid.map((row, idx) => (
                                            <tr key={idx} className="border-b">
                                                <td className="px-4 py-2 font-medium text-gray-900">{row.rowIndex}</td>
                                                <td className="px-4 py-2">{row.accountNumber || '-'}</td>
                                                <td className="px-4 py-2">{row.displayName || '-'}</td>
                                                <td className="px-4 py-2 text-red-600">{row.validationErrors.join(', ')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-gray-200">
                        <button onClick={executeMigration} disabled={isProcessing || validationResults.valid.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg flex items-center transition-all disabled:opacity-50">
                            {isProcessing ? <Loader2 className="animate-spin mr-2" size={20} /> : <Database className="mr-2" size={20} />}
                            {isProcessing ? 'Committing to Cloud...' : `Commit ${validationResults.valid.length} Valid Records to AGWA`}
                        </button>
                    </div>
                </div>
            )}

            {migrationComplete && (
                <div className="bg-green-100 border border-green-300 text-green-800 p-8 rounded-lg text-center mt-6 animate-fadeIn">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2">Migration Successful</h3>
                    <p>The legacy data has been securely verified and committed to the AGWA cloud infrastructure.</p>
                </div>
            )}
        </div>
    );
}