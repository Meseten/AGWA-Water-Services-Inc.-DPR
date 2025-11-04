import React from 'react';
import Modal from './Modal';
import { Printer, X, Info, Download, FileText } from 'lucide-react';
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

    const totalAmountDue = (charges.totalCalculatedCharges + (bill.previousUnpaidAmount || 0) - (bill.seniorCitizenDiscount || 0)).toFixed(2);

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
            const sanitizedContent = DOMPurify.sanitize(printableContent.innerHTML);
            const printWindow = window.open('', '_blank', 'height=800,width=1000,scrollbars=yes');
            printWindow.document.write('<html><head><title>AGWA Water Services - Invoice</title>');
            printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow.document.write(`
                <style>
                    body { font-family: 'Inter', sans-serif; margin: 0; padding: 15px; font-size: 9.5pt; line-height: 1.45; color: #2d3748; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .invoice-container-print { max-width: 820px; margin: auto; padding: 20px; background-color: #fff; position: relative; }
                    .paid-stamp {
                        position: absolute;
                        top: 40%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-20deg);
                        color: #e53e3e;
                        border: 5px double #e53e3e;
                        padding: 12px 30px;
                        border-radius: 6px;
                        font-family: 'Courier New', Courier, monospace;
                        text-align: center;
                        opacity: 0.6;
                        z-index: 1000;
                        pointer-events: none;
                        filter: blur(0.5px) grayscale(10%) sepia(50%) brightness(90%) contrast(120%);
                    }
                    .paid-stamp-main { font-size: 3rem; font-weight: bold; letter-spacing: 5px; line-height: 1; text-shadow: 1px 1px 0 rgba(0,0,0,0.1); }
                    .paid-stamp-date { font-size: 0.9rem; font-weight: 600; margin-top: 8px; display: block; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; position: relative; z-index: 1; }
                    td, th { border: 1px solid #e2e8f0; padding: 5px 7px; text-align: left; font-size: 9pt; vertical-align: top; }
                    th { background-color: #f7fafc; font-weight: 600; color: #4a5568; }
                    .header-logo-print { font-size: 24pt; font-weight: bold; color: #2b6cb0; margin-bottom: 0px; }
                    .header-tagline-print { font-size: 8pt; color: #4299e1; margin-top: -2px; }
                    .invoice-title-print { font-size: 20pt; font-weight: bold; text-align: center; margin-bottom: 12px; margin-top: 8px; text-transform: uppercase; color: #1a202c; }
                    .section-title-print { font-weight: bold; margin-top: 12px; margin-bottom: 4px; font-size: 11pt; border-bottom: 2px solid #4a5568; padding-bottom: 3px; color: #2c5282;}
                    .text-right-print { text-align: right; }
                    .font-bold-print { font-weight: bold; }
                    .total-due-print { font-size: 14pt; font-weight: bold; color: #c53030; }
                    hr.dashed-print { border: none; border-top: 1px dashed #a0aec0; margin: 10px 0; }
                    .footer-notes-print { font-size: 8pt; text-align: center; margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #4a5568; }
                    .payment-stub-print { margin-top: 20px; padding: 12px; border: 1px dashed #718096; background-color: #f8f9fa; }
                    .no-print-in-iframe { display: none !important; }
                    @media print {
                        body { margin: 0; font-size: 9.5pt; background-color: #fff; }
                        .no-print-in-iframe { display: none !important; }
                        .invoice-container-print { border: none; box-shadow: none; padding: 0;}
                        .paid-stamp { color: #e53e3e !important; border-color: #e53e3e !important; filter: blur(0.3px) grayscale(5%) sepia(40%) brightness(90%) contrast(120%); }
                        table td, table th {font-size: 8.5pt;}
                    }
                </style>
            `);
            printWindow.document.write('</head><body><div class="invoice-container-print">');
            printWindow.document.write(sanitizedContent);
            printWindow.document.write('</div></body></html>');
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 700);
        } else {
            if (showNotification) showNotification("Invoice content element not found for printing.", "error");
        }
    };

    const InfoRow = ({ label, value, valueClass = "text-gray-800", labelWidth = "w-2/5 sm:w-1/3", valueWidth = "w-3/5 sm:w-2/3" }) => (
        <div className="flex justify-between py-1.5 text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 px-1 -mx-1 rounded-sm">
            <span className={`text-gray-500 ${labelWidth} pr-2`}>{label}:</span>
            <span className={`${valueWidth} text-right font-medium ${valueClass}`}>{value}</span>
        </div>
    );

    const DetailRow = ({ label, value, valueClass = "text-gray-800", isBold = false, isTotal=false }) => (
        <tr className={`${isTotal ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50/50'}`}>
            <td className={`py-2 px-2 ${isBold ? 'font-semibold' : ''}`}>{label}</td>
            <td className={`py-2 px-2 text-right ${valueClass} ${isBold ? 'font-semibold' : ''}`}>{value}</td>
        </tr>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="full" modalDialogClassName="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl w-[95vw] h-[95vh]" contentClassName="p-0">
            <style>
                {`
                    .paid-stamp {
                        position: absolute;
                        top: 40%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-20deg);
                        color: #e53e3e;
                        border: 5px double #e53e3e;
                        padding: 12px 30px;
                        border-radius: 6px;
                        font-family: 'Courier New', Courier, monospace;
                        text-align: center;
                        opacity: 0.6;
                        z-index: 1000;
                        pointer-events: none;
                        filter: blur(0.5px) grayscale(10%) sepia(50%) brightness(90%) contrast(120%);
                    }
                    .paid-stamp-main { font-size: 3rem; font-weight: bold; letter-spacing: 5px; line-height: 1; text-shadow: 1px 1px 0 rgba(0,0,0,0.1); }
                    .paid-stamp-date { font-size: 0.9rem; font-weight: 600; margin-top: 8px; display: block; }
                `}
            </style>
            <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-200 bg-slate-50 rounded-t-xl sticky top-0 z-20">
                <div className="flex items-center">
                    <FileText size={22} className="mr-2.5 text-blue-600" />
                    <h3 className="text-md sm:text-lg font-semibold text-slate-800 truncate" title={invoiceNumber}>
                        Invoice: {invoiceNumber}
                    </h3>
                </div>
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
                <div id="invoice-content-to-print-modal-fullscreen" className="p-3 sm:p-5 font-sans text-gray-700 text-xs sm:text-sm bg-white shadow-lg rounded-lg max-w-4xl mx-auto my-2 relative">
                    {bill.status?.toLowerCase() === 'paid' && (
                        <div className="paid-stamp">
                            <div className="paid-stamp-main">PAID</div>
                            <div className="paid-stamp-date">{formatDate(bill.paymentDate, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        </div>
                    )}
                    <div className="relative z-0">
                        <div className="flex justify-between items-start mb-5 pb-4 border-b-2 border-blue-700">
                            <div>
                                <div className="header-logo-print text-3xl font-bold text-blue-700">AGWA</div>
                                <div className="header-tagline-print text-xs text-blue-600 italic">Ensuring Clarity, Sustaining Life.</div>
                            </div>
                            <div className="text-right text-xs">
                                <div className="font-semibold">AGWA Water Services, Inc.</div>
                                <div>123 Aqua Drive, Hydro Business Park</div>
                                <div>Naic, Cavite, Philippines 4110</div>
                                <div>VAT Reg. TIN: 000-123-456-789</div>
                                <div className="no-print-in-iframe">Machine Serial No.: AGWAMSN001</div>
                            </div>
                        </div>
                        <div className="invoice-title-print text-2xl font-bold text-center mb-2 text-gray-800">STATEMENT OF ACCOUNT</div>
                        <div className="text-center text-sm mb-5">Invoice No.: {invoiceNumber}</div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 mb-5 text-xs">
                            <div className="border border-gray-200 p-3.5 rounded-lg bg-slate-50/60 shadow-sm">
                                <h5 className="font-semibold text-slate-600 mb-2 text-sm border-b pb-1.5">SERVICE INFORMATION</h5>
                                <InfoRow label="Contract Acct No." value={userData.accountNumber} valueClass="font-bold text-slate-900" />
                                <InfoRow label="Account Name" value={userData.displayName || userData.email} valueClass="font-bold text-slate-900" />
                                <InfoRow label="Service Address" value={formatAddressToString(userData.serviceAddress)} />
                                <InfoRow label="Meter Serial No." value={userData.meterSerialNumber || 'N/A'} />
                                <InfoRow label="Rate Class" value={userData.serviceType || "Residential"} />
                            </div>
                            <div className="border border-gray-200 p-3.5 rounded-lg bg-slate-50/60 mt-3 md:mt-0 shadow-sm">
                                <h5 className="font-semibold text-slate-600 mb-2 text-sm border-b pb-1.5">BILLING SUMMARY</h5>
                                <InfoRow label="Bill Date" value={formatDate(bill.billDate, { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'} />
                                <InfoRow label="Billing Period" value={bill.billingPeriod || bill.monthYear} />
                                <InfoRow label="Current Reading" value={`${bill.currentReading ?? 'N/A'} m³`} />
                                <InfoRow label="Previous Reading" value={`${bill.prevReading ?? 'N/A'} m³`} />
                                <InfoRow label="Consumption" value={`${charges.consumption ?? 'N/A'} m³`} valueClass="font-bold text-slate-900" />
                            </div>
                        </div>
                        <hr className="my-4 border-gray-300 dashed-print"/>

                        <div className="section-title-print text-sm font-semibold text-slate-700 mb-1.5">CHARGES BREAKDOWN</div>
                        <table className="w-full text-xs mb-4">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="py-2 px-2.5 text-left">Description</th>
                                    <th className="py-2 px-2.5 text-right">Amount (PHP)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <DetailRow label="Basic Charge" value={charges.basicCharge?.toFixed(2)} />
                                <DetailRow label="Foreign Currency Differential Adj. (FCDA)" value={charges.fcda?.toFixed(2)} />
                                <DetailRow label="Water Charge (Basic + FCDA)" value={charges.waterCharge?.toFixed(2)} isBold={true}/>
                                <DetailRow label="Environmental Charge (EC)" value={charges.environmentalCharge?.toFixed(2)} />
                                <DetailRow label="Sewerage Charge (SC)" value={charges.sewerageCharge?.toFixed(2)} />
                                <DetailRow label="Maintenance Service Charge" value={charges.maintenanceServiceCharge?.toFixed(2)} />
                                {bill.seniorCitizenDiscount > 0 && <DetailRow label="Senior Citizen Discount" value={`(${parseFloat(bill.seniorCitizenDiscount).toFixed(2)})`} valueClass="text-green-600"/>}
                                <DetailRow label="SUB-TOTAL (Water & Other Charges)" value={charges.subTotalBeforeTaxes?.toFixed(2)} isTotal={true}/>
                                <DetailRow label="Government Taxes (Local Franchise Tax)" value={charges.governmentTaxes?.toFixed(2)} />
                                <DetailRow label="VATable Sales" value={charges.vatableSales?.toFixed(2)} isTotal={true}/>
                                <DetailRow label="VAT (12%)" value={charges.vat?.toFixed(2)} />
                            </tbody>
                        </table>
                        <hr className="my-4 border-gray-300 dashed-print"/>

                        <div className="text-xs space-y-1.5 mt-1">
                            <InfoRow label="Total Current Charges" value={`PHP ${charges.totalCalculatedCharges?.toFixed(2)}`} valueClass="font-bold text-slate-900 text-sm" />
                            <InfoRow label="Previous Unpaid Amount" value={`PHP ${(bill.previousUnpaidAmount || 0).toFixed(2)}`} valueClass={`font-semibold text-sm ${(bill.previousUnpaidAmount || 0) > 0 ? "text-red-600" : "text-slate-800"}`} />
                            <div className="flex justify-between items-center py-2.5 text-lg sm:text-xl border-t-2 border-b-2 border-black my-2.5 px-1">
                                <span className="font-bold text-slate-900">TOTAL AMOUNT DUE</span>
                                <span className="font-bold text-red-600 total-due-print">₱{totalAmountDue}</span>
                            </div>
                            <InfoRow label="Payment Due Date" value={formatDate(bill.dueDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'} valueClass="font-bold text-red-700 text-sm" />
                        </div>
                        <hr className="my-4 border-gray-300 dashed-print"/>

                        {bill.paymentHistory && bill.paymentHistory.length > 0 && (
                            <>
                                <div className="section-title-print text-sm font-semibold text-slate-700 mb-1.5 mt-4">PAYMENT HISTORY (This Bill)</div>
                                <table className="w-full text-xs mb-4">
                                    <thead className="bg-slate-100"><tr><th className="py-2 px-2.5">Date</th><th className="py-2 px-2.5">Ref. No.</th><th className="py-2 px-2.5 text-right">Amount Paid</th></tr></thead>
                                    <tbody>
                                        {bill.paymentHistory.map((p, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50">
                                                <td className="py-1.5 px-2.5">{formatDate(p.postingDate)}</td>
                                                <td className="py-1.5 px-2.5">{p.referenceNo}</td>
                                                <td className="py-1.5 px-2.5 text-right">{parseFloat(p.amount).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <hr className="my-4 border-gray-300 dashed-print"/>
                            </>
                        )}

                        <div className="footer-notes-print text-xs text-center my-4 space-y-1 text-gray-600">
                            <p className="no-print-in-iframe">BIR Permit No. AGWA-001-012025-000001 | Date Issued: 01/01/2025</p>
                            <p>Please settle your account on or before the due date to avoid disconnection and late payment penalties.</p>
                            <p className="font-semibold">CUSTOMER SERVICE: 1627-AGWA | support@agwa-waterservices.com.ph</p>
                        </div>

                        <div className="payment-stub-print mt-5 p-3.5 border-t-2 border-dashed border-gray-500 text-xs no-print-in-iframe">
                            <h5 className="font-bold text-center mb-2 text-slate-700 text-sm">PAYMENT STUB (For Accredited Centers)</h5>
                            <InfoRow label="Acct. No." value={userData.accountNumber} valueClass="font-bold"/>
                            <InfoRow label="Acct. Name" value={userData.displayName || userData.email}/>
                            <InfoRow label="Invoice No." value={invoiceNumber}/>
                            <InfoRow label="Amount Due" value={`₱${totalAmountDue}`} valueClass="font-bold text-lg"/>
                            <InfoRow label="Due Date" value={formatDate(bill.dueDate, {month: 'long', day: 'numeric', year: 'numeric'})} valueClass="font-bold"/>
                            <div className="py-2">
                                <Barcode value={invoiceNumber} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default InvoiceView;