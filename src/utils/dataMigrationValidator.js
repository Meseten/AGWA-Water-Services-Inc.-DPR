import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { profilesCollectionPath, allBillsCollectionPath } from '../firebase/firestorePaths';

export const validateAndMigrateData = async () => {
    const logs = [];
    const batch = writeBatch(db);
    let operationCount = 0;

    try {
        const usersSnap = await getDocs(collection(db, profilesCollectionPath()));
        usersSnap.forEach(userDoc => {
            const data = userDoc.data();
            if (!data.accountNumber || typeof data.accountNumber !== 'string') {
                const fallbackAcc = `AGWA-MIG-${userDoc.id.substring(0, 5).toUpperCase()}`;
                batch.update(userDoc.ref, { accountNumber: fallbackAcc });
                logs.push(`Migrated user ${userDoc.id}: missing account number assigned ${fallbackAcc}`);
                operationCount++;
            }
        });

        const billsSnap = await getDocs(collection(db, allBillsCollectionPath()));
        billsSnap.forEach(billDoc => {
            const data = billDoc.data();
            let updates = {};
            if (data.amount < 0) updates.amount = 0;
            if (!data.status) updates.status = 'Unpaid';
            if (typeof data.consumption === 'string') updates.consumption = parseFloat(data.consumption);
            
            if (Object.keys(updates).length > 0) {
                batch.update(billDoc.ref, updates);
                logs.push(`Migrated bill ${billDoc.id}: adjusted structural inconsistencies.`);
                operationCount++;
            }
        });

        if (operationCount > 0) {
            await batch.commit();
            logs.push(`Successfully committed ${operationCount} document migrations.`);
        } else {
            logs.push("Database validation passed. No structural migrations required.");
        }
        
        return { success: true, logs };
    } catch (error) {
        return { success: false, error: error.message, logs };
    }
};