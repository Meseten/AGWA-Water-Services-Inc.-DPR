import React from 'react';
import { Gift, Star, ShieldCheck, HelpCircle } from 'lucide-react';

const tiers = {
    Bronze: { points: 0, color: 'text-yellow-700', iconColor: '#cd7f32', benefits: ["Standard Support Access", "Basic Portal Features", "Regular Service Updates"] },
    Silver: { points: 500, color: 'text-gray-600', iconColor: '#c0c0c0', benefits: ["Priority Support Queue", "Eligibility for 1% Annual Bill Rebate*", "Early Access to Water Saving Tips", "+ Bronze Benefits"] },
    Gold: { points: 1500, color: 'text-amber-500', iconColor: '#ffd700', benefits: ["Dedicated Support Agent Option", "Eligibility for 2.5% Annual Bill Rebate*", "Exclusive Conservation Workshop Invites", "+ Silver Benefits"] },
    Platinum: { points: 3000, color: 'text-blue-700', iconColor: '#e5e4e2', benefits: ["Highest Priority Support Escalation", "Eligibility for 5% Annual Bill Rebate*", "Free Annual Water Audit Consultation (On Request)", "+ Gold Benefits"] }
};

const RebateProgramSection = ({ userData, systemSettings = {} }) => {
    const currentPoints = userData?.rebatePoints || 0;

    const getCurrentTierName = (points) => {
        if (points >= tiers.Platinum.points) return 'Platinum';
        if (points >= tiers.Gold.points) return 'Gold';
        if (points >= tiers.Silver.points) return 'Silver';
        return 'Bronze';
    };

    const currentTierName = getCurrentTierName(currentPoints);
    const currentTier = tiers[currentTierName];

    const getNextTierInfo = (currentTierKey) => {
         const tierNames = Object.keys(tiers);
         const currentTierIndex = tierNames.indexOf(currentTierKey);
         if (currentTierIndex >= 0 && currentTierIndex < tierNames.length - 1) {
             const nextTierName = tierNames[currentTierIndex + 1];
             return { name: nextTierName, ...tiers[nextTierName] };
         }
         return null;
    };

    const nextTier = getNextTierInfo(currentTierName);
    const pointsToNextTier = nextTier ? nextTier.points - currentPoints : 0;
    const progressPercentage = nextTier ? Math.max(0, Math.min(100, (currentPoints / nextTier.points) * 100)) : 100;

    const {
        isRebateProgramEnabled = false,
        pointsPerPeso = 0.01,
        earlyPaymentBonusPoints = 10,
        earlyPaymentDaysThreshold = 7
    } = systemSettings;

    const pointsPer100Peso = (pointsPerPeso * 100);

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                    <Gift size={30} className="mr-3 text-amber-500" /> AGWA Rewards Program
                </h2>
            </div>

            <section className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg shadow-xl text-center">
                <h3 className="text-xl font-semibold mb-2">Your Rewards Status</h3>
                <div className={`text-4xl font-bold mb-1 flex items-center justify-center gap-2`}>
                   <Star size={36} fill={currentTier.iconColor} stroke={currentTier.iconColor} />
                   <span style={{ color: currentTier.iconColor }}>{currentTierName} Tier</span>
                </div>
                <p className="text-2xl font-semibold text-blue-100 mb-3">{currentPoints.toLocaleString()} Points</p>

                {nextTier && (
                    <>
                        <div className="w-full max-w-md mx-auto bg-blue-400 rounded-full h-3 mb-1 overflow-hidden shadow-inner">
                            <div className="bg-yellow-400 h-3 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                        <p className="text-xs text-blue-100">
                            {pointsToNextTier > 0
                             ? `${pointsToNextTier.toLocaleString()} points needed for ${nextTier.name} tier (${nextTier.points.toLocaleString()} total).`
                             : `You've reached the ${nextTier.name} tier!`
                            }
                        </p>
                    </>
                )}
                 {currentTierName === 'Platinum' && <p className="text-sm text-yellow-300 font-semibold mt-2">🌟 You are a Platinum member! Enjoy the highest rewards.</p>}
            </section>

             <section className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Benefits for {currentTierName} Tier</h3>
                <div className="p-4 border rounded-lg bg-gray-50 shadow-inner">
                    <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-700 pl-4">
                        {currentTier.benefits.map((benefit, index) => (
                            <li key={index}>{benefit.replace('*', '')}</li>
                        ))}
                    </ul>
                     <p className="text-xs text-gray-500 mt-3">*Annual Bill Rebate eligibility requires 12 consecutive months of good standing within the tier. Rebate applied as bill credit. See terms.</p>
                </div>
            </section>

            <section className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                    <HelpCircle size={20} className="mr-2"/> How to Earn & Use Points (Mechanics)
                </h3>
                {!isRebateProgramEnabled ? (
                    <p className="text-sm text-gray-700">The AGWA Rewards Program is not currently active.</p>
                ) : (
                    <div className="space-y-3 text-sm text-gray-700">
                        <p>Earning and using points is simple:</p>
                        <ul className="list-none space-y-2 pl-2">
                            <li className="flex items-start">
                                <Star size={16} className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0"/>
                                <div><strong>EARN by Paying Your Bill:</strong> Earn <strong>{pointsPer100Peso.toLocaleString()} point{pointsPer100Peso !== 1 ? 's' : ''}</strong> for every <strong>₱100.00</strong> paid on your water bill.</div>
                            </li>
                            <li className="flex items-start">
                                <Star size={16} className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0"/>
                                <div><strong>EARN by Paying Early:</strong> Earn a <strong>{earlyPaymentBonusPoints} point bonus</strong> when you pay your bill in full at least <strong>{earlyPaymentDaysThreshold} day{earlyPaymentDaysThreshold !== 1 ? 's' : ''}</strong> before your due date.</div>
                            </li>
                             <li className="flex items-start">
                                <Gift size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0"/>
                                <div><strong>USE to Pay Your Bill:</strong> Use your points to pay your bill directly! <strong>1 Point = ₱1.00</strong>. If you have enough points to cover your entire bill, a "Pay with Points" button will automatically appear in the 'My Bills' section.</div>
                            </li>
                        </ul>
                        <p className="text-xs text-gray-500">Points are automatically credited to your account after your payment is successfully posted (usually within 24-48 hours).</p>
                    </div>
                )}
            </section>

             <section>
                <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                     <ShieldCheck size={20} className="mr-2 text-gray-500"/> Program Terms & Conditions
                </h3>
                <details className="text-xs text-gray-500 space-y-2 border p-3 rounded bg-gray-50 cursor-pointer group hover:bg-gray-100 transition-colors">
                    <summary className="font-medium text-gray-700 group-hover:text-blue-600 list-none flex justify-between items-center">
                        Click to view Terms & Conditions
                        <span className="transition-transform duration-200 group-open:rotate-180">▼</span>
                    </summary>
                    <div className="mt-2 space-y-1.5 max-h-0 overflow-hidden group-open:max-h-[500px] transition-all duration-500 ease-in-out pt-2 border-t">
                        <p><strong>1. Eligibility:</strong> All AGWA Water Services, Inc. customers with an active residential or commercial account in good standing are eligible to participate in the AGWA Rewards Program ("Program").</p>
                        <p><strong>2. Earning Points:</strong> Points are earned based on (a) the total amount paid for water bills and (b) bonuses for early payments, as specified in the "How to Earn Points" section. Earning rates are determined by AGWA and may be subject to change based on system settings.</p>
                        <p><strong>3. Point Crediting:</strong> Points will be credited to the customer's account after a payment is successfully processed and posted. This may take up to 48 hours. Points are not earned on payments made using Rebate Points.</p>
                        <p><strong>4. Redeeming Points:</strong> Points may be redeemed as full payment for an outstanding water bill ("Bill"), subject to the following conditions:
                            (a) The customer must have sufficient points to cover the *entire* amount of the Bill. (Redemption Rate: 1 Point = 1 Philippine Peso).
                            (b) Partial payments using points are not supported.
                            (c) If sufficient points are available, a "Pay with Points" option will be automatically presented in the Portal.
                            (d) Point redemption is final and irreversible.
                        </p>
                        <p><strong>5. Tiers and Benefits:</strong> Tier status (Bronze, Silver, Gold, Platinum) is determined by the total accumulated points. Benefits are associated with each tier and are non-transferable. AGWA reserves the right to modify, add, or remove benefits at any time.</p>
                        <p><strong>6. Annual Bill Rebate:</strong> Rebates mentioned in tier benefits (e.g., "Eligibility for 1% Annual Bill Rebate") are not automatic. To qualify, a customer must maintain their tier status (Silver or higher) and remain in good standing (no service disconnections due to non-payment) for 12 consecutive months. The rebate is calculated on the total basic charges paid within that 12-month period and will be applied as a credit to a future bill, not as a cash payout.</p>
                        <p><strong>7. Point Expiration:</strong> Your points do not expire. They are valid for the entire lifetime of your active account. AGWA reserves the right to modify this policy with 60 days' prior notice.</p>
                        <p><strong>8. No Cash Value:</strong> Points have no cash value, are non-transferable, and cannot be sold, bartered, or redeemed for cash.</p>
                        <p><strong>9. Program Modification/Termination:</strong> AGWA Water Services, Inc. reserves the right to modify, suspend, or terminate the AGWA Rewards Program, its rules, tiers, benefits, or earning/redemption mechanics at any time, with or without prior notice.</p>
                        <p><strong>10. Account Status:</strong> Customers must be in good standing to enjoy tier benefits. Accounts that are suspended or disconnected may have their benefits temporarily revoked.</p>
                        <p><strong>11. Disputes:</strong> Any discrepancies in point calculation must be reported to AGWA customer service within 60 days of the payment date. AGWA's decision on point disputes is final.</p>
                        <p><strong>12. Acceptance of Terms:</strong> Continued participation in the Program, including earning and redeeming benefits, constitutes acceptance of these Terms & Conditions.</p>
                    </div>
                 </details>
            </section>
        </div>
    );
};

export default RebateProgramSection;