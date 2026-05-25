'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Droplets, ThermometerSun, AlertTriangle, ShieldCheck } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [latest, setLatest] = useState(null);
  
  // Sim Mode State
  const [simValues, setSimValues] = useState({ orp: 300, salinity: 30, temperature: 25 });
  const [autoSim, setAutoSim] = useState(false);
  const autoSimRef = useRef(null);

  // Manual Analysis State
  const [manualData, setManualData] = useState({ orp: '', salinity: '', temperature: '' });
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchReadings = async () => {
    try {
      const res = await axios.get(`${API_URL}/sensor`);
      setData(res.data);
      if (res.data.length > 0) {
        setLatest(res.data[res.data.length - 1]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchReadings();
    const interval = setInterval(fetchReadings, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = async () => {
    try {
      await axios.post(`${API_URL}/sensor`, simValues);
      fetchReadings();
    } catch (err) {
      console.error(err);
    }
  };

  const submitAnomaly = async (type) => {
    let payload = { ...simValues };
    if (type === 'orp_low') payload.orp = 150;
    if (type === 'salinity_high') payload.salinity = 45;
    if (type === 'temp_high') payload.temperature = 35;
    
    try {
      await axios.post(`${API_URL}/sensor`, payload);
      fetchReadings();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAutoSim = () => {
    if (autoSim) {
      clearInterval(autoSimRef.current);
      setAutoSim(false);
    } else {
      setAutoSim(true);
      autoSimRef.current = setInterval(async () => {
        const payload = {
          orp: 280 + Math.random() * 50,
          salinity: 28 + Math.random() * 4,
          temperature: 24 + Math.random() * 2
        };
        await axios.post(`${API_URL}/sensor`, payload);
        fetchReadings();
      }, 3000);
    }
  };

  const handleManualAnalyze = async () => {
    if (!manualData.orp) return;
    setIsAnalyzing(true);
    setAiAnalysis('');
    try {
      const res = await axios.post(`${API_URL}/analyze-manual`, {
        orp: Number(manualData.orp),
        salinity: manualData.salinity ? Number(manualData.salinity) : undefined,
        temperature: manualData.temperature ? Number(manualData.temperature) : undefined,
      });
      setAiAnalysis(res.data.analysis);
      
      // Give alert if values are high or low
      if (res.data.riskLevel === 'Warning' || res.data.riskLevel === 'Critical') {
        alert(`🚨 ALERT [${res.data.riskLevel}]: ${res.data.ruleMessage}`);
      }
      
      // Fetch latest readings immediately so the new manual entry appears in the charts/cards
      fetchReadings();
    } catch (err) {
      console.error(err);
      setAiAnalysis("Error getting AI analysis.");
    }
    setIsAnalyzing(false);
  };
  // Reusable card for UI
  const StatCard = ({ title, value, unit, icon, status, subtext }) => {
    const isCritical = status === 'Critical';
    const isWarning = status === 'Warning';
    return (
      <div className={`card status-${status || 'Safe'}`}>
        <div className="card-title">
          {icon} {title}
        </div>
        <div className="card-value" style={{ color: isCritical ? 'var(--critical-color)' : isWarning ? 'var(--warning-color)' : 'var(--text-main)' }}>
          {value?.toFixed(1) || '--'} <span style={{fontSize:'1rem', color:'var(--text-muted)'}}>{unit}</span>
        </div>
        {subtext && <div style={{fontSize:'0.85rem', color: 'var(--text-muted)'}}>{subtext}</div>}
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{fontSize: '1.5rem'}}>Real-Time Metrics</h2>
          {latest && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', 
               color: latest.riskLevel === 'Safe' ? 'var(--safe-color)' : latest.riskLevel === 'Warning' ? 'var(--warning-color)' : 'var(--critical-color)' }}>
               {latest.riskLevel === 'Safe' ? <ShieldCheck size={20}/> : <AlertTriangle size={20}/>}
               <strong>AI Condition: {latest.riskLevel}</strong> — {latest.message}
             </div>
          )}
        </div>
      </div>

      <div className="grid">
                 <StatCard 
            title="ORP Level" 
            value={latest?.orp} 
            unit="mV" 
            icon={<Activity size={18}/>} 
            status={latest?.orp < 200 || latest?.orp > 600 ? 'Critical' : 'Safe'}
          />
          <StatCard 
            title="Salinity" 
            value={latest?.salinity} 
            unit="ppt" 
            icon={<Droplets size={18}/>}
            status={latest?.salinity < 25 || latest?.salinity > 35 ? 'Warning' : 'Safe'}
          />
          <StatCard 
            title="Temperature" 
            value={latest?.temperature} 
            unit="°C" 
            icon={<ThermometerSun size={18}/>} 
            status={latest?.temperature < 20 || latest?.temperature > 30 ? 'Warning' : 'Safe'}
          />
      </div>

      <div className="chart-container">
        <h3 style={{marginBottom: '1rem'}}>Historical Trends (Last 100 Readings)</h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="timestamp" tickFormatter={(time) => new Date(time).toLocaleTimeString()} stroke="#8b949e"/>
            <YAxis yAxisId="left" stroke="#8b949e" />
            <YAxis yAxisId="right" orientation="right" stroke="#8b949e" />
            <RechartsTooltip contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d' }} labelFormatter={(time) => new Date(time).toLocaleString()} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="orp" stroke="#58a6ff" name="ORP (mV)" dot={false} strokeWidth={2}/>
            <Line yAxisId="right" type="monotone" dataKey="salinity" stroke="#a371f7" name="Salinity (ppt)" dot={false} strokeWidth={2}/>
            <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#f85149" name="Temp (°C)" dot={false} strokeWidth={2}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="sim-panel">
        <h3 style={{marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.5rem'}}><Activity size={20} color="var(--warning-color)"/> Hardware Simulator</h3>
        <p style={{color:'var(--text-muted)', marginBottom:'1rem'}}>Use this to inject artificial ESP32 sensor values into the monitoring stream to test AI rules and UI behavior.</p>
        
        <div className="flex-row">
            <button className="btn" onClick={toggleAutoSim} style={{backgroundColor: autoSim ? '#f85149' : '#238636'}}>
              {autoSim ? 'Stop Auto-Sensor' : 'Start Auto-Sensor (Normal Data)'}
            </button>
            <div style={{display:'flex', gap:'0.5rem'}}>
              <button className="btn btn-secondary" onClick={() => submitAnomaly('orp_low')}>Simulate Contamination (Low ORP)</button>
              <button className="btn btn-secondary" onClick={() => submitAnomaly('salinity_high')}>Simulate High Salinity</button>
            </div>
        </div>
      </div>

      <div className="sim-panel" style={{marginTop: '2rem'}}>
        <h3 style={{marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.5rem'}}><ShieldCheck size={20} color="#58a6ff"/> Manual AI Analysis</h3>
        <p style={{color:'var(--text-muted)', marginBottom:'1rem'}}>Enter custom sensor values to receive an instant AI-generated environmental analysis.</p>
        
        <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap'}}>
            <input 
              type="number" 
              placeholder="ORP (mV) *" 
              value={manualData.orp} 
              onChange={e => setManualData({...manualData, orp: e.target.value})}
              style={{padding: '0.5rem', borderRadius: '4px', border: '1px solid #30363d', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)'}}
            />
            <input 
              type="number" 
              placeholder="Salinity (ppt) - optional" 
              value={manualData.salinity} 
              onChange={e => setManualData({...manualData, salinity: e.target.value})}
              style={{padding: '0.5rem', borderRadius: '4px', border: '1px solid #30363d', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)'}}
            />
            <input 
              type="number" 
              placeholder="Temperature (°C) - optional" 
              value={manualData.temperature} 
              onChange={e => setManualData({...manualData, temperature: e.target.value})}
              style={{padding: '0.5rem', borderRadius: '4px', border: '1px solid #30363d', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)'}}
            />
            <button className="btn" onClick={handleManualAnalyze} disabled={!manualData.orp || isAnalyzing}>
              {isAnalyzing ? 'Analyzing...' : 'Get AI Analysis'}
            </button>
        </div>

        {aiAnalysis && (
            <div style={{padding: '1rem', backgroundColor: '#161b22', borderRadius: '4px', border: '1px solid #30363d'}}>
              <strong style={{display: 'block', marginBottom: '0.5rem'}}>AI Analysis Result:</strong>
              <p style={{color: '#c9d1d9', lineHeight: '1.5'}}>{aiAnalysis}</p>
            </div>
        )}
      </div>
    </div>
  );
}
