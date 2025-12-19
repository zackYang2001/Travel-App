import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DayItinerary, ItineraryItem } from '../types';
import { generateItinerarySuggestions, suggestIconForCategory, getPlaceDetails } from '../services/geminiService';
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
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const dayListRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const longPressTimer = useRef<number | null>(null);
  const [isDayEditMode, setIsDayEditMode] = useState(false);

  const [showAiModal, setShowAiModal] = useState(false);
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'item' | 'day', id: string, name?: string } | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  
  // 航班相關 State
  const [flightNo, setFlightNo] = useState('');
  const [flightDepTime, setFlightDepTime] = useState('');
  const [flightArrTime, setFlightArrTime] = useState('');
  const [flightOrigin, setFlightOrigin] = useState('');
  const [flightDestination, setFlightDestination] = useState('');
  const [flightType, setFlightType] = useState<'arrival' | 'departure'>('arrival');
  // 新增航班詳細資訊 State
  const [flightOriginTerminal, setFlightOriginTerminal] = useState('T1');
  const [flightDestTerminal, setFlightDestTerminal] = useState('T2');
  const [flightGate, setFlightGate] = useState('');
  const [flightSeat, setFlightSeat] = useState('');

  // 一般行程 State
  const [manualName, setManualName] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualType, setManualType] = useState<string>('sightseeing');
  const [manualRating, setManualRating] = useState('');
  const [manualOpenTime, setManualOpenTime] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualImage, setManualImage] = useState('');
  const [manualImageOffsetY, setManualImageOffsetY] = useState(50);
  const [manualLat, setManualLat] = useState<number | string>('');
  const [manualLng, setManualLng] = useState<number | string>('');
  const [isLocating, setIsLocating] = useState(false);

  const [availableTypes] = useState(DEFAULT_TYPES);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const [pullAmount, setPullAmount] = useState(0); 
  const PULL_THRESHOLD = 130; 
  const isTransitioning = useRef(false); 
  const wheelResetTimer = useRef<number | null>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
        const currentScrollTop = scrollContainerRef.current.scrollTop;
        const scrollHeight = scrollContainerRef.current.scrollHeight;
        const clientHeight = scrollContainerRef.current.clientHeight;
        
        setScrollTop(currentScrollTop);
        if (!isScrolled && currentScrollTop > 40) setIsScrolled(true);
        else if (isScrolled && currentScrollTop < 10) setIsScrolled(false);

        const isAtBottom = currentScrollTop + clientHeight >= scrollHeight - 5;
        const overScroll = (currentScrollTop + clientHeight) - scrollHeight;

        if (isAtBottom && overScroll > 0) {
            setPullAmount(overScroll);
            if (overScroll > PULL_THRESHOLD && !isTransitioning.current) {
                triggerNextDay();
            }
        } else if (pullAmount > 0) {
            setPullAmount(0);
        }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollContainerRef.current || isTransitioning.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;

    if (isAtBottom && e.deltaY > 0) {
        const increment = e.deltaY * 0.22; 
        setPullAmount(prev => Math.min(prev + increment, PULL_THRESHOLD + 20));
        if (pullAmount >= PULL_THRESHOLD) triggerNextDay();

        if (wheelResetTimer.current) window.clearTimeout(wheelResetTimer.current);
        wheelResetTimer.current = window.setTimeout(() => setPullAmount(0), 80);
    }
  };

  const triggerNextDay = useCallback(() => {
      if (isTransitioning.current) return;
      const currentIndex = days.findIndex(d => d.id === selectedDayId);
      if (currentIndex !== -1 && currentIndex < days.length - 1) {
          isTransitioning.current = true;
          setSelectedDayId(days[currentIndex + 1].id);
          setPullAmount(0);
          if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
          setTimeout(() => { isTransitioning.current = false; }, 400); 
      }
  }, [days, selectedDayId]);

  const handleDayListScroll = () => {
      if (dayListRef.current) {
          const pos = dayListRef.current.scrollLeft;
          setScrollPosition(pos);
          const itemWidth = isScrolled ? 64 : 80;
          const centerIndex = Math.round(pos / itemWidth);
          setActiveDayIndex(centerIndex);
      }
  };

  useEffect(() => {
    if (days.length > 0 && (!selectedDayId || !days.find(d => d.id === selectedDayId))) {
        setSelectedDayId(days[0].id);
    }
  }, [days, selectedDayId]);

  useEffect(() => {
    if (dayListRef.current && selectedDayId) {
        const index = days.findIndex(d => d.id === selectedDayId);
        if (index !== -1) {
            const gap = isScrolled ? 8 : 16;
            const btnWidth = isScrolled ? 56 : 64;
            const totalItemWidth = btnWidth + gap;
            dayListRef.current.scrollTo({ left: index * totalItemWidth, behavior: 'smooth' });
        }
    }
  }, [selectedDayId, days, isScrolled]); 

  const currentDay = days.find(d => d.id === selectedDayId) || days[0];
  const nextDay = days[days.findIndex(d => d.id === selectedDayId) + 1];

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
  }, [currentDay?.id, currentDay?.date, destination, setDays]);

  const resetForms = () => {
    setEditingItemId(null);
    setFlightNo(''); setFlightDepTime(''); setFlightArrTime('');
    setFlightOrigin(''); setFlightDestination('');
    setFlightOriginTerminal('T1'); setFlightDestTerminal('T2');
    setFlightGate(''); setFlightSeat('');
    setManualName(''); setManualTime(''); setManualDesc('');
    setManualOpenTime(''); setManualImage('');
    setManualImageOffsetY(50);
    setManualRating('4.5'); setManualPrice('$$');
    setManualType('sightseeing');
    setManualLat(''); setManualLng('');
  };

  const openEditModal = (item: ItineraryItem) => {
    setEditingItemId(item.id);
    if (item.type === 'flight') {
        setFlightNo(item.flightNumber || '');
        setFlightDepTime(item.departureTime || (!item.isArrival ? item.time : ''));
        setFlightArrTime(item.arrivalTime || (item.isArrival ? item.time : ''));
        setFlightOrigin(item.origin || '');
        setFlightDestination(item.destination || '');
        setFlightType(item.isArrival ? 'arrival' : 'departure');
        // 載入新欄位
        setFlightOriginTerminal(item.originTerminal || 'T1');
        setFlightDestTerminal(item.destTerminal || 'T2');
        setFlightGate(item.gate || '');
        setFlightSeat(item.seat || '');
        setShowFlightModal(true);
    } else {
        setManualName(item.location);
        setManualTime(item.time);
        setManualDesc(item.description);
        setManualType(item.type);
        setManualRating(item.rating?.toString() || '');
        setManualOpenTime(item.openTime || '');
        setManualPrice(item.price || '$$');
        setManualImage(item.imageUrl || '');
        setManualImageOffsetY(item.imageOffsetY ?? 50);
        setManualLat(item.lat || '');
        setManualLng(item.lng || '');
        setShowManualModal(true);
    }
    setIsFabOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                let width = img.width, height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    setManualImage(canvas.toDataURL('image/jpeg', 0.7));
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
  };

  const handleAutoLocate = async () => {
      if (!manualName.trim()) { alert("請先輸入地點名稱"); return; }
      setIsLocating(true);
      try {
          // 修正邏輯：先嘗試在目的地搜尋，如果找不到，嘗試全域搜尋
          // 第一次嘗試：帶入目前行程的目的地 
          let details = await getPlaceDetails(manualName, destination);

          // 第二次嘗試：如果找不到，嘗試全域搜尋
          if (!details) {
              // 傳入 undefined 或空字串，視 geminiService 實作而定，通常表示不限制範圍
              details = await getPlaceDetails(manualName, undefined); 
          }

          if (details) {
              setManualLat(details.lat);
              setManualLng(details.lng);
              if (details.rating) setManualRating(details.rating.toString());
              if (details.openTime) setManualOpenTime(details.openTime);
              if (details.priceLevel) setManualPrice(details.priceLevel);
              if (details.description) setManualDesc(details.description);
          } else {
              alert("找不到此地點詳細資訊，請嘗試輸入更完整的名稱");
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
                price: manualPrice,
                imageUrl: manualImage || undefined,
                imageOffsetY: manualImageOffsetY,
                lat: lat !== undefined ? lat : 0, 
                lng: lng !== undefined ? lng : 0,
            };
            const newItems = editingItemId ? day.items.map(i => i.id === editingItemId ? newItemData : i) : [...day.items, newItemData];
            return { ...day, items: newItems.sort((a, b) => a.time.localeCompare(b.time)) };
        }
        return day;
    }));
    setShowManualModal(false);
    resetForms();
  };

  // 儲存航班邏輯
  const handleSaveFlight = () => {
      if (!flightNo || !flightOrigin || !flightDestination) return;

      setDays(prev => prev.map(day => {
          if (day.id === selectedDayId) {
              const newItemData: ItineraryItem = {
                  id: editingItemId || `f-${Date.now()}`,
                  type: 'flight',
                  flightNumber: flightNo,
                  origin: flightOrigin,
                  destination: flightDestination,
                  departureTime: flightDepTime,
                  arrivalTime: flightArrTime,
                  isArrival: flightType === 'arrival',
                  // 儲存新欄位
                  originTerminal: flightOriginTerminal,
                  destTerminal: flightDestTerminal,
                  gate: flightGate,
                  seat: flightSeat,
                  // 相容欄位
                  time: flightType === 'arrival' ? flightArrTime : flightDepTime,
                  location: `${flightOrigin} -> ${flightDestination}`,
                  description: `Flight ${flightNo}`,
              };
               const newItems = editingItemId ? day.items.map(i => i.id === editingItemId ? newItemData : i) : [...day.items, newItemData];
               return { ...day, items: newItems.sort((a, b) => a.time.localeCompare(b.time)) };
          }
          return day;
      }));
      setShowFlightModal(false);
      resetForms();
  }

  const handleDayTouchStart = (dayId: string) => {
      if (!isDayEditMode) {
          longPressTimer.current = window.setTimeout(() => {
              setIsDayEditMode(true);
              if (window.navigator.vibrate) window.navigator.vibrate(60);
          }, 700);
      }
  };

  const handleDayTouchEnd = () => {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const confirmDelete = () => {
      if (deleteConfirmation?.type === 'item') {
        setDays(prev => prev.map(day => day.id === selectedDayId ? { ...day, items: day.items.filter(i => i.id !== deleteConfirmation.id) } : day));
      } else if (deleteConfirmation?.type === 'day') {
        setDays(prev => {
            const filtered = prev.filter(d => d.id !== deleteConfirmation.id);
            if (filtered.length === 0) return filtered;
            const firstDate = new Date(filtered[0].date);
            return filtered.map((d, i) => {
                const newDate = new Date(firstDate);
                newDate.setDate(newDate.getDate() + i);
                return { ...d, dayLabel: `第 ${i + 1} 天`, date: newDate.toISOString().split('T')[0] };
            });
        });
        if (selectedDayId === deleteConfirmation.id) setSelectedDayId(days[0]?.id || '');
      }
      setDeleteConfirmation(null);
  };

  const handleDragStart = (e: React.DragEvent, position: number) => { dragItem.current = position; e.dataTransfer.effectAllowed = "move"; };
  const handleDragEnter = (e: React.DragEvent, position: number) => { dragOverItem.current = position; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newItems = [...currentDay.items];
    const draggedItemContent = newItems[dragItem.current];
    newItems.splice(dragItem.current, 1);
    newItems.splice(dragOverItem.current, 0, draggedItemContent);
    setDays(prev => prev.map(day => day.id === selectedDayId ? { ...day, items: newItems } : day));
    dragItem.current = null; dragOverItem.current = null;
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const suggestions = await generateItinerarySuggestions(aiPrompt);
      if (suggestions.length > 0) {
        setDays(prev => prev.map(day => day.id === selectedDayId ? { ...day, items: [...day.items, ...suggestions].sort((a, b) => a.time.localeCompare(b.time)) } : day));
        setShowAiModal(false); setAiPrompt('');
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

  const getWeatherTheme = (cond: string) => {
    switch(cond) {
        case 'sunny': return { bg: 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-200/50 dark:from-orange-900/50 dark:to-amber-900/50', text: 'text-orange-900 dark:text-orange-100', iconColor: 'text-orange-500', labelBg: 'bg-white/40 dark:bg-black/20' };
        case 'cloudy': return { bg: 'bg-gradient-to-r from-blue-100 to-sky-100 border-blue-200/50 dark:from-blue-900/50 dark:to-sky-900/50', text: 'text-blue-900 dark:text-blue-100', iconColor: 'text-blue-500', labelBg: 'bg-white/40 dark:bg-black/20' };
        case 'rain': return { bg: 'bg-gradient-to-r from-gray-200 to-slate-200 border-gray-300/50 dark:from-gray-800 dark:to-slate-800', text: 'text-gray-800 dark:text-gray-200', iconColor: 'text-slate-500 dark:text-slate-400', labelBg: 'bg-white/40 dark:bg-black/20' };
        default: return { bg: 'bg-white dark:bg-slate-800', text: 'text-gray-900 dark:text-gray-100', iconColor: 'text-gray-500', labelBg: 'bg-gray-100 dark:bg-slate-700' };
    }
  };

  const getDayWheelStyle = (index: number) => {
      if (!dayListRef.current) return {};
      const gap = isScrolled ? 8 : 16;
      const btnWidth = isScrolled ? 56 : 64; 
      const itemWidth = btnWidth + gap;
      const containerCenter = dayListRef.current.clientWidth / 2;
      const halfItem = btnWidth / 2; 
      const paddingLeft = (dayListRef.current.clientWidth / 2) - halfItem;
      const itemCenter = paddingLeft + (index * itemWidth) + halfItem - scrollPosition;
      const distanceFromCenter = Math.abs(containerCenter - itemCenter);
      const maxDistance = 200; 
      const scaleMax = isScrolled ? 1.0 : 1.1;
      let scale = Math.max(scaleMax - (distanceFromCenter / maxDistance) * 0.3, 0.8); 
      let opacity = Math.max(1 - (distanceFromCenter / maxDistance) * 0.6, 0.5);
      return { transform: `scale(${scale})`, opacity, zIndex: 50 - Math.floor(distanceFromCenter / 10) };
  };

  const getCardStyle = (itemId: string) => {
      if (!scrollContainerRef.current) return {};
      const el = itemsRef.current.get(itemId);
      if (!el) return {};
      const containerHeight = scrollContainerRef.current.clientHeight;
      const focusPoint = scrollTop + (containerHeight * 0.4);
      const elCenter = el.offsetTop + (el.offsetHeight / 2);
      const dist = Math.abs(focusPoint - elCenter);
      const maxDist = containerHeight / 1.5;
      const effectiveDist = Math.max(0, dist - 160);
      let scale = Math.max(0.9, 1.0 - (effectiveDist / maxDist) * 0.15);
      let opacity = Math.max(0.4, 1.0 - (effectiveDist / maxDist) * 0.7);
      let blur = Math.min(3, (effectiveDist / maxDist) * 3);
      return { transform: `scale(${scale})`, opacity, filter: `blur(${blur}px)`, transition: 'transform 0.15s, opacity 0.15s, filter 0.15s', zIndex: dist < 200 ? 10 : 1 };
  };

  const fabActions = [
    { icon: 'fa-wand-magic-sparkles', label: 'AI 推薦', action: () => { resetForms(); setShowAiModal(true); } },
    { icon: 'fa-pen', label: '手動輸入', action: () => { resetForms(); setShowManualModal(true); } },
    { icon: 'fa-plane', label: '航班', action: () => { resetForms(); setShowFlightModal(true); } }
  ];

  const pullProgress = Math.min((pullAmount / PULL_THRESHOLD) * 100, 100);
  const isReadyToTransition = pullProgress >= 95;

  return (
    <div className="flex flex-col h-full relative font-sans transition-all duration-300 no-select bg-[#F4F4F5] dark:bg-black" ref={scrollContainerRef} onScroll={handleScroll} onWheel={handleWheel} onClick={() => { if (isDayEditMode) setIsDayEditMode(false); }} style={{overflowY: 'auto'}}>
      <div className={`day-selector-container sticky top-0 z-20 transition-all duration-500 ease-out ${isScrolled ? 'bg-[#F4F4F5]/90 dark:bg-black/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5' : 'bg-transparent'}`}>
        <div ref={dayListRef} onScroll={handleDayListScroll} className="flex overflow-x-auto snap-x snap-mandatory items-center no-scrollbar py-2" style={{ height: isScrolled ? '72px' : '84px', paddingLeft: isScrolled ? 'calc(50% - 28px)' : 'calc(50% - 32px)', paddingRight: isScrolled ? 'calc(50% - 28px)' : 'calc(50% - 32px)', gap: isScrolled ? '8px' : '16px' }}>
          {days.map((day, index) => (
            <div key={day.id} className="day-selector-item relative group shrink-0 snap-center" onMouseDown={() => handleDayTouchStart(day.id)} onMouseUp={handleDayTouchEnd} onTouchStart={() => handleDayTouchStart(day.id)} onTouchEnd={handleDayTouchEnd}>
                <button onClick={(e) => { e.stopPropagation(); setSelectedDayId(day.id); }} style={getDayWheelStyle(index)} data-editing={isDayEditMode} className={`flex flex-col items-center justify-center transition-all duration-300 rounded-2xl border ${isScrolled ? 'w-14 h-14' : 'w-16 h-16'} ${selectedDayId === day.id ? 'bg-[#6B8EAD] text-white dark:bg-white dark:text-black border-transparent shadow-xl scale-110' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-400'}`}>
                    <span className={`font-medium leading-none ${isScrolled ? 'text-[9px]' : 'text-[10px] opacity-80 mb-1'}`}>{day.date.slice(5).replace('-', '/')}</span>
                    {!isScrolled && <span className="font-bold text-xl leading-none">{day.dayLabel.replace('第 ','').replace(' 天','')}</span>}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ type: 'day', id: day.id, name: day.dayLabel }); }} className={`absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-[11px] shadow-xl z-[60] transition-all transform ${isDayEditMode ? 'scale-110 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}><i className="fa-solid fa-xmark"></i></button>
            </div>
          ))}
          <button onClick={() => {
            const nextDate = new Date(days[days.length-1]?.date || new Date());
            if (days.length > 0) nextDate.setDate(nextDate.getDate() + 1);
            const newDayId = `d-${Date.now()}`;
            setDays([...days, { id: newDayId, date: nextDate.toISOString().split('T')[0], dayLabel: `第 ${days.length + 1} 天`, items: [] }]);
            setTimeout(() => setSelectedDayId(newDayId), 100);
          }} className={`flex-shrink-0 snap-center flex items-center justify-center border border-dashed border-gray-300 dark:border-slate-800 text-gray-400 rounded-2xl transition-all ${isScrolled ? 'w-14 h-14' : 'w-16 h-16'}`}><i className="fa-solid fa-plus"></i></button>
        </div>
      </div>

      <div className="flex-1 p-5 pt-2 pb-10">
        <div className="flex flex-col gap-6 mb-8">
            <div className="flex justify-between items-end px-1">
                 <div><h2 className="text-4xl font-black text-black dark:text-white tracking-tighter">{currentDay.dayLabel}</h2><p className="text-gray-400 dark:text-gray-500 font-bold mt-1 text-sm">{currentDay.date.replace(/-/g, '.')}</p></div>
                 {isDayEditMode && <button onClick={(e) => { e.stopPropagation(); setIsDayEditMode(false); }} className="px-5 py-2.5 bg-[#6B8EAD] dark:bg-blue-600 text-white rounded-full text-xs font-black shadow-lg">結束編輯</button>}
            </div>
            {currentDay.weather && (
                <div className={`rounded-[2rem] p-5 shadow-sm border flex items-center justify-between relative overflow-hidden ${getWeatherTheme(currentDay.weather.condition).bg} ${getWeatherTheme(currentDay.weather.condition).text}`}>
                     <div className="flex items-center gap-4 relative z-10"><div className={`w-14 h-14 flex items-center justify-center text-4xl ${getWeatherTheme(currentDay.weather.condition).iconColor}`}><i className={`fa-solid ${currentDay.weather.icon}`}></i></div><div><div className="text-3xl font-black">{currentDay.weather.temp}°</div><div className="text-xs font-bold opacity-80">{currentDay.weather.condition}</div></div></div>
                     <div className="flex flex-col items-end gap-1 relative z-10"><div className={`px-3 py-1.5 rounded-full text-xs font-black backdrop-blur-md ${getWeatherTheme(currentDay.weather.condition).labelBg}`}><i className="fa-solid fa-umbrella text-[10px] mr-1"></i>{currentDay.weather.precipitationChance}%</div></div>
                </div>
            )}
        </div>

        {currentDay.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300 bg-white/50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-gray-300 dark:border-slate-800 mt-4"><p className="font-bold text-sm text-gray-400">尚未安排行程</p></div>
        ) : (
          <div className="space-y-6">
            {currentDay.items.map((item, index) => {
              const cardStyle = getCardStyle(item.id);
              if (item.type === 'flight') return (
                <div key={item.id} ref={el => { itemsRef.current.set(item.id, el); }} style={cardStyle} className="relative transform origin-center my-6 group">
                     <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white dark:border-slate-800 overflow-hidden relative">
                        <div className="absolute top-[35%] -left-3 w-6 h-6 rounded-full bg-[#F4F4F5] dark:bg-black z-20"></div>
                        <div className="absolute top-[35%] -right-3 w-6 h-6 rounded-full bg-[#F4F4F5] dark:bg-black z-20"></div>

                        <div className="p-6 pb-8 relative">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
                                        <i className="fa-solid fa-plane text-xs"></i>
                                    </div>
                                    <span className="font-mono text-sm font-bold text-gray-900 dark:text-white tracking-tight">{item.flightNumber || 'FLIGHT'}</span>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wide ${item.isArrival ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {item.isArrival ? 'Arriving' : 'Departing'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex flex-col items-start min-w-[80px]">
                                    <span className="text-4xl font-black text-black dark:text-white tabular-nums leading-none mb-1">{item.departureTime || '--:--'}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-bold text-gray-500">{item.origin || 'ORG'}</span>
                                        <span className="px-1.5 py-0.5 rounded-[4px] bg-gray-200 dark:bg-slate-800 text-[10px] font-mono font-bold text-gray-600 dark:text-gray-400">{item.originTerminal || 'T1'}</span>
                                    </div>
                                </div>
                                <div className="flex-1 px-4 flex flex-col items-center opacity-30">
                                    <div className="w-full border-t-2 border-dashed border-gray-400 dark:border-gray-600"></div>
                                </div>
                                <div className="flex flex-col items-end min-w-[80px]">
                                    <span className="text-4xl font-black text-black dark:text-white tabular-nums leading-none mb-1">{item.arrivalTime || '--:--'}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 rounded-[4px] bg-gray-200 dark:bg-slate-800 text-[10px] font-mono font-bold text-gray-600 dark:text-gray-400">{item.destTerminal || 'T2'}</span>
                                        <span className="text-sm font-bold text-gray-500">{item.destination || 'DST'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-800/50 px-6 py-4 flex justify-between items-center border-t border-dashed border-gray-200 dark:border-slate-700">
                             <div className="flex gap-6">
                                 <div>
                                     <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Gate</span>
                                     <span className="text-sm font-black text-gray-800 dark:text-gray-200">{item.gate || '--'}</span>
                                 </div>
                                 <div>
                                     <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Seat</span>
                                     <span className="text-sm font-black text-gray-800 dark:text-gray-200">{item.seat || '--'}</span>
                                 </div>
                             </div>
                             
                             <div className="flex gap-2">
                                <button onClick={() => openEditModal(item)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-gray-400 transition-all"><i className="fa-solid fa-pen text-xs"></i></button>
                                <button onClick={() => setDeleteConfirmation({type:'item', id:item.id})} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm text-gray-400 hover:text-red-500 transition-all"><i className="fa-solid fa-trash-can text-xs"></i></button>
                             </div>
                        </div>
                     </div>
                </div>
              );

              return (
                <div key={item.id} ref={el => { itemsRef.current.set(item.id, el); }} style={cardStyle} className="relative flex flex-col items-center group transform origin-center" draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()}>
                  <div className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] overflow-hidden border border-white dark:border-white/5 transition-all">
                    {item.imageUrl && (
                        <div className="h-48 w-full relative overflow-hidden">
                            <img src={item.imageUrl} className="w-full h-full object-cover" style={{ objectPosition: `center ${item.imageOffsetY ?? 50}%` }} alt="" />
                            <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
                                <i className={`fa-solid ${getTypeIcon(item.type)}`}></i><time className="font-mono">{item.time}</time>
                            </div>
                            <h3 className="absolute bottom-4 left-4 text-white font-bold text-2xl drop-shadow-md">{item.location}</h3>
                        </div>
                    )}
                    <div className="p-6">
                        {!item.imageUrl && <div className="flex items-center justify-between mb-4"><h3 className="text-2xl font-bold dark:text-white">{item.location}</h3><div className="bg-gray-100 dark:bg-slate-800/50 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2"><i className={`fa-solid ${getTypeIcon(item.type)}`}></i><time className="font-mono">{item.time}</time></div></div>}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            {item.rating && <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg"><i className="fa-solid fa-star text-[9px]"></i> {item.rating}</span>}
                            <span className="text-[10px] text-gray-400 flex items-center gap-3 ml-auto font-medium">{item.price && <span>{item.price}</span>}{item.openTime && <span className="flex items-center gap-1"><i className="fa-regular fa-clock"></i>{item.openTime}</span>}</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{item.description}</p>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-50 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openEditModal(item)} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800"><i className="fa-solid fa-pen text-xs"></i></button><button onClick={() => setDeleteConfirmation({type:'item', id:item.id})} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800"><i className="fa-solid fa-trash-can text-xs"></i></button></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12 mb-32 flex flex-col items-center justify-center transition-all duration-300" style={{ transform: `translateY(-${pullAmount * 0.25}px)`, opacity: 0.3 + (pullAmount / PULL_THRESHOLD) * 0.7 }}>
            {nextDay ? (
                <div className="flex flex-col items-center w-full max-w-[200px]">
                    <div className="w-full flex justify-center mb-6 relative">
                         <div className="w-[1.5px] h-14 bg-gray-300 dark:bg-slate-800 rounded-full opacity-30"></div>
                         <div className="absolute top-0 w-[2.5px] bg-[#6B8EAD] dark:bg-white rounded-full transition-all duration-200 ease-out" style={{ height: `${Math.min(pullProgress, 100)}%`, opacity: pullProgress / 100, willChange: 'height' }}></div>
                    </div>
                    <div className={`flex flex-col items-center transition-all duration-500 ${isReadyToTransition ? 'scale-110' : 'scale-100 opacity-50'}`}>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${isReadyToTransition ? 'bg-[#6B8EAD] text-white dark:bg-white dark:text-black shadow-xl' : 'bg-gray-200 dark:bg-slate-800 text-gray-400'}`}><i className={`fa-solid fa-chevron-up text-lg ${isReadyToTransition ? 'animate-bounce' : 'animate-bounce-subtle'}`}></i></div>
                        <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${isReadyToTransition ? 'text-[#6B8EAD] dark:text-white' : 'text-gray-400'}`}>{isReadyToTransition ? '放開切換' : '向下拉動切換'}</p>
                        <h4 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{nextDay.dayLabel}</h4>
                    </div>
                    <div className="w-full h-1 bg-gray-200 dark:bg-slate-800/50 rounded-full mt-8 overflow-hidden"><div className="h-full bg-[#6B8EAD] dark:bg-white transition-all duration-200 ease-out" style={{ width: `${pullProgress}%`, willChange: 'width' }}></div></div>
                </div>
            ) : (
                <div className="py-16 flex flex-col items-center opacity-40"><i className="fa-solid fa-flag-checkered text-gray-400 text-lg mb-2"></i><p className="text-[11px] font-black uppercase tracking-widest text-gray-400">旅程終點</p></div>
            )}
        </div>
      </div>

      <div className="fixed bottom-28 right-6 z-40">
        {fabActions.map((btn, idx) => {
            const angle = idx * (90 / (fabActions.length - 1));
            const x = isFabOpen ? -Math.cos((angle * Math.PI) / 180) * 95 : 0;
            const y = isFabOpen ? -Math.sin((angle * Math.PI) / 180) * 95 : 0;
            return (
                <div key={idx} className="absolute bottom-1 right-1" style={{ transform: `translate(${x}px, ${y}px)`, transition: `transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.04}s`, opacity: isFabOpen ? 1 : 0 }}>
                     <button onClick={() => { btn.action(); setIsFabOpen(false); }} className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-white/50 dark:border-white/10 bg-white dark:bg-slate-800 text-[#6B8EAD] dark:text-white"><i className={`fa-solid ${btn.icon} text-lg`}></i></button>
                </div>
            );
        })}
        <button onClick={() => setIsFabOpen(!isFabOpen)} className={`relative z-50 w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-300 shadow-xl backdrop-blur-md ${isFabOpen ? 'text-white rotate-45 bg-[#6B8EAD] dark:bg-white/90 dark:text-black' : 'text-[#6B8EAD] dark:text-white bg-white/80 dark:bg-slate-800/80 border border-white/60 dark:border-white/10'}`}><i className="fa-solid fa-plus"></i></button>
      </div>

      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/10 my-auto">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold dark:text-white">{editingItemId ? '編輯行程' : '新增行程'}</h3><button onClick={() => setShowManualModal(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800"><i className="fa-solid fa-xmark"></i></button></div>
                <div className="space-y-4">
                    <div className="relative group">
                        {manualImage ? (
                            <div className="w-full h-40 rounded-2xl overflow-hidden relative border border-gray-100 dark:border-slate-800">
                                <img src={manualImage} className="w-full h-full object-cover" style={{ objectPosition: `center ${manualImageOffsetY}%` }} alt="" />
                                <div className="absolute inset-0 bg-black/20 flex items-end p-2 opacity-0 group-hover:opacity-100"><input type="range" min="0" max="100" value={manualImageOffsetY} onChange={(e) => setManualImageOffsetY(parseInt(e.target.value))} className="w-full h-1 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-500" /></div>
                                <button onClick={() => setManualImage('')} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-xs shadow-md"><i className="fa-solid fa-trash"></i></button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* 上傳檔案區域 */}
                                <label className="w-full h-24 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#6B8EAD] hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-all text-gray-400">
                                    <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">上傳圖片檔案</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                                
                                {/* 分隔線 */}
                                <div className="flex items-center gap-3">
                                    <div className="h-[1px] bg-gray-100 dark:bg-slate-800 flex-1"></div>
                                    <span className="text-[10px] text-gray-300 font-bold uppercase">OR</span>
                                    <div className="h-[1px] bg-gray-100 dark:bg-slate-800 flex-1"></div>
                                </div>

                                {/* URL 輸入區域 */}
                                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl flex items-center gap-3 border border-transparent focus-within:border-[#6B8EAD] transition-colors">
                                     <i className="fa-solid fa-link text-gray-400"></i>
                                     <input 
                                        type="text" 
                                        placeholder="貼上圖片網址..." 
                                        className="w-full bg-transparent outline-none font-bold text-sm dark:text-white placeholder:text-gray-400"
                                        onBlur={(e) => { if(e.target.value.trim()) setManualImage(e.target.value.trim()) }}
                                        onKeyDown={(e) => { if(e.key === 'Enter' && e.currentTarget.value.trim()) setManualImage(e.currentTarget.value.trim()) }}
                                     />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <input placeholder="地點名稱" value={manualName} onChange={e => setManualName(e.target.value)} className="flex-1 p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl outline-none font-bold dark:text-white" />
                        <button onClick={handleAutoLocate} disabled={isLocating} className="px-4 rounded-2xl font-bold text-xs flex items-center gap-1 bg-[#6B8EAD] text-white disabled:opacity-50">
                            {isLocating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-location-dot"></i>}<span>定位</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl flex items-center justify-between"><span className="text-[10px] text-gray-400 font-bold">緯度</span><input type="number" value={manualLat} onChange={e => setManualLat(e.target.value)} className="bg-transparent w-full text-right font-mono text-sm font-bold dark:text-white outline-none" /></div>
                         <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl flex items-center justify-between"><span className="text-[10px] text-gray-400 font-bold">經度</span><input type="number" value={manualLng} onChange={e => setManualLng(e.target.value)} className="bg-transparent w-full text-right font-mono text-sm font-bold dark:text-white outline-none" /></div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1 bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl"><label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">抵達時間</label><input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} className="w-full bg-transparent outline-none font-bold dark:text-white dark:[color-scheme:dark]" /></div>
                        <div className="flex-1 bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl relative"><label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">類別</label><select value={manualType} onChange={e => setManualType(e.target.value)} className="w-full bg-transparent outline-none appearance-none font-bold dark:text-gray-300">{availableTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select><div className="absolute right-3 bottom-3 pointer-events-none text-gray-500"><i className={`fa-solid ${getTypeIcon(manualType)}`}></i></div></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                         <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl"><label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">評價</label><input type="number" step="0.1" value={manualRating} onChange={e => setManualRating(e.target.value)} className="w-full bg-transparent outline-none font-bold text-sm dark:text-white" /></div>
                         <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl"><label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">預算</label><input value={manualPrice} onChange={e => setManualPrice(e.target.value)} className="w-full bg-transparent outline-none font-bold text-sm dark:text-white" /></div>
                         <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl"><label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">營業時間</label><input value={manualOpenTime} onChange={e => setManualOpenTime(e.target.value)} className="w-full bg-transparent outline-none font-bold text-sm dark:text-white" /></div>
                    </div>
                    <textarea value={manualDesc} onChange={e => setManualDesc(e.target.value)} rows={3} className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl outline-none text-sm dark:text-white" placeholder="備註..." />
                    <button onClick={handleSaveManual} disabled={!manualName} className="w-full py-4 rounded-2xl font-black text-white bg-[#6B8EAD] dark:bg-blue-600 shadow-xl disabled:opacity-30">確認儲存</button>
                </div>
            </div>
        </div>
      )}

      {/* 新增航班 Modal - 點擊「新增航班」後顯示 */}
      {showFlightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/10 my-auto">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold dark:text-white">{editingItemId ? '編輯航班' : '新增航班'}</h3><button onClick={() => setShowFlightModal(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800"><i className="fa-solid fa-xmark"></i></button></div>
                
                <div className="space-y-4">
                    {/* 類型選擇 */}
                    <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
                        <button onClick={() => setFlightType('arrival')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${flightType === 'arrival' ? 'bg-white dark:bg-slate-700 shadow-sm text-green-600' : 'text-gray-400'}`}>抵達 (Arrival)</button>
                        <button onClick={() => setFlightType('departure')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${flightType === 'departure' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-gray-400'}`}>出發 (Departure)</button>
                    </div>

                    {/* 航班編號 */}
                    <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl">
                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">航班編號 (Flight No.)</label>
                        <input type="text" value={flightNo} onChange={e => setFlightNo(e.target.value.toUpperCase())} placeholder="e.g. BR198" className="w-full bg-transparent outline-none font-black text-lg dark:text-white uppercase" />
                    </div>

                    {/* 機場與航廈 */}
                    <div className="flex gap-2">
                         <div className="flex-1 bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl">
                             <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">出發地</label>
                             <div className="flex gap-2">
                                <input value={flightOrigin} onChange={e => setFlightOrigin(e.target.value.toUpperCase())} placeholder="TPE" className="w-full bg-transparent outline-none font-bold dark:text-white uppercase" />
                                <input value={flightOriginTerminal} onChange={e => setFlightOriginTerminal(e.target.value)} placeholder="T1" className="w-10 text-center bg-gray-200 dark:bg-slate-700 rounded text-xs font-bold outline-none" />
                             </div>
                         </div>
                         <div className="flex items-center text-gray-300"><i className="fa-solid fa-plane"></i></div>
                         <div className="flex-1 bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl">
                             <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">目的地</label>
                             <div className="flex gap-2">
                                <input value={flightDestination} onChange={e => setFlightDestination(e.target.value.toUpperCase())} placeholder="NRT" className="w-full bg-transparent outline-none font-bold dark:text-white uppercase" />
                                <input value={flightDestTerminal} onChange={e => setFlightDestTerminal(e.target.value)} placeholder="T2" className="w-10 text-center bg-gray-200 dark:bg-slate-700 rounded text-xs font-bold outline-none" />
                             </div>
                         </div>
                    </div>

                    {/* 時間 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl"><label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">出發時間</label><input type="time" value={flightDepTime} onChange={e => setFlightDepTime(e.target.value)} className="w-full bg-transparent outline-none font-bold dark:text-white dark:[color-scheme:dark]" /></div>
                        <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl"><label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">抵達時間</label><input type="time" value={flightArrTime} onChange={e => setFlightArrTime(e.target.value)} className="w-full bg-transparent outline-none font-bold dark:text-white dark:[color-scheme:dark]" /></div>
                    </div>

                    {/* 登機門與座位 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl"><label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">登機門 (Gate)</label><input value={flightGate} onChange={e => setFlightGate(e.target.value)} placeholder="--" className="w-full bg-transparent outline-none font-bold dark:text-white" /></div>
                        <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl"><label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">座位 (Seat)</label><input value={flightSeat} onChange={e => setFlightSeat(e.target.value)} placeholder="--" className="w-full bg-transparent outline-none font-bold dark:text-white" /></div>
                    </div>

                    <button onClick={handleSaveFlight} disabled={!flightNo || !flightOrigin} className="w-full py-4 rounded-2xl font-black text-white bg-[#6B8EAD] dark:bg-blue-600 shadow-xl disabled:opacity-30">儲存航班資訊</button>
                </div>
            </div>
        </div>
      )}

      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/10">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold dark:text-white">AI 智能排程</h3><button onClick={() => setShowAiModal(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800"><i className="fa-solid fa-xmark"></i></button></div>
                <textarea className="w-full p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl outline-none resize-none h-32 text-sm dark:text-white" placeholder="我想去..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
                <button onClick={handleAiGenerate} disabled={isGenerating || !aiPrompt.trim()} className="w-full mt-6 py-3 rounded-xl font-bold text-white bg-[#6B8EAD] dark:bg-blue-600">{isGenerating ? '生成中...' : '生成行程'}</button>
            </div>
        </div>
      )}

      {/* PURE GLASS NEON DELETE CONFIRMATION */}
      {deleteConfirmation && (
         <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/10 dark:bg-black/40 backdrop-blur-md p-4 animate-fade-in">
             <div className="relative p-[1.5px] rounded-[2.8rem] bg-gradient-to-tr from-[#5AC8FA] via-[#AF52DE] to-[#FF2D55] dark:from-[#FF2D55] dark:via-[#AF52DE] dark:to-[#5AC8FA] shadow-[0_20px_60px_-15px_rgba(175,82,222,0.3)] dark:shadow-[0_20px_70px_-10px_rgba(175,82,222,0.5)] animate-scale-up max-w-sm w-full">
                <div className="absolute inset-0 rounded-[2.8rem] opacity-30 dark:opacity-40 blur-3xl bg-gradient-to-tr from-[#5AC8FA] via-[#AF52DE] to-[#FF2D55] dark:from-[#FF2D55] dark:via-[#AF52DE] dark:to-[#5AC8FA] -z-10"></div>
                <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-[50px] rounded-[2.7rem] overflow-hidden p-9 text-center border border-white/40 dark:border-white/5">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-inner">
                        <i className="fa-solid fa-trash-can text-2xl"></i>
                    </div>
                    <h3 className="text-2xl font-black text-black dark:text-white mb-3 tracking-tight">確認刪除？</h3>
                    <p className="text-gray-700 dark:text-gray-300 font-bold mb-9 leading-relaxed text-sm">
                        此動作無法復原，確定要永久刪除此項目嗎？
                    </p>
                    <div className="flex gap-4">
                        <button onClick={() => setDeleteConfirmation(null)} className="flex-1 py-4 bg-white/50 dark:bg-white/5 rounded-2xl font-black text-gray-700 dark:text-gray-300 border border-black/5 dark:border-white/10 hover:bg-white/80 transition-all active:scale-95 text-sm">取消</button>
                        <button onClick={confirmDelete} className="flex-1 py-4 bg-gradient-to-r from-[#FF3B30] to-[#FF2D55] text-white rounded-2xl font-black shadow-lg shadow-red-500/30 hover:brightness-110 transition-all active:scale-95 text-sm">刪除</button>
                    </div>
                </div>
             </div>
         </div>
      )}
    </div>
  );
};

export default ItineraryView;