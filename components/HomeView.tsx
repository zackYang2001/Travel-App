
import React, { useState } from 'react';
import { Trip } from '../types';

interface HomeViewProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onAddTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ trips, onSelectTrip, onAddTrip, onDeleteTrip }) => {
  const [showSheet, setShowSheet] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImage, setCoverImage] = useState('');

  // Delete Confirmation State
  const [deleteTripId, setDeleteTripId] = useState<string | null>(null);

  const openSheet = () => { setIsClosing(false); setShowSheet(true); };
  const closeSheet = () => { setIsClosing(true); setTimeout(() => { setShowSheet(false); setIsClosing(false); }, 300); };

  const handleCreate = () => {
    if (!destination || !startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
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
        days: daysArr, expenses: []
    };
    onAddTrip(newTrip);
    closeSheet();
    setDestination(''); setStartDate(''); setEndDate(''); setCoverImage('');
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
    if (now > endDate) return { label: '已結束', color: 'bg-black/60 text-white' };
    if (now >= startDate && now <= endDate) return { label: '旅途中', color: 'bg-green-500 text-white' };
    const diffTime = Math.abs(startDate.getTime() - now.getTime());
    return { label: `還有 ${Math.ceil(diffTime / (1000 * 60 * 60 * 24))} 天`, color: 'bg-blue-500 text-white' };
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] pb-20 overflow-y-auto font-sans relative">
       <div className="pt-16 pb-8 px-8">
            <p className="text-gray-400 text-sm font-bold tracking-wider mb-1 uppercase">Welcome Back</p>
            <h1 className="text-4xl font-extrabold text-black tracking-tight">準備出發</h1>
       </div>

       <div className="px-6 pb-24 space-y-6">
            {trips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <i className="fa-solid fa-plane-up text-6xl mb-4 text-gray-300"></i>
                    <p className="text-gray-500 font-bold">還沒有行程，點擊右下角新增</p>
                </div>
            ) : (
                trips.map(trip => {
                    const status = getTripStatus(trip.startDate, trip.endDate);
                    return (
                        <div key={trip.id} onClick={() => onSelectTrip(trip.id)} className="group relative h-64 rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer active:scale-95">
                            <img src={trip.coverImage} alt={trip.destination} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800'; }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80"></div>
                            <div className={`absolute top-5 left-5 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md shadow-sm ${status.color}`}>{status.label}</div>
                            
                            {/* Delete Button - Increased Z-Index and Hit Area */}
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setDeleteTripId(trip.id); 
                                }} 
                                className="absolute top-5 right-5 z-20 w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:bg-white hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                            >
                                <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>

                            <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                                <div className="flex justify-between items-end mb-1">
                                    <h3 className="text-3xl font-black leading-none tracking-tight">{trip.destination}</h3>
                                    <span className="text-xs font-bold text-white/90 bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm">{trip.days.length} 天</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/70 font-medium mt-2"><i className="fa-regular fa-calendar"></i>{trip.startDate} <span className="opacity-50">➜</span> {trip.endDate}</div>
                            </div>
                        </div>
                    );
                })
            )}
       </div>

       {/* FAB: Refractive Glass Lens Effect */}
       <button onClick={openSheet} className="fixed bottom-8 right-6 w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all z-40 
           bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-[2px]
           border border-white/50
           shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] shadow-inner
           text-blue-600 hover:scale-110 active:scale-90"
        >
            <i className="fa-solid fa-plus drop-shadow-sm"></i>
        </button>

       {/* Bottom Sheet - Glassmorphism Transparent Style */}
       {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className={`absolute inset-0 bg-black/10 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={closeSheet}></div>
          <div className={`bg-white/60 backdrop-blur-2xl w-full max-w-[480px] rounded-t-[2.5rem] p-8 shadow-2xl border-t border-white/50 transform transition-transform duration-300 ease-out z-10 relative ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}>
             <button onClick={closeSheet} className="absolute top-6 right-6 w-8 h-8 bg-white/50 rounded-full flex items-center justify-center text-gray-500 hover:bg-white"><i className="fa-solid fa-xmark"></i></button>
             <h3 className="text-2xl font-black text-black mb-6">新增旅程</h3>
             <div className="space-y-6">
               <div className="bg-white/40 p-4 rounded-2xl border border-white/50 focus-within:bg-white/80 transition-all">
                 <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">目的地</label>
                 <input type="text" placeholder="輸入城市名稱..." value={destination} onChange={e => setDestination(e.target.value)} className="w-full bg-transparent outline-none font-bold text-lg text-black placeholder-gray-400" autoFocus />
               </div>
               
               <div className="bg-white/40 p-4 rounded-2xl border border-white/50 focus-within:bg-white/80 transition-all">
                 <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">封面圖片 (URL)</label>
                 <input type="text" placeholder="https://..." value={coverImage} onChange={e => setCoverImage(e.target.value)} className="w-full bg-transparent outline-none font-bold text-sm text-black placeholder-gray-400 font-mono" />
               </div>

               <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white/40 p-4 rounded-2xl border border-white/50 focus-within:bg-white/80 transition-all">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">出發</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-transparent outline-none text-sm font-bold text-black font-mono" />
                    </div>
                    <i className="fa-solid fa-arrow-right text-gray-400/50"></i>
                    <div className="flex-1 bg-white/40 p-4 rounded-2xl border border-white/50 focus-within:bg-white/80 transition-all">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">回程</label>
                            <input type="date" min={startDate} value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-transparent outline-none text-sm font-bold text-black font-mono" />
                    </div>
               </div>
               <button onClick={handleCreate} disabled={!destination || !startDate || !endDate} className="w-full py-4 rounded-2xl font-bold text-white bg-[#007AFF] hover:bg-blue-600 disabled:opacity-50 transition-all shadow-xl shadow-blue-200/50">開始規劃</button>
             </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTripId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl max-w-xs w-full text-center border border-white/50 animate-scale-up">
                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-triangle-exclamation text-xl"></i>
                </div>
                <h3 className="text-lg font-black text-black mb-2">確認刪除？</h3>
                <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">此動作無法復原，您確定要永久刪除這個行程嗎？</p>
                <div className="flex gap-3">
                   <button 
                       onClick={() => setDeleteTripId(null)} 
                       className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600 transition-colors"
                    >
                       取消
                   </button>
                   <button 
                       onClick={confirmDelete} 
                       className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white shadow-lg shadow-red-200 transition-colors"
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
