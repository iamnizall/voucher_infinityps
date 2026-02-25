import React, { useState, useMemo } from 'react';
import { HistoryRecord } from '../types';

const formatCurrency = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

const formatDateDDMMYYYY = (date: Date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};

interface AnalyticsViewProps {
  history: HistoryRecord[];
  onClearHistory: () => void;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ history, onClearHistory }) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<'ALL' | 'HOURLY' | 'RENTAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState<'ALL' | 'PS_ONLY' | 'PS_TV'>('ALL');
  const [showConfirm, setShowConfirm] = useState(false);

  const processedData = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(23,59,59,999);

    const filtered = history.filter(h => {
       const d = new Date(h.timestamp);
       const dateMatch = d >= start && d <= end;
       const typeMatch = filterType === 'ALL' || h.type === filterType;
       const nameMatch = h.customerName.toLowerCase().includes(searchQuery.toLowerCase());
       
       let packageMatch = true;
       if (packageFilter !== 'ALL') {
          if (h.type === 'RENTAL') {
              if (packageFilter === 'PS_ONLY') packageMatch = h.unitName.includes('PS Only');
              else if (packageFilter === 'PS_TV') packageMatch = h.unitName.includes('PS + TV') || h.unitName.includes('PS+TV');
          } else {
             packageMatch = false; 
          }
       }

       return dateMatch && typeMatch && nameMatch && packageMatch;
    });

    const agg: Record<string, { revenue: number, count: number, dateObj: Date }> = {};
    
    filtered.forEach(h => {
        const d = new Date(h.timestamp);
        const key = d.toISOString().split('T')[0];
        if (!agg[key]) agg[key] = { revenue: 0, count: 0, dateObj: d };
        agg[key].revenue += h.cost;
        agg[key].count += 1;
    });

    const sortedKeys = Object.keys(agg).sort();
    const chartData = sortedKeys.map(k => ({
        label: formatDateDDMMYYYY(agg[k].dateObj),
        revenue: agg[k].revenue,
        count: agg[k].count
    }));

    const totalRevenue = filtered.reduce((sum, h) => sum + h.cost, 0);
    const totalCount = filtered.length;

    return { filtered, chartData, totalRevenue, totalCount };
  }, [history, startDate, endDate, filterType, searchQuery, packageFilter]);

  // NEW CHART: Weekly Rental Revenue
  const rentalWeeklyChart = useMemo(() => {
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toISOString().split('T')[0]);
    }

    const data = last7Days.map(dateStr => {
        const dObj = new Date(dateStr);
        const dailyRevenue = history
            .filter(h => h.type === 'RENTAL' && new Date(h.timestamp).toISOString().split('T')[0] === dateStr)
            .reduce((sum, h) => sum + h.cost, 0);
        return {
            label: formatDateDDMMYYYY(dObj).substring(0, 5), // dd-mm
            revenue: dailyRevenue,
            fullDate: formatDateDDMMYYYY(dObj)
        };
    });
    return data;
  }, [history]);

  // NEW: Today's Revenue Calculation
  const todayRevenue = useMemo(() => {
    const now = new Date();
    const todayDay = now.getDate();
    const todayMonth = now.getMonth();
    const todayYear = now.getFullYear();

    return history.reduce((total, record) => {
      const recordDate = new Date(record.timestamp);
      if (
        recordDate.getDate() === todayDay &&
        recordDate.getMonth() === todayMonth &&
        recordDate.getFullYear() === todayYear
      ) {
        return total + record.cost;
      }
      return total;
    }, 0);
  }, [history]);

  return (
    <div className="space-y-6 pb-28 animate-in slide-in-from-bottom-4">
       <div className="glass-morphism p-5 rounded-[2rem] space-y-4">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-[var(--text-color)]">Analytics</h2>
                <button 
                  onClick={() => setShowConfirm(true)} 
                  title="Hapus Data History"
                  className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20 active:scale-95 group"
                >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-1 1-1h6c0 0 1 0 1 1v2"></path></svg>
                </button>
             </div>
             <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30 font-bold">{processedData.totalCount} Transaksi</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="text-[9px] font-black uppercase text-gray-500 ml-2">Dari</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full layer-bg border border-[var(--border-color)] rounded-xl px-3 py-2 text-[10px] font-bold text-[var(--text-color)]" />
             </div>
             <div>
                <label className="text-[9px] font-black uppercase text-gray-500 ml-2">Sampai</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full layer-bg border border-[var(--border-color)] rounded-xl px-3 py-2 text-[10px] font-bold text-[var(--text-color)]" />
             </div>
          </div>

          <div>
             <label className="text-[9px] font-black uppercase text-gray-500 ml-2">Cari Nama Pelanggan</label>
             <input 
                type="text" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="Ketikan nama..."
                className="w-full layer-bg border border-[var(--border-color)] rounded-xl px-4 py-2 text-[10px] font-bold text-[var(--text-color)] mt-1" 
             />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
                <label className="text-[9px] font-black uppercase text-gray-500 ml-2">Kategori</label>
                <div className="flex layer-bg p-1 rounded-xl mt-1">
                    {(['ALL', 'HOURLY', 'RENTAL'] as const).map(t => (
                    <button 
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${filterType === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-[var(--text-color)]'}`}
                    >
                        {t === 'ALL' ? 'Semua' : t}
                    </button>
                    ))}
                </div>
            </div>
          </div>
          
          {filterType !== 'HOURLY' && (
              <div>
                <label className="text-[9px] font-black uppercase text-gray-500 ml-2">Jenis Paket Rental</label>
                <div className="flex layer-bg p-1 rounded-xl mt-1">
                    {(['ALL', 'PS_ONLY', 'PS_TV'] as const).map(p => (
                    <button 
                        key={p}
                        onClick={() => setPackageFilter(p)}
                        className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${packageFilter === p ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-[var(--text-color)]'}`}
                    >
                        {p === 'ALL' ? 'Semua' : p === 'PS_ONLY' ? 'PS Only' : 'PS+TV'}
                    </button>
                    ))}
                </div>
              </div>
          )}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Today's Revenue Card */}
          <div className="layer-bg p-5 rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
             <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Hari Ini</p>
             <p className="text-2xl font-black text-emerald-400 mt-1 relative z-10">{formatCurrency(todayRevenue)}</p>
          </div>

          <div className="layer-bg p-5 rounded-[2rem] border border-[var(--border-color)]">
             <p className="text-[9px] font-black text-gray-500 uppercase">Total (Filtered)</p>
             <p className="text-xl font-black text-[var(--text-color)] mt-1">{formatCurrency(processedData.totalRevenue)}</p>
          </div>
          <div className="layer-bg p-5 rounded-[2rem] border border-[var(--border-color)]">
             <p className="text-[9px] font-black text-gray-500 uppercase">Rata-rata / Tx</p>
             <p className="text-xl font-black text-blue-500 mt-1">
                {processedData.totalCount > 0 ? formatCurrency(Math.round(processedData.totalRevenue / processedData.totalCount)) : 'Rp 0'}
             </p>
          </div>
       </div>

        {/* --- MAIN CHART --- */}
       {processedData.chartData.length > 0 ? (
         <div className="glass-morphism p-5 rounded-[2rem] border border-[var(--border-color)]">
            <h3 className="text-sm font-black text-[var(--text-color)] mb-4">Tren Pendapatan (Filtered)</h3>
            <div className="h-40 flex items-end gap-1 px-1">
               {processedData.chartData.map((d, i) => {
                  const maxRev = Math.max(...processedData.chartData.map(x => x.revenue));
                  const height = maxRev > 0 ? (d.revenue / maxRev) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end group relative">
                       <div 
                         style={{ height: `${Math.max(height, 5)}%` }} 
                         className="bg-indigo-500/50 hover:bg-indigo-500 rounded-t-sm transition-all relative min-h-[4px]"
                       >
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 font-bold border border-white/10">
                            {formatCurrency(d.revenue)}
                            <div className="text-[7px] text-gray-400 font-normal">{d.count} Transaksi</div>
                         </div>
                       </div>
                       <span className="text-[8px] text-gray-500 text-center mt-2 truncate w-full rotate-0 md:rotate-0">{d.label}</span>
                    </div>
                  );
               })}
            </div>
         </div>
       ) : (
         <div className="text-center py-10 text-gray-500 text-xs layer-bg rounded-2xl">Tidak ada data untuk periode ini.</div>
       )}

       {/* --- NEW RENTAL SPECIFIC CHART --- */}
        <div className="glass-morphism p-5 rounded-[2rem] border border-[var(--border-color)]">
           <h3 className="text-sm font-black text-[var(--text-color)] mb-4">Pendapatan Rental (7 Hari Terakhir)</h3>
           <div className="h-32 flex items-end gap-1 px-1">
              {rentalWeeklyChart.map((d, i) => {
                 const maxRev = Math.max(...rentalWeeklyChart.map(x => x.revenue), 1000); // Default min max to show scale
                 const height = maxRev > 0 ? (d.revenue / maxRev) * 100 : 0;
                 return (
                   <div key={i} className="flex-1 flex flex-col justify-end group relative">
                      <div 
                        style={{ height: `${Math.max(height, 2)}%` }} 
                        className="bg-orange-500/50 hover:bg-orange-500 rounded-t-sm transition-all relative min-h-[4px]"
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 font-bold border border-white/10">
                           {formatCurrency(d.revenue)}
                           <div className="text-[7px] text-gray-400 font-normal">{d.fullDate}</div>
                        </div>
                      </div>
                      <span className="text-[8px] text-gray-500 text-center mt-2 truncate w-full">{d.label}</span>
                   </div>
                 );
              })}
           </div>
        </div>

       <div>
         <h3 className="text-sm font-black text-[var(--text-color)] mb-3 ml-2">Detail Transaksi</h3>
         <div className="space-y-2">
            {processedData.filtered.length === 0 && <p className="text-center text-xs text-gray-500 py-4">Kosong.</p>}
            {processedData.filtered.slice().reverse().map(h => (
              <div key={h.id} className="flex justify-between items-center layer-bg p-3 rounded-xl border border-[var(--border-color)]">
                 <div>
                    <p className="font-bold text-xs text-[var(--text-color)]">{h.customerName}</p>
                    <p className="text-[9px] text-gray-500">{formatDateDDMMYYYY(new Date(h.timestamp))} • {h.type === 'RENTAL' ? h.unitName.replace('Sewa ', '') : h.type}</p>
                 </div>
                 <span className="font-mono font-bold text-xs text-emerald-500">{formatCurrency(h.cost)}</span>
              </div>
            ))}
         </div>
       </div>

       {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
               <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-2 border border-rose-500/20">
                   <span className="text-3xl">🗑️</span>
               </div>
               <h3 className="text-xl font-black text-white">Hapus Semua History?</h3>
               <p className="text-xs text-gray-400 leading-relaxed">
                   Tindakan ini akan <b>menghapus permanen</b> semua data transaksi yang tersimpan. Laporan pendapatan akan di-reset.
               </p>
               <div className="grid grid-cols-2 gap-3 mt-4">
                   <button
                       onClick={() => setShowConfirm(false)}
                       className="py-3 rounded-xl text-xs font-bold text-gray-400 hover:bg-white/5 transition-all"
                   >
                       Batal
                   </button>
                   <button
                       onClick={() => {
                           onClearHistory();
                           setShowConfirm(false);
                       }}
                       className="py-3 rounded-xl bg-rose-600 text-white text-xs font-black uppercase shadow-lg shadow-rose-600/20 hover:bg-rose-500 transition-all"
                   >
                       Ya, Hapus Data
                   </button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsView;
