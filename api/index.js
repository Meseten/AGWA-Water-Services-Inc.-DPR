import React from 'react';
import {
    Home, UserCog, FileText, AlertTriangle, Users, MessageSquare, Settings, HelpCircle, Info, PhoneCall,
    LogOut, ShieldCheck, Megaphone, BarChart3, Edit, Gauge, Map, ClipboardEdit, Search, Banknote, FileSearch,
    TrendingUp, Gift, AlertTriangle as AlertIcon
} from 'lucide-react';

const iconMap = {
    Home, UserCog, FileText, AlertTriangle, Users, MessageSquare, Settings, HelpCircle, Info, PhoneCall,
    LogOut, ShieldCheck, Megaphone, BarChart3, Edit, Gauge, Map, ClipboardEdit, Search, Banknote, FileSearch,
    TrendingUp, Gift, AlertIcon,
};

const Sidebar = ({
    userData,
    navItems,
    activeSection,
    onNavigate,
    onLogout,
    isMobileOpen,
    setMobileOpen
}) => {
    const placeholderPhoto = `https://placehold.co/40x40/FFFFFF/3B82F6?text=${(userData?.displayName || userData?.email || 'U').charAt(0).toUpperCase()}`;

    const sidebarContent = (
        <div className="h-full flex flex-col bg-gradient-to-b from-blue-700 to-blue-900 text-white shadow-2xl">
            <div className="p-5 pt-6 text-center border-b border-blue-600">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">AGWA</h1>
                <p className="text-xs text-blue-200 font-light mt-0.5 italic">Ensuring Clarity, Sustaining Life.</p>
            </div>

            <nav className="flex-grow p-3 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-800">
                {navItems.map(item => {
                    const IconComponent = iconMap[item.iconName] || HelpCircle;
                    const isActive = activeSection === item.section;
                    return (
                        <button
                            key={item.section || item.name}
                            onClick={() => {
                                onNavigate(item.section);
                                if (setMobileOpen) setMobileOpen(false);
                             }}
                            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg transition-all duration-200 ease-in-out text-sm font-medium focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-sky-300 group
                                ${isActive
                                    ? 'bg-sky-500 text-white shadow-md transform scale-105 font-semibold'
                                    : 'text-blue-100 hover:bg-blue-600/70 hover:text-white hover:translate-x-1'
                                }`}
                            title={item.name}
                        >
                            <IconComponent size={20} className={`${isActive ? 'text-white' : 'text-blue-300 group-hover:text-white transition-colors'}`} />
                            <span className="truncate">{item.name}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-blue-600">
                 {userData && (
                     <div className="flex items-center mb-3 p-2.5 bg-blue-800/50 rounded-lg shadow-inner">
                         <img
                             src={userData.photoURL || placeholderPhoto}
                             alt="User"
                             className="h-10 w-10 rounded-full border-2 border-blue-400 object-cover bg-gray-200 flex-shrink-0"
                             onError={(e) => { e.target.onerror = null; e.target.src = placeholderPhoto; }}
                         />
                         <div className="ml-3 overflow-hidden">
                             <p className="text-sm font-semibold leading-tight truncate text-white" title={userData.displayName || userData.email}>
                                 {userData.displayName || userData.email}
                             </p>
                             <p className="text-xs text-blue-200 leading-tight capitalize truncate" title={`Role: ${userData.role}`}>
                                Role: {userData.role?.replace('_', ' ') || 'N/A'}
                             </p>
                              <p className="text-xs text-blue-300 leading-tight truncate" title={`Account: ${userData.accountNumber || 'N/A'}`}>
                                 Acc: {userData.accountNumber || 'N/A'}
                             </p>
                         </div>
                     </div>
                 )}
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400 ring-offset-2 ring-offset-blue-800"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            <div
                className={`fixed inset-0 bg-black bg-opacity-60 z-40 lg:hidden transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setMobileOpen(false)}
                aria-hidden="true"
             ></div>

            <aside className={`fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}`}>
                {sidebarContent}
            </aside>

             <style jsx global>{`
                .scrollbar-thin { scrollbar-width: thin; scrollbar-color: #3b82f6 #1e40af; }
                .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
                .scrollbar-thin::-webkit-scrollbar-track { background: #1e40af; border-radius: 3px;}
                .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #3b82f6; border-radius: 3px; border: 1px solid #1e40af; }
                .scrollbar-thin::-webkit-scrollbar-thumb:hover { background-color: #2563eb; }
             `}</style>
        </>
    );
};

export default Sidebar;