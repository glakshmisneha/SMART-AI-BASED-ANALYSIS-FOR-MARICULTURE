'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { AlertCircle, Download, Calendar, ShieldCheck } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function Reports() {
  const [alerts, setAlerts] = useState([]);
  const reportRef = useRef(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await axios.get(`${API_URL}/alerts`);
        setAlerts(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAlerts();
    const int = setInterval(fetchAlerts, 10000);
    return () => clearInterval(int);
  }, []);

  const downloadPDF = async () => {
    if (typeof window === 'undefined') return;
    const html2pdf = (await import('html2pdf.js')).default;
    const element = reportRef.current;
    
    // Quick clone to make it look suitable for white background PDF
    const opt = {
      margin: 1,
      filename: `Mariculture_Report_${new Date().toISOString().slice(0,10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Temporarily add a white background class for the PDF
    element.style.backgroundColor = '#ffffff';
    element.style.color = '#000000';
    const originalBorder = element.style.border;
    element.style.border = 'none';

    html2pdf().from(element).set(opt).save().then(() => {
        // revert styles
        element.style.backgroundColor = 'transparent';
        element.style.color = 'inherit';
        element.style.border = originalBorder;
    });
  };

  return (
    <div>
      <div className="flex-row" style={{marginBottom: '2rem'}}>
        <h2>System Reports & Alerts</h2>
        <button className="btn flex-row" onClick={downloadPDF} style={{gap: '0.5rem'}}>
          <Download size={18}/> Export PDF Report
        </button>
      </div>

      <div ref={reportRef} style={{ padding: '1rem', borderRadius: '8px' }}>
          <div style={{marginBottom: '2rem', borderBottom: '1px solid #30363d', paddingBottom: '1rem'}}>
              <h3>SmartAqua AI Automated Report</h3>
              <p style={{color: 'var(--text-muted)'}}><Calendar size={14}/> Generated on: {new Date().toLocaleString()}</p>
          </div>
          
          <div style={{marginBottom: '2rem'}}>
              <h4>Analysis Summary</h4>
              <p style={{marginTop: '0.5rem', color: 'var(--text-muted)'}}>
                  The system continuously monitors the mariculture environment using ORP, Salinity, and Temperature sensors. 
                  Below are the recent anomalies detected by the AI rule-based module.
              </p>
          </div>

          <h4>Recent Alerts (Last 20)</h4>
          {alerts.length === 0 ? (
              <div style={{padding: '2rem', textAlign: 'center', backgroundColor: 'var(--panel-bg)', borderRadius: '8px', marginTop: '1rem'}}>
                  <ShieldCheck size={40} color="var(--safe-color)" style={{marginBottom: '1rem'}}/>
                  <p>No critical alerts recently. Environment is stable.</p>
              </div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Risk Level</th>
                    <th>AI Message / Action Required</th>
                    <th>Readings (ORP / Sal / Temp)</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert, idx) => (
                    <tr key={idx}>
                      <td>{new Date(alert.timestamp).toLocaleString()}</td>
                      <td>
                          <span style={{
                              color: alert.riskLevel === 'Critical' ? '#ff7b72' : '#d29922',
                              fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem'
                          }}>
                              <AlertCircle size={14}/> {alert.riskLevel}
                          </span>
                      </td>
                      <td>{alert.message}</td>
                      <td style={{fontFamily: 'monospace'}}>
                          {Number(alert.orp).toFixed(0)}mV / {Number(alert.salinity).toFixed(1)}ppt / {Number(alert.temperature).toFixed(1)}°C
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div style={{marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #30363d', fontSize: '0.8rem', color: 'var(--text-muted)'}}>
              Smart AI-Based Advanced ORP Water Monitoring System for Mariculture — Internal Report
          </div>
      </div>
    </div>
  );
}
