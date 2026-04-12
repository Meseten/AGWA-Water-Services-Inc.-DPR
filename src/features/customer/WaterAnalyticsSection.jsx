import React, { useState, useEffect, useCallback } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import * as DataService from '../../services/dataService';
import { TrendingUp, Calendar, AlertTriangle, Info, BarChart2, Droplets, DollarSign, Activity } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const getSixMonthsAgo = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
};

const getToday = () => {
    return new Date().toISOString().split('T')[0];
};

const WaterAnalyticsSection = ({ user, db, showNotification }) => {
    const [consumptionData, setConsumptionData] = useState([]);
    const [grouping, setGrouping] = useState('monthly');
    const [metric, setMetric] = useState('volume'); 
    const [chartType, setChartType] = useState('bar');
    const [startDate, setStartDate] = useState(getSixMonthsAgo());
    const [endDate, setEndDate] = useState(getToday());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchConsumptionData = useCallback(async () => {
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
                const sortedBills = billsResult.data
                    .filter(bill => bill.billDate?.toDate && typeof bill.consumption === 'number' && bill.consumption >= 0)
                    .sort((a, b) => a.billDate.toDate() - b.billDate.toDate());
                setConsumptionData(sortedBills);
            } else {
                throw new Error(billsResult.error || "Failed to fetch billing data.");
            }
        } catch (err) {
            setError(err.message || "An unexpected error occurred fetching data.");
            showNotification(err.message || "Could not load consumption data.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [db, user, showNotification]);

    useEffect(() => {
        fetchConsumptionData();
    }, [fetchConsumptionData]);

    const aggregateData = (data, group, start, end, targetMetric) => {
        const aggregated = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime() + (24 * 60 * 60 * 1000 - 1);

        const filteredData = data.filter(bill => {
            const billTime = bill.billDate.toDate().getTime();
            return billTime >= startTime && billTime <= endTime;
        });

        filteredData.forEach(bill => {
            const date = bill.billDate.toDate();
            const year = date.getFullYear();
            const month = date.getMonth();
            let key;

            switch (group) {
                case 'yearly': key = `${year}`; break;
                case 'daily': key = `${year}-${String(month + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; break;
                case 'monthly':
                default: key = `${year}-${String(month + 1).padStart(2, '0')}`; break;
            }
            
            const valueToAdd = targetMetric === 'volume' ? (bill.consumption || 0) : ((bill.amountPaid || bill.amount) || 0);
            aggregated[key] = (aggregated[key] || 0) + valueToAdd;
        });

         const sortedKeys = Object.keys(aggregated).sort();

         return sortedKeys.reduce((obj, key) => {
            let label = key;
            if (group === 'monthly') {
                const [year, monthNum] = key.split('-');
                if(monthNum && monthNames[parseInt(monthNum) - 1]){
                    label = `${monthNames[parseInt(monthNum) - 1]} '${year.slice(-2)}`;
                }
            } else if (group === 'daily') {
                const [year, monthNum, day] = key.split('-');
                if(monthNum && day) {
                    label = `${monthNames[parseInt(monthNum) - 1]} ${day}`;
                }
            }
            obj[label] = aggregated[key];
            return obj;
         }, {});
    };

    const processedData = aggregateData(consumptionData, grouping, startDate, endDate, metric);
    const values = Object.values(processedData);
    
    const totalMetric = values.reduce((sum, val) => sum + val, 0);
    const avgMetric = values.length > 0 ? (totalMetric / values.length) : 0;
    const maxMetric = values.length > 0 ? Math.max(...values) : 0;

    const chartData = {
        labels: Object.keys(processedData),
        datasets: [
            {
                label: metric === 'volume' ? 'Consumption (m³)' : 'Cost (₱)',
                data: values,
                backgroundColor: metric === 'volume' ? 'rgba(59, 130, 246, 0.7)' : 'rgba(16, 185, 129, 0.7)',
                borderColor: metric === 'volume' ? 'rgba(37, 99, 235, 1)' : 'rgba(5, 150, 105, 1)',
                borderWidth: 2,
                borderRadius: chartType === 'bar' ? 4 : 0,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1F2937',
                titleColor: '#E5E7EB',
                bodyColor: '#D1D5DB',
                borderColor: '#4B5563',
                borderWidth: 1,
                padding: 10,
                callbacks: {
                    label: function(context) {
                        return metric === 'volume' 
                            ? ` Consumption: ${context.parsed.y.toFixed(2)} m³`
                            : ` Cost: ₱${context.parsed.y.toFixed(2)}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: metric === 'volume' ? 'Consumption (m³)' : 'Amount (₱)', color: '#4B5563' },
                grid: { color: '#E5E7EB', borderDash: [5, 5] },
                ticks: { color: '#6B7280' }
            },
            x: {
                title: { display: true, text: 'Period', color: '#4B5563' },
                grid: { display: false },
                ticks: { color: '#6B7280' }
            }
        }
    };

    const KpiCard = ({ title, value, icon: Icon, colorClass }) => (
        <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl shadow-sm flex items-center">
            <div className={`p-3 rounded-lg mr-4 ${colorClass}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center pb-4 border-b border-gray-200 gap-4">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 flex items-center">
                    <TrendingUp size={30} className="mr-3 text-blue-600" /> Consumption Analytics
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                     <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setMetric('volume')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${metric === 'volume' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Volume</button>
                        <button onClick={() => setMetric('cost')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${metric === 'cost' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Cost</button>
                     </div>
                     <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setChartType('bar')} className={`p-1.5 rounded-md transition-colors ${chartType === 'bar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><BarChart2 size={18}/></button>
                        <button onClick={() => setChartType('line')} className={`p-1.5 rounded-md transition-colors ${chartType === 'line' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Activity size={18}/></button>
                     </div>
                     <select value={grouping} onChange={(e) => setGrouping(e.target.value)} className="p-2 border rounded-md text-sm bg-gray-50 focus:ring-blue-500 focus:border-blue-500">
                         <option value="daily">Daily</option>
                         <option value="monthly">Monthly</option>
                         <option value="yearly">Yearly</option>
                     </select>
                     <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-gray-500" />
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded-md text-sm bg-gray-50 focus:ring-blue-500 focus:border-blue-500" max={endDate}/>
                        <span className="text-gray-500">-</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded-md text-sm bg-gray-50 focus:ring-blue-500 focus:border-blue-500" min={startDate} max={getToday()}/>
                    </div>
                </div>
            </div>

            {isLoading ? <LoadingSpinner message="Loading detailed analytics..." /> : error ? (
                <div className="text-center py-10 bg-red-50 p-4 rounded-lg">
                    <AlertTriangle size={48} className="mx-auto text-red-400 mb-3" />
                    <p className="text-red-600 text-lg font-semibold">Error Loading Data</p>
                    <p className="text-sm text-red-500 mt-1">{error}</p>
                </div>
            ) : consumptionData.length === 0 ? (
                 <div className="text-center py-10 bg-gray-50 p-6 rounded-lg shadow-inner border border-gray-100">
                    <Droplets size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600 text-lg">No consumption records found.</p>
                     <p className="text-sm text-gray-500 mt-1">Your detailed analytics will generate automatically once billing starts.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <KpiCard title={`Total ${metric === 'volume' ? 'Volume' : 'Cost'}`} value={metric === 'volume' ? `${totalMetric.toFixed(2)} m³` : `₱${totalMetric.toFixed(2)}`} icon={metric === 'volume' ? Droplets : DollarSign} colorClass={metric === 'volume' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'} />
                        <KpiCard title={`Average per ${grouping.replace('ly', '')}`} value={metric === 'volume' ? `${avgMetric.toFixed(2)} m³` : `₱${avgMetric.toFixed(2)}`} icon={Activity} colorClass="bg-purple-100 text-purple-600" />
                        <KpiCard title={`Highest ${grouping.replace('ly', '')}`} value={metric === 'volume' ? `${maxMetric.toFixed(2)} m³` : `₱${maxMetric.toFixed(2)}`} icon={TrendingUp} colorClass="bg-orange-100 text-orange-600" />
                    </div>

                    <div className="h-72 md:h-96 w-full p-4 border border-gray-100 rounded-xl bg-gray-50/50 shadow-inner">
                        {chartType === 'bar' ? <Bar options={chartOptions} data={chartData} /> : <Line options={chartOptions} data={chartData} />}
                    </div>
                </>
            )}
        </div>
    );
};

export default WaterAnalyticsSection;