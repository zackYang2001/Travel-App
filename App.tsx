import React, { useState, useMemo, useEffect } from 'react';

// --- 1. Type Definitions ---
interface TripItem {
  id: string;
  type: 'spot' | 'food' | 'transport' | 'hotel' | 'note';
  time?: string;
  title: string;
  location?: string;
  cost?: number;
  note?: string;
}

interface DayPlan {
  id: string;
  date: string;
  dayLabel: string;
  items: TripItem[];
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  payer: string;
}

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImage: string;
  days: DayPlan[];
  expenses: Expense[];
}

// --- 2. Mock Data (Initial State) ---
const INITIAL_TRIPS: Trip[] = [
  {
    id: 't-1',
    name: '東京探索',
    destination: 'Tokyo, Japan',
    startDate: '2025-04-10',
    endDate: '2025-04-15',
    coverImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=1000',
    days: Array(6).fill(null).map((_, i) => ({ id: `d-${i}`, date: `2025-04-${10+i}`, dayLabel: `Day ${i+1}`, items: [] })),
    expenses: []
  },
  {
    id: 't-2',
    name: '冰島極光行',
    destination: 'Reykjavík, Iceland',
    startDate: '2025-11-20',
    endDate: '2025-11-28',
    coverImage: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&q=80&w=1000',
    days: Array(9).fill(null).map((_, i) => ({ id: `d-${i}`, date: `2025-11-${20+i}`, dayLabel: `Day ${i+1}`, items: [] })),
    expenses: []
  }
];

// --- 3. Helper Components ---

// Status Badge with Glow Effect
const StatusBadge = ({ start, end }: { start: string, end: string }) => {
    const status = useMemo(() => {
        const now = new Date();
        const startDate = new Date(start);
        const endDate = new Date(end);
        now.setHours(0,0,0,0);
        
        if (now > endDate) return { label: 'COMPLETED', color: 'text-gray-400 border-gray-600 bg-gray-800/50', glow: '' };
        if (now >= startDate && now <= endDate) return { label: 'ON GOING', color: 'text-cyan-300 border-cyan-500/50 bg-cyan-900/30', glow: 'shadow-[0_0_10px_rgba(34,211,238,0.3)]' };
        
        const diffTime = Math.abs(startDate.getTime() - now.getTime());
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { label: `${daysLeft} DAYS LEFT`, color: 'text-fuchsia-300 border-fuchsia-500/50 bg-fuchsia-900/30', glow: 'shadow-[0_0_10px_rgba(232,121,249,0.3)]' };
    }, [start, end]);

    return (
        <div className={`px-3 py-1 rounded-full border backdrop-blur-sm text-[10px] font-black tracking-widest ${status.color} ${status.glow}`}>
            {status.label}
        </div>
    );
};

// --- 4. Main HomeView Component ---

interface HomeViewProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onAddTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ trips = [], onSelectTrip, onAddTrip, onDeleteTrip }) => {
  const [showSheet, setShowSheet] = useState(false);
  const [isSheetAnimating, setIsSheetAnimating] = useState(false);
  
  // Form State
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImage, setCoverImage] = useState('');

  // UI State
  const [activeTab, setActiveTab] = useState('home');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteTripId, setDeleteTripId] = useState<string | null>(null);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const safeTrips = trips || [];
    const upcoming = safeTrips.filter(t => new Date(t.startDate) > now).length;
    const completed = safeTrips.filter(t => new Date(t.endDate) < now).length;
    return { upcoming, completed, total: safeTrips.length };
  }, [trips]);

  // Handlers
  const handleOpenSheet = () => {
      setShowSheet(true);
      setTimeout(() => setIsSheetAnimating(true), 10);
  };

  const handleCloseSheet = () => {
      setIsSheetAnimating(false);
      setTimeout(() => setShowSheet(false), 300);
  };

  const handleCreate = () => {
    if (!destination || !startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Logic to prevent infinite loop if dates are wrong
    if (end < start) {
        alert("回程日期不能早於出發日期");
        return;
    }

    const daysArr: DayPlan[] = [];
    let current = new Date(start);
    let dayCount = 1;

    while (current <= end) {
        daysArr.push({ 
            id: `d-${Date.now()}-${dayCount}`, 
            date: current.toISOString().split('T')[0], 
            dayLabel: `Day ${dayCount}`, 
            items: [] 
        });
        current.setDate(current.getDate() + 1);
        dayCount++;
    }
    
    const finalImage = coverImage.trim() || `https://source.unsplash.com/800x600/?${encodeURIComponent(destination)},neon,city,night`;

    const newTrip: Trip = {
        id: `t-${Date.now()}`,
        name: `${destination} 之旅`,
        destination, 
        startDate, 
        endDate,
        coverImage: finalImage,
        days: daysArr, 
        expenses: []
    };
    
    onAddTrip(newTrip);
    handleCloseSheet();
    setDestination(''); setStartDate(''); setEndDate(''); setCoverImage('');
  };

  const confirmDelete = () => {
      if (deleteTripId) {
          onDeleteTrip(deleteTripId);
          setDeleteTripId(null);
          setActiveMenuId(null);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F19] text-white font-sans relative overflow-hidden selection:bg-cyan-500 selection:text-black">
       
       {/* Ambient Background Glows */}
       <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
       <div className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[80px] pointer-events-none"></div>

       {/* Header */}
       <div className="px-6 pt-14 pb-6 sticky top-0 z-20 backdrop-blur-xl bg-[#0B0F19]/80 border-b border-white/5">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-cyan-400 text-xs font-black tracking-[0.2em] mb-2 uppercase">My Voyages</h2>
                    <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                        探索未知
                    </h1>
                </div>
            </div>

            {/* Dark Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Upcoming</div>
                     <div className="text-2xl font-mono font-bold text-white flex items-baseline gap-1">
                        {stats.upcoming} <span className="text-xs text-gray-500 font-sans">Trips</span>
                     </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                     <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Memories</div>
                     <div className="text-2xl font-mono font-bold text-white flex items-baseline gap-1">
                        {stats.total} <span className="text-xs text-gray-500 font-sans">Trips</span>
                     </div>
                </div>
            </div>
       </div>

       {/* Scrollable Content */}
       <div className="flex-1 overflow-y-auto px-6 pt-4 pb-32 space-y-8" onClick={() => setActiveMenuId(null)}>
            {trips.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] opacity-50">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-t from-gray-800 to-transparent flex items-center justify-center mb-4 border border-white/5">
                         <i className="fa-solid fa-earth-americas text-4xl text-gray-600"></i>
                    </div>
                    <p className="text-gray-400 font-light tracking-wide text-sm">The world is waiting for you.</p>
                </div>
            ) : (
                trips.map((trip) => {
                    const isMenuOpen = activeMenuId === trip.id;
                    
                    return (
                        <div 
                            key={trip.id} 
                            onClick={() => onSelectTrip(trip.id)}
                            className="group relative w-full aspect-[16/10] rounded-[2rem] overflow-hidden bg-gray-900 border border-white/10 shadow-2xl shadow-black/50 active:scale-[0.98] transition-all duration-300"
                        >
                            {/* Image with zoom effect */}
                            <img 
                                src={trip.coverImage} 
                                alt={trip.destination} 
                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-1000 ease-out"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?auto=format&fit=crop&q=80&w=800'; }}
                            />
                            
                            {/* Cinematic Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/40 to-transparent"></div>
                            
                            {/* Content */}
                            <div className="absolute inset-0 p-6 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <StatusBadge start={trip.startDate} end={trip.endDate} />
                                    
                                    {/* Action Button */}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(isMenuOpen ? null : trip.id);
                                        }}
                                        className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all z-20"
                                    >
                                        <i className="fa-solid fa-ellipsis text-xs"></i>
                                    </button>

                                    {/* Menu Dropdown */}
                                    {isMenuOpen && (
                                        <div className="absolute top-10 right-0 w-36 bg-[#1a202c] border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 z-30 animate-fade-in origin-top-right">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onSelectTrip(trip.id); }}
                                                className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3"
                                            >
                                                <i className="fa-regular fa-eye text-cyan-400"></i> View Details
                                            </button>
                                            <div className="h-px bg-white/5 mx-2"></div>
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setDeleteTripId(trip.id); 
                                                    setActiveMenuId(null);
                                                }} 
                                                className="w-full text-left px-4 py-3 text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-3"
                                            >
                                                <i className="fa-regular fa-trash-can"></i> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-2 opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-100">
                                        <div className="w-6 h-[1px] bg-cyan-500"></div>
                                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">{trip.startDate.replace(/-/g, '.')}</span>
                                    </div>
                                    <h3 className="text-4xl font-black text-white tracking-tight leading-none mb-1 drop-shadow-lg font-display">
                                        {trip.destination}
                                    </h3>
                                    <p className="text-xs text-gray-400 font-medium tracking-wide flex items-center gap-1">
                                       <i className="fa-solid fa-location-dot text-[10px]"></i> {trip.days?.length || 0} Days Trip
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
       </div>

       {/* Floating Navigation Bar (Island Style) */}
       <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 w-[90%] max-w-[400px] h-16 bg-[#161b2c]/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.5)] z-40 flex items-center justify-between px-2 pl-6 pr-6">
            <button 
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-cyan-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <i className="fa-solid fa-compass text-lg"></i>
            </button>
            
            <button className="flex flex-col items-center gap-1 text-gray-600 pointer-events-none">
                <i className="fa-solid fa-map text-lg"></i>
            </button>

            {/* Glowing FAB in Nav */}
            <div className="relative -top-6">
                <button 
                    onClick={handleOpenSheet} 
                    className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:scale-110 active:scale-95 transition-all border-[4px] border-[#0B0F19]"
                >
                    <i className="fa-solid fa-plus text-xl"></i>
                </button>
            </div>

            <button className="flex flex-col items-center gap-1 text-gray-600 pointer-events-none">
                <i className="fa-solid fa-heart text-lg"></i>
            </button>

            <button 
                onClick={() => setActiveTab('profile')}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-cyan-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <i className="fa-solid fa-user-astronaut text-lg"></i>
            </button>
       </div>

       {/* Create Trip Sheet (Bottom Sheet) */}
       {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={handleCloseSheet}></div>
          <div className={`bg-[#161b2c] w-full max-w-[500px] rounded-t-[2.5rem] p-8 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10 transform transition-transform duration-300 ease-out z-50 pb-12 ${isSheetAnimating ? 'translate-y-0' : 'translate-y-full'}`}>
             
             <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-8"></div>

             <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                <span className="text-cyan-400">New</span> Adventure
             </h3>

             <div className="space-y-5">
               <div className="group">
                 <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 group-focus-within:text-cyan-400 transition-colors">Destination</label>
                 <div className="bg-black/30 border border-white/10 rounded-2xl p-4 flex items-center gap-3 focus-within:border-cyan-500/50 focus-within:bg-black/50 transition-all">
                    <i className="fa-solid fa-location-dot text-gray-500 group-focus-within:text-cyan-400"></i>
                    <input type="text" placeholder="Where to?" value={destination} onChange={e => setDestination(e.target.value)} className="w-full bg-transparent outline-none font-bold text-lg text-white placeholder-gray-600" autoFocus />
                 </div>
               </div>
               
               <div className="group">
                 <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 group-focus-within:text-cyan-400 transition-colors">Cover Image (URL)</label>
                 <div className="bg-black/30 border border-white/10 rounded-2xl p-4 flex items-center gap-3 focus-within:border-cyan-500/50 transition-all">
                    <i className="fa-regular fa-image text-gray-500 group-focus-within:text-cyan-400"></i>
                    <input type="text" placeholder="https://..." value={coverImage} onChange={e => setCoverImage(e.target.value)} className="w-full bg-transparent outline-none text-sm font-medium text-gray-300 placeholder-gray-600 font-mono" />
                 </div>
               </div>

               <div className="flex gap-4">
                    <div className="flex-1 group">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 group-focus-within:text-cyan-400 transition-colors">Start</label>
                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4 focus-within:border-cyan-500/50 transition-all">
                             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-transparent outline-none text-sm font-bold text-white font-mono invert-calendar-icon" style={{colorScheme: 'dark'}} />
                        </div>
                    </div>
                    <div className="flex-1 group">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 group-focus-within:text-cyan-400 transition-colors">End</label>
                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4 focus-within:border-cyan-500/50 transition-all">
                             <input type="date" min={startDate} value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-transparent outline-none text-sm font-bold text-white font-mono" style={{colorScheme: 'dark'}} />
                        </div>
                    </div>
               </div>
               
               <div className="pt-6">
                   <button 
                       onClick={handleCreate} 
                       disabled={!destination || !startDate || !endDate} 
                       className="w-full py-4 rounded-2xl font-black text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                    >
                       LAUNCH TRIP
                   </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTripId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-fade-in">
             <div className="bg-[#1a202c] border border-white/10 rounded-[2rem] p-8 shadow-2xl max-w-xs w-full text-center animate-scale-up relative overflow-hidden">
                {/* Background glow for modal */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500"></div>

                <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3 className="text-xl font-black text-white mb-3">Delete Trip?</h3>
                <p className="text-sm text-gray-400 font-medium mb-8 leading-relaxed">This action cannot be undone. All memories and expenses will be lost in the void.</p>
                <div className="flex flex-col gap-3">
                   <button 
                       onClick={confirmDelete} 
                       className="w-full py-3 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold text-white shadow-lg shadow-rose-900/50 transition-colors"
                    >
                       Confirm Deletion
                   </button>
                   <button 
                       onClick={() => setDeleteTripId(null)} 
                       className="w-full py-3 bg-transparent hover:bg-white/5 rounded-xl font-bold text-gray-400 transition-colors"
                    >
                       Cancel
                   </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

// --- 5. Main App Component (Wrapper) ---
const App = () => {
    const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS);
    const [currentView, setCurrentView] = useState('home');
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

    const handleAddTrip = (newTrip: Trip) => {
        setTrips(prev => [newTrip, ...prev]);
    };

    const handleDeleteTrip = (tripId: string) => {
        setTrips(prev => prev.filter(t => t.id !== tripId));
    };

    const handleSelectTrip = (tripId: string) => {
        console.log("Selected Trip:", tripId);
        setSelectedTripId(tripId);
        // For demo purposes, we stay on HomeView but log the selection
        // In a real app, you would switch to a DetailView here
        alert(`進入行程詳情: ${trips.find(t => t.id === tripId)?.name}`);
    };

    return (
        <HomeView 
            trips={trips}
            onAddTrip={handleAddTrip}
            onDeleteTrip={handleDeleteTrip}
            onSelectTrip={handleSelectTrip}
        />
    );
};

export default App;