import React, { useState, useEffect } from 'react';
import { PSUnit, PSStatus } from '../types';

interface PSUnitCardProps {
  unit: PSUnit;
  onStart: (id: number, minutes: number, customerName: string) => void;
  onStop: (id: number) => void;
  onReset: (id: number) => void;
  onForceReset: (id: number) => void;
  hourlyRate: number;
}

const PSUnitCard: React.FC<PSUnitCardProps> = ({ unit, onStart, onStop, onReset, onForceReset, hourlyRate }) => {
  const [customerName, setCustomerName] = useState('');
  const [duration, setDuration] = useState(60);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calculateCost = (minutes: number) => {
    return (minutes / 60) * hourlyRate;
  };

  const handleStart = () => {
    if (customerName.trim()) {
      onStart(unit.id, duration, customerName);
      setCustomerName('');
    }
  };

  return (
    <div className={`glass-morphism p-6 rounded-[2rem] border relative overflow-hidden transition-all duration-300 ${
      unit.status === PSStatus.OCCUPIED ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 
      unit.status === PSStatus.FINISHED ? 'border-rose-500/50 shadow-lg shadow-rose-500/10' : 
      'border-[var(--border-color)]'
    }`}>
      {/* Status Indicator */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
        unit.status === PSStatus.AVAILABLE ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
        unit.status === PSStatus.OCCUPIED ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 animate-pulse' :
        'bg-rose-500/10 text-rose-500 border-rose-500/20'
      }`}>
        {unit.status}
      </div>

      <h3 className="text-xl font-black text-[var(--text-color)] mb-1">{unit.name}</h3>
      
      {unit.status === PSStatus.AVAILABLE && (
        <div className="mt-6 space-y-4 animate-in fade-in">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Nama Pelanggan</label>
            <input 
              type="text" 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full layer-bg border border-[var(--border-color)] rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-indigo-500 transition-all text-[var(--text-color)] placeholder-gray-600"
              placeholder="Masukkan nama..."
            />
          </div>
          
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Durasi (Menit)</label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {[30, 60, 120, 180].map((m) => (
                <button 
                  key={m}
                  onClick={() => setDuration(m)}
                  className={`py-2 rounded-xl text-[10px] font-black transition-all ${duration === m ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'layer-bg text-gray-500 hover:text-[var(--text-color)]'}`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div>
              <span className="text-[10px] uppercase font-black text-gray-500 block">Estimasi Biaya</span>
              <span className="text-lg font-black text-indigo-400">Rp {calculateCost(duration).toLocaleString('id-ID')}</span>
            </div>
            <button 
              onClick={handleStart}
              disabled={!customerName.trim()}
              className="px-6 py-3 bg-indigo-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-black text-[10px] uppercase text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
            >
              Mulai Main
            </button>
          </div>
        </div>
      )}

      {unit.status === PSStatus.OCCUPIED && (
        <div className="mt-6 animate-in fade-in">
          <div className="text-center mb-6">
            <div className="text-4xl font-mono font-black text-[var(--text-color)] tracking-wider">
              {formatTime(unit.remainingSeconds)}
            </div>
            <p className="text-xs font-bold text-indigo-400 mt-2">{unit.customerName}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="layer-bg p-3 rounded-xl text-center border border-[var(--border-color)]">
              <span className="text-[9px] uppercase font-black text-gray-500 block">Total Biaya</span>
              <span className="text-sm font-black text-[var(--text-color)]">Rp {unit.totalCost.toLocaleString('id-ID')}</span>
            </div>
            <div className="layer-bg p-3 rounded-xl text-center border border-[var(--border-color)]">
              <span className="text-[9px] uppercase font-black text-gray-500 block">Selesai Pukul</span>
              <span className="text-sm font-black text-[var(--text-color)]">
                {unit.startTime && new Date(unit.startTime + unit.durationInMinutes * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>

          <button 
            onClick={() => onStop(unit.id)}
            className="w-full mt-4 py-3 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 border border-rose-500/20 rounded-xl font-black text-[10px] uppercase transition-all active:scale-95"
          >
            Stop Paksa / Selesai
          </button>
        </div>
      )}

      {unit.status === PSStatus.FINISHED && (
        <div className="mt-6 animate-in fade-in text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <span className="text-2xl">✅</span>
          </div>
          <h4 className="text-lg font-black text-[var(--text-color)]">Sesi Selesai!</h4>
          <p className="text-xs text-gray-500 mb-6">Total tagihan: <span className="text-emerald-400 font-bold">Rp {unit.totalCost.toLocaleString('id-ID')}</span></p>
          
          <div className="grid grid-cols-2 gap-3">
             <button 
              onClick={() => onForceReset(unit.id)}
              className="py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl font-black text-[10px] uppercase transition-all"
            >
              Batal
            </button>
            <button 
              onClick={() => onReset(unit.id)}
              className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              Simpan & Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PSUnitCard;
