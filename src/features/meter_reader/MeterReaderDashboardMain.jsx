import React, { useState, useEffect, useCallback } from "react";
import { 
    LayoutDashboard, Map, ClipboardEdit, Search, AlertTriangle, 
    CheckCircle, ListFilter, RotateCcw, Loader2, Info, MapPin, WifiOff, Wifi 
} from "lucide-react";
import DashboardInfoCard from "../../components/ui/DashboardInfoCard.jsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import * as DataService from "../../services/dataService.js";

const MeterReaderDashboardMain = ({ userData, db, showNotification, setActiveSection }) => {
    const [dashboardStats, setDashboardStats] = useState({
        assignedRoutesCount: 0,
        totalAccountsInRoutes: 0,
        pendingReadingsInRoutes: 0,
        readingsCompletedToday: 0,
        issuesReportedByMe: 0,
    });
    const [routeHighlights, setRouteHighlights] = useState([]);
    const [myBarangays, setMyBarangays] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Track network status for the PWA
    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            showNotification("Connection restored. Syncing with AGWA Cloud...", "success");
            fetchMeterReaderStats(); // Auto-refresh when back online
        };
        const handleOffline = () => {
            setIsOffline(true);
            showNotification("You are offline. Switched to local PWA cache.", "warning");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const fetchMeterReaderStats = useCallback(async () => {
        if (!userData || !userData.uid) {
            showNotification("Meter reader data not available.", "error");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError('');
        setRouteHighlights([]);
        
        try {
            // In offline mode, Firestore automatically uses its multi-tab IndexedDB cache
            const [routesResult, issuesReportedResult, interruptionsResult] = await Promise.allSettled([
                DataService.getRoutesForReader(db, userData.uid),
                DataService.getTicketsByReporter(db, userData.uid),
                DataService.getActiveServiceInterruptions(db)
            ]);

            const newStats = {};
            let partialError = '';
            let barangaySet = new Set();

            if (routesResult.status === 'fulfilled' && routesResult.value.success) {
                const augmentedRoutes = routesResult.value.data.map(route => ({
                    ...route,
                    accountCount: route.accountCount || (route.accountNumbers?.length || 0),
                    completedCount: route.completedReadingsToday || 0,
                    pendingCount: Math.max(0, (route.accountCount || (route.accountNumbers?.length || 0)) - (route.completedReadingsToday || 0))
                }));

                newStats.assignedRoutesCount = augmentedRoutes.length;
                newStats.totalAccountsInRoutes = augmentedRoutes.reduce((sum, route) => sum + route.accountCount, 0);
                newStats.pendingReadingsInRoutes = augmentedRoutes.reduce((sum, route) => sum + route.pendingCount, 0);
                newStats.readingsCompletedToday = augmentedRoutes.reduce((sum, route) => sum + route.completedCount, 0);
                
                barangaySet = new Set(augmentedRoutes.flatMap(route => route.barangays || []));
                setMyBarangays(barangaySet);
            } else {
                partialError += isOffline ? "Cached routes unavailable. " : "Route data unavailable. ";
            }

            if (interruptionsResult.status === 'fulfilled' && interruptionsResult.value.success) {
                if (barangaySet.size > 0) {
                    const highlights = interruptionsResult.value.data.filter(item => 
                        item.affectedAreas && item.affectedAreas.some(area => barangaySet.has(area))
                    );
                    setRouteHighlights(highlights);
                }
            } else {
                partialError += isOffline ? "" : "Interruption data unavailable. "; // Don't warn heavily about interruptions if offline
            }

            if (issuesReportedResult.status === 'fulfilled' && issuesReportedResult.value.success) {
                newStats.issuesReportedByMe = issuesReportedResult.value.data.length;
            } else {
                 partialError += isOffline ? "" : "Reported issues data unavailable. ";
            }

            setDashboardStats(prev => ({ ...prev, ...newStats }));
            
            if (partialError.trim() && !isOffline) {
                setError(partialError.trim());
                showNotification("Some dashboard statistics could not be loaded.", "warning");
            }

        } catch(e) {
            if (!isOffline) {
                const fetchErr = "Could not load meter reader dashboard statistics. Please try refreshing.";
                setError(fetchErr);
                showNotification(fetchErr, "error");
            }
        } finally {
            setIsLoading(false);
        }
    }, [db, userData, showNotification, isOffline]);

    useEffect(() => {
        fetchMeterReaderStats();
    }, [fetchMeterReaderStats]);

    const quickActions = [
        { title: "View Assigned Routes", icon: Map, section: "assignedRoutes", description: "Check your daily routes and assigned accounts for reading.", color: "blue" },
        { title: "Manual Reading Entry", icon: ClipboardEdit, section: "searchAndSubmitReading", description: "Submit a reading for an account not on your immediate list.", color: "green" },
        { title: "Search Customer Info", icon: Search, section: "searchCustomerMeterReader", description: "Look up customer or meter details for verification.", color: "teal" },
        { title: "Report Field Issue", icon: AlertTriangle, section: "reportIssue", description: "Log issues like meter damage, leaks, or access problems.", color: "orange" },
    ];
    
    if (isLoading) {
        return <LoadingSpinner message={isOffline ? "Loading cached dashboard..." : "Loading your dashboard..."} className="mt-10 h-48" />;
    }
    
    return (
        <div className="space-y-8 animate-fadeIn">
            <div className={`p-6 text-white rounded-xl shadow-xl transition-colors duration-300 ${isOffline ? 'bg-gradient-to-r from-amber-600 to-orange-700' : 'bg-gradient-to-r from-sky-600 to-cyan-700'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <div className="flex items-center space-x-3">
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Meter Reader Dashboard</h2>
                            {isOffline && (
                                <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs font-black uppercase tracking-widest flex items-center shadow-sm">
                                    <WifiOff size={14} className="mr-2" /> Offline Mode
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-white text-opacity-90 font-medium">Welcome, {userData.displayName || 'Meter Reader'}! {isOffline ? 'You are working from local storage.' : 'Your tasks and tools are below.'}</p>
                    </div>
                    <button 
                        onClick={fetchMeterReaderStats} 
                        className={`mt-4 sm:mt-0 text-sm flex items-center font-bold py-2 px-4 rounded-lg transition-colors shadow-md disabled:opacity-70 self-start sm:self-center ${isOffline ? 'bg-amber-800 hover:bg-amber-900 text-amber-100' : 'bg-sky-500 hover:bg-sky-400 text-white'}`} 
                        disabled={isLoading} 
                        title="Refresh Statistics"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                         <span className="ml-2 hidden sm:inline">{isOffline ? 'Reload Cache' : 'Refresh Sync'}</span>
                    </button>
                </div>
            </div>

            {error && <p className="text-sm font-bold text-red-800 bg-red-100 border border-red-300 p-4 rounded-lg shadow-sm my-4 flex items-center justify-center gap-2"><AlertTriangle size={18}/> {error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <DashboardInfoCard title="Assigned Routes" value={dashboardStats.assignedRoutesCount} icon={Map} borderColor="border-blue-500" iconColor="text-blue-500" onClick={() => setActiveSection('assignedRoutes')} />
                <DashboardInfoCard title="Pending Readings" value={dashboardStats.pendingReadingsInRoutes} icon={ListFilter} borderColor="border-orange-500" iconColor="text-orange-500" subtext={`Across ${dashboardStats.totalAccountsInRoutes} total accounts`} onClick={() => setActiveSection('assignedRoutes')} />
                <DashboardInfoCard title="Readings Done Today" value={dashboardStats.readingsCompletedToday} icon={CheckCircle} borderColor="border-green-500" iconColor="text-green-500" />
                <DashboardInfoCard title="My Reported Issues" value={dashboardStats.issuesReportedByMe} icon={AlertTriangle} borderColor="border-red-500" iconColor="text-red-500" onClick={() => setActiveSection('myTickets')} />
            </div>

            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-5 mt-8 pt-5 border-t border-gray-200">Field Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {quickActions.map(action => (
                        <button key={action.section} onClick={() => setActiveSection(action.section)} className={`p-6 bg-white border border-gray-100 rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 ease-in-out text-left focus:outline-none focus:ring-2 focus:ring-${action.color}-500 focus:ring-opacity-75 group h-full flex flex-col`}>
                             <div className={`p-3 bg-${action.color}-100 rounded-xl inline-block mb-4 self-start group-hover:scale-110 transition-transform shadow-sm`}>
                                <action.icon size={28} className={`text-${action.color}-700`} />
                            </div>
                            <h4 className={`text-lg font-bold text-gray-900 group-hover:text-${action.color}-700 transition-colors`}>{action.title}</h4>
                            <p className="text-sm font-medium text-gray-500 mt-2 leading-relaxed flex-grow">{action.description}</p>
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <AlertTriangle size={20} className="mr-2 text-amber-500" /> Route Highlights & System Notices
                </h3>
                {routeHighlights.length > 0 ? (
                    <div className="space-y-3 mb-4">
                        {routeHighlights.map(item => (
                            <div key={item.id} className="p-4 bg-amber-50 border border-amber-200 border-l-4 border-l-amber-500 text-amber-900 rounded-r-lg shadow-sm">
                                <p className="font-bold text-sm uppercase tracking-wide mb-1">{item.title}</p>
                                <p className="text-sm font-medium flex items-center text-amber-800"><MapPin size={14} className="mr-2"/><strong>Affected Areas:</strong> <span className="ml-1">{item.affectedAreas.filter(area => myBarangays.has(area)).join(', ')}</span></p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm font-medium text-gray-500 mb-4 bg-white p-4 rounded-lg border border-gray-100">
                        {isOffline ? "Cannot fetch live notices while offline. Please rely on standard procedures." : "No specific system notices for your assigned routes today."}
                    </p>
                )}
                <p className="text-sm font-bold text-gray-400 border-t border-gray-200 pt-4 mt-4 uppercase tracking-wider text-center">
                    Ensure all readings are accurate. Stay safe and hydrated!
                </p>
            </div>
        </div>
    );
};

export default MeterReaderDashboardMain;