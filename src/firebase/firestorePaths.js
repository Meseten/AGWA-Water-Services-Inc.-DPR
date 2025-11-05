export function usersCollectionPath() {
    return `users`;
}
export function userProfileDocumentPath(userId) {
    return `${usersCollectionPath()}/${userId}/profile/data`;
}
export function publicDataCollectionPath() {
    return `public/data`;
}
export function profilesCollectionPath() {
    return `${publicDataCollectionPath()}/profiles`;
}
export function supportTicketsCollectionPath() {
    return `${publicDataCollectionPath()}/support_tickets`;
}
export function supportTicketDocumentPath(ticketId) {
    return `${supportTicketsCollectionPath()}/${ticketId}`;
}
export function announcementsCollectionPath() {
    return `${publicDataCollectionPath()}/announcements`;
}
export function announcementDocumentPath(announcementId) {
    return `${announcementsCollectionPath()}/${announcementId}`;
}
export function systemSettingsDocumentPath() {
    return `${publicDataCollectionPath()}/system_config/settings`;
}
export function allBillsCollectionPath() {
    return `${publicDataCollectionPath()}/all_bills`;
}
export function allBillDocumentPath(billId) {
    return `${allBillsCollectionPath()}/${billId}`;
}
export function allMeterReadingsCollectionPath() {
    return `${publicDataCollectionPath()}/all_meter_readings`;
}
export function allMeterReadingDocumentPath(readingId) {
    return `${allMeterReadingsCollectionPath()}/${readingId}`;
}
export function meterRoutesCollectionPath() {
    return `${publicDataCollectionPath()}/meter_routes`;
}
export function serviceInterruptionsCollectionPath() {
    return `${publicDataCollectionPath()}/service_interruptions`;
}
export function serviceInterruptionDocumentPath(id) {
    return `${serviceInterruptionsCollectionPath()}/${id}`;
}