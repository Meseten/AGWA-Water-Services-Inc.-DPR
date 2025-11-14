import React from 'react';
import Modal from './Modal';
import { Printer, X, Download, FileText, CheckCircle } from 'lucide-react';
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

    const baseAmount = bill.baseAmount;
    const potentialPenalty = bill.potentialPenalty || 0;
    
    const amountDueAfterDate = baseAmount + potentialPenalty;
    
    const finalTotalAmount = (bill.amount || 0);

    const billDateObj = bill.billDate?.toDate ? bill.billDate.toDate() : null;
    const formattedDateForInvoiceNum = billDateObj ? `${billDateObj.getFullYear()}${String(billDateObj.getMonth() + 1).padStart(2, '0')}${String(billDateObj.getDate()).padStart(2, '0')}` : Date.now().toString().slice(-6);
    const invoiceNumber = bill.invoiceNumber || `AGWA-${bill.id?.slice(0,4).toUpperCase()}-${formattedDateForInvoiceNum}`;

    const formatAddressToString = (addressObj) => {
        if (!addressObj || typeof addressObj !== 'object') return addressObj || 'N/A';
        const parts = [addressObj.street, addressObj.barangay, addressObj.district, "Naic, Cavite"];
        return parts.filter(p => p && p.trim()).join(', ');
    };
    
    const fullAddress = formatAddressToString(userData.serviceAddress);

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

    const DetailRow = ({ label, value, isBold = false, isTotal = false, isVat = false }) => (
        <tr className={isVat ? 'text-xs' : ''}>
            <td className={`py-1 ${isTotal ? 'pt-2' : ''} ${isBold ? 'font-semibold' : 'pl-4'}`}>{label}</td>
            <td className={`py-1 ${isTotal ? 'pt-2' : ''} text-right ${isBold ? 'font-semibold' : ''}`}>{value}</td>
        </tr>
    );

    const TearOffSlip = () => (
        <div className="w-full border-t-2 border-dashed border-gray-400 mt-4 pt-4">
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                    <p className="text-xs font-semibold">Contract Account Number:</p>
                    <p className="text-lg font-mono font-bold tracking-wider">{userData.accountNumber}</p>
                    <p className="text-sm font-semibold mt-1">{userData.displayName}</p>
                    <p className="text-xs">{fullAddress}</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-blue-700">AGWA</div>
                    <p className="text-xxs text-blue-600 italic -mt-1">Ensuring Clarity, Sustaining Life.</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="text-xs">
                    <p>INVOICE No.: <span className="font-semibold">{invoiceNumber}</span></p>
                    <p>Billing Period: <span className="font-semibold">{bill.billingPeriod || bill.monthYear}</span></p>
                    <p>Bill Date: <span className="font-semibold">{formatDate(bill.billDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span></p>
                </div>
                <div className="text-xs text-right">
                    <p>Total Amount Due:</p>
                    <p className="text-lg font-bold">₱{finalTotalAmount.toFixed(2)}</p>
                    <p>Due Date:</p>
                    <p className="text-lg font-bold">{formatDate(bill.dueDate, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
            </div>
             <div className="p-4 bg-blue-100 rounded-lg mt-4 flex justify-between items-center text-center">
                <div className="text-left">
                    <p className="text-xs font-bold text-blue-800">TOTAL AMOUNT DUE</p>
                    <p className="text-2xl font-bold text-blue-800">₱{finalTotalAmount.toFixed(2)}</p>
                </div>
                 <div className="text-right">
                    <p className="text-xs font-bold text-blue-800">DUE DATE</p>
                    <p className="text-2xl font-bold text-blue-800">{formatDate(bill.dueDate, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
            </div>
            {bill.status === 'Unpaid' && potentialPenalty > 0 && (
                <p className="text-center text-xs text-red-700 mt-2 font-semibold">
                    Amount after due date: ₱{amountDueAfterDate.toFixed(2)} (includes ₱{potentialPenalty.toFixed(2)} penalty)
                </p>
            )}
            <div className="max-w-xs mx-auto mt-2">
                <Barcode value={invoiceNumber} />
            </div>
             <p className="text-center text-xs text-gray-600 mt-2 font-semibold">
                CUSTOMER SERVICE HOTLINE: 1627-AGWA
            </p>
            <p className="text-center text-xs text-gray-600 mt-1">
                PLEASE PAY VIA GCASH OR THROUGH OTHER ACCREDITED PAYMENT CENTERS. METER READERS AND CONTRACTORS ARE NOT ALLOWED TO ACCEPT PAYMENTS.
            </p>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="full" modalDialogClassName="sm:max-w-4xl w-[95vw] h-[95vh]" contentClassName="p-0 bg-gray-200">
            <style id="invoice-print-styles" dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0.5in;
                    }
                    body { 
                        font-family: 'Times New Roman', Times, serif; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                        color: #000;
                        font-size: 10pt; 
                    }
                    .no-print { display: none !important; }
                    .printable-area { padding: 0 !important; max-width: 100%; margin: auto; box-shadow: none !important; border: none !important; }
                    .invoice-header-print {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        padding-bottom: 0.5rem;
                        border-bottom: 2px solid #000;
                    }
                    .invoice-header-print .logo-print { font-size: 2rem; font-weight: 700; color: #1e3a8a !important; line-height: 1; }
                    .invoice-header-print .tagline-print { font-size: 0.7rem; color: #1d4ed8 !important; font-style: italic; }
                    .invoice-header-print .company-address-print { text-align: right; font-size: 0.75rem; line-height: 1.3; color: #374151 !important; }
                    .invoice-title-print { text-align: center; margin: 0.75rem 0; font-size: 1.25rem; font-weight: 700; }
                    .invoice-grid-print { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                    .invoice-grid-print > div { border: 1px solid #000; padding: 0.5rem; }
                    .invoice-grid-print h2 { font-weight: 700; font-size: 0.9rem; border-bottom: 1px solid #000; padding-bottom: 0.25rem; margin-bottom: 0.25rem; }
                    .invoice-grid-print p { margin: 0.15rem 0; font-size: 0.9rem; }
                    .invoice-grid-print p span { font-weight: 600; }
                    .charges-table-print { width: 100%; margin-top: 1rem; border-collapse: collapse; }
                    .charges-table-print th, .charges-table-print td { padding: 0.25rem 0.5rem; font-size: 0.9rem; }
                    .charges-table-print th { text-align: left; font-weight: 700; border-bottom: 1px solid #000; }
                    .charges-table-print td:last-child { text-align: right; }
                    .charges-table-print .subtotal-row td { border-top: 1px solid #999; padding-top: 0.5rem; font-weight: 600; }
                    .charges-table-print .vat-row td { font-size: 0.8rem; }
                    .grand-total-print { text-align: right; margin-top: 1rem; }
                    .grand-total-print p { margin: 0; font-size: 0.9rem; }
                    .grand-total-print h3 { margin: 0; font-size: 1.2rem; font-weight: 700; }
                    .tear-off-slip-print { border-top: 2px dashed #000; margin-top: 1rem; padding-top: 1rem; page-break-before: always; }
                    .tear-off-slip-print .text-xxs { font-size: 0.6rem; }
                    .tear-off-slip-print .text-lg { font-size: 1.25rem; }
                    .tear-off-slip-print .text-2xl { font-size: 1.5rem; }
                    .tear-off-slip-print .text-3xl { font-size: 1.875rem; }
                    .barcode-container-print { max-width: 260px; margin: 0.25rem auto 0 auto; }
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
                    .penalty-notice-print {
                        text-align: right;
                        font-size: 0.8rem;
                        color: #D9534F !important;
                        background-color: #FDF7F7 !important;
                        padding: 0.5rem;
                        border-radius: 0.375rem;
                        border: 1px solid #F3D0D0 !important;
                        margin-top: 0.5rem;
                    }
                    .penalty-notice-print strong { color: #A94442 !important; }
                }
            `}} />
            
            <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-300 bg-gray-100 rounded-t-xl sticky top-0 z-20 no-print">
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
                <div id="invoice-content-to-print-modal-fullscreen" className="printable-area bg-white p-4 sm:p-8 max-w-4xl mx-auto my-4 shadow-lg font-sans">
                    {bill.status?.toLowerCase() === 'paid' && (
                        <div className="paid-stamp-print">
                            <div className="paid-stamp-main-print">PAID</div>
                            <div className="paid-stamp-date-print">{formatDate(bill.paymentDate, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        </div>
                    )}
                    <div className="relative z-0">
                        <header className="invoice-header-print mb-4">
                            <div>
                                <h1 className="logo-print text-4xl font-bold text-blue-700">AGWA</h1>
                                <p className="tagline-print text-sm text-blue-600 italic -mt-1">Ensuring Clarity, Sustaining Life.</p>
                            </div>
                            <div className="company-address-print text-right text-xs">
                                <strong>AGWA Water Services, Inc.</strong><br/>
                                123 Aqua Drive, Hydro Business Park<br/>
                                Naic, Cavite, Philippines 4110<br/>
                                VAT Reg. TIN: 000-123-456-789
                            </div>
                        </header>
                        
                        <h1 className="invoice-title-print text-center my-4 text-2xl font-bold">INVOICE</h1>

                        <div className="invoice-grid-print grid grid-cols-2 gap-4 text-sm">
                            <div className="invoice-grid-box border border-black p-3">
                                <h2 className="font-bold text-sm border-b border-black pb-1 mb-1">CUSTOMER INFORMATION</h2>
                                <p className="font-bold text-base">{userData.displayName}</p>
                                <p>{fullAddress}</p>
                                <p className="mt-2">CAN: <span className="font-semibold">{userData.accountNumber}</span></p>
                                <p>Rate Class: <span className="font-semibold">{userData.serviceType}</span></p>
                                <p>Meter Number: <span className="font-semibold">{userData.meterSerialNumber}</span></p>
                            </div>
                            <div className="invoice-grid-box border border-black p-3">
                                <h2 className="font-bold text-sm border-b border-black pb-1 mb-1">BILLING INFORMATION</h2>
                                <p>Billing Date: <span className="font-semibold">{formatDate(bill.billDate, { month: 'long', day: 'numeric', year: 'numeric' })}</span></p>
                                <p>Billing Period: <span className="font-semibold">{bill.billingPeriod || bill.monthYear}</span></p>
                                <p className="mt-2">Current Reading: <span className="font-semibold">{bill.currentReading} m³</span></p>
                                <p>Previous Reading: <span className="font-semibold">{bill.previousReading} m³</span></p>
                                <p>Consumption: <span className="font-semibold">{bill.consumption} m³</span></p>
                            </div>
                        </div>

                        <div className="grid grid-cols-5 gap-4 mt-4">
                            <div className="col-span-3">
                                <table className="charges-table-print w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th className="text-left font-bold border-b-2 border-black pb-1">BILLING SUMMARY</th>
                                            <th className="text-right font-bold border-b-2 border-black pb-1">AMOUNT (PHP)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <DetailRow label="Basic Charge" value={charges.basicCharge?.toFixed(2)} />
                                        <DetailRow label="FCDA" value={charges.fcda?.toFixed(2)} />
                                        <DetailRow label="Environmental Charge" value={charges.environmentalCharge?.toFixed(2)} />
                                        <DetailRow label="Sewer Charge" value={charges.sewerageCharge?.toFixed(2)} />
                                        <DetailRow label="Maintenance Service Charge" value={charges.maintenanceServiceCharge?.toFixed(2)} />
                                        <DetailRow label="Senior Citizen Discount" value={seniorCitizenDiscount > 0 ? `(${seniorCitizenDiscount.toFixed(2)})` : '0.00'} />
                                        <DetailRow label="Government Taxes" value={charges.governmentTaxes?.toFixed(2)} />
                                        <DetailRow label="SUBTOTAL" value={charges.subTotalBeforeTaxes?.toFixed(2)} isBold={true} isTotal={true} />
                                        
                                        <tr className="h-4"><td colSpan="2"></td></tr> 
                                        
                                        <DetailRow label="Other Charges" value="0.00" />
                                        <DetailRow label="SUBTOTAL" value="0.00" isBold={true} isTotal={true} />
                                        
                                        <tr className="h-4"><td colSpan="2"></td></tr> 
                                        
                                        <DetailRow label="TOTAL CURRENT CHARGES" value={totalCurrentCharges.toFixed(2)} isBold={true} />
                                        <DetailRow label="VATable Sales" value={charges.vatableSales?.toFixed(2)} isVat={true} />
                                        <DetailRow label="VAT (12%)" value={charges.vat?.toFixed(2)} isVat={true} />
                                        <DetailRow label="VAT Exempt" value="0.00" isVat={true} />
                                        
                                        <tr className="h-4"><td colSpan="2"></td></tr> 

                                        <DetailRow label="Previous Unpaid Amount" value={previousUnpaidAmount.toFixed(2)} />
                                        <DetailRow label="Penalties" value={existingPenalty.toFixed(2)} />
                                    </tbody>
                                </table>
                            </div>

                            <div className="col-span-2 pt-8">
                                <div className="text-right">
                                    <p className="text-gray-600">TOTAL AMOUNT DUE</p>
                                    <h3 className="text-4xl font-bold">₱{finalTotalAmount.toFixed(2)}</h3>
                                    <p className="font-semibold mt-1">DUE DATE: {formatDate(bill.dueDate, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                                
                                {bill.status === 'Unpaid' && potentialPenalty > 0 && finalTotalAmount === baseAmount && (
                                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 text-right penalty-notice-print">
                                        Pay after {formatDate(bill.dueDate, { month: 'short', day: 'numeric' })} to include a 
                                        <strong> ₱{potentialPenalty.toFixed(2)} penalty</strong>, for a total of 
                                        <strong> ₱{amountDueAfterDate.toFixed(2)}</strong>.
                                    </div>
                                )}
                                 {bill.status === 'Unpaid' && finalTotalAmount > baseAmount && (
                                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 text-right penalty-notice-print">
                                        This amount includes a <strong>₱{(finalTotalAmount - baseAmount).toFixed(2)} penalty</strong> for late payment.
                                    </div>
                                )}
                                
                                {bill.status === 'Paid' && (
                                    <div className="mt-4 text-right p-3 bg-green-100 border border-green-300 rounded-lg">
                                        <p className="font-bold text-green-700">AMOUNT PAID</p>
                                        <h3 className="text-2xl font-bold text-green-700">₱{(bill.amountPaid || bill.amount).toFixed(2)}</h3>
                                        <p className="text-sm text-gray-700">Paid on: {formatDate(bill.paymentDate, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                            <div>
                                <h3 className="font-bold border-b border-black pb-1 mb-1">PAYMENT HISTORY</h3>
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-xs text-gray-600">
                                            <th>Posting Date</th>
                                            <th>Reference Number</th>
                                            <th className="text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bill.paymentHistory && bill.paymentHistory.length > 0 ? (
                                            bill.paymentHistory.map((payment, index) => (
                                                <tr key={index}>
                                                    <td>{formatDate(payment.date, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                                    <td>{payment.reference}</td>
                                                    <td className="text-right">{payment.amount.toFixed(2)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="3" className="text-center py-2 text-gray-500">No recent payments.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                             <div>
                                <h3 className="font-bold border-b border-black pb-1 mb-1">CREDIT AND DEBIT MEMO</h3>
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-xs text-gray-600">
                                            <th>Posting Date</th>
                                            <th>Reference Number</th>
                                            <th className="text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bill.adjustments && bill.adjustments.length > 0 ? (
                                            bill.adjustments.map((adj, index) => (
                                                <tr key={index}>
                                                    <td>{formatDate(adj.date, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                                    <td>{adj.reference}</td>
                                                    <td className="text-right">{adj.amount.toFixed(2)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="3" className="text-center py-2 text-gray-500">No adjustments.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="text-center text-xs text-gray-600 mt-8 pt-4 border-t border-black">
                            <p>BIR PERMIT NO.: AC_116_102024_000436 DATE OF ISSUE: 10/17/2024 SERIES RANGE: 0000000001 - 9999999999</p>
                        </div>
                    </div>
                    
                    <TearOffSlip />
                </div>
            </div>
        </Modal>
    );
};

export default InvoiceView;