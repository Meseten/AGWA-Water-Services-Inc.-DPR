import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { allBillsCollectionPath } from '../firebase/firestorePaths';

export const mwdTariffRates = {
    'Residential': { min: 185.00, t11_20: 19.80, t21_30: 21.45, t31_40: 23.70, t41_50: 26.45, t51_up: 29.75 },
    'Government': { min: 185.00, t11_20: 19.80, t21_30: 21.45, t31_40: 23.70, t41_50: 26.45, t51_up: 29.75 },
    'Commercial': { min: 370.00, t11_20: 39.60, t21_30: 42.90, t31_40: 47.40, t41_50: 52.90, t51_up: 59.50 },
    'Commercial A': { min: 323.75, t11_20: 34.65, t21_30: 37.54, t31_40: 41.48, t41_50: 46.28, t51_up: 52.06 },
    'Commercial B': { min: 277.50, t11_20: 29.70, t21_30: 32.18, t31_40: 35.55, t41_50: 39.67, t51_up: 44.62 },
    'Commercial C': { min: 231.25, t11_20: 24.75, t21_30: 26.81, t31_40: 29.62, t41_50: 33.06, t51_up: 37.18 }
};

export const calculateWaterBill = (consumption, serviceType, discountStatus, previousBalance = 0) => {
    const rates = mwdTariffRates[serviceType] || mwdTariffRates['Residential'];
    let currentCharges = 0;

    if (consumption <= 10) {
        currentCharges = rates.min;
    } else {
        currentCharges += rates.min;
        let remaining = consumption - 10;

        if (remaining > 0) {
            const t11_20 = Math.min(remaining, 10);
            currentCharges += t11_20 * rates.t11_20;
            remaining -= t11_20;
        }
        if (remaining > 0) {
            const t21_30 = Math.min(remaining, 10);
            currentCharges += t21_30 * rates.t21_30;
            remaining -= t21_30;
        }
        if (remaining > 0) {
            const t31_40 = Math.min(remaining, 10);
            currentCharges += t31_40 * rates.t31_40;
            remaining -= t31_40;
        }
        if (remaining > 0) {
            const t41_50 = Math.min(remaining, 10);
            currentCharges += t41_50 * rates.t41_50;
            remaining -= t41_50;
        }
        if (remaining > 0) {
            currentCharges += remaining * rates.t51_up;
        }
    }

    let discountAmount = 0;
    if (discountStatus === 'Senior Citizen' && consumption <= 30) {
        discountAmount = currentCharges * 0.05;
    }

    const netCurrentCharges = currentCharges - discountAmount;
    const totalDueBeforePenalty = netCurrentCharges + previousBalance;

    return {
        baseCharge: rates.min,
        consumptionCharge: currentCharges - rates.min,
        totalCurrentCharges: parseFloat(currentCharges.toFixed(2)),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        netCurrentCharges: parseFloat(netCurrentCharges.toFixed(2)),
        previousBalance: parseFloat(previousBalance.toFixed(2)),
        totalDueBeforePenalty: parseFloat(totalDueBeforePenalty.toFixed(2))
    };
};

export const applyPenaltyToOverdueBills = async () => {
    const today = new Date();
    const billsRef = collection(db, allBillsCollectionPath());
    const q = query(billsRef, where("status", "==", "Unpaid"));
    
    try {
        const snapshot = await getDocs(q);
        const updates = [];
        
        snapshot.forEach((billDoc) => {
            const billData = billDoc.data();
            const dueDate = billData.dueDate?.toDate ? billData.dueDate.toDate() : null;
            
            if (dueDate && today > dueDate && (!billData.penaltyAmount || billData.penaltyAmount === 0)) {
                const penaltyRate = 0.15;
                const currentCharges = billData.netCurrentCharges || billData.currentCharges || 0;
                const previousBalance = billData.previousBalance || 0;
                const totalDue = currentCharges + previousBalance;
                
                if (totalDue > 0) {
                    const penaltyAmount = parseFloat((totalDue * penaltyRate).toFixed(2));
                    const newTotalDue = totalDue + penaltyAmount;
                    
                    updates.push(
                        updateDoc(doc(db, allBillsCollectionPath(), billDoc.id), {
                            penaltyAmount: penaltyAmount,
                            totalAmountDue: newTotalDue,
                            updatedAt: serverTimestamp(),
                            penaltyAppliedAt: serverTimestamp()
                        })
                    );
                }
            }
        });
        
        await Promise.all(updates);
        return { success: true, updatedCount: updates.length };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const calculateBillDetails = (consumption, serviceType, meterSize, systemSettings) => {
    const bill = calculateWaterBill(consumption, serviceType, 'none', 0);
    
    return {
        baseCharge: bill.baseCharge,
        consumptionCharge: bill.consumptionCharge,
        totalCalculatedCharges: bill.totalCurrentCharges 
    };
};