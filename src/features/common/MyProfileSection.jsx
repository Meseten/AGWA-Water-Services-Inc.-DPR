import React, { useState, useEffect } from 'react';
import { UserCog, Edit3, Save, Loader2, Mail, Hash, MapPin, Camera, ShieldCheck, Briefcase, Droplets, UserCircle, Gauge, AlertTriangle, Home, Info, CheckSquare, Percent, Clock } from 'lucide-react';
import * as DataService from '../../services/dataService.js';
import * as AuthService from '../../services/authService.js';
import * as geoService from '../../services/geoService.js';
import { generatePlaceholderPhotoURL } from '../../utils/userUtils.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import DiscountApplicationModal from './DiscountApplicationModal.jsx';

const commonInputClass = "w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none transition duration-150 text-sm placeholder-gray-400";
const commonDisabledClass = "bg-gray-200 cursor-not-allowed text-gray-500";

const MyProfileSection = ({ user, userData, setUserData, auth, db, showNotification }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [profileDataForm, setProfileDataForm] = useState({});
    const [addressForm, setAddressForm] = useState({ district: '', barangay: '', street: '', landmark: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [districts, setDistricts] = useState([]);
    const [barangays, setBarangays] = useState([]);
    
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

    const isCustomer = userData?.role === 'customer';

    useEffect(() => {
        setDistricts(geoService.getDistricts());
        if (userData) {
            setProfileDataForm({ ...userData });
            if (isCustomer && userData.serviceAddress && typeof userData.serviceAddress === 'object') {
                const currentDistrict = userData.serviceAddress.district || '';
                setAddressForm(userData.serviceAddress);
                if (currentDistrict) {
                    setBarangays(geoService.getBarangaysInDistrict(currentDistrict));
                }
            } else {
                setAddressForm({ district: '', barangay: '', street: '', landmark: '' });
            }
        }
    }, [userData, isCustomer]);
    
    const formatAddressToString = (addressObj) => {
        if (!addressObj || typeof addressObj !== 'object') return 'N/A';
        const parts = [addressObj.street, addressObj.barangay, addressObj.district, "Naic, Cavite"];
        return parts.filter(p => p && p.trim()).join(', ');
    };

    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        setAddressForm(prev => {
            const newAddress = { ...prev, [name]: value };
            if (name === 'district') {
                newAddress.barangay = '';
                setBarangays(geoService.getBarangaysInDistrict(value));
            }
            return newAddress;
        });
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setProfileDataForm(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setError('');
        if (!profileDataForm.displayName?.trim()) {
            setError("Display Name cannot be empty.");
            return;
        }
        setIsSaving(true);
        const dataToUpdateInFirestore = {
            displayName: profileDataForm.displayName.trim(),
            photoURL: profileDataForm.photoURL?.trim() || '',
            serviceAddress: isCustomer ? addressForm : (userData.serviceAddress || {}),
        };

        const firestoreUpdateResult = await DataService.updateUserProfile(db, user.uid, dataToUpdateInFirestore);

        if (!firestoreUpdateResult.success) {
            showNotification(firestoreUpdateResult.error || "Failed to update profile in database.", "error");
            setIsSaving(false);
            return;
        }

        setUserData(prev => ({ ...prev, ...dataToUpdateInFirestore }));
        showNotification("Profile updated successfully!", "success");
        setIsEditing(false);
        setIsSaving(false);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setError('');
        setProfileDataForm({ ...userData });
        if (isCustomer && userData.serviceAddress && typeof userData.serviceAddress === 'object') {
            setAddressForm(userData.serviceAddress);
        }
    };
    
    const handleApplyForDiscount = async () => {
        setIsSaving(true);
        const dataToUpdateInFirestore = { discountStatus: 'pending' };
        const firestoreUpdateResult = await DataService.updateUserProfile(db, user.uid, dataToUpdateInFirestore);
        
        if (firestoreUpdateResult.success) {
            setUserData(prev => ({ ...prev, ...dataToUpdateInFirestore }));
            setProfileDataForm(prev => ({ ...prev, ...dataToUpdateInFirestore }));
            showNotification("Application submitted! Your status is now 'Pending Verification'.", "success");
            setIsDiscountModalOpen(false);
        } else {
            showNotification(firestoreUpdateResult.error || "Failed to submit application.", "error");
        }
        setIsSaving(false);
    };

    if (!userData) {
        return <LoadingSpinner message="Loading profile..." />;
    }
    const effectivePhotoURL = profileDataForm.photoURL || generatePlaceholderPhotoURL(profileDataForm.displayName);
    
    const discountStatus = profileDataForm.discountStatus || 'none';

    return (
        <>
            <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn">
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                    <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                        <UserCog size={30} className="mr-3 text-blue-600" /> My Profile
                    </h2>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="flex items-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">
                            <Edit3 size={18} className="mr-2" /> Edit Profile
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm flex items-center">
                        <AlertTriangle size={20} className="mr-2" /> {error}
                    </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div className="text-center space-y-3">
                        <img src={effectivePhotoURL} alt="Profile" className="h-28 w-28 rounded-full object-cover border-4 border-blue-200 shadow-md bg-gray-200 mx-auto" />
                        {isEditing && (
                            <input type="url" name="photoURL" value={profileDataForm.photoURL || ''} onChange={handleChange} className={`${commonInputClass} max-w-sm mx-auto text-center`} placeholder="Image URL"/>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                         <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 flex items-center"><UserCircle size={14} className="mr-1.5"/>Full Name</label>
                            {isEditing ? <input type="text" name="displayName" value={profileDataForm.displayName || ''} onChange={handleChange} className={commonInputClass} />
                                       : <p className={`${commonInputClass} ${commonDisabledClass}`}>{profileDataForm.displayName}</p>}
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 flex items-center"><Mail size={14} className="mr-1.5"/>Email Address</label>
                            <p className={`${commonInputClass} ${commonDisabledClass}`}>{profileDataForm.email}</p>
                        </div>
                        {isCustomer && (
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 flex items-center"><Hash size={14} className="mr-1.5"/>Account Number</label>
                                <p className={`${commonInputClass} ${commonDisabledClass}`}>{profileDataForm.accountNumber}</p>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 flex items-center"><Briefcase size={14} className="mr-1.5"/>User Role</label>
                            <p className={`${commonInputClass} ${commonDisabledClass} capitalize`}>{profileDataForm.role?.replace('_', ' ')}</p>
                        </div>
                    </div>

                    {isCustomer && (
                        <div className="pt-4 mt-4 border-t">
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">Service Address</h3>
                            {isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 mb-1">District</label>
                                        <select name="district" value={addressForm.district} onChange={handleAddressChange} className={commonInputClass}>
                                            <option value="">Select District</option>
                                            {districts.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 mb-1">Barangay</label>
                                        <select name="barangay" value={addressForm.barangay} onChange={handleAddressChange} className={commonInputClass} disabled={!addressForm.district}>
                                            <option value="">Select Barangay</option>
                                            {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-medium text-gray-600 mb-1">Street Name, Building, House No.</label>
                                        <input type="text" name="street" value={addressForm.street} onChange={handleAddressChange} className={commonInputClass} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-medium text-gray-600 mb-1">Landmark</label>
                                        <input type="text" name="landmark" value={addressForm.landmark} onChange={handleAddressChange} className={commonInputClass} />
                                    </div>
                                </div>
                            ) : (
                                <p className={`${commonInputClass} ${commonDisabledClass}`}>{formatAddressToString(profileDataForm.serviceAddress)}</p>
                            )}
                        </div>
                    )}
                    
                    {isCustomer && (
                        <div className="pt-4 mt-4 border-t">
                             <h3 className="text-lg font-semibold text-gray-700 mb-2">Discount Status</h3>
                             <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50">
                                {discountStatus === 'none' && (
                                    <div className="flex-grow">
                                        <p className="font-medium text-gray-700">No discount applied.</p>
                                        <p className="text-xs text-gray-500">Apply for a Senior Citizen / PWD discount.</p>
                                    </div>
                                )}
                                {discountStatus === 'pending' && (
                                    <div className="flex-grow">
                                        <p className="font-medium text-yellow-700 flex items-center"><Clock size={16} className="mr-2"/> Application Pending Verification</p>
                                        <p className="text-xs text-gray-500">We are reviewing your application. Please wait for an admin to approve it.</p>
                                    </div>
                                )}
                                {discountStatus === 'verified' && (
                                    <div className="flex-grow">
                                        <p className="font-medium text-green-700 flex items-center"><CheckSquare size={16} className="mr-2"/> Discount Active</p>
                                        <p className="text-xs text-gray-500">Your Senior/PWD discount is active and will be applied to new bills.</p>
                                    </div>
                                )}
                                
                                {!isEditing && discountStatus === 'none' && (
                                    <button 
                                        type="button" 
                                        onClick={() => setIsDiscountModalOpen(true)}
                                        className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                                    >
                                        Apply Now
                                    </button>
                                )}
                             </div>
                        </div>
                    )}

                    {isEditing && (
                        <div className="flex justify-end space-x-4 pt-5">
                            <button type="button" onClick={handleCancelEdit} className="px-6 py-2.5 text-sm font-medium bg-gray-100 rounded-lg" disabled={isSaving}>Cancel</button>
                            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg flex items-center" disabled={isSaving}>
                                {isSaving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
            
            <DiscountApplicationModal 
                isOpen={isDiscountModalOpen}
                onClose={() => setIsDiscountModalOpen(false)}
                onSubmit={handleApplyForDiscount}
                isSaving={isSaving}
            />
        </>
    );
};

export default MyProfileSection;