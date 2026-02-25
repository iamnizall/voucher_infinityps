import React, { useState, useEffect, useMemo } from 'react';
import { ActiveRental, RentalType, CustomerRank } from '../types';

const PRICING = {
  [RentalType.PS_ONLY]: {
    6: 25000,
    12: 40000,
    24: 70000
  },
  [RentalType.PS_TV]: {
    6: 35000,
    12: 60000,
    24: 110000
  }
};

const formatCurrency = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

const formatDateDDMMYYYY = (date: Date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};

interface RentalViewProps {
  activeRentals: ActiveRental[];
  onAddRental: (r: ActiveRental) => void;
  onReturn: (id: string) => void;
  onExtend: (id: string, hours: 6 | 12 | 24, cost: number) => void;
  topCustomers: CustomerRank[];
  onNotify: (msg: string) => void; 
}

const RentalView: React.FC<RentalViewProps> = ({ activeRentals, onAddRental, onReturn, onExtend, topCustomers, onNotify }) => {
  const [tab, setTab] = useState<'new' | 'active'>('new');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  
  // STICKY FILTER STATE: Read from localStorage
  const [type, setType] = useState<RentalType>(() => {
    return (localStorage.getItem('last_rental_type') as RentalType) || RentalType.PS_ONLY;
  });

  const [duration, setDuration] = useState<6 | 12 | 24>(6);
  const [discount, setDiscount] = useState(0);
  const [extendId, setExtendId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [finishingRental, setFinishingRental] = useState<ActiveRental | null>(null);

  // STICKY FILTER EFFECT: Save to localStorage
  useEffect(() => {
    localStorage.setItem('last_rental_type', type);
  }, [type]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const existingCustomer = useMemo(() => 
    topCustomers.find(c => c.name.toLowerCase() === customerName.toLowerCase()), 
  [customerName, topCustomers]);

  const handleSubmit = () => {
    if (!customerName.trim()) {
        onNotify("Mohon masukkan nama penyewa!"); 
        return;
    }
    if (!address.trim()) {
        onNotify("Mohon masukkan alamat penyewa!"); 
        return;
    }

    const basePrice = PRICING[type][duration];
    const finalPrice = basePrice - discount;

    const newRental: ActiveRental = {
      id: Date.now().toString(),
      customerName,
      address,
      type,
      packageName: `${duration} Jam`,
      startTime: Date.now(),
      endTime: Date.now() + duration * 60 * 60 * 1000,
      totalPrice: Math.max(0, finalPrice),
      discount
    };
    onAddRental(newRental);
    setCustomerName('');
    setAddress('');
    setDiscount(0);
    setTab('active');
  };

  const getCountdown = (endTime: number) => {
    const diff = endTime - now;
    if (diff <= 0) {
        const overdue = Math.abs(diff);
        const hrs = Math.floor(overdue / (1000 * 60 * 60));
        const mins = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((overdue % (1000 * 60)) / 1000);
        return { 
            text: `-${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`, 
            isOverdue: true, 
            overdueBy: overdue 
        };
    }
    
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return { 
        text: `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`, 
        isOverdue: false 
    };
  };

  return (
    <div className="space-y-6 pb-28 animate-in slide-in-from-bottom-4">
      {finishingRental && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-white text-center">Selesaikan Sewa?</h3>
            
            <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Penyewa</p>
                    <p className="font-bold text-lg text-white">{finishingRental.customerName}</p>
                    <p className="text-xs text-gray-400">{finishingRental.address}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <p className="text-[9px] text-gray-500 uppercase">Paket</p>
                        <p className="font-bold text-sm text-indigo-400">{finishingRental.packageName}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <p className="text-[9px] text-gray-500 uppercase">Type</p>
                        <p className="font-bold text-sm text-indigo-400">{finishingRental.type === RentalType.PS_ONLY ? 'PS Only' : 'PS+TV'}</p>
                    </div>
                </div>
                
                {finishingRental.endTime < now && (
                    <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 flex items-center gap-3">
                        <span className="text-xl">⚠️</span>
                        <div>
                        <p className="text-[10px] text-rose-500 font-black uppercase">Overdue / Terlambat</p>
                        <p className="text-xs text-rose-300">Cek denda keterlambatan jika ada.</p>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-xs font-black uppercase text-gray-500">Total Tagihan</span>
                    <span className="text-2xl font-black text-emerald-400">{formatCurrency(finishingRental.totalPrice)}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setFinishingRental(null)} className="py-3 rounded-xl text-xs font-bold text-gray-400 hover:bg-white/5 transition-all">Batal</button>
                <button onClick={() => { onReturn(finishingRental.id); setFinishingRental(null); }} className="py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all">Konfirmasi</button>
            </div>
            </div>
        </div>
      )}

      <div className="flex layer-bg p-1 rounded-xl">
        <button onClick={() => setTab('new')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${tab === 'new' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>Sewa Baru</button>
        <button onClick={() => setTab('active')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${tab === 'active' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>Sedang Sewa ({activeRentals.length})</button>
      </div>

      {tab === 'new' ? (
        <div className="glass-morphism p-6 rounded-[2rem] border-2 border-indigo-500/20 relative">
          <h2 className="text-xl font-black mb-6 text-[var(--text-color)]">Form Penyewaan</h2>
          
          <div className="space-y-4">
            
            {/* STICKY RENTAL TYPE FILTER */}
            <div className="sticky top-0 z-10 backdrop-blur-md pb-4 pt-1 bg-[var(--card-bg)]/80 -mx-6 px-6 border-b border-[var(--border-color)] mb-4">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mb-2 block">Tipe Paket (Sticky)</label>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setType(RentalType.PS_ONLY)} className={`py-4 rounded-2xl border-2 text-xs font-black uppercase transition-all ${type === RentalType.PS_ONLY ? 'border-indigo-500 bg-indigo-500/10 text-[var(--text-color)] shadow-lg shadow-indigo-500/10' : 'border-[var(--border-color)] text-gray-500'}`}>PS Only</button>
                    <button onClick={() => setType(RentalType.PS_TV)} className={`py-4 rounded-2xl border-2 text-xs font-black uppercase transition-all ${type === RentalType.PS_TV ? 'border-emerald-500 bg-emerald-500/10 text-[var(--text-color)] shadow-lg shadow-emerald-500/10' : 'border-[var(--border-color)] text-gray-500'}`}>PS + TV 32"</button>
                </div>
            </div>

            <div className="layer-bg p-4 rounded-2xl mb-6 border border-[var(--border-color)]">
                <h3 className="text-[10px] font-black uppercase text-gray-500 mb-3 tracking-widest text-center">Harga Paket: {type === RentalType.PS_ONLY ? 'PS ONLY' : 'PS + TV'}</h3>
                <div className="flex justify-around text-center">
                    {[6, 12, 24].map(h => (
                        <div key={h}>
                            <div className="text-[10px] font-black text-gray-400 uppercase">{h} Jam</div>
                            <div className={`text-sm font-black ${type === RentalType.PS_ONLY ? 'text-indigo-400' : 'text-emerald-400'}`}>{formatCurrency(PRICING[type][h as 6|12|24])}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Nama Penyewa</label>
              <input 
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full layer-bg border border-[var(--border-color)] rounded-2xl px-5 py-4 font-bold outline-none focus:border-indigo-500 transition-all text-[var(--text-color)] placeholder-gray-500"
                placeholder="Masukkan nama..."
              />
              {existingCustomer && (
                <div className="mt-2 ml-2 flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded bg-white/5 border ${existingCustomer.color} font-black uppercase`}>Rank: {existingCustomer.rank}</span>
                  <span className="text-[10px] text-gray-500">Total Spend: {formatCurrency(existingCustomer.totalSpend)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Alamat Penyewa</label>
              <input 
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full layer-bg border border-[var(--border-color)] rounded-2xl px-5 py-4 font-bold outline-none focus:border-indigo-500 transition-all text-[var(--text-color)] placeholder-gray-500"
                placeholder="Masukkan alamat lengkap..."
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Durasi (Pilih)</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[6, 12, 24].map((h) => (
                  <button key={h} onClick={() => setDuration(h as 6|12|24)} className={`py-3 rounded-xl border text-center transition-all ${duration === h ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-[var(--border-color)] layer-bg text-[var(--text-color)]'}`}>
                    <span className="block text-lg font-black">{h}h</span>
                    <span className="text-[9px] opacity-70 block">{formatCurrency(PRICING[type][h as 6|12|24])}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Diskon (Rp)</label>
              <div className="relative">
                <input 
                    type="number"
                    min="0"
                    value={discount === 0 ? '' : discount}
                    onChange={e => {
                        const val = parseInt(e.target.value);
                        setDiscount(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    className="w-full layer-bg border border-[var(--border-color)] rounded-2xl px-5 py-3 pl-12 font-bold outline-none text-sm text-[var(--text-color)] placeholder-gray-500"
                    placeholder="0"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black text-xs">Rp</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] mt-4 flex justify-between items-center">
               <div>
                  <span className="text-[10px] uppercase font-black text-gray-500 block">Total</span>
                  <span className="text-2xl font-black text-indigo-400">{formatCurrency(Math.max(0, PRICING[type][duration] - discount))}</span>
               </div>
               <button onClick={handleSubmit} className="px-8 py-4 bg-indigo-600 rounded-2xl font-black text-xs uppercase text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Proses Sewa</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {activeRentals.length === 0 && <p className="text-center text-gray-500 italic py-10">Tidak ada unit yang sedang disewa.</p>}
          {activeRentals.map(r => {
             const countdown = getCountdown(r.endTime);
             return (
            <div key={r.id} className="glass-morphism p-5 rounded-[1.5rem] border border-[var(--border-color)] relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--text-color)]">{r.customerName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 border border-[var(--border-color)] text-gray-400">{r.address}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-2">{r.type === RentalType.PS_ONLY ? 'PS Only' : 'PS + TV'} • {r.packageName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-indigo-400">{formatCurrency(r.totalPrice)}</p>
                  <p className="text-[9px] text-gray-500">Diskon: {formatCurrency(r.discount)}</p>
                </div>
              </div>

              <div className={`rounded-xl p-4 mb-4 flex justify-between items-center relative overflow-hidden ${countdown.isOverdue ? 'bg-rose-500/10 border border-rose-500/20' : 'layer-bg border border-[var(--border-color)]'}`}>
                 <div>
                    <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest block mb-1">
                        {countdown.isOverdue ? '⚠️ Overdue' : 'Sisa Waktu'}
                    </span>
                    <span className={`text-2xl font-mono font-black ${countdown.isOverdue ? 'text-rose-500' : 'text-emerald-400'}`}>
                        {countdown.text}
                    </span>
                 </div>
                 <div className="text-right">
                     <p className="text-[9px] text-gray-500">Selesai Pada</p>
                     <p className="text-xs font-bold text-[var(--text-color)]">{formatDateDDMMYYYY(new Date(r.endTime))} {new Date(r.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                 </div>
              </div>

              {extendId === r.id ? (
                 <div className="layer-bg p-3 rounded-xl animate-in zoom-in-95">
                    <p className="text-[10px] font-black uppercase text-center mb-2 text-[var(--text-color)]">Pilih Tambahan Waktu</p>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                       {[6, 12, 24].map((h) => (
                         <button key={h} onClick={() => {
                            onExtend(r.id, h as 6|12|24, PRICING[r.type][h as 6|12|24]);
                            setExtendId(null);
                         }} className="py-2 text-[10px] font-black bg-indigo-600 text-white rounded-lg">+{h}h</button>
                       ))}
                    </div>
                    <button onClick={() => setExtendId(null)} className="w-full text-[10px] text-center text-gray-500">Batal</button>
                 </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setExtendId(r.id)} className="py-3 rounded-xl border border-[var(--border-color)] hover:bg-[var(--layer-bg)] text-[10px] font-black uppercase text-[var(--text-color)]">Tambah Waktu</button>
                  <button onClick={() => setFinishingRental(r)} className="py-3 rounded-xl bg-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white transition-all text-[10px] font-black uppercase">Selesai/Kembali</button>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RentalView;
