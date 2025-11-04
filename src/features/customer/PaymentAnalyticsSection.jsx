import React, { useState, useEffect, useCallback } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import * as DataService from '../../services/dataService';
import { CreditCard, Info } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const chartColors = {
    Cash: 'rgba(16, 185, 129, 0.7)',
    Stripe: 'rgba(59, 130, 246, 0.7)',
    Card: 'rgba(59, 130, 246, 0.7)',
    Check: 'rgba(249, 115, 22, 0.7)',
    'E-wallet (GCash/Maya)': 'rgba(139, 92, 246, 0.7)',
    Unknown: 'rgba(107, 114, 128, 0.7)'
};

const chartBorderColors = {
    Cash: 'rgba(16, 185, 129, 1)',
    Stripe: 'rgba(59, 130, 246, 1)',
    Card: 'rgba(59, 130, 246, 1)',
    Check: 'rgba(249, 115, 22, 1)',
    'E-wallet (GCash/Maya)': 'rgba(139, 92, 246, 1)',
    Unknown: 'rgba(107, 114, 128, 1)'
};


const PaymentAnalyticsSection = ({ user, db, showNotification }) => {
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchPaymentData = useCallback(async () => {
        if (!user || !user.uid) {
             setError("User data not available.");
             setIsLoading(false);
             return;
        }
        setIsLoading(true);
        setError('');
        try {
            const billsResult = await DataService.getBillsForUser(db, user.uid);
            if (billsResult.success) {
                const paidBills = billsResult.data.filter(bill => bill.status === 'Paid');
                
                if (paidBills.length === 0) {
                    setChartData(null);
                } else {
                    const methodCounts = {};
                    paidBills.forEach(bill => {
                        let method = bill.paymentMethod || 'Unknown';
                        if (method === 'card') method = 'Stripe';
                        if (method === 'Card (Debit/Credit)') method = 'Card';
                        methodCounts[method] = (methodCounts[method] || 0) + 1;
                    });

                    const labels = Object.keys(methodCounts);
                    const data = Object.values(methodCounts);

                    setChartData({
                        labels: labels,
                        datasets: [{
                            label: 'Number of Payments',
                            data: data,
                            backgroundColor: labels.map(label => chartColors[label] || chartColors.Unknown),
                            borderColor: labels.map(label => chartBorderColors[label] || chartBorderColors.Unknown),
                            borderWidth: 1,
                        }],
                    });
                }
            } else {
                throw new Error(billsResult.error || "Failed to fetch billing data.");
            }
        } catch (err) {
            setError(err.message || "An unexpected error occurred fetching data.");
            showNotification(err.message || "Could not load payment data.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [db, user, showNotification]);

    useEffect(() => {
        fetchPaymentData();
    }, [fetchPaymentData]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
            },
            title: {
                display: true,
                text: 'Your Payment Methods (by count)',
                font: { size: 18 },
                color: '#374151',
                padding: { bottom: 20 }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed !== null) {
                            label += `${context.parsed} payment(s)`;
                        }
                        return label;
                    }
                }
            }
        },
    };

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200 gap-4">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                    <CreditCard size={30} className="mr-3 text-purple-600" /> Payment Analytics
                </h2>
            </div>

            {isLoading && <LoadingSpinner message="Loading your payment history..." />}
            
            {error && (
                <div className="text-center py-10 bg-red-50 p-4 rounded-lg">
                    <Info size={48} className="mx-auto text-red-400 mb-3" />
                    <p className="text-red-600 text-lg font-semibold">Error Loading Data</p>
                    <p className="text-sm text-red-500 mt-1">{error}</p>
                </div>
            )}

            {!isLoading && !error && !chartData && (
                 <div className="text-center py-10 bg-gray-50 p-6 rounded-lg shadow-inner">
                    <Info size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 text-lg">No Payment Data Found</p>
                     <p className="text-sm text-gray-500 mt-1">Your payment analytics will appear here once you pay a bill.</p>
                </div>
            )}

            {!isLoading && !error && chartData && (
                <div className="h-80 md:h-96 w-full p-4 border rounded-lg bg-gray-50 shadow-inner">
                    <Pie data={chartData} options={chartOptions} />
                </div>
            )}
        </div>
    );
};

export default PaymentAnalyticsSection;