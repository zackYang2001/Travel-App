import React, { useState, useEffect, useRef } from 'react';
import { DayItinerary } from '../types';

declare global {
  interface Window {
    L: any;
  }
}

interface MapViewProps {
  days: DayItinerary[];
  isDarkMode: boolean;
}

const MapView: React.FC<MapViewProps> = ({ days, isDarkMode }) => {
  const [selectedDayId, setSelectedDayId] = useState<string>(days[0]?.id || '');
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  // When days change (e.g. switch trip), reset selectedDayId if needed
  useEffect(() => {
     if (days.length > 0 && !days.find(d => d.id === selectedDayId)) {
         setSelectedDayId(days[0].id);
     }
  }, [days, selectedDayId]);

  const currentDay = days.find(d => d.id === selectedDayId) || days[0];
  // Filter items that have coordinates
  const mapItems = currentDay ? currentDay.items.filter(item => item.lat && item.lng) : [];

  // Calculate Distances
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c; // Distance in km
  };

  const totalDistance = mapItems.reduce((acc, item, idx) => {
    if (idx === 0) return 0;
    const prev = mapItems[idx - 1];
    return acc + calculateDistance(prev.lat!, prev.lng!, item.lat!, item.lng!);
  }, 0);

  // Helper for Travel Mode
  const getTravelMode = (dist: number) => {
      if (dist <= 2) {
          // Walking: ~15 min/km (relaxed pace)
          const mins = Math.ceil(dist * 15);
          return { label: '步行', icon: 'fa-person-walking', time: mins };
      } else {
          // Driving: ~2.5 min/km + 5 min buffer (city traffic)
          const mins = Math.ceil(dist * 2.5) + 5;
          return { label: '車程', icon: 'fa-car', time: mins };
      }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      // Default initialization
      mapInstanceRef.current = window.L.map(mapContainerRef.current, {
          zoomControl: false // We can add custom zoom control if needed, or leave it cleaner
      }).setView([31.2304, 121.4737], 13);
    }
    
    // Update Tile Layer based on Dark Mode
    const map = mapInstanceRef.current;
    
    // Clean up existing layers if any (to switch theme)
    map.eachLayer((layer: any) => {
        if (layer instanceof window.L.TileLayer) {
            map.removeLayer(layer);
        }
    });

    const tileUrl = isDarkMode 
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png' 
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    
    window.L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
    }).addTo(map);

    // Fix map size issues when tab switching
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

    // Clear existing markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (polylineRef.current) map.removeLayer(polylineRef.current);

    // Add new markers
    const latLngs: any[] = [];

    mapItems.forEach((item, index) => {
      const lat = item.lat!;
      const lng = item.lng!;
      latLngs.push([lat, lng]);

      const iconHtml = `
        <div class="marker-pin"></div>
        <span class="marker-text">${index + 1}</span>
      `;

      const customIcon = window.L.divIcon({
        className: 'custom-div-icon',
        html: iconHtml,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
      });

      const tooltipContent = `
        <div class="text-center min-w-[100px]">
            <div class="font-bold text-sm text-gray-800 leading-tight">${item.location}</div>
            <div class="text-[10px] text-blue-500 font-bold mt-1 bg-blue-50 inline-block px-1.5 rounded">${item.time}</div>
        </div>
      `;

      const marker = window.L.marker([lat, lng], { icon: customIcon })
        .addTo(map)
        .bindTooltip(tooltipContent, { 
            direction: 'top', 
            offset: [0, -45], 
            permanent: false, // Only show on hover
            opacity: 1,
            className: 'custom-leaflet-tooltip' // We'll add styles for this
        });
      
      markersRef.current.push(marker);
    });

    // Add User Location (Mock)
    const userLat = mapItems.length > 0 ? mapItems[0].lat! + 0.005 : 31.235;
    const userLng = mapItems.length > 0 ? mapItems[0].lng! + 0.005 : 121.470;
    const userIcon = window.L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="width:16px;height:16px;background:#007AFF;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.2);"></div>`,
        iconSize: [20, 20]
    });
    const userMarker = window.L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    markersRef.current.push(userMarker);

    // Draw Route
    if (latLngs.length > 1) {
      polylineRef.current = window.L.polyline(latLngs, {
        color: isDarkMode ? '#10b981' : '#10b981', // Keep Green for now
        weight: 5,
        opacity: 0.8,
        dashArray: '1, 10',
        lineCap: 'round'
      }).addTo(map);
      
      map.fitBounds(window.L.latLngBounds(latLngs).pad(0.3)); // Increased padding for better view
    } else if (latLngs.length === 1) {
        map.setView(latLngs[0], 14);
    }

  }, [selectedDayId, mapItems, isDarkMode]); 

  // Inject Custom Styles for Tooltip
  useEffect(() => {
      const style = document.createElement('style');
      style.innerHTML = `
        .custom-leaflet-tooltip {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(0,0,0,0.05);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            padding: 8px 12px;
            font-family: system-ui, -apple-system, sans-serif;
        }
        .custom-leaflet-tooltip::before {
            border-top-color: rgba(255, 255, 255, 0.95);
        }
      `;
      document.head.appendChild(style);
      return () => { document.head.removeChild(style); };
  }, []);

  if (!currentDay) return <div className="p-10 text-center text-gray-400 dark:text-gray-500">請先建立行程天數</div>;

  return (
    <div 
        className="h-full w-full relative bg-[#F2F2F7] dark:bg-slate-950 overflow-hidden"
        onTouchStart={(e) => e.stopPropagation()} 
        onTouchEnd={(e) => e.stopPropagation()}
    >
      
      {/* Map Area - Full Screen Absolute */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-gray-200 dark:bg-slate-800"></div>

      {/* Day Selector Pill (Floating Top) */}
      <div className="absolute top-6 left-0 right-0 z-[400] flex justify-center px-4 pointer-events-none">
        <div className="bg-white dark:bg-slate-800 shadow-lg shadow-black/5 rounded-full p-1.5 flex gap-1 overflow-x-auto max-w-full pointer-events-auto border border-white/50 dark:border-white/10 no-scrollbar">
            {days.map(d => (
                <button 
                    key={d.id}
                    onClick={() => setSelectedDayId(d.id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedDayId === d.id ? 'bg-[#007AFF] text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                >
                    {d.dayLabel}
                </button>
            ))}
        </div>
      </div>

      {/* Info Panel & Route List (Glass Bottom Sheet) - Collapsible */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-10 flex flex-col bg-white/60 dark:bg-slate-900/80 backdrop-blur-xl rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-white/40 dark:border-white/5 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)`}
        style={{ height: isPanelExpanded ? '55vh' : '160px' }}
      >
         {/* Drag Handle Area - Clickable to toggle */}
         <div 
            className="w-full h-6 flex items-center justify-center cursor-pointer hover:bg-white/10 rounded-t-[2.5rem] transition-colors"
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
         >
             <div className="w-12 h-1 bg-gray-300/60 dark:bg-slate-600 rounded-full mt-2"></div>
         </div>

         {/* Stats Summary - Always Visible, Clickable to toggle */}
         <div 
            className="px-6 pb-4 border-b border-white/10 flex items-center justify-between cursor-pointer group"
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
         >
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center border border-blue-100 dark:border-blue-900/50 shrink-0 shadow-sm">
                    <i className="fa-solid fa-location-arrow text-sm"></i>
                 </div>
                 <div>
                     <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">目前位置</p>
                     <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">上海市中心 (模擬)</p>
                 </div>
             </div>
             
             <div className="text-right flex items-center gap-4">
                 <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">今日里程</p>
                    <div className="flex items-baseline justify-end gap-1">
                        <span className="font-mono font-black text-xl text-emerald-600 dark:text-emerald-400">{totalDistance.toFixed(1)}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">km</span>
                    </div>
                 </div>
                 <div className="w-6 h-6 rounded-full bg-gray-100/50 dark:bg-slate-700/50 flex items-center justify-center text-gray-400 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-blue-500 transition-all">
                    <i className={`fa-solid fa-chevron-${isPanelExpanded ? 'down' : 'up'} text-xs`}></i>
                 </div>
             </div>
         </div>

         {/* Route Header & List - Hidden when collapsed */}
         <div className={`flex flex-col flex-1 overflow-hidden transition-opacity duration-300 ${isPanelExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="px-6 py-2 bg-white/20 dark:bg-slate-800/20 flex justify-between items-center border-b border-white/10 shrink-0">
                <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-route"></i> 路線規劃
                </h4>
                <span className="text-[10px] font-bold bg-white/50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-md">{mapItems.length} 個地點</span>
            </div>

            {/* Scrollable List */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 pb-36 no-scrollbar">
                {mapItems.map((item, idx) => {
                const nextItem = mapItems[idx + 1];
                const dist = nextItem ? calculateDistance(item.lat!, item.lng!, nextItem.lat!, nextItem.lng!) : 0;
                const travelMode = nextItem ? getTravelMode(dist) : null;

                return (
                    <div key={item.id} className="relative pl-2 group">
                        {/* Connection Line */}
                        {idx !== mapItems.length - 1 && (
                            <div className="absolute left-[23px] top-8 bottom-[-16px] w-0.5 bg-gray-300/50 dark:bg-slate-700 group-hover:bg-blue-300/50 transition-colors"></div>
                        )}
                        
                        <div className="flex gap-4">
                            <div className="relative z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 transition-all">
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                                <div className="flex justify-between items-baseline">
                                    <span className="font-bold text-gray-900 dark:text-white text-sm truncate">{item.location}</span>
                                    <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">{item.time}</span>
                                </div>
                                {travelMode && (
                                    <div className="mt-3 mb-1 flex items-center gap-3 text-[10px] text-gray-600 dark:text-gray-300 font-bold bg-white/50 dark:bg-slate-800/50 border border-white/40 dark:border-white/5 p-2 rounded-xl w-fit shadow-sm backdrop-blur-sm">
                                        <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400">
                                            <i className={`fa-solid ${travelMode.icon}`}></i>
                                            <span>{travelMode.label}</span>
                                        </div>
                                        <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-slate-600"></span>
                                        <span>約 {travelMode.time} 分鐘</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-slate-600"></span>
                                        <span>{dist.toFixed(1)} km</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
                })}
                {mapItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 opacity-50 py-10">
                        <i className="fa-solid fa-map-location-dot text-3xl"></i>
                        <p className="text-xs font-bold">地圖上沒有行程點</p>
                    </div>
                )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default MapView;