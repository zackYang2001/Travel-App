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
        // Validation feedback instead of silent disabled button
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
    
    // Use user provided image or fallback to Unsplash source based on destination
    const finalImage = coverImage.trim() || `https://source.unsplash.com/800x600/?${encodeURIComponent(destination)},landmark,city`;

    const newTrip: Trip = {
        id: `t-${Date.now()}`,
        name: `${destination} 之旅`,
        destination, startDate, endDate,
        coverImage: finalImage,
        coverImageDark: coverImageDark.trim(),
        days: daysArr, expenses: [],
        participants: currentUserId ? [currentUserId] : [] // Auto-add creator
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
    
    // Past
    if (now > endDate) return { 
        label: '已結束', 
        color: 'bg-black/60 text-white dark:text-gray-400 dark:border dark:border-gray-600 dark:bg-gray-800/50' 
    };
    
    // Ongoing
    if (now >= startDate && now <= endDate) return { 
        label: '旅途中', 
        color: 'bg-green-500 text-white dark:text-cyan-300 dark:border dark:border-cyan-500/50 dark:bg-cyan-900/30 dark:shadow-[0_0_10px_rgba(34,211,238,0.3)]' 
    };
    
    // Future
    const diffTime = Math.abs(startDate.getTime() - now.getTime());
    return { 
        label: `還有 ${Math.ceil(diffTime / (1000 * 60 * 60 * 24))} 天`, 
        color: 'bg-blue-500 text-white dark:text-fuchsia-300 dark:border dark:border-fuchsia-500/50 dark:bg-fuchsia-900/30 dark:shadow-[0_0_10px_rgba(232,121,249,0.3)]' 
    };
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-[#0B0F19] pb-20 overflow-y-auto font-sans relative transition-colors duration-300">
       
       {/* Ambient Background Glows for Dark Mode */}
       <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-500"></div>
       <div className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[80px] pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-500"></div>

       <div className="pt-16 pb-8 px-8 flex justify-between items-end z-10">
            <div>
                <p className="text-gray-400 dark:text-cyan-400 text-xs font-black tracking-[0.2em] mb-1 uppercase">Welcome Back</p>
                <h1 className="text-4xl font-extrabold text-black dark:text-white tracking-tight drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">準備出發</h1>
            </div>
            <button 
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-gray-400 dark:text-yellow-400 shadow-sm hover:scale-110 transition-all border border-transparent dark:border-white/10"
            >
                <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
       </div>

       <div className="px-6 pb-24 space-y-6 z-10">
            {trips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-t from-gray-200 to-transparent dark:from-gray-800 flex items-center justify-center mb-4 border border-white/50 dark:border-white/5">
                        <i className="fa-solid fa-plane-up text-5xl text-gray-400 dark:text-slate-600"></i>
                    </div>
                    <p className="text-gray-500 dark:text-slate-600 font-bold tracking-wide">還沒有行程，點擊右下角新增</p>
                </div>
            ) : (
                trips.map(trip => {
                    const status = getTripStatus(trip.startDate, trip.endDate);
                    // Decide which image to show
                    const displayImage = (isDarkMode && trip.coverImageDark) ? trip.coverImageDark : trip.coverImage;

                    return (
                        <div key={trip.id} onClick={() => onSelectTrip(trip.id)} className="group relative h-64 rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer active:scale-95 bg-gray-900 dark:shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                            <img src={displayImage} alt={trip.destination} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-100 dark:opacity-70" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800'; }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80"></div>
                            <div className={`absolute top-5 left-5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest backdrop-blur-md shadow-sm ${status.color}`}>{status.label}</div>
                            
                            {/* Delete Button */}
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setDeleteTripId(trip.id); 
                                }} 
                                className="absolute top-5 right-5 z-20 w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:bg-white hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 active:scale-90 border border-white/10"
                            >
                                <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>

                            <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                                <div className="flex justify-between items-end mb-1">
                                    <h3 className="text-3xl font-black leading-none tracking-tight font-display drop-shadow-lg">{trip.destination}</h3>
                                    <span className="text-xs font-bold text-white/90 bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">{trip.days.length} 天</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/70 font-medium mt-2">
                                    <div className="w-5 h-[1px] bg-white/50 dark:bg-cyan-500"></div>
                                    <span className="uppercase tracking-wider font-mono">{trip.startDate.replace(/-/g, '.')}</span>
                                    <span className="opacity-50">➜</span> 
                                    <span className="uppercase tracking-wider font-mono">{trip.endDate.replace(/-/g, '.')}</span>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
       </div>

       {/* FAB: Refractive Glass Lens Effect - Semi-transparent in dark mode - High Z-Index to avoid blocking */}
       <button onClick={openSheet} className="fixed bottom-8 right-6 w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all z-[100]
           bg-gradient-to-br from-white/40 to-white/10 dark:from-cyan-500/40 dark:to-blue-600/40 backdrop-blur-md
           border border-white/50 dark:border-white/10
           shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] dark:shadow-[0_0_20px_rgba(6,182,212,0.6)]
           text-blue-600 dark:text-white hover:scale-110 active:scale-90"
        >
            <i className="fa-solid fa-plus drop-shadow-sm"></i>
        </button>

       {/* Bottom Sheet */}
       {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className={`absolute inset-0 bg-black/10 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={closeSheet}></div>
          <div className={`bg-white/60 dark:bg-[#161b2c] backdrop-blur-2xl w-full max-w-[480px] rounded-t-[2.5rem] p-8 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/50 dark:border-white/10 transform transition-transform duration-300 ease-out z-10 relative ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}>
             
             <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-8 absolute top-3 left-1/2 -translate-x-1/2"></div>
             
             <button onClick={closeSheet} className="absolute top-6 right-6 w-8 h-8 bg-white/50 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10 transition-colors"><i className="fa-solid fa-xmark"></i></button>
             
             <h3 className="text-2xl font-black text-black dark:text-white mb-6 flex items-center gap-2">
                 <span className="dark:text-cyan-400">新增</span> 旅程
             </h3>
             
             <div className="space-y-6">
               <div className="group bg-white/40 dark:bg-black/30 p-4 rounded-2xl border border-white/50 dark:border-white/10 focus-within:bg-white/80 dark:focus-within:bg-black/50 dark:focus-within:border-cyan-500/50 transition-all">
                 <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2 group-focus-within:dark:text-cyan-400 transition-colors">目的地</label>
                 <div className="flex items-center gap-3">
                    <i className="fa-solid fa-location-dot text-gray-400 dark:text-gray-600 group-focus-within:dark:text-cyan-400 transition-colors"></i>
                    <input type="text" placeholder="輸入城市名稱..." value={destination} onChange={e => setDestination(e.target.value)} className="w-full bg-transparent outline-none font-bold text-lg text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-600" autoFocus />
                 </div>
               </div>
               
               {/* Cover Image Inputs */}
               <div className="grid grid-cols-2 gap-3">
                   <div className="group bg-white/40 dark:bg-black/30 p-4 rounded-2xl border border-white/50 dark:border-white/10 focus-within:bg-white/80 dark:focus-within:bg-black/50 dark:focus-within:border-cyan-500/50 transition-all">
                     <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2 group-focus-within:dark:text-cyan-400 transition-colors">封面 (預設/淺色)</label>
                     <div className="flex items-center gap-3">
                        <i className="fa-regular fa-image text-gray-400 dark:text-gray-600 group-focus-within:dark:text-cyan-400 transition-colors"></i>
                        <input type="text" placeholder="URL..." value={coverImage} onChange={e => setCoverImage(e.target.value)} className="w-full bg-transparent outline-none font-bold text-sm text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-600 font-mono" />
                     </div>
                   </div>
                   <div className="group bg-white/40 dark:bg-black/30 p-4 rounded-2xl border border-white/50 dark:border-white/10 focus-within:bg-white/80 dark:focus-within:bg-black/50 dark:focus-within:border-cyan-500/50 transition-all">
                     <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2 group-focus-within:dark:text-cyan-400 transition-colors">封面 (深色/選填)</label>
                     <div className="flex items-center gap-3">
                        <i className="fa-solid fa-moon text-gray-400 dark:text-gray-600 group-focus-within:dark:text-cyan-400 transition-colors"></i>
                        <input type="text" placeholder="URL..." value={coverImageDark} onChange={e => setCoverImageDark(e.target.value)} className="w-full bg-transparent outline-none font-bold text-sm text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-600 font-mono" />
                     </div>
                   </div>
               </div>

               <div className="flex items-center gap-3">
                    <div className="flex-1 group bg-white/40 dark:bg-black/30 p-4 rounded-2xl border border-white/50 dark:border-white/10 focus-within:bg-white/80 dark:focus-within:bg-black/50 dark:focus-within:border-cyan-500/50 transition-all">
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1 group-focus-within:dark:text-cyan-400 transition-colors">出發</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-transparent outline-none text-sm font-bold text-black dark:text-white font-mono dark:[color-scheme:dark]" />
                    </div>
                    <i className="fa-solid fa-arrow-right text-gray-400/50 dark:text-gray-600"></i>
                    <div className="flex-1 group bg-white/40 dark:bg-black/30 p-4 rounded-2xl border border-white/50 dark:border-white/10 focus-within:bg-white/80 dark:focus-within:bg-black/50 dark:focus-within:border-cyan-500/50 transition-all">
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1 group-focus-within:dark:text-cyan-400 transition-colors">回程</label>
                            <input type="date" min={startDate} value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-transparent outline-none text-sm font-bold text-black dark:text-white font-mono dark:[color-scheme:dark]" />
                    </div>
               </div>
               <button onClick={handleCreate} className="w-full py-4 rounded-2xl font-black text-white bg-[#007AFF] hover:bg-blue-600 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:hover:from-cyan-300 dark:hover:to-blue-400 dark:text-black transition-all shadow-xl shadow-blue-200/50 dark:shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95">開始規劃</button>
             </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTripId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white/90 dark:bg-[#1a202c] backdrop-blur-xl rounded-3xl p-6 shadow-2xl max-w-xs w-full text-center border border-white/50 dark:border-white/10 animate-scale-up overflow-hidden relative">
                {/* Modal Glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-purple-500 to-red-500 opacity-0 dark:opacity-100"></div>

                <div className="w-12 h-12 bg-red-100 dark:bg-rose-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-transparent dark:border-rose-500/20 dark:shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                    <i className="fa-solid fa-triangle-exclamation text-xl"></i>
                </div>
                <h3 className="text-lg font-black text-black dark:text-white mb-2">確認刪除？</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-6 leading-relaxed">此動作無法復原，您確定要永久刪除這個行程嗎？</p>
                <div className="flex gap-3">
                   <button 
                       onClick={() => setDeleteTripId(null)} 
                       className="flex-1 py-3 bg-gray-100 dark:bg-transparent hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl font-bold text-gray-600 dark:text-gray-400 transition-colors border border-transparent dark:border-white/10"
                    >
                       取消
                   </button>
                   <button 
                       onClick={confirmDelete} 
                       className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white shadow-lg shadow-red-200 dark:shadow-rose-900/50 transition-colors"
                    >
                       刪除
                   </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};
export default HomeView;