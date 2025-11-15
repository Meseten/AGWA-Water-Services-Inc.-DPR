import React, { useState, useEffect, useCallback } from 'react';
import { Map, ListChecks, UserCircle, Hash, Edit3, Loader2, AlertTriangle, Search, Info, RotateCcw } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import MeterReadingForm from './MeterReadingForm';
import Modal from '../../components/ui/Modal';
import * as DataService from '../../services/dataService';
import { formatDate } from '../../utils/userUtils';

const commonInputClass = "w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none transition duration-150 text-sm placeholder-gray-400";

const AssignedRoutesSection = ({ db, userData: meterReaderData, showNotification }) => {
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [accountsInRoute, setAccountsInRoute] = useState([]);
    const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [fetchRoutesError, setFetchRoutesError] = useState('');
    const [fetchAccountsError, setFetchAccountsError] = useState('');
    
    const [accountToRead, setAccountToRead] = useState(null);
    const [isReadingModalOpen, setIsReadingModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');

    const fetchAssignedRoutes = useCallback(async (showLoadingIndicator = true) => {
        if (!meterReaderData || !meterReaderData.uid) {
            setFetchRoutesError("Meter reader ID not available. Cannot fetch routes.");
            setIsLoadingRoutes(false);
            return;
        }
        if(showLoadingIndicator) setIsLoadingRoutes(true);
        setFetchRoutesError('');

        const result = await DataService.getRoutesForReader(db, meterReaderData.uid);
        if (result.success) {
            const augmentedRoutes = result.data.map(route => ({
                ...route,
                accountCount: route.accountCount || (route.accountNumbers?.length || route.accountIds?.length || 0),
                completedCount: route.completedReadingsToday || 0,
                pendingCount: Math.max(0, (route.accountCount || (route.accountNumbers?.length || 0)) - (route.completedReadingsToday || 0))
            }));
            setRoutes(augmentedRoutes.sort((a,b) => (a.name || '').localeCompare(b.name || '')));
        } else {
            const errorMsg = result.error || "Failed to fetch assigned routes.";
            setFetchRoutesError(errorMsg);
            setRoutes([]);
        }
        if(showLoadingIndicator) setIsLoadingRoutes(false);
    }, [db, meterReaderData]);

    useEffect(() => {
        fetchAssignedRoutes();
    }, [fetchAssignedRoutes]);

    const fetchAccountsForSelectedRoute = useCallback(async (route) => {
        if (!route) return;
        
        setIsLoadingAccounts(true);
        setFetchAccountsError('');

        const result = await DataService.getAccountsInRoute(db, route);
        if (result.success) {
            const todayStr = new Date().toISOString().split('T')[0];
            const accountsWithStatus = await Promise.all(result.data.map(async acc => {
                let lastReadingInfo = { readingValue: '', readingDate: null };
                let completedToday = false;

                const readingsResult = await DataService.getMeterReadingsForAccount(db, acc.accountNumber);
                if (readingsResult.success && readingsResult.data.length > 0) {
                    const latestReading = readingsResult.data[0];
                    lastReadingInfo.readingValue = latestReading.readingValue;
                    lastReadingInfo.readingDate = latestReading.readingDate?.toDate ? latestReading.readingDate.toDate() : new Date(latestReading.readingDate);
                    
                    const readingDateStr = latestReading.readingDate.toDate().toISOString().split('T')[0];
                    if (readingDateStr === todayStr) {
                        completedToday = true;
                    }
                }
                
                return { 
                    ...acc, 
                    lastReading: lastReadingInfo.readingValue,
                    lastReadingDateDisplay: lastReadingInfo.readingDate ? formatDate(lastReadingInfo.readingDate, {month:'short', day:'numeric'}) : '',
                    readingStatus: completedToday ? 'Completed Today' : 'Pending'
                };
            }));
            setAccountsInRoute(accountsWithStatus.sort((a,b) => (a.serviceAddress?.street || '').localeCompare(b.serviceAddress?.street || '')));
        } else {
            const errorMsg = result.error || `Failed to fetch accounts for route ${route.name}.`;
            setFetchAccountsError(errorMsg);
            setAccountsInRoute([]);
        }
        setIsLoadingAccounts(false);
    }, [db]);

    const handleSelectRoute = (route) => {
        if (selectedRoute?.id === route?.id) return;
        setSelectedRoute(route);
        setSearchTerm('');
        setAccountsInRoute([]); 
        if (route) {
            fetchAccountsForSelectedRoute(route);
        }
    };

    const openReadingFormForAccount = (account) => {
        setAccountToRead(account); 
        setIsReadingModalOpen(true);
    };

    const handleReadingSubmitted = (readingId, submittedData) => {
        showNotification(`Reading for ${submittedData.accountNumber} submitted successfully.`, 'success');
        
        setAccountsInRoute(prevAccs => prevAccs.map(acc => 
            acc.accountNumber === submittedData.accountNumber 
                ? { ...acc, readingStatus: 'Completed Today', lastReading: submittedData.readingValue, lastReadingDateDisplay: formatDate(new Date(), {month:'short', day:'numeric'}) } 
                : acc
        ));
        
        if(selectedRoute){
            const updatedRoutes = routes.map(r => {
                if (r.id === selectedRoute.id) {
                    const newCompletedCount = (r.completedCount || 0) + 1;
                    return {
                        ...r,
                        completedCount: newCompletedCount,
                        pendingCount: Math.max(0, r.accountCount - newCompletedCount),
                    };
                }
                return r;
            });
            setRoutes(updatedRoutes);
            const newSelectedRoute = updatedRoutes.find(r => r.id === selectedRoute.id);
            if (newSelectedRoute) setSelectedRoute(newSelectedRoute);
        }

        setIsReadingModalOpen(false);
        setAccountToRead(null);
    };
    
    const formatAddressToString = (addressObj) => {
        if (!addressObj || typeof addressObj !== 'object') return '';
        const parts = [addressObj.street, addressObj.barangay, addressObj.district];
        return parts.filter(p => p && p.trim()).join(', ');
    };

    const filteredAccounts = accountsInRoute.filter(account => {
        const searchLower = searchTerm.toLowerCase();
        const addressString = formatAddressToString(account.serviceAddress).toLowerCase();
        return account.displayName?.toLowerCase().includes(searchLower) ||
               account.accountNumber?.toLowerCase().includes(searchLower) ||
               addressString.includes(searchLower) ||
               account.meterSerialNumber?.toLowerCase().includes(searchLower);
    });

    if (isLoadingRoutes) {
        return <LoadingSpinner message="Loading your assigned routes..." className="mt-10 h-64" />;
    }
    
    if (fetchRoutesError && routes.length === 0) {
         return (
            <div className="text-center py-10 bg-red-50 p-4 rounded-lg">
                <AlertTriangle size={48} className="mx-auto text-red-400 mb-3" />
                <p className="text-red-600 text-lg font-semibold">Error Loading Routes</p>
                <p className="text-sm text-red-500 mt-1">{fetchRoutesError}</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                    <Map size={30} className="mr-3 text-blue-600" /> Assigned Routes & Meter Reading
                </h2>
                 <button
                    onClick={() => fetchAssignedRoutes(false)}
                    className="mt-3 sm:mt-0 text-sm flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg border border-gray-300 transition-colors"
                    disabled={isLoadingRoutes || isLoadingAccounts}
                    title="Refresh Route List"
                >
                    <RotateCcw size={16} className={`mr-1.5 ${isLoadingRoutes ? 'animate-spin' : ''}`} />
                    Refresh Routes
                </button>
            </div>

            {routes.length === 0 && !isLoadingRoutes && !fetchRoutesError && (
                 <div className="text-center py-10 bg-gray-50 rounded-lg p-4">
                    <Info size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500 text-lg">No routes are currently assigned to you.</p>
                </div>
            )}

            {routes.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1 bg-slate-50 p-3.5 rounded-lg shadow-md max-h-[75vh] overflow-y-auto">
                        <h3 className="text-md font-semibold text-slate-700 mb-3 sticky top-0 bg-slate-50 py-2 z-10 border-b border-slate-200">My Routes ({routes.length})</h3>
                        <div className="space-y-2.5">
                            {routes.map(route => (
                                <button
                                    key={route.id}
                                    onClick={() => handleSelectRoute(route)}
                                    className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-1
                                        ${selectedRoute?.id === route.id 
                                            ? 'bg-blue-600 text-white shadow-lg border-blue-700 ring-blue-500' 
                                            : 'bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-400'
                                    }`}
                                >
                                    <p className={`font-semibold text-sm ${selectedRoute?.id === route.id ? 'text-white' : 'text-blue-700'}`}>{route.name}</p>
                                    <p className={`text-xs mt-0.5 ${selectedRoute?.id === route.id ? 'text-blue-100' : 'text-gray-500'}`}>Area: {route.areaCode || ''}</p>
                                    <div className="mt-1.5 text-xs">
                                        <span className={`px-1.5 py-0.5 rounded-full text-white text-[10px] ${ (route.pendingCount || 0) > 0 ? 'bg-orange-500' : 'bg-green-500'}`}>
                                            {(route.pendingCount || 0) === 0 && route.accountCount > 0 ? 'All Read' : `${route.pendingCount} Pending`}
                                        </span>
                                        <span className={`ml-1.5 ${selectedRoute?.id === route.id ? 'text-blue-200' : 'text-gray-400'}`}>
                                            ({route.completedCount || 0} / {route.accountCount || 0})
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-3">
                        {!selectedRoute && !isLoadingAccounts && (
                             <div className="p-6 text-center text-gray-400 bg-slate-50 rounded-lg shadow-inner h-full flex flex-col justify-center items-center min-h-[300px]">
                                <ListChecks size={48} className="mb-3 opacity-70"/>
                                <p className="text-lg">Please select a route to view accounts.</p>
                            </div>
                        )}
                        {selectedRoute && isLoadingAccounts && <LoadingSpinner message={`Loading accounts for ${selectedRoute.name}...`} className="min-h-[300px]"/>}
                        {selectedRoute && !isLoadingAccounts && (
                            <div className="bg-slate-50 p-4 rounded-lg shadow-md">
                                <div className="pb-2 mb-3 border-b border-slate-200">
                                    <h3 className="text-lg font-semibold text-slate-700">Accounts in: {selectedRoute.name}</h3>
                                    <p className="text-xs text-slate-500">{selectedRoute.description || 'No route description provided.'}</p>
                                </div>
                                
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search by Name, Account No, Address..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`${commonInputClass} pl-9`}
                                    />
                                </div>

                                {fetchAccountsError && <p className="text-sm text-red-500 text-center py-3 bg-red-50 rounded-md">{fetchAccountsError}</p>}
                                
                                <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1 pb-2">
                                    {filteredAccounts.length > 0 ? filteredAccounts.map(account => (
                                        <div key={account.id || account.accountNumber} className={`p-3.5 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center transition-shadow hover:shadow-md 
                                            ${account.readingStatus === 'Completed Today' ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:border-blue-400'}`}>
                                            <div className="flex-grow mb-2 sm:mb-0">
                                                <p className="font-medium text-slate-800 text-sm">{account.displayName} <span className="text-xs text-slate-500 font-mono">({account.accountNumber})</span></p>
                                                <p className="text-xs text-slate-600 mt-0.5">{formatAddressToString(account.serviceAddress)}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Meter: {account.meterSerialNumber} | Last Reading: {account.lastReading || ''} {account.lastReadingDateDisplay ? `on ${account.lastReadingDateDisplay}` : ''}</p>
                                                <p className={`text-xs font-semibold mt-1 ${account.readingStatus === 'Completed Today' ? 'text-green-600' : 'text-orange-600'}`}>
                                                    Status: {account.readingStatus}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => openReadingFormForAccount(account)}
                                                className={`text-xs font-medium py-1.5 px-3.5 rounded-md flex items-center transition-colors active:scale-95 whitespace-nowrap
                                                    ${account.readingStatus === 'Completed Today' 
                                                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                                                        : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                                title={account.readingStatus === 'Completed Today' ? 'Review or Edit Reading' : 'Submit New Reading'}
                                            >
                                                <Edit3 size={13} className="mr-1.5" /> {account.readingStatus === 'Completed Today' ? 'Edit' : 'Enter Reading'}
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="py-6 text-center text-gray-500">
                                            <UserCircle size={36} className="mx-auto mb-2 text-gray-400"/>
                                            No accounts {searchTerm ? 'match your search.' : 'found for this route.'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {isReadingModalOpen && accountToRead && (
                <Modal
                    isOpen={isReadingModalOpen}
                    onClose={() => { setIsReadingModalOpen(false); setAccountToRead(null); }}
                    title={`Meter Reading: ${accountToRead.displayName} (${accountToRead.accountNumber})`}
                    size="lg"
                >
                    <MeterReadingForm
                        db={db}
                        userData={meterReaderData}
                        showNotification={showNotification}
                        customerToRead={accountToRead} 
                        onReadingSubmitted={handleReadingSubmitted}
                        isModalMode={true}
                        onCloseModal={() => { setIsReadingModalOpen(false); setAccountToRead(null); }}
                    />
                </Modal>
            )}
        </div>
    );
};

export default AssignedRoutesSection;