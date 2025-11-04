import React, { useState } from 'react';
import { Search, UserCircle, Hash, MapPin, Gauge, Info, Loader2, AlertTriangle, CheckCircle, Mail } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import * as DataService from '../../services/dataService';

const commonInputClass = "w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none transition duration-150 text-sm placeholder-gray-400";

const SearchCustomerProfileMeterReader = ({ db, showNotification }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchedUser, setSearchedUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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
            const usersResult = await DataService.searchUserProfiles(db, searchTerm);

            if (usersResult.success && usersResult.data.length > 0) {
                 setSearchedUser(usersResult.data[0]);
            } else if (usersResult.success) {
                setError(`No customer found matching "${searchTerm}".`);
            } else {
                setError(usersResult.error || "Failed to search for users.");
            }
        } catch (err) {
            setError("An error occurred during the search.");
        }
        setIsLoading(false);
    };
    
    const formatAddressToString = (addressObj) => {
        if (!addressObj || typeof addressObj !== 'object') return addressObj || 'N/A';
        const parts = [addressObj.street, addressObj.barangay, addressObj.district, "Naic, Cavite"];
        return parts.filter(p => p && p.trim()).join(', ');
    };

    const InfoRow = ({ label, value, icon: Icon }) => (
        <div className="flex items-start py-2 border-b border-gray-100">
            {Icon && <Icon size={16} className="mr-2.5 text-blue-500 flex-shrink-0 mt-0.5" />}
            <span className="text-xs font-medium text-gray-500 w-32 sm:w-40">{label}:</span>
            <span className="text-sm text-gray-800 flex-1 break-words">{value || 'N/A'}</span>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                    <Search size={30} className="mr-3 text-blue-600" /> Search Customer Profile
                </h2>
            </div>

            <form onSubmit={handleSearchUser} className="mb-8 p-4 bg-gray-50 rounded-lg shadow">
                <label htmlFor="customerSearchTerm" className="block text-sm font-medium text-gray-700 mb-1">
                    Find Customer
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow">
                        <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            id="customerSearchTerm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${commonInputClass} pl-9`}
                            placeholder="Account No, Name, or Meter No."
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg flex items-center justify-center sm:w-auto w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Search size={18} className="mr-2" />}
                        Search Customer
                    </button>
                </div>
                {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
            </form>

            {isLoading && <LoadingSpinner message="Searching for customer..." />}

            {!isLoading && searchedUser && (
                <div className="mt-6 p-5 border border-blue-200 bg-blue-50 rounded-lg shadow-md animate-fadeIn">
                    <h3 className="text-xl font-semibold text-blue-700 mb-4 border-b border-blue-200 pb-2">
                        Customer Details
                    </h3>
                    <div className="space-y-1">
                        <InfoRow label="Account Name" value={searchedUser.displayName} icon={UserCircle} />
                        <InfoRow label="Account Number" value={searchedUser.accountNumber} icon={Hash} />
                        <InfoRow label="Email Address" value={searchedUser.email} icon={Mail} />
                        <InfoRow label="Service Address" value={formatAddressToString(searchedUser.serviceAddress)} icon={MapPin} />
                        <InfoRow label="Meter Serial No." value={searchedUser.meterSerialNumber} icon={Gauge} />
                        <InfoRow label="Meter Size" value={searchedUser.meterSize} icon={Gauge} />
                        <InfoRow label="Service Type" value={searchedUser.serviceType} icon={Info} />
                        <InfoRow label="Account Status" value={searchedUser.accountStatus} icon={searchedUser.accountStatus === 'Active' ? CheckCircle : AlertTriangle } />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchCustomerProfileMeterReader;