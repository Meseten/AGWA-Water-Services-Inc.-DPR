import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { BarChart3, Users, MessageSquare, RotateCcw, Loader2, Info, Printer, Calendar, MapPin as MapPinIcon, DollarSign, Clock, UserCheck, Settings, AlertTriangle, TrendingUp, AlertOctagon, Droplets, CreditCard, UserPlus, Percent, Sparkles } from "lucide-react";
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import * as DataService from "../../services/dataService.js";
import { db } from "../../firebase/firebaseConfig.js";
import { generateChartAnalysis, callDeepseekAPI } from "../../services/deepseekService.js";
import DOMPurify from 'dompurify';

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
    animation: false, 
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
        animation: false,
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
        animation: false,
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
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

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
                    
                    if (name === 'User') {
                        newStats.totalUsers = result.value.data.total;
                        newStats.usersByRole = result.value.data.byRole;
                    }
                    if (name === 'Ticket') {
                        newStats.ticketStats = result.value.data.byStatus;
                        newStats.ticketsByType = result.value.data.byType;
                        newStats.totalTickets = result.value.data.total;
                        newStats.openTickets = result.value.data.openCount;
                    }
                    if (name === 'Outstanding balance') {
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

    const generateExecutiveSummary = async (statsSummary) => {
        const prompt = `
            You are 'Agie', an AI analyst for AGWA Water Services. The currency is **Philippine Pesos (PHP)**.
            Analyze the following JSON data and generate a professional, high-level "Executive Summary" narrative for a printed report.
            - Start with "<h3 class='print-section-title'>Executive Summary</h3>".
            - Use simple HTML for formatting: <p>, <strong>, <ul>, <li>.
            - Write 2-3 short paragraphs.
            - Paragraph 1: Cover Business Analytics (Revenue, Outstanding Balance in PHP).
            - Paragraph 2: Cover User & Support Analytics (User totals, ticket status).
            - Paragraph 3: Cover Technical & Staff Operations (Routes, Interruptions, Staff Activity).
            - Be concise and highlight the most important numbers (e.g., total users, total revenue (PHP), open tickets, active interruptions).
            - Data: ${JSON.stringify(statsSummary)}
        `;
        try {
            return await callDeepseekAPI([{ role: 'user', content: prompt }], 'llama-3.1-8b-instant');
        } catch (error) {
            console.error("AI Executive Summary Generation Failed:", error);
            return "<h3 class='print-section-title'>Executive Summary</h3><p><strong>Analysis:</strong> <em>AI narrative generation failed. Please check the API connection or key.</em></p>";
        }
    };

    const handlePrintReport = async () => {
        if (isGeneratingReport || !stats) return;
        setIsGeneratingReport(true);
        showNotification("Generating report... This may take a moment.", "info");

        try {
            const chartCanvases = document.getElementById('stats-print-area').querySelectorAll('canvas');
            const chartImagePromises = Array.from(chartCanvases).map(canvas => {
                return new Promise((resolve) => {
                    const chartInstance = Object.values(ChartJS.instances).find(c => c.canvas === canvas);
                    if (chartInstance) {
                        const chartId = canvas.closest('[data-chart-id]')?.dataset.chartId;
                        if (chartId) {
                            resolve({ id: chartId, dataUrl: chartInstance.toBase64Image('image/png', 1.0) });
                        } else {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                });
            });
            const chartImageResults = (await Promise.all(chartImagePromises)).filter(Boolean);
            const chartImages = chartImageResults.reduce((acc, img) => {
                acc[img.id] = img.dataUrl;
                return acc;
            }, {});

            const statsSummary = {
                business: {
                    totalRevenue_12mo_PHP: totalRevenue,
                    totalOutstanding_PHP: stats.outstandingBalance,
                    totalConsumption_12mo_m3: totalConsumption,
                    revenueByLocation_PHP: stats.revenueByLocation,
                    paymentMethods: stats.paymentMethods,
                },
                userSupport: {
                    totalUsers: stats.totalUsers,
                    usersByRole: stats.usersByRole,
                    totalTickets: stats.totalTickets,
                    openTickets: stats.openTickets,
                    ticketsByStatus: stats.ticketStats,
                    ticketsByType: stats.ticketsByType,
                    discountStats: stats.discountStats,
                },
                technical: {
                    totalRoutes: stats.techStats?.totalRoutes,
                    totalAccounts: stats.techStats?.totalAccounts,
                    activeInterrupts: stats.techStats?.activeInterrupts,
                    unassignedRoutes: stats.techStats?.unassignedRoutes,
                },
                activity: {
                    staffReadings: stats.staffActivity?.readerActivity,
                    staffPayments: stats.staffActivity?.clerkActivity,
                }
            };
            
            const analysisPromises = [
                generateExecutiveSummary(statsSummary),
                generateChartAnalysis("Monthly Collected Revenue (Last 12 Months)", stats.monthlyRevenue || {}),
                generateChartAnalysis("Monthly Water Consumption (Last 12 Months)", stats.monthlyConsumption || {}),
                generateChartAnalysis("Revenue by Location", stats.revenueByLocation || {}),
                generateChartAnalysis("Payments by Method", stats.paymentMethods || {}),
                generateChartAnalysis("New User Signups (Last 12 Months)", stats.userGrowth || {}),
                generateChartAnalysis("Users by Role", stats.usersByRole || {}),
                generateChartAnalysis("Tickets by Type", stats.ticketsByType || {}),
                generateChartAnalysis("Support Tickets by Status", stats.ticketStats || {}),
                generateChartAnalysis("Customer Discount Status", stats.discountStats || {}),
                generateChartAnalysis("Readings Submitted Today (by Staff)", stats.staffActivity?.readerActivity || {}),
                generateChartAnalysis("Payments Processed Today (by Staff)", stats.staffActivity?.clerkActivity || {}),
                generateChartAnalysis("Hourly Portal Activity (Today)", stats.hourlyActivity || []),
            ];
            const analysisResults = await Promise.allSettled(analysisPromises);
            const getAnalysis = (index, fallback) => (analysisResults[index].status === 'fulfilled' ? analysisResults[index].value : `<p><strong>Analysis:</strong> <em>${fallback}</em></p>`);

            const analyses = {
                summary: getAnalysis(0, 'Executive summary generation failed.'),
                revenue: getAnalysis(1, 'Revenue analysis failed.'),
                consumption: getAnalysis(2, 'Consumption analysis failed.'),
                locationRevenue: getAnalysis(3, 'Location revenue analysis failed.'),
                paymentMethods: getAnalysis(4, 'Payment method analysis failed.'),
                userGrowth: getAnalysis(5, 'User growth analysis failed.'),
                userRoles: getAnalysis(6, 'User role analysis failed.'),
                ticketTypes: getAnalysis(7, 'Ticket type analysis failed.'),
                ticketStatus: getAnalysis(8, 'Ticket status analysis failed.'),
                discountStatus: getAnalysis(9, 'Discount status analysis failed.'),
                staffReadings: getAnalysis(10, 'Staff reading analysis failed.'),
                staffPayments: getAnalysis(11, 'Staff payment analysis failed.'),
                hourlyActivity: getAnalysis(12, 'Hourly activity analysis failed.'),
            };

            const printStyles = document.getElementById('stats-print-styles')?.innerHTML || '';
            const printWindow = window.open('', '', 'height=800,width=1200');
            
            printWindow.document.write('<html><head><title>System Analytics Report</title>');
            printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow.document.write(`<style>${printStyles}</style>`);
            printWindow.document.write('</head><body class="bg-white">');
            
            const headerHtml = `
                <div class="printable-area p-8">
                    <header class="report-header">
                        <div>
                            <h1 class="logo-print">AGWA</h1>
                            <p class="tagline-print">Ensuring Clarity, Sustaining Life.</p>
                        </div>
                        <div class="company-address-print">
                            <strong>AGWA Water Services, Inc.</strong><br/>
                            AGWA Water Services Bldg., Governor's Drive<br/>
                            Brgy. Ibayo Silangan, Naic, Cavite 4110
                        </div>
                    </header>
                    <h1 class="report-title">SYSTEM ANALYTICS REPORT</h1>
                    <p class="report-generated-date">Generated: ${new Date().toLocaleString()}</p>
                    
                    <section class="print-section" id="ai-summary">
                        ${DOMPurify.sanitize(analyses.summary)}
                    </section>
            `;
            printWindow.document.write(headerHtml);

            const createFigure = (chartId, analysisHtml, colSpan = 'lg:col-span-1') => {
                const chartImg = chartImages[chartId];
                if (!chartImg) return `<div class="chart-container ${colSpan}"><div class="analysis-narrative"><p><strong>Analysis:</strong> <em>Chart data not found.</em></p></div></div>`;
                
                return `
                    <div class="chart-container ${colSpan}">
                        <img src="${chartImg}" alt="${chartId} Chart" />
                        <div class="analysis-narrative">
                            ${DOMPurify.sanitize(analysisHtml)}
                        </div>
                    </div>
                `;
            };

            let reportBody = `
                <section class="print-section">
                    <h3 class="print-section-title">Business Analytics</h3>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        ${createFigure('revenue', analyses.revenue)}
                        ${createFigure('consumption', analyses.consumption)}
                        ${createFigure('locationRevenue', analyses.locationRevenue)}
                        ${createFigure('paymentMethods', analyses.paymentMethods)}
                    </div>
                </section>

                <section class="print-section">
                    <h3 class="print-section-title">User & Support Analytics</h3>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        ${createFigure('userGrowth', analyses.userGrowth)}
                        ${createFigure('userRoles', analyses.userRoles)}
                        ${createFigure('ticketTypes', analyses.ticketTypes)}
                        ${createFigure('ticketStatus', analyses.ticketStatus)}
                        ${createFigure('discountStatus', analyses.discountStatus, 'lg:col-span-2')}
                    </div>
                </section>

                <section class="print-section">
                    <h3 class="print-section-title">Staff & Technical Analytics</h3>
                     <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        ${createFigure('staffReadings', analyses.staffReadings)}
                        ${createFigure('staffPayments', analyses.staffPayments)}
                        ${createFigure('hourlyActivity', analyses.hourlyActivity)}
                    </div>
                </section>
            `;
            
            printWindow.document.write(reportBody);
            
            printWindow.document.write(`
                    <script>
                        window.onload = function() {
                            setTimeout(function() { 
                                window.print();
                                window.close();
                            }, 1500); 
                        };
                    </script>
                </div></body></html>
            `);
            
            printWindow.document.close();

        } catch (err) {
            console.error("Print Report Error:", err);
            showNotification("Failed to generate the full report.", "error");
        } finally {
            setIsGeneratingReport(false);
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
                        font-size: 11pt; 
                    }
                    .no-print { display: none !important; }
                    .printable-area { padding: 0 !important; max-width: 100%; margin: auto; }
                    .report-header { display: flex; justify-content: space-between; align-items: flex-start; text-align: left; border-bottom: 2px solid #000; padding-bottom: 1rem; }
                    .report-header .logo-print { font-size: 2.5rem; font-weight: 700; color: #1e3a8a !important; line-height: 1; margin: 0; }
                    .report-header .tagline-print { font-size: 0.8rem; color: #1d4ed8 !important; font-style: italic; margin: 0; }
                    .report-header .company-address-print { text-align: right; font-size: 0.8rem; line-height: 1.4; color: #374151 !important; }
                    h1.report-title { font-size: 1.5rem; font-weight: 700; color: #000 !important; margin-top: 1.5rem; margin-bottom: 0.5rem; text-align: center; text-transform: uppercase; }
                    p.report-generated-date { text-align: center; font-size: 0.9rem; color: #4b5563; margin-bottom: 1.5rem; }
                    
                    .print-section { 
                        page-break-inside: avoid !important; 
                        margin-top: 1.5rem; 
                        padding-top: 1.5rem !important;
                        border-top: 1px solid #d1d5db !important;
                    }
                    #ai-summary {
                        background-color: #f3f4f6 !important;
                        border: 1px solid #e5e7eb !important;
                        border-radius: 8px;
                        padding: 1.25rem;
                        font-size: 10.5pt;
                        line-height: 1.6;
                        color: #374151 !important;
                    }
                    #ai-summary p { margin-bottom: 0.75rem; }
                    #ai-summary strong { color: #111827 !important; }
                    #ai-summary ul { margin-left: 1.25rem; list-style-type: disc; }

                    h3.print-section-title {
                        font-size: 1.3rem; 
                        font-weight: 700; 
                        border-bottom: 1px solid #4b5563; 
                        padding-bottom: 0.25rem; 
                        margin-bottom: 1rem; 
                        color: #111827 !important;
                    }
                    h3.print-section-title svg { display: none; }

                    .chart-container {
                        page-break-inside: avoid !important;
                        margin-bottom: 1.5rem;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 1rem;
                        background-color: #F9FAFB !important;
                    }
                    .chart-container img {
                        width: 100%;
                        height: auto;
                        border-bottom: 1px solid #e5e7eb;
                        padding-bottom: 1rem;
                        margin-bottom: 1rem;
                    }
                    .analysis-narrative {
                        font-size: 10pt;
                        color: #374151 !important;
                        font-family: 'Georgia', serif;
                    }
                    .analysis-narrative p { margin-bottom: 0.5rem; }
                    .analysis-narrative strong { color: #111827 !important; font-weight: 600; }
                    .analysis-narrative em { font-style: italic; }

                    .shadow-xl, .shadow-md, .shadow-lg, .border { 
                        box-shadow: none !important; 
                    }
                    .bg-gray-50, .bg-white { background-color: transparent !important; }
                    .h-72 { height: auto !important; }
                }
             `}} />
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 no-print">
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                    <BarChart3 size={30} className="mr-3 text-orange-600" /> System Analytics
                </h2>
                <div className="flex items-center gap-2">
                    <button onClick={fetchStatistics} disabled={isLoading || isGeneratingReport} className="flex items-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-lg border border-gray-300 disabled:opacity-50">
                        {isLoading ? <Loader2 size={16} className="animate-spin mr-2"/> : <RotateCcw size={16} className="mr-2" />}
                        Refresh
                    </button>
                    <button onClick={handlePrintReport} disabled={isLoading || isGeneratingReport} className="flex items-center text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-lg disabled:bg-gray-400">
                        {isGeneratingReport ? <Loader2 size={16} className="animate-spin mr-2"/> : <Printer size={16} className="mr-2"/>}
                        {isGeneratingReport ? 'Generating Report...' : 'Print Report'}
                    </button>
                </div>
            </div>

            {error && <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 my-4 flex items-start no-print" role="alert"><Info size={20} className="mr-3 mt-1 flex-shrink-0" /><p className="text-sm">Could not load all statistics: <span className="font-mono text-xs break-all">{error}</span></p></div>}

            <div id="stats-print-area" className="printable-area">
                <div className="space-y-8">
                    <section className="print-section">
                         <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center print-section-title"><DollarSign size={22} className="mr-2 text-green-600"/>Business Analytics</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 no-print">
                            <StatCard title="Total Revenue (12 Mo.)" value={`₱${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 0})}`} icon={DollarSign} color={chartColors.greenBorder}/>
                            <StatCard title="Total Outstanding" value={`₱${(stats?.outstandingBalance ?? 0).toLocaleString('en-US', {minimumFractionDigits: 0})}`} icon={AlertOctagon} color={chartColors.redBorder}/>
                            <StatCard title="Total Consumption (12 Mo.)" value={`${totalConsumption.toLocaleString('en-US')} m³`} icon={Droplets} color={chartColors.blueBorder}/>
                         </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="p-4 bg-gray-50 rounded-lg border" data-chart-id="revenue">
                                <BarChartComponent
                                    data={stats?.monthlyRevenue || {}}
                                    title="Monthly Collected Revenue (Last 12 Months)"
                                    label="Revenue"
                                    color={chartColors.green}
                                    borderColor={chartColors.greenBorder}
                                />
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border" data-chart-id="consumption">
                                <BarChartComponent
                                    data={stats?.monthlyConsumption || {}}
                                    title="Monthly Water Consumption (Last 12 Months)"
                                    label="Consumption (m³)"
                                    color={chartColors.blue}
                                    borderColor={chartColors.blueBorder}
                                />
                            </div>
                             <div className="p-4 bg-gray-50 rounded-lg border" data-chart-id="locationRevenue">
                                <DoughnutChartComponent data={stats?.revenueByLocation} title="Revenue by Location" />
                            </div>
                             <div className="p-4 bg-gray-50 rounded-lg border" data-chart-id="paymentMethods">
                                <DoughnutChartComponent data={stats?.paymentMethods} title="Payments by Method" />
                            </div>
                        </div>
                    </section>
                    
                    <section className="print-section pt-6 border-t">
                         <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center print-section-title"><Users size={22} className="mr-2 text-purple-600"/>User & Support Analytics</h3>
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 no-print">
                            <StatCard title="Total Users" value={stats?.totalUsers ?? 'N/A'} icon={Users} color={chartColors.purpleBorder}/>
                            <StatCard title="Total Tickets" value={stats?.totalTickets ?? 'N/A'} icon={MessageSquare} color={chartColors.orangeBorder}/>
                            <StatCard title="Open Tickets" value={stats?.openTickets ?? '0'} icon={AlertTriangle} color={chartColors.redBorder}/>
                            <StatCard title="Verified Discounts" value={stats?.discountStats?.verified ?? 'N/A'} icon={Percent} color={chartColors.greenBorder}/>
                        </div>
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                             <div className="p-4 bg-gray-50 rounded-lg border" data-chart-id="userGrowth">
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
                            <div className="p-4 bg-gray-50 rounded-lg border" data-chart-id="userRoles">
                                <DoughnutChartComponent data={stats?.usersByRole} title="Users by Role" />
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border" data-chart-id="ticketTypes">
                                <PieChartComponent data={stats?.ticketsByType} title="Tickets by Type" />
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border" data-chart-id="ticketStatus">
                                <DoughnutChartComponent data={stats?.ticketStats} title="Support Tickets by Status" />
                            </div>
                             <div className="p-4 bg-gray-50 rounded-lg border lg:col-span-2" data-chart-id="discountStatus">
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
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 no-print">
                            <StatCard title="Total Routes" value={stats?.techStats?.totalRoutes ?? 'N/A'} icon={MapPinIcon} color={chartColors.tealBorder}/>
                            <StatCard title="Total Accounts" value={stats?.techStats?.totalAccounts ?? 'N/A'} icon={Users} color={chartColors.tealBorder}/>
                            <StatCard title="Active Interruptions" value={stats?.techStats?.activeInterrupts ?? 'N/A'} icon={AlertTriangle} color={chartColors.redBorder}/>
                            <StatCard title="Unassigned Routes" value={stats?.techStats?.unassignedRoutes ?? 'N/A'} icon={Settings} color={chartColors.orangeBorder}/>
                         </div>
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                             <div className="p-4 bg-gray-50 rounded-lg border" data-chart-id="staffReadings">
                                <BarChartComponent
                                    data={stats?.staffActivity?.readerActivity || {}}
                                    title="Readings Submitted Today (by Staff)"
                                    label="Readings"
                                    color={chartColors.sky}
                                    borderColor={chartColors.skyBorder}
                                />
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border" data-chart-id="staffPayments">
                                <BarChartComponent
                                    data={stats?.staffActivity?.clerkActivity || {}}
                                    title="Payments Processed Today (by Staff)"
                                    label="Payments"
                                    color={chartColors.purple}
                                    borderColor={chartColors.purpleBorder}
                                />
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border" data-chart-id="hourlyActivity">
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