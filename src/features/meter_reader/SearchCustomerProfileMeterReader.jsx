import React, { useState, useEffect } from 'react';
import { Search, UserCircle, Hash, MapPin, Gauge, Info, Loader2, AlertTriangle, CheckCircle, Mail, WifiOff, Wifi } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import * as DataService from '../../services/dataService';
import { searchOfflineProfiles } from '../../services/idbService';

const commonInputClass = "w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none transition duration-150 text-sm placeholder-gray-400";

const SearchCustomerProfileMeterReader = ({ db, showNotification }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchedUser, setSearchedUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleSearchUser = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) {
            showNotification("Please enter a search term (Account No., Name, or Meter No.).", "warning");
            return;
        }
        setIsLoading(true);
        setError('');
        setSearchedUser(null);

        try {
            let foundData = null;

            if (isOffline) {
                const offlineResults = await searchOfflineProfiles(searchTerm);
                if (offlineResults && offlineResults.length > 0) {
                    foundData = offlineResults[0];
                }
            } else {
                try {
                    const usersResult = await DataService.searchUserProfiles(db, searchTerm);
                    if (usersResult.success && usersResult.data.length > 0) {
                        foundData = usersResult.data[0];
                    }
                } catch (onlineErr) {
                    const offlineResults = await searchOfflineProfiles(searchTerm);
                    if (offlineResults && offlineResults.length > 0) {
                        foundData = offlineResults[0];
                    }
                }
            }

            if (foundData) {
                setSearchedUser(foundData);
            } else {
                setError(`No customer found matching "${searchTerm}" in ${isOffline ? 'offline local database' : 'AGWA cloud records'}.`);
            }
        } catch (err) {
            setError("An error occurred during the search. Please check your system.");
        }
        setIsLoading(false);
    };
    
    const formatAddressToString = (addressObj) => {
        if (!addressObj || typeof addressObj !== 'object') return addressObj || '';
        const parts = [addressObj.street, addressObj.barangay, addressObj.district, "Maragondon, Cavite"];
        return parts.filter(p => p && p.trim()).join(', ');
    };

    const InfoRow = ({ label, value, icon: Icon }) => (
        <div className="flex items-start py-2 border-b border-gray-100">
            {Icon && <Icon size={16} className="mr-2.5 text-blue-500 flex-shrink-0 mt-0.5" />}
            <span className="text-xs font-medium text-gray-500 w-32 sm:w-40">{label}:</span>
            <span className="text-sm font-bold text-gray-800 flex-1 break-words">{value || <span className="italic text-gray-400 font-normal">N/A</span>}</span>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center tracking-tight">
                    <Search size={30} className="mr-3 text-blue-600" /> Account Lookup
                </h2>
                <div className={`mt-3 sm:mt-0 flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm border ${isOffline ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
                    {isOffline ? (
                        <><WifiOff size={14} className="mr-2" /> PWA Offline Search Active</>
                    ) : (
                        <><Wifi size={14} className="mr-2" /> Cloud Search Active</>
                    )}
                </div>
            </div>

            <form onSubmit={handleSearchUser} className="mb-8 p-5 bg-gray-50 rounded-xl shadow-sm border border-gray-200">
                <label htmlFor="customerSearchTerm" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Search Parameter
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow">
                        <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            id="customerSearchTerm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${commonInputClass} pl-10 font-mono text-base`}
                            placeholder="Scan or Enter: Account No, Name, Meter S/N"
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg flex items-center justify-center sm:w-auto w-full transition-colors shadow-md disabled:opacity-50 uppercase tracking-wide text-sm"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Search size={18} className="mr-2" />}
                        {isLoading ? 'Querying...' : 'Find Account'}
                    </button>
                </div>
                {error && (
                    <div className="mt-3 flex items-center text-red-600 text-xs font-bold bg-red-50 p-2 rounded border border-red-200">
                        <AlertTriangle size={14} className="mr-2" /> {error}
                    </div>
                )}
            </form>

            {isLoading && <LoadingSpinner message={isOffline ? "Searching offline database..." : "Searching AGWA cloud servers..."} />}

            {!isLoading && searchedUser && (
                <div className="mt-6 border border-blue-300 bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-md overflow-hidden animate-fadeIn">
                    <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center">
                            <CheckCircle size={20} className="mr-2 text-blue-200" /> Target Acquired
                        </h3>
                        <span className="px-3 py-1 bg-white text-blue-800 text-xs font-black rounded shadow-sm">
                            {searchedUser.accountNumber || 'NO-ACCOUNT-ID'}
                        </span>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            <InfoRow label="Account Name" value={searchedUser.displayName} icon={UserCircle} />
                            <InfoRow label="Account Number" value={searchedUser.accountNumber} icon={Hash} />
                            <InfoRow label="Email Address" value={searchedUser.email} icon={Mail} />
                            <InfoRow label="Service Type" value={searchedUser.serviceType} icon={Info} />
                            <div className="col-span-1 md:col-span-2 mt-2 pt-2 border-t border-gray-100">
                                <InfoRow label="Service Address" value={formatAddressToString(searchedUser.serviceAddress)} icon={MapPin} />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <InfoRow label="Meter Serial No." value={searchedUser.meterSerialNumber} icon={Gauge} />
                            </div>
                            <InfoRow label="Meter Size" value={searchedUser.meterSize} icon={Gauge} />
                            <InfoRow label="Account Status" value={
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${searchedUser.accountStatus === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {searchedUser.accountStatus || 'Active'}
                                </span>
                            } icon={searchedUser.accountStatus === 'Active' ? CheckCircle : AlertTriangle } />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchCustomerProfileMeterReader;