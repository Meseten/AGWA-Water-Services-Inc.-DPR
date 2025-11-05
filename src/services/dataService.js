import {
    doc, setDoc, getDoc, addDoc, collection, updateDoc,
    deleteDoc, query, where, getDocs, serverTimestamp,
    Timestamp, orderBy, writeBatch, getCountFromServer, arrayUnion, limit as firestoreLimit,
    FieldPath, documentId
} from 'firebase/firestore';
import {
    userProfileDocumentPath,
    supportTicketsCollectionPath, supportTicketDocumentPath,
    announcementsCollectionPath, announcementDocumentPath,
    systemSettingsDocumentPath,
    allBillsCollectionPath, allBillDocumentPath,
    allMeterReadingsCollectionPath, allMeterReadingDocumentPath,
    profilesCollectionPath,
    meterRoutesCollectionPath,
    serviceInterruptionsCollectionPath, serviceInterruptionDocumentPath
} from '../firebase/firestorePaths.js';
import * as billingService from './billingService.js';
import { determineServiceTypeAndRole } from '../utils/userUtils.js';

function handleFirestoreError(functionName, error) {
    console.error(`Firestore Error [${functionName}]:`, error);
    const code = error.code || 'unknown';
    const message = error.message || 'An unexpected error occurred.';
    let userFriendlyMessage = `An error occurred while ${functionName.replace(/([A-Z])/g, ' $1').toLowerCase()}. Code: ${code}.`;

    if (code === 'failed-precondition') {
        userFriendlyMessage = `Query failed: ${message}. This almost always means you are missing a Firestore index. Check the console logs (on your server or browser) for a link to create the required index.`;
    } else if (code === 'permission-denied') {
         userFriendlyMessage = `An error occurred: Permission denied. You don't have permission for this action. Please check your Firestore rules. (Function: ${functionName})`;
    } else {
         userFriendlyMessage = `An error occurred in ${functionName}: ${message} (Code: ${code}). Please check your connection or contact support if the issue persists.`;
    }
    return { success: false, error: userFriendlyMessage };
};

export async function batchUpdateTicketStatus(dbInstance, ticketIds, newStatus) {
    if (!ticketIds || ticketIds.length === 0) return { success: true };
    try {
        const batch = writeBatch(dbInstance);
        ticketIds.forEach(ticketId => {
            const ticketRef = doc(dbInstance, supportTicketDocumentPath(ticketId));
            batch.update(ticketRef, { status: newStatus, lastUpdatedAt: serverTimestamp() });
        });
        await batch.commit();
        return { success: true, count: ticketIds.length };
    } catch (error) {
        return handleFirestoreError('batch updating ticket status', error);
    }
};

export async function deleteUserProfile(dbInstance, userId) {
    if (!userId) return { success: false, error: "User ID is required." };
    try {
        const batch = writeBatch(dbInstance);
        const flatProfileRef = doc(dbInstance, profilesCollectionPath(), userId);
        const nestedProfileRef = doc(dbInstance, userProfileDocumentPath(userId));

        batch.delete(flatProfileRef);
        batch.delete(nestedProfileRef);

        await batch.commit();
        return { success: true };
    } catch (error) {
        return handleFirestoreError(`deleting user profile ${userId}`, error);
    }
};

async function deleteAllFromCollection(dbInstance, collectionPath) {
    try {
        const snapshot = await getDocs(query(collection(dbInstance, collectionPath), firestoreLimit(500)));
        if (snapshot.empty) return { success: true, count: 0 };

        let count = 0;
        let lastSnapshot = snapshot;
        while (!lastSnapshot.empty) {
            const batch = writeBatch(dbInstance);
            lastSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            count += lastSnapshot.size;
            
            if (lastSnapshot.size < 500) break;
            
            lastSnapshot = await getDocs(query(collection(dbInstance, collectionPath), firestoreLimit(500)));
        }
        
        return { success: true, count };
    } catch (error) {
        return handleFirestoreError(`deleting all from ${collectionPath}`, error);
    }
};

export function deleteAllTickets(dbInstance) { return deleteAllFromCollection(dbInstance, supportTicketsCollectionPath()); };
export function deleteAllBills(dbInstance) { return deleteAllFromCollection(dbInstance, allBillsCollectionPath()); };
export function deleteAllReadings(dbInstance) { return deleteAllFromCollection(dbInstance, allMeterReadingsCollectionPath()); };
export function deleteAllAnnouncements(dbInstance) { return deleteAllFromCollection(dbInstance, announcementsCollectionPath()); };
export function deleteAllInterruptions(dbInstance) { return deleteAllFromCollection(dbInstance, serviceInterruptionsCollectionPath()); };
export function deleteAllRoutes(dbInstance) { return deleteAllFromCollection(dbInstance, meterRoutesCollectionPath()); };
export async function deleteAllUsers(dbInstance) {
    try {
        const usersSnapshot = await getDocs(query(collection(dbInstance, profilesCollectionPath())));
        if (usersSnapshot.empty) return { success: true, count: 0 };

        const batch = writeBatch(dbInstance);
        usersSnapshot.docs.forEach(userDoc => {
            batch.delete(doc(dbInstance, profilesCollectionPath(), userDoc.id));
            batch.delete(doc(dbInstance, userProfileDocumentPath(userDoc.id)));
        });
        await batch.commit();
        return { success: true, count: usersSnapshot.size };
    } catch (error) {
        return handleFirestoreError('deleting all users', error);
    }
};

export async function linkAccountNumberToProfile(dbInstance, userId, accountNumber) {
    if (!accountNumber || !userId) {
        return { success: false, error: "User ID and Account Number required." };
    }
    const upperCaseAccountNumber = accountNumber.trim().toUpperCase();
    if (!upperCaseAccountNumber) {
        return { success: false, error: "Account Number cannot be empty." };
    }

    try {
        const profilesRef = collection(dbInstance, profilesCollectionPath());
        const q = query(profilesRef, where("accountNumber", "==", upperCaseAccountNumber));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { success: false, error: `Account Number "${upperCaseAccountNumber}" not found.` };
        }

        const masterAccountDoc = snapshot.docs[0];
        const masterAccountData = masterAccountDoc.data();
        const masterAccountId = masterAccountDoc.id;

        if (masterAccountId === userId) {
            return { success: true };
        }

        if (masterAccountData.uid && masterAccountData.uid !== userId) {
             return { success: false, error: "Account already linked to another user." };
        }

        const { role, serviceType } = determineServiceTypeAndRole(upperCaseAccountNumber);
        const profileUpdates = {
            uid: userId,
            accountNumber: upperCaseAccountNumber,
            role: role,
            serviceType: serviceType,
            meterSerialNumber: masterAccountData.meterSerialNumber || '',
            meterSize: masterAccountData.meterSize || '1/2"',
            serviceAddress: masterAccountData.serviceAddress || {},
        };

        const batch = writeBatch(dbInstance);
        batch.update(doc(dbInstance, profilesCollectionPath(), masterAccountId), profileUpdates);
        batch.update(doc(dbInstance, userProfileDocumentPath(userId)), profileUpdates);
        await batch.commit();

        return { success: true };

    } catch (error) {
        return handleFirestoreError('linking account number', error);
    }
};

export async function getUniqueServiceLocations(dbInstance) {
    try {
        const profilesRef = collection(dbInstance, profilesCollectionPath());
        const snapshot = await getDocs(profilesRef);
        const locations = new Set();
        snapshot.docs.forEach(doc => {
            const barangay = doc.data().serviceAddress?.barangay;
            if (barangay) locations.add(barangay);
        });
        return { success: true, data: Array.from(locations).sort() };
    } catch (error) {
        return handleFirestoreError('getting unique service locations', error);
    }
};

export async function getAccountsByLocation(dbInstance, location) {
    if (!location) return { success: true, data: [] };
    try {
        const profilesRef = collection(dbInstance, profilesCollectionPath());
        const q = query(profilesRef, where("serviceAddress.barangay", "==", location));
        const snapshot = await getDocs(q);
        const accounts = snapshot.docs.map(doc => doc.data().accountNumber).filter(Boolean);
        return { success: true, data: accounts };
    } catch (error) {
        return handleFirestoreError(`getting accounts in ${location}`, error);
    }
};

export async function createOrUpdateMeterRoute(dbInstance, routeData, routeId = null) {
    try {
        const data = { ...routeData, updatedAt: serverTimestamp() };
        if (routeId) {
            await updateDoc(doc(dbInstance, meterRoutesCollectionPath(), routeId), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(dbInstance, meterRoutesCollectionPath()), data);
        }
        return { success: true };
    } catch (error) {
        return handleFirestoreError('saving meter route', error);
    }
};

export async function getAllMeterRoutes(dbInstance) {
    try {
        const q = query(collection(dbInstance, meterRoutesCollectionPath()), orderBy("name", "asc"));
        const snapshot = await getDocs(q);
        return { success: true, data: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (error) {
        return handleFirestoreError('getting all meter routes', error);
    }
};

export async function deleteMeterRoute(dbInstance, routeId) {
    try {
        await deleteDoc(doc(dbInstance, meterRoutesCollectionPath(), routeId));
        return { success: true };
    } catch (error) {
        return handleFirestoreError('deleting meter route', error);
    }
};

export async function getAllMeterReaders(dbInstance) {
    try {
        const q = query(collection(dbInstance, profilesCollectionPath()), where("role", "==", "meter_reader"), orderBy("displayName", "asc"));
        const snapshot = await getDocs(q);
        return { success: true, data: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (error) {
        return handleFirestoreError('getting all meter readers', error);
    }
};

export async function getRevenueStats(dbInstance) {
    try {
        const paidBillsQuery = query(collection(dbInstance, allBillsCollectionPath()), where("status", "==", "Paid"));
        const snapshot = await getDocs(paidBillsQuery);
        const monthlyRevenue = {};
        snapshot.forEach(doc => {
            const bill = doc.data();
            const paymentDate = bill.paymentDate?.toDate ? bill.paymentDate.toDate() : null;
            if (!paymentDate) return;
            const monthYear = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            monthlyRevenue[monthYear] = (monthlyRevenue[monthYear] || 0) + (bill.amountPaid || 0);
        });
        const sortedRevenue = Object.entries(monthlyRevenue)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12);
        return { success: true, data: Object.fromEntries(sortedRevenue) };
    } catch (error) {
        return handleFirestoreError('getting revenue stats', error);
    }
};

export async function getRevenueByLocationStats(dbInstance) {
    try {
        const paidBillsQuery = query(collection(dbInstance, allBillsCollectionPath()), where("status", "==", "Paid"));
        const billsSnapshot = await getDocs(paidBillsQuery);
        if (billsSnapshot.empty) return { success: true, data: {} };

        const revenueByLocation = {};
        const userIds = [...new Set(billsSnapshot.docs.map(doc => doc.data().userId).filter(Boolean))];

        const userProfiles = {};
        for (let i = 0; i < userIds.length; i += 30) {
            const chunk = userIds.slice(i, i + 30);
            if (chunk.length === 0) continue;
            const usersQuery = query(collection(dbInstance, profilesCollectionPath()), where(documentId(), 'in', chunk));
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => userProfiles[doc.id] = doc.data());
        }

        billsSnapshot.forEach(doc => {
            const bill = doc.data();
            const userProfile = userProfiles[bill.userId];
            if (!userProfile) return;
            const location = userProfile.serviceAddress?.barangay || 'Unknown Barangay';
            revenueByLocation[location] = (revenueByLocation[location] || 0) + (bill.amountPaid || 0);
        });

        return { success: true, data: revenueByLocation };
    } catch (error) {
        return handleFirestoreError('getting revenue by location', error);
    }
};

export async function getOutstandingBalanceStats(dbInstance) {
    try {
        const unpaidBillsQuery = query(collection(dbInstance, allBillsCollectionPath()), where("status", "==", "Unpaid"));
        const snapshot = await getDocs(unpaidBillsQuery);
        let totalOutstanding = 0;
        snapshot.forEach(doc => {
            totalOutstanding += doc.data().amount || 0;
        });
        return { success: true, data: { totalOutstanding } };
    } catch (error) {
        return handleFirestoreError('getting outstanding balance', error);
    }
};


export async function getPaymentDayOfWeekStats(dbInstance) {
    try {
        const paidBillsQuery = query(collection(dbInstance, allBillsCollectionPath()), where("status", "==", "Paid"));
        const snapshot = await getDocs(paidBillsQuery);
        const dayCounts = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };
        const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        snapshot.forEach(doc => {
            const paymentDate = doc.data().paymentDate?.toDate ? doc.data().paymentDate.toDate() : null;
            if (paymentDate) {
                dayCounts[dayOrder[paymentDate.getDay()]]++;
            }
        });
        const orderedDayCounts = dayOrder.reduce((obj, day) => {
             obj[day] = dayCounts[day];
             return obj;
        }, {});
        return { success: true, data: orderedDayCounts };
    } catch (error) {
        return handleFirestoreError('getting payment day stats', error);
    }
};

export async function getReadingsCountByReaderForDate(dbInstance, readerId, dateString) {
    try {
        const q = query(collection(dbInstance, allMeterReadingsCollectionPath()),
            where("readerId", "==", readerId),
            where("readingDateString", "==", dateString)
        );
        const snapshot = await getCountFromServer(q);
        return { success: true, data: { count: snapshot.data().count } };
    } catch (error) {
        return handleFirestoreError('getting readings count by reader', error);
    }
};

export async function getAccountsInRoute(dbInstance, route) {
    const accountNumbers = route?.accountNumbers;
    if (!Array.isArray(accountNumbers) || accountNumbers.length === 0) {
        return { success: true, data: [] };
    }
    try {
        const profilesRef = collection(dbInstance, profilesCollectionPath());
        const fetchedProfiles = [];
        for (let i = 0; i < accountNumbers.length; i += 30) {
            const chunk = accountNumbers.slice(i, i + 30);
            if (chunk.length === 0) continue;
            const q = query(profilesRef, where('accountNumber', 'in', chunk));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => fetchedProfiles.push({ id: doc.id, ...doc.data() }));
        }
        return { success: true, data: fetchedProfiles };
    } catch (error) {
        return handleFirestoreError('getting accounts in route', error);
    }
};

export async function getUserProfile(dbInstance, userId) {
    if (!userId) return { success: false, error: "User ID required." };
    try {
        const docRef = doc(dbInstance, profilesCollectionPath(), userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
        } else {
            const nestedRef = doc(dbInstance, userProfileDocumentPath(userId));
            const nestedSnap = await getDoc(nestedRef);
            if (nestedSnap.exists()) {
                 return { success: true, data: { id: nestedSnap.id, ...nestedSnap.data() } };
            }
            return { success: false, error: "User profile not found." };
        }
    } catch (error) {
        return handleFirestoreError(`getting user profile ${userId}`, error);
    }
};

export async function searchUserProfiles(dbInstance, searchTerm) {
    const term = searchTerm?.trim().toLowerCase();
    if (!term) return { success: false, error: "Search term required." };
    const termUpper = searchTerm.trim().toUpperCase();

    try {
        const profilesRef = collection(dbInstance, profilesCollectionPath());
        const queries = [
            query(profilesRef, where('accountNumber', '==', termUpper)),
            query(profilesRef, where('email', '==', term)),
            query(profilesRef, where('meterSerialNumber', '==', termUpper)),
            query(profilesRef, orderBy('displayNameLower'), where('displayNameLower', '>=', term), where('displayNameLower', '<=', term + '\uf8ff'))
        ];

        const results = await Promise.allSettled(queries.map(q => getDocs(q)));

        const foundUsers = new Map();
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                result.value.forEach(doc => {
                    if (!foundUsers.has(doc.id)) {
                        foundUsers.set(doc.id, { id: doc.id, ...doc.data() });
                    }
                });
            } else {
                 console.error("Search query failed:", result.reason);
            }
        });

        return { success: true, data: Array.from(foundUsers.values()) };

    } catch (error) {
        return handleFirestoreError('searching user profiles', error);
    }
};

function formatDateSimple(date) { return date ? date.toLocaleDateString('en-CA') : 'N/A'; };

export async function generateBillForUser(dbInstance, userId, userProfile) {
     if (!userId || !userProfile) return { success: false, error: "User ID and profile required." };
    try {
        const settingsResult = await getSystemSettings(dbInstance);
        const systemSettings = settingsResult.success ? settingsResult.data : {};
        const gracePeriod = systemSettings.latePaymentPenaltyDelayDays || 15;

        const readingsQuery = query(
            collection(dbInstance, allMeterReadingsCollectionPath()),
            where("userId", "==", userId),
            orderBy("readingDate", "desc"),
            firestoreLimit(2)
        );
        const readingsSnapshot = await getDocs(readingsQuery);
        if (readingsSnapshot.docs.length < 2) {
            return { success: false, error: "At least two readings needed." };
        }
        const latestReadingDoc = readingsSnapshot.docs[0];
        const previousReadingDoc = readingsSnapshot.docs[1];
        const latestReading = latestReadingDoc.data();
        const previousReading = previousReadingDoc.data();

        const consumption = latestReading.readingValue - previousReading.readingValue;
        if (consumption < 0) {
            return { success: false, error: "Latest reading is lower than previous." };
        }

        const billDate = latestReading.readingDate.toDate();
        const billMonthYear = billDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const existingBillQuery = query(
            collection(dbInstance, allBillsCollectionPath()),
            where("userId", "==", userId),
            where("monthYear", "==", billMonthYear)
        );
        const existingBillSnapshot = await getDocs(existingBillQuery);
        if (!existingBillSnapshot.empty) {
            return { success: false, error: `Bill for ${billMonthYear} already exists.` };
        }

        const charges = billingService.calculateBillDetails(consumption, userProfile.serviceType, userProfile.meterSize, systemSettings);
        const currentCharges = charges.totalCalculatedCharges || 0;
        
        const seniorCitizenDiscount = (userProfile.discountStatus === 'verified') 
            ? parseFloat((currentCharges * 0.05).toFixed(2)) 
            : 0;

        let previousUnpaidAmount = 0;
        let penaltyAmount = 0;
        
        const prevBillQuery = query(
            collection(dbInstance, allBillsCollectionPath()),
            where("userId", "==", userId),
            where("status", "==", "Unpaid")
        );
        const prevBillSnapshot = await getDocs(prevBillQuery);
        
        if (!prevBillSnapshot.empty) {
             prevBillSnapshot.docs.forEach(doc => {
                const prevBill = doc.data();
                previousUnpaidAmount += (prevBill.amount || 0); 
             });
        }
        
        const totalAmountDue = currentCharges + previousUnpaidAmount - seniorCitizenDiscount;
        const dueDate = new Date(billDate);
        dueDate.setDate(dueDate.getDate() + gracePeriod);

        const newBill = {
            userId: userId,
            accountNumber: userProfile.accountNumber,
            userName: userProfile.displayName,
            billingPeriod: `${formatDateSimple(previousReading.readingDate.toDate())} - ${formatDateSimple(latestReading.readingDate.toDate())}`,
            monthYear: billMonthYear,
            billDate: Timestamp.fromDate(billDate),
            dueDate: Timestamp.fromDate(dueDate),
            previousReading: previousReading.readingValue,
            currentReading: latestReading.readingValue,
            consumption: consumption,
            ...charges,
            
            penaltyAmount: 0,
            previousUnpaidAmount: parseFloat(previousUnpaidAmount.toFixed(2)),
            seniorCitizenDiscount: parseFloat(seniorCitizenDiscount.toFixed(2)),
            
            amount: parseFloat(totalAmountDue.toFixed(2)),
            
            status: 'Unpaid',
            createdAt: serverTimestamp(),
            previousReadingId: previousReadingDoc.id,
            currentReadingId: latestReadingDoc.id,
        };
        
        const docRef = await addDoc(collection(dbInstance, allBillsCollectionPath()), newBill);
        const newInvoiceNumber = `AGWA-${docRef.id.slice(0,4).toUpperCase()}-${billDate.getFullYear()}${String(billDate.getMonth() + 1).padStart(2, '0')}${String(billDate.getDate()).padStart(2, '0')}`;
        await updateDoc(docRef, { billId: docRef.id, invoiceNumber: newInvoiceNumber });

        return { success: true, message: `Bill for ${billMonthYear} generated.`, billId: docRef.id };

    } catch (error) {
        return handleFirestoreError(`generating bill for ${userProfile?.accountNumber}`, error);
    }
};

export async function getBillableAccountsInLocation(dbInstance, location) {
    if (!location) return { success: false, error: "Location required." };
    try {
        const interruptionsRef = collection(dbInstance, serviceInterruptionsCollectionPath());
        const qInter = query(interruptionsRef, 
            where("affectedAreas", "array-contains", location), 
            where("status", "in", ["Scheduled", "Ongoing"]), 
            where("isBillingPaused", "==", true)
        );
        const interruptionSnap = await getDocs(qInter);

        if (!interruptionSnap.empty) {
            return { success: true, data: [] };
        }
    
        const accountsInLocQuery = query(collection(dbInstance, profilesCollectionPath()), where("serviceAddress.barangay", "==", location));
        const usersSnapshot = await getDocs(accountsInLocQuery);
        if (usersSnapshot.empty) return { success: true, data: [] };

        const billableAccounts = [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        for (const userDoc of usersSnapshot.docs) {
            const userProfile = { id: userDoc.id, ...userDoc.data() };
            if (!userProfile.accountNumber) continue;

            const readingsQuery = query(collection(dbInstance, allMeterReadingsCollectionPath()), where("userId", "==", userProfile.id), orderBy("readingDate", "desc"), firestoreLimit(2));
            const readingsSnapshot = await getDocs(readingsQuery);

            if (readingsSnapshot.docs.length < 2) continue;

            const latestReadingDate = readingsSnapshot.docs[0].data().readingDate.toDate();
            const billMonthYear = latestReadingDate.toLocaleString('default', { month: 'long', year: 'numeric' });

            const existingBillQuery = query(
                collection(dbInstance, allBillsCollectionPath()),
                where("userId", "==", userProfile.id),
                where("monthYear", "==", billMonthYear),
                 firestoreLimit(1)
            );
            const existingBillSnapshot = await getDocs(existingBillQuery);

            if (existingBillSnapshot.empty) {
                billableAccounts.push(userProfile);
            }
        }
        return { success: true, data: billableAccounts };
    } catch (error) {
        return handleFirestoreError(`getting billable accounts in ${location}`, error);
    }
};

export async function generateBillsForMultipleAccounts(dbInstance, accounts) {
    const logs = [];
    let successCount = 0;
    let failCount = 0;
    for (const account of accounts) {
        const result = await generateBillForUser(dbInstance, account.id, account);
        logs.push({ success: result.success, message: `${result.success ? 'SUCCESS' : 'FAILED'} [${account.accountNumber}]: ${result.message || result.error}` });
        if (result.success) successCount++; else failCount++;
    }
    return { logs, successCount, failCount };
};


export async function createUserProfile(dbInstance, userId, profileData) {
    if (!userId) return { success: false, error: "User ID required." };
    try {
        const batch = writeBatch(dbInstance);
        const dataForDb = {
            ...profileData,
            accountNumber: profileData.accountNumber ? profileData.accountNumber.toUpperCase() : '',
            uid: userId,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            displayNameLower: profileData.displayName ? profileData.displayName.toLowerCase() : '',
            rebatePoints: 0,
            rebateTier: 'Bronze',
            discountStatus: 'none', 
        };

        batch.set(doc(dbInstance, userProfileDocumentPath(userId)), dataForDb);
        batch.set(doc(dbInstance, profilesCollectionPath(), userId), dataForDb);

        await batch.commit();
        return { success: true };
    } catch (error) {
        return handleFirestoreError('creating user profile', error);
    }
};

export async function updateUserProfile(dbInstance, userId, profileUpdates) {
     if (!userId) return { success: false, error: "User ID required." };
    try {
        const batch = writeBatch(dbInstance);
        const dataForUpdate = { ...profileUpdates, updatedAt: serverTimestamp() };
        if (dataForUpdate.accountNumber) dataForUpdate.accountNumber = dataForUpdate.accountNumber.toUpperCase();
        if (dataForUpdate.displayName) dataForUpdate.displayNameLower = dataForUpdate.displayName.toLowerCase();

        if (profileUpdates.discountStatus !== undefined) {
            dataForUpdate.discountStatus = profileUpdates.discountStatus;
        }

        batch.update(doc(dbInstance, userProfileDocumentPath(userId)), dataForUpdate);
        batch.update(doc(dbInstance, profilesCollectionPath(), userId), dataForUpdate);

        await batch.commit();
        return { success: true };
    } catch (error) {
        return handleFirestoreError(`updating user profile ${userId}`, error);
    }
};

export async function getAllUsersProfiles(dbInstance) {
    try {
        const snapshot = await getDocs(query(collection(dbInstance, profilesCollectionPath()), orderBy("displayNameLower", "asc")));
        return { success: true, data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
    } catch (error) {
        return handleFirestoreError('getting all users profiles', error);
    }
};

export async function createSupportTicket(dbInstance, ticketData) {
    try {
        const docRef = await addDoc(collection(dbInstance, supportTicketsCollectionPath()), {
            ...ticketData,
            status: 'Open',
            submittedAt: serverTimestamp(),
            lastUpdatedAt: serverTimestamp(),
            conversation: []
        });
        await updateDoc(docRef, { ticketId: docRef.id });
        return { success: true, id: docRef.id };
    } catch (error) {
        return handleFirestoreError('creating support ticket', error);
    }
};

export async function deleteSupportTicket(dbInstance, ticketId) {
    try {
        await deleteDoc(doc(dbInstance, supportTicketDocumentPath(ticketId)));
        return { success: true };
    } catch (error) {
        return handleFirestoreError('deleting support ticket', error);
    }
};

export async function addTicketReply(dbInstance, ticketId, replyData) {
     if (!ticketId || !replyData?.text) return { success: false, error: "Ticket ID and reply text required." };
    try {
        const ticketRef = doc(dbInstance, supportTicketDocumentPath(ticketId));
        const updates = {
            conversation: arrayUnion(replyData),
            lastUpdatedAt: serverTimestamp(),
        };
        const ticketSnap = await getDoc(ticketRef);
        const currentStatus = ticketSnap.data()?.status;

        if (replyData.authorRole !== 'admin' && (currentStatus === 'Resolved' || currentStatus === 'Closed')) {
            updates.status = 'Open';
        } else if (replyData.authorRole === 'admin' && currentStatus === 'Open') {
             updates.status = 'In Progress';
        } else if (replyData.authorRole !== 'admin' && currentStatus === 'Awaiting Customer') {
            updates.status = 'In Progress';
        }

        await updateDoc(ticketRef, updates);
        return { success: true };
    } catch (error) {
        return handleFirestoreError('adding ticket reply', error);
    }
};

export async function getAllSupportTickets(dbInstance) {
    try {
        const q = query(collection(dbInstance, supportTicketsCollectionPath()), orderBy("lastUpdatedAt", "desc"));
        const snapshot = await getDocs(q);
        return { success: true, data: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (error) {
        return handleFirestoreError('getting all support tickets', error);
    }
};

export async function getTicketsByReporter(dbInstance, reporterId) {
    try {
        const q = query(collection(dbInstance, supportTicketsCollectionPath()), where("userId", "==", reporterId), orderBy("lastUpdatedAt", "desc"));
        const snapshot = await getDocs(q);
        return { success: true, data: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (error) {
        return handleFirestoreError('getting tickets by reporter', error);
    }
};

export async function updateSupportTicket(dbInstance, ticketId, updates) {
    try {
        await updateDoc(doc(dbInstance, supportTicketDocumentPath(ticketId)), { ...updates, lastUpdatedAt: serverTimestamp() });
        return { success: true };
    } catch (error) {
        return handleFirestoreError('updating support ticket', error);
    }
};

export async function createAnnouncement(dbInstance, data) {
    try {
        const docRef = await addDoc(collection(dbInstance, announcementsCollectionPath()), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        await updateDoc(docRef, { announcementId: docRef.id });
        return { success: true, id: docRef.id };
    } catch (error) {
        return handleFirestoreError('creating announcement', error);
    }
};

export async function getAllAnnouncements(dbInstance, onlyActive = false) {
    try {
        const constraints = onlyActive
            ? [where("status", "==", "active"), orderBy("startDate", "desc")]
            : [orderBy("createdAt", "desc")];
        const q = query(collection(dbInstance, announcementsCollectionPath()), ...constraints);
        const snapshot = await getDocs(q);
        return { success: true, data: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (error) {
        return handleFirestoreError('getting announcements', error);
    }
};

export async function updateAnnouncement(dbInstance, id, updates) {
    try {
        await updateDoc(doc(dbInstance, announcementDocumentPath(id)), { ...updates, updatedAt: serverTimestamp() });
        return { success: true };
    } catch (error) {
        return handleFirestoreError('updating announcement', error);
    }
};

export async function deleteAnnouncement(dbInstance, id) {
    try {
        await deleteDoc(doc(dbInstance, announcementDocumentPath(id)));
        return { success: true };
    } catch (error) {
        return handleFirestoreError('deleting announcement', error);
    }
};

export async function getSystemSettings(dbInstance) {
    try {
        const docSnap = await getDoc(doc(dbInstance, systemSettingsDocumentPath()));
        return { success: true, data: docSnap.exists() ? docSnap.data() : null };
    } catch (error) {
        return handleFirestoreError('getting system settings', error);
    }
};

export async function updateSystemSettings(dbInstance, settingsData) {
    try {
        await setDoc(doc(dbInstance, systemSettingsDocumentPath()), settingsData, { merge: true });
        return { success: true };
    } catch (error) {
        return handleFirestoreError('updating system settings', error);
    }
};

export async function getBillsForUser(dbInstance, userId) {
    try {
        const q = query(
            collection(dbInstance, allBillsCollectionPath()), 
            where("userId", "==", userId), 
            orderBy("billDate", "desc")
        );
        const snapshot = await getDocs(q);
        
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        return { success: true, data: data };
    } catch (error) {
        return handleFirestoreError('getting bills for user', error);
    }
};

async function awardRebatePoints(dbInstance, userId, bill, amountPaid, systemSettings) {
    if (!systemSettings?.isRebateProgramEnabled || !userId) {
        console.log(`dataService: Rebate program disabled or no user ID. Skipping points.`);
        return;
    }

    try {
        const pointsPerPeso = parseFloat(systemSettings.pointsPerPeso) || 0;
        const earlyPaymentDays = parseInt(systemSettings.earlyPaymentDaysThreshold, 10) || 7;
        const earlyPaymentBonus = parseInt(systemSettings.earlyPaymentBonusPoints, 10) || 10;

        let pointsToAward = (amountPaid * pointsPerPeso);

        const dueDate = bill.dueDate?.toDate ? bill.dueDate.toDate() : (bill.dueDate?.seconds ? new Date(bill.dueDate.seconds * 1000) : null);
        const paymentDate = new Date(); 
        
        if(dueDate) {
            const daysEarly = (dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysEarly >= earlyPaymentDays) {
                pointsToAward += earlyPaymentBonus;
                console.log(`dataService: Awarding ${earlyPaymentBonus} early payment bonus.`);
            }
        }

        const roundedPointsToAward = Math.round(pointsToAward);
        if (roundedPointsToAward <= 0) {
            console.log(`dataService: No points to award (rounded to ${roundedPointsToAward}).`);
            return;
        }

        const userProfileRef = doc(dbInstance, profilesCollectionPath(), userId);
        const userProfileSnap = await getDoc(userProfileRef);
        if (!userProfileSnap.exists()) {
            console.error(`dataService: User profile ${userId} not found. Cannot award points.`);
            return;
        }

        const currentPoints = userProfileSnap.data().rebatePoints || 0;
        const newTotalPoints = currentPoints + roundedPointsToAward;

        let newTier = 'Bronze';
        if (newTotalPoints >= 3000) newTier = 'Platinum';
        else if (newTotalPoints >= 1500) newTier = 'Gold';
        else if (newTotalPoints >= 500) newTier = 'Silver';

        const updates = {
            rebatePoints: newTotalPoints,
            rebateTier: newTier
        };

        const batch = writeBatch(dbInstance);
        batch.update(userProfileRef, updates);
        batch.update(doc(dbInstance, userProfileDocumentPath(userId)), updates);
        await batch.commit();
        console.log(`dataService: Awarded ${roundedPointsToAward} points to ${userId}. New total: ${newTotalPoints}`);

    } catch (error) {
        console.error("dataService: Failed to award rebate points:", error);
    }
};

export async function updateBill(dbInstance, billId, updates) {
    try {
        const billRef = doc(dbInstance, allBillDocumentPath(billId));
        
        const actualAmountPaid = updates.amountPaid; 

        if (updates.status === 'Paid') {
            const billSnap = await getDoc(billRef);
            if (billSnap.exists()) {
                const bill = billSnap.data();
                const today = new Date();
                const dueDate = bill.dueDate?.toDate ? bill.dueDate.toDate() : null;
                
                if (dueDate && today > dueDate && !bill.penaltyAmount) {
                    const settingsSnap = await getDoc(doc(dbInstance, systemSettingsDocumentPath()));
                    const settings = settingsSnap.exists() ? settingsSnap.data() : {};
                    const penaltyRate = (settings.latePaymentPenaltyPercentage || 2.0) / 100;
                    const currentCharges = bill.totalCalculatedCharges || 0;
                    
                    if (currentCharges > 0 && penaltyRate > 0) {
                        updates.penaltyAmount = parseFloat((currentCharges * penaltyRate).toFixed(2));
                        updates.amount = (bill.amount || 0) + updates.penaltyAmount;
                        
                        if (!updates.amountPaid || updates.amountPaid < updates.amount) {
                            updates.amountPaid = updates.amount;
                        }
                    }
                }

                if (bill.userId && actualAmountPaid > 0) {
                    const settingsSnap = await getDoc(doc(dbInstance, systemSettingsDocumentPath()));
                    const settings = settingsSnap.exists() ? settingsSnap.data() : {};
                    
                    await awardRebatePoints(dbInstance, bill.userId, bill, actualAmountPaid, settings);
                }
            }
        }
        
        await updateDoc(billRef, { ...updates, lastUpdatedAt: serverTimestamp() });
        return { success: true };
    } catch (error) {
        return handleFirestoreError('updating bill', error);
    }
};


export async function addMeterReading(dbInstance, readingData) {
    try {
        const readingDateObj = new Date(readingData.readingDate);
        if (isNaN(readingDateObj)) throw new Error("Invalid reading date format.");
        const dataToSave = {
             ...readingData,
             readingValue: parseFloat(readingData.readingValue) || 0,
             readingDate: Timestamp.fromDate(readingDateObj),
             readingDateString: readingData.readingDate,
             recordedAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(dbInstance, allMeterReadingsCollectionPath()), dataToSave);
        await updateDoc(docRef, { readingId: docRef.id });
        return { success: true, id: docRef.id };
    } catch (error) {
        return handleFirestoreError('adding meter reading', error);
    }
};

export async function updateMeterReading(dbInstance, readingId, updates) {
    try {
        const readingRef = doc(dbInstance, allMeterReadingDocumentPath(readingId));
        const dataToUpdate = { ...updates, lastUpdatedAt: serverTimestamp() };
        if (dataToUpdate.readingDate && typeof dataToUpdate.readingDate === 'string') {
            const dateObj = new Date(dataToUpdate.readingDate);
            if (!isNaN(dateObj)) {
                dataToUpdate.readingDate = Timestamp.fromDate(dateObj);
                dataToUpdate.readingDateString = dataToUpdate.readingDate;
            } else {
                 delete dataToUpdate.readingDate;
                 delete dataToUpdate.readingDateString;
            }
        }
         if (dataToUpdate.readingValue !== undefined) {
             dataToUpdate.readingValue = parseFloat(dataToUpdate.readingValue) || 0;
         }

        await updateDoc(readingRef, dataToUpdate);
        return { success: true };
    } catch (error) {
        return handleFirestoreError('updating meter reading', error);
    }
};

export async function deleteMeterReading(dbInstance, readingId) {
    try {
        await deleteDoc(doc(dbInstance, allMeterReadingDocumentPath(readingId)));
        return { success: true };
    } catch (error) {
        return handleFirestoreError('deleting meter reading', error);
    }
};

export async function getMeterReadingsForAccount(dbInstance, accountNumber) {
    try {
        const q = query(collection(dbInstance, allMeterReadingsCollectionPath()), where("accountNumber", "==", accountNumber), orderBy("readingDate", "desc"));
        const snapshot = await getDocs(q);
        return { success: true, data: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (error) {
        return handleFirestoreError('getting meter readings for account', error);
    }
};

export async function getRoutesForReader(dbInstance, readerId) {
    try {
        const q = query(collection(dbInstance, meterRoutesCollectionPath()), where("assignedReaderId", "==", readerId), orderBy("name"));
        const snapshot = await getDocs(q);
        return { success: true, data: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (error) {
        return handleFirestoreError('getting routes for reader', error);
    }
};

export async function getDocuments(dbInstance, collectionPath, queryConstraints = []) {
    try {
        const q = query(collection(dbInstance, collectionPath), ...queryConstraints);
        const snapshot = await getDocs(q);
        return { success: true, data: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (error) {
        return handleFirestoreError(`getting documents from ${collectionPath.split('/').pop()}`, error);
    }
};

export async function getUsersStats(dbInstance) {
    try {
        const profilesRef = collection(dbInstance, profilesCollectionPath());
        const totalSnapshot = await getCountFromServer(profilesRef);
        const allProfilesSnapshot = await getDocs(profilesRef);
        const byRole = allProfilesSnapshot.docs.reduce((acc, doc) => {
            const role = doc.data().role || 'unknown';
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {});
        return { success: true, data: { total: totalSnapshot.data().count, byRole } };
    } catch(e) {
        return handleFirestoreError('getting users stats', e);
    }
};

export async function getTicketsStats(dbInstance) {
    try {
        const ticketsRef = collection(dbInstance, supportTicketsCollectionPath());
        const q = query(ticketsRef, orderBy("lastUpdatedAt", "desc"));
        const snapshot = await getDocs(q);
        
        let openCount = 0;
        const stats = {
            total: snapshot.size,
            byStatus: {},
            byType: {}
        };

        snapshot.forEach(doc => {
            const ticket = doc.data();
            const status = ticket.status || 'Unknown';
            const type = ticket.issueType || 'Other Concern';

            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
            stats.byType[type] = (stats.byType[type] || 0) + 1;
            
            if (status !== 'Closed' && status !== 'Resolved') {
                openCount++;
            }
        });
        
        stats.openCount = openCount;
        return { success: true, data: stats };
    } catch(e) {
        return handleFirestoreError('getting tickets stats', e);
    }
};


export async function getAnnouncementsStats(dbInstance) {
    try {
        const annRef = collection(dbInstance, announcementsCollectionPath());
        const totalSnapshot = await getCountFromServer(annRef);
        const activeQuery = query(annRef, where('status', '==', 'active'));
        const activeSnapshot = await getCountFromServer(activeQuery);
        return { success: true, data: { total: totalSnapshot.data().count, active: activeSnapshot.data().count } };
    } catch(e) {
        return handleFirestoreError('getting announcements stats', e);
    }
};

export async function getPaymentsByClerkForToday(dbInstance, clerkId) {
    if (!clerkId) return { success: false, error: "Clerk ID required." };
    try {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
        const startOfDayTs = Timestamp.fromDate(startOfDay);
        const endOfDayTs = Timestamp.fromDate(endOfDay);

        const q = query(collection(dbInstance, allBillsCollectionPath()),
            where("processedByClerkId", "==", clerkId),
            where("paymentTimestamp", ">=", startOfDayTs),
            where("paymentTimestamp", "<=", endOfDayTs)
        );

        const snapshot = await getDocs(q);
        let totalCollected = 0;
        const transactions = snapshot.docs.map(doc => {
            const data = doc.data();
            totalCollected += data.amountPaid || 0;
            return { id: doc.id, ...data };
        });

        return {
            success: true,
            data: {
                paymentsTodayCount: snapshot.size,
                totalCollectedToday: totalCollected,
                transactions: transactions.sort((a,b) => b.paymentTimestamp.toDate() - a.paymentTimestamp.toDate())
            }
        };
    } catch (error) {
        return handleFirestoreError('getting payments by clerk for today', error);
    }
};

export async function createServiceInterruption(dbInstance, data) {
    try {
        const docRef = await addDoc(collection(dbInstance, serviceInterruptionsCollectionPath()), {
            ...data,
            startDate: Timestamp.fromDate(new Date(data.startDate)),
            estimatedEndDate: data.estimatedEndDate ? Timestamp.fromDate(new Date(data.estimatedEndDate)) : null,
            isBillingPaused: data.isBillingPaused || false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        await updateDoc(docRef, { interruptionId: docRef.id });
        return { success: true, id: docRef.id };
    } catch (error) {
        return handleFirestoreError('creating service interruption', error);
    }
};

export async function updateServiceInterruption(dbInstance, id, updates) {
    try {
        const dataToUpdate = { ...updates, updatedAt: serverTimestamp() };
        if (dataToUpdate.startDate && typeof dataToUpdate.startDate === 'string') dataToUpdate.startDate = Timestamp.fromDate(new Date(dataToUpdate.startDate));
        if (dataToUpdate.estimatedEndDate && typeof dataToUpdate.estimatedEndDate === 'string') dataToUpdate.estimatedEndDate = Timestamp.fromDate(new Date(dataToUpdate.estimatedEndDate));
        if (dataToUpdate.status === 'Resolved' && !dataToUpdate.resolvedAt) dataToUpdate.resolvedAt = serverTimestamp();

        await updateDoc(doc(dbInstance, serviceInterruptionDocumentPath(id)), dataToUpdate);
        return { success: true };
    } catch (error) {
        return handleFirestoreError('updating service interruption', error);
    }
};

export async function deleteServiceInterruption(dbInstance, id) {
    try {
        await deleteDoc(doc(dbInstance, serviceInterruptionDocumentPath(id)));
        return { success: true };
    } catch (error) {
        return handleFirestoreError('deleting service interruption', error);
    }
};

export async function getActiveServiceInterruptions(dbInstance) {
    try {
        const now = Timestamp.now();
        const q = query(collection(dbInstance, serviceInterruptionsCollectionPath()),
            where('status', 'in', ['Ongoing', 'Scheduled']),
            orderBy('startDate', 'desc')
        );
        const snapshot = await getDocs(q);
        const activeInterrupts = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(item => {
                if (item.status === 'Scheduled' && item.startDate.toMillis() > now.toMillis()) return true;
                if (item.status === 'Ongoing') {
                    if (!item.estimatedEndDate) return true;
                    return item.estimatedEndDate.toMillis() > now.toMillis();
                }
                if (item.status !== 'Resolved' && item.startDate.toMillis() <= now.toMillis()) {
                    if (!item.estimatedEndDate) return true;
                    if (item.estimatedEndDate.toMillis() > now.toMillis()) return true;
                }
                
                return false;
             });

        return { success: true, data: activeInterrupts };
    } catch (error) {
        return handleFirestoreError('getting active service interruptions', error);
    }
};

export async function getAllServiceInterruptions(dbInstance) {
    try {
        const q = query(collection(dbInstance, serviceInterruptionsCollectionPath()),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return { success: true, data: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (error) {
        return handleFirestoreError('getting all service interruptions', error);
    }
};


export { serverTimestamp, Timestamp };
export async function getHourlyActivityStats(dbInstance) {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfTodayTs = Timestamp.fromDate(startOfToday);

        const [ticketsSnap, readingsSnap, paymentsSnap] = await Promise.all([
            getDocs(query(collection(dbInstance, supportTicketsCollectionPath()), where("submittedAt", ">=", startOfTodayTs))),
            getDocs(query(collection(dbInstance, allMeterReadingsCollectionPath()), where("recordedAt", ">=", startOfTodayTs))),
            getDocs(query(collection(dbInstance, allBillsCollectionPath()), where("paymentTimestamp", ">=", startOfTodayTs)))
        ]);

        const hourlyData = Array(24).fill(0).map(() => ({ tickets: 0, readings: 0, payments: 0 }));

        ticketsSnap.forEach(doc => {
            const hour = doc.data().submittedAt.toDate().getHours();
            hourlyData[hour].tickets++;
        });
        readingsSnap.forEach(doc => {
            const hour = doc.data().recordedAt.toDate().getHours();
            hourlyData[hour].payments++;
        });
        paymentsSnap.forEach(doc => {
            const hour = doc.data().paymentTimestamp.toDate().getHours();
            hourlyData[hour].payments++;
        });

        return { success: true, data: hourlyData };
    } catch (error) {
        return handleFirestoreError('getting hourly activity stats', error);
    }
};

export async function getStaffActivityStats(dbInstance) {
    try {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const startOfTodayTs = Timestamp.fromDate(startOfDay);

        const [readersSnap, clerksSnap, adminTicketsSnap] = await Promise.all([
            getDocs(query(collection(dbInstance, allMeterReadingsCollectionPath()), where("recordedAt", ">=", startOfTodayTs))),
            getDocs(query(collection(dbInstance, allBillsCollectionPath()), where("paymentTimestamp", ">=", startOfTodayTs), where("processedByClerkId", ">", ""))),
            getDocs(query(collection(dbInstance, supportTicketsCollectionPath()), where("lastUpdatedAt", ">=", startOfTodayTs)))
        ]);

        const readerActivity = readersSnap.docs.reduce((acc, doc) => {
            const reader = doc.data().readBy || 'Unknown Reader';
            acc[reader] = (acc[reader] || 0) + 1;
            return acc;
        }, {});

        const clerkActivity = clerksSnap.docs.reduce((acc, doc) => {
            const clerk = doc.data().processedByClerkName || 'Unknown Clerk';
            acc[clerk] = (acc[clerk] || 0) + 1;
            return acc;
        }, {});

        const adminActivity = adminTicketsSnap.docs.reduce((acc, doc) => {
            const data = doc.data();
            if (data.status === 'Resolved' || data.status === 'Closed') {
                const admin = data.lastUpdatedByAdminName || 'Unknown Admin';
                acc[admin] = (acc[admin] || 0) + 1;
            }
            return acc;
        }, {});

        return { success: true, data: { readerActivity, clerkActivity, adminActivity } };
    } catch (error) {
        return handleFirestoreError('getting staff activity stats', error);
    }
};

export async function getTechnicalStats(dbInstance) {
    try {
        const [routesSnap, interruptionsSnap, unassignedRoutesSnap] = await Promise.all([
            getDocs(collection(dbInstance, meterRoutesCollectionPath())),
            getDocs(query(collection(dbInstance, serviceInterruptionsCollectionPath()), where("status", "in", ["Scheduled", "Ongoing"]))),
            getDocs(query(collection(dbInstance, meterRoutesCollectionPath()), where("assignedReaderId", "==", "")))
        ]);

        const totalRoutes = routesSnap.size;
        const totalAccounts = routesSnap.docs.reduce((sum, doc) => sum + (doc.data().accountNumbers?.length || 0), 0);
        const activeInterrupts = interruptionsSnap.size;
        const unassignedRoutes = unassignedRoutes.size;

        return { success: true, data: { totalRoutes, totalAccounts, activeInterrupts, unassignedRoutes } };
    } catch (error) {
        return handleFirestoreError('getting technical stats', error);
    }
};
export async function getConsumptionStats(dbInstance) {
    try {
        const billsQuery = query(collection(dbInstance, allBillsCollectionPath()));
        const snapshot = await getDocs(billsQuery);
        const monthlyConsumption = {};
        snapshot.forEach(doc => {
            const bill = doc.data();
            const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : null;
            if (!billDate || typeof bill.consumption !== 'number') return;
            
            const monthYear = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
            monthlyConsumption[monthYear] = (monthlyConsumption[monthYear] || 0) + (bill.consumption || 0);
        });
        const sortedConsumption = Object.entries(monthlyConsumption)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12);
        return { success: true, data: Object.fromEntries(sortedConsumption) };
    } catch (error) {
        return handleFirestoreError('getting consumption stats', error);
    }
};

export async function getPaymentMethodStats(dbInstance) {
    try {
        const paidBillsQuery = query(collection(dbInstance, allBillsCollectionPath()), where("status", "==", "Paid"));
        const snapshot = await getDocs(paidBillsQuery);
        const methodCounts = {};
        snapshot.forEach(doc => {
            const method = doc.data().paymentMethod || 'Unknown';
            methodCounts[method] = (methodCounts[method] || 0) + 1;
        });
        return { success: true, data: methodCounts };
    } catch (error) {
        return handleFirestoreError('getting payment method stats', error);
    }
};

export async function getUserGrowthStats(dbInstance) {
    try {
        const profilesQuery = query(collection(dbInstance, profilesCollectionPath()), where("createdAt", "!=", null));
        const snapshot = await getDocs(profilesQuery);
        const monthlySignups = {};
        snapshot.forEach(doc => {
            const profile = doc.data();
            const joinDate = profile.createdAt?.toDate ? profile.createdAt.toDate() : null;
            if (!joinDate) return;
            
            const monthYear = `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, '0')}`;
            monthlySignups[monthYear] = (monthlySignups[monthYear] || 0) + 1;
        });
        const sortedSignups = Object.entries(monthlySignups)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12);
        return { success: true, data: Object.fromEntries(sortedSignups) };
    } catch (error) {
        return handleFirestoreError('getting user growth stats', error);
    }
};

export async function getDiscountStats(dbInstance) {
    try {
        const profilesRef = collection(dbInstance, profilesCollectionPath());
        const snapshot = await getDocs(query(profilesRef, where("role", "==", "customer")));
        
        const stats = {
            none: 0,
            pending: 0,
            verified: 0
        };

        snapshot.forEach(doc => {
            const status = doc.data().discountStatus || 'none';
            if (stats.hasOwnProperty(status)) {
                stats[status]++;
            }
        });
        
        return { success: true, data: stats };
    } catch(e) {
        return handleFirestoreError('getting discount stats', e);
    }
};