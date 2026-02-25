import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, User, Plus, Ticket, Play, CheckCircle2, Calendar, RefreshCw, Search, Filter, ArrowUpDown, AlertTriangle, Download, Trash2, Moon, Sun, Upload, Save, Edit3, Trophy, FileSpreadsheet, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type PlayerCategory = 'SD' | 'SMP' | 'Umum';

interface Player {
  id: string;
  name: string;
  category: PlayerCategory;
  currentWeek: string;
  accumulatedHours: number;
  vouchers: number;
  totalLifetimeHours: number;
  notes?: string;
}

function getWeekString(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

function getCurrentWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getTimeUntilNextWeek() {
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay() || 7; // 1 (Mon) to 7 (Sun)
  if (day !== 1) d.setHours(24, 0, 0, 0); // Reset to midnight next day if not Monday
  
  // Calculate days until next Monday
  const daysUntilMonday = 8 - day;
  
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  
  const diff = nextMonday.getTime() - now.getTime();
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('ps3_players');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [name, setName] = useState('');
  const [category, setCategory] = useState<PlayerCategory>('SD');
  const [duration, setDuration] = useState<string>('');
  const [durationError, setDurationError] = useState<string>('');
  const [newVoucherAlert, setNewVoucherAlert] = useState<{name: string, count: number} | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'totalHours' | 'vouchers'>('name');
  const [filterCategory, setFilterCategory] = useState<'All' | PlayerCategory>('All');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);
  const [voucherToUse, setVoucherToUse] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [timeLeft, setTimeLeft] = useState(getTimeUntilNextWeek());

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ps3_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('ps3_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ps3_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilNextWeek());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Automatic weekly reset check
  useEffect(() => {
    const currentWeekStr = getWeekString(new Date());
    setPlayers(prev => {
      let hasChanges = false;
      const updated = prev.map(p => {
        if (p.currentWeek !== currentWeekStr) {
          hasChanges = true;
          return {
            ...p,
            accumulatedHours: 0,
            currentWeek: currentWeekStr
          };
        }
        return p;
      });
      return hasChanges ? updated : prev;
    });
  }, []);

  const handleResetWeekly = () => {
    setPlayers(prev => prev.map(p => ({
      ...p,
      accumulatedHours: 0,
      currentWeek: getWeekString(new Date())
    })));
    setShowResetConfirm(false);
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    setDurationError('');

    const parsedDuration = parseFloat(duration);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      setDurationError('Lama bermain harus berupa angka yang lebih dari 0.');
      return;
    }

    if ((category === 'SD' || category === 'SMP') && parsedDuration > 3) {
      setDurationError('Batas maksimal bermain untuk SD/SMP adalah 3 jam per sesi. Silakan bagi waktu bermain.');
      return;
    }

    if (!name.trim()) return;

    const weekStr = getWeekString(new Date());
    const normalizedName = name.trim().toLowerCase();
    
    let earnedVouchers = 0;
    let playerName = name.trim();

    setPlayers(prev => {
      const existingPlayerIndex = prev.findIndex(p => p.name.toLowerCase() === normalizedName);
      let updatedPlayers = [...prev];

      if (existingPlayerIndex >= 0) {
        const player = { ...updatedPlayers[existingPlayerIndex] };
        playerName = player.name;
        
        if (player.currentWeek !== weekStr) {
          player.accumulatedHours = 0;
          player.currentWeek = weekStr;
        }

        player.category = category;
        player.totalLifetimeHours += parsedDuration;
        
        if (player.category === 'SD' || player.category === 'SMP') {
          player.accumulatedHours += parsedDuration;
          while (player.accumulatedHours >= 5) {
            player.vouchers += 1;
            player.accumulatedHours -= 5;
            earnedVouchers += 1;
          }
        }

        updatedPlayers[existingPlayerIndex] = player;
      } else {
        let accHours = 0;
        let vouchers = 0;
        if (category === 'SD' || category === 'SMP') {
          accHours = parsedDuration;
          while (accHours >= 5) {
            vouchers += 1;
            accHours -= 5;
            earnedVouchers += 1;
          }
        }

        const newPlayer: Player = {
          id: crypto.randomUUID(),
          name: playerName,
          category,
          currentWeek: weekStr,
          accumulatedHours: accHours,
          vouchers,
          totalLifetimeHours: parsedDuration
        };
        updatedPlayers.push(newPlayer);
      }

      return updatedPlayers;
    });

    if (earnedVouchers > 0) {
      setNewVoucherAlert({ name: playerName, count: earnedVouchers });
      setTimeout(() => setNewVoucherAlert(null), 4000);
    }

    setName('');
    setDuration('');
  };

  const handleUseVoucher = (playerId: string) => {
    setVoucherToUse(playerId);
  };

  const executeUseVoucher = () => {
    if (voucherToUse) {
      setPlayers(prev => prev.map(p => {
        if (p.id === voucherToUse && p.vouchers > 0) {
          return { ...p, vouchers: p.vouchers - 1 };
        }
        return p;
      }));
      setVoucherToUse(null);
    }
  };

  const handleDeletePlayer = (playerId: string) => {
    setPlayerToDelete(playerId);
  };

  const executeDelete = () => {
    if (playerToDelete) {
      setPlayers(prev => prev.filter(p => p.id !== playerToDelete));
      setPlayerToDelete(null);
    }
  };

  const handleUpdateNotes = (playerId: string, notes: string) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, notes } : p));
  };

  const handleUpdateProfile = (playerId: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, ...updates } : p));
  };

  const filteredAndSortedPlayers = players
    .filter(p => filterCategory === 'All' || p.category === filterCategory)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'totalHours') return b.totalLifetimeHours - a.totalLifetimeHours;
      if (sortBy === 'vouchers') return b.vouchers - a.vouchers;
      return 0;
    });

  const topPlayers = [...players].sort((a, b) => b.totalLifetimeHours - a.totalLifetimeHours).slice(0, 5);

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(players, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'infinity_backup.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setPlayers(imported);
          alert('Data berhasil diimpor!');
        }
      } catch (err) {
        alert('Format file tidak valid.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-200 p-6 md:p-12 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center relative">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="absolute right-0 top-0 p-3 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-full mb-6 ring-1 ring-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
          >
            <Gamepad2 className="w-12 h-12 text-indigo-500 dark:text-indigo-400" />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4"
          >
            Rental PS3 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400">Infinity Playstation</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto text-lg"
          >
            Promo Spesial Pelajar (SD-SMP): Main 5 jam dalam seminggu, dapatkan <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Gratis 1 Jam!</strong>
          </motion.p>
        </header>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl mb-12"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              Input Waktu Bermain
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl text-indigo-600 dark:text-indigo-300 font-medium text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Minggu ke-{getCurrentWeekNumber(new Date())}
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-xl text-orange-600 dark:text-orange-300 font-medium text-sm flex items-center gap-2" title="Sisa waktu promo minggu ini">
                <Clock className="w-4 h-4" />
                {timeLeft.days}h {timeLeft.hours}j {timeLeft.minutes}m
              </div>
              <button 
                onClick={() => setShowLeaderboard(true)}
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                Top Player
              </button>
              <button 
                onClick={handleExportJSON}
                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                title="Backup Data (JSON)"
              >
                <Download className="w-4 h-4" />
                Backup
              </button>
              <label className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer" title="Restore Data (JSON)">
                <Upload className="w-4 h-4" />
                Restore
                <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportJSON} />
              </label>
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Mingguan
              </button>
            </div>
          </div>
          <form onSubmit={handleAddSession} className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Nama Pelanggan</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="Masukkan nama..."
                required
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Kategori</label>
              <div className="relative">
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value as PlayerCategory)}
                  className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none"
                >
                  <option value="SD">Anak SD</option>
                  <option value="SMP">Anak SMP</option>
                  <option value="Umum">Umum</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  ▼
                </div>
              </div>
            </div>
            <div className="md:col-span-3 space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Lama Bermain (Jam)</label>
              <input 
                type="text" 
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className={`w-full bg-slate-50 dark:bg-slate-900/80 border ${durationError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'} rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600`}
                placeholder="Contoh: 2 atau 1.5"
                required
              />
              {durationError && (
                <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">{durationError}</p>
              )}
            </div>
            <div className="md:col-span-2 flex items-end">
              <button 
                type="submit"
                className="w-full h-[50px] bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-4 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                <Play className="w-4 h-4" fill="currentColor" />
                Simpan
              </button>
            </div>
          </form>
        </motion.div>

        <div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-3">
                <User className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                Daftar Pelanggan
              </h2>
              <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-300 dark:border-slate-700/50">
                {filteredAndSortedPlayers.length}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Cari nama..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full sm:w-48 bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value as any)}
                    className="w-full sm:w-36 bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none"
                  >
                    <option value="All">Semua Kategori</option>
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="Umum">Umum</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
                </div>

                <div className="relative w-full sm:w-auto">
                  <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="w-full sm:w-40 bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none"
                  >
                    <option value="name">Urut: Nama</option>
                    <option value="totalHours">Urut: Total Jam</option>
                    <option value="vouchers">Urut: Voucher</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedPlayers.map(player => (
                <PlayerCard key={player.id} player={player} onUseVoucher={handleUseVoucher} onDelete={handleDeletePlayer} onUpdateProfile={handleUpdateProfile} />
              ))}
            </AnimatePresence>
            {filteredAndSortedPlayers.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full text-center py-20 bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/30 rounded-3xl border-dashed"
              >
                <Gamepad2 className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4 opacity-50" />
                <p className="text-slate-600 dark:text-slate-400 text-lg">Belum ada data pelanggan.</p>
                <p className="text-slate-500 text-sm mt-1">Tambahkan waktu bermain di atas untuk memulai.</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4 text-rose-500 dark:text-rose-400">
                <div className="p-3 bg-rose-100 dark:bg-rose-500/10 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Reset Mingguan?</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Tindakan ini akan mereset progress jam bermain mingguan untuk semua pelanggan. Voucher yang sudah didapat tidak akan hilang. Apakah Anda yakin?
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleResetWeekly}
                  className="px-5 py-2.5 rounded-xl font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-500/20"
                >
                  Ya, Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLeaderboard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-amber-500">
                  <div className="p-3 bg-amber-100 dark:bg-amber-500/10 rounded-full">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Top 5 Player</h3>
                </div>
                <button 
                  onClick={() => setShowLeaderboard(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Tutup
                </button>
              </div>
              
              <div className="space-y-3">
                {topPlayers.length > 0 ? topPlayers.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' :
                        index === 1 ? 'bg-slate-300 dark:bg-slate-400 text-slate-800 dark:text-slate-900' :
                        index === 2 ? 'bg-orange-400 dark:bg-orange-700/50 text-white' :
                        'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{player.name}</div>
                        <div className="text-xs text-slate-500">{player.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-indigo-600 dark:text-indigo-400">{player.totalLifetimeHours} <span className="text-xs font-medium text-slate-500">jam</span></div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-slate-500 py-4">Belum ada data pelanggan.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {playerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4 text-rose-500 dark:text-rose-400">
                <div className="p-3 bg-rose-100 dark:bg-rose-500/10 rounded-full">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Hapus Pelanggan?</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Apakah Anda yakin ingin menghapus pelanggan ini? Data riwayat bermain dan voucher akan hilang secara permanen.
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setPlayerToDelete(null)}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={executeDelete}
                  className="px-5 py-2.5 rounded-xl font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-500/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {voucherToUse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4 text-emerald-500 dark:text-emerald-400">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 rounded-full">
                  <Ticket className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Gunakan Voucher?</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Apakah Anda yakin ingin menggunakan 1 voucher gratis untuk pelanggan ini?
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setVoucherToUse(null)}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={executeUseVoucher}
                  className="px-5 py-2.5 rounded-xl font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Ya, Gunakan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {newVoucherAlert && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-900 px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-500/20 flex items-center gap-4 min-w-[320px]"
          >
            <div className="bg-white/20 p-2 rounded-full">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg leading-tight">Voucher Gratis!</h4>
              <p className="text-sm font-medium opacity-90">
                {newVoucherAlert.name} mendapat {newVoucherAlert.count} voucher baru.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PlayerCard: React.FC<{ player: Player, onUseVoucher: (id: string) => void, onDelete: (id: string) => void, onUpdateProfile: (id: string, updates: Partial<Player>) => void }> = ({ player, onUseVoucher, onDelete, onUpdateProfile }) => {
  const isPromoEligible = player.category === 'SD' || player.category === 'SMP';
  const progressPercentage = isPromoEligible ? Math.min((player.accumulatedHours / 5) * 100, 100) : 0;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(player.name);
  const [editCategory, setEditCategory] = useState(player.category);
  const [editNotes, setEditNotes] = useState(player.notes || '');
  const [editAccumulatedHours, setEditAccumulatedHours] = useState(player.accumulatedHours.toString());

  const handleSave = () => {
    if (editName.trim()) {
      const accHours = parseFloat(editAccumulatedHours);
      onUpdateProfile(player.id, {
        name: editName.trim(),
        category: editCategory,
        notes: editNotes,
        accumulatedHours: isNaN(accHours) ? 0 : accHours
      });
      setIsEditing(false);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-colors shadow-sm dark:shadow-none"
    >
      {player.vouchers > 0 && (
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
      )}

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onDelete(player.id);
        }}
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-100 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition-all z-10"
        title="Hapus Pelanggan"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      <div className="flex justify-between items-start mb-6 pr-8">
        <div className="flex-1 mr-4">
          {isEditing ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-500 font-semibold uppercase">Nama</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-semibold uppercase">Kategori</label>
                <select 
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value as PlayerCategory)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="SD">SD</option>
                  <option value="SMP">SMP</option>
                  <option value="Umum">Umum</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-semibold uppercase">Jam Minggu Ini</label>
                <input 
                  type="number" 
                  value={editAccumulatedHours}
                  onChange={e => setEditAccumulatedHours(e.target.value)}
                  step="0.5"
                  min="0"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-semibold uppercase">Catatan</label>
                <textarea 
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => { 
                    setIsEditing(false); 
                    setEditName(player.name); 
                    setEditCategory(player.category);
                    setEditNotes(player.notes || '');
                    setEditAccumulatedHours(player.accumulatedHours.toString());
                  }}
                  className="flex-1 text-xs px-2 py-2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 text-xs px-2 py-2 rounded bg-indigo-500 text-white hover:bg-indigo-600 transition-colors font-medium"
                >
                  Simpan
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 group/title">
                {player.name}
                <button 
                  onClick={() => setIsEditing(true)}
                  className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-indigo-500 transition-all"
                  title="Edit Profil"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </h3>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold mt-2 tracking-wide ${
                player.category === 'Umum' 
                  ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50' 
                  : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20'
              }`}>
                {player.category}
              </span>
            </>
          )}
        </div>
        {!isEditing && (
          <div className="text-right bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800/50 shrink-0">
            <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
              {player.totalLifetimeHours}
              <span className="text-sm font-medium text-slate-500 ml-1">jam</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1 font-semibold">Total Main</div>
          </div>
        )}
      </div>

      {!isEditing && (
        <>
          <div className="mb-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/50 flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Jam Minggu Ini</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{player.accumulatedHours} jam</span>
          </div>

          {isPromoEligible ? (
            <div className="mb-6 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/50">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Progress Promo (Minggu ini)</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{player.accumulatedHours} / 5 Jam</span>
              </div>
              <div className="h-2.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 dark:from-indigo-500 dark:to-cyan-400 rounded-full relative"
                >
                  <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse" />
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="mb-6 py-3 px-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800/50 text-xs text-slate-500 text-center font-medium">
              Promo hanya berlaku untuk SD & SMP
            </div>
          )}

          {/* Notes Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catatan</span>
              <button 
                onClick={() => setIsEditing(true)}
                className="text-slate-400 hover:text-indigo-500 transition-colors"
                title="Edit Catatan"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div 
              onClick={() => setIsEditing(true)}
              className={`text-sm p-3 rounded-xl border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${player.notes ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/50 text-slate-700 dark:text-slate-300' : 'bg-transparent border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 italic'}`}
            >
              {player.notes || 'Klik untuk menambahkan catatan...'}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${player.vouchers > 0 ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
            <Ticket className={`w-5 h-5 ${player.vouchers > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Voucher Gratis</span>
            <span className={`text-lg font-bold leading-none ${player.vouchers > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {player.vouchers}
            </span>
          </div>
        </div>
        
        {player.vouchers > 0 && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onUseVoucher(player.id)}
            className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400 text-white dark:text-slate-900 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            Gunakan
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
