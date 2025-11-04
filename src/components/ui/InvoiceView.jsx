import React from 'react';
import Modal from './Modal';
import { Printer, X, Info, Download, FileText, PhoneCall, Mail } from 'lucide-react';
import { formatDate } from '../../utils/userUtils';
import Barcode from './Barcode.jsx';
import DOMPurify from 'dompurify';

const InvoiceView = ({
    isOpen,
    onClose,
    bill,
    userData,
    calculateBillDetails,
    showNotification
}) => {
    if (!isOpen || !bill || !userData) return null;

    const charges = bill.calculatedCharges || calculateBillDetails(
        bill.consumption,
        userData.serviceType,
        userData.meterSize || '1/2"'
    );

    const totalAmountDue = (bill.amount || 0).toFixed(2);

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
        if (printableContent) {
            const sanitizedContent = DOMPurify.sanitize(printableContent.innerHTML, { ADD_TAGS: ['style'] });
            const printWindow = window.open('', '_blank', 'height=800,width=1000,scrollbars=yes');
            printWindow.document.write('<html><head><title>AGWA Invoice ' + invoiceNumber + '</title>');
            printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow.document.write(printableContent.innerHTML); 
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 700);
        } else {
            if (showNotification) showNotification("Invoice content element not found for printing.", "error");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="full" modalDialogClassName="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl w-[95vw] h-[95vh]" contentClassName="p-0 bg-gray-200">
            <style>
                {`
                    @media print {
                        body { 
                            -webkit-print-color-adjust: exact !important; 
                            print-color-adjust: exact !important; 
                        }
                    }
                    .invoice-container-print {
                        width: 210mm;
                        min-height: 297mm;
                        margin: 1rem auto;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                        position: relative;
                        font-family: 'Times New Roman', Times, serif;
                        color: #000;
                    }
                    .paid-stamp-print {
                        position: absolute;
                        top: 35%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-25deg);
                        color: rgba(220, 38, 38, 0.2);
                        border: 10px double rgba(220, 38, 38, 0.2);
                        padding: 1rem 2rem;
                        border-radius: 8px;
                        font-family: 'Arial', sans-serif;
                        text-align: center;
                        opacity: 1;
                        z-index: 10;
                        pointer-events: none;
                    }
                    .paid-stamp-main-print { font-size: 5rem; font-weight: 700; line-height: 1; text-shadow: 1px 1px 0 rgba(255,255,255,0.5); }
                    .paid-stamp-date-print { font-size: 1.25rem; font-weight: 600; margin-top: 8px; display: block; }
                    .invoice-header-print {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        padding: 2rem;
                        border-bottom: 4px solid #1e3a8a; /* Dark Blue */
                    }
                    .invoice-header-print .logo-print { font-size: 3rem; font-weight: bold; color: #1e3a8a; line-height: 1; }
                    .invoice-header-print .tagline-print { font-size: 0.8rem; color: #1d4ed8; font-style: italic; }
                    .invoice-header-print .company-address-print { text-align: right; font-size: 0.8rem; line-height: 1.4; color: #374151; }
                    .invoice-title-print { text-align: center; margin: 1.5rem 0; }
                    .invoice-title-print h1 { font-size: 1.8rem; font-weight: 700; margin: 0; letter-spacing: 1px; }
                    .invoice-title-print p { font-size: 0.9rem; margin: 0; }
                    .invoice-details-grid-print {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 1.5rem;
                        padding: 0 2rem;
                    }
                    .invoice-box-print { border: 1px solid #d1d5db; border-radius: 6px; }
                    .invoice-box-print h2 {
                        background-color: #f3f4f6;
                        padding: 0.5rem 1rem;
                        font-size: 0.9rem;
                        font-weight: 700;
                        border-bottom: 1px solid #d1d5db;
                        margin: 0;
                    }
                    .invoice-box-print div { padding: 1rem; font-size: 0.9rem; }
                    .invoice-box-print .detail-row { display: flex; justify-content: space-between; padding: 0.3rem 0; border-bottom: 1px dashed #e5e7eb; }
                    .invoice-box-print .detail-row span:first-child { color: #4b5563; }
                    .invoice-box-print .detail-row span:last-child { font-weight: 600; text-align: right; }
                    .invoice-table-print { width: calc(100% - 4rem); margin: 2rem; border-collapse: collapse; }
                    .invoice-table-print th, .invoice-table-print td { border: 1px solid #d1d5db; padding: 0.6rem 0.8rem; font-size: 0.9rem; }
                    .invoice-table-print th { background-color: #f3f4f6; text-align: left; }
                    .invoice-table-print td:last-child { text-align: right; }
                    .invoice-totals-print {
                        width: 50%;
                        margin-left: auto;
                        margin-right: 2rem;
                        font-size: 0.9rem;
                    }
                    .invoice-totals-print .detail-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 0.5rem 0;
                    }
                    .invoice-totals-print .detail-row span:first-child { color: #4b5563; }
                    .invoice-totals-print .detail-row span:last-child { font-weight: 600; text-align: right; }
                    .invoice-totals-print .grand-total-print {
                        display: flex;
                        justify-content: space-between;
                        padding: 0.8rem;
                        margin-top: 0.5rem;
                        background-color: #1e3a8a;
                        color: white;
                        border-radius: 4px;
                        font-size: 1.1rem;
                    }
                    .invoice-footer-print {
                        padding: 2rem;
                        margin-top: 2rem;
                        border-top: 2px solid #e5e7eb;
                        font-size: 0.8rem;
                        color: #4b5563;
                        text-align: center;
                    }
                    .no-print-in-iframe { display: none !important; }
                `}
            </style>
            
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
                    <div className="relative z-0">
                        <header className="invoice-header-print">
                            <div>
                                <h1 className="logo-print">AGWA</h1>
                                <p className="tagline-print">Ensuring Clarity, Sustaining Life.</p>
                            </div>
                            <div className="company-address-print">
                                <strong>AGWA Water Services, Inc.</strong><br/>
                                123 Aqua Drive, Hydro Business Park<br/>
                                Naic, Cavite, Philippines 4110<br/>
                                VAT Reg. TIN: 000-123-456-789<br/>
                                Machine Serial No.: AGWAMSN001
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
                            <h2 className="section-title-print" style={{margin: '2rem 2rem 0 2rem'}}>CHARGES BREAKDOWN</h2>
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
                                    <tr className="font-semibold"><td>Water Charge (Basic + FCDA)</td><td>{charges.waterCharge?.toFixed(2)}</td></tr>
                                    <tr><td>Environmental Charge (EC)</td><td>{charges.environmentalCharge?.toFixed(2)}</td></tr>
                                    <tr><td>Sewerage Charge (SC)</td><td>{charges.sewerageCharge?.toFixed(2)}</td></tr>
                                    <tr><td>Maintenance Service Charge</td><td>{charges.maintenanceServiceCharge?.toFixed(2)}</td></tr>
                                    <tr className="bg-gray-50 font-semibold"><td>SUB-TOTAL (Water & Other Charges)</td><td>{charges.subTotalBeforeTaxes?.toFixed(2)}</td></tr>
                                    <tr><td>Government Taxes (Local Franchise Tax)</td><td>{charges.governmentTaxes?.toFixed(2)}</td></tr>
                                    <tr><td>Value Added Tax (VAT 12%)</td><td>{charges.vat?.toFixed(2)}</td></tr>
                                    <tr className="bg-gray-100 font-bold text-base"><td>Total Current Charges</td><td>{charges.totalCalculatedCharges?.toFixed(2)}</td></tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="invoice-totals-print">
                            <div className="detail-row"><span>Total Current Charges:</span> <span>PHP {charges.totalCalculatedCharges?.toFixed(2)}</span></div>
                            <div className="detail-row"><span>Previous Unpaid Amount:</span> <span className={bill.previousUnpaidAmount > 0 ? 'text-red-600' : ''}>PHP {(bill.previousUnpaidAmount || 0).toFixed(2)}</span></div>
                            <div className="detail-row"><span>Late Payment Penalty:</span> <span className={bill.penaltyAmount > 0 ? 'text-red-600' : ''}>PHP {(bill.penaltyAmount || 0).toFixed(2)}</span></div>
                            <div className="detail-row"><span>Senior Citizen Discount:</span> <span className={bill.seniorCitizenDiscount > 0 ? 'text-green-600' : ''}>PHP ({(bill.seniorCitizenDiscount || 0).toFixed(2)})</span></div>
                            
                            <div className="grand-total-print">
                                <span className="font-bold">TOTAL AMOUNT DUE</span>
                                <span className="font-bold">₱{totalAmountDue}</span>
                            </div>
                            <div className="text-right text-red-600 font-bold text-sm mt-1">
                                Due Date: {formatDate(bill.dueDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'}
                            </div>
                        </section>

                        <footer className="invoice-footer-print">
                            <p>Please pay on or before the due date to avoid disconnection and late payment penalties.</p>
                            <p>This is a system-generated statement. For inquiries, please call our 24/7 hotline at <strong>1627-AGWA</strong> or email us at <strong>support@agwa-waterservices.com.ph</strong>.</p>
                            <p className="no-print-in-iframe">BIR Permit No. AGWA-001-012025-000001 | Date Issued: 01/01/2025</p>
                        </footer>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default InvoiceView;