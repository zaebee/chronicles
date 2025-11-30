import React, { useMemo } from 'react';
import { Backpack, Map as MapIcon, Scroll, MapPin, Flag, Navigation, Mountain, TreePine, Home, Landmark, Tent, Waves, Compass } from 'lucide-react';

interface SidebarProps {
  inventory: string[];
  currentQuest: string;
  locationHistory: string[];
  labels: {
    journal: string;
    quest: string;
    inventory: string;
    empty: string;
    awaiting: string;
    version: string;
    map: string;
  };
}

// Deterministic pseudo-random number generator for consistent map layout
const pseudoRandom = (seed: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) / 4294967296);
};

// Helper to determine icon based on location name
const getMapIcon = (name: string, size: number = 14, className: string = "") => {
  const n = name.toLowerCase();
  const props = { size, className };
  
  if (n.includes('forest') || n.includes('wood') || n.includes('grove') || n.includes('jungle')) 
    return <TreePine {...props} />;
  if (n.includes('mountain') || n.includes('hill') || n.includes('peak') || n.includes('cliff') || n.includes('rock')) 
    return <Mountain {...props} />;
  if (n.includes('castle') || n.includes('fort') || n.includes('keep') || n.includes('tower') || n.includes('palace') || n.includes('citadel')) 
    return <Landmark {...props} />;
  if (n.includes('inn') || n.includes('tavern') || n.includes('house') || n.includes('home') || n.includes('village') || n.includes('town') || n.includes('city')) 
    return <Home {...props} />;
  if (n.includes('camp') || n.includes('tent') || n.includes('outpost')) 
    return <Tent {...props} />;
  if (n.includes('river') || n.includes('lake') || n.includes('sea') || n.includes('ocean') || n.includes('coast') || n.includes('beach')) 
    return <Waves {...props} />;
  
  return <MapPin {...props} />;
};

export const Sidebar: React.FC<SidebarProps> = ({ inventory, currentQuest, locationHistory, labels }) => {
  
  // Generate map nodes
  const mapNodes = useMemo(() => {
    return locationHistory.map((loc, index) => {
      const seed = `${loc}-${index}`;
      const xPercent = 25 + (pseudoRandom(seed) * 50); // 25% to 75%
      return {
        name: loc,
        x: xPercent,
        y: index * 80 + 50, // Increased vertical spacing
        id: index
      };
    });
  }, [locationHistory]);

  const mapHeight = Math.max(300, mapNodes.length * 80 + 100);

  // Generate terrain features for background
  const terrainFeatures = useMemo(() => {
    const features = [];
    const count = Math.floor(mapHeight / 100) * 3; // Density based on height
    const seedBase = locationHistory.length > 0 ? locationHistory[0] : "genesis";

    for (let i = 0; i < count; i++) {
      const seed = `${seedBase}-terrain-${i}`;
      const y = pseudoRandom(seed + 'y') * mapHeight;
      const x = pseudoRandom(seed + 'x') * 100;
      
      // Keep away from center path roughly
      if (x > 20 && x < 80) continue;

      const type = pseudoRandom(seed + 't') > 0.6 ? 'mountain' : 'tree';
      const scale = 0.8 + pseudoRandom(seed + 's') * 0.5;
      
      features.push({ x, y, type, scale, id: i });
    }
    return features;
  }, [mapHeight, locationHistory]);

  const pathData = useMemo(() => {
    if (mapNodes.length < 2) return "";
    let d = `M ${mapNodes[0].x}% ${mapNodes[0].y}`;
    for (let i = 1; i < mapNodes.length; i++) {
      const curr = mapNodes[i];
      const prev = mapNodes[i-1];
      // Bezier curve for smooth path
      const cp1y = prev.y + 40;
      const cp2y = curr.y - 40;
      d += ` C ${prev.x}% ${cp1y}, ${curr.x}% ${cp2y}, ${curr.x}% ${curr.y}`;
    }
    return d;
  }, [mapNodes]);

  return (
    <div className="w-full md:w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="p-6 space-y-8">
        
        {/* Header */}
        <div>
           <h2 className="text-xl font-bold text-amber-500 mb-1 flex items-center gap-2 font-serif">
            <Scroll size={20} />
            <span>{labels.journal}</span>
           </h2>
           <div className="h-0.5 w-full bg-zinc-800 rounded-full"></div>
        </div>

        {/* Quest Section */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-amber-900/20 to-zinc-900/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <div className="relative bg-zinc-900/80 p-4 rounded-xl border border-zinc-700/50 shadow-sm backdrop-blur-sm">
            <h3 className="text-xs uppercase tracking-widest text-amber-500/80 font-bold mb-3 flex items-center gap-2">
              <Flag size={14} /> {labels.quest}
            </h3>
            <p className="text-zinc-200 font-medium leading-relaxed font-serif text-lg">
              {currentQuest || labels.awaiting}
            </p>
          </div>
        </div>

        {/* Enhanced Visual Map Section */}
        <div className="relative bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden shadow-inner flex flex-col">
            {/* Map Header */}
            <div className="p-3 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur flex justify-between items-center relative z-20 shrink-0 shadow-md">
                 <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-2">
                    <MapIcon size={14} /> {labels.map}
                </h3>
                <Compass size={16} className="text-amber-600/50 animate-pulse" />
            </div>

            {/* Scrollable Map Area */}
            <div className="relative w-full h-80 overflow-y-auto custom-scrollbar bg-[#111] overflow-x-hidden" 
                 ref={(el) => { 
                   if (el) {
                     requestAnimationFrame(() => {
                        el.scrollTop = el.scrollHeight;
                     });
                   }
                 }}
            >
                {/* Background Texture */}
                <div className="absolute inset-0 pointer-events-none opacity-5" 
                     style={{ 
                         backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2v2H22v20h-2v-2h-2v2h-2v-2h-2v2h-2v-2h-2v2h-2v-2H0v-2h20v-2H0v-2h20v-2H0v-2h20z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")` 
                     }}>
                </div>

                {locationHistory.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
                        <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800">
                             <Navigation size={32} className="opacity-50 text-amber-900" />
                        </div>
                        <span className="text-sm italic font-serif text-zinc-500">{labels.awaiting}</span>
                     </div>
                ) : (
                    <div className="relative w-full" style={{ height: mapHeight }}>
                        
                        {/* Terrain Features (Background Layer) */}
                        {terrainFeatures.map((f) => (
                          <div 
                            key={f.id}
                            className="absolute text-zinc-800 pointer-events-none transition-opacity duration-1000 ease-in"
                            style={{ 
                              left: `${f.x}%`, 
                              top: f.y, 
                              transform: `scale(${f.scale}) translate(-50%, -50%)`,
                              opacity: 0.3
                            }}
                          >
                            {f.type === 'tree' ? <TreePine size={32} /> : <Mountain size={40} />}
                          </div>
                        ))}

                        {/* Connecting Path (SVG Layer) */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                            <defs>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                                    <feMerge>
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                            </defs>
                            {/* Outer glow line */}
                            <path d={pathData} fill="none" stroke="#451a03" strokeWidth="6" strokeOpacity="0.2" strokeLinecap="round" />
                            {/* Main path */}
                            <path d={pathData} fill="none" stroke="#78350f" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" />
                        </svg>

                        {/* Nodes (Interactive Layer) */}
                        {mapNodes.map((node, i) => {
                            const isCurrent = i === mapNodes.length - 1;
                            return (
                                <div 
                                    key={i} 
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-default z-10"
                                    style={{ left: `${node.x}%`, top: node.y }}
                                >
                                    {/* Icon Circle */}
                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 relative bg-zinc-900 ${
                                        isCurrent 
                                            ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-110 text-amber-400' 
                                            : 'border-zinc-700 text-zinc-600 group-hover:border-zinc-500 group-hover:text-zinc-400'
                                    }`}>
                                        {isCurrent && <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping"></div>}
                                        {getMapIcon(node.name, 14)}
                                    </div>
                                    
                                    {/* Label */}
                                    <div className={`mt-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all max-w-[140px] truncate shadow-xl border backdrop-blur-md ${
                                        isCurrent
                                            ? 'bg-amber-950/90 text-amber-100 border-amber-800/50'
                                            : 'bg-black/60 text-zinc-500 border-zinc-800 group-hover:text-zinc-300 group-hover:border-zinc-600'
                                    }`}>
                                        {node.name}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* Inventory Section */}
        <div className="flex-grow">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-4 flex items-center gap-2 px-1">
            <Backpack size={14} /> {labels.inventory}
          </h3>
          {inventory.length === 0 ? (
            <div className="text-zinc-600 italic text-sm text-center py-8 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/50">
                {labels.empty}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {inventory.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors group">
                  <div className="w-8 h-8 rounded bg-zinc-950 flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600">
                    <span className="text-amber-600 text-sm">✦</span>
                  </div>
                  <span className="text-sm text-zinc-300 font-medium leading-tight">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-auto p-4 border-t border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-600 text-center bg-zinc-950">
         {labels.version}
      </div>
    </div>
  );
};
