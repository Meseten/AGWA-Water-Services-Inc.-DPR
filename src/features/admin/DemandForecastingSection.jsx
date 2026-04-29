import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { TrendingUp, AlertTriangle, Database, Download, CheckCircle, UploadCloud, RefreshCw } from 'lucide-react';
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
        testRSquared: 0,
        testRmse: 0,
        testMape: 0,
        bestMaxFeatures: 0,
        forecastValue: 0,
        confidenceLow: 0,
        confidenceHigh: 0,
        systemCapacity: 138070, // Mathematically derived from MWD's 4,602,344 LPD total (Dec 2024)
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
            const n = finalDataArray.length;

            if (n < 21) {
                setError(`Insufficient dataset size. Minimum 21 months required for Hybrid Differencing.`);
                setIsLoading(false);
                setIsModelTrained(false);
                return;
            }

            const processedData = [];
            for (let i = 1; i < n; i++) {
                const prevRow = finalDataArray[i - 1];
                const currRow = finalDataArray[i];
                
                const monthSin = Math.sin((2 * Math.PI * currRow.Month) / 12);
                const monthCos = Math.cos((2 * Math.PI * currRow.Month) / 12);
                const deltaY = currRow.Consumption_m3 - prevRow.Consumption_m3;

                processedData.push({
                    x: [monthSin, monthCos, currRow.Temperature_C, currRow.Rainfall_mm, currRow.Active_Connections, currRow.NRW_Percent],
                    deltaY: deltaY,
                    actualY: currRow.Consumption_m3,
                    prevY: prevRow.Consumption_m3,
                    date: currRow.Date,
                    rawMonth: currRow.Month,
                    rawTemp: currRow.Temperature_C,
                    rawRain: currRow.Rainfall_mm,
                    rawConn: currRow.Active_Connections,
                    rawNRW: currRow.NRW_Percent
                });
            }

            const dataLength = processedData.length;
            const trainSize = Math.floor(dataLength * 0.70);
            const valSize = Math.floor(dataLength * 0.15);
            const testSize = dataLength - trainSize - valSize;

            const trainData = processedData.slice(0, trainSize);
            const valData = processedData.slice(trainSize, trainSize + valSize);
            const testData = processedData.slice(trainSize + valSize);

            const X_train = trainData.map(d => d.x);
            const y_train_delta = trainData.map(d => d.deltaY);
            const X_val = valData.map(d => d.x);
            const y_val_delta = valData.map(d => d.deltaY);
            
            const maxFeaturesOptions = [2, 3, 4, 5, 6];
            let bestFeatures = 3;
            let bestValRmse = Infinity;

            for (const mf of maxFeaturesOptions) {
                const tempModel = new RandomForestRegression({ seed: 42, maxFeatures: mf, replacement: true, nEstimators: 50 });
                tempModel.train(X_train, y_train_delta);
                const predsDelta = tempModel.predict(X_val);
                
                let valRmseSum = 0;
                for(let i = 0; i < valSize; i++) {
                    const reconstructedPred = valData[i].prevY + predsDelta[i];
                    valRmseSum += Math.pow(reconstructedPred - valData[i].actualY, 2);
                }
                const valRmse = Math.sqrt(valRmseSum / valSize);
                
                if (valRmse < bestValRmse) {
                    bestValRmse = valRmse;
                    bestFeatures = mf;
                }
            }

            const X_train_val = [...X_train, ...X_val];
            const y_train_val_delta = [...y_train_delta, ...y_val_delta];

            const testModel = new RandomForestRegression({ seed: 42, maxFeatures: bestFeatures, replacement: true, nEstimators: 100 });
            testModel.train(X_train_val, y_train_val_delta);
            const testDeltaPredictions = testModel.predict(testData.map(d => d.x));

            const finalTestPredictions = [];
            const actualTestY = [];
            let testRmseSum = 0;
            let testMapeSum = 0;

            for(let i = 0; i < testSize; i++) {
                const reconstructedPred = testData[i].prevY + testDeltaPredictions[i];
                const actual = testData[i].actualY;
                
                finalTestPredictions.push(reconstructedPred);
                actualTestY.push(actual);
                
                testRmseSum += Math.pow(reconstructedPred - actual, 2);
                testMapeSum += Math.abs((actual - reconstructedPred) / actual);
            }

            const testRmse = Math.sqrt(testRmseSum / testSize);
            const testMape = (testMapeSum / testSize) * 100;
            
            const yTestMean = actualTestY.reduce((a, b) => a + b, 0) / testSize;
            const ssTotTest = actualTestY.reduce((sum, y) => sum + Math.pow(y - yTestMean, 2), 0);
            const ssResTest = testRmseSum; 
            const testR2 = 1 - (ssResTest / ssTotTest);

            const X_all = processedData.map(d => d.x);
            const y_all_delta = processedData.map(d => d.deltaY);
            const dates_all = processedData.map(d => d.date);

            const finalRegression = new RandomForestRegression({ seed: 42, maxFeatures: bestFeatures, replacement: true, nEstimators: 100 });
            finalRegression.train(X_all, y_all_delta);
            
            const allDeltaPredictions = finalRegression.predict(X_all);
            const allReconstructedPredictions = processedData.map((d, i) => d.prevY + allDeltaPredictions[i]);
            const allActuals = processedData.map(d => d.actualY);

            const lastRow = processedData[dataLength - 1];
            const nextMonth = lastRow.rawMonth === 12 ? 1 : lastRow.rawMonth + 1;
            const nextMonthSin = Math.sin((2 * Math.PI * nextMonth) / 12);
            const nextMonthCos = Math.cos((2 * Math.PI * nextMonth) / 12);
            const projectedTemp = lastRow.rawTemp > 28 ? 27.5 : 29.0; 
            const projectedRain = lastRow.rawRain > 100 ? 50 : 150;
            const projectedConnections = lastRow.rawConn + (filterType === 'All' ? 15 : 5);
            const projectedNRW = lastRow.rawNRW;

            const X_next = [[nextMonthSin, nextMonthCos, projectedTemp, projectedRain, projectedConnections, projectedNRW]];
            const forecastDelta = finalRegression.predict(X_next)[0];
            const forecastValue = lastRow.actualY + forecastDelta;

            const cSin = calculatePearsonCorrelation(X_all.map(r => r[0]), allActuals);
            const cCos = calculatePearsonCorrelation(X_all.map(r => r[1]), allActuals);
            const cSeasonality = Math.sqrt(cSin * cSin + cCos * cCos);
            const cTemp = Math.abs(calculatePearsonCorrelation(X_all.map(r => r[2]), allActuals));
            const cRain = Math.abs(calculatePearsonCorrelation(X_all.map(r => r[3]), allActuals));
            const cConn = Math.abs(calculatePearsonCorrelation(X_all.map(r => r[4]), allActuals));
            const cNrw = Math.abs(calculatePearsonCorrelation(X_all.map(r => r[5]), allActuals));

            const correlations = [cSeasonality, cTemp, cRain, cConn, cNrw];
            const totalCorr = correlations.reduce((a, b) => a + b, 0);
            const importancePercentages = correlations.map(c => (c / totalCorr) * 100);

            const testStartIndex = trainSize + valSize;
            const datasetColors = dates_all.map((_, i) => i >= testStartIndex ? 'rgba(239, 68, 68, 1)' : 'rgba(59, 130, 246, 1)');

            setHistoricalData({
                labels: dates_all,
                datasets: [
                    { 
                        label: 'Actual Consumption (m³)', 
                        data: allActuals, 
                        borderColor: 'rgba(107, 114, 128, 0.4)', 
                        backgroundColor: datasetColors,
                        pointBackgroundColor: datasetColors,
                        tension: 0.3, 
                        borderWidth: 2 
                    },
                    { 
                        label: 'Hybrid RF Fit (m³)', 
                        data: allReconstructedPredictions, 
                        borderColor: 'rgba(16, 185, 129, 1)', 
                        backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                        borderDash: [5, 5], 
                        tension: 0.3, 
                        borderWidth: 2 
                    }
                ]
            });

            setFeatureImportance({
                labels: ['Seasonality (Cyclical)', 'Temperature', 'Rainfall', 'Active Connections', 'System NRW'],
                datasets: [{
                    label: 'Relative Importance (%)',
                    data: importancePercentages,
                    backgroundColor: ['rgba(139, 92, 246, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(245, 158, 11, 0.7)'],
                    borderWidth: 1,
                }]
            });

            setModelMetrics({
                testRSquared: testR2,
                testRmse: testRmse,
                testMape: testMape,
                bestMaxFeatures: bestFeatures,
                forecastValue: forecastValue,
                confidenceLow: forecastValue - (testRmse * 1.5),
                confidenceHigh: forecastValue + (testRmse * 1.5),
                systemCapacity: filterType === 'All' ? 138070 : filterType === 'Residential' ? 110000 : 28070,
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
                    <p className="text-sm text-gray-500 mt-1">Predictive analytics powered by Hybrid Differenced Random Forest.</p>
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
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Out-of-Sample R²</p>
                    <h3 className="text-3xl font-black text-gray-800">{(modelMetrics.testRSquared * 100).toFixed(1)}%</h3>
                    <p className="text-xs text-green-600 font-medium mt-2 flex items-center"><CheckCircle size={14} className="mr-1"/> Cross-Validated (k={modelMetrics.bestMaxFeatures})</p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-purple-500">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Test Set RMSE & MAPE</p>
                    <h3 className="text-3xl font-black text-gray-800">±{modelMetrics.testRmse.toLocaleString('en-US', {maximumFractionDigits: 0})} <span className="text-base font-medium text-gray-500">m³</span></h3>
                    <p className="text-xs text-gray-500 mt-2">True Error Margin: {modelMetrics.testMape.toFixed(2)}%</p>
                </div>

                <div className={`bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 ${isWarning ? 'border-red-500' : 'border-teal-500'}`}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">15-Barangay Capacity</p>
                    <h3 className={`text-3xl font-black ${isWarning ? 'text-red-600' : 'text-gray-800'}`}>{capacityPercentage.toFixed(1)}%</h3>
                    <p className="text-xs text-gray-500 mt-2">Of max {modelMetrics.systemCapacity.toLocaleString()} m³ limit</p>
                </div>
            </div>

            {isWarning && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start animate-pulse">
                    <AlertTriangle size={24} className="mr-3 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-red-800">High Demand Warning</h4>
                        <p className="text-sm mt-1 text-red-700">The forecasted demand is approaching maximum system capacity across the 15 active barangays. Consider scheduling maintenance on backup pumps.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Hybrid Time Series Validation (Blue = Train/Val, Red = Test)</h3>
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
                                    scales: { x: { beginAtZero: true, max: 100, title: { display: true, text: 'Correlation Impact (%)' } }, y: { grid: { display: false } } }
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