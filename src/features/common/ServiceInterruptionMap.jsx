import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Map, AlertTriangle, Loader2 } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import BarangayMap from '../../components/ui/BarangayMap';
import * as DataService from '../../services/dataService';
import naicBarangaysGeoJson from '../../data/naic_barangays.json';

const ServiceInterruptionMap = ({ db, showNotification }) => {
    const [allAffectedAreas, setAllAffectedAreas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchInterruptions = useCallback(async () => {
        setIsLoading(true);
        setError('');
        const result = await DataService.getActiveServiceInterruptions(db);
        if (result.success) {
            const affectedSet = new Set();
            result.data.forEach(item => {
                item.affectedAreas?.forEach(area => {
                    affectedSet.add(area);
                });
            });
            setAllAffectedAreas(Array.from(affectedSet));
        } else {
            setError(result.error || "Failed loading advisory data.");
            showNotification(result.error || "Failed loading advisories.", "error");
        }
        setIsLoading(false);
    }, [db, showNotification]);

    useEffect(() => {
        fetchInterruptions();
    }, [fetchInterruptions]);
    
    const geoJsonData = useMemo(() => naicBarangaysGeoJson, []);

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                    <Map size={30} className="mr-3 text-red-600" />
                    Active Interruption Map
                </h2>
            </div>

            {isLoading && <LoadingSpinner message="Loading map data..." />}
            {error && <div className="text-red-600 bg-red-50 p-3 rounded-md text-center border border-red-200">{error}</div>}

            {!isLoading && !error && (
                <div className="space-y-4 flex-grow flex flex-col">
                    <p className="text-sm text-gray-600">
                        The map below highlights all areas currently affected by any active service advisory.
                        {allAffectedAreas.length === 0 ? 
                            " Currently, there are no advisories reporting specific affected areas." :
                            ` A total of ${allAffectedAreas.length} barangay(s) are affected.`
                        }
                    </p>
                    <div className="flex-grow w-full rounded-lg overflow-hidden border border-gray-300 shadow-inner relative z-10">
                        <BarangayMap
                            geoJsonData={geoJsonData}
                            affectedAreas={allAffectedAreas}
                            height="100%"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceInterruptionMap;