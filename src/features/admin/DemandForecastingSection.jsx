import React, { useState, useEffect } from 'react';
import MLR from 'ml-regression-multivariate-linear';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { allBillsCollectionPath } from '../../firebase/firestorePaths';

export default function DemandForecastingSection() {
  const [prediction, setPrediction] = useState(null);
  const [baselineData, setBaselineData] = useState({ prevAvg: 0, activeConn: 0, seasonality: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndPredict = async () => {
      try {
        const q = query(collection(db, allBillsCollectionPath()), orderBy('billDate', 'desc'), limit(1000));
        const snapshot = await getDocs(q);
        
        const monthlyAggregations = {};
        let activeUsersSet = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.billDate && data.consumption) {
                const date = data.billDate.toDate();
                const key = `${date.getFullYear()}-${date.getMonth()}`;
                if (!monthlyAggregations[key]) monthlyAggregations[key] = { total: 0, count: 0 };
                monthlyAggregations[key].total += data.consumption;
                monthlyAggregations[key].count += 1;
                activeUsersSet.add(data.userId);
            }
        });

        const keys = Object.keys(monthlyAggregations).sort();
        if (keys.length < 4) {
            setPrediction('Insufficient Data');
            setLoading(false);
            return;
        }

        const X_historical = [];
        const Y_historical = [];

        for (let i = 3; i < keys.length; i++) {
            const m1 = monthlyAggregations[keys[i-3]].total;
            const m2 = monthlyAggregations[keys[i-2]].total;
            const m3 = monthlyAggregations[keys[i-1]].total;
            const avg3Mo = (m1 + m2 + m3) / 3;
            
            const monthIndex = parseInt(keys[i].split('-')[1]);
            const isWetSeason = (monthIndex >= 5 && monthIndex <= 10) ? 1 : 0;
            const connections = monthlyAggregations[keys[i]].count;

            X_historical.push([avg3Mo, connections, isWetSeason]);
            Y_historical.push([monthlyAggregations[keys[i]].total]);
        }

        const mlr = new MLR(X_historical, Y_historical);
        
        const lastKeyIndex = keys.length - 1;
        const recent1 = monthlyAggregations[keys[lastKeyIndex]].total;
        const recent2 = monthlyAggregations[keys[lastKeyIndex - 1]].total;
        const recent3 = monthlyAggregations[keys[lastKeyIndex - 2]].total;
        const currentAvg = (recent1 + recent2 + recent3) / 3;
        
        const nextMonthIndex = (parseInt(keys[lastKeyIndex].split('-')[1]) + 1) % 12;
        const nextSeasonality = (nextMonthIndex >= 5 && nextMonthIndex <= 10) ? 1 : 0;
        const currentConnections = activeUsersSet.size;

        const X_nextMonth = [currentAvg, currentConnections, nextSeasonality];
        const result = mlr.predict(X_nextMonth);
        
        setBaselineData({ prevAvg: currentAvg.toFixed(2), activeConn: currentConnections, seasonality: nextSeasonality });
        setPrediction(Math.max(0, result[0]).toFixed(2));
      } catch (error) {
        console.error("Forecasting Error:", error);
        setPrediction('Error');
      }
      setLoading(false);
    };

    fetchAndPredict();
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow mt-6">
      <h2 className="text-2xl font-bold mb-4">AGWA MLR Dynamic Demand Forecasting</h2>
      {loading ? (
          <p>Analyzing AGWA Datasets...</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-gray-50 border rounded">
              <p className="text-sm text-gray-500">X1: Baseline (3-Mo Avg)</p>
              <p className="font-bold">{baselineData.prevAvg} cu.m</p>
            </div>
            <div className="p-4 bg-gray-50 border rounded">
              <p className="text-sm text-gray-500">X2: Active Connections</p>
              <p className="font-bold">{baselineData.activeConn}</p>
            </div>
            <div className="p-4 bg-gray-50 border rounded">
              <p className="text-sm text-gray-500">X3: Seasonality Index</p>
              <p className="font-bold">{baselineData.seasonality === 1 ? '1 (Wet)' : '0 (Dry)'}</p>
            </div>
          </div>
          <div className="p-4 bg-blue-50 border-blue-200 border rounded">
            <h3 className="text-lg font-bold text-blue-800">Forecasted Total Demand (Next Month)</h3>
            <p className="text-3xl font-extrabold text-blue-900">{prediction} cu.m.</p>
          </div>
        </>
      )}
    </div>
  );
}