import React, { useState, useEffect, useCallback } from "react";
import { Edit3, Users, Search, Filter, Loader2, AlertTriangle, ShieldCheck, UserCheck, UserX, RotateCcw, Info, Trash2, Percent, Clock } from "lucide-react";
import UserEditModal from "./UserEditModal.jsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import ConfirmationModal from "../../components/ui/ConfirmationModal.jsx";
import * as DataService from "../../services/dataService.js";
import { formatDate } from "../../utils/userUtils.js";
import { FixedSizeList as List } from 'react-window';

const commonInputClass = "w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none transition duration-150 text-sm placeholder-gray-400";

const UserManagementSection = ({ db, showNotification, determineServiceTypeAndRole, userData: adminUserData }) => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [userToModify, setUserToModify] = useState(null);
    const [newStatusForUser, setNewStatusForUser] = useState('');
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterRole, setFilterRole] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterDiscount, setFilterDiscount] = useState("");

    const [actionLoading, setActionLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setFetchError('');
        const result = await DataService.getAllUsersProfiles(db);
        if (result.success) {
            setUsers(result.data.sort((a,b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '')));
        } else {
            const errorMsg = result.error || "Failed to fetch user list. Please try again.";
            setFetchError(errorMsg);
        }
        setIsLoading(false);
    }, [db]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleOpenEditModal = (user) => setEditingUser(user);
    const handleCloseEditModal = () => setEditingUser(null);

    const handleSaveUser = async (updatedProfileData) => {
        if (!editingUser) return;
        setActionLoading(true);
        const result = await DataService.updateUserProfile(db, editingUser.id, updatedProfileData);
        if (result.success) {
            showNotification("User profile updated successfully!", "success");
            handleCloseEditModal();
            fetchUsers();
        } else {
            showNotification(result.error || "Failed to update user profile.", "error");
        }
        setActionLoading(false);
    };

    const openStatusChangeModal = (user, targetStatus) => {
        setUserToModify(user);
        setNewStatusForUser(targetStatus);
        setIsStatusModalOpen(true);
    };

    const confirmStatusChange = async () => {
        if (!userToModify || !newStatusForUser) return;
        setActionLoading(true);

        await DataService.updateUserProfile(db, userToModify.id, { accountStatus: newStatusForUser });

        showNotification(`User account status changed to ${newStatusForUser}.`, "success");
        fetchUsers();

        setIsStatusModalOpen(false);
        setUserToModify(null);
        setNewStatusForUser('');
        setActionLoading(false);
    };

    const openDeleteModal = (user) => {
        setUserToModify(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToModify) return;
        setActionLoading(true);

        await DataService.updateUserProfile(db, userToModify.id, { accountStatus: 'Suspended' });

        const deleteResult = await DataService.deleteUserProfile(db, userToModify.id);

        if (deleteResult.success) {
            showNotification(`User ${userToModify.displayName} has been permanently deleted.`, "success");
            fetchUsers();
        } else {
            showNotification(deleteResult.error || "Failed to delete user profile.", "error");
            await DataService.updateUserProfile(db, userToModify.id, { accountStatus: userToModify.accountStatus });
        }

        setIsDeleteModalOpen(false);
        setUserToModify(null);
        setActionLoading(false);
    };

    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (user.displayName?.toLowerCase().includes(searchLower) ||
               user.email?.toLowerCase().includes(searchLower) ||
               user.accountNumber?.toLowerCase().includes(searchLower)) &&
               (filterRole ? user.role === filterRole : true) &&
               (filterStatus ? user.accountStatus === filterStatus : true) &&
               (filterDiscount ? (user.discountStatus || 'none') === filterDiscount : true);
    });

    const roleColors = { admin: 'bg-purple-100 text-purple-700', customer: 'bg-blue-100 text-blue-700', meter_reader: 'bg-teal-100 text-teal-700', clerk_cashier: 'bg-indigo-100 text-indigo-700', unknown: 'bg-gray-100 text-gray-700' };
    const statusColors = { Active: 'bg-green-100 text-green-700', Inactive: 'bg-gray-200 text-gray-600', Suspended: 'bg-red-100 text-red-700', 'Profile Missing': 'bg-yellow-100 text-yellow-700', Unknown: 'bg-gray-100 text-gray-600' };
    const discountColors = { none: 'bg-gray-100 text-gray-600', pending: 'bg-yellow-100 text-yellow-700', verified: 'bg-green-100 text-green-700' };
    const discountLabels = { none: 'None', pending: 'Pending', verified: 'Verified' };

    
    const Row = ({ index, style }) => {
        const u = filteredUsers[index];
        const discountStatus = u.discountStatus || 'none';
        return (
            <div style={style} className="flex items-center border-b border-gray-200 text-sm">
                <div className="px-4 py-2 whitespace-nowrap text-gray-800 font-medium flex-1">{u.displayName || 'N/A'}</div>
                <div className="px-4 py-2 whitespace-nowrap text-gray-500 truncate flex-1" title={u.email || u.phoneNumber}>{u.email || u.phoneNumber || 'N/A'}</div>
                <div className="px-4 py-2 flex-1"><span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${roleColors[u.role || 'unknown']}`}>{u.role?.replace('_', ' ') || 'Unknown'}</span></div>
                <div className="px-4 py-2 whitespace-nowrap text-gray-500 font-mono text-xs flex-1">{u.accountNumber || 'N/A'}</div>
                <div className="px-4 py-2 flex-1"><span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[u.accountStatus || 'Unknown']}`}>{u.accountStatus || 'Unknown'}</span></div>
                <div className="px-4 py-2 flex-1"><span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${discountColors[discountStatus]}`}>{discountLabels[discountStatus]}</span></div>
                <div className="px-4 py-2 whitespace-nowrap text-sm text-center space-x-1.5 flex-1">
                    <button onClick={() => handleOpenEditModal(u)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-100 rounded-md" title="Edit User"><Edit3 size={16}/></button>
                     {u.accountStatus !== 'Suspended' && <button onClick={() => openStatusChangeModal(u, 'Suspended')} className="text-orange-500 hover:text-orange-700 p-1 hover:bg-orange-100 rounded-md" title="Suspend User"><UserX size={16} /></button>}
                    {(u.accountStatus === 'Suspended' || u.accountStatus === 'Inactive') && <button onClick={() => openStatusChangeModal(u, 'Active')} className="text-green-500 hover:text-green-700 p-1 hover:bg-green-100 rounded-md" title="Activate User"><UserCheck size={16} /></button>}
                    {adminUserData?.uid !== u.id && (
                        <button onClick={() => openDeleteModal(u)} className="text-red-600 hover:text-red-800 p-1 hover:bg-red-100 rounded-md" title="Delete User"><Trash2 size={16}/></button>
                    )}
                </div>
            </div>
        );
    };


    if (isLoading) {
        return <LoadingSpinner message="Loading user accounts..." className="mt-10 h-64" />;
    }

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                    <Users size={30} className="mr-3 text-blue-600" /> User Account Management
                </h2>
                 <button onClick={fetchUsers} className="mt-3 sm:mt-0 text-sm flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg border border-gray-300 transition-colors" disabled={isLoading} title="Refresh User List">
                    {isLoading ? <Loader2 size={16} className="animate-spin mr-1.5" /> : <RotateCcw size={16} className="mr-1.5" />} Refresh List
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg shadow-sm">
                <div>
                    <label htmlFor="userMgmtSearchTerm" className="block text-xs font-medium text-gray-600 mb-1">Search Users</label>
                    <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" id="userMgmtSearchTerm" placeholder="Name, Email, Account No..." className={`${commonInputClass} pl-9`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                </div>
                <div>
                    <label htmlFor="userMgmtFilterRole" className="block text-xs font-medium text-gray-600 mb-1">Filter by Role</label>
                    <div className="relative"><Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><select id="userMgmtFilterRole" className={`${commonInputClass} pl-9`} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}><option value="">All Roles</option><option value="customer">Customer</option><option value="admin">Admin</option><option value="meter_reader">Meter Reader</option><option value="clerk_cashier">Clerk/Cashier</option></select></div>
                </div>
                <div>
                     <label htmlFor="userMgmtFilterStatus" className="block text-xs font-medium text-gray-600 mb-1">Filter by Status</label>
                    <div className="relative"><ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><select id="userMgmtFilterStatus" className={`${commonInputClass} pl-9`} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="">All Statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Suspended">Suspended</option><option value="Profile Missing">Profile Missing</option></select></div>
                </div>
                <div>
                     <label htmlFor="userMgmtFilterDiscount" className="block text-xs font-medium text-gray-600 mb-1">Filter by Discount</label>
                    <div className="relative"><Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><select id="userMgmtFilterDiscount" className={`${commonInputClass} pl-9`} value={filterDiscount} onChange={(e) => setFilterDiscount(e.target.value)}><option value="">All</option><option value="none">None</option><option value="pending">Pending</option><option value="verified">Verified</option></select></div>
                </div>
            </div>

            {!isLoading && filteredUsers.length === 0 && (
                 <div className="text-center py-10"><Info size={48} className="mx-auto text-gray-400 mb-3" /><p className="text-gray-500 text-lg">{users.length === 0 && !fetchError ? "No users found." : "No users match your filters."}</p></div>
            )}

            {!isLoading && filteredUsers.length > 0 && (
                <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200">
                    <div className="flex bg-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="px-4 py-3 flex-1">Name</div>
                        <div className="px-4 py-3 flex-1">Email / Contact</div>
                        <div className="px-4 py-3 flex-1">Role</div>
                        <div className="px-4 py-3 flex-1">Account No.</div>
                        <div className="px-4 py-3 flex-1">Status</div>
                        <div className="px-4 py-3 flex-1">Discount</div>
                        <div className="px-4 py-3 text-center flex-1">Actions</div>
                    </div>
                    <List
                        height={400}
                        itemCount={filteredUsers.length}
                        itemSize={60}
                        width="100%"
                    >
                        {Row}
                    </List>
                </div>
            )}

            {editingUser && <UserEditModal user={editingUser} isOpen={!!editingUser} onClose={handleCloseEditModal} onSave={handleSaveUser} isSaving={actionLoading} determineServiceTypeAndRole={determineServiceTypeAndRole} showNotification={showNotification}/>}

            {isStatusModalOpen && userToModify && (
                <ConfirmationModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} onConfirm={confirmStatusChange} title={`Confirm Status Change`} confirmText={actionLoading ? "Updating..." : `Set to ${newStatusForUser}`} isConfirming={actionLoading} iconType={newStatusForUser === 'Active' ? 'success' : 'danger'}
                    confirmButtonClass={newStatusForUser === 'Active' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'}>
                    <p>Change status for <strong>{userToModify.displayName || userToModify.email}</strong> to <strong className={newStatusForUser === 'Active' ? 'text-green-600' : 'text-red-600'}>{newStatusForUser}</strong>?</p>
                </ConfirmationModal>
            )}

            {isDeleteModalOpen && userToModify && (
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={confirmDeleteUser}
                    title="Confirm User Deletion"
                    confirmText="Yes, Permanently Delete"
                    isConfirming={actionLoading}
                    iconType="danger"
                >
                    <p>Are you sure you want to delete <strong>{userToModify.displayName || userToModify.email}</strong>?</p>
                    <p className="text-sm text-gray-500 mt-2">This will permanently delete the user's profile and data. Their authentication account will be disabled. This action cannot be undone.</p>
                </ConfirmationModal>
            )}
        </div>
    );
};

export default UserManagementSection;