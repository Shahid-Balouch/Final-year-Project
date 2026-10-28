import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Activity, Download, Shield, AlertTriangle, User, Camera, Eye, X, ZoomIn } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import DashboardAnalytics from '../../components/dashboard/DashboardAnalytics';
import type { Alert } from '../../types/dashboard';

const Analytics: React.FC = () => {
  const { alerts, detectedPersons, isConnected, analytics, fetchAnalytics } = useApp();
  const [tab, setTab] = useState<'charts' | 'live'>('charts');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [viewingAlert, setViewingAlert] = useState<Alert | null>(null);

  React.useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Safely access analytics data with fallbacks to prevent crashes when data is null/undefined
  const peakHours = analytics?.peakHours || [];
  const zoneHeatmap = analytics?.zoneHeatmap || [];


  const getSeverity = (a: Alert) => {
    if (a.is_person_search_match) return 'MATCH';
    const labels = a.detections.map(d => d.label.toLowerCase());
    if (labels.some(l => l.includes('weapon') || l.includes('knife') || l.includes('gun'))) return 'HIGH';
    if (labels.some(l => l.includes('fight') || l.includes('violence'))) return 'MEDIUM';
    return 'LOW';
  };

  const metrics = useMemo(() => {
    const total = alerts.length;
    const high = alerts.filter(a => getSeverity(a) === 'HIGH').length;
    const matches = alerts.filter(a => a.is_person_search_match).length;
    const today = alerts.filter(a => {
      const d = new Date(a.timestamp || '');
      const now = new Date();
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
    }).length;
    return { total, high, matches, today };
  }, [alerts]);

  const filtered = alerts.filter(a => {
    if (filterSeverity === 'ALL') return true;
    return getSeverity(a) === filterSeverity;
  });

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Severity', 'Detections', 'Confidence', 'Watchlist Match'];
    const rows = alerts.map(a => [
      `"${a.timestamp}"`,
      `"${getSeverity(a)}"`,
      `"${a.detections.map(d => d.label).join('; ')}"`,
      `"${a.detections.length > 0 ? Math.round(a.detections[0].confidence * 100) + '%' : 'N/A'}"`,
      `"${a.is_person_search_match ? 'YES' : 'NO'}"`,
    ]);
    const csv = 'data:text/csv;charset=utf-8,﻿' + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `ai_surviallance_alerts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sevStyle: Record<string, { color: string; bg: string; border: string }> = {
    HIGH:   { color: '#ba1a1a', bg: 'rgba(186,26,26,0.07)',  border: 'rgba(186,26,26,0.25)' },
    MEDIUM: { color: '#b45309', bg: 'rgba(180,83,9,0.06)',   border: 'rgba(180,83,9,0.2)' },
    LOW:    { color: 'var(--color-primary)', bg: 'rgba(36,128,255,0.06)', border: 'rgba(36,128,255,0.15)' },
    MATCH:  { color: '#ba1a1a', bg: 'rgba(186,26,26,0.07)',  border: 'rgba(186,26,26,0.25)' },
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--color-background)' }}>

      {/* Snapshot modal */}
      <AnimatePresence>
        {viewingAlert && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewingAlert(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl flex flex-col md:flex-row overflow-hidden z-10 max-h-[85vh]"
              style={{ background: 'var(--color-surface)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.5rem' }}
            >
              {/* Corner accents */}
              {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
                'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((cls, i) => (
                <div key={i} className={`absolute w-6 h-6 ${cls} z-10`} style={{ borderColor: 'rgba(36,128,255,0.3)' }} />
              ))}

              {/* Image */}
              <div className="flex-1 relative flex items-center justify-center overflow-hidden min-h-[260px]" style={{ background: '#dde3ea' }}>
                {/* Scan line */}
                <div className="absolute inset-0 pointer-events-none opacity-15"
                  style={{ background: 'linear-gradient(rgba(10,88,202,0) 45%, rgba(10,88,202,0.6) 50%, rgba(10,88,202,0) 55%)', backgroundSize: '100% 200%', animation: 'scan 3s linear infinite' }} />
                {viewingAlert.image ? (
                  <img src={`data:image/jpeg;base64,${viewingAlert.image}`} alt="" className="w-full h-full object-contain relative z-10 p-2" />
                ) : (
                  <div className="flex flex-col items-center gap-3" style={{ color: 'var(--color-outline-variant)' }}>
                    <Camera className="w-12 h-12" />
                    <p className="text-[10px] tracking-widest font-bold">NO SNAPSHOT</p>
                  </div>
                )}
              </div>

              {/* Info panel */}
              <div className="w-full md:w-72 flex flex-col p-6 gap-5" style={{ background: 'var(--color-surface-container-low)', borderLeft: '1px solid rgba(0,0,0,0.1)' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] font-bold tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--color-outline)' }}>Incident Data</p>
                    <p className="text-base font-bold uppercase" style={{ color: 'var(--color-on-surface)', fontFamily: "'Manrope', sans-serif" }}>
                      {getSeverity(viewingAlert)} ALERT
                    </p>
                  </div>
                  <button onClick={() => setViewingAlert(null)} style={{ color: 'var(--color-outline)' }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-outline)' }}>Timestamp</p>
                    <p className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>{viewingAlert.timestamp}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-outline)' }}>Detections</p>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingAlert.detections.map((d, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 font-medium"
                          style={{ background: 'rgba(0,0,0,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.125rem' }}>
                          {d.label} <span style={{ opacity: 0.5 }}>{Math.round(d.confidence * 100)}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  {viewingAlert.is_person_search_match && (
                    <div className="flex items-center gap-2 px-3 py-2"
                      style={{ background: 'rgba(255,180,171,0.08)', border: '1px solid rgba(255,180,171,0.3)', borderRadius: '0.25rem' }}>
                      <User className="w-3.5 h-3.5" style={{ color: '#ba1a1a' }} />
                      <span className="text-[10px] font-bold tracking-widest" style={{ color: '#ba1a1a' }}>WATCHLIST MATCH</span>
                    </div>
                  )}
                </div>

                {viewingAlert.image && (
                  <a href={`data:image/jpeg;base64,${viewingAlert.image}`} download={`snapshot_${Date.now()}.jpg`}
                    className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-widest transition-all"
                    style={{ background: 'var(--color-primary)', color: '#ffffff', borderRadius: '0.25rem' }}>
                    <Download className="w-3.5 h-3.5" />
                    SAVE SNAPSHOT
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'var(--color-surface)' }}>
        <div className="flex gap-1 p-1" style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.1)' }}>
          {(['charts', 'live'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all relative group"
              style={{ color: tab === t ? '#ffffff' : 'var(--color-outline)' }}
            >
              {tab === t && (
                <motion.div 
                  layoutId="analytics-tab" 
                  className="absolute inset-0 z-0 bg-[var(--color-primary)] shadow-[0_2px_8px_rgba(36,128,255,0.3)]"
                  style={{ borderRadius: '0.375rem' }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 transition-colors group-hover:text-[var(--color-on-surface)] group-data-[active=true]:text-white" data-active={tab === t}>
                {t === 'charts' ? 'Analytics Engine' : 'Live Incident Log'}
              </span>
            </button>
          ))}
        </div>
        {tab === 'live' && (
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all"
            style={{ border: '1px solid rgba(36,128,255,0.15)', color: 'var(--color-primary)', borderRadius: '0.25rem' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
            <Download className="w-3.5 h-3.5" /> EXPORT CSV
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'charts' ? (
          <div className="space-y-6 p-6">
            <DashboardAnalytics alerts={alerts} detectedPersons={detectedPersons} isConnected={isConnected} systemMode="both" />

            {/* Peak Hours Bar Chart */}
            <div className="border border-[var(--color-outline-variant)] bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <Activity size={16} className="text-[var(--color-primary)]" />
                  <div>
                    <p className="text-[8px] tracking-[0.4em] mb-0.5 font-black uppercase" style={{ color: 'var(--color-outline)' }}>Peak Hours</p>
                    <p className="text-xs font-bold text-[var(--color-on-surface)]">ALERTS_BY_HOUR_OF_DAY</p>
                  </div>
                </div>
              </div>
              <div className="h-[300px]">
                {peakHours.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHours} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fill: 'var(--color-outline)', fontSize: 9, fontWeight: 700 }} axisLine={false} />
                      <YAxis tick={{ fill: 'var(--color-outline)', fontSize: 9, fontWeight: 700 }} axisLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Alerts" radius={[4, 4, 0, 0]} barSize={24} fill="var(--color-primary)" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center opacity-30 text-[10px] font-bold tracking-[0.3em] uppercase">No peak hours data</div>
                )}
              </div>
            </div>

            {/* Zone Heatmap */}
            <div className="border border-[var(--color-outline-variant)] bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <Shield size={16} className="text-[#a855f7]" />
                  <div>
                    <p className="text-[8px] tracking-[0.4em] mb-0.5 font-black uppercase" style={{ color: 'var(--color-outline)' }}>Zone Heatmap</p>
                    <p className="text-xs font-bold text-[var(--color-on-surface)]">ALERTS_BY_ZONE</p>
                  </div>
                </div>
                <p className="text-[9px] font-bold text-[var(--color-outline)]">{zoneHeatmap.length} zones</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {zoneHeatmap.length ? (
                  zoneHeatmap.map((z, i) => (
                    <div key={i} className="p-4 rounded-2xl flex items-center justify-between"
                      style={{ background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-outline)' }}>{z.zone}</p>
                        <p className="text-2xl font-black" style={{ color: 'var(--color-on-surface)' }}>{z.count}</p>
                      </div>
                      <div className="w-24 h-6 bg-[var(--color-surface-container)] rounded-full overflow-hidden">
                        <div className="h-full" style={{ width: `${Math.min(100, (z.count / Math.max(1, ...zoneHeatmap.map(z => z.count)))) * 100}%`, background: 'var(--color-primary)' }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center opacity-30 text-[10px] font-bold tracking-[0.3em] uppercase">No zone data</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">

            {/* Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Alerts', value: metrics.total, icon: Activity, color: 'var(--color-primary)' },
                { label: 'Critical', value: metrics.high, icon: AlertTriangle, color: '#ba1a1a' },
                { label: 'WL Matches', value: metrics.matches, icon: User, color: '#ba1a1a' },
                { label: 'Today', value: metrics.today, icon: Shield, color: 'var(--color-primary)' },
              ].map((kpi, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="p-4" style={{ background: 'var(--color-surface-container-low)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.375rem' }}>
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-outline)' }}>{kpi.label}</p>
                    <kpi.icon className="w-4 h-4" style={{ color: kpi.color, opacity: 0.7 }} />
                  </div>
                  <p className="text-3xl font-black tracking-tighter" style={{ color: kpi.color, fontFamily: "'Manrope', sans-serif" }}>
                    {String(kpi.value).padStart(2, '0')}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Severity filter */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-outline)' }}>Filter</span>
              <div className="flex gap-1 p-1" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.25rem' }}>
                {['ALL', 'HIGH', 'MEDIUM', 'LOW', 'MATCH'].map(s => (
                  <button key={s} onClick={() => setFilterSeverity(s)}
                    className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all"
                    style={filterSeverity === s
                      ? { background: 'var(--color-primary)', color: '#ffffff', borderRadius: '0.125rem' }
                      : { color: 'var(--color-outline)', borderRadius: '0.125rem' }
                    }>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert rows */}
            <div className="space-y-2">
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <div className="py-20 flex flex-col items-center gap-3" style={{ color: 'var(--color-outline-variant)' }}>
                    <Shield className="w-12 h-12" />
                    <p className="text-xs font-bold tracking-widest uppercase">No alerts in buffer</p>
                  </div>
                ) : filtered.map((alert, idx) => {
                  const sev = getSeverity(alert);
                  const s = sevStyle[sev] ?? sevStyle.LOW;
                  return (
                    <motion.div
                      key={idx}
                      layout
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.025, duration: 0.25 }}
                      className="flex items-center gap-4 p-4 group"
                      style={{ background: 'var(--color-surface-container-low)', border: `1px solid rgba(0,0,0,0.1)`, borderRadius: '0.25rem', cursor: 'default' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = s.border; (e.currentTarget as HTMLDivElement).style.background = s.bg; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--color-surface-container-low)'; }}
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 shrink-0 overflow-hidden flex items-center justify-center"
                        style={{ border: `1px solid ${s.border}`, borderRadius: '0.25rem', background: s.bg }}>
                        {alert.image
                          ? <img src={`data:image/jpeg;base64,${alert.image}`} alt="" className="w-full h-full object-cover" />
                          : <AlertTriangle className="w-5 h-5" style={{ color: s.color }} />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[9px] font-bold tracking-widest px-2 py-0.5"
                            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: '0.125rem' }}>
                            {sev}
                          </span>
                          {alert.is_person_search_match && (
                            <span className="text-[9px] font-bold flex items-center gap-1" style={{ color: '#ba1a1a' }}>
                              <User className="w-2.5 h-2.5" /> WL_MATCH
                            </span>
                          )}
                          <span className="text-[9px] ml-auto" style={{ color: 'var(--color-outline)' }}>{alert.timestamp}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {alert.detections.map((d, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5"
                              style={{ background: 'rgba(36,128,255,0.06)', color: 'var(--color-primary)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.125rem' }}>
                              {d.label} <span style={{ opacity: 0.5 }}>{Math.round(d.confidence * 100)}%</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Inspect button */}
                      <button
                        onClick={() => setViewingAlert(alert)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all"
                        style={{ border: '1px solid rgba(36,128,255,0.15)', color: 'var(--color-primary)', borderRadius: '0.25rem' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(36,128,255,0.15)'; }}
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <Eye className="w-3.5 h-3.5" />
                        INSPECT
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;




