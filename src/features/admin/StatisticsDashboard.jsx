import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { BarChart3, Users, MessageSquare, RotateCcw, Loader2, Info, Printer, Calendar, MapPin as MapPinIcon, DollarSign, Clock, UserCheck, Settings, AlertTriangle, TrendingUp, AlertOctagon, Droplets, CreditCard, UserPlus, Percent } from "lucide-react";
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import * as DataService from "../../services/dataService.js";
import { db } from "../../firebase/firebaseConfig.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const chartColors = {
    blue: 'rgba(59, 130, 246, 0.6)',
    blueBorder: 'rgba(59, 130, 246, 1)',
    green: 'rgba(16, 185, 129, 0.6)',
    greenBorder: 'rgba(16, 185, 129, 1)',
    purple: 'rgba(139, 92, 246, 0.6)',
    purpleBorder: 'rgba(139, 92, 246, 1)',
    red: 'rgba(239, 68, 68, 0.6)',
    redBorder: 'rgba(239, 68, 68, 1)',
    orange: 'rgba(249, 115, 22, 0.6)',
    orangeBorder: 'rgba(249, 115, 22, 1)',
    teal: 'rgba(20, 184, 166, 0.6)',
    tealBorder: 'rgba(20, 184, 166, 1)',
    sky: 'rgba(14, 165, 233, 0.6)',
    skyBorder: 'rgba(14, 165, 233, 1)',
    pink: 'rgba(236, 72, 153, 0.6)',
    pinkBorder: 'rgba(236, 72, 153, 1)',
    yellow: 'rgba(234, 179, 8, 0.6)',
    yellowBorder: 'rgba(234, 179, 8, 1)',
    gray: 'rgba(107, 114, 128, 0.6)',
    grayBorder: 'rgba(107, 114, 128, 1)',
};

const commonChartOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: true, position: 'bottom' },
        title: { display: true, text: title, font: { size: 16 }, color: '#374151', padding: { bottom: 15 } },
        tooltip: {
            backgroundColor: '#1F2937', titleColor: '#E5E7EB', bodyColor: '#D1D5DB',
            borderColor: '#4B5563', borderWidth: 1, padding: 10, boxPadding: 3,
        }
    },
    scales: {
        y: { beginAtZero: true, grid: { color: '#E5E7EB' }, ticks: { color: '#6B7280' } },
        x: { grid: { display: false }, ticks: { color: '#6B7280' } }
    }
});

const BarChartComponent = ({ data, title, label, color, borderColor }) => {
    if (!data || Object.keys(data).length === 0) return <p className="text-sm text-gray-500 text-center py-10">No data available for {title}.</p>;
    const chartData = {
        labels: Object.keys(data),
        datasets: [{ label: label, data: Object.values(data), backgroundColor: color, borderColor: borderColor, borderWidth: 1, borderRadius: 4 }],
    };
    return <div className="h-72 w-full"><Bar options={commonChartOptions(title)} data={chartData} /></div>;
};

const LineChartComponent = ({ data, title, datasets }) => {
    if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return <p className="text-sm text-gray-500 text-center py-10">No data available for {title}.</p>;
    }
    
    let chartData;
    if (datasets) {
        chartData = {
            labels: Object.keys(data),
            datasets: datasets.map(ds => ({
                ...ds,
                data: Object.values(data).map(val => val[ds.key] || val || 0)
            }))
        };
    } else {
         const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
         chartData = {
            labels: labels,
            datasets: [
                { label: 'Tickets', data: data.map(d => d.tickets), borderColor: chartColors.blueBorder, backgroundColor: chartColors.blue, tension: 0.1 },
                { label: 'Readings', data: data.map(d => d.readings), borderColor: chartColors.greenBorder, backgroundColor: chartColors.green, tension: 0.1 },
                { label: 'Payments', data: data.map(d => d.payments), borderColor: chartColors.purpleBorder, backgroundColor: chartColors.purple, tension: 0.1 },
            ],
        };
    }
    
    return <div className="h-72 w-full"><Line options={commonChartOptions(title)} data={chartData} /></div>;
};

const DoughnutChartComponent = ({ data, title, colorMap }) => {
    if (!data || Object.keys(data).length === 0) return <p className="text-sm text-gray-500 text-center py-10">No data for {title}.</p>;
    
    const defaultColors = [chartColors.blue, chartColors.green, chartColors.purple, chartColors.orange, chartColors.red, chartColors.teal, chartColors.sky, chartColors.pink, chartColors.yellow, chartColors.gray];
    
    const backgroundColors = colorMap 
        ? Object.keys(data).map(key => colorMap[key] || chartColors.gray)
        : defaultColors.slice(0, Object.keys(data).length);
        
    const chartData = {
        labels: Object.keys(data).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
        datasets: [{
            data: Object.values(data),
            backgroundColor: backgroundColors,
            borderColor: '#FFFFFF',
            borderWidth: 2,
        }],
    };
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 15 } },
            title: { display: true, text: title, font: { size: 16 }, color: '#374151', padding: { bottom: 15 } },
            tooltip: { backgroundColor: '#1F2937', titleColor: '#E5E7EB', bodyColor: '#D1D5DB', borderColor: '#4B5563', borderWidth: 1, padding: 10, boxPadding: 3 }
        },
    };
    return <div className="h-72 w-full"><Doughnut options={options} data={chartData} /></div>;
};

const PieChartComponent = ({ data, title }) => {
    if (!data || Object.keys(data).length === 0) return <p className="text-sm text-gray-500 text-center py-10">No data for {title}.</p>;
    const chartData = {
        labels: Object.keys(data),
        datasets: [{
            data: Object.values(data),
            backgroundColor: [chartColors.teal, chartColors.orange, chartColors.pink, chartColors.yellow, chartColors.sky, chartColors.blue, chartColors.green, chartColors.purple, chartColors.red],
            borderColor: '#FFFFFF',
            borderWidth: 2,
        }],
    };
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 15 } },
            title: { display: true, text: title, font: { size: 16 }, color: '#374151', padding: { bottom: 15 } },
            tooltip: { backgroundColor: '#1F2937', titleColor: '#E5E7EB', bodyColor: '#D1D5DB', borderColor: '#4B5563', borderWidth: 1, padding: 10, boxPadding: 3 }
        },
    };
    return <div className="h-72 w-full"><Pie options={options} data={chartData} /></div>;
};


const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-gray-50 p-4 rounded-lg shadow border-l-4" style={{ borderColor: color }}>
        <div className="flex items-center">
            <div className="p-2 rounded-full mr-3" style={{ backgroundColor: `${color}20` }}>
                <Icon size={20} style={{ color: color }}/>
            </div>
            <div>
                <p className="text-xs font-medium text-gray-500 uppercase">{title}</p>
                <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    </div>
);


const StatisticsDashboard = ({ showNotification = console.log }) => {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchStatistics = useCallback(async () => {
        setIsLoading(true);
        setError('');

        try {
            const results = await Promise.allSettled([
                DataService.getUsersStats(db),
                DataService.getTicketsStats(db),
                DataService.getRevenueStats(db),
                DataService.getHourlyActivityStats(db),
                DataService.getStaffActivityStats(db),
                DataService.getTechnicalStats(db),
                DataService.getRevenueByLocationStats(db),
                DataService.getOutstandingBalanceStats(db),
                DataService.getConsumptionStats(db),
                DataService.getPaymentMethodStats(db),
                DataService.getUserGrowthStats(db),
                DataService.getDiscountStats(db), 
            ]);

            const [
                usersResult, ticketsResult, revenueResult, hourlyResult, 
                staffResult, techResult, locationRevenueResult, outstandingResult,
                consumptionResult, paymentMethodResult, userGrowthResult,
                discountResult 
            ] = results;
            
            let partialError = '';
            const newStats = {};
            
            const processResult = (result, name, dataKey) => {
                if (result.status === 'fulfilled' && result.value.success) {
                    newStats[dataKey] = result.value.data;
                    if (name === 'users') {
                        newStats.totalUsers = result.value.data.total;
                        newStats.usersByRole = result.value.data.byRole;
                    }
                    if (name === 'tickets') {
                        newStats.ticketStats = result.value.data.byStatus;
                        newStats.ticketsByType = result.value.data.byType;
                        newStats.totalTickets = result.value.data.total;
                        newStats.openTickets = result.value.data.openCount;
                    }
                    if (name === 'outstanding') {
                        newStats.outstandingBalance = result.value.data.totalOutstanding;
                    }
                } else {
                    let errorMsg = 'Unknown error';
                    if (result.status === 'rejected') {
                        errorMsg = result.reason?.message || result.reason.toString();
                    } else if (result.value?.error) {
                        errorMsg = result.value.error;
                    }
                    partialError += `${name} stats failed: ${errorMsg} | `;
                }
            };
            
            processResult(usersResult, 'User', 'users');
            processResult(ticketsResult, 'Ticket', 'tickets');
            processResult(revenueResult, 'Monthly revenue', 'monthlyRevenue');
            processResult(hourlyResult, 'Hourly activity', 'hourlyActivity');
            processResult(staffResult, 'Staff activity', 'staffActivity');
            processResult(techResult, 'Technical', 'techStats');
            processResult(locationRevenueResult, 'Location revenue', 'revenueByLocation');
            processResult(outstandingResult, 'Outstanding balance', 'outstanding');
            processResult(consumptionResult, 'Consumption', 'monthlyConsumption');
            processResult(paymentMethodResult, 'Payment methods', 'paymentMethods');
            processResult(userGrowthResult, 'User growth', 'userGrowth');
            processResult(discountResult, 'Discount', 'discountStats');


            if (partialError) setError(partialError.trim().slice(0, -1));
            setStats(newStats);

        } catch (e) {
            setError("Critical error fetching statistics.");
            console.error("fetchStatistics error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchStatistics();
    }, [fetchStatistics]);

    const handlePrintReport = () => {
        const reportContent = document.getElementById('stats-print-area');
        const printStyles = document.getElementById('stats-print-styles');
        
        if (reportContent && printStyles) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            printWindow.document.write('<html><head><title>System Analytics Report</title>');
            
            printWindow.document.write('<style>' + printStyles.innerHTML + '</style>');
            
            printWindow.document.write('</head><body><div class="printable-area">');
            
            const headerHtml = `
                <header class="report-header">
                    <div>
                        <h1 class="logo-print">AGWA</h1>
                        <p class="tagline-print">Ensuring Clarity, Sustaining Life.</p>
                    </div>
                    <div class="company-address-print">
                        <strong>AGWA Water Services, Inc.</strong><br/>
                        123 Aqua Drive, Hydro Business Park<br/>
                        Naic, Cavite, Philippines 4110
                    </div>
                </header>
                <h1 class="report-title">
                    SYSTEM ANALYTICS REPORT
                </h1>
                <p class="report-generated-date">
                    Generated: ${new Date().toLocaleString()}
                </p>
            `;
            printWindow.document.write(headerHtml);
            printWindow.document.write(reportContent.innerHTML);
            
            printWindow.document.write(`
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 750); 
                    };
                </script>
            `);

            printWindow.document.write('</div></body></html>');
            printWindow.document.close();
        }
    };

    const totalRevenue = useMemo(() => stats?.monthlyRevenue ? Object.values(stats.monthlyRevenue).reduce((sum, val) => sum + val, 0) : 0, [stats?.monthlyRevenue]);
    const totalConsumption = useMemo(() => stats?.monthlyConsumption ? Object.values(stats.monthlyConsumption).reduce((sum, val) => sum + val, 0) : 0, [stats?.monthlyConsumption]);

    if (isLoading) {
        return <LoadingSpinner message="Loading system analytics..." className="mt-10 h-64" />;
    }

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-xl animate-fadeIn">
             <style id="stats-print-styles" dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0.75in;
                    }
                    body { 
                        font-family: 'Times New Roman', Times, serif; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                        color: #000;
                        font-size: 10pt;
                    }
                    .no-print { display: none !important; }
                    .printable-area { padding: 0 !important; max-width: 100%; margin: auto; }
                    .report-header { display: flex; justify-content: space-between; align-items: flex-start; text-align: left; border-bottom: 2px solid #000; padding-bottom: 1rem; }
                    .report-header .logo-print { font-size: 2.5rem; font-weight: 700; color: #1e3a8a !important; line-height: 1; margin: 0; }
                    .report-header .tagline-print { font-size: 0.8rem; color: #1d4ed8 !important; font-style: italic; margin: 0; }
                    .report-header .company-address-print { text-align: right; font-size: 0.8rem; line-height: 1.4; color: #374151 !important; }
                    h1.report-title { font-size: 1.5rem; font-weight: 700; color: #000 !important; margin-top: 1.5rem; margin-bottom: 1rem; text-align: center; text-transform: uppercase; }
                    p.report-generated-date { text-align: center; font-size: 0.9rem; color: #4b5563; margin-bottom: 2rem; }
                    .print-section { 
                        page-break-inside: avoid !important; 
                        margin-top: 1.5rem; 
                        border-top: 1px solid #eee !important; 
                        padding-top: 1.5rem !important;
                    }
                    h3.print-section-title {
                        font-size: 1.25rem; 
                        font-weight: 700; 
                        border-bottom: 1px solid #4b5563; 
                        padding-bottom: 0.25rem; 
                        margin-bottom: 1rem; 
                        color: #111827 !important;
                        display: flex;
                        align-items: center;
                    }
                    h3.print-section-title svg { display: none; }
                    .shadow-xl, .shadow-md, .shadow-lg, .border { 
                        border: 1px solid #e5e7eb !important; 
                        box-shadow: none !important; 
                    }
                    .bg-gray-50 { 
                        background-color: #F9FAFB !important; 
                    }
                    .bg-white { background-color: #FFFFFF !important; }
                    .grid { display: grid !important; }
                    .grid-cols-1 { grid-template-columns: repeat(1, 1fr) !important; }
                    .md\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
                    .lg\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
                    .lg\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr) !important; }
                    .md\\:grid-cols-4 { grid-template-columns: repeat(4, 1fr) !important; }
                    .lg\\:col-span-2 { grid-column: span 2 / span 2 !important; }
                    .lg\\:col-span-3 { grid-column: span 3 / span 3 !important; }
                    .gap-4 { gap: 1rem !important; }
                    .gap-6 { gap: 1.5rem !important; }
                    .p-4 { padding: 1rem !important; }
                    .mb-4 { margin-bottom: 1rem !important; }
                    .mb-6 { margin-bottom: 1.5rem !important; }
                    canvas { max-width: 100%; }
                    .h-72 { height: 18rem !important; }
                }
             `}} />
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 no-print">
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                    <BarChart3 size={30} className="mr-3 text-orange-600" /> System Analytics
                </h2>
                <div className="flex items-center gap-2">
                    <button onClick={fetchStatistics} disabled={isLoading} className="flex items-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg border border-gray-300">
                        {isLoading ? <Loader2 size={16} className="animate-spin mr-2"/> : <RotateCcw size={16} className="mr-2" />}
                        Refresh
                    </button>
                    <button onClick={handlePrintReport} className="flex items-center text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-lg">
                        <Printer size={16} className="mr-2"/> Print Report
                    </button>
                </div>
            </div>

            {error && <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 my-4 flex items-start no-print" role="alert"><Info size={20} className="mr-3 mt-1 flex-shrink-0" /><p className="text-sm">Could not load all statistics: <span className="font-mono text-xs break-all">{error}</span></p></div>}

            <div id="stats-print-area" className="printable-area">
                <div className="space-y-8">
                    <section className="print-section">
                         <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center print-section-title"><DollarSign size={22} className="mr-2 text-green-600"/>Business Analytics</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            <StatCard title="Total Revenue (12 Mo.)" value={`₱${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`} icon={DollarSign} color={chartColors.greenBorder}/>
                            <StatCard title="Total Outstanding" value={`₱${(stats?.outstandingBalance ?? 0).toLocaleString('en-US', {minimumFractionDigits: 0})}`} icon={AlertOctagon} color={chartColors.redBorder}/>
                            <StatCard title="Total Consumption (12 Mo.)" value={`${totalConsumption.toLocaleString('en-US')} m³`} icon={Droplets} color={chartColors.blueBorder}/>
                         </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <BarChartComponent
                                    data={stats?.monthlyRevenue || {}}
                                    title="Monthly Collected Revenue (Last 12 Months)"
                                    label="Revenue"
                                    color={chartColors.green}
                                    borderColor={chartColors.greenBorder}
                                />
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <BarChartComponent
                                    data={stats?.monthlyConsumption || {}}
                                    title="Monthly Water Consumption (Last 12 Months)"
                                    label="Consumption (m³)"
                                    color={chartColors.blue}
                                    borderColor={chartColors.blueBorder}
                                />
                            </div>
                             <div className="p-4 bg-gray-50 rounded-lg border">
                                <DoughnutChartComponent data={stats?.revenueByLocation} title="Revenue by Location" />
                            </div>
                             <div className="p-4 bg-gray-50 rounded-lg border">
                                <DoughnutChartComponent data={stats?.paymentMethods} title="Payments by Method" />
                            </div>
                        </div>
                    </section>
                    
                    <section className="print-section pt-6 border-t">
                         <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center print-section-title"><Users size={22} className="mr-2 text-purple-600"/>User & Support Analytics</h3>
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <StatCard title="Total Users" value={stats?.totalUsers ?? 'N/A'} icon={Users} color={chartColors.purpleBorder}/>
                            <StatCard title="Total Tickets" value={stats?.totalTickets ?? 'N/A'} icon={MessageSquare} color={chartColors.orangeBorder}/>
                            <StatCard title="Open Tickets" value={stats?.openTickets ?? '0'} icon={AlertTriangle} color={chartColors.redBorder}/>
                            <StatCard title="Verified Discounts" value={stats?.discountStats?.verified ?? 'N/A'} icon={Percent} color={chartColors.greenBorder}/>
                        </div>
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                             <div className="p-4 bg-gray-50 rounded-lg border">
                                <LineChartComponent 
                                    data={stats?.userGrowth || {}} 
                                    title="New User Signups (Last 12 Months)"
                                    datasets={[{
                                        label: 'New Users',
                                        key: 'users',
                                        borderColor: chartColors.purpleBorder,
                                        backgroundColor: chartColors.purple,
                                        tension: 0.1
                                    }]}
                                />
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <DoughnutChartComponent data={stats?.usersByRole} title="Users by Role" />
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <PieChartComponent data={stats?.ticketsByType} title="Tickets by Type" />
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <DoughnutChartComponent data={stats?.ticketStats} title="Support Tickets by Status" />
                            </div>
                             <div className="p-4 bg-gray-50 rounded-lg border lg:col-span-2">
                                <DoughnutChartComponent 
                                    data={stats?.discountStats} 
                                    title="Customer Discount Status"
                                    colorMap={{
                                        'none': chartColors.gray,
                                        'pending': chartColors.yellow,
                                        'verified': chartColors.green
                                    }}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="print-section pt-6 border-t">
                         <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center print-section-title"><UserCheck size={22} className="mr-2 text-sky-600"/>Staff & Technical Analytics</h3>
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <StatCard title="Total Routes" value={stats?.techStats?.totalRoutes ?? 'N/A'} icon={MapPinIcon} color={chartColors.tealBorder}/>
                            <StatCard title="Total Accounts" value={stats?.techStats?.totalAccounts ?? 'N/A'} icon={Users} color={chartColors.tealBorder}/>
                            <StatCard title="Active Interruptions" value={stats?.techStats?.activeInterrupts ?? 'N/A'} icon={AlertTriangle} color={chartColors.redBorder}/>
                            <StatCard title="Unassigned Routes" value={stats?.techStats?.unassignedRoutes ?? 'N/A'} icon={Settings} color={chartColors.orangeBorder}/>
                         </div>
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                             <div className="p-4 bg-gray-50 rounded-lg border">
                                <BarChartComponent
                                    data={stats?.staffActivity?.readerActivity || {}}
                                    title="Readings Submitted Today (by Staff)"
                                    label="Readings"
                                    color={chartColors.sky}
                                    borderColor={chartColors.skyBorder}
                                />
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <BarChartComponent
                                    data={stats?.staffActivity?.clerkActivity || {}}
                                    title="Payments Processed Today (by Staff)"
                                    label="Payments"
                                    color={chartColors.purple}
                                    borderColor={chartColors.purpleBorder}
                                />
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <LineChartComponent data={stats?.hourlyActivity || []} title="Hourly Portal Activity (Today)" />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default StatisticsDashboard;