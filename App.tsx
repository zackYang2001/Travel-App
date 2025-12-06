
import React, { useState, useEffect } from 'react';
import { AppTab, Trip, DayItinerary, Expense, User } from './types';
import { PRESET_AVATARS } from './constants';
import ItineraryView from './components/ItineraryView';
import ExpenseView from './components/ExpenseView';
import MapView from './components/MapView';
import HomeView from './components/HomeView';
import { db, getDeviceId, ensureUserExists } from './services/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const App: React.FC = () => {
  // Global App State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Tab State for Detail View
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.ITINERARY);

  // Modals
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showConfigAlert, setShowConfigAlert] = useState(false);

  // Forms
  const [editTripName, setEditTripName] = useState('');
  const [editTripImage, setEditTripImage] = useState('');
  const [editTripStart, setEditTripStart] = useState('');
  const [editTripEnd, setEditTripEnd] = useState('');
  const [editUserName, setEditUserName] = useState('');

  // Derived State
  const activeTrip = trips.find(t => t.id === activeTripId);

  // 1. Initialize User and Check Firebase
  useEffect(() => {
    if (!db) {
        setShowConfigAlert(true);
        return;
    }

    const deviceId = getDeviceId();
    ensureUserExists(deviceId).then(() => {
        // We rely on the snapshot listener below to set the user state
    });
  }, []);

  // 2. Real-time Listeners
  useEffect(() => {
    if (!db) return;

    // Listen to Trips
    const unsubTrips = onSnapshot(collection(db, 'trips'), (snapshot) => {
        const fetchedTrips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
        setTrips(fetchedTrips);
    });

    // Listen to Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(fetchedUsers);
        
        const myId = getDeviceId();
        const me = fetchedUsers.find(u => u.id === myId);
        if (me) {
            setCurrentUser(me);
            setEditUserName(me.name);
        }
    });

    return () => {
        unsubTrips();
        unsubUsers();
    };
  }, []);

  // Handlers (Write to Firestore)
  const handleAddTrip = async (newTrip: Trip) => {
    if (!db) return;
    try {
        // Remove ID, let Firestore generate it or use it as doc ID
        const { id, ...tripData } = newTrip;
        const docRef = await addDoc(collection(db, 'trips'), tripData);
        // After adding, we want to enter it. 
        // We'll wait for the snapshot update to set activeTripId, 
        // but for better UX we can just set it immediately if we knew the ID.
        // Since we are waiting for sync, let's just use the ID returned.
        setActiveTripId(docRef.id);
        setActiveTab(AppTab.ITINERARY);
    } catch (e) {
        console.error("Error adding trip: ", e);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, 'trips', tripId));
        if (activeTripId === tripId) setActiveTripId(null);
    } catch (e) {
        console.error("Error deleting trip: ", e);
    }
  };

  // Sync Wrappers for Child Components
  const setDays = (action: React.SetStateAction<DayItinerary[]>) => {
    if (!activeTripId || !activeTrip || !db) return;

    const newDays = typeof action === 'function' 
        ? (action as (prev: DayItinerary[]) => DayItinerary[])(activeTrip.days)
        : action;
    
    // Update Firestore
    updateDoc(doc(db, 'trips', activeTripId), { days: newDays });
  };

  const setExpenses = (action: React.SetStateAction<Expense[]>) => {
    if (!activeTripId || !activeTrip || !db) return;

    const newExpenses = typeof action === 'function'
        ? (action as (prev: Expense[]) => Expense[])(activeTrip.expenses)
        : action;

    // Update Firestore
    updateDoc(doc(db, 'trips', activeTripId), { expenses: newExpenses });
  };

  const openEditModal = () => {
    if (activeTrip) {
        setEditTripName(activeTrip.name);
        setEditTripImage(activeTrip.coverImage || '');
        setEditTripStart(activeTrip.startDate);
        setEditTripEnd(activeTrip.endDate);
        setShowEditTripModal(true);
    }
  };

  const openProfileModal = () => {
    if (currentUser) {
        setEditUserName(currentUser.name);
        setShowProfileModal(true);
    }
  };

  const handleUpdateProfile = async (newAvatar?: string) => {
    if (!currentUser || !db) return;
    const updatedName = editUserName.trim() || currentUser.name;
    const updatedAvatar = newAvatar || currentUser.avatar;
    
    // Update Firestore
    await updateDoc(doc(db, 'users', currentUser.id), {
        name: updatedName,
        avatar: updatedAvatar
    });

    if (newAvatar) setShowProfileModal(false);
  };

  const handleEditTripSubmit = async () => {
    if (!activeTripId || !editTripName || !editTripStart || !editTripEnd || !activeTrip || !db) return;

    // Recalculate days logic
    let newDays = [...activeTrip.days];
    const start = new Date(editTripStart);
    const end = new Date(editTripEnd);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const oldStart = new Date(activeTrip.startDate);
    if (oldStart.getTime() !== start.getTime()) {
            newDays = newDays.map((day, idx) => {
                const dayDate = new Date(start);
                dayDate.setDate(dayDate.getDate() + idx);
                return { ...day, date: dayDate.toISOString().split('T')[0] };
            });
    }

    if (newDays.length < diffDays) {
        let current = new Date(start);
        current.setDate(current.getDate() + newDays.length);
        for (let i = newDays.length; i < diffDays; i++) {
                const dateStr = current.toISOString().split('T')[0];
                newDays.push({
                id: `d-${Date.now()}-${i}`,
                date: dateStr,
                dayLabel: `第 ${i + 1} 天`,
                items: []
            });
            current.setDate(current.getDate() + 1);
        }
    } else if (newDays.length > diffDays) {
            newDays = newDays.slice(0, diffDays);
    }

    await updateDoc(doc(db, 'trips', activeTripId), {
        name: editTripName,
        coverImage: editTripImage || activeTrip.coverImage,
        startDate: editTripStart,
        endDate: editTripEnd,
        days: newDays
    });

    setShowEditTripModal(false);
  };

  const renderContent = () => {
    if (!activeTrip) return null;

    switch (activeTab) {
      case AppTab.ITINERARY:
        return <ItineraryView days={activeTrip.days} setDays={setDays} />;
      case AppTab.EXPENSES:
        return <ExpenseView expenses={activeTrip.expenses} setExpenses={setExpenses} users={users} />;
      case AppTab.MAP:
        return <MapView days={activeTrip.days} />;
      default:
        return <ItineraryView days={activeTrip.days} setDays={setDays} />;
    }
  };

  if (showConfigAlert) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100 p-8 text-center font-sans">
              <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md">
                  <i className="fa-solid fa-cloud-arrow-up text-6xl text-blue-500 mb-6"></i>
                  <h1 className="text-2xl font-black mb-4">需要 Firebase 設定</h1>
                  <p className="text-gray-500 mb-6">為了實現多人即時同步，請開啟 <code>services/firebase.ts</code> 並填入您的 Firebase Config 金鑰。</p>
                  <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="block w-full py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors">前往 Firebase Console</a>
              </div>
          </div>
      );
  }

  if (!currentUser) {
      return <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] text-gray-400 font-bold animate-pulse">連線中...</div>;
  }

  return (
    <div className="flex justify-center min-h-screen bg-[#F2F2F7]">
      {/* Mobile container constraint */}
      <div className="w-full max-w-[480px] bg-[#F2F2F7] h-screen flex flex-col relative shadow-2xl overflow-hidden font-sans border-x border-white/50">
        
        {/* VIEW: HOME (Trip List) */}
        {!activeTripId && (
            <HomeView 
                trips={trips} 
                onSelectTrip={setActiveTripId} 
                onAddTrip={handleAddTrip}
                onDeleteTrip={handleDeleteTrip}
            />
        )}

        {/* VIEW: DETAIL (Itinerary/Map/Expense) */}
        {activeTripId && activeTrip && (
            <>
                {/* Light Glass Header */}
                <header className="absolute top-0 left-0 right-0 z-30 px-6 pt-12 pb-4 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-gray-200/50 transition-all">
                    <div className="flex items-center gap-4 overflow-hidden flex-1">
                        <button 
                            onClick={() => setActiveTripId(null)} 
                            className="w-10 h-10 rounded-full bg-transparent hover:bg-gray-100 flex items-center justify-center text-blue-500 active:scale-95 transition-all shrink-0"
                        >
                            <i className="fa-solid fa-chevron-left text-xl"></i>
                        </button>
                        <div className="min-w-0 flex-1 cursor-pointer group" onClick={openEditModal}>
                            <h1 className="text-xl font-bold text-black tracking-tight truncate flex items-center gap-2">
                                {activeTrip.name}
                            </h1>
                            <p className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase truncate">
                                {activeTrip.startDate} ~ {activeTrip.endDate} <i className="fa-solid fa-pen ml-1 opacity-50"></i>
                            </p>
                        </div>
                    </div>
                    {/* User Profile Trigger */}
                    <button onClick={openProfileModal} className="w-9 h-9 rounded-full bg-gray-200 border border-gray-300 shadow-sm overflow-hidden shrink-0 ml-2 hover:opacity-80 transition-opacity">
                        <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                    </button>
                </header>

                {/* Main Content Area - Removed bottom padding to allow content to go behind nav */}
                <main className="flex-1 overflow-hidden relative pt-[100px]">
                    {renderContent()}
                </main>

                {/* Floating Light Glass Capsule Navigation */}
                <nav className="absolute bottom-8 left-8 right-8 h-16 bg-white/80 backdrop-blur-xl rounded-[2rem] flex justify-between items-center px-4 z-40 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/50">
                    <button 
                        onClick={() => setActiveTab(AppTab.ITINERARY)}
                        className={`flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all duration-300 relative ${activeTab === AppTab.ITINERARY ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <i className={`text-lg fa-solid ${activeTab === AppTab.ITINERARY ? 'fa-calendar-day' : 'fa-calendar'}`}></i>
                        <span className="text-[10px] font-bold">行程</span>
                    </button>
                    
                    <button 
                        onClick={() => setActiveTab(AppTab.MAP)}
                        className={`flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all duration-300 relative ${activeTab === AppTab.MAP ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <i className="text-lg fa-solid fa-map-location-dot"></i>
                        <span className="text-[10px] font-bold">地圖</span>
                    </button>

                    <button 
                        onClick={() => setActiveTab(AppTab.EXPENSES)}
                        className={`flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all duration-300 relative ${activeTab === AppTab.EXPENSES ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <i className="text-lg fa-solid fa-wallet"></i>
                        <span className="text-[10px] font-bold">分帳</span>
                    </button>
                </nav>
            </>
        )}

        {/* Edit Trip Modal (Light) */}
        {showEditTripModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-up">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-black">編輯旅遊資訊</h3>
                        <button onClick={() => setShowEditTripModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 pl-1">旅遊名稱</label>
                            <input 
                                type="text" 
                                value={editTripName} 
                                onChange={e => setEditTripName(e.target.value)} 
                                className="w-full p-4 bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-2xl outline-none font-bold text-black transition-all"
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 pl-1">封面圖片 (URL)</label>
                            <input 
                                type="text" 
                                value={editTripImage} 
                                onChange={e => setEditTripImage(e.target.value)} 
                                placeholder="https://..."
                                className="w-full p-4 bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-2xl outline-none text-sm text-black transition-all font-mono"
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-400 mb-1 pl-1">旅遊日期</label>
                             <div className="flex items-center bg-gray-50 rounded-2xl p-1">
                                <input 
                                    type="date" 
                                    value={editTripStart} 
                                    onChange={e => setEditTripStart(e.target.value)} 
                                    className="flex-1 bg-transparent p-3 outline-none text-sm font-mono text-center font-bold text-black" 
                                />
                                <span className="text-gray-400 mx-1"><i className="fa-solid fa-arrow-right-long"></i></span>
                                <input 
                                    type="date" 
                                    min={editTripStart}
                                    value={editTripEnd} 
                                    onChange={e => setEditTripEnd(e.target.value)} 
                                    className="flex-1 bg-transparent p-3 outline-none text-sm font-mono text-center font-bold text-black" 
                                />
                             </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleEditTripSubmit}
                        className="w-full mt-8 py-4 rounded-2xl font-bold text-white bg-black hover:bg-gray-800 shadow-xl active:scale-95 transition-all"
                    >
                        儲存變更
                    </button>
                </div>
            </div>
        )}

        {/* Profile Modal */}
        {showProfileModal && currentUser && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white/90 backdrop-blur-xl w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-scale-up relative border border-white/50">
                    <button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 w-8 h-8 bg-gray-100/80 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200"><i className="fa-solid fa-xmark"></i></button>
                    
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-24 h-24 rounded-full p-1 border-2 border-dashed border-blue-300 mb-4 relative">
                            <img src={currentUser.avatar} alt="Current" className="w-full h-full rounded-full object-cover bg-gray-100" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white">
                                <i className="fa-solid fa-camera text-xs"></i>
                            </div>
                        </div>
                        <input 
                            type="text" 
                            value={editUserName} 
                            onChange={e => setEditUserName(e.target.value)}
                            onBlur={() => handleUpdateProfile()}
                            className="text-center text-2xl font-black bg-transparent border-b-2 border-transparent focus:border-blue-500 outline-none w-full pb-1"
                            placeholder="輸入暱稱"
                        />
                    </div>

                    <div className="space-y-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">選擇頭像</p>
                        <div className="grid grid-cols-4 gap-4 p-2">
                            {PRESET_AVATARS.map((avatar, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => handleUpdateProfile(avatar)}
                                    className={`aspect-square rounded-full overflow-hidden border-2 transition-all hover:scale-110 active:scale-95 ${currentUser.avatar === avatar ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-200'}`}
                                >
                                    <img src={avatar} alt={`Avatar ${idx}`} className="w-full h-full object-cover bg-gray-50" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default App;
