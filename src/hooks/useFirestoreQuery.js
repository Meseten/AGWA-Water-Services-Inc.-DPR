import { useState, useEffect, useCallback } from 'react';
import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    onSnapshot
} from 'firebase/firestore';

function useFirestoreQuery(
    firestoreInstance,
    path,
    queryConstraints = [],
    docId = null,
    listen = false,
    dependencies = []
) {
    const [data, setData] = useState(docId ? null : []);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (isMounted) => {
        if (!firestoreInstance || !path) {
            if (isMounted) {
                setError("Firestore instance or path is not provided.");
                setIsLoading(false);
            }
            return;
        }

        if (isMounted) {
            setIsLoading(true);
            setError(null);
        }

        try {
            if (docId) {
                const docRef = doc(firestoreInstance, path, docId);
                if (listen) {
                    const unsubscribe = onSnapshot(docRef, (docSnap) => {
                        if (isMounted) {
                            setData(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
                            setIsLoading(false);
                        }
                    }, (err) => {
                        if (isMounted) {
                            setError(err.message || "Error listening to document.");
                            setIsLoading(false);
                        }
                    });
                    return unsubscribe; 
                } else {
                    const docSnap = await getDoc(docRef);
                    if (isMounted) {
                        setData(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
                        setIsLoading(false);
                    }
                }
            } else {
                const collectionRef = collection(firestoreInstance, path);
                const q = query(collectionRef, ...(Array.isArray(queryConstraints) ? queryConstraints : []));

                if (listen) {
                    const unsubscribe = onSnapshot(q, (querySnapshot) => {
                        if (isMounted) {
                            const collectionData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                            setData(collectionData);
                            setIsLoading(false);
                        }
                    }, (err) => {
                        if (isMounted) {
                            setError(err.message || "Error listening to collection.");
                            setIsLoading(false);
                        }
                    });
                    return unsubscribe; 
                } else {
                    const querySnapshot = await getDocs(q);
                    if (isMounted) {
                        const collectionData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                        setData(collectionData);
                        setIsLoading(false);
                    }
                }
            }
        } catch (err) {
            if (isMounted) {
                setError(err.message || "An error occurred while fetching data.");
                setIsLoading(false);
            }
        }
    }, [firestoreInstance, path, docId, listen, JSON.stringify(queryConstraints), ...dependencies]);


    useEffect(() => {
        let isMounted = true;
        let unsubscribe = null;

        const executeFetch = async () => {
            const unsub = await fetchData(isMounted);
            if (listen && unsub && typeof unsub === 'function') {
                unsubscribe = unsub;
            }
        };
        
        executeFetch();

        return () => {
            isMounted = false;
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [fetchData, listen]); 

    const refetch = useCallback(() => {
        fetchData(true); 
    }, [fetchData]);

    return { data, isLoading, error, refetch };
}

export const firestoreQueryHelpers = {
    where,
    orderBy,
    limit: limit,
};

export default useFirestoreQuery;