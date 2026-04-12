import React, { useState, useEffect } from 'react';
import MLR from 'ml-regression-multivariate-linear';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { allBillsCollectionPath } from '../../firebase/firestorePaths';

export default function DemandForecastingSection() {
  const [prediction, setPrediction] = useState(null);
  const [baselineData, setBaselineData] = useState({ prevAvg: 0, activeConn: 0, seasonality: 0 });
  const [loading, setLoading] = useState(true);
  const [accuracy, setAccuracy] = useState(0);

  useEffect(() => {
    const fetchAndPredict = async () => {
      try {
        const q = query(collection(db, allBillsCollectionPath()), orderBy('billDate', 'desc'), limit(5000));
        const snapshot = await getDocs(q);
        
        const monthlyAggregations = {};
        let activeUsersSet = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.billDate && data.consumption) {
                const date = data.billDate.toDate();
                const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
                if (!monthlyAggregations[key]) monthlyAggregations[key] = { total: 0, count: 0 };
                monthlyAggregations[key].total += data.consumption;
                monthlyAggregations[key].count += 1;
                activeUsersSet.add(data.userId);
            }
        });

        const keys = Object.keys(monthlyAggregations).sort();
        
        if (keys.length < 6) {
            setPrediction('Insufficient live database records to forecast. Minimum 6 months required.');
            setLoading(false);
            return;
        }

        let X_historical = [];
        let Y_historical = [];
        let currentConnections = activeUsersSet.size;
        let lastKeyIndex = keys.length - 1;

        for (let i = 3; i < keys.length; i++) {
            const m1 = monthlyAggregations[keys[i-3]].total;
            const m2 = monthlyAggregations[keys[i-2]].total;
            const m3 = monthlyAggregations[keys[i-1]].total;
            const avg3Mo = (m1 + m2 + m3) / 3;
            
            const monthIndex = parseInt(keys[i].split('-')[1], 10);
            const isDrySeason = (monthIndex >= 2 && monthIndex <= 4) ? 1 : 0;
            const connections = monthlyAggregations[keys[i]].count;

            X_historical.push([avg3Mo, connections, isDrySeason]);
            Y_historical.push([monthlyAggregations[keys[i]].total]);
        }

        const recent1 = monthlyAggregations[keys[lastKeyIndex]].total;
        const recent2 = monthlyAggregations[keys[lastKeyIndex - 1]].total;
        const recent3 = monthlyAggregations[keys[lastKeyIndex - 2]].total;
        const currentAvg = (recent1 + recent2 + recent3) / 3;
        
        const nextMonthIndex = (parseInt(keys[lastKeyIndex].split('-')[1], 10) + 1) % 12;
        const nextSeasonality = (nextMonthIndex >= 2 && nextMonthIndex <= 4) ? 1 : 0;

        const mlr = new MLR(X_historical, Y_historical);
        const X_nextMonth = [currentAvg, currentConnections, nextSeasonality];
        const result = mlr.predict(X_nextMonth);
        
        let sse = 0;
        let sst = 0;
        let yMean = Y_historical.reduce((sum, val) => sum + val[0], 0) / Y_historical.length;
        
        for (let i = 0; i < X_historical.length; i++) {
            const pred = mlr.predict(X_historical[i])[0];
            const actual = Y_historical[i][0];
            sse += Math.pow(actual - pred, 2);
            sst += Math.pow(actual - yMean, 2);
        }
        const rSquared = 1 - (sse / sst);
        
        setAccuracy((rSquared * 100).toFixed(2));
        setBaselineData({ prevAvg: currentAvg.toFixed(2), activeConn: currentConnections, seasonality: nextSeasonality });
        setPrediction(Math.max(0, result[0]).toFixed(2));
      } catch (error) {
        setPrediction('Error calculating forecast from live data.');
      }
      setLoading(false);
    };

    fetchAndPredict();
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">MWD Demand Forecasting</h2>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-300">
            Live Maragondon Data Active
        </span>
      </div>
      
      {loading ? (
          <div className="flex items-center space-x-3 text-blue-600">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <p className="font-semibold">Analyzing MWD Historical Datasets...</p>
          </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">X1: Baseline (3-Mo Avg)</p>
              <p className="text-xl font-black text-gray-800">{baselineData.prevAvg} <span className="text-sm font-medium text-gray-500">cu.m</span></p>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">X2: Active Connections</p>
              <p className="text-xl font-black text-gray-800">{baselineData.activeConn}</p>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">X3: Seasonality Index</p>
              <p className="text-xl font-black text-gray-800">{baselineData.seasonality === 1 ? '1 (Dry Season Spike)' : '0 (Regular/Wet)'}</p>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Model R² Accuracy</p>
              <p className="text-xl font-black text-indigo-800">{accuracy}%</p>
            </div>
          </div>
          <div className="p-6 bg-blue-600 border border-blue-700 rounded-xl shadow-md text-white flex justify-between items-center">
            <div>
                <h3 className="text-lg font-bold text-blue-100 uppercase tracking-wider mb-1">Forecasted Total Demand (Next Month)</h3>
                <p className="text-5xl font-extrabold">{prediction} <span className="text-2xl font-medium text-blue-200">cu.m.</span></p>
            </div>
            <div className="hidden md:block">
                <svg className="w-20 h-20 text-blue-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
            </div>
          </div>
        </>
      )}
    </div>
  );
}