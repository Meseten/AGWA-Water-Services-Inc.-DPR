import React, { useState } from 'react';
import { 
    FileSearch, UserCircle, Hash, FileText, CalendarDays, DollarSign, 
    Info, Loader2, AlertTriangle, Search,
    Mail, MapPin, CheckCircle
} from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import * as DataService from '../../services/dataService.js';
import { formatDate } from '../../utils/userUtils.js';
import InvoiceView from '../../components/ui/InvoiceView.jsx';

const SearchAccountOrBillSection = ({ db, showNotification, billingService: calculateBillDetails }) => {
    const [searchType, setSearchType] = useState('account');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [searchedData, setSearchedData] = useState(null);
    const [userBills, setUserBills] = useState([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [viewingInvoice, setViewingInvoice] = useState(null);
    const [invoiceUserData, setInvoiceUserData] = useState(null);

    const commonInputClass = "w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none transition-150 text-sm placeholder-gray-400";

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) {
            showNotification("Please enter a search term.", "warning");
            return;
        }
        setIsLoading(true);
        setError('');
        setSearchedData(null);
        setUserBills([]);
        setViewingInvoice(null);
        setInvoiceUserData(null);

        try {
            if (searchType === 'account') {
                const usersResult = await DataService.searchUserProfiles(db, searchTerm.trim());
                if (usersResult.success && usersResult.data.length > 0) {
                    const foundUser = usersResult.data[0];
                    setSearchedData(foundUser);
                    const billsResult = await DataService.getBillsForUser(db, foundUser.id);
                    if (billsResult.success) {
                        setUserBills(billsResult.data.sort((a, b) => (b.billDate?.toDate() || 0) - (a.billDate?.toDate() || 0)));
                    } else {
                        showNotification("Could not fetch bills for the user.", "warning");
                    }
                } else if (usersResult.success) {
                    setError(`No account found matching "${searchTerm}".`);
                } else {
                    setError(usersResult.error || "Failed to search accounts.");
                }
            } else { 
                const billsResult = await DataService.getDocuments(db, DataService.allBillsCollectionPath(), [where("id", "==", searchTerm.trim())]);
                if (billsResult.success && billsResult.data.length > 0) {
                    const foundBill = billsResult.data[0];
                    setSearchedData(foundBill);
                    if (foundBill.userId) {
                        const userProfileResult = await DataService.getUserProfile(db, foundBill.userId);
                        if (userProfileResult.success) {
                            setInvoiceUserData(userProfileResult.data);
                        }
                    }
                } else if (billsResult.success) {
                     setError(`No bill found matching invoice/bill ID "${searchTerm}".`);
                } else {
                     setError(billsResult.error || "Failed to search bills.");
                }
            }
        } catch (err) {
            setError("An error occurred during the search.");
        }
        setIsLoading(false);
    };
    
    const handleViewInvoice = (bill, userForInvoice) => {
        setViewingInvoice(bill);
        setInvoiceUserData(userForInvoice || (searchedData && searchType === 'account' ? searchedData : null));
    };

    const formatAddressToString = (addressObj) => {
        if (!addressObj || typeof addressObj !== 'object') return addressObj || 'N/A';
        const parts = [addressObj.street, addressObj.barangay, addressObj.district, "Naic, Cavite"];
        return parts.filter(p => p && p.trim()).join(', ');
    };

    const InfoRow = ({ label, value, icon: Icon, valueClass = "text-gray-800" }) => (
        <div className="flex items-start py-1.5">
            {Icon && <Icon size={16} className="mr-2.5 text-blue-500 flex-shrink-0 mt-0.5" />}
            <span className="text-xs font-medium text-gray-500 w-32 sm:w-40">{label}:</span>
            <span className={`text-sm ${valueClass} flex-1 break-words`}>{value || 'N/A'}</span>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                    <FileSearch size={30} className="mr-3 text-indigo-600" /> Search Account / Bill
                </h2>
            </div>

            <form onSubmit={handleSearch} className="mb-6 p-4 bg-gray-50 rounded-lg shadow">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-grow">
                        <label htmlFor="searchType" className="block text-sm font-medium text-gray-700 mb-1">Search For</label>
                        <select 
                            id="searchType" 
                            value={searchType} 
                            onChange={(e) => { setSearchType(e.target.value); setSearchTerm(''); setSearchedData(null); setUserBills([]); setError('');}} 
                            className={commonInputClass}
                        >
                            <option value="account">Customer Account</option>
                            <option value="bill">Specific Bill (Invoice #)</option>
                        </select>
                    </div>
                    <div className="flex-grow-[2]">
                        <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">
                            {searchType === 'account' ? 'Account No, Name, or Email' : 'Invoice Number or Bill ID'}
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                id="searchTerm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`${commonInputClass} pl-9`}
                                placeholder={`Enter ${searchType === 'account' ? 'details...' : 'invoice #...'}`}
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-lg flex items-center justify-center sm:w-auto w-full transition-colors"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Search size={18} className="mr-2" />}
                        Search
                    </button>
                </div>
                {error && !isLoading && <p className="text-red-500 text-xs mt-2">{error}</p>}
            </form>

            {isLoading && <LoadingSpinner message="Searching..." />}

            {!isLoading && searchedData && (
                <div className="mt-6 p-5 border border-indigo-200 bg-indigo-50 rounded-lg shadow-md animate-fadeIn">
                    {searchType === 'account' && (
                        <>
                            <h3 className="text-xl font-semibold text-indigo-700 mb-3 border-b border-indigo-200 pb-2">
                                Account Details
                            </h3>
                            <div className="space-y-1 mb-4">
                                <InfoRow label="Name" value={searchedData.displayName} icon={UserCircle} />
                                <InfoRow label="Account No" value={searchedData.accountNumber} icon={Hash} valueClass="font-mono"/>
                                <InfoRow label="Email" value={searchedData.email} icon={Mail} />
                                <InfoRow label="Status" value={searchedData.accountStatus} icon={Info} valueClass={`font-semibold ${searchedData.accountStatus === 'Active' ? 'text-green-600' : 'text-red-600'}`} />
                                <InfoRow label="Service Address" value={formatAddressToString(searchedData.serviceAddress)} icon={MapPin} />
                            </div>
                            <h4 className="text-md font-semibold text-indigo-600 mt-4 mb-2">Recent Bills ({userBills.length})</h4>
                            {userBills.length > 0 ? (
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                    {userBills.map(bill => (
                                        <div key={bill.id} className={`p-2.5 border rounded-md flex justify-between items-center text-xs ${bill.status === 'Paid' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                            <div>
                                                <p><strong>Period:</strong> {bill.monthYear || bill.billingPeriod}</p>
                                                <p><strong>Amount:</strong> ₱{bill.amount?.toFixed(2)}</p>
                                                <p><strong>Due:</strong> {formatDate(bill.dueDate, {month: 'short', day: 'numeric', year: 'numeric'})}</p>
                                                <p><strong>Status:</strong> <span className={`font-semibold ${bill.status === 'Paid' ? 'text-green-700' : 'text-red-700'}`}>{bill.status}</span></p>
                                            </div>
                                            <button onClick={() => handleViewInvoice(bill, searchedData)} className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 p-1.5 rounded-md text-xs"><FileText size={16} className="inline mr-1"/>View Invoice</button>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-sm text-gray-500">No bills found for this account.</p>}
                        </>
                    )}
                    {searchType === 'bill' && (
                         <>
                            <h3 className="text-xl font-semibold text-indigo-700 mb-3 border-b border-indigo-200 pb-2">
                                Bill Details (Invoice: {searchedData.invoiceNumber || searchedData.id})
                            </h3>
                             <div className="space-y-1">
                                <InfoRow label="Account No" value={searchedData.accountNumber} icon={Hash} valueClass="font-mono"/>
                                {invoiceUserData && <InfoRow label="Customer Name" value={invoiceUserData.displayName} icon={UserCircle} />}
                                <InfoRow label="Bill Period" value={searchedData.monthYear || searchedData.billingPeriod} icon={CalendarDays}/>
                                <InfoRow label="Amount Due" value={`₱${searchedData.amount?.toFixed(2)}`} icon={DollarSign} valueClass="font-bold"/>
                                <InfoRow label="Due Date" value={formatDate(searchedData.dueDate, {month: 'long', day: 'numeric', year: 'numeric'})} icon={CalendarDays}/>
                                <InfoRow label="Status" value={searchedData.status} icon={Info} valueClass={`font-semibold ${searchedData.status === 'Paid' ? 'text-green-600' : 'text-red-600'}`}/>
                                {searchedData.status === 'Paid' && <InfoRow label="Paid Date" value={formatDate(searchedData.paymentDate)} icon={CheckCircle} />}
                            </div>
                            <button onClick={() => handleViewInvoice(searchedData, invoiceUserData)} className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg flex items-center text-sm">
                                <FileText size={16} className="mr-2"/> View Full Invoice
                            </button>
                        </>
                    )}
                </div>
            )}
            
            {!isLoading && !searchedData && searchTerm && !error && (
                <div className="mt-6 p-5 text-center text-gray-500 bg-gray-50 rounded-lg">
                    <Info size={32} className="mx-auto mb-2 text-gray-400"/>
                    No results found for "{searchTerm}". Please refine your search.
                </div>
            )}

            {viewingInvoice && invoiceUserData && (
                <InvoiceView
                    isOpen={!!viewingInvoice}
                    onClose={() => { setViewingInvoice(null); }} 
                    bill={viewingInvoice}
                    userData={invoiceUserData} 
                    calculateBillDetails={calculateBillDetails} 
                />
            )}
        </div>
    );
};

export default SearchAccountOrBillSection;