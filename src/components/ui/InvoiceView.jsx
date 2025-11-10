import React from 'react';
import Modal from './Modal';
import { Printer, X, Download, FileText } from 'lucide-react';
import { formatDate } from '../../utils/userUtils';
import Barcode from './Barcode.jsx';
import DOMPurify from 'dompurify';

const InvoiceView = ({
    isOpen,
    onClose,
    bill,
    userData,
    calculateBillDetails,
    showNotification,
    systemSettings = {}
}) => {
    if (!isOpen || !bill || !userData) return null;

    const charges = bill.calculatedCharges || calculateBillDetails(
        bill.consumption,
        userData.serviceType,
        userData.meterSize || '1/2"'
    );
    
    const penaltyRate = (systemSettings.latePaymentPenaltyPercentage || 2.0) / 100;
    
    const totalCurrentCharges = parseFloat(bill.totalCalculatedCharges?.toFixed(2) || 0);
    const previousUnpaidAmount = parseFloat((bill.previousUnpaidAmount || 0).toFixed(2));
    const existingPenalty = parseFloat((bill.penaltyAmount || 0).toFixed(2));
    const seniorCitizenDiscount = parseFloat((bill.seniorCitizenDiscount || 0).toFixed(2));

    const baseAmount = bill.baseAmount || (totalCurrentCharges + previousUnpaidAmount + existingPenalty - seniorCitizenDiscount);
    const potentialPenalty = bill.potentialPenalty || 0;
    
    const amountDueAfterDate = baseAmount + potentialPenalty;
    
    const finalTotalAmount = (bill.amount || 0).toFixed(2);

    const billDateObj = bill.billDate?.toDate ? bill.billDate.toDate() : null;
    const formattedDateForInvoiceNum = billDateObj ? `${billDateObj.getFullYear()}${String(billDateObj.getMonth() + 1).padStart(2, '0')}${String(billDateObj.getDate()).padStart(2, '0')}` : Date.now().toString().slice(-6);
    const invoiceNumber = bill.invoiceNumber || `AGWA-${bill.id?.slice(0,4).toUpperCase()}-${formattedDateForInvoiceNum}`;

    const formatAddressToString = (addressObj) => {
        if (!addressObj || typeof addressObj !== 'object') return addressObj || 'N/A';
        const parts = [addressObj.street, addressObj.barangay, addressObj.district, "Naic, Cavite"];
        return parts.filter(p => p && p.trim()).join(', ');
    };

    const handlePrint = () => {
        const printableContent = document.getElementById('invoice-content-to-print-modal-fullscreen');
        const printStyles = document.getElementById('invoice-print-styles');
        
        if (!printableContent || !printStyles) {
            showNotification("Print content not found.", "error");
            return;
        }

        const printWindow = window.open('', '_blank', 'height=800,width=1000,scrollbars=yes');
        printWindow.document.write('<html><head><title>AGWA Invoice ' + invoiceNumber + '</title>');
        
        printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
        
        const styleSheet = printWindow.document.createElement('style');
        styleSheet.innerHTML = printStyles.innerHTML;
        printWindow.document.head.appendChild(styleSheet);
        
        printWindow.document.write('</head><body>');
        printWindow.document.write(printableContent.innerHTML);
        
        printWindow.document.write(`
            <script>
                window.onload = function() {
                    // Give Tailwind time to load
                    setTimeout(function() {
                        window.print();
                        window.close();
                    }, 1000); 
                };
            </script>
        `);
        
        printWindow.document.write('</body></html>');
        printWindow.document.close();
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="full" modalDialogClassName="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl w-[95vw] h-[95vh]" contentClassName="p-0 bg-gray-200">
            <style id="invoice-print-styles" dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0.4in; /* Reduced page margin */
                    }
                    body { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 9pt; /* Reduced base font size */
                    }
                }
                .invoice-container-print {
                    width: 100%;
                    max-width: 210mm;
                    /* min-height removed to prevent extra page */
                    margin: 0 auto;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    position: relative;
                    font-family: 'Times New Roman', Times, serif;
                    color: #000;
                    padding: 0.5rem; /* Reduced container padding */
                    display: flex;
                    flex-direction: column;
                }
                .invoice-body-print {
                    flex-grow: 1;
                }
                .paid-stamp-print {
                    position: absolute;
                    top: 35%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-25deg);
                    color: rgba(220, 38, 38, 0.15) !important;
                    border: 8px double rgba(220, 38, 38, 0.15) !important;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-family: 'Arial', sans-serif;
                    text-align: center;
                    opacity: 1;
                    z-index: 10;
                    pointer-events: none;
                }
                .paid-stamp-main-print { font-size: 3.5rem; font-weight: 700; line-height: 1; }
                .paid-stamp-date-print { font-size: 1rem; font-weight: 600; margin-top: 4px; display: block; }
                
                .invoice-header-print {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding-bottom: 0.5rem; /* Reduced */
                    border-bottom: 3px solid #1e3a8a;
                }
                .invoice-header-print .logo-print { font-size: 2.2rem; font-weight: bold; color: #1e3a8a !important; line-height: 1; }
                .invoice-header-print .tagline-print { font-size: 0.75rem; color: #1d4ed8 !important; font-style: italic; }
                .invoice-header-print .company-address-print { text-align: right; font-size: 0.75rem; line-height: 1.3; color: #374151; }
                
                .invoice-title-print { text-align: center; margin: 0.75rem 0; } /* Reduced */
                .invoice-title-print h1 { font-size: 1.5rem; font-weight: 700; margin: 0; } /* Reduced */
                .invoice-title-print p { font-size: 0.85rem; margin: 0; }
                
                .invoice-details-grid-print {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem; /* Reduced */
                }
                .invoice-box-print { border: 1px solid #d1d5db; border-radius: 6px; }
                .invoice-box-print h2 {
                    background-color: #f3f4f6 !important;
                    padding: 0.3rem 0.6rem; /* Reduced */
                    font-size: 0.85rem;
                    font-weight: 700;
                    border-bottom: 1px solid #d1d5db;
                    margin: 0;
                }
                .invoice-box-print div { padding: 0.6rem; font-size: 0.85rem; } /* Reduced */
                .invoice-box-print .detail-row { display: flex; justify-content: space-between; padding: 0.2rem 0; border-bottom: 1px dashed #e5e7eb; } /* Reduced */
                .invoice-box-print .detail-row span:first-child { color: #4b5563; padding-right: 5px; }
                .invoice-box-print .detail-row span:last-child { font-weight: 600; text-align: right; }
                
                .invoice-table-print { width: 100%; margin: 1rem 0; border-collapse: collapse; } /* Reduced */
                .invoice-table-print th, .invoice-table-print td { border: 1px solid #d1d5db; padding: 0.3rem 0.5rem; font-size: 0.85rem; } /* Reduced */
                .invoice-table-print th { background-color: #f3f4f6 !important; text-align: left; }
                .invoice-table-print td:last-child { text-align: right; }
                
                .invoice-totals-print {
                    width: 60%; /* Slightly wider */
                    margin-left: auto;
                    font-size: 0.85rem;
                }
                .invoice-totals-print .detail-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.3rem 0; /* Reduced */
                }
                .invoice-totals-print .detail-row span:first-child { color: #4b5563; }
                .invoice-totals-print .detail-row span:last-child { font-weight: 600; text-align: right; }
                .invoice-totals-print .grand-total-print {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem 0.7rem; /* Reduced */
                    margin-top: 0.3rem;
                    background-color: #f3f4f6 !important;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    font-size: 0.9rem;
                }
                .invoice-totals-print .grand-total-print-final {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem 0.7rem; /* Reduced */
                    margin-top: 0.25rem;
                    background-color: #1e3a8a !important;
                    color: white !important;
                    border-radius: 4px;
                    font-size: 1rem;
                }
                .due-date-text-print {
                    text-align: right;
                    font-weight: bold;
                    margin-top: 2px;
                    color: #dc2626;
                    font-size: 9pt;
                }
                
                .invoice-footer-print {
                    padding: 1rem 0 0 0; /* Reduced */
                    margin-top: auto;
                    border-top: 1px solid #e5e7eb;
                    font-size: 0.7rem; /* Reduced */
                    color: #4b5563;
                    text-align: center;
                    page-break-before: avoid;
                }
                .barcode-container-print {
                    max-width: 260px; /* Reduced */
                    margin: 0.25rem auto 0 auto; /* Reduced */
                }
            `}} />
            
            <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-300 bg-gray-100 rounded-t-xl sticky top-0 z-20">
                <h3 className="text-md sm:text-lg font-semibold text-gray-800 truncate" title={invoiceNumber}>
                    <FileText size={22} className="mr-2.5 text-blue-600 inline-block"/>
                    Invoice: {invoiceNumber}
                </h3>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handlePrint}
                        className="p-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                        title="Print/Download Invoice"
                    >
                        <Download size={16} className="mr-0 sm:mr-1.5" /> <span className="hidden sm:inline">Print/Save</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Close Invoice View"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto flex-grow p-1">
                <div id="invoice-content-to-print-modal-fullscreen" className="invoice-container-print bg-white p-4 sm:p-8">
                    {bill.status?.toLowerCase() === 'paid' && (
                        <div className="paid-stamp-print">
                            <div className="paid-stamp-main-print">PAID</div>
                            <div className="paid-stamp-date-print">{formatDate(bill.paymentDate, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        </div>
                    )}
                    <div className="relative z-0 invoice-body-print">
                        <header className="invoice-header-print">
                            <div>
                                <h1 className="logo-print">AGWA</h1>
                                <p className="tagline-print">Ensuring Clarity, Sustaining Life.</p>
                            </div>
                            <div className="company-address-print">
                                <strong>AGWA Water Services, Inc.</strong><br/>
                                123 Aqua Drive, Hydro Business Park<br/>
                                Naic, Cavite, Philippines 4110<br/>
                                VAT Reg. TIN: 000-123-456-789
                            </div>
                        </header>
                        
                        <section className="invoice-title-print">
                            <h1>STATEMENT OF ACCOUNT</h1>
                            <p>Invoice No.: {invoiceNumber}</p>
                        </section>

                        <section className="invoice-details-grid-print">
                            <div className="invoice-box-print">
                                <h2>SERVICE INFORMATION</h2>
                                <div>
                                    <div className="detail-row"><span>Contract Acct No.:</span> <span>{userData.accountNumber}</span></div>
                                    <div className="detail-row"><span>Account Name:</span> <span>{userData.displayName || userData.email}</span></div>
                                    <div className="detail-row"><span>Service Address:</span> <span>{formatAddressToString(userData.serviceAddress)}</span></div>
                                    <div className="detail-row"><span>Meter Serial No.:</span> <span>{userData.meterSerialNumber || ''}</span></div>
                                    <div className="detail-row"><span>Rate Class:</span> <span>{userData.serviceType || "Residential"}</span></div>
                                </div>
                            </div>
                            <div className="invoice-box-print">
                                <h2>BILLING SUMMARY</h2>
                                <div>
                                    <div className="detail-row"><span>Bill Date:</span> <span>{formatDate(bill.billDate, { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'}</span></div>
                                    <div className="detail-row"><span>Billing Period:</span> <span>{bill.billingPeriod || bill.monthYear}</span></div>
                                    <div className="detail-row"><span>Current Reading:</span> <span>{bill.currentReading ?? 'N/A'} m³</span></div>
                                    <div className="detail-row"><span>Previous Reading:</span> <span>{bill.previousReading ?? 'N/A'} m³</span></div>
                                    <div className="detail-row"><span>Consumption:</span> <span>{charges.consumption ?? 'N/A'} m³</span></div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="section-title-print" style={{margin: '1rem 0 0 0', fontSize: '1.1rem', fontWeight: 700}}>CHARGES BREAKDOWN</h2>
                            <table className="invoice-table-print">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Amount (PHP)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td>Basic Charge</td><td>{charges.basicCharge?.toFixed(2)}</td></tr>
                                    <tr><td>Foreign Currency Differential Adj. (FCDA)</td><td>{charges.fcda?.toFixed(2)}</td></tr>
                                    <tr className="font-semibold" style={{fontWeight: 600}}><td>Water Charge (Basic + FCDA)</td><td>{charges.waterCharge?.toFixed(2)}</td></tr>
                                    <tr><td>Environmental Charge (EC)</td><td>{charges.environmentalCharge?.toFixed(2)}</td></tr>
                                    <tr><td>Sewerage Charge (SC)</td><td>{charges.sewerageCharge?.toFixed(2)}</td></tr>
                                    <tr><td>Maintenance Service Charge</td><td>{charges.maintenanceServiceCharge?.toFixed(2)}</td></tr>
                                    <tr className="bg-gray-50 font-semibold" style={{backgroundColor: '#f9fafb !important', fontWeight: 600}}><td>SUB-TOTAL (Water & Other Charges)</td><td>{charges.subTotalBeforeTaxes?.toFixed(2)}</td></tr>
                                    <tr><td>Government Taxes (Local Franchise Tax)</td><td>{charges.governmentTaxes?.toFixed(2)}</td></tr>
                                    <tr><td>Value Added Tax (VAT 12%)</td><td>{charges.vat?.toFixed(2)}</td></tr>
                                    <tr className="bg-gray-100 font-bold" style={{backgroundColor: '#f3f4f6 !important', fontSize: '10pt', fontWeight: 700}}><td>Total Current Charges</td><td>{totalCurrentCharges.toFixed(2)}</td></tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="invoice-totals-print">
                            <div className="detail-row">
                                <span>Total Current Charges:</span> 
                                <span>PHP {totalCurrentCharges.toFixed(2)}</span>
                            </div>
                            <div className="detail-row">
                                <span>Previous Unpaid Amount:</span> 
                                <span style={{color: previousUnpaidAmount > 0 ? '#dc2626' : 'inherit'}}>PHP {previousUnpaidAmount.toFixed(2)}</span>
                            </div>
                            <div className="detail-row">
                                <span>Penalties from Previous Bills:</span> 
                                <span style={{color: existingPenalty > 0 ? '#dc2626' : 'inherit'}}>PHP {existingPenalty.toFixed(2)}</span>
                            </div>
                            <div className="detail-row">
                                <span>Senior Citizen/PWD Discount:</span> 
                                <span style={{color: seniorCitizenDiscount > 0 ? '#059669' : 'inherit'}}>PHP ({seniorCitizenDiscount.toFixed(2)})</span>
                            </div>
                            
                            <div className="grand-total-print">
                                <span className="font-bold">Amount Due on or Before {formatDate(bill.dueDate, {month: 'short', day: 'numeric'})}</span>
                                <span className="font-bold">₱{baseAmount.toFixed(2)}</span>
                            </div>
                            
                            {bill.status !== 'Paid' && (
                                <>
                                    <div className="detail-row mt-2">
                                        <span>Late Payment Penalty (if paid after {formatDate(bill.dueDate, {month: 'short', day: 'numeric'})})</span>
                                        <span style={{color: '#dc2626'}}>PHP {potentialPenalty.toFixed(2)}</span>
                                    </div>
                                    
                                    <div className="grand-total-print-final">
                                        <span className="font-bold">TOTAL AMOUNT DUE AFTER Due Date</span>
                                        <span className="font-bold">₱{amountDueAfterDate.toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                            
                            <div className="due-date-text-print">
                                Due Date: {formatDate(bill.dueDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'}
                            </div>
                        </section>
                        
                    </div>
                    
                    <footer className="invoice-footer-print">
                        <p>Please pay on or before the due date to avoid disconnection and late payment penalties.</p>
                        <p>This is a system-generated statement. For inquiries, please call our 24/7 hotline at <strong>1627-AGWA</strong> or email us at <strong>support@agwa-waterservices.com.ph</strong>.</p>
                        <div className="barcode-container-print">
                            <Barcode value={invoiceNumber} />
                        </div>
                    </footer>
                </div>
            </div>
        </Modal>
    );
};

export default InvoiceView;