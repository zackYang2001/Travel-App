
import React, { useState } from 'react';
import { Trip } from '../types';

interface HomeViewProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onAddTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  currentUserId?: string;
}

const HomeView: React.FC<HomeViewProps> = ({ trips, onSelectTrip, onAddTrip, onDeleteTrip, isDarkMode, toggleTheme, currentUserId }) => {
  const [showSheet, setShowSheet] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [coverImageDark, setCoverImageDark] = useState('');

  // Delete Confirmation State
  const [deleteTripId, setDeleteTripId] = useState<string | null>(null);

  const openSheet = () => { setIsClosing(false); setShowSheet(true); };
  const closeSheet = () => { setIsClosing(true); setTimeout(() => { setShowSheet(false); setIsClosing(false); }, 300); };

  const handleCreate = () => {
    if (!destination || !startDate || !endDate) {
        alert("請輸入目的地並選擇出發及回程日期！");
        return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
        alert("回程日期不能早於出發日期！");
        return;
    }

    const daysArr = [];
    let current = new Date(start);
    let dayCount = 1;
    while (current <= end) {
        daysArr.push({ id: `d-${Date.now()}-${dayCount}`, date: current.toISOString().split('T')[0], dayLabel: `第 ${dayCount} 天`, items: [] });
        current.setDate(current.getDate() + 1);
        dayCount++;
    }
    
    const finalImage = coverImage.trim() || `https://source.unsplash.com/featured/800x600?${encodeURIComponent(destination)},landmark`;

    const newTrip: Trip = {
        id: `t-${Date.now()}`,
        name: `${destination} 之旅`,
        destination, startDate, endDate,
        coverImage: finalImage,
        coverImageDark: coverImageDark.trim(),
        days: daysArr, expenses: [],
        participants: currentUserId ? [currentUserId] : []
    };
    onAddTrip(newTrip);
    closeSheet();
    setDestination(''); setStartDate(''); setEndDate(''); setCoverImage(''); setCoverImageDark('');
  };

  const confirmDelete = () => {
      if (deleteTripId) {
          onDeleteTrip(deleteTripId);
          setDeleteTripId(null);
      }
  };

  const getTripStatus = (start: string, end: string) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    now.setHours(0,0,0,0);
    
    if (now > endDate) return { label: '已結束', color: 'bg-black/60 text-white dark:text-gray-400 dark:bg-gray-800/50' };
    if (now >= startDate && now <= endDate) return { label: '旅途中', color: 'bg-green-500 text-white dark:bg-cyan-900/30' };
    
    const diffTime = Math.abs(startDate.getTime() - now.getTime());
    return { 
      label: `還有 ${Math.ceil(diffTime / (1000 * 60 * 60 * 24))} 天`, 
      color: 'bg-blue-500 text-white dark:bg-[#2D1B4E]/80 dark:border dark:border-[#A855F7] dark:text-[#F3E8FF]' 
    };
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#0B0F19] pb-20 overflow-y-auto font-sans relative transition-colors duration-300">
       <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-500"></div>

       <div className="pt-16 pb-8 px-8 flex justify-between items-end z-10">
            <div>
                <p className="text-gray-400 dark:text-cyan-400 text-xs font-black tracking-[0.2em] mb-1 uppercase">Welcome Back</p>
                <h1 className="text-4xl font-extrabold text-black dark:text-white tracking-tight">準備出發</h1>
            </div>
            <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-gray-400 dark:text-yellow-400 shadow-sm border border-transparent dark:border-white/10">
                <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
       </div>

       <div className="px-6 pb-24 space-y-6 z-10">
            {trips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-4"><i className="fa-solid fa-plane-up text-5xl text-gray-400"></i></div>
                    <p className="text-gray-500 dark:text-slate-600 font-bold">還沒有行程，點擊下方新增</p>
                </div>
            ) : (
                trips.map(trip => {
                    const status = getTripStatus(trip.startDate, trip.endDate);
                    const displayImage = (isDarkMode && trip.coverImageDark) ? trip.coverImageDark : trip.coverImage;
                    return (
                        <div key={trip.id} onClick={() => onSelectTrip(trip.id)} className="group relative h-64 rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer active:scale-95 bg-gray-900">
                            <img src={displayImage} alt={trip.destination} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-100 dark:opacity-70" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80"></div>
                            <div className={`absolute top-5 left-5 px-4 py-1.5 rounded-full text-[11px] font-black tracking-widest backdrop-blur-md shadow-sm ${status.color}`}>{status.label}</div>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteTripId(trip.id); }} className="absolute top-5 right-5 z-20 w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:bg-white hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 active:scale-90"><i className="fa-solid fa-trash-can text-xs"></i></button>
                            <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                                <div className="flex justify-between items-end mb-1">
                                    <h3 className="text-3xl font-black leading-none tracking-tight">{trip.destination}</h3>
                                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm">{trip.days.length} 天</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/70 font-medium mt-2"><div className="w-5 h-[1px] bg-white/50"></div><span className="font-mono">{trip.startDate.replace(/-/g, '.')}</span><span className="opacity-50">➜</span><span className="font-mono">{trip.endDate.replace(/-/g, '.')}</span></div>
                            </div>
                        </div>
                    );
                })
            )}
       </div>

       {!showSheet && (
           <button onClick={openSheet} className="fixed bottom-8 right-6 w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all z-[100] bg-gradient-to-br from-white/40 to-white/10 dark:from-cyan-500/40 dark:to-blue-600/40 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-xl text-blue-600 dark:text-white hover:scale-110 active:scale-90">
                <i className="fa-solid fa-plus drop-shadow-sm"></i>
            </button>
       )}

       {showSheet && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
          <div className={`absolute inset-0 bg-black/10 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={closeSheet}></div>
          <div className={`bg-white/90 dark:bg-[#161b2c] backdrop-blur-2xl w-full max-w-[480px] rounded-t-[2.5rem] p-8 shadow-2xl border-t border-white/50 dark:border-white/10 transform transition-transform duration-300 ease-out z-10 relative ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}>
             <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-8 absolute top-3 left-1/2 -translate-x-1/2"></div>
             <button onClick={closeSheet} className="absolute top-6 right-6 w-8 h-8 bg-white/50 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-500"><i className="fa-solid fa-xmark"></i></button>
             <h3 className="text-2xl font-black text-black dark:text-white mb-6">新增旅程</h3>
             <div className="space-y-6">
               <div className="bg-white/40 dark:bg-black/30 p-4 rounded-2xl border border-white/50 dark:border-white/10 transition-all">
                 <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">目的地</label>
                 <div className="flex items-center gap-3"><i className="fa-solid fa-location-dot text-gray-400"></i><input type="text" placeholder="輸入城市名稱..." value={destination} onChange={e => setDestination(e.target.value)} className="w-full bg-transparent outline-none font-bold text-lg text-black dark:text-white" autoFocus /></div>
               </div>
               <button onClick={handleCreate} className="w-full py-4 rounded-2xl font-black text-white bg-[#007AFF] hover:bg-blue-600 transition-all shadow-xl active:scale-95">開始規劃</button>
             </div>
          </div>
        </div>
      )}

      {/* Trip Delete Confirmation - Master Aesthetic Optimized */}
      {deleteTripId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur-md p-4 animate-fade-in">
             <div className="relative p-[1.5px] rounded-[2.8rem] bg-gradient-to-tr from-[#5AC8FA] via-[#AF52DE] to-[#FF2D55] dark:from-[#FF2D55] dark:via-[#AF52DE] dark:to-[#5AC8FA] shadow-[0_20px_60px_-15px_rgba(175,82,222,0.3)] dark:shadow-[0_20px_70px_-10px_rgba(175,82,222,0.5)] animate-scale-up max-w-sm w-full">
                {/* Independent Glow Layer */}
                <div className="absolute inset-0 rounded-[2.8rem] opacity-40 dark:opacity-50 blur-3xl bg-gradient-to-tr from-[#5AC8FA] via-[#AF52DE] to-[#FF2D55] dark:from-[#FF2D55] dark:via-[#AF52DE] dark:to-[#5AC8FA] -z-10"></div>
                
                {/* Pure Glass Interior - Neutral background with high opacity for clarity */}
                <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-[40px] rounded-[2.7rem] overflow-hidden p-9 text-center border border-white/40 dark:border-white/5">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-inner">
                        <i className="fa-solid fa-trash-can text-2xl"></i>
                    </div>
                    <h3 className="text-2xl font-black text-black dark:text-white mb-3 tracking-tight">確認刪除？</h3>
                    <p className="text-gray-700 dark:text-gray-300 font-bold mb-9 leading-relaxed text-sm">
                        此動作無法復原，您確定要永久刪除這個行程嗎？
                    </p>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setDeleteTripId(null)} 
                            className="flex-1 py-4 bg-white/50 dark:bg-white/5 rounded-2xl font-black text-gray-700 dark:text-gray-300 border border-black/5 dark:border-white/10 hover:bg-white/80 transition-all active:scale-95 text-sm"
                        >
                            取消
                        </button>
                        <button 
                            onClick={confirmDelete} 
                            className="flex-1 py-4 bg-gradient-to-r from-[#FF3B30] to-[#FF2D55] text-white rounded-2xl font-black shadow-lg shadow-red-500/30 hover:brightness-110 transition-all active:scale-95 text-sm"
                        >
                            刪除
                        </button>
                    </div>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};
export default HomeView;
