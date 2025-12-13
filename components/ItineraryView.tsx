import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DayItinerary, ItineraryItem } from '../types';
import { generateItinerarySuggestions, suggestIconForCategory, getPlaceCoordinates } from '../services/geminiService';
import { fetchWeatherForLocation } from '../services/weatherService';
import { DEFAULT_TYPES } from '../constants';

interface ItineraryViewProps {
  days: DayItinerary[];
  setDays: React.Dispatch<React.SetStateAction<DayItinerary[]>>;
  destination?: string;
}

const ItineraryView: React.FC<ItineraryViewProps> = ({ days, setDays, destination }) => {
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Scroll State
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Day Selector Wheel State
  const dayListRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Modals
  const [showAiModal, setShowAiModal] = useState(false);
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Deletion State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'item' | 'category', id: string, name?: string } | null>(null);

  // Edit Mode
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Forms
  const [aiPrompt, setAiPrompt] = useState('');
  
  // Flight Form
  const [flightNo, setFlightNo] = useState('');
  const [flightDepTime, setFlightDepTime] = useState(''); // New: Departure Time
  const [flightArrTime, setFlightArrTime] = useState(''); // New: Arrival Time
  const [flightOrigin, setFlightOrigin] = useState('');
  const [flightDestination, setFlightDestination] = useState('');
  const [flightOriginTerminal, setFlightOriginTerminal] = useState(''); // New
  const [flightDestTerminal, setFlightDestTerminal] = useState(''); // New
  const [flightType, setFlightType] = useState<'arrival' | 'departure'>('arrival');

  const [manualName, setManualName] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualType, setManualType] = useState<string>('sightseeing');
  const [manualRating, setManualRating] = useState('4.5');
  const [manualOpenTime, setManualOpenTime] = useState('');
  const [manualImage, setManualImage] = useState('');
  // Manual Location Coords
  const [manualLat, setManualLat] = useState<number | string>('');
  const [manualLng, setManualLng] = useState<number | string>('');
  const [isLocating, setIsLocating] = useState(false);

  const [availableTypes, setAvailableTypes] = useState(DEFAULT_TYPES);
  const [isManagingTypes, setIsManagingTypes] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);

  // Drag and Drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
        const currentScrollTop = scrollContainerRef.current.scrollTop;
        setScrollTop(currentScrollTop);

        // Hysteresis logic for header
        if (!isScrolled && currentScrollTop > 40) {
            setIsScrolled(true);
        } else if (isScrolled && currentScrollTop < 10) {
            setIsScrolled(false);
        }
    }
  };

  const handleDayListScroll = () => {
      if (dayListRef.current) {
          const pos = dayListRef.current.scrollLeft;
          setScrollPosition(pos);
          
          // Calculate center index for snap feedback
          const itemWidth = isScrolled ? 64 : 80; // (w-14 + gap-2) : (w-16 + gap-4)
          const centerIndex = Math.round(pos / itemWidth);
          setActiveDayIndex(centerIndex);
      }
  };

  // Sync active day selection when scrolling stops (snap)
  useEffect(() => {
    if (days[activeDayIndex] && !dayListRef.current?.matches(':hover')) {
        // Optional: Sync selectedDayId with scroll position if desired
        // setSelectedDayId(days[activeDayIndex].id);
    }
  }, [activeDayIndex, days, isScrolled]);


  useEffect(() => {
    if (days.length > 0 && (!selectedDayId || !days.find(d => d.id === selectedDayId))) {
        setSelectedDayId(days[0].id);
    }
  }, [days, selectedDayId]);

  // Auto-scroll Day Selector when selectedDayId changes
  useEffect(() => {
    if (dayListRef.current && selectedDayId) {
        const index = days.findIndex(d => d.id === selectedDayId);
        if (index !== -1) {
            // Need to calculate position manually because buttons might scale
            const gap = isScrolled ? 8 : 16;
            const btnWidth = isScrolled ? 56 : 64; // w-14 vs w-16
            const totalItemWidth = btnWidth + gap;
            
            // Container center logic is handled by padding, so we just scroll to index * totalWidth
            const targetScroll = index * totalItemWidth;

            dayListRef.current.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });
        }
    }
  }, [selectedDayId, days, isScrolled]); 

  const currentDay = days.find(d => d.id === selectedDayId) || days[0];

  // Async Weather Fetching
  useEffect(() => {
    const fetchWeather = async () => {
        if (currentDay && !currentDay.weather && destination) {
            const weather = await fetchWeatherForLocation(destination, currentDay.date);
            if (weather) {
                setDays(prev => prev.map(d => d.id === currentDay.id ? { ...d, weather } : d));
            }
        }
    };
    fetchWeather();
  }, [currentDay?.id, currentDay?.date, destination, setDays]); // Removed currentDay.weather from dependency to avoid loop if it stays undefined, logic inside handles checks

  const resetForms = () => {
    setEditingItemId(null);
    setFlightNo(''); 
    setFlightDepTime(''); setFlightArrTime('');
    setFlightOrigin(''); setFlightDestination('');
    setFlightOriginTerminal(''); setFlightDestTerminal('');
    setManualName(''); setManualTime(''); setManualDesc('');
    setManualOpenTime(''); setManualImage('');
    setManualRating('4.5');
    setManualType('sightseeing');
    setManualLat(''); setManualLng('');
    setIsManagingTypes(false);
  };

  const openEditModal = (item: ItineraryItem) => {
    setEditingItemId(item.id);
    if (item.type === 'flight') {
        setFlightNo(item.flightNumber || '');
        // Populate times: use explicit fields if available, otherwise guess from main time
        setFlightDepTime(item.departureTime || (!item.isArrival ? item.time : ''));
        setFlightArrTime(item.arrivalTime || (item.isArrival ? item.time : ''));
        
        setFlightOrigin(item.origin || '');
        setFlightDestination(item.destination || '');
        setFlightOriginTerminal(item.originTerminal || '');
        setFlightDestTerminal(item.destinationTerminal || '');
        setFlightType(item.isArrival ? 'arrival' : 'departure');
        setShowFlightModal(true);
    } else {
        setManualName(item.location);
        setManualTime(item.time);
        setManualDesc(item.description);
        setManualType(item.type);
        setManualRating(item.rating?.toString() || '');
        setManualOpenTime(item.openTime || '');
        setManualImage(item.imageUrl || '');
        setManualLat(item.lat || '');
        setManualLng(item.lng || '');
        setShowManualModal(true);
    }
    setIsFabOpen(false);
  };

  const handleAddType = async () => {
    if (newTypeName.trim()) {
      setIsGeneratingIcon(true);
      try {
          const newVal = `custom-${Date.now()}`;
          const generatedIcon = await suggestIconForCategory(newTypeName.trim());
          const colors = ['text-pink-500', 'text-purple-500', 'text-indigo-500', 'text-cyan-500', 'text-rose-500', 'text-lime-600'];
          setAvailableTypes([...availableTypes, { value: newVal, label: newTypeName.trim(), icon: generatedIcon, color: colors[0] }]);
          setNewTypeName('');
      } finally {
          setIsGeneratingIcon(false);
      }
    }
  };

  const handleDeleteTypeClick = (value: string) => {
      setDeleteConfirmation({ type: 'category', id: value, name: availableTypes.find(t => t.value === value)?.label });
  };

  const confirmDeleteType = () => {
      if (deleteConfirmation?.type === 'category') {
          setAvailableTypes(availableTypes.filter(t => t.value !== deleteConfirmation.id));
          if (manualType === deleteConfirmation.id) setManualType('sightseeing');
          setDeleteConfirmation(null);
      }
  };

  const handleSaveFlight = () => {
    // Check if at least one time is entered
    if (!flightNo || (!flightDepTime && !flightArrTime)) return;
    
    // Determine which time is the "main" time for sorting timeline
    const primaryTime = flightType === 'arrival' ? (flightArrTime || flightDepTime) : (flightDepTime || flightArrTime);

    setDays(prev => prev.map(day => {
        if (day.id === selectedDayId) {
            const newItemData: ItineraryItem = {
                id: editingItemId || `fl-${Date.now()}`,
                time: primaryTime, // For sorting
                location: flightType === 'arrival' ? `抵達 ${flightDestination || '目的地'}` : `離開 ${flightOrigin || '出發地'}`,
                description: `航班 ${flightNo}`,
                type: 'flight',
                flightNumber: flightNo,
                isArrival: flightType === 'arrival',
                origin: flightOrigin,
                destination: flightDestination,
                originTerminal: flightOriginTerminal,
                destinationTerminal: flightDestTerminal,
                departureTime: flightDepTime,
                arrivalTime: flightArrTime,
                lat: editingItemId ? day.items.find(i => i.id === editingItemId)?.lat : undefined,
                lng: editingItemId ? day.items.find(i => i.id === editingItemId)?.lng : undefined,
            };
            const newItems = editingItemId ? day.items.map(i => i.id === editingItemId ? newItemData : i) : [...day.items, newItemData];
            return { ...day, items: newItems.sort((a, b) => a.time.localeCompare(b.time)) };
        }
        return day;
    }));
    setShowFlightModal(false);
    resetForms();
  };

  const handleAutoLocate = async () => {
      if (!manualName.trim()) {
          alert("請先輸入地點名稱");
          return;
      }
      setIsLocating(true);
      try {
          // Pass the trip destination as context (e.g., "Shanghai")
          const coords = await getPlaceCoordinates(manualName, destination);
          if (coords) {
              setManualLat(coords.lat);
              setManualLng(coords.lng);
          } else {
              alert("找不到此地點，請嘗試輸入更完整的名稱（例如包含城市）");
          }
      } catch(e) {
          alert("定位失敗，請稍後再試");
      } finally {
          setIsLocating(false);
      }
  };

  const handleSaveManual = () => {
    if (!manualName || !manualTime) return;
    
    const lat = manualLat ? parseFloat(manualLat.toString()) : undefined;
    const lng = manualLng ? parseFloat(manualLng.toString()) : undefined;

    setDays(prev => prev.map(day => {
        if (day.id === selectedDayId) {
            const newItemData: ItineraryItem = {
                id: editingItemId || `m-${Date.now()}`,
                time: manualTime,
                location: manualName,
                description: manualDesc || '自訂行程',
                type: manualType,
                rating: parseFloat(manualRating),
                openTime: manualOpenTime || undefined,
                imageUrl: manualImage || undefined,
                price: '$$',
                lat: lat !== undefined ? lat : (editingItemId ? day.items.find(i => i.id === editingItemId)?.lat : 0), 
                lng: lng !== undefined ? lng : (editingItemId ? day.items.find(i => i.id === editingItemId)?.lng : 0),
            };
            const newItems = editingItemId ? day.items.map(i => i.id === editingItemId ? newItemData : i) : [...day.items, newItemData];
            return { ...day, items: newItems.sort((a, b) => a.time.localeCompare(b.time)) };
        }
        return day;
    }));
    setShowManualModal(false);
    resetForms();
  };

  const handleDeleteItemClick = (itemId: string) => {
      setDeleteConfirmation({ type: 'item', id: itemId });
  };

  const confirmDeleteItem = () => {
      if (deleteConfirmation?.type === 'item') {
        setDays(prev => prev.map(day => {
            if (day.id === selectedDayId) {
                return { ...day, items: day.items.filter(i => i.id !== deleteConfirmation.id) };
            }
            return day;
        }));
        setDeleteConfirmation(null);
      }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
  };
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newItems = [...currentDay.items];
    const draggedItemContent = newItems[dragItem.current];
    newItems.splice(dragItem.current, 1);
    newItems.splice(dragOverItem.current, 0, draggedItemContent);
    setDays(prev => prev.map(day => {
      if (day.id === selectedDayId) return { ...day, items: newItems };
      return day;
    }));
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const suggestions = await generateItinerarySuggestions(aiPrompt);
      if (suggestions.length > 0) {
        setDays(prev => prev.map(day => {
          if (day.id === selectedDayId) {
            return { ...day, items: [...day.items, ...suggestions].sort((a, b) => a.time.localeCompare(b.time)) };
          }
          return day;
        }));
        setShowAiModal(false);
        setAiPrompt('');
      }
    } catch (e) {
      alert("生成失敗，請稍後再試。");
    } finally {
      setIsGenerating(false);
    }
  };

  const getTypeIcon = (typeVal: string) => {
    const typeDef = availableTypes.find(t => t.value === typeVal);
    if (typeDef) {
        const iconName = typeDef.icon?.startsWith('fa-') ? typeDef.icon : `fa-${typeDef.icon || 'tag'}`;
        return `${iconName} ${typeDef.color || 'text-gray-500'}`;
    }
    return 'fa-tag text-gray-500';
  };

  const getWeatherLabel = (cond: string) => {
    switch(cond) {
        case 'sunny': return '晴時多雲';
        case 'cloudy': return '陰天';
        case 'rain': return '有雨';
        case 'storm': return '雷陣雨';
        default: return '晴朗';
    }
  };

  const getWeatherTheme = (cond: string) => {
    switch(cond) {
        case 'sunny': return {
            bg: 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-200/50 dark:from-orange-900/50 dark:to-amber-900/50 dark:border-orange-800/50',
            text: 'text-orange-900 dark:text-orange-100',
            iconColor: 'text-orange-500',
            labelBg: 'bg-white/40 dark:bg-black/20',
        };
        case 'cloudy': return {
            bg: 'bg-gradient-to-r from-blue-100 to-sky-100 border-blue-200/50 dark:from-blue-900/50 dark:to-sky-900/50 dark:border-blue-800/50',
            text: 'text-blue-900 dark:text-blue-100',
            iconColor: 'text-blue-500',
            labelBg: 'bg-white/40 dark:bg-black/20',
        };
        case 'rain': return {
            bg: 'bg-gradient-to-r from-gray-200 to-slate-200 border-gray-300/50 dark:from-gray-800 dark:to-slate-800 dark:border-gray-700/50',
            text: 'text-gray-800 dark:text-gray-200',
            iconColor: 'text-slate-500 dark:text-slate-400',
            labelBg: 'bg-white/40 dark:bg-black/20',
        };
        case 'storm': return {
            bg: 'bg-gradient-to-r from-slate-300 to-gray-400 border-slate-400/50 dark:from-slate-700 dark:to-gray-800 dark:border-slate-600/50',
            text: 'text-gray-900 dark:text-gray-100',
            iconColor: 'text-gray-700 dark:text-gray-300',
            labelBg: 'bg-white/40 dark:bg-black/20',
        };
        default: return {
            bg: 'bg-white dark:bg-slate-800',
            text: 'text-gray-900 dark:text-gray-100',
            iconColor: 'text-gray-500',
            labelBg: 'bg-gray-100 dark:bg-slate-700',
        };
    }
  };

  // Day Wheel Effect Style
  const getDayWheelStyle = (index: number) => {
      if (!dayListRef.current) return {};
      
      const gap = isScrolled ? 8 : 16;
      const btnWidth = isScrolled ? 56 : 64; 
      const itemWidth = btnWidth + gap;

      const containerCenter = dayListRef.current.clientWidth / 2;
      
      // Calculate half-width for centering reference
      const halfItem = btnWidth / 2; 
      const paddingLeft = (dayListRef.current.clientWidth / 2) - halfItem;
      
      const itemCenter = paddingLeft + (index * itemWidth) + halfItem - scrollPosition;
      const distanceFromCenter = Math.abs(containerCenter - itemCenter);
      
      const maxDistance = 200; 
      const scaleBase = isScrolled ? 0.85 : 0.8; 
      const scaleMax = isScrolled ? 1.0 : 1.1;
      
      let scale = scaleMax - (distanceFromCenter / maxDistance) * 0.3;
      scale = Math.max(scale, scaleBase); 
      
      let opacity = 1 - (distanceFromCenter / maxDistance) * 0.6;
      opacity = Math.max(opacity, 0.5);

      let zIndex = 50 - Math.floor(distanceFromCenter / 10);

      return {
          transform: `scale(${scale})`,
          opacity: opacity,
          zIndex: zIndex,
      };
  };

  // Itinerary Card Gallery Effect
  const getCardStyle = (itemId: string) => {
      if (!scrollContainerRef.current) return {};
      const el = itemsRef.current.get(itemId);
      if (!el) return {};

      const containerHeight = scrollContainerRef.current.clientHeight;
      // Focus Point: 40% of screen height
      const focusPoint = scrollTop + (containerHeight * 0.4);
      
      const elCenter = el.offsetTop + (el.offsetHeight / 2);
      const dist = Math.abs(focusPoint - elCenter);
      
      const maxDist = containerHeight / 1.5;
      
      // Sweet spot for clarity
      const sweetSpot = 160;
      const effectiveDist = Math.max(0, dist - sweetSpot);

      let scale = 1.0 - (effectiveDist / maxDist) * 0.15;
      scale = Math.max(0.9, Math.min(1.0, scale));

      let opacity = 1.0 - (effectiveDist / maxDist) * 0.7;
      opacity = Math.max(0.4, Math.min(1.0, opacity));

      let blur = (effectiveDist / maxDist) * 3;
      blur = Math.min(3, blur);

      return {
          transform: `scale(${scale})`,
          opacity: opacity,
          filter: `blur(${blur}px)`,
          transition: 'transform 0.15s ease-out, opacity 0.15s ease-out, filter 0.15s ease-out',
          zIndex: dist < 200 ? 10 : 1
      };
  };

  if (!currentDay) {
    return <div className="flex items-center justify-center h-full text-gray-400">沒有行程天數</div>;
  }

  const fabActions = [
    { icon: 'fa-wand-magic-sparkles', label: 'AI 推薦', action: () => { resetForms(); setShowAiModal(true); } },
    { icon: 'fa-pen', label: '手動輸入', action: () => { resetForms(); setShowManualModal(true); } },
    { icon: 'fa-plane', label: '航班資訊', action: () => { resetForms(); setShowFlightModal(true); } }
  ];

  const weatherTheme = currentDay.weather ? getWeatherTheme(currentDay.weather.condition) : getWeatherTheme('sunny');

  return (
    <div className="flex flex-col h-full relative font-sans" ref={scrollContainerRef} onScroll={handleScroll} style={{overflowY: 'auto'}}>
      
      {/* Day Selector */}
      <div className={`sticky top-0 z-20 transition-all duration-500 ease-out ${isScrolled ? 'bg-[#F2F2F7]/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5' : 'bg-transparent'}`}>
        <div 
          ref={dayListRef}
          onScroll={handleDayListScroll}
          onTouchStart={(e) => e.stopPropagation()} 
          onTouchEnd={(e) => e.stopPropagation()}
          className={`flex overflow-x-auto snap-x snap-mandatory items-center no-scrollbar py-2`} 
          style={{ 
              height: isScrolled ? '72px' : '84px',
              paddingLeft: isScrolled ? 'calc(50% - 28px)' : 'calc(50% - 32px)', 
              paddingRight: isScrolled ? 'calc(50% - 28px)' : 'calc(50% - 32px)',
              gap: isScrolled ? '8px' : '16px', 
              scrollSnapStop: 'always'
          }}
        >
          {days.map((day, index) => {
            const style = getDayWheelStyle(index);
            return (
                <button
                key={day.id}
                onClick={() => setSelectedDayId(day.id)}
                style={style}
                className={`flex-shrink-0 snap-center flex flex-col items-center justify-center transition-all duration-300 rounded-2xl border
                    ${isScrolled ? 'w-14 h-14' : 'w-16 h-16'} 
                    ${selectedDayId === day.id 
                        ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-900/50' 
                        : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-400 dark:text-gray-500 shadow-sm'
                    }
                `}
                >
                <span className={`font-medium leading-none ${isScrolled ? 'text-[9px] mb-0' : 'text-[10px] opacity-80 mb-1'}`}>
                    {day.date.slice(5).replace('-', '/')}
                </span>
                {!isScrolled && <span className="font-bold text-xl leading-none">{day.dayLabel.replace('第 ','').replace(' 天','')}</span>}
                </button>
            );
          })}

          {/* Add Day Button */}
          <button 
            onClick={() => {
              const newDayId = `d-${Date.now()}`;
              let nextDate = new Date().toISOString().split('T')[0];
              if (days.length > 0) {
                const lastDayDate = days[days.length - 1].date;
                const dateObj = new Date(lastDayDate);
                dateObj.setDate(dateObj.getDate() + 1);
                nextDate = dateObj.toISOString().split('T')[0];
              }
              const newDays = [...days, { id: newDayId, date: nextDate, dayLabel: `第 ${days.length + 1} 天`, items: [] }];
              setDays(newDays);
              setTimeout(() => setSelectedDayId(newDayId), 100);
            }}
            className={`flex-shrink-0 snap-center flex items-center justify-center border border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:border-blue-300 hover:text-blue-500 transition-all bg-white/40 dark:bg-slate-800/40 rounded-2xl
                 ${isScrolled ? 'w-14 h-14 scale-90 opacity-60' : 'w-16 h-16 opacity-60'}
            `}
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>

      <div className="flex-1 p-5 pt-2 pb-[40vh]"> 
        
        {/* Header & Weather */}
        <div className="flex flex-col gap-6 mb-8">
            <div className="flex justify-between items-end px-1">
                 <div>
                    <h2 className="text-4xl font-black text-black dark:text-white tracking-tighter">{currentDay.dayLabel}</h2>
                    <p className="text-gray-400 dark:text-gray-500 font-bold mt-1 text-sm flex items-center gap-2">
                        {currentDay.date.replace(/-/g, '.')}
                    </p>
                 </div>
            </div>

             {/* Redesigned Weather Widget */}
             {currentDay.weather && (
                <div className={`rounded-[2rem] p-5 shadow-sm border flex items-center justify-between relative overflow-hidden transition-colors duration-500 ${weatherTheme.bg} ${weatherTheme.text}`}>
                     {/* Decorative Glare */}
                     <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20 blur-3xl"></div>

                     <div className="flex items-center gap-4 relative z-10">
                        {/* Modified Icon Container: Removed background, increased text size */}
                        <div className={`w-14 h-14 flex items-center justify-center text-4xl ${weatherTheme.iconColor}`}>
                            <i className={`fa-solid ${currentDay.weather.icon}`}></i>
                        </div>
                        <div>
                            <div className="text-3xl font-black leading-none tracking-tight">{currentDay.weather.temp}°</div>
                            <div className="text-xs font-bold opacity-80 mt-1">{getWeatherLabel(currentDay.weather.condition)}</div>
                        </div>
                     </div>

                     <div className="flex flex-col items-end gap-1 relative z-10">
                         <div className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 backdrop-blur-md ${weatherTheme.labelBg} ${weatherTheme.iconColor}`}>
                            <i className="fa-solid fa-umbrella text-[10px]"></i>
                            {currentDay.weather.precipitationChance}%
                         </div>
                         <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">降雨機率</span>
                     </div>
                </div>
            )}
        </div>

        {/* Timeline with 3D Card Effect */}
        {currentDay.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300 dark:text-slate-700 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-gray-200/50 dark:border-slate-700/50 mt-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <i className="fa-solid fa-map-location-dot text-2xl opacity-40"></i>
            </div>
            <p className="font-bold text-sm text-gray-400 dark:text-gray-500">尚未安排行程</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">點擊右下角 + 開始規劃</p>
          </div>
        ) : (
          <div className="space-y-6">
            {currentDay.items.map((item, index) => {
              const cardStyle = getCardStyle(item.id);
              
              if (item.type === 'flight') {
                return (
                  <div 
                    key={item.id} 
                    ref={el => { itemsRef.current.set(item.id, el); }}
                    style={cardStyle}
                    className="relative cursor-default group transform origin-center"
                  >
                     <div className="absolute left-1/2 -top-6 -translate-x-1/2 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/50 border-4 border-[#F2F2F7] dark:border-slate-900 z-20">
                        <i className={`fa-solid ${item.isArrival ? 'fa-plane-arrival' : 'fa-plane-departure'}`}></i>
                     </div>
                     <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-900 rounded-3xl text-white shadow-xl shadow-blue-100 dark:shadow-black/50 overflow-hidden relative">
                        <div className="p-5 border-b border-white/20 border-dashed relative z-10">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-bold tracking-wider text-blue-100 bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm">
                                    {item.flightNumber}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <div className="text-center">
                                    <span className="block text-3xl font-black tracking-tight">{item.origin || 'DEP'}</span>
                                    {item.originTerminal && <span className="inline-block text-[10px] font-bold bg-white/20 px-1.5 rounded mb-1">{item.originTerminal}</span>}
                                    <span className="block text-[10px] text-blue-200 font-bold mb-1">出發</span>
                                    {item.departureTime && <span className="block text-lg font-mono font-bold">{item.departureTime}</span>}
                                </div>
                                <div className="flex flex-col items-center justify-center text-blue-200">
                                    <i className="fa-solid fa-plane text-xs transform rotate-90 mb-2"></i>
                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
                                </div>
                                <div className="text-center">
                                    <span className="block text-3xl font-black tracking-tight">{item.destination || 'ARR'}</span>
                                    {item.destinationTerminal && <span className="inline-block text-[10px] font-bold bg-white/20 px-1.5 rounded mb-1">{item.destinationTerminal}</span>}
                                    <span className="block text-[10px] text-blue-200 font-bold mb-1">抵達</span>
                                    {item.arrivalTime && <span className="block text-lg font-mono font-bold">{item.arrivalTime}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-3 bg-black/10 flex justify-between items-center relative z-10">
                           <div className="text-xs font-bold text-blue-100"></div>
                           <div className="flex gap-2">
                               <button onClick={() => openEditModal(item)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"><i className="fa-solid fa-pen text-xs"></i></button>
                               <button onClick={() => handleDeleteItemClick(item.id)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-red-500/80 flex items-center justify-center transition-colors"><i className="fa-solid fa-trash-can text-xs"></i></button>
                           </div>
                        </div>
                     </div>
                  </div>
                )
              }
              
              return (
                <div 
                    key={item.id} 
                    ref={el => { itemsRef.current.set(item.id, el); }}
                    style={cardStyle}
                    className="relative flex flex-col items-center group cursor-grab active:cursor-grabbing transform origin-center"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                >
                  {/* Clean White Card - Apple Maps Style */}
                  <div className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-none transition-shadow overflow-hidden border border-gray-100/50 dark:border-slate-800">
                    {item.imageUrl && (
                        <div className="h-48 w-full relative bg-gray-100 dark:bg-slate-800">
                            <img 
                                src={item.imageUrl} 
                                alt={item.location} 
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=800'; }} 
                            />
                            <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-2 text-black dark:text-white border border-white/50 dark:border-white/10">
                                <i className={`fa-solid ${getTypeIcon(item.type)}`}></i>
                                <time className="font-mono">{item.time}</time>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <h3 className="absolute bottom-4 left-4 text-white font-bold text-2xl tracking-tight leading-none shadow-black drop-shadow-md">{item.location}</h3>
                        </div>
                    )}

                    <div className="p-6">
                        {!item.imageUrl && (
                             <div className="flex items-center justify-between mb-4">
                                 <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{item.location}</h3>
                                 <div className="bg-gray-100 dark:bg-slate-800/50 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 text-black dark:text-gray-300">
                                    <i className={`fa-solid ${getTypeIcon(item.type)}`}></i>
                                    <time className="font-mono">{item.time}</time>
                                 </div>
                             </div>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            {item.rating && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
                                    <i className="fa-solid fa-star text-[9px]"></i> {item.rating}
                                </span>
                            )}
                            {(item.price || item.openTime) && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-3 ml-auto font-medium">
                                    {item.price && <span>{item.price}</span>}
                                    {item.openTime && <span className="flex items-center gap-1"><i className="fa-regular fa-clock"></i>{item.openTime}</span>}
                                </span>
                            )}
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">{item.description}</p>
                        
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-50 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => openEditModal(item)} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-pen text-xs"></i>
                             </button>
                             <button onClick={() => handleDeleteItemClick(item.id)} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-trash-can text-xs"></i>
                             </button>
                        </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Radial FAB (Refractive Glass Lens) */}
      <div className="fixed bottom-28 right-6 z-40">
        {/* Sub Buttons */}
        {fabActions.map((btn, idx) => {
            const angleStep = 90 / (fabActions.length - 1);
            const angle = idx * angleStep;
            const radius = 90;
            const rad = (angle * Math.PI) / 180;
            const x = isFabOpen ? -Math.cos(rad) * radius : 0;
            const y = isFabOpen ? -Math.sin(rad) * radius : 0;

            return (
                <div 
                    key={idx}
                    className="absolute bottom-1 right-1 flex items-center justify-center group"
                    style={{ 
                        transform: `translate(${x}px, ${y}px)`, 
                        transition: `transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.05}s, opacity 0.3s`
                    }}
                >
                     <span className={`absolute whitespace-nowrap bg-black dark:bg-white text-white dark:text-black text-xs font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -top-8 shadow-lg`}>
                        {btn.label}
                     </span>

                     <button 
                        onClick={() => { btn.action(); setIsFabOpen(false); }} 
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-white/50 dark:border-white/10 transition-all hover:scale-110 active:scale-95 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400
                            ${isFabOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                        `}
                    >
                        <i className={`fa-solid ${btn.icon} text-lg`}></i>
                    </button>
                </div>
            );
        })}

        {/* Main Trigger Button - Refractive Glass Effect (No Blur, just Gradient & Shadow) */}
        <button 
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`relative z-50 w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-300
                bg-gradient-to-br from-white/40 to-white/5 dark:from-slate-700/50 dark:to-slate-800/30
                border border-white/60 dark:border-white/10
                shadow-[0_4px_20px_rgba(0,0,0,0.1),inset_0_0_10px_rgba(255,255,255,0.5)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_0_10px_rgba(255,255,255,0.05)]
                backdrop-blur-[2px]
                ${isFabOpen 
                ? 'text-white rotate-45 bg-black/80 dark:bg-white/90 dark:text-black border-transparent shadow-xl' 
                : 'text-blue-600 dark:text-blue-400 hover:scale-105 active:scale-95'
            }`}
        >
            <i className="fa-solid fa-plus drop-shadow-sm"></i>
        </button>
      </div>

      {/* Modals */}
      {[
        { show: showAiModal, close: () => setShowAiModal(false), title: 'AI 智能排程', icon: 'fa-wand-magic-sparkles text-purple-500', content: (
            <>
                <textarea className="w-full p-4 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-2xl focus:bg-white focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 outline-none resize-none h-32 text-sm text-black dark:text-white" placeholder="我想去..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
                <button onClick={handleAiGenerate} disabled={isGenerating || !aiPrompt.trim()} className="w-full mt-6 py-3 rounded-xl font-bold text-white bg-black dark:bg-blue-600 hover:bg-gray-800 dark:hover:bg-blue-500 transition-all">{isGenerating ? '生成中...' : '生成行程'}</button>
            </>
        )},
        { show: showManualModal, close: () => setShowManualModal(false), title: editingItemId ? '編輯行程' : '新增行程', content: (
            <div className="space-y-4">
                {isManagingTypes ? (
                    <div className="space-y-2">
                        <button onClick={() => setIsManagingTypes(false)} className="text-sm font-bold text-blue-500 mb-2">返回</button>
                        {availableTypes.map(t => <div key={t.value} className="flex justify-between p-2 bg-gray-50 dark:bg-slate-800/50 rounded"><span className="flex items-center gap-2 text-black dark:text-gray-300"><i className={`fa-solid ${getTypeIcon(t.value)}`}></i>{t.label}</span> <button onClick={() => handleDeleteTypeClick(t.value)} className="text-red-400"><i className="fa-solid fa-trash"></i></button></div>)}
                        <div className="flex gap-2"><input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} className="flex-1 bg-gray-100 dark:bg-slate-800/50 dark:text-white p-2 rounded" placeholder="新類型" /><button onClick={handleAddType} className="bg-black dark:bg-blue-600 text-white px-3 rounded font-bold">新增</button></div>
                    </div>
                ) : (
                    <>
                        <div className="flex gap-2">
                            <input type="text" placeholder="地點名稱" value={manualName} onChange={e => setManualName(e.target.value)} className="flex-1 p-3 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-2xl outline-none font-bold text-black dark:text-white" />
                            <button 
                                onClick={handleAutoLocate} 
                                disabled={isLocating}
                                className={`px-4 rounded-2xl font-bold text-xs flex items-center gap-1 transition-all shrink-0
                                    ${(manualLat && manualLng) 
                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
                                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-200'
                                    }
                                `}
                            >
                                {isLocating ? <i className="fa-solid fa-spinner fa-spin"></i> : (manualLat && manualLng) ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-location-crosshairs"></i>}
                                <span>{(manualLat && manualLng) ? '已定位' : '定位'}</span>
                            </button>
                        </div>

                        {/* Explicit Lat/Lng Inputs */}
                        <div className="flex gap-3">
                             <div className="flex-1 bg-gray-50 dark:bg-slate-800/50 border border-transparent dark:border-white/5 p-3 rounded-2xl flex items-center justify-between">
                                <span className="text-[10px] text-gray-400 font-bold mr-2 uppercase tracking-wider">LAT</span>
                                <input type="number" placeholder="緯度" value={manualLat} onChange={e => setManualLat(e.target.value)} className="bg-transparent w-full text-right font-mono text-sm font-bold text-black dark:text-white outline-none" />
                             </div>
                             <div className="flex-1 bg-gray-50 dark:bg-slate-800/50 border border-transparent dark:border-white/5 p-3 rounded-2xl flex items-center justify-between">
                                <span className="text-[10px] text-gray-400 font-bold mr-2 uppercase tracking-wider">LNG</span>
                                <input type="number" placeholder="經度" value={manualLng} onChange={e => setManualLng(e.target.value)} className="bg-transparent w-full text-right font-mono text-sm font-bold text-black dark:text-white outline-none" />
                             </div>
                        </div>

                        <div className="flex gap-3">
                            <input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} className="flex-1 p-3 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-xl outline-none font-bold text-black dark:text-white dark:[color-scheme:dark]" />
                            <div className="flex-1 relative">
                                <select value={manualType} onChange={e => setManualType(e.target.value)} className="w-full p-3 pl-9 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-xl outline-none appearance-none font-bold text-gray-700 dark:text-gray-300">{availableTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"><i className={`fa-solid ${getTypeIcon(manualType)}`}></i></div>
                                <button onClick={() => setIsManagingTypes(true)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><i className="fa-solid fa-gear"></i></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                             <input type="number" placeholder="評分" value={manualRating} onChange={e => setManualRating(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-xl outline-none text-sm text-black dark:text-white" />
                             <input type="text" placeholder="營業時間" value={manualOpenTime} onChange={e => setManualOpenTime(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-xl outline-none text-sm text-black dark:text-white" />
                        </div>
                        <input type="text" placeholder="圖片連結" value={manualImage} onChange={e => setManualImage(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-xl outline-none text-xs text-black dark:text-white" />
                        <textarea value={manualDesc} onChange={e => setManualDesc(e.target.value)} rows={3} className="w-full p-3 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-xl outline-none text-sm text-black dark:text-white" placeholder="備註..." />
                        <button onClick={handleSaveManual} disabled={!manualName} className="w-full mt-4 py-3 rounded-xl font-bold text-white bg-black dark:bg-blue-600 hover:bg-gray-800 dark:hover:bg-blue-500 transition-all">確認</button>
                    </>
                )}
            </div>
        )},
        { show: showFlightModal, close: () => setShowFlightModal(false), title: '航班資訊', content: (
            <div className="space-y-3">
               {/* Type Switcher */}
               <div className="flex bg-gray-100 dark:bg-slate-800/50 p-1 rounded-2xl">
                  <button onClick={() => setFlightType('arrival')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${flightType === 'arrival' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400'}`}>去程</button>
                  <button onClick={() => setFlightType('departure')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${flightType === 'departure' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400'}`}>返程</button>
               </div>
               
               {/* Flight No */}
               <div>
                 <label className="block text-xs font-bold text-gray-400 mb-1 pl-1">航班號碼</label>
                 <input type="text" placeholder="e.g. CI501" value={flightNo} onChange={e => setFlightNo(e.target.value.toUpperCase())} className="w-full p-3 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-2xl font-mono font-bold text-lg uppercase outline-none text-black dark:text-white focus:bg-blue-50 dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all" />
               </div>

               {/* Origin & Destination */}
               <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
                 <div className="w-full">
                    <label className="block text-xs font-bold text-gray-400 mb-1 pl-1 text-center">出發地</label>
                    <input type="text" placeholder="TPE" value={flightOrigin} onChange={e => setFlightOrigin(e.target.value.toUpperCase())} className="w-full p-3 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-2xl font-mono uppercase text-center font-black text-xl outline-none text-black dark:text-white focus:bg-blue-50 dark:focus:bg-slate-700 transition-all mb-2" />
                    <input type="text" placeholder="航廈 T1" value={flightOriginTerminal} onChange={e => setFlightOriginTerminal(e.target.value.toUpperCase())} className="w-full p-2 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-xl font-mono uppercase text-center text-sm font-bold outline-none text-black dark:text-white focus:bg-blue-50 dark:focus:bg-slate-700 transition-all" />
                 </div>
                 <div className="flex h-full pt-8 items-center justify-center">
                     <i className="fa-solid fa-plane text-gray-300 dark:text-gray-600 transform rotate-90"></i>
                 </div>
                 <div className="w-full">
                    <label className="block text-xs font-bold text-gray-400 mb-1 pl-1 text-center">目的地</label>
                    <input type="text" placeholder="PVG" value={flightDestination} onChange={e => setFlightDestination(e.target.value.toUpperCase())} className="w-full p-3 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-2xl font-mono uppercase text-center font-black text-xl outline-none text-black dark:text-white focus:bg-blue-50 dark:focus:bg-slate-700 transition-all mb-2" />
                    <input type="text" placeholder="航廈 T2" value={flightDestTerminal} onChange={e => setFlightDestTerminal(e.target.value.toUpperCase())} className="w-full p-2 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-xl font-mono uppercase text-center text-sm font-bold outline-none text-black dark:text-white focus:bg-blue-50 dark:focus:bg-slate-700 transition-all" />
                 </div>
               </div>

               {/* Departure & Arrival Time (Side by Side) */}
               <div className="grid grid-cols-2 gap-3">
                 <div className="w-full">
                    <label className="block text-xs font-bold text-gray-400 mb-1 pl-1">出發時間</label>
                    <input type="time" value={flightDepTime} onChange={e => setFlightDepTime(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-2xl font-bold outline-none text-black dark:text-white focus:bg-blue-50 dark:focus:bg-slate-700 transition-all dark:[color-scheme:dark]" />
                 </div>
                 <div className="w-full">
                    <label className="block text-xs font-bold text-gray-400 mb-1 pl-1">抵達時間</label>
                    <input type="time" value={flightArrTime} onChange={e => setFlightArrTime(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800/50 dark:focus:bg-slate-800 border border-transparent dark:border-white/5 rounded-2xl font-bold outline-none text-black dark:text-white focus:bg-blue-50 dark:focus:bg-slate-700 transition-all dark:[color-scheme:dark]" />
                 </div>
               </div>
               
               <button onClick={handleSaveFlight} className="w-full mt-2 py-4 rounded-2xl font-bold text-white bg-[#007AFF] hover:bg-blue-600 shadow-xl shadow-blue-200 dark:shadow-blue-900/30 active:scale-95 transition-all">儲存航班</button>
            </div>
        )}
      ].map((m, i) => m.show && (
        <div key={i} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl w-full max-w-md rounded-3xl p-6 shadow-2xl animate-scale-up border border-white/50 dark:border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">{m.icon && <i className={`fa-solid ${m.icon}`}></i>} {m.title}</h3>
                    <button onClick={m.close} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800/80 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700"><i className="fa-solid fa-xmark"></i></button>
                </div>
                {m.content}
            </div>
        </div>
      ))}

      {/* Confirmation Modal */}
      {deleteConfirmation && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 dark:bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl max-w-xs w-full text-center border border-white/50 dark:border-white/10 animate-scale-up">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-triangle-exclamation text-xl"></i>
                </div>
                <h3 className="text-lg font-black text-black dark:text-white mb-2">確認刪除？</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-6 leading-relaxed">
                    {deleteConfirmation.type === 'category' 
                        ? `您確定要刪除「${deleteConfirmation.name}」分類嗎？` 
                        : '此動作無法復原，您確定要刪除這個行程項目嗎？'}
                </p>
                <div className="flex gap-3">
                   <button 
                       onClick={() => setDeleteConfirmation(null)} 
                       className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl font-bold text-gray-600 dark:text-gray-300 transition-colors"
                    >
                       取消
                   </button>
                   <button 
                       onClick={deleteConfirmation.type === 'category' ? confirmDeleteType : confirmDeleteItem} 
                       className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white shadow-lg shadow-red-200 dark:shadow-red-900/30 transition-colors"
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

export default ItineraryView;