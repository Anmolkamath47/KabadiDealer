import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  mapService,
  MapCoordinates,
  MapTileMode,
  DrivingRouteResult,
} from '../../services/mapService';
import {
  Clock,
  Locate,
  Layers,
  ArrowUpRight,
  ArrowUpLeft,
  ArrowUp,
  Compass,
  Gauge,
  Navigation,
  ExternalLink,
  MapPin,
  ListOrdered,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DealerNavigationMapProps {
  customerCoords?: [number, number]; // [lng, lat]
  customerAddress?: string;
  customerName?: string;
  dealerCoords?: [number, number]; // [lng, lat]
  vehicleType?: string;
  onSendLivePing?: (coords: [number, number]) => void;
  onRouteCalculated?: (route: DrivingRouteResult) => void;
}

export const DealerNavigationMap: React.FC<DealerNavigationMapProps> = ({
  customerCoords,
  customerAddress = 'Customer Doorstep',
  customerName = 'Customer',
  dealerCoords,
  vehicleType = 'Electric Scrap Loader',
  onSendLivePing,
  onRouteCalculated,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const switchLayerRef = useRef<((mode: MapTileMode) => void) | null>(null);
  const dealerMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.FeatureGroup | null>(null);

  const prevDealerCoordsRef = useRef<[number, number] | null>(null);
  const lastRouteFetchCoordsRef = useRef<[number, number] | null>(null);
  const lastRouteFetchTimeRef = useRef<number>(0);
  const hasInitialFitRef = useRef<boolean>(false);

  const [tileMode, setTileMode] = useState<MapTileMode>('street');
  const [routeInfo, setRouteInfo] = useState<DrivingRouteResult | null>(null);
  const [showStepsDrawer, setShowStepsDrawer] = useState<boolean>(false);

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

    const custPoint: MapCoordinates = {
      lng: validCustLng,
      lat: validCustLat,
    };

    let timer: any = null;
    let resizeObserver: ResizeObserver | null = null;

    if (!mapInstanceRef.current) {
      const { map, switchLayer } = mapService.createMap(
        mapContainerRef.current,
        custPoint,
        15,
        tileMode
      );
      switchLayerRef.current = switchLayer;
      customerMarkerRef.current = mapService.createCustomerMarker(
        map,
        custPoint,
        `Destination: ${customerAddress}`
      );
      mapInstanceRef.current = map;

      timer = setTimeout(() => {
        map.invalidateSize();
      }, 200);

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
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        dealerMarkerRef.current = null;
        customerMarkerRef.current = null;
        routePolylineRef.current = null;
        hasInitialFitRef.current = false;
      }
    };
  }, []);

  // Update vehicle navigation position & throttled road route
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

    // Calculate heading from recent movement
    let heading = 45;
    if (prevDealerCoordsRef.current) {
      heading = mapService.calculateBearing(
        [prevDealerCoordsRef.current[1], prevDealerCoordsRef.current[0]],
        [validDealerLat, validDealerLng]
      );
    }
    prevDealerCoordsRef.current = [validDealerLng, validDealerLat];

    // 1. Instantly update vehicle marker with 3D Navigation Arrow
    if (!dealerMarkerRef.current) {
      dealerMarkerRef.current = L.marker([validDealerLat, validDealerLng], {
        icon: mapService.buildNavigationArrowIcon(heading),
      }).addTo(map);
    } else {
      dealerMarkerRef.current.setLatLng([validDealerLat, validDealerLng]);
      dealerMarkerRef.current.setIcon(mapService.buildNavigationArrowIcon(heading));
    }

    // 2. Initial camera framing
    if (!hasInitialFitRef.current) {
      mapService.fitBounds(map, [custPoint, dealerPoint]);
      hasInitialFitRef.current = true;
    }

    // 3. Throttled route fetch
    const now = Date.now();
    const distSinceLastFetch = lastRouteFetchCoordsRef.current
      ? mapService.calculateDirectDistance(
          { lng: lastRouteFetchCoordsRef.current[0], lat: lastRouteFetchCoordsRef.current[1] },
          dealerPoint
        )
      : 999;
    const timeSinceLastFetch = now - lastRouteFetchTimeRef.current;

    const shouldFetchRoute =
      !routeInfo || distSinceLastFetch > 0.075 || (timeSinceLastFetch > 15000 && distSinceLastFetch > 0.02);

    if (shouldFetchRoute) {
      lastRouteFetchCoordsRef.current = [validDealerLng, validDealerLat];
      lastRouteFetchTimeRef.current = now;

      mapService
        .fetchDrivingRoute(dealerPoint, custPoint)
        .then((route) => {
          setRouteInfo(route);
          if (onRouteCalculated) {
            onRouteCalculated(route);
          }
          if (routePolylineRef.current) {
            routePolylineRef.current.remove();
          }
          routePolylineRef.current = mapService.drawNavigationRoute(map, route.coordinates);
        })
        .catch((err) => {
          console.warn('Navigation route sync skipped:', err);
        });
    }
  }, [validDealerLng, validDealerLat, validCustLng, validCustLat, vehicleType]);

  const handleToggleLayer = () => {
    const nextMode: MapTileMode = tileMode === 'street' ? 'satellite' : 'street';
    setTileMode(nextMode);
    if (switchLayerRef.current) {
      switchLayerRef.current(nextMode);
    }
  };

  const handleFollowDriver = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (onSendLivePing) {
            onSendLivePing([lng, lat]);
          }
          map.setView([lat, lng], 16, { animate: true });
        },
        () => {
          map.setView([validDealerLat, validDealerLng], 16, { animate: true });
        }
      );
    } else {
      map.setView([validDealerLat, validDealerLng], 16, { animate: true });
    }
  };

  const handleOpenGoogleMaps = () => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${validCustLat},${validCustLng}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  const distanceKm = routeInfo?.distanceKm || 1.4;
  const etaMins = routeInfo?.durationMins || 6;
  const nextStep = routeInfo?.steps?.[0]?.instruction || `Head towards ${customerName}'s doorstep`;
  const isTurnLeft = routeInfo?.steps?.[0]?.modifier?.includes('left');

  return (
    <div className="relative w-full h-[380px] sm:h-[420px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 select-none flex flex-col justify-between">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Top Turn-by-Turn Driving Navigation HUD */}
      <div className="relative z-10 p-3 space-y-2">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-2xl p-3 shadow-2xl border border-emerald-500/40 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md">
                {isTurnLeft ? (
                  <ArrowUpLeft className="w-7 h-7 stroke-[3]" />
                ) : routeInfo?.steps?.[0]?.modifier?.includes('right') ? (
                  <ArrowUpRight className="w-7 h-7 stroke-[3]" />
                ) : (
                  <ArrowUp className="w-7 h-7 stroke-[3]" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="truncate">{nextStep}</span>
                </div>
                <div className="text-xs font-black text-white truncate mt-0.5 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />
                  <span className="truncate">{customerAddress}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
              <div className="hidden sm:flex flex-col items-end px-2.5 py-1 bg-white/5 rounded-xl border border-white/10 text-right">
                <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                  <Gauge className="w-3 h-3" />
                  <span>Speed</span>
                </span>
                <span className="text-xs font-extrabold text-white">28 km/h</span>
              </div>

              <div className="bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1.5 rounded-xl text-right">
                <div className="text-[10px] text-slate-300 font-semibold flex items-center justify-end space-x-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>ETA</span>
                </div>
                <div className="text-xs font-black text-emerald-300">~{etaMins} mins</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Step-by-Step Directions Drawer */}
      {showStepsDrawer && routeInfo?.steps && routeInfo.steps.length > 0 && (
        <div className="relative z-20 mx-3 mb-2 max-h-48 overflow-y-auto bg-slate-950/95 backdrop-blur-md rounded-2xl p-3 border border-emerald-500/40 text-white shadow-2xl space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-extrabold text-emerald-400">
              <ListOrdered className="w-4 h-4" />
              <span>Turn-By-Turn Route Steps</span>
            </div>
            <button
              onClick={() => setShowStepsDrawer(false)}
              className="text-[10px] text-slate-400 hover:text-white uppercase font-bold"
            >
              Close
            </button>
          </div>
          <div className="space-y-1.5">
            {routeInfo.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between text-xs py-1 border-b border-slate-900/60 last:border-none"
              >
                <div className="flex items-start space-x-2 min-w-0 pr-2">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold mt-0.5">
                    {idx + 1}.
                  </span>
                  <span className="text-slate-200 truncate">{step.instruction}</span>
                </div>
                {step.distanceMeters ? (
                  <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0">
                    {step.distanceMeters > 1000
                      ? `${(step.distanceMeters / 1000).toFixed(1)} km`
                      : `${step.distanceMeters} m`}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Floating Navigation Controls */}
      <div className="relative z-10 p-3 flex items-end justify-between">
        {/* Left Side: Destination Info Pill & Steps Toggle */}
        <div className="flex flex-col space-y-2">
          <div className="bg-slate-950/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-700 flex items-center space-x-2 text-xs font-bold pointer-events-none">
            <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>{distanceKm} km remaining to Doorstep</span>
          </div>

          {routeInfo?.steps && routeInfo.steps.length > 0 && (
            <button
              type="button"
              onClick={() => setShowStepsDrawer(!showStepsDrawer)}
              className="bg-slate-900/95 hover:bg-slate-800 text-emerald-400 px-3 py-1.5 rounded-xl shadow-lg border border-slate-700 flex items-center space-x-1.5 text-xs font-bold transition active:scale-95"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>{showStepsDrawer ? 'Hide Directions' : 'View Turn Steps'}</span>
              {showStepsDrawer ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Right Side: Primary Open in Google Maps Button & Controls */}
        <div className="flex flex-col space-y-2 items-end">
          {/* Primary 1-Tap Google Maps Launch */}
          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl shadow-2xl border border-emerald-400 flex items-center space-x-2 text-xs font-black transition active:scale-95 ring-2 ring-emerald-500/40"
            title="Launch Voice Turn-By-Turn Navigation in Google Maps"
          >
            <Navigation className="w-4 h-4 fill-white" />
            <span>OPEN GOOGLE MAPS</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleToggleLayer}
              className="px-2.5 h-9 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-xl shadow-xl border border-slate-700 flex items-center space-x-1 text-xs font-bold transition active:scale-95"
              title="Toggle Streets / Satellite"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span className="capitalize text-[11px]">{tileMode === 'street' ? 'Sat' : 'Map'}</span>
            </button>

            <button
              type="button"
              onClick={handleFollowDriver}
              className="w-9 h-9 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xl border border-emerald-400 flex items-center justify-center transition active:scale-95"
              title="Center Camera on Driver Location"
            >
              <Locate className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
