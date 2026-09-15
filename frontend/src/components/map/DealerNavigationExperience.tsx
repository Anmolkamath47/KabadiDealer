import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  mapService,
  MapCoordinates,
  DrivingRouteResult,
} from '../../services/mapService';
import {
  ArrowLeft,
  Headset,
  MoreVertical,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  Navigation,
  Phone,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  Play,
  RotateCcw,
} from 'lucide-react';

export type NavigationPhase = 'en_route' | 'near_customer' | 'arrived';

interface DealerNavigationExperienceProps {
  customerCoords?: [number, number]; // [lng, lat]
  customerAddress?: string;
  customerName?: string;
  customerPhone?: string;
  dealerCoords?: [number, number]; // [lng, lat]
  initialPhase?: NavigationPhase;
  onBack?: () => void;
  onEndNavigation?: () => void;
  onMarkAsArrived?: () => void;
  onSendLivePing?: (coords: [number, number]) => void;
}

export const DealerNavigationExperience: React.FC<DealerNavigationExperienceProps> = ({
  customerCoords,
  customerAddress = 'A-203, Green Park Apartments, Sector 21, Noida',
  customerName = 'Priya Sharma',
  customerPhone = '+91 98765 43210',
  dealerCoords,
  initialPhase = 'en_route',
  onBack,
  onEndNavigation,
  onMarkAsArrived,
  onSendLivePing,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const dealerMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.FeatureGroup | null>(null);
  const simulationIntervalRef = useRef<any>(null);

  // Phases: 'en_route' | 'near_customer' | 'arrived'
  const [phase, setPhase] = useState<NavigationPhase>(initialPhase);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);
  const [routeData, setRouteData] = useState<DrivingRouteResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState<boolean>(false);
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);

  // Default Delhi NCR Coordinates for realistic fallback
  const defaultCustLng = 77.3452;
  const defaultCustLat = 28.5834;

  const validCustLng =
    customerCoords && typeof customerCoords[0] === 'number' && !isNaN(customerCoords[0])
      ? customerCoords[0]
      : defaultCustLng;
  const validCustLat =
    customerCoords && typeof customerCoords[1] === 'number' && !isNaN(customerCoords[1])
      ? customerCoords[1]
      : defaultCustLat;

  // Initial dealer coordinate offsets: ~2.4 km away
  const startDealerLng = validCustLng - 0.018;
  const startDealerLat = validCustLat - 0.016;

  const [currentDealerCoords, setCurrentDealerCoords] = useState<[number, number]>(() => {
    if (dealerCoords && typeof dealerCoords[0] === 'number' && !isNaN(dealerCoords[0])) {
      return dealerCoords;
    }
    return [startDealerLng, startDealerLat];
  });

  const [heading, setHeading] = useState<number>(38);

  // Society / Building name extracted for labels matching mockup
  const displayBuilding = useMemo(() => {
    if (!customerAddress) return 'Green Park Apartments';
    const parts = customerAddress.split(',');
    if (parts.length > 1) {
      return parts[1].trim() || parts[0].trim();
    }
    return customerAddress;
  }, [customerAddress]);

  const displayArea = useMemo(() => {
    if (!customerAddress) return 'Sector 21';
    const parts = customerAddress.split(',');
    if (parts.length > 2) {
      return parts[2].trim();
    }
    return 'Sector 21';
  }, [customerAddress]);

  // Voice Speech Synthesis Helper
  const speakInstruction = (text: string) => {
    if (isVoiceMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore audio synthesis errors
    }
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const custPoint: MapCoordinates = {
      lng: validCustLng,
      lat: validCustLat,
    };

    let timer: any = null;
    let resizeObserver: ResizeObserver | null = null;

    if (!mapInstanceRef.current) {
      const { map } = mapService.createMap(
        mapContainerRef.current,
        custPoint,
        16,
        'street'
      );

      // Customer Red Pin Marker with Apartment Name Label
      customerMarkerRef.current = L.marker([validCustLat, validCustLng], {
        icon: mapService.buildRedDestinationPinIcon(displayBuilding),
      }).addTo(map);

      // Initial Dealer Arrow Marker
      dealerMarkerRef.current = L.marker([currentDealerCoords[1], currentDealerCoords[0]], {
        icon: mapService.buildNavigationArrowIcon(heading),
      }).addTo(map);

      mapInstanceRef.current = map;

      timer = setTimeout(() => {
        map.invalidateSize();
      }, 150);

      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(mapContainerRef.current);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        dealerMarkerRef.current = null;
        customerMarkerRef.current = null;
        routePolylineRef.current = null;
      }
    };
  }, []);

  // 2. Fetch driving road route between Dealer and Customer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const dealerPoint: MapCoordinates = {
      lng: currentDealerCoords[0],
      lat: currentDealerCoords[1],
    };
    const custPoint: MapCoordinates = {
      lng: validCustLng,
      lat: validCustLat,
    };

    mapService
      .fetchDrivingRoute(dealerPoint, custPoint)
      .then((route) => {
        setRouteData(route);
        if (routePolylineRef.current) {
          routePolylineRef.current.remove();
        }
        routePolylineRef.current = mapService.drawNavigationRoute(map, route.coordinates);

        // Frame camera based on phase
        if (phase === 'en_route') {
          mapService.fitBounds(map, [dealerPoint, custPoint]);
        } else if (phase === 'near_customer') {
          map.setView([dealerPoint.lat, dealerPoint.lng], 17, { animate: true });
        } else {
          map.setView([custPoint.lat, custPoint.lng], 18, { animate: true });
        }
      })
      .catch((err) => {
        console.warn('Navigation route error:', err);
      });
  }, [validCustLng, validCustLat]);

  // 3. Update dealer marker position, heading, and icon based on Phase
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (phase === 'arrived') {
      // When arrived: Show the pulsing blue beacon right at the customer destination
      if (dealerMarkerRef.current) {
        dealerMarkerRef.current.setLatLng([validCustLat - 0.00018, validCustLng - 0.00015]);
        dealerMarkerRef.current.setIcon(mapService.buildArrivalBeaconIcon());
      }
      map.setView([validCustLat, validCustLng], 18, { animate: true });
      speakInstruction('You have arrived at your destination.');
    } else {
      // En Route or Near Customer: Show 3D blue navigation pointer arrow
      if (dealerMarkerRef.current) {
        dealerMarkerRef.current.setLatLng([currentDealerCoords[1], currentDealerCoords[0]]);
        dealerMarkerRef.current.setIcon(mapService.buildNavigationArrowIcon(heading));
      }

      if (phase === 'near_customer') {
        speakInstruction(`In 50 meters, turn left into ${displayBuilding}`);
      } else if (phase === 'en_route') {
        speakInstruction(`Head towards ${displayArea}, then turn right`);
      }
    }
  }, [phase, currentDealerCoords, heading, validCustLat, validCustLng, displayBuilding, displayArea]);

  // Switch phase manually (or via test buttons)
  const setPhaseDirectly = (targetPhase: NavigationPhase) => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      setIsSimulating(false);
    }
    setPhase(targetPhase);

    if (targetPhase === 'en_route') {
      const p: [number, number] = [startDealerLng, startDealerLat];
      setCurrentDealerCoords(p);
      setHeading(38);
      if (mapInstanceRef.current) {
        mapService.fitBounds(mapInstanceRef.current, [
          { lng: p[0], lat: p[1] },
          { lng: validCustLng, lat: validCustLat },
        ]);
      }
    } else if (targetPhase === 'near_customer') {
      const p: [number, number] = [validCustLng - 0.0028, validCustLat - 0.0022];
      setCurrentDealerCoords(p);
      setHeading(55);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([p[1], p[0]], 17, { animate: true });
      }
    } else if (targetPhase === 'arrived') {
      const p: [number, number] = [validCustLng - 0.00018, validCustLat - 0.00015];
      setCurrentDealerCoords(p);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([validCustLat, validCustLng], 18, { animate: true });
      }
    }
  };

  // Drive Simulation: Animates dealer arrow along road coordinates towards destination
  const handleToggleSimulation = () => {
    if (isSimulating) {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      setIsSimulating(false);
      return;
    }

    if (!routeData || routeData.coordinates.length < 2) {
      return;
    }

    setIsSimulating(true);
    let stepIndex = 0;
    const coords = routeData.coordinates;
    const totalSteps = coords.length;

    // Reset to start
    setPhase('en_route');
    setCurrentDealerCoords([coords[0][1], coords[0][0]]);

    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);

    simulationIntervalRef.current = setInterval(() => {
      stepIndex += 1;
      if (stepIndex >= totalSteps - 1) {
        // Arrived at destination
        clearInterval(simulationIntervalRef.current);
        setIsSimulating(false);
        setPhase('arrived');
        const finalPoint: [number, number] = [validCustLng, validCustLat];
        setCurrentDealerCoords(finalPoint);
        if (onSendLivePing) onSendLivePing(finalPoint);
        return;
      }

      const prev = coords[stepIndex - 1];
      const curr = coords[stepIndex];
      const newBearing = mapService.calculateBearing([prev[0], prev[1]], [curr[0], curr[1]]);

      setHeading(newBearing);
      const newPos: [number, number] = [curr[1], curr[0]];
      setCurrentDealerCoords(newPos);
      if (onSendLivePing) onSendLivePing(newPos);

      // Transition phase as distance shortens
      const remainingProgress = (totalSteps - stepIndex) / totalSteps;
      if (remainingProgress <= 0.25 && phase !== 'near_customer') {
        setPhase('near_customer');
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([curr[0], curr[1]], phase === 'near_customer' ? 17 : 16, {
          animate: true,
        });
      }
    }, 700);
  };

  // Map Camera Controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    if (phase === 'arrived') {
      mapInstanceRef.current.setView([validCustLat, validCustLng], 18, { animate: true });
    } else {
      mapInstanceRef.current.setView(
        [currentDealerCoords[1], currentDealerCoords[0]],
        phase === 'near_customer' ? 17 : 16,
        { animate: true }
      );
    }
  };

  // Toggle Voice Audio
  const handleToggleVoice = () => {
    const nextState = !isVoiceMuted;
    setIsVoiceMuted(nextState);
    if (!nextState) {
      if (phase === 'en_route') speakInstruction(`Voice navigation on. Head towards ${displayArea}.`);
      if (phase === 'near_customer') speakInstruction(`Voice navigation on. Turn left into ${displayBuilding}.`);
      if (phase === 'arrived') speakInstruction('Voice navigation on. You have arrived.');
    }
  };

  // Calculated arrival time string (e.g. "9:49 AM")
  const getEtaTime = (mins: number) => {
    const d = new Date(Date.now() + mins * 60 * 1000);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minStr} ${ampm}`;
  };

  return (
    <div className="relative w-full h-[100dvh] max-w-md mx-auto bg-slate-100 overflow-hidden flex flex-col justify-between select-none font-sans shadow-2xl border-x border-slate-300">
      {/* Full-Screen Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* ================= TOP BAR & TURN HUD BANNER ================= */}
      <div className="relative z-20 w-full px-4 pt-1.5 pb-2 flex flex-col space-y-2 pointer-events-none">
        {/* iOS Device Status Bar (9:41, Cellular, WiFi, Battery) */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1 text-slate-900 text-xs font-bold pointer-events-none">
          <span className="font-bold text-[13px] tracking-tight">9:41</span>
          <div className="flex items-center space-x-1.5 text-slate-900">
            {/* Cellular */}
            <svg className="w-4 h-3 fill-current" viewBox="0 0 24 24">
              <rect x="2" y="14" width="3" height="6" rx="0.5"/>
              <rect x="7" y="10" width="3" height="10" rx="0.5"/>
              <rect x="12" y="6" width="3" height="14" rx="0.5"/>
              <rect x="17" y="2" width="3" height="18" rx="0.5"/>
            </svg>
            {/* Wifi */}
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z"/>
            </svg>
            {/* Battery */}
            <div className="w-5 h-2.5 border border-current rounded-xs p-0.5 flex items-center">
              <div className="w-full h-full bg-current rounded-2xs"></div>
            </div>
          </div>
        </div>

        {/* Top Header Row (Back button, Centered Title, Right Action) */}
        <div className="flex items-center justify-between pointer-events-auto">
          {/* Back Button */}
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-slate-200/80 flex items-center justify-center text-slate-800 hover:bg-slate-100 active:scale-95 transition"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Centered Dynamic Title matching mockups */}
          <div className="px-5 py-1.5 bg-white/95 backdrop-blur-md rounded-full shadow-md border border-slate-200/80">
            <h1 className="text-sm font-black text-slate-900 tracking-tight">
              {phase === 'en_route' && 'En Route'}
              {phase === 'near_customer' && 'Near Customer Location'}
              {phase === 'arrived' && 'Arrived'}
            </h1>
          </div>

          {/* Right Action Button: Headset for En Route & Near Customer, 3-dots for Arrived */}
          {phase === 'arrived' ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-slate-200/80 flex items-center justify-center text-slate-800 hover:bg-slate-100 active:scale-95 transition"
                title="Options"
              >
                <MoreVertical className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Arrived 3-Dots Dropdown Menu */}
              {showOptionsMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs font-semibold text-slate-700">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${validCustLat},${validCustLng}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-2 hover:bg-slate-50"
                  >
                    Open in Google Maps
                  </a>
                  <a href={`tel:${customerPhone}`} className="flex items-center px-3 py-2 hover:bg-slate-50">
                    Call Customer
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setShowSupportModal(true);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700"
                  >
                    Help & Support
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-slate-200/80 flex items-center justify-center text-slate-800 hover:bg-slate-100 active:scale-95 transition"
              title="Help & Support"
            >
              <Headset className="w-5 h-5 stroke-[2.2]" />
            </button>
          )}
        </div>

        {/* Turn-by-Turn Navigation HUD Banner (Dark Forest Green) */}
        {phase !== 'arrived' && (
          <div className="pointer-events-auto bg-[#046A38] text-white rounded-2xl p-4 shadow-xl border border-emerald-700/60 transition-all duration-300">
            {phase === 'en_route' ? (
              <div className="flex items-start space-x-3.5">
                {/* Left: White Straight Arrow & Distance */}
                <div className="flex flex-col items-center justify-center min-w-[56px] text-center pt-0.5">
                  <ArrowUp className="w-9 h-9 stroke-[3] text-white animate-pulse" />
                  <span className="text-xs font-black tracking-tight mt-1 text-white">200 m</span>
                </div>

                {/* Right: Head towards Sector 21, Then turn right */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="text-xs font-semibold text-emerald-100 tracking-tight">Head towards</div>
                  <div className="text-lg font-black text-white truncate leading-tight mt-0.5">
                    {displayArea}
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-200 mt-2">
                    <CornerUpRight className="w-4 h-4 stroke-[3] text-emerald-300 flex-shrink-0" />
                    <span>Then turn right</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start space-x-3.5">
                {/* Left: Left Turn Arrow & Distance (50m) */}
                <div className="flex flex-col items-center justify-center min-w-[56px] text-center pt-0.5">
                  <CornerUpLeft className="w-9 h-9 stroke-[3] text-white animate-pulse" />
                  <span className="text-xs font-black tracking-tight mt-1 text-white">50 m</span>
                </div>

                {/* Right: Turn left into Green Park Apartments */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="text-lg font-black text-white leading-tight">Turn left</div>
                  <div className="text-sm font-bold text-emerald-100 truncate leading-tight mt-0.5">
                    into {displayBuilding}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= RIGHT FLOATING MAP CONTROLS ================= */}
      <div className="relative z-20 mr-4 self-end mb-auto mt-auto flex flex-col space-y-2.5">
        {/* Sound / Voice Guidance Toggle */}
        <button
          type="button"
          onClick={handleToggleVoice}
          className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 flex items-center justify-center text-slate-800 hover:bg-slate-100 active:scale-95 transition"
          title={isVoiceMuted ? 'Unmute Voice Directions' : 'Mute Voice Directions'}
        >
          {isVoiceMuted ? (
            <VolumeX className="w-5 h-5 text-rose-500 stroke-[2.2]" />
          ) : (
            <Volume2 className="w-5 h-5 text-slate-800 stroke-[2.2]" />
          )}
        </button>

        {/* Zoom Controls Pill (+ / -) */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 flex flex-col overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-11 h-10 flex items-center justify-center text-slate-800 hover:bg-slate-100 active:scale-95 transition border-b border-slate-200/80"
            title="Zoom In"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-11 h-10 flex items-center justify-center text-slate-800 hover:bg-slate-100 active:scale-95 transition"
            title="Zoom Out"
          >
            <Minus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Recenter Compass Navigation Pointer */}
        <button
          type="button"
          onClick={handleRecenter}
          className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 flex items-center justify-center text-slate-800 hover:bg-slate-100 active:scale-95 transition"
          title="Recenter On Driver"
        >
          <Navigation className="w-5 h-5 fill-slate-800 stroke-[1.5] -rotate-45" />
        </button>
      </div>

      {/* ================= BOTTOM PANELS: ETA CARD OR ARRIVED SHEET ================= */}
      <div className="relative z-20 w-full p-4 flex flex-col space-y-3">
        {/* State Preview / Simulation Toolbar (Quickly view all 3 screens or watch live drive) */}
        <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 flex items-center justify-between text-[11px] font-bold text-white shadow-lg mx-auto w-full max-w-sm">
          <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider ml-1">Test State:</span>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setPhaseDirectly('en_route')}
              className={`px-2 py-1 rounded-full transition ${
                phase === 'en_route'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              En Route
            </button>
            <button
              type="button"
              onClick={() => setPhaseDirectly('near_customer')}
              className={`px-2 py-1 rounded-full transition ${
                phase === 'near_customer'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Near Customer
            </button>
            <button
              type="button"
              onClick={() => setPhaseDirectly('arrived')}
              className={`px-2 py-1 rounded-full transition ${
                phase === 'arrived'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Arrived
            </button>
          </div>

          {/* Drive Simulator Play/Pause */}
          <button
            type="button"
            onClick={handleToggleSimulation}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold transition ${
              isSimulating
                ? 'bg-amber-500 text-slate-950 animate-pulse'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white'
            }`}
            title="Simulate vehicle moving along road"
          >
            {isSimulating ? <RotateCcw className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isSimulating ? 'Driving...' : 'Drive'}</span>
          </button>
        </div>

        {/* SCREEN 1 & 2: FLOATING ETA CARD */}
        {phase !== 'arrived' ? (
          <div className="bg-white/98 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-2xl font-black text-[#046A38] tracking-tight">
                {phase === 'en_route' ? '8 min' : '1 min'}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">
                {phase === 'en_route'
                  ? `2.4 km • ${getEtaTime(8)}`
                  : `300 m • ${getEtaTime(1)}`}
              </div>
            </div>

            {/* End Button */}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Do you want to end navigation mode?')) {
                  if (onEndNavigation) onEndNavigation();
                }
              }}
              className="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs shadow-xs active:scale-95 transition"
            >
              End
            </button>
          </div>
        ) : (
          /* SCREEN 3: ARRIVED BOTTOM SHEET */
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4">
            {/* Arrived Title & Full Address */}
            <div className="text-center space-y-1">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">You have arrived</h2>
              <p className="text-xs font-medium text-slate-500 max-w-xs mx-auto leading-relaxed">
                {customerAddress}
              </p>
            </div>

            {/* Customer Contact Row */}
            <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <div className="w-11 h-11 rounded-full bg-slate-400 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{customerName}</div>
                  <div className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                    {customerPhone}
                  </div>
                </div>
              </div>

              <a
                href={`tel:${customerPhone}`}
                className="w-10 h-10 rounded-full bg-[#046A38] hover:bg-[#03542C] text-white flex items-center justify-center shadow-md active:scale-95 transition flex-shrink-0"
                title="Call Customer"
              >
                <Phone className="w-4 h-4 fill-white" />
              </a>
            </div>

            {/* Main Green Action Button: Mark as Arrived */}
            <button
              type="button"
              onClick={onMarkAsArrived}
              className="w-full bg-[#046A38] hover:bg-[#03542C] text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-lg active:scale-98 transition flex items-center justify-center space-x-2 tracking-wide"
            >
              <span>Mark as Arrived</span>
            </button>
          </div>
        )}

        {/* iOS Home Indicator Bar */}
        <div className="w-32 h-1 bg-slate-400/60 rounded-full mx-auto mt-0.5 pointer-events-none"></div>
      </div>

      {/* Support / Help Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-200">
              <Headset className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Partner Navigation Support</h3>
              <p className="text-xs text-slate-500 mt-1">
                Need route assistance or help contacting the customer?
              </p>
            </div>
            <div className="space-y-2">
              <a
                href="tel:18001234567"
                className="block w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Call Partner Helpline (Toll-Free)
              </a>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
