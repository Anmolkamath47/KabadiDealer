import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  mapService,
  MapCoordinates,
  MapTileMode,
  DrivingRouteResult,
  RouteStep,
} from '../../services/mapService';
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  Compass,
  Navigation,
  ExternalLink,
  Volume2,
  VolumeX,
  Layers,
  Locate,
  Phone,
  ListOrdered,
  X,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Clock,
  MapPin,
  Route,
} from 'lucide-react';

export interface DealerNavigationMapProps {
  customerCoords?: [number, number]; // [lng, lat]
  customerAddress?: string;
  customerName?: string;
  customerPhone?: string;
  dealerCoords?: [number, number]; // [lng, lat]
  vehicleType?: string;
  onSendLivePing?: (coords: [number, number]) => void;
  onRouteCalculated?: (route: DrivingRouteResult) => void;
  onArrived?: () => void;
  isEnRoute?: boolean;
}

export const DealerNavigationMap: React.FC<DealerNavigationMapProps> = ({
  customerCoords,
  customerAddress = 'Customer Doorstep',
  customerName = 'Customer',
  customerPhone,
  dealerCoords,
  vehicleType = 'Electric Scrap Loader',
  onSendLivePing,
  onRouteCalculated,
  onArrived,
  isEnRoute = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const switchLayerRef = useRef<((mode: MapTileMode) => void) | null>(null);
  const navigationPuckRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.FeatureGroup | null>(null);

  const [tileMode, setTileMode] = useState<MapTileMode>('street');
  const [routeInfo, setRouteInfo] = useState<DrivingRouteResult | null>(null);
  const [isFollowingDriver, setIsFollowingDriver] = useState<boolean>(true);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState<boolean>(true);
  const [showStepsModal, setShowStepsModal] = useState<boolean>(false);
  const [isFullscreenNav, setIsFullscreenNav] = useState<boolean>(false);
  const [currentSpeed, setCurrentSpeed] = useState<number>(26);
  const [currentHeading, setCurrentHeading] = useState<number>(45);
  const prevStepInstructionRef = useRef<string>('');

  const defaultLat = 28.6328;
  const defaultLng = 77.2167;

  const validCustLng =
    customerCoords && typeof customerCoords[0] === 'number' && !isNaN(customerCoords[0])
      ? customerCoords[0]
      : defaultLng;
  const validCustLat =
    customerCoords && typeof customerCoords[1] === 'number' && !isNaN(customerCoords[1])
      ? customerCoords[1]
      : defaultLat;

  const validDealerLng =
    dealerCoords && typeof dealerCoords[0] === 'number' && !isNaN(dealerCoords[0])
      ? dealerCoords[0]
      : validCustLng + 0.007;
  const validDealerLat =
    dealerCoords && typeof dealerCoords[1] === 'number' && !isNaN(dealerCoords[1])
      ? dealerCoords[1]
      : validCustLat + 0.006;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const dealerPoint: MapCoordinates = {
      lng: validDealerLng,
      lat: validDealerLat,
    };

    const custPoint: MapCoordinates = {
      lng: validCustLng,
      lat: validCustLat,
    };

    if (!mapInstanceRef.current) {
      const { map, switchLayer } = mapService.createMap(
        mapContainerRef.current,
        dealerPoint,
        16,
        tileMode
      );
      switchLayerRef.current = switchLayer;

      // Customer Doorstep Destination Pin
      customerMarkerRef.current = mapService.createCustomerMarker(
        map,
        custPoint,
        customerAddress
      );

      // Authentic Google Blue Arrow Navigation Puck
      navigationPuckRef.current = mapService.createNavigationPuckMarker(
        map,
        dealerPoint,
        currentHeading
      );

      // Detect manual map drag to disengage auto-follow mode
      map.on('dragstart', () => {
        setIsFollowingDriver(false);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        navigationPuckRef.current = null;
        customerMarkerRef.current = null;
        routePolylineRef.current = null;
      }
    };
  }, []);

  // Update navigation route, puck position, bearing, and turn instructions
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const custPoint: MapCoordinates = {
      lng: validCustLng,
      lat: validCustLat,
    };

    const dealerPoint: MapCoordinates = {
      lng: validDealerLng,
      lat: validDealerLat,
    };

    // Calculate road route from OSRM
    mapService.fetchDrivingRoute(dealerPoint, custPoint).then((route) => {
      setRouteInfo(route);
      if (onRouteCalculated) {
        onRouteCalculated(route);
      }

      // Calculate bearing along first route segment
      let computedHeading = 45;
      if (route.coordinates.length >= 2) {
        computedHeading = mapService.calculateBearing(
          route.coordinates[0],
          route.coordinates[1]
        );
        setCurrentHeading(computedHeading);
      }

      // Update Navigation Puck marker
      if (!navigationPuckRef.current) {
        navigationPuckRef.current = mapService.createNavigationPuckMarker(
          map,
          dealerPoint,
          computedHeading
        );
      } else {
        mapService.updateNavigationPuckMarker(
          navigationPuckRef.current,
          dealerPoint,
          computedHeading
        );
      }

      // Draw rich Google Navigation polyline with traffic segments & turn callouts
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
      }
      routePolylineRef.current = mapService.drawNavigationRoute(
        map,
        route.coordinates,
        route.steps
      );

      // Position the driver navigation puck near the bottom-center (just like Google Maps Image 2)
      // by offsetting center ~200m ahead along heading
      const offsetDist = 0.0018;
      const rad = (computedHeading * Math.PI) / 180;
      const camLat = validDealerLat + offsetDist * Math.cos(rad);
      const camLng = validDealerLng + offsetDist * Math.sin(rad);

      // Center map on driver puck if following
      if (isFollowingDriver) {
        map.setView([camLat, camLng], 17, { animate: true });
      }

      // Speak turn instructions if voice guidance is enabled and instruction changed
      const primaryStep = route.steps?.[0];
      if (primaryStep && voiceGuidanceEnabled) {
        const announcement = `${primaryStep.instruction}. Distance ${Math.round(
          primaryStep.distanceMeters
        )} meters.`;
        if (announcement !== prevStepInstructionRef.current) {
          prevStepInstructionRef.current = announcement;
          mapService.speakVoiceGuidance(announcement);
        }
      }
    });
  }, [validDealerLng, validDealerLat, validCustLng, validCustLat, isFollowingDriver]);

  // Recenter on Driver & resume follow mode
  const handleRecenter = () => {
    setIsFollowingDriver(true);
    if (mapInstanceRef.current) {
      const offsetDist = 0.0018;
      const rad = (currentHeading * Math.PI) / 180;
      const camLat = validDealerLat + offsetDist * Math.cos(rad);
      const camLng = validDealerLng + offsetDist * Math.sin(rad);
      mapInstanceRef.current.setView([camLat, camLng], 17, {
        animate: true,
      });
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (onSendLivePing) {
          onSendLivePing([lng, lat]);
        }
        if (pos.coords.speed != null) {
          setCurrentSpeed(Math.max(15, Math.round(pos.coords.speed * 3.6)));
        }
      });
    }
  };

  // Switch Tile Mode (Streets vs Satellite)
  const handleToggleLayer = () => {
    const nextMode: MapTileMode = tileMode === 'street' ? 'satellite' : 'street';
    setTileMode(nextMode);
    if (switchLayerRef.current) {
      switchLayerRef.current(nextMode);
    }
  };

  // Voice Guidance Toggle
  const toggleVoice = () => {
    const nextState = !voiceGuidanceEnabled;
    setVoiceGuidanceEnabled(nextState);
    if (nextState && routeInfo?.steps?.[0]) {
      mapService.speakVoiceGuidance(
        `Navigation active. ${routeInfo.steps[0].instruction}`
      );
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Launch Native Google Maps Navigation App
  const handleOpenNativeGoogleMaps = () => {
    const navUrl = mapService.getGoogleMapsNavUrl(
      validCustLat,
      validCustLng,
      customerAddress
    );
    window.open(navUrl, '_blank');
  };

  // Calculated Navigation Metrics
  const distanceKm = routeInfo?.distanceKm || 1.4;
  const etaMins = routeInfo?.durationMins || 6;
  const steps: RouteStep[] = routeInfo?.steps || [];
  const nextStep = steps[0] || {
    instruction: 'Head towards customer doorstep',
    distanceMeters: 250,
    modifier: 'straight',
    name: 'Main Road',
  };
  const secondStep = steps[1];

  // Estimated Arrival Time
  const arrivalTime = new Date(Date.now() + etaMins * 60000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Helper for Maneuver Icons
  const renderManeuverIcon = (modifier?: string, isLarge: boolean = true) => {
    const iconClass = isLarge ? 'w-8 h-8 stroke-[3.5]' : 'w-5 h-5 stroke-[2.5]';
    const mod = (modifier || '').toLowerCase();

    if (mod.includes('left')) {
      return mod.includes('sharp') ? (
        <CornerUpLeft className={iconClass} />
      ) : (
        <ArrowUpLeft className={iconClass} />
      );
    }
    if (mod.includes('right')) {
      return mod.includes('sharp') ? (
        <CornerUpRight className={iconClass} />
      ) : (
        <ArrowUpRight className={iconClass} />
      );
    }
    return <ArrowUp className={iconClass} />;
  };

  return (
    <div
      className={`relative w-full overflow-hidden shadow-2xl border border-slate-800 select-none bg-slate-950 transition-all duration-300 ${
        isFullscreenNav
          ? 'fixed inset-0 z-50 rounded-none h-screen'
          : 'h-[460px] sm:h-[540px] rounded-3xl'
      }`}
    >
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Official Google Maps Watermark at bottom left matching Image 2 */}
      <div className="absolute bottom-28 sm:bottom-24 left-3 z-10 pointer-events-none flex items-center select-none opacity-90 drop-shadow-sm">
        <span className="font-sans font-black text-sm tracking-tight" style={{ letterSpacing: '-0.5px' }}>
          <span className="text-[#4285F4]">G</span>
          <span className="text-[#EA4335]">o</span>
          <span className="text-[#FBBC05]">o</span>
          <span className="text-[#4285F4]">g</span>
          <span className="text-[#34A853]">l</span>
          <span className="text-[#EA4335]">e</span>
        </span>
      </div>

      {/* ================= 1. GOOGLE MAPS NAVIGATION TOP BANNER (#0F9D58) ================= */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 pointer-events-auto">
        <div className="bg-[#0F9D58] text-white rounded-2xl p-3 sm:p-3.5 shadow-2xl border border-emerald-400/40 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Big Direction Maneuver Icon Box */}
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 shadow-inner border border-white/30 text-white">
              {renderManeuverIcon(nextStep.modifier, true)}
            </div>

            {/* Maneuver Instruction & Distance */}
            <div className="min-w-0">
              <div className="flex items-baseline space-x-2">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {nextStep.distanceMeters >= 1000
                    ? `${(nextStep.distanceMeters / 1000).toFixed(1)} km`
                    : `${Math.round(nextStep.distanceMeters)} m`}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100/90 truncate">
                  {nextStep.name || 'Ahead'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-white truncate drop-shadow-xs">
                {nextStep.instruction}
              </p>

              {/* Secondary Subsequent Maneuver Preview */}
              {secondStep && (
                <div className="flex items-center space-x-1 text-[10px] text-emerald-100 font-semibold mt-0.5 opacity-90 truncate">
                  <span>Then</span>
                  {renderManeuverIcon(secondStep.modifier, false)}
                  <span className="truncate">{secondStep.instruction}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Audio & View Controls */}
          <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
            <button
              type="button"
              onClick={toggleVoice}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-95 border ${
                voiceGuidanceEnabled
                  ? 'bg-white/25 text-white border-white/40'
                  : 'bg-black/30 text-emerald-200 border-white/10'
              }`}
              title={voiceGuidanceEnabled ? 'Voice Guidance Active' : 'Voice Guidance Muted'}
            >
              {voiceGuidanceEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreenNav(!isFullscreenNav)}
              className="w-9 h-9 rounded-xl bg-white/25 text-white border border-white/40 flex items-center justify-center transition active:scale-95"
              title={isFullscreenNav ? 'Exit Fullscreen Navigation' : 'Fullscreen Navigation Mode'}
            >
              {isFullscreenNav ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================= 2. FLOATING MAP ACTION BUTTONS ================= */}
      <div className="absolute top-24 right-3 z-10 flex flex-col space-y-2">
        {/* Layer switch (Streets / Satellite) */}
        <button
          type="button"
          onClick={handleToggleLayer}
          className="w-10 h-10 bg-white/90 hover:bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 flex items-center justify-center text-xs font-bold transition active:scale-95"
          title="Toggle Google Streets / Satellite"
        >
          <Layers className="w-5 h-5" />
        </button>

        {/* Re-center / Follow GPS button */}
        <button
          type="button"
          onClick={handleRecenter}
          className={`w-11 h-11 rounded-2xl shadow-2xl border flex items-center justify-center transition active:scale-95 ${
            isFollowingDriver
              ? 'bg-[#1A73E8] hover:bg-[#1557b0] text-white border-blue-300 ring-2 ring-blue-400/40 shadow-lg'
              : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
          }`}
          title="Re-center on My Location"
        >
          <Locate className="w-6 h-6" />
        </button>
      </div>

      {/* Re-center floating prompt pill when user panned away */}
      {!isFollowingDriver && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-10">
          <button
            type="button"
            onClick={handleRecenter}
            className="bg-slate-950/95 text-emerald-400 hover:text-emerald-300 px-3.5 py-1.5 rounded-full shadow-2xl border border-emerald-500/50 flex items-center space-x-1.5 text-xs font-extrabold transition active:scale-95 animate-bounce"
          >
            <Navigation className="w-3.5 h-3.5 fill-current" />
            <span>Re-center Navigation</span>
          </button>
        </div>
      )}

      {/* ================= 3. BOTTOM GOOGLE MAPS NAVIGATION HUD ================= */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20">
        <div className="bg-slate-950/95 backdrop-blur-md text-white rounded-3xl p-3.5 shadow-2xl border border-slate-800 space-y-3">
          {/* Row 1: ETA, Distance, Arrival Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-emerald-400 tracking-tight">
                {etaMins} min
              </span>
              <span className="text-sm font-bold text-slate-300">
                ({distanceKm} km)
              </span>
              <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-400 inline" />
                <span>{arrivalTime}</span>
              </span>
            </div>

            <div className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Fastest Route</span>
            </div>
          </div>

          {/* Row 2: Customer Destination Summary */}
          <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
            <div className="flex items-center space-x-2 min-w-0">
              <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <div className="truncate">
                <span className="font-extrabold text-white mr-1.5">
                  {customerName}:
                </span>
                <span className="text-slate-300 font-medium">
                  {customerAddress}
                </span>
              </div>
            </div>

            {customerPhone && (
              <a
                href={`tel:${customerPhone}`}
                className="w-8 h-8 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-400 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 ml-2 transition"
                title="Call Customer"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Row 3: Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {/* Direct 1-Tap Google Maps Launch */}
            <button
              type="button"
              onClick={handleOpenNativeGoogleMaps}
              className="col-span-1 bg-[#1A73E8] hover:bg-[#1557b0] text-white font-black py-2.5 px-3 rounded-2xl text-xs flex items-center justify-center space-x-1.5 transition shadow-lg active:scale-95"
              title="Open turn-by-turn navigation in Google Maps app"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="truncate">Open in Google Maps</span>
            </button>

            {/* Turn-by-Turn Steps Sheet Toggle */}
            <button
              type="button"
              onClick={() => setShowStepsModal(true)}
              className="col-span-1 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-2.5 px-3 rounded-2xl text-xs flex items-center justify-center space-x-1.5 transition border border-slate-700 active:scale-95"
            >
              <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
              <span>Route Steps ({steps.length})</span>
            </button>

            {/* Doorstep Arrival Trigger if provided */}
            {onArrived && (
              <button
                type="button"
                onClick={onArrived}
                className="col-span-2 sm:col-span-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-3 rounded-2xl text-xs flex items-center justify-center space-x-1.5 transition shadow-lg active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Arrived</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= 4. TURN-BY-TURN STEPS DRAWER MODAL ================= */}
      {showStepsModal && (
        <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[85%] flex flex-col p-4 text-white shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Route className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-sm">Turn-by-Turn Driving Directions</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStepsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step List */}
            <div className="overflow-y-auto space-y-2 py-3 flex-1">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-2xl flex items-start space-x-3 text-xs border ${
                    idx === 0
                      ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {renderManeuverIcon(step.modifier, false)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold">{step.instruction}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {step.distanceMeters >= 1000
                        ? `${(step.distanceMeters / 1000).toFixed(1)} km`
                        : `${Math.round(step.distanceMeters)} meters`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowStepsModal(false)}
              className="w-full bg-[#0F9D58] hover:bg-emerald-600 text-white font-extrabold py-3 rounded-2xl text-xs transition"
            >
              Back to Live Navigation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
