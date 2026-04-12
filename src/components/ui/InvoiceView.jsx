import React from 'react';
import { formatDate } from '../../utils/userUtils';
import Barcode from './Barcode';
import mwdLogo from '../../assets/mwdlogo.png'; 

const InvoiceView = ({ billData, userData, systemSettings, isCustomerView = false }) => {
    if (!billData || !userData) {
        return <div className="p-4 text-center text-gray-500 text-sm">Invoice data is incomplete.</div>;
    }

    const {
        invoiceNumber,
        billingPeriod,
        monthYear,
        billDate,
        dueDate,
        previousReading,
        currentReading,
        consumption,
        prev3MonthsConsumption,
        baseCharge,
        consumptionCharge,
        penaltyAmount = 0,
        amount = 0,
        status,
        amountPaid,
        paymentDate,
        previousUnpaidAmount = 0,
        seniorCitizenDiscount = 0,
    } = billData;

    const {
        displayName,
        serviceAddress,
        accountNumber,
        meterSerialNumber,
        serviceType = 'Residential'
    } = userData;

    const addressString = serviceAddress ? `${serviceAddress.street || ''} ${serviceAddress.barangay || ''}, ${serviceAddress.municipality || ''}, ${serviceAddress.province || ''}`.trim() : 'Address not provided';
    
    const isPaid = status === 'Paid';
    const finalAmount = isPaid ? amountPaid : amount;
    
    let subtotalA = (baseCharge || 0) + (consumptionCharge || 0);
    const subtotalB = subtotalA - (seniorCitizenDiscount || 0);

    return (
        <div className="bg-white p-3 mx-auto font-sans text-black border border-gray-400 relative overflow-hidden" style={{ maxWidth: '5.5in', fontSize: '10px', lineHeight: '1.3' }} id={`invoice-${billData.id}`}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black pb-2 mb-2">
                <div className="flex items-center gap-2">
                    <img src={mwdLogo} alt="MWD Logo" style={{ width: '45px', height: '45px', objectFit: 'contain' }} />
                    <div>
                        <h1 className="font-bold text-[12px] uppercase m-0 leading-tight tracking-tight text-blue-900">MARAGONDON WATER DISTRICT</h1>
                        <p className="text-[9px] m-0 text-blue-800">Maragondon, Cavite</p>
                        <p className="text-[8px] italic m-0 text-gray-00">0917-5289190/(6346) 412-1575</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="font-bold text-[13px] uppercase m-0 tracking-wider">Statement of Account</h2>
                    <p className="text-[9px] m-0 font-mono text-gray-600">{invoiceNumber || `AGWA-${billData.id?.slice(0,8).toUpperCase()}`}</p>
                </div>
            </div>

            {/* Customer & Billing Info */}
            <div className="grid grid-cols-[1fr_120px] gap-2 border-b border-black pb-2 mb-2">
                <div>
                    <div className="flex"><span className="w-16 font-semibold text-gray-600">Name:</span> <span className="font-bold truncate">{displayName}</span></div>
                    <div className="flex"><span className="w-16 font-semibold text-gray-600">Address:</span> <span className="truncate pr-2">{addressString}</span></div>
                    <div className="flex"><span className="w-16 font-semibold text-gray-600">Acct No:</span> <span className="font-bold font-mono">{accountNumber}</span></div>
                    <div className="flex"><span className="w-16 font-semibold text-gray-600">Meter No:</span> <span>{meterSerialNumber || 'N/A'}</span></div>
                    <div className="flex"><span className="w-16 font-semibold text-gray-600">Class:</span> <span>{serviceType}</span></div>
                </div>
                <div className="text-right">
                    <div className="flex justify-between"><span className="text-gray-600">Period:</span> <span className="font-semibold">{monthYear}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Bill Date:</span> <span className="font-semibold">{formatDate(billDate?.toDate ? billDate.toDate() : new Date(billDate), {month: 'short', day: 'numeric', year: 'numeric'})}</span></div>
                    <div className="flex justify-between mt-1 pt-1 border-t border-dashed border-gray-300"><span className="font-bold text-red-600">Due Date:</span> <span className="font-bold text-[11px] text-red-600">{formatDate(dueDate?.toDate ? dueDate.toDate() : new Date(dueDate), {month: 'short', day: 'numeric', year: 'numeric'})}</span></div>
                </div>
            </div>

            {/* Reading & Consumption */}
            <div className="grid grid-cols-4 gap-1 text-center border-b border-black pb-2 mb-2 bg-gray-50 py-1">
                <div><div className="text-[8px] uppercase text-gray-500 font-bold">Prev Read</div><div className="font-semibold">{previousReading}</div></div>
                <div><div className="text-[8px] uppercase text-gray-500 font-bold">Pres Read</div><div className="font-semibold">{currentReading}</div></div>
                <div><div className="text-[8px] uppercase text-blue-700 font-bold">Consumption</div><div className="font-bold text-[12px] text-blue-800">{consumption} m³</div></div>
                <div><div className="text-[8px] uppercase text-gray-500 font-bold">3-Mo Avg</div><div className="font-semibold">{prev3MonthsConsumption !== null ? prev3MonthsConsumption : '-'}</div></div>
            </div>

            {/* Charges Breakdown */}
            <div className="border-b border-black pb-2 mb-2 px-1">
                <h3 className="font-bold text-[10px] uppercase border-b border-dashed border-gray-300 mb-1 text-gray-700">Billing Details</h3>
                <div className="flex justify-between"><span>Base Charge</span> <span>{baseCharge?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Consumption Charge</span> <span>{consumptionCharge?.toFixed(2)}</span></div>
                {seniorCitizenDiscount > 0 && <div className="flex justify-between text-green-700"><span>SC Discount</span> <span>-{seniorCitizenDiscount.toFixed(2)}</span></div>}
                {previousUnpaidAmount > 0 && <div className="flex justify-between"><span>Arrears / Unpaid Bal</span> <span>{previousUnpaidAmount.toFixed(2)}</span></div>}
                {penaltyAmount > 0 && <div className="flex justify-between text-red-600"><span>Penalty</span> <span>{penaltyAmount.toFixed(2)}</span></div>}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center mb-2 p-1.5 bg-gray-200 border-y-2 border-black">
                <span className="font-bold text-[12px] uppercase">Total Amount Due</span>
                <span className="font-black text-[16px]">₱{finalAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>

            {/* Reminders & Barcode */}
            <div className="flex justify-between items-end gap-3 mt-3">
                <div className="w-2/3">
                    <p className="font-bold text-[9px] uppercase mb-0.5 text-gray-800">Important Reminders:</p>
                    <ul className="text-[8px] pl-3 m-0 list-disc leading-tight text-gray-700 space-y-0.5">
                        <li>When paying, please bring this Statement of Account to avoid unnecessary delay.</li>
                        <li>Water service may be disconnected if accounts are not settled after due date.</li>
                        <li>Please report to MWD for any illegal connected, by-passes and tampered water meters. All information shall be treated highly confidential.</li>
                    </ul>
                </div>
                <div className="w-1/3 text-center flex flex-col items-center">
                    <div className="h-8 w-full mb-1 overflow-hidden flex justify-center"><Barcode value={accountNumber} /></div>
                    <p className="text-[7px] text-gray-500 uppercase tracking-widest">System Generated</p>
                </div>
            </div>

            {isPaid && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-30">
                    <span className="text-6xl font-black border-4 border-green-600 text-green-600 p-2 rotate-[-15deg] tracking-widest">PAID</span>
                </div>
            )}
             {status === 'Unpaid' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-10">
                    <span className="text-6xl font-black border-4 border-red-600 text-red-600 p-2 rotate-[-15deg] tracking-widest">UNPAID</span>
                </div>
            )}
        </div>
    );
};

export default InvoiceView;