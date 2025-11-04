import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/ui/Modal';
import { Save, Loader2, List, Info, MapPin, ChevronDown } from 'lucide-react';
import * as DataService from '../../services/dataService';
import * as geoService from '../../services/geoService';

const commonInputClass = "w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none transition-150 text-sm";

const RouteEditModal = ({ isOpen, onClose, onSave, route, readers, isSaving, db }) => {
    const [formData, setFormData] = useState({
        name: '',
        areaCode: '',
        description: '',
        assignedReaderId: '',
    });
    const [selectedBarangays, setSelectedBarangays] = useState([]);
    const [accountNumbers, setAccountNumbers] = useState([]);
    const [districtBarangays, setDistrictBarangays] = useState({});
    const [allBarangaysList, setAllBarangaysList] = useState([]);
    const [isFetchingAccounts, setIsFetchingAccounts] = useState(false);

    useEffect(() => {
        const districts = geoService.getDistricts();
        const allBrgys = [];
        const districtMap = districts.reduce((acc, district) => {
            const brgys = geoService.getBarangaysInDistrict(district).sort();
            acc[district] = brgys;
            allBrgys.push(...brgys);
            return acc;
        }, {});
        setDistrictBarangays(districtMap);
        setAllBarangaysList(allBrgys.sort());
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (route) {
                setFormData({
                    name: route.name || '',
                    areaCode: route.areaCode || '',
                    description: route.description || '',
                    assignedReaderId: route.assignedReaderId || '',
                });
                const initialBarangays = Array.isArray(route.barangays) ? route.barangays : (route.barangay ? [route.barangay] : []);
                setSelectedBarangays(initialBarangays);
                setAccountNumbers(route.accountNumbers || []);
            } else {
                setFormData({ name: '', areaCode: '', description: '', assignedReaderId: '' });
                setSelectedBarangays([]);
                setAccountNumbers([]);
            }
        }
    }, [route, isOpen]);
    
    const fetchAccountsForBarangays = useCallback(async (barangays) => {
        if (!barangays || barangays.length === 0) {
            setAccountNumbers([]);
            return;
        }
        setIsFetchingAccounts(true);
        let allAccounts = [];
        for (const barangay of barangays) {
            const result = await DataService.getAccountsByLocation(db, barangay);
            if (result.success) {
                allAccounts = [...allAccounts, ...result.data];
            }
        }
        setAccountNumbers([...new Set(allAccounts)]);
        setIsFetchingAccounts(false);
    }, [db]);

    useEffect(() => {
        fetchAccountsForBarangays(selectedBarangays);
    }, [selectedBarangays, fetchAccountsForBarangays]);
    
    const handleAreaChange = (barangay) => {
        setSelectedBarangays(prev =>
            prev.includes(barangay)
                ? prev.filter(b => b !== barangay)
                : [...prev, barangay]
        );
    };

    const handleSelectAllAreas = () => {
        if (selectedBarangays.length === allBarangaysList.length) {
            setSelectedBarangays([]);
        } else {
            setSelectedBarangays([...allBarangaysList]);
        }
    };
    
    const handleSelectDistrict = (district, brgys) => {
        const allInDistrict = brgys.every(b => selectedBarangays.includes(b));
        if (allInDistrict) {
            setSelectedBarangays(prev => prev.filter(b => !brgys.includes(b)));
        } else {
            setSelectedBarangays(prev => [...new Set([...prev, ...brgys])]);
        }
    };

    const generateAreaCode = (routeName) => {
        if (!routeName) return '';
        return routeName.split(' ').map(w => w[0]).join('').toUpperCase();
    };

    const handleNameChange = (e) => {
        const name = e.target.value;
        setFormData(prev => ({ ...prev, name, areaCode: generateAreaCode(name) }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            name: formData.name,
            areaCode: formData.areaCode,
            description: formData.description,
            assignedReaderId: formData.assignedReaderId,
            barangays: selectedBarangays,
            accountNumbers
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={route ? 'Edit Meter Route' : 'Create New Meter Route'} size="2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium mb-1">Route Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleNameChange} className={commonInputClass} required />
                    </div>
                    <div>
                        <label htmlFor="areaCode" className="block text-sm font-medium mb-1">Generated Area Code</label>
                        <input type="text" name="areaCode" value={formData.areaCode} className={`${commonInputClass} bg-gray-200`} readOnly />
                    </div>
                </div>
                <div>
                    <label htmlFor="assignedReaderId" className="block text-sm font-medium mb-1">Assign to Meter Reader</label>
                    <select name="assignedReaderId" value={formData.assignedReaderId} onChange={handleChange} className={commonInputClass}>
                        <option value="">Unassigned</option>
                        {readers.map(reader => (
                            <option key={reader.id} value={reader.id}>{reader.displayName} ({reader.email})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows="2" className={commonInputClass}></textarea>
                </div>

                <div className="p-4 border rounded-lg bg-gray-50 max-h-72 overflow-y-auto scrollbar-thin">
                    <div className="flex justify-between items-center mb-2 sticky top-0 bg-gray-50 py-1 -mt-1 border-b border-gray-200">
                        <label className="block text-sm font-medium text-gray-700"><MapPin size={16} className="inline mr-1.5" />Assigned Area(s) *</label>
                        <button type="button" onClick={handleSelectAllAreas} className="text-xs font-medium text-blue-600 hover:underline">
                            {selectedBarangays.length === allBarangaysList.length ? 'Deselect All' : `Select All (${allBarangaysList.length})`}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(districtBarangays).map(([district, brgys]) => (
                            <details key={district} className="group bg-white border rounded-md">
                                <summary className="flex justify-between items-center p-2 cursor-pointer list-none">
                                    <span className="font-semibold text-sm text-blue-700">{district}</span>
                                    <div className="flex items-center">
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.preventDefault(); handleSelectDistrict(district, brgys); }}
                                            className="text-xs text-blue-600 hover:underline mr-2"
                                        >
                                            Toggle District
                                        </button>
                                        <ChevronDown size={18} className="text-gray-500 group-open:rotate-180 transition-transform"/>
                                    </div>
                                </summary>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 border-t border-gray-100">
                                    {brgys.map(b => (
                                        <label key={b} className="flex items-center space-x-2 p-1.5 rounded bg-gray-50 border border-gray-200 hover:bg-blue-50 cursor-pointer text-xs has-[:checked]:bg-blue-100 has-[:checked]:border-blue-300">
                                            <input
                                                type="checkbox"
                                                checked={selectedBarangays.includes(b)}
                                                onChange={() => handleAreaChange(b)}
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 shrink-0"
                                            />
                                            <span className="truncate" title={b}>{b}</span>
                                        </label>
                                    ))}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 flex items-center"><List size={16} className="mr-2"/>Auto-Assigned Accounts</p>
                    {isFetchingAccounts ? <div className="flex items-center text-sm text-gray-500"><Loader2 className="animate-spin h-4 w-4 mr-2"/>Searching for accounts...</div> :
                        (selectedBarangays.length > 0 && accountNumbers.length > 0 ? (
                            <p className="text-sm text-gray-700">{accountNumbers.length} total accounts found in {selectedBarangays.length} selected area(s).</p>
                        ) : selectedBarangays.length > 0 && accountNumbers.length === 0 ? (
                            <p className="text-sm text-orange-700 bg-orange-100 p-2 rounded-md flex items-center"><Info size={14} className="mr-2"/>No accounts found for this location. You cannot save an empty route.</p>
                        ) : (
                            <p className="text-xs text-gray-500">Select at least one area to find and assign accounts.</p>
                        ))
                    }
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium bg-gray-200 rounded-lg" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg flex items-center disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={isSaving || isFetchingAccounts || accountNumbers.length === 0}>
                        {isSaving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                        {isSaving ? 'Saving...' : 'Save Route'}
                    </button>
                </div>
            </form>
             <style>{`
                .scrollbar-thin { scrollbar-width: thin; scrollbar-color: #9ca3af #f3f4f6; }
                .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px;}
                .scrollbar-thin::-webkit-scrollbar-track { background: #f3f4f6; border-radius:3px; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #9ca3af; border-radius: 3px; border: 1px solid #f3f4f6;}
                .scrollbar-thin::-webkit-scrollbar-thumb:hover { background-color: #6b7280; }
             `}</style>
        </Modal>
    );
};

export default RouteEditModal;