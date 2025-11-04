import React, { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, Users, MessageSquare, Settings, BarChart3, Megaphone, Gauge, AlertTriangle, ShieldCheck, RotateCcw, Loader2, Info } from "lucide-react";
import DashboardInfoCard from "../../components/ui/DashboardInfoCard.jsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import * as DataService from "../../services/dataService.js";

const AdminDashboardMain = ({ user, userData, db, showNotification, setActiveSection }) => {
    const [dashboardStats, setDashboardStats] = useState({
        totalUsers: 0,
        openTickets: 0,
        activeAnnouncements: 0,
        systemStatus: 'Operational',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAdminStats = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const results = await Promise.allSettled([
                DataService.getUsersStats(db),
                DataService.getTicketsStats(db),
                DataService.getAnnouncementsStats(db)
            ]);
            const [usersResult, ticketsResult, announcementsResult] = results;
            const newStats = { systemStatus: 'Operational' };
            let partialErrorAccumulator = '';

            if (usersResult.status === 'fulfilled' && usersResult.value.success) {
                newStats.totalUsers = usersResult.value.data.total;
            } else {
                partialErrorAccumulator += "Users data unavailable. ";
            }
            if (ticketsResult.status === 'fulfilled' && ticketsResult.value.success) {
                newStats.openTickets = ticketsResult.value.data.openCount || 0;
            } else {
                partialErrorAccumulator += "Tickets data unavailable. ";
            }
            if (announcementsResult.status === 'fulfilled' && announcementsResult.value.success) {
                newStats.activeAnnouncements = announcementsResult.value.data.active;
            } else {
                partialErrorAccumulator += "Announcements data unavailable. ";
            }
            setDashboardStats(prev => ({...prev, ...newStats}));
            if (partialErrorAccumulator.trim()) {
                setError(partialErrorAccumulator.trim());
                showNotification(`Partial data load: ${partialErrorAccumulator}`, "warning");
            }
        } catch (err) {
            const fetchErr = "A critical error occurred while fetching dashboard statistics.";
            setError(fetchErr);
            showNotification(fetchErr, "error");
            setDashboardStats(prev => ({...prev, systemStatus: 'Error' }));
        } finally {
            setIsLoading(false);
        }
    }, [db, showNotification]);

    useEffect(() => {
        fetchAdminStats();
    }, [fetchAdminStats]);

    const adminActions = [
        { title: "User Management", icon: Users, section: "userManagement", description: "View, edit, and manage all user accounts.", color: "blue" },
        { title: "Support Tickets", icon: MessageSquare, section: "supportTickets", description: "Address and manage user-submitted issues.", color: "purple" },
        { title: "Announcements", icon: Megaphone, section: "manageAnnouncements", description: "Create and publish portal-wide announcements.", color: "teal" },
        { title: "System Analytics", icon: BarChart3, section: "systemAnalytics", description: "View key metrics and system performance data.", color: "orange" },
        { title: "Meter Readings Mgt.", icon: Gauge, section: "editMeterReadingsAdmin", description: "Oversee and manage meter reading entries.", color: "sky" },
        { title: "System Settings", icon: Settings, section: "systemSettings", description: "Configure application parameters and settings.", color: "gray" },
    ];
    
    if (isLoading) {
        return <LoadingSpinner message="Loading admin dashboard statistics..." className="mt-10 h-48" />;
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="p-6 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-xl shadow-2xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold">Administrator Dashboard</h2>
                        <p className="mt-1 text-slate-300">Welcome, {userData?.displayName || 'Admin'}. Oversee portal operations.</p>
                    </div>
                    <button onClick={fetchAdminStats} className="text-sm flex items-center bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-70" disabled={isLoading} title="Refresh Statistics">
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                        <span className="ml-2 hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {error && <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md text-center flex items-center justify-center gap-2"><Info size={16}/> {error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                <DashboardInfoCard title="Total Users" value={dashboardStats.totalUsers ?? 'N/A'} icon={Users} borderColor="border-blue-500" iconColor="text-blue-500" onClick={() => setActiveSection('userManagement')} />
                <DashboardInfoCard title="Open Support Tickets" value={dashboardStats.openTickets} icon={AlertTriangle} borderColor="border-red-500" iconColor="text-red-500" onClick={() => setActiveSection('supportTickets')} />
                <DashboardInfoCard title="Active Announcements" value={dashboardStats.activeAnnouncements ?? 'N/A'} icon={Megaphone} borderColor="border-teal-500" iconColor="text-teal-500" onClick={() => setActiveSection('viewAnnouncements')}/>
                <DashboardInfoCard title="System Status" value={dashboardStats.systemStatus} icon={ShieldCheck} borderColor={dashboardStats.systemStatus === 'Error' ? "border-red-500" : "border-green-500"} iconColor={dashboardStats.systemStatus === 'Error' ? "text-red-500" : "text-green-500"} />
            </div>

            <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-5 mt-8 pt-5 border-t border-gray-200">Administrative Tools</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {adminActions.map(action => (
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
        </div>
    );
};

export default AdminDashboardMain;