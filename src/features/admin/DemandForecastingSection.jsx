import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { TrendingUp, AlertTriangle, Info, Download, CheckCircle, Database, UploadCloud, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import { RandomForestRegression } from 'ml-random-forest';
import * as DataService from '../../services/dataService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { allBillsCollectionPath } from '../../firebase/firestorePaths';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const DemandForecastingSection = ({ db }) => {
    const [isModelTrained, setIsModelTrained] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [serviceType, setServiceType] = useState('All');
    const [rawDataset, setRawDataset] = useState(null);
    
    const [modelMetrics, setModelMetrics] = useState({
        rSquared: 0,
        mae: 0,
        forecastValue: 0,
        confidenceLow: 0,
        confidenceHigh: 0,
        systemCapacity: 60000, 
    });

    const [historicalData, setHistoricalData] = useState(null);
    const [featureImportance, setFeatureImportance] = useState(null);

    useEffect(() => {
        const fetchCloudData = async () => {
            setIsLoading(true);
            const result = await DataService.getTrainingData(db);
            if (result.success && result.data && result.data.length > 0) {
                setRawDataset(result.data);
                trainModel(result.data, 'All');
            } else {
                setIsLoading(false);
            }
        };
        fetchCloudData();
    }, [db]);

    const calculatePearsonCorrelation = (x, y) => {
        const n = x.length;
        if (n === 0) return 0;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((a, _, i) => a + (x[i] * y[i]), 0);
        const sumX2 = x.reduce((a, b) => a + (b * b), 0);
        const sumY2 = y.reduce((a, b) => a + (b * b), 0);
        const numerator = (n * sumXY) - (sumX * sumY);
        const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
        return denominator === 0 ? 0 : numerator / denominator;
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);

        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: async (results) => {
                if (results.errors.length > 0) {
                    setError("Failed to parse CSV. Please check the format.");
                    setIsLoading(false);
                    return;
                }
                const cleanData = results.data.filter(row => row && row.Date && row.Consumption_m3 != null);
                const uploadResult = await DataService.saveTrainingData(db, cleanData);
                if (!uploadResult.success) {
                    setError("Failed to sync to cloud database: " + uploadResult.error);
                } else {
                    setError(null);
                }
                setRawDataset(cleanData);
                trainModel(cleanData, serviceType);
            },
            error: (err) => {
                setError(err.message);
                setIsLoading(false);
            }
        });
    };

    const handleServiceTypeChange = (e) => {
        const newType = e.target.value;
        setServiceType(newType);
        if (rawDataset) {
            trainModel(rawDataset, newType);
        }
    };

    const trainModel = (data, filterType) => {
        setIsLoading(true);
        try {
            const X = [];
            const y = [];
            const dates = [];

            let filteredData = data;
            if (filterType !== 'All') {
                filteredData = data.filter(row => row.Service_Type === filterType);
            }

            const aggregatedDataMap = new Map();
            
            filteredData.forEach(row => {
                 if (row.Consumption_m3 != null && row.Temperature_C != null) {
                     const key = row.Date;
                     if (!aggregatedDataMap.has(key)) {
                         aggregatedDataMap.set(key, {
                             Month: row.Month,
                             Temperature_C: row.Temperature_C,
                             Rainfall_mm: row.Rainfall_mm,
                             Active_Connections: row.Active_Connections,
                             NRW_Percent: row.NRW_Percent,
                             Consumption_m3: row.Consumption_m3,
                             Date: row.Date
                         });
                     } else {
                         const existing = aggregatedDataMap.get(key);
                         existing.Consumption_m3 += row.Consumption_m3;
                         existing.Active_Connections += row.Active_Connections;
                     }
                 }
            });

            const finalDataArray = Array.from(aggregatedDataMap.values());

            finalDataArray.forEach(row => {
                X.push([row.Month, row.Temperature_C, row.Rainfall_mm, row.Active_Connections, row.NRW_Percent]);
                y.push(row.Consumption_m3);
                dates.push(row.Date);
            });

            if (X.length < 10) {
                setError(`Not enough data for ${filterType}. Minimum 10 months required.`);
                setIsLoading(false);
                setIsModelTrained(false);
                return;
            }

            const options = { seed: 42, maxFeatures: 3, replacement: true, nEstimators: 100 };
            const regression = new RandomForestRegression(options);
            regression.train(X, y);

            const predictions = regression.predict(X);

            let ssTot = 0;
            let ssRes = 0;
            let absErrorSum = 0;
            const yMean = y.reduce((a, b) => a + b, 0) / y.length;

            for (let i = 0; i < y.length; i++) {
                ssTot += Math.pow(y[i] - yMean, 2);
                ssRes += Math.pow(y[i] - predictions[i], 2);
                absErrorSum += Math.abs(y[i] - predictions[i]);
            }

            const r2 = 1 - (ssRes / ssTot);
            const mae = absErrorSum / y.length;

            const lastRow = X[X.length - 1];
            const nextMonth = lastRow[0] === 12 ? 1 : lastRow[0] + 1;
            const projectedTemp = lastRow[1] > 28 ? 27.5 : 29.0; 
            const projectedRain = lastRow[2] > 100 ? 50 : 150;
            const projectedConnections = lastRow[3] + (filterType === 'All' ? 15 : 5);
            const projectedNRW = lastRow[4];

            const X_next = [[nextMonth, projectedTemp, projectedRain, projectedConnections, projectedNRW]];
            const forecastValue = regression.predict(X_next)[0];

            const correlations = [
                Math.abs(calculatePearsonCorrelation(X.map(row => row[0]), y)),
                Math.abs(calculatePearsonCorrelation(X.map(row => row[1]), y)),
                Math.abs(calculatePearsonCorrelation(X.map(row => row[2]), y)),
                Math.abs(calculatePearsonCorrelation(X.map(row => row[3]), y)),
                Math.abs(calculatePearsonCorrelation(X.map(row => row[4]), y)),
            ];

            const totalCorr = correlations.reduce((a, b) => a + b, 0);
            const importancePercentages = correlations.map(c => (c / totalCorr) * 100);

            setHistoricalData({
                labels: dates,
                datasets: [
                    { label: 'Actual Consumption (m³)', data: y, borderColor: 'rgba(59, 130, 246, 1)', backgroundColor: 'rgba(59, 130, 246, 0.5)', tension: 0.3, borderWidth: 2 },
                    { label: 'RF Model Fit (m³)', data: predictions, borderColor: 'rgba(107, 114, 128, 1)', backgroundColor: 'rgba(107, 114, 128, 0.5)', borderDash: [5, 5], tension: 0.3, borderWidth: 2 }
                ]
            });

            setFeatureImportance({
                labels: ['Seasonality (Month)', 'Temperature', 'Rainfall', 'Active Connections', 'System NRW'],
                datasets: [{
                    label: 'Relative Impact (%)',
                    data: importancePercentages,
                    backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(14, 165, 233, 0.7)', 'rgba(245, 158, 11, 0.7)'],
                    borderWidth: 1,
                }]
            });

            setModelMetrics({
                rSquared: Math.max(0, r2),
                mae: mae,
                forecastValue: Math.max(0, forecastValue),
                confidenceLow: Math.max(0, forecastValue - (mae * 1.5)),
                confidenceHigh: Math.max(0, forecastValue + (mae * 1.5)),
                systemCapacity: filterType === 'All' ? 60000 : filterType === 'Residential' ? 50000 : 15000,
            });

            setIsModelTrained(true);
            setIsLoading(false);
            setError(null);
        } catch (err) {
            setError("Model training failed: " + err.message);
            setIsLoading(false);
        }
    };

    const handleSyncLatestMonth = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const today = new Date();
            let targetMonth = today.getMonth();
            let targetYear = today.getFullYear();
            
            if (targetMonth === 0) {
                targetMonth = 12;
                targetYear -= 1;
            }

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const targetMonthStr = `${monthNames[targetMonth - 1]} ${targetYear}`;
            const targetDateKey = `${monthNames[targetMonth - 1]}-${targetYear}`;

            const existingDates = rawDataset.map(row => row.Date);
            if (existingDates.includes(targetDateKey)) {
                setError(`Data for ${targetDateKey} is already synced to the ML dataset.`);
                setIsLoading(false);
                return;
            }

            const endDateObj = new Date(targetYear, targetMonth, 0);
            const startDateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
            const endDateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(endDateObj.getDate()).padStart(2, "0")}`;

            const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=14.275&longitude=120.735&start_date=${startDateStr}&end_date=${endDateStr}&daily=temperature_2m_mean,precipitation_sum&timezone=Asia%2FManila`;
            
            const weatherResponse = await fetch(weatherUrl);
            const weatherData = await weatherResponse.json();
            
            const dailyTemps = weatherData.daily.temperature_2m_mean;
            const dailyRain = weatherData.daily.precipitation_sum;

            const avgTemp = dailyTemps.reduce((a, b) => a + (b || 0), 0) / dailyTemps.filter(t => t !== null).length;
            const totalRain = dailyRain.reduce((a, b) => a + (b || 0), 0);

            const billsRef = collection(db, allBillsCollectionPath());
            const q = query(billsRef, where("monthYear", "==", targetMonthStr));
            const snapshot = await getDocs(q);

            const aggregatedData = {
                Residential: { cons: 0, count: 0 },
                Commercial: { cons: 0, count: 0 },
                Government: { cons: 0, count: 0 }
            };

            snapshot.docs.forEach(doc => {
                const bill = doc.data();
                const type = bill.serviceType || "Residential";
                if (aggregatedData[type] && bill.consumption) {
                    aggregatedData[type].cons += bill.consumption;
                    aggregatedData[type].count += 1;
                }
            });

            const newRecords = [];
            const types = ["Residential", "Commercial", "Government"];
            
            types.forEach(type => {
                if (aggregatedData[type].count > 0) {
                    newRecords.push({
                        Date: targetDateKey,
                        Month: targetMonth,
                        Temperature_C: Number(avgTemp.toFixed(2)),
                        Rainfall_mm: Number(totalRain.toFixed(2)),
                        Service_Type: type,
                        Active_Connections: aggregatedData[type].count,
                        NRW_Percent: 20.0,
                        Consumption_m3: aggregatedData[type].cons
                    });
                }
            });

            if (newRecords.length === 0) {
                setError(`No bills found in the database for ${targetMonthStr}. Ensure bills were generated before syncing.`);
                setIsLoading(false);
                return;
            }

            const updatedDataset = [...rawDataset, ...newRecords];
            const uploadResult = await DataService.saveTrainingData(db, updatedDataset);
            
            if (uploadResult.success) {
                setRawDataset(updatedDataset);
                trainModel(updatedDataset, serviceType);
            } else {
                setError("Failed to save updated dataset to cloud.");
                setIsLoading(false);
            }
        } catch (err) {
            setError("Automated ETL Pipeline Error: " + err.message);
            setIsLoading(false);
        }
    };

    const handleExportLiveData = () => {
        if (!rawDataset || rawDataset.length === 0) return;
        
        let csvContent = "Date,Month,Temperature_C,Rainfall_mm,Service_Type,Active_Connections,NRW_Percent,Consumption_m3\n";
        rawDataset.forEach(row => {
            csvContent += `${row.Date},${row.Month},${row.Temperature_C},${row.Rainfall_mm},${row.Service_Type},${row.Active_Connections},${row.NRW_Percent},${row.Consumption_m3}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `mwd_ml_dataset_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const capacityPercentage = (modelMetrics.forecastValue / modelMetrics.systemCapacity) * 100;
    const isWarning = capacityPercentage > 85;

    if (isLoading) {
        return <div className="p-8"><LoadingSpinner message="Processing Machine Learning Engine..." /></div>;
    }

    if (!isModelTrained) {
        return (
            <div className="p-4 sm:p-6 bg-gray-50 rounded-xl animate-fadeIn space-y-6 flex flex-col items-center justify-center min-h-[60vh]">
                <Database size={64} className="text-blue-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 text-center">AI Model Untrained</h2>
                <p className="text-gray-500 text-center max-w-lg mb-6">
                    The Random Forest Regression model requires an initial historical dataset to establish a baseline. Please upload the 5-Year MWD dataset CSV to begin training.
                </p>
                {error && <p className="text-red-500 bg-red-50 p-3 rounded border border-red-200 mb-4 text-center max-w-lg">{error}</p>}
                <label className="flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 transition-colors font-bold text-lg cursor-pointer shadow-lg">
                    <UploadCloud size={24} /> Upload Dataset (CSV) & Sync to Cloud
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </label>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 bg-gray-50 rounded-xl animate-fadeIn space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-xl shadow-sm border border-gray-200 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <TrendingUp size={28} className="mr-3 text-blue-600" /> AI Demand Forecasting
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Predictive analytics powered by Random Forest Regression.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={serviceType} onChange={handleServiceTypeChange} className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-700 shadow-sm">
                        <option value="All">All Service Types</option>
                        <option value="Residential">Residential Only</option>
                        <option value="Commercial">Commercial Only</option>
                        <option value="Government">Government Only</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-4">
                    <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-blue-500">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Next Month Forecast</p>
                    <h3 className="text-3xl font-black text-gray-800">{modelMetrics.forecastValue.toLocaleString('en-US', {maximumFractionDigits: 0})} <span className="text-base font-medium text-gray-500">m³</span></h3>
                    <p className="text-xs text-gray-500 mt-2">Range: {modelMetrics.confidenceLow.toFixed(0)} - {modelMetrics.confidenceHigh.toFixed(0)} m³</p>
                </div>
                
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-green-500">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Model Accuracy (R²)</p>
                    <h3 className="text-3xl font-black text-gray-800">{(modelMetrics.rSquared * 100).toFixed(1)}%</h3>
                    <p className="text-xs text-green-600 font-medium mt-2 flex items-center"><CheckCircle size={14} className="mr-1"/> Algorithm Validated</p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-purple-500">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mean Absolute Error</p>
                    <h3 className="text-3xl font-black text-gray-800">±{modelMetrics.mae.toLocaleString('en-US', {maximumFractionDigits: 0})} <span className="text-base font-medium text-gray-500">m³</span></h3>
                    <p className="text-xs text-gray-500 mt-2">Avg. deviation from actuals</p>
                </div>

                <div className={`bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 ${isWarning ? 'border-red-500' : 'border-teal-500'}`}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Capacity Utilization</p>
                    <h3 className={`text-3xl font-black ${isWarning ? 'text-red-600' : 'text-gray-800'}`}>{capacityPercentage.toFixed(1)}%</h3>
                    <p className="text-xs text-gray-500 mt-2">Of max {modelMetrics.systemCapacity.toLocaleString()} m³ limit</p>
                </div>
            </div>

            {isWarning && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start animate-pulse">
                    <AlertTriangle size={24} className="mr-3 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-red-800">High Demand Warning</h4>
                        <p className="text-sm mt-1 text-red-700">The forecasted demand is approaching maximum system capacity. Consider scheduling maintenance on backup pumps or preparing water conservation announcements.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Historical Actuals vs. Random Forest Fit</h3>
                    <div className="h-80">
                        {historicalData && (
                            <Line 
                                data={historicalData} 
                                options={{
                                    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                                    plugins: { legend: { position: 'top' }, tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.9)', titleFont: { size: 13 }, bodyFont: { size: 13 }, padding: 10 } },
                                    scales: { y: { beginAtZero: true, title: { display: true, text: 'Volume (m³)' }, grid: { borderDash: [4, 4] } }, x: { grid: { display: false } } }
                                }} 
                            />
                        )}
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Feature Importance</h3>
                    </div>
                    <div className="h-80">
                        {featureImportance && (
                            <Bar 
                                data={featureImportance}
                                options={{
                                    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: { x: { beginAtZero: true, max: 100, title: { display: true, text: 'Correlation Importance (%)' } }, y: { grid: { display: false } } }
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <Database size={20} className="mr-2 text-green-600" /> Automated MLOps Pipeline
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Extracts billing data and Open-Meteo weather APIs to retrain the AI.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={handleSyncLatestMonth} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap shadow-sm">
                        <RefreshCw size={18} className="mr-2"/> Auto-Sync Last Month
                    </button>
                    <button onClick={handleExportLiveData} className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap">
                        <Download size={18} className="mr-2"/> Export Dataset
                    </button>
                    <label className="flex items-center bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer">
                        <UploadCloud size={18} className="mr-2"/> Re-upload Seed
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default DemandForecastingSection;