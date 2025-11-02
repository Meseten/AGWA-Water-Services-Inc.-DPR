import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar.jsx';
import CustomerDashboardMain from '../../features/customer/CustomerDashboardMain.jsx';
import CustomerBillsSection from '../../features/customer/CustomerBillsSection.jsx';
import WaterAnalyticsSection from '../../features/customer/WaterAnalyticsSection.jsx';
import RebateProgramSection from '../../features/customer/RebateProgramSection.jsx';
import MyProfileSection from '../../features/common/MyProfileSection.jsx';
import ReportIssueSection from '../../features/common/ReportIssuesSection.jsx';
import FaqsSection from '../../features/common/FaqsSection.jsx';
import AboutUsSection from '../../features/common/AboutUsSection.jsx';
import ContactUsSection from '../../features/common/ContactUs.jsx';
import TermsOfServiceSection from '../../features/common/TermsOfServiceSection.jsx';
import DataPrivacySection from '../../features/common/DataPrivacySection.jsx';
import AdminDashboardMain from '../../features/admin/AdminDashboardMain.jsx';
import UserManagementSection from '../../features/admin/UserManagementSection.jsx';
import SupportTicketManagementSection from '../../features/admin/SupportTicketManagementSection.jsx';
import SystemSettingsSection from '../../features/admin/SystemSettingsSection.jsx';
import AnnouncementManager from '../../features/admin/AnnouncementManager.jsx';
import InterruptionManager from '../../features/admin/InterruptionManager.jsx';
import StatisticsDashboard from '../../features/admin/StatisticsDashboard.jsx';
import MeterReadingEditor from '../../features/admin/MeterReadingEditor.jsx';
import RouteManagementSection from '../../features/admin/RouteManagementSection.jsx';
import BatchBillingSection from '../../features/admin/BatchBillingSection.jsx';
import MeterReaderDashboardMain from '../../features/meter_reader/MeterReaderDashboardMain.jsx';
import AssignedRoutesSection from '../../features/meter_reader/AssignedRoutesSection.jsx';
import MeterReadingForm from '../../features/meter_reader/MeterReadingForm.jsx';
import SearchCustomerProfileMeterReader from '../../features/meter_reader/SearchCustomerProfileMeterReader.jsx';
import ClerkDashboardMain from '../../features/clerk_cashier/ClerkDashboardMain.jsx';
import WalkInPaymentSection from '../../features/clerk_cashier/WalkInPaymentSection.jsx';
import SearchAccountOrBillSection from '../../features/clerk_cashier/SearchAccountOrBillSection.jsx';
import MyTicketsSection from '../../features/customer/MyTicketsSection.jsx';
import ServiceInterruptionsSection from '../../features/common/ServiceInterruptionsSection.jsx';
import ServiceInterruptionMap from '../../features/common/ServiceInterruptionMap.jsx';
import NotFound from '../core/NotFound.jsx';
import ChatbotModal from '../ui/ChatbotModal.jsx';
import LinkAccountModal from '../auth/LinkAccountModal.jsx';
import { MessageSquare as ChatIcon, Menu, TrendingUp, Gift, AlertTriangle as AlertIcon, ShieldCheck, Eye, Map, Settings, Users, BarChart3, Edit, Gauge, FileText, ClipboardEdit, Search, Banknote, FileSearch, Home, UserCog, HelpCircle, Info, PhoneCall, Megaphone } from 'lucide-react';
import * as billingService from '../../services/billingService.js';
import * as dataService from '../../services/dataService.js';
import * as userUtils from '../../utils/userUtils.js';
import { onSnapshot, doc } from 'firebase/firestore';
import { systemSettingsDocumentPath } from '../../firebase/firestorePaths.js';

const DashboardLayout = ({ user, userData, setUserData, handleLogout, showNotification, auth, db }) => {
    const [activeSection, setActiveSection] = useState('mainDashboard');
    const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [linkError, setLinkError] = useState('');
    const [banner, setBanner] = useState(null);
    const [localSystemSettings, setLocalSystemSettings] = useState({});

    useEffect(() => {
        if (userData && !userData.accountNumber && userData.role === 'customer') {
            setIsLinkModalOpen(true);
        } else {
            setIsLinkModalOpen(false);
        }
    }, [userData]);

    useEffect(() => {
        if (!db) return;
        const settingsRef = doc(db, systemSettingsDocumentPath());
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const settingsData = docSnap.data();
                setLocalSystemSettings(settingsData);
                if (settingsData.isBannerEnabled && settingsData.portalAnnouncement) {
                    setBanner({ text: settingsData.portalAnnouncement });
                } else {
                    setBanner(null);
                }
            } else {
                setBanner(null);
                setLocalSystemSettings({});
            }
        }, (error) => {
            console.error("Error fetching system settings:", error);
            setBanner(null);
            setLocalSystemSettings({});
        });
        return () => unsubscribe();
    }, [db]);

    const handleNavigate = useCallback((section) => {
        setActiveSection(section);
        if (isSidebarOpenMobile) setIsSidebarOpenMobile(false);
    }, [isSidebarOpenMobile]);

    const handleLinkAccount = async (accountNumber) => {
        setIsLinking(true);
        setLinkError('');
        const result = await dataService.linkAccountNumberToProfile(db, user.uid, accountNumber);
        if (result.success) {
            const userProfileResult = await dataService.getUserProfile(db, user.uid);
             if (userProfileResult.success) {
                 setUserData(userProfileResult.data);
                 setIsLinkModalOpen(false);
                 showNotification("Account linked successfully!", "success");
             } else {
                  setLinkError("Account linked, but failed to refresh profile. Please reload.");
                  showNotification("Account linked, but failed to refresh profile.", "warning");
             }
        } else {
            setLinkError(result.error || "Failed linking account. Check number or contact support.");
        }
        setIsLinking(false);
    };

    const navItems = {
        customer: [
            { name: 'Dashboard', iconName: 'Home', section: 'mainDashboard', group: 'Main' },
            { name: 'My Profile', iconName: 'UserCog', section: 'myProfile', group: 'Account' },
            { name: 'My Bills & Payments', iconName: 'FileText', section: 'myBills', group: 'Account' },
            { name: 'Consumption Analytics', iconName: 'TrendingUp', section: 'waterAnalytics', group: 'Account' },
            { name: 'Rewards Program', iconName: 'Gift', section: 'rebateProgram', group: 'Account' },
            { name: 'My Support Tickets', iconName: 'MessageSquare', section: 'myTickets', group: 'Support' },
            { name: 'Report an Issue', iconName: 'AlertTriangle', section: 'reportIssue', group: 'Support' },
            { name: 'View Announcements', iconName: 'Megaphone', section: 'viewAnnouncements', group: 'Information' },
            { name: 'Service Advisories', iconName: 'AlertIcon', section: 'serviceAdvisories', group: 'Information' },
            { name: 'Interruption Map', iconName: 'Map', section: 'interruptionMap', group: 'Information' },
            { name: 'FAQs', iconName: 'HelpCircle', section: 'faqs', group: 'Help & Info' },
            { name: 'About Us', iconName: 'Info', section: 'aboutUs', group: 'Help & Info' },
            { name: 'Contact Us', iconName: 'PhoneCall', section: 'contactUs', group: 'Help & Info' },
        ],
        admin: [
            { name: 'Dashboard', iconName: 'Home', section: 'mainDashboard', group: 'Main' },
            { name: 'System Analytics', iconName: 'BarChart3', section: 'systemAnalytics', group: 'Main' },
            { name: 'User Management', iconName: 'Users', section: 'userManagement', group: 'Administration' },
            { name: 'Support Tickets', iconName: 'MessageSquare', section: 'supportTickets', group: 'Administration' },
            { name: 'Manage Announcements', iconName: 'Edit', section: 'manageAnnouncements', group: 'Administration' },
            { name: 'Manage Interruptions', iconName: 'AlertIcon', section: 'manageInterruptions', group: 'Administration' },
            { name: 'System Settings', iconName: 'Settings', section: 'systemSettings', group: 'Administration' },
            { name: 'Batch Billing', iconName: 'FileText', section: 'batchBilling', group: 'Operations' },
            { name: 'Meter Reading Mgt.', iconName: 'Gauge', section: 'editMeterReadingsAdmin', group: 'Operations' },
            { name: 'Route Management', iconName: 'Map', section: 'routeManagement', group: 'Operations' },
            { name: 'My Profile', iconName: 'UserCog', section: 'myProfile', group: 'Account' },
            { name: 'Interruption Map', iconName: 'Map', section: 'interruptionMap', group: 'Information' },
            { name: 'FAQs', iconName: 'HelpCircle', section: 'faqs', group: 'Help & Info' },
            { name: 'About Us', iconName: 'Info', section: 'aboutUs', group: 'Help & Info' },
            { name: 'Contact Us', iconName: 'PhoneCall', section: 'contactUs', group: 'Help & Info' },
        ],
        meter_reader: [
            { name: 'Dashboard', iconName: 'Home', section: 'mainDashboard', group: 'Main' },
            { name: 'Assigned Routes', iconName: 'Map', section: 'assignedRoutes', group: 'Operations' },
            { name: 'Submit Reading', iconName: 'ClipboardEdit', section: 'searchAndSubmitReading', group: 'Operations' },
            { name: 'Search Customer', iconName: 'Search', section: 'searchCustomerMeterReader', group: 'Operations' },
            { name: 'My Profile', iconName: 'UserCog', section: 'myProfile', group: 'Account' },
            { name: 'My Support Tickets', iconName: 'MessageSquare', section: 'myTickets', group: 'Support' },
            { name: 'Report an Issue', iconName: 'AlertTriangle', section: 'reportIssue', group: 'Support' },
            { name: 'View Announcements', iconName: 'Megaphone', section: 'viewAnnouncements', group: 'Information' },
            { name: 'Service Advisories', iconName: 'AlertIcon', section: 'serviceAdvisories', group: 'Information' },
            { name: 'Interruption Map', iconName: 'Map', section: 'interruptionMap', group: 'Information' },
            { name: 'FAQs', iconName: 'HelpCircle', section: 'faqs', group: 'Help & Info' },
            { name: 'Contact Us', iconName: 'PhoneCall', section: 'contactUs', group: 'Help & Info' },
        ],
        clerk_cashier: [
            { name: 'Dashboard', iconName: 'Home', section: 'mainDashboard', group: 'Main' },
            { name: 'Process Walk-in Payment', iconName: 'Banknote', section: 'walkInPayments', group: 'Operations' },
            { name: 'Search Account / Bill', iconName: 'FileSearch', section: 'searchAccountOrBill', group: 'Operations' },
            { name: 'My Profile', iconName: 'UserCog', section: 'myProfile', group: 'Account' },
            { name: 'My Support Tickets', iconName: 'MessageSquare', section: 'myTickets', group: 'Support' },
            { name: 'Report an Issue', iconName: 'AlertTriangle', section: 'reportIssue', group: 'Support' },
            { name: 'View Announcements', iconName: 'Megaphone', section: 'viewAnnouncements', group: 'Information' },
            { name: 'Service Advisories', iconName: 'AlertIcon', section: 'serviceAdvisories', group: 'Information' },
            { name: 'Interruption Map', iconName: 'Map', section: 'interruptionMap', group: 'Information' },
            { name: 'FAQs', iconName: 'HelpCircle', section: 'faqs', group: 'Help & Info' },
            { name: 'Contact Us', iconName: 'PhoneCall', section: 'contactUs', group: 'Help & Info' },
        ]
    };

    const availableNavItems = navItems[userData.role] || navItems.customer;

    const renderSection = () => {
        const sectionProps = { user, userData, setUserData, auth, db, showNotification, billingService: billingService.calculateBillDetails, determineServiceTypeAndRole: userUtils.determineServiceTypeAndRole, setActiveSection: handleNavigate, systemSettings: localSystemSettings };

        if (!userData || (userData.role === 'customer' && !userData.accountNumber)) {
             return null;
        }


        switch (activeSection) {
            case 'mainDashboard':
                if (userData.role === 'customer') return <CustomerDashboardMain {...sectionProps} />;
                if (userData.role === 'admin') return <AdminDashboardMain {...sectionProps} />;
                if (userData.role === 'meter_reader') return <MeterReaderDashboardMain {...sectionProps} />;
                if (userData.role === 'clerk_cashier') return <ClerkDashboardMain {...sectionProps} />;
                break;
            case 'myProfile': return <MyProfileSection {...sectionProps} />;
            case 'reportIssue': return <ReportIssueSection {...sectionProps} />;
            case 'faqs': return <FaqsSection {...sectionProps} />;
            case 'aboutUs': return <AboutUsSection {...sectionProps} />;
            case 'contactUs': return <ContactUsSection {...sectionProps} />;
            case 'viewAnnouncements': return <AnnouncementManager {...sectionProps} viewOnly={true} />;
            case 'serviceAdvisories': return <ServiceInterruptionsSection {...sectionProps} />;
            case 'interruptionMap': return <ServiceInterruptionMap {...sectionProps} />;

            case 'myBills': if(userData.role === 'customer') return <CustomerBillsSection {...sectionProps} />; break;
            case 'waterAnalytics': if(userData.role === 'customer') return <WaterAnalyticsSection {...sectionProps} />; break;
            case 'rebateProgram': if(userData.role === 'customer') return <RebateProgramSection {...sectionProps} />; break;

            case 'myTickets': if(['customer', 'clerk_cashier', 'meter_reader'].includes(userData.role)) return <MyTicketsSection {...sectionProps} />; break;

            case 'userManagement': if(userData.role === 'admin') return <UserManagementSection {...sectionProps} />; break;
            case 'batchBilling': if(userData.role === 'admin') return <BatchBillingSection {...sectionProps} />; break;
            case 'routeManagement': if(userData.role === 'admin') return <RouteManagementSection {...sectionProps} />; break;
            case 'supportTickets': if(userData.role === 'admin') return <SupportTicketManagementSection {...sectionProps} />; break;
            case 'manageAnnouncements': if(userData.role === 'admin') return <AnnouncementManager {...sectionProps} viewOnly={false} />; break;
            case 'manageInterruptions': if(userData.role === 'admin') return <InterruptionManager {...sectionProps} />; break;
            case 'systemAnalytics': if(userData.role === 'admin') return <StatisticsDashboard {...sectionProps} />; break;
            case 'editMeterReadingsAdmin': if(userData.role === 'admin') return <MeterReadingEditor {...sectionProps} />; break;
            case 'systemSettings': if(userData.role === 'admin') return <SystemSettingsSection {...sectionProps} />; break;

            case 'assignedRoutes': if(userData.role === 'meter_reader') return <AssignedRoutesSection {...sectionProps} />; break;
            case 'searchAndSubmitReading': if(userData.role === 'meter_reader') return <MeterReadingForm {...sectionProps} />; break;
            case 'searchCustomerMeterReader': if(userData.role === 'meter_reader') return <SearchCustomerProfileMeterReader {...sectionProps} />; break;

            case 'walkInPayments': if(userData.role === 'clerk_cashier') return <WalkInPaymentSection {...sectionProps} />; break;
            case 'searchAccountOrBill': if(userData.role === 'clerk_cashier') return <SearchAccountOrBillSection {...sectionProps} />; break;

            default: return <NotFound onNavigateHome={() => handleNavigate('mainDashboard')} />;
        }
         return <NotFound onNavigateHome={() => handleNavigate('mainDashboard')} />;
    };
    
    const mainContentPadding = activeSection === 'interruptionMap' ? 'p-0' : 'p-4 sm:p-6 lg:p-8';

    return (
        <div className="bg-gray-100 font-sans min-h-screen">
            <Sidebar
                userData={userData}
                navItems={availableNavItems}
                activeSection={activeSection}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                isMobileOpen={isSidebarOpenMobile}
                setMobileOpen={setIsSidebarOpenMobile}
            />

            <div className="lg:pl-64 flex flex-col min-h-screen print:pl-0 overflow-x-hidden">
                <header className="sticky top-0 z-30 flex items-center justify-start bg-white/80 backdrop-blur-lg shadow-sm p-3 lg:hidden no-print">
                    <button onClick={() => setIsSidebarOpenMobile(true)} className="text-gray-600 hover:text-gray-900 p-1">
                        <Menu size={28} />
                    </button>
                </header>

                {banner && (
                    <div className="bg-yellow-400 text-center p-2 text-yellow-900 font-semibold shadow-md text-sm sticky top-[57px] z-20 lg:top-0 no-print">
                       {banner.text}
                    </div>
                )}

                <main className={`${mainContentPadding} flex-grow ${banner ? 'pt-2' : ''} print:p-4`}>
                    {renderSection()}
                </main>
            </div>

            {userData && localSystemSettings.isChatbotEnabled && (
                <>
                    <button
                        onClick={() => setIsChatbotOpen(true)}
                        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transform hover:scale-110 transition-transform duration-200 ease-in-out z-40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 no-print"
                        aria-label="Open Chatbot"
                    >
                        <ChatIcon size={28} />
                    </button>
                    {isChatbotOpen && (
                        <ChatbotModal
                            isOpen={isChatbotOpen}
                            onClose={() => setIsChatbotOpen(false)}
                            userData={userData}
                            showNotification={showNotification}
                            setActiveDashboardSection={handleNavigate}
                        />
                    )}
                 </>
            )}
             {userData && userData.role === 'customer' && !userData.accountNumber && (
                 <LinkAccountModal
                    isOpen={isLinkModalOpen}
                    onLink={handleLinkAccount}
                    isLinking={isLinking}
                    error={linkError}
                    onLogout={handleLogout}
                />
             )}
        </div>
    );
};

export default DashboardLayout;