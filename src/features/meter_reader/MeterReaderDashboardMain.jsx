import React, { useState, useEffect, useCallback } from "react";
import { 
    LayoutDashboard, Map, ClipboardEdit, Search, AlertTriangle, 
    CheckCircle, ListFilter, RotateCcw, Loader2, Info, MapPin 
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
                partialError += "Route data unavailable. ";
            }

            if (interruptionsResult.status === 'fulfilled' && interruptionsResult.value.success) {
                if (barangaySet.size > 0) {
                    const highlights = interruptionsResult.value.data.filter(item => 
                        item.affectedAreas && item.affectedAreas.some(area => barangaySet.has(area))
                    );
                    setRouteHighlights(highlights);
                }
            } else {
                partialError += "Interruption data unavailable. ";
            }

            if (issuesReportedResult.status === 'fulfilled' && issuesReportedResult.value.success) {
                newStats.issuesReportedByMe = issuesReportedResult.value.data.length;
            } else {
                 partialError += "Reported issues data unavailable. ";
            }

            setDashboardStats(prev => ({ ...prev, ...newStats }));
            if (partialError.trim()) {
                setError(partialError.trim());
                showNotification("Some dashboard statistics could not be loaded.", "warning");
            }

        } catch(e) {
            const fetchErr = "Could not load meter reader dashboard statistics. Please try refreshing.";
            setError(fetchErr);
            showNotification(fetchErr, "error");
        } finally {
            setIsLoading(false);
        }
    }, [db, userData, showNotification]);

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
        return <LoadingSpinner message="Loading your dashboard..." className="mt-10 h-48" />;
    }
    
    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="p-6 bg-gradient-to-r from-sky-600 to-cyan-700 text-white rounded-xl shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold">Meter Reader Dashboard</h2>
                        <p className="mt-1 text-sky-100">Welcome, {userData.displayName || 'Meter Reader'}! Your tasks and tools are below.</p>
                    </div>
                    <button onClick={fetchMeterReaderStats} className="mt-3 sm:mt-0 text-sm flex items-center bg-sky-500 hover:bg-sky-400 text-white font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-70 self-start sm:self-center" disabled={isLoading} title="Refresh Statistics">
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                         <span className="ml-2 hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {error && <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md text-center my-4 flex items-center justify-center gap-2"><Info size={16}/> {error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <DashboardInfoCard title="Assigned Routes" value={dashboardStats.assignedRoutesCount} icon={Map} borderColor="border-blue-500" iconColor="text-blue-500" onClick={() => setActiveSection('assignedRoutes')} />
                <DashboardInfoCard title="Pending Readings" value={dashboardStats.pendingReadingsInRoutes} icon={ListFilter} borderColor="border-orange-500" iconColor="text-orange-500" subtext={`Across ${dashboardStats.totalAccountsInRoutes} total accounts`} onClick={() => setActiveSection('assignedRoutes')} />
                <DashboardInfoCard title="Readings Done Today" value={dashboardStats.readingsCompletedToday} icon={CheckCircle} borderColor="border-green-500" iconColor="text-green-500" />
                <DashboardInfoCard title="My Reported Issues" value={dashboardStats.issuesReportedByMe} icon={AlertTriangle} borderColor="border-red-500" iconColor="text-red-500" onClick={() => setActiveSection('myTickets')} />
            </div>

            <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-5 mt-8 pt-5 border-t border-gray-200">Your Tools & Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {quickActions.map(action => (
                        <button key={action.section} onClick={() => setActiveSection(action.section)} className={`p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1.5 transition-all duration-300 ease-in-out text-left focus:outline-none focus:ring-2 focus:ring-${action.color}-500 focus:ring-opacity-75 group h-full flex flex-col`}>
                             <div className={`p-3 bg-${action.color}-100 rounded-full inline-block mb-3 self-start group-hover:scale-110 transition-transform`}>
                                <action.icon size={28} className={`text-${action.color}-600`} />
                            </div>
                            <h4 className={`text-lg font-semibold text-gray-800 group-hover:text-${action.color}-700 transition-colors`}>{action.title}</h4>
                            <p className="text-sm text-gray-500 mt-1 leading-normal flex-grow">{action.description}</p>
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="mt-8 p-5 bg-gray-50 rounded-xl shadow">
                <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                    <AlertTriangle size={20} className="mr-2 text-yellow-500" /> Important Notices / Route Highlights
                </h3>
                {routeHighlights.length > 0 ? (
                    <div className="space-y-3 mb-4">
                        {routeHighlights.map(item => (
                            <div key={item.id} className="p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-r-lg">
                                <p className="font-semibold text-sm">{item.title}</p>
                                <p className="text-xs mt-1 flex items-center"><MapPin size={12} className="mr-1.5"/><strong>Affected Areas on your route:</strong> {item.affectedAreas.filter(area => myBarangays.has(area)).join(', ')}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 mb-4">
                        No specific system notices for your routes today.
                    </p>
                )}
                <p className="text-sm text-gray-500 border-t border-gray-200 pt-3 mt-3">
                    Please ensure all readings are accurate and submitted on time. Report any discrepancies or issues immediately. Stay safe and hydrated!
                </p>
            </div>
        </div>
    );
};

export default MeterReaderDashboardMain;