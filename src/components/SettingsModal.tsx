import React from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HistoryRecord } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  history: HistoryRecord[];
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onExport, onImport, onReset, history }) => {

    const handleExcelExport = () => {
        const dataToExport = history.map(h => ({
            Tanggal: new Date(h.timestamp).toLocaleDateString('id-ID'),
            Jam: new Date(h.timestamp).toLocaleTimeString('id-ID'),
            Nama_Pelanggan: h.customerName,
            Unit_Paket: h.unitName,
            Jenis: h.type,
            Durasi_Jam: parseFloat(h.duration.toFixed(2)),
            Pendapatan: h.cost
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan Transaksi");
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Laporan_InfinityPS_${dateStr}.xlsx`);
    };

    const handlePDFExport = () => {
        const doc = new jsPDF();
        const dateStr = new Date().toLocaleDateString('id-ID');
        
        doc.setFontSize(18);
        doc.text("Laporan Keuangan Infinity PS", 14, 22);
        doc.setFontSize(11);
        doc.text(`Tanggal Cetak: ${dateStr}`, 14, 30);
        
        const tableColumn = ["Tanggal", "Pelanggan", "Unit/Paket", "Durasi", "Pendapatan"];
        const tableRows: any[] = [];

        history.forEach(h => {
            const rowData = [
                new Date(h.timestamp).toLocaleDateString('id-ID'),
                h.customerName,
                h.unitName,
                h.duration.toFixed(1) + " Jam",
                `Rp ${h.cost.toLocaleString('id-ID')}`
            ];
            tableRows.push(rowData);
        });

        // Calculate total
        const totalRevenue = history.reduce((sum, h) => sum + h.cost, 0);
        tableRows.push(["", "", "", "TOTAL", `Rp ${totalRevenue.toLocaleString('id-ID')}`]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });

        doc.save(`Laporan_InfinityPS_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
        <div className="glass-morphism border border-[var(--border-color)] p-6 rounded-[2rem] w-full max-w-sm shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-[var(--text-color)]">Pengaturan & Data</h3>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/20 transition-all">✕</button>
            </div>
            
            <div className="space-y-6">
                
                {/* Export Report Section */}
                <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
                     <p className="text-[10px] text-emerald-400 font-black uppercase mb-2 tracking-widest">Laporan Keuangan</p>
                     <p className="text-[11px] text-gray-400 mb-4 leading-relaxed font-medium">
                        Unduh data transaksi yang telah tersimpan dalam format Excel atau PDF untuk pembukuan.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                         <button onClick={handleExcelExport} className="py-3 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg shadow-emerald-600/20">
                            Unduh Excel (.xlsx)
                        </button>
                        <button onClick={handlePDFExport} className="py-3 px-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-[10px] font-black uppercase flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg shadow-rose-500/20">
                            Unduh PDF (.pdf)
                        </button>
                    </div>
                </div>

                {/* Backup/Sync Section */}
                <div className="p-5 rounded-3xl bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-[10px] text-indigo-400 font-black uppercase mb-2 tracking-widest">Backup & Restore</p>
                    <p className="text-[11px] text-gray-400 mb-4 leading-relaxed font-medium">
                        Pindahkan data antar perangkat menggunakan file JSON.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={onExport} className="py-3 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
                            Backup File (.json)
                        </button>
                        <label className="py-3 px-2 bg-gray-600 hover:bg-gray-500 text-white rounded-xl text-[10px] font-black uppercase flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-lg shadow-gray-600/20">
                            Restore File
                            <input type="file" accept=".json" onChange={onImport} className="hidden" />
                        </label>
                    </div>
                </div>
                
                {/* Reset Section */}
                <div className="p-4 rounded-3xl bg-rose-500/5 border border-rose-500/10">
                    <button type="button" onClick={onReset} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/20 active:scale-95 flex items-center justify-center">
                        Reset Aplikasi (Hapus Data)
                    </button>
                </div>
            </div>
        </div>
    </div>
)};

export default SettingsModal;
