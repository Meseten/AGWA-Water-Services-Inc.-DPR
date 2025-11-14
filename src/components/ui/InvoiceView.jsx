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
    
    const totalCurrentCharges = parseFloat(bill.totalCalculatedCharges?.toFixed(2) || 0);
    const seniorCitizenDiscount = parseFloat((bill.seniorCitizenDiscount || 0).toFixed(2));

    const baseAmount = bill.baseAmount || 0;
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

    const DetailRow = ({ label, value, isBold = false, isSubtotal = false, isTotal = false }) => (
        <tr className={isSubtotal ? 'border-t border-gray-300' : ''}>
            <td className={`py-0.5 ${isSubtotal ? 'pt-1' : ''} ${isBold ? 'font-semibold' : ''} ${isTotal ? 'font-bold' : ''}`}>
                {label}
            </td>
            <td className={`py-0.5 ${isSubtotal ? 'pt-1' : ''} text-right ${isBold ? 'font-semibold' : ''} ${isTotal ? 'font-bold' : ''}`}>
                {value}
            </td>
        </tr>
    );

    const TearOffSlip = () => (
        <div className="w-full border-t-2 border-dashed border-gray-400 mt-4 pt-3 text-xs tear-off-slip-print">
            <div className="flex justify-between items-start">
                <div className="pr-2 max-w-[50%]">
                    <p>Contract Account Number:</p>
                    <p className="text-sm font-mono font-bold tracking-wider mb-1">{userData.accountNumber}</p>
                    <p className="font-semibold">{userData.displayName}</p>
                    <p>{fullAddress}</p>
                    <p className="mt-2 font-semibold">Total Amount Due: ₱{finalTotalAmount.toFixed(2)}</p>
                    <p className="font-semibold">Due Date: {formatDate(bill.dueDate, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                 <div className="text-right flex-shrink-0">
                    <div className="flex justify-end mb-2">
                         <div className="text-2xl font-bold text-blue-700 logo-print">AGWA</div>
                    </div>
                    <p>INVOICE No.: <span className="font-semibold">{invoiceNumber}</span></p>
                    <p>Billing Period: <span className="font-semibold">{bill.billingPeriod || bill.monthYear}</span></p>
                    <p>Bill Date: <span className="font-semibold">{formatDate(bill.billDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span></p>
                 </div>
            </div>
            <div className="max-w-[240px] mx-auto mt-2 barcode-container-print">
                <Barcode value={invoiceNumber} />
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="full" modalDialogClassName="sm:max-w-4xl w-[95vw] h-[95vh]" contentClassName="p-0 bg-gray-200">
            <style id="invoice-print-styles" dangerouslySetInnerHTML={{ __html: `
                .paid-stamp-base {
                    position: absolute;
                    top: 45%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-20deg);
                    padding: 0.5rem 1.5rem;
                    border-radius: 8px;
                    text-align: center;
                    opacity: 1;
                    z-index: 10;
                    pointer-events: none;
                    font-family: 'Arial Black', 'Impact', sans-serif;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }
                .paid-stamp-modal {
                    color: rgba(220, 38, 38, 0.25);
                    border: 7px double rgba(220, 38, 38, 0.25);
                }
                .paid-stamp-main { font-size: 4rem; font-weight: 900; line-height: 1; }
                .paid-stamp-date { font-size: 1rem; font-weight: 700; display: block; border-top: 2px solid rgba(220, 38, 38, 0.25); padding-top: 4px; margin-top: 4px; }
            
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
                        font-size: 9pt; 
                    }
                    .no-print { display: none !important; }
                    .printable-area { padding: 0 !important; max-width: 100%; margin: auto; box-shadow: none !important; border: none !important; font-size: 9pt; }
                    .invoice-header-print {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        padding-bottom: 0.5rem;
                    }
                    .invoice-header-print .logo-print { font-size: 2rem; font-weight: 700; color: #1e3a8a !important; line-height: 1; }
                    .invoice-header-print .tagline-print { font-size: 0.7rem; color: #1d4ed8 !important; font-style: italic; }
                    .invoice-header-print .company-address-print { text-align: right; font-size: 0.75rem; line-height: 1.3; color: #374151 !important; }
                    
                    .invoice-title-print { font-size: 1.5rem; font-weight: 700; text-align: center; margin-top: 0.5rem; margin-bottom: 0.5rem; }

                    .invoice-grid-print { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
                    .invoice-grid-print-left { grid-column: span 1 / span 1; }
                    .invoice-grid-print-right { grid-column: span 1 / span 1; }

                    .invoice-section-print h2 { font-weight: 700; font-size: 0.75rem; border-bottom: 1px solid #000; padding-bottom: 0.25rem; margin-bottom: 0.25rem; text-transform: uppercase; }
                    .invoice-section-print p { margin: 0.15rem 0; line-height: 1.3; }
                    .invoice-section-print p span { font-weight: 600; }
                    .invoice-section-print .h-line { border-top: 1px solid #000; margin-top: 0.5rem; padding-top: 0.5rem; }
                    
                    .blue-box-print { background-color: #DBEAFE !important; border: 1px solid #BFDBFE !important; padding: 0.5rem 0.75rem; text-align: left; margin-top: 0.5rem; }
                    .blue-box-print p { margin: 0; font-size: 0.8rem; font-weight: 700; color: #1E40AF !important; }
                    .blue-box-print .due-amount { font-size: 1.25rem; color: #1D4ED8 !important; }
                    .blue-box-print .due-date { font-size: 1.1rem; color: #1D4ED8 !important; }
                    
                    .charges-table-print { width: 100%; margin-top: 0.5rem; border-collapse: collapse; }
                    .charges-table-print td { padding: 0.15rem 0.25rem; }
                    .charges-table-print td:last-child { text-align: right; }
                    .charges-table-print tr.border-t td { border-top: 1px solid #999 !important; padding-top: 0.25rem; }
                    .charges-table-print tr.total-due-row td { border-top: 2px solid #000 !important; font-size: 1.1em; font-weight: 700; padding-top: 0.25rem; }

                    .history-table-print { width: 100%; }
                    .history-table-print th { text-align: left; font-size: 0.7rem; color: #374151 !important; border-bottom: 1px solid #999; padding-bottom: 2px; }
                    .history-table-print td { text-align: left; font-size: 0.75rem; padding-top: 2px; }
                    .history-table-print td:last-child { text-align: right; }
                    
                    .bir-permit-print { text-align: center; font-size: 0.6rem; color: #4B5563 !important; margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid #999; }
                    
                    .tear-off-slip-print { border-top: 2px dashed #000; margin-top: 1rem; padding-top: 0.5rem; font-size: 0.8rem; page-break-before: auto; }
                    .tear-off-slip-print .text-sm { font-size: 0.9rem; }
                    .tear-off-slip-print .text-2xl { font-size: 1.3rem; }
                    .barcode-container-print { max-width: 240px; margin: 0.25rem auto 0 auto; }
                    
                    .paid-stamp-print {
                        position: absolute;
                        top: 45%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-20deg);
                        color: rgba(220, 38, 38, 0.25) !important;
                        border: 7px double rgba(220, 38, 38, 0.25) !important;
                        font-family: 'Arial Black', 'Impact', sans-serif;
                        letter-spacing: 0.1em;
                        text-transform: uppercase;
                    }
                    .paid-stamp-main-print { font-size: 4rem; font-weight: 900; line-height: 1; }
                    .paid-stamp-date-print { font-size: 1rem; font-weight: 700; display: block; border-top: 2px solid rgba(220, 38, 38, 0.25); padding-top: 4px; margin-top: 4px; }
                    
                    .penalty-notice-print {
                        font-size: 0.75rem;
                        color: #A94442 !important;
                        background-color: #FDF7F7 !important;
                        padding: 0.4rem;
                        border: 1px solid #F3D0D0 !important;
                        margin-top: 0.5rem;
                        text-align: left;
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
                <div id="invoice-content-to-print-modal-fullscreen" className="printable-area bg-white p-4 sm:p-8 max-w-4xl mx-auto my-4 shadow-lg font-sans text-xs">
                    {bill.status?.toLowerCase() === 'paid' && (
                        <div className="paid-stamp-base paid-stamp-modal paid-stamp-print">
                            <div className="paid-stamp-main paid-stamp-main-print">PAID</div>
                            <div className="paid-stamp-date paid-stamp-date-print">{formatDate(bill.paymentDate, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
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
                        
                        <h1 className="invoice-title-print text-center my-4 text-xl font-bold">INVOICE</h1>

                        <div className="invoice-grid-print grid grid-cols-2 gap-3 mt-4">
                            <div className="invoice-grid-print-left space-y-3">
                                <div className="invoice-section-print">
                                    <p className="font-semibold text-sm">{userData.displayName}</p>
                                    <p>{fullAddress}</p>
                                    <p className="mt-2">CAN: <span className="font-semibold">{userData.accountNumber}</span></p>
                                    <p>Rate Class: <span className="font-semibold">{userData.serviceType}</span></p>
                                    <p>Meter Number: <span className="font-semibold">{userData.meterSerialNumber}</span></p>
                                    <p>Service Area: <span className="font-semibold">{userData.serviceAddress?.barangay || 'N/A'}</span></p>
                                    <p>MRU/SEQ No.: <span className="font-semibold">{userData.mruSeq || 'N/A'}</span></p>
                                    <p className="mt-2">SC, PWD/Gov't ID No./Signature:</p>
                                    <div className="h-6 border-b border-gray-400"></div>
                                </div>
                                
                                <div className="invoice-section-print h-line">
                                    <h2 className="font-bold text-xs border-b border-black pb-1 mb-1 uppercase">Billing Information</h2>
                                    <div className="grid grid-cols-2">
                                        <div>
                                            <p>Billing Date:</p>
                                            <p>Billing Period:</p>
                                            <p>Current Reading:</p>
                                            <p>Previous Reading:</p>
                                            <p>Consumption:</p>
                                            <p>Prev. 3 Mos. Cons.:</p>
                                        </div>
                                        <div className="font-semibold text-right">
                                            <p>{formatDate(bill.billDate, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                            <p>{bill.billingPeriod || bill.monthYear}</p>
                                            <p>{bill.currentReading} m³</p>
                                            <p>{bill.previousReading} m³</p>
                                            <p>{bill.consumption} m³</p>
                                            <p>{bill.prev3MonthsConsumption || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="invoice-section-print h-line">
                                    <h2 className="font-bold text-xs border-b border-black pb-1 mb-1 uppercase">Credit and Debit Memo</h2>
                                    <table className="w-full history-table-print">
                                        <thead><tr><th>Posting Date</th><th>Reference Number</th><th className="text-right">Amount</th></tr></thead>
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
                                                <tr><td colSpan="3" className="text-center py-1 text-gray-500">No adjustments.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div className="invoice-section-print h-line">
                                    <h2 className="font-bold text-xs border-b border-black pb-1 mb-1 uppercase">Total Adjustments</h2>
                                    <table className="w-full history-table-print">
                                        <thead><tr><th>Posting Date</th><th>Reference Number</th><th className="text-right">Amount</th></tr></thead>
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
                                                <tr><td colSpan="3" className="text-center py-1 text-gray-500">No recent payments.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="invoice-section-print h-line">
                                    <h2 className="font-bold text-xs border-b border-black pb-1 mb-1 uppercase">Total Bill Payments</h2>
                                    <p className="text-xs">CUSTOMER SERVICE HOTLINE: 1627-AGWA</p>
                                    <p className="text-xs">PLEASE PAY VIA GCASH OR THROUGH OTHER ACCREDITED PAYMENT CENTERS. METER READERS AND CONTRACTORS ARE NOT ALLOWED TO ACCEPT PAYMENTS.</p>
                                </div>

                            </div>
                            
                            {/* --- RIGHT COLUMN --- */}
                            <div className="invoice-grid-print-right">
                                <div className="invoice-section-print">
                                    <p>Invoice No.: <span className="font-semibold">{invoiceNumber}</span></p>
                                    <p>TIN: <span className="font-semibold">{userData.tin || 'N/A'}</span></p>
                                    <p>Payer Name: <span className="font-semibold">{userData.displayName}</span></p>
                                    <p>Payer TIN: <span className="font-semibold">{userData.tin || 'N/A'}</span></p>
                                </div>
                                
                                <div className="blue-box-print p-3 bg-blue-50 border border-blue-200 my-2">
                                    <p className="text-xs font-semibold text-blue-700">Contract Account Number</p>
                                    <p className="text-xl font-bold text-blue-800 font-mono mb-1">{userData.accountNumber}</p>
                                    <p className="text-xs font-semibold text-blue-700">TOTAL AMOUNT DUE</p>
                                    <p className="text-2xl font-bold text-blue-800 due-amount">₱{finalTotalAmount.toFixed(2)}</p>
                                    <p className="text-xs font-semibold text-blue-700 mt-1">DUE DATE</p>
                                    <p className="text-xl font-bold text-blue-800 due-date">
                                        {formatDate(bill.dueDate, { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                                
                                {bill.status === 'Unpaid' && potentialPenalty > 0 && finalTotalAmount === baseAmount && (
                                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 text-left penalty-notice-print">
                                        Pay after {formatDate(bill.dueDate, { month: 'short', day: 'numeric' })} to include a 
                                        <strong> ₱{potentialPenalty.toFixed(2)} penalty</strong>.
                                        <br/>Total amount after due date will be <strong> ₱{amountDueAfterDate.toFixed(2)}</strong>.
                                    </div>
                                )}
                                 {bill.status === 'Unpaid' && finalTotalAmount > baseAmount && (
                                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 text-left penalty-notice-print">
                                        This amount includes a <strong>₱{(finalTotalAmount - baseAmount).toFixed(2)} penalty</strong> for late payment.
                                    </div>
                                )}
                                {bill.status === 'Paid' && (
                                    <div className="text-center p-2 bg-green-100 border border-green-300 rounded-lg">
                                        <p className="font-bold text-green-700">AMOUNT PAID: ₱{(bill.amountPaid || bill.amount).toFixed(2)}</p>
                                        <p className="text-xs text-gray-700">Paid on: {formatDate(bill.paymentDate, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                )}

                                <div className="invoice-section-print mt-2">
                                    <table className="charges-table-print w-full">
                                        <tbody>
                                            <DetailRow label="Water Charges" value={null} isBold={true} />
                                            <DetailRow label="Basic Charge" value={charges.basicCharge?.toFixed(2)} />
                                            <DetailRow label="FCDA" value={charges.fcda?.toFixed(2)} />
                                            <DetailRow label="Environmental Charge" value={charges.environmentalCharge?.toFixed(2)} />
                                            <DetailRow label="Sewer Charge" value={charges.sewerageCharge?.toFixed(2)} />
                                            <DetailRow label="Maintenance Service Charge" value={charges.maintenanceServiceCharge?.toFixed(2)} />
                                            <DetailRow label="Senior Citizen Discount" value={seniorCitizenDiscount > 0 ? `(${seniorCitizenDiscount.toFixed(2)})` : '0.00'} />
                                            <DetailRow label="Government Taxes" value={charges.governmentTaxes?.toFixed(2)} />
                                            <DetailRow label="SUBTOTAL" value={(charges.subTotalBeforeTaxes + charges.governmentTaxes - seniorCitizenDiscount).toFixed(2)} isBold={true} isSubtotal={true} />
                                            
                                            <tr className="h-2"><td colSpan="2"></td></tr>
                                            <DetailRow label="Other Charges" value={null} isBold={true} />
                                            <DetailRow label="Water Connection Fee" value="0.00" />
                                            <DetailRow label="Government Taxes" value="0.00" />
                                            <DetailRow label="Sewer Connection Fee" value="0.00" />
                                            <DetailRow label="Government Taxes" value="0.00" />
                                            <DetailRow label="Desludging Fee" value="0.00" />
                                            <DetailRow label="Government Taxes" value="0.00" />
                                            <DetailRow label="Reconnection Fee" value="0.00" />
                                            <DetailRow label="Government Taxes" value="0.00" />
                                            <DetailRow label="Others (VAT Exempt)" value="0.00" />
                                            <DetailRow label="Government Taxes" value="0.00" />
                                            <DetailRow label="Others (VATable)" value="0.00" />
                                            <DetailRow label="VAT" value="0.00" />
                                            <DetailRow label="SUBTOTAL" value="0.00" isBold={true} isSubtotal={true} />
                                            
                                            <tr className="h-2"><td colSpan="2"></td></tr>
                                            <DetailRow label="TOTAL CURRENT CHARGES" value={totalCurrentCharges.toFixed(2)} isBold={true} isSubtotal={true} />
                                            <DetailRow label="VATable Sales" value="0.00" />
                                            <DetailRow label="VAT Zero-rated" value="0.00" />
                                            <DetailRow label="VAT Exempt" value={charges.subTotalBeforeTaxes?.toFixed(2)} />
                                            <DetailRow label="VAT" value={charges.vat?.toFixed(2)} />
                                            <DetailRow label="Government Taxes" value={charges.governmentTaxes?.toFixed(2)} />
                                        </tbody>
                                    </table>
                                    
                                    <table className="charges-table-print w-full mt-4 total-due-row">
                                        <tbody>
                                            <tr>
                                                <td className="py-1 font-semibold">TOTAL AMOUNT DUE</td>
                                                <td className="py-1 text-right font-semibold">₱{finalTotalAmount.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-1 font-semibold">DUE DATE</td>
                                                <td className="py-1 text-right font-semibold">{formatDate(bill.dueDate, { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="bir-permit-print text-center text-xs text-gray-600 mt-6 pt-4 border-t border-gray-400">
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