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
} from 'lucide-react';

interface DealerLiveMapProps {
  customerCoords?: [number, number]; // [lng, lat]
  customerAddress?: string;
  dealerCoords?: [number, number]; // [lng, lat]
  vehicleType?: string;
  onSendLivePing?: (coords: [number, number]) => void;
  onRouteCalculated?: (route: DrivingRouteResult) => void;
}

export const DealerLiveMap: React.FC<DealerLiveMapProps> = ({
  customerCoords,
  customerAddress = 'Customer Doorstep',
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

  const [tileMode, setTileMode] = useState<MapTileMode>('street');
  const [routeInfo, setRouteInfo] = useState<DrivingRouteResult | null>(null);

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
        customerAddress
      );
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        dealerMarkerRef.current = null;
        customerMarkerRef.current = null;
        routePolylineRef.current = null;
      }
    };
  }, []);

  // Update vehicle & road-snapped OSRM route
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

      let heading = 50;
      if (route.coordinates.length >= 2) {
        heading = mapService.calculateBearing(
          route.coordinates[0],
          route.coordinates[1]
        );
      }

      if (!dealerMarkerRef.current) {
        dealerMarkerRef.current = mapService.createDealerVehicleMarker(
          map,
          dealerPoint,
          vehicleType,
          heading,
          28,
          vehicleType
        );
      } else {
        mapService.updateDealerVehicleMarker(
          dealerMarkerRef.current,
          dealerPoint,
          heading,
          28,
          vehicleType
        );
      }

      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
      }
      routePolylineRef.current = mapService.drawRoute(map, route.coordinates);

      mapService.fitBounds(map, [custPoint, dealerPoint]);
    });
  }, [validDealerLng, validDealerLat, validCustLng, validCustLat, vehicleType]);

  const handleToggleLayer = () => {
    const nextMode: MapTileMode = tileMode === 'street' ? 'satellite' : 'street';
    setTileMode(nextMode);
    if (switchLayerRef.current) {
      switchLayerRef.current(nextMode);
    }
  };

  const handleRecenterGPS = () => {
    if (navigator.geolocation && mapInstanceRef.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (onSendLivePing) {
            onSendLivePing([lng, lat]);
          }
          mapInstanceRef.current?.setView([lat, lng], 16);
        },
        () => {
          mapInstanceRef.current?.setView([validCustLat, validCustLng], 15);
        }
      );
    }
  };

  const distanceKm = routeInfo?.distanceKm || 1.4;
  const etaMins = routeInfo?.durationMins || 6;
  const nextStep = routeInfo?.steps?.[0]?.instruction || 'Continue towards customer doorstep';
  const isTurnLeft = routeInfo?.steps?.[0]?.modifier?.includes('left');

  return (
    <div className="relative w-full h-80 sm:h-96 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 select-none">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Realistic Turn-by-Turn HUD Navigation Banner */}
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-2xl p-3 shadow-2xl border border-emerald-500/40 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md">
              {isTurnLeft ? (
                <ArrowUpLeft className="w-6 h-6 stroke-[3]" />
              ) : routeInfo?.steps?.[0]?.modifier?.includes('right') ? (
                <ArrowUpRight className="w-6 h-6 stroke-[3]" />
              ) : (
                <ArrowUp className="w-6 h-6 stroke-[3]" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="truncate">{nextStep}</span>
              </div>
              <div className="text-xs font-black text-white truncate mt-0.5">
                {customerAddress}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
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

      {/* Floating Action Controls */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col space-y-2">
        <button
          type="button"
          onClick={handleToggleLayer}
          className="px-3 h-10 bg-slate-900/90 hover:bg-slate-800 text-emerald-400 rounded-2xl shadow-xl border border-slate-700 flex items-center space-x-1.5 text-xs font-bold transition active:scale-95"
          title="Toggle Google Streets / Google Satellite"
        >
          <Layers className="w-4 h-4" />
          <span className="capitalize">{tileMode === 'street' ? 'Satellite' : 'Streets'}</span>
        </button>

        <button
          type="button"
          onClick={handleRecenterGPS}
          className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-xl border border-emerald-400 flex items-center justify-center transition active:scale-95 ml-auto"
          title="Recenter GPS Location"
        >
          <Locate className="w-5 h-5" />
        </button>
      </div>

      {/* Status Pill */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <div className="bg-slate-950/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-700 flex items-center space-x-2 text-xs font-bold">
          <Compass
            className="w-4 h-4 text-emerald-400 animate-spin"
            style={{ animationDuration: '6s' }}
          />
          <span>{distanceKm} km remaining · Live Road Navigation</span>
        </div>
      </div>
    </div>
  );
};
