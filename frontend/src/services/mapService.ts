import L from 'leaflet';
import { getVehicleDetails } from '../utils/vehicleUtils';

export interface MapCoordinates {
  lat: number;
  lng: number;
}

export type MapTileMode = 'street' | 'satellite';

export interface GeocodeResult {
  displayName: string;
  address: {
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  coords: [number, number]; // [lng, lat]
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  modifier?: string;
  type?: string;
}

export interface DrivingRouteResult {
  coordinates: [number, number][]; // [lat, lng] array along actual roads
  distanceKm: number;
  durationMins: number;
  steps: RouteStep[];
}

const DEFAULT_COORDS: MapCoordinates = {
  lat: 28.6328,
  lng: 77.2167,
};

function sanitizeCoords(coords?: Partial<MapCoordinates> | null): MapCoordinates {
  if (
    !coords ||
    typeof coords.lat !== 'number' ||
    typeof coords.lng !== 'number' ||
    isNaN(coords.lat) ||
    isNaN(coords.lng)
  ) {
    return DEFAULT_COORDS;
  }
  return { lat: coords.lat, lng: coords.lng };
}

export class DealerLeafletMapService {
  createMap(
    elementOrId: string | HTMLElement,
    center?: MapCoordinates,
    zoom: number = 15,
    initialMode: MapTileMode = 'street'
  ): { map: L.Map; switchLayer: (mode: MapTileMode) => void } {
    const validCenter = sanitizeCoords(center);
    const map = L.map(elementOrId, {
      zoomControl: false,
      attributionControl: false,
    }).setView([validCenter.lat, validCenter.lng], zoom);

    // Google Maps Roadmap / Clean Streets (100% Free, Official Raster Tiles, Zero Watermarks)
    const googleStreets = L.tileLayer(
      'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 21,
      }
    );

    // Google Maps Satellite Hybrid (Photorealistic Satellite Imagery with Road & Landmark Labels)
    const googleSatellite = L.tileLayer(
      'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
      }
    );

    let currentMode: MapTileMode = initialMode;
    if (initialMode === 'satellite') {
      googleSatellite.addTo(map);
    } else {
      googleStreets.addTo(map);
    }

    const switchLayer = (mode: MapTileMode) => {
      if (mode === currentMode) return;
      if (mode === 'satellite') {
        map.removeLayer(googleStreets);
        googleSatellite.addTo(map);
      } else {
        map.removeLayer(googleSatellite);
        googleStreets.addTo(map);
      }
      currentMode = mode;
    };

    return { map, switchLayer };
  }

  createCustomerMarker(
    map: L.Map,
    coords?: MapCoordinates,
    title: string = 'Customer Pickup Doorstep'
  ): L.Marker {
    const validCoords = sanitizeCoords(coords);
    const customerIcon = L.divIcon({
      className: 'custom-customer-pin-wrap',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 rounded-full bg-emerald-500/30 animate-ping"></div>
          <div class="relative w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white z-10">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </div>
          <div class="absolute -bottom-1 w-3 h-3 bg-emerald-700 rotate-45 z-0 shadow-sm"></div>
        </div>
      `,
      iconSize: [40, 44],
      iconAnchor: [20, 42],
      popupAnchor: [0, -42],
    });

    const marker = L.marker([validCoords.lat, validCoords.lng], { icon: customerIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; padding: 4px;">
        <strong style="color: #059669; font-size: 13px;">📍 ${title}</strong>
        <div style="font-size: 11px; color: #475569; margin-top: 2px;">Customer Scrap Collection Point</div>
      </div>
    `);
    return marker;
  }

  buildDealerVehicleIcon(
    vehicleType?: string,
    heading: number = 0,
    speed: number = 24
  ): L.DivIcon {
    const safeHeading = heading || 0;
    const vehicle = getVehicleDetails(vehicleType);

    return L.divIcon({
      className: 'custom-vehicle-pin-wrap',
      html: `
        <div class="relative flex flex-col items-center justify-center">
          <!-- Live Vehicle Speed Tag Pill -->
          <div class="mb-1 bg-slate-900/95 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-slate-700 flex items-center space-x-1 whitespace-nowrap">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>${speed} km/h</span>
          </div>

          <!-- Vehicle Icon Container with Pointer Indicator -->
          <div class="relative flex items-center justify-center">
            <!-- Rotating Directional Bearing Pointer Arrow -->
            <div style="transform: rotate(${safeHeading}deg); transition: transform 0.3s ease; position: absolute; top: -6px; z-index: 10;" class="flex items-center justify-center pointer-events-none">
              <div class="w-3 h-3 bg-emerald-400 border border-white rotate-45 rounded-xs shadow-md"></div>
            </div>

            <!-- Vehicle Icon Box with Gradient & Ring -->
            <div class="relative w-12 h-12 bg-gradient-to-tr ${vehicle.bgGradient} rounded-2xl border-2 border-white shadow-2xl flex items-center justify-center text-white ring-4 ${vehicle.ringColor}">
              <div class="flex items-center justify-center">
                ${vehicle.svgHtml}
              </div>
            </div>
          </div>

          <!-- Badge for Vehicle Category -->
          <div class="mt-1 bg-slate-950/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-md border border-slate-700 whitespace-nowrap flex items-center space-x-1">
            <span>${vehicle.badge}</span>
          </div>
        </div>
      `,
      iconSize: [68, 80],
      iconAnchor: [34, 52],
      popupAnchor: [0, -52],
    });
  }

  createDealerVehicleMarker(
    map: L.Map,
    coords?: MapCoordinates,
    title: string = 'Your Vehicle',
    heading: number = 45,
    speed: number = 28,
    vehicleType?: string
  ): L.Marker {
    const validCoords = sanitizeCoords(coords);
    const vehicleIcon = this.buildDealerVehicleIcon(vehicleType, heading, speed);
    const vehicle = getVehicleDetails(vehicleType);

    const marker = L.marker([validCoords.lat, validCoords.lng], { icon: vehicleIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; padding: 6px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 16px;">${vehicle.emoji}</span>
          <strong style="color: #0f172a; font-size: 13px;">${title}</strong>
        </div>
        <div style="font-size: 11px; font-weight: 700; color: #059669; margin-top: 2px;">
          ${vehicle.badge}
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 1px;">
          Live GPS tracking active
        </div>
      </div>
    `);
    return marker;
  }

  updateDealerVehicleMarker(
    marker: L.Marker,
    coords: MapCoordinates,
    heading: number = 0,
    speed: number = 24,
    vehicleType?: string
  ): void {
    const valid = sanitizeCoords(coords);
    marker.setLatLng([valid.lat, valid.lng]);
    const updatedIcon = this.buildDealerVehicleIcon(vehicleType, heading, speed);
    marker.setIcon(updatedIcon);
  }

  // Fetch actual driving road polyline and turn steps using free OSRM Routing Engine
  async fetchDrivingRoute(start: MapCoordinates, end: MapCoordinates): Promise<DrivingRouteResult> {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('OSRM routing failed');
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No driving route returned by OSRM');
      }

      const route = data.routes[0];
      const coordinates: [number, number][] = route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );
      const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
      const durationMins = Math.max(1, Math.round(route.duration / 60));

      const steps: RouteStep[] = (route.legs?.[0]?.steps || []).map((s: any) => {
        let instruction = s.name ? `Turn onto ${s.name}` : 'Continue on road';
        if (s.maneuver?.type === 'depart') {
          instruction = `Head towards customer on ${s.name || 'road'}`;
        } else if (s.maneuver?.type === 'arrive') {
          instruction = 'Arrive at customer doorstep';
        } else if (s.maneuver?.modifier) {
          const mod = s.maneuver.modifier.replace('-', ' ');
          instruction = `Turn ${mod} ${s.name ? 'onto ' + s.name : ''}`.trim();
        }
        return {
          instruction,
          distanceMeters: Math.round(s.distance || 0),
          modifier: s.maneuver?.modifier,
          type: s.maneuver?.type,
        };
      });

      return { coordinates, distanceKm, durationMins, steps };
    } catch (err) {
      console.warn('OSRM router unavailable, using straight fallback:', err);
      const midLat = (start.lat + end.lat) / 2;
      const midLng = (start.lng + end.lng) / 2;
      const directDist = this.calculateDirectDistance(start, end);
      return {
        coordinates: [
          [start.lat, start.lng],
          [midLat, midLng],
          [end.lat, end.lng],
        ],
        distanceKm: Math.round(directDist * 10) / 10,
        durationMins: Math.max(2, Math.round((directDist / 25) * 60)),
        steps: [{ instruction: 'Head towards customer doorstep', distanceMeters: Math.round(directDist * 1000) }],
      };
    }
  }

  // Draw road-snapped route with high-contrast dual layer polyline
  drawRoute(map: L.Map, pathCoordinates: [number, number][]): L.FeatureGroup {
    if (!pathCoordinates || pathCoordinates.length === 0) {
      return L.featureGroup().addTo(map);
    }

    const shadowLine = L.polyline(pathCoordinates, {
      color: '#064e3b',
      weight: 8,
      opacity: 0.45,
      lineCap: 'round',
      lineJoin: 'round',
    });

    const mainLine = L.polyline(pathCoordinates, {
      color: '#10b981',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '8, 8',
    });

    const routeGroup = L.featureGroup([shadowLine, mainLine]).addTo(map);
    return routeGroup;
  }

  fitBounds(map: L.Map, points: (MapCoordinates | undefined)[]): void {
    const validPoints = points.map(sanitizeCoords);
    if (validPoints.length === 0) return;
    const latLngs = validPoints.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50], maxZoom: 16 });
  }

  calculateDirectDistance(start: MapCoordinates, end: MapCoordinates): number {
    const R = 6371; // Earth radius in km
    const dLat = ((end.lat - start.lat) * Math.PI) / 180;
    const dLon = ((end.lng - start.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((start.lat * Math.PI) / 180) *
        Math.cos((end.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  calculateBearing(from: [number, number], to: [number, number]): number {
    const lat1 = (from[0] * Math.PI) / 180;
    const lat2 = (to[0] * Math.PI) / 180;
    const diffLong = ((to[1] - from[1]) * Math.PI) / 180;

    const x = Math.sin(diffLong) * Math.cos(lat2);
    const y =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(diffLong);

    let initialBearing = (Math.atan2(x, y) * 180) / Math.PI;
    return (initialBearing + 360) % 360;
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Kabadidealer-Partner-App/1.0',
        },
      });
      if (!res.ok) throw new Error('Geocoding service unavailable');
      const data = await res.json();

      const addr = data.address || {};
      const parts = [
        addr.road || addr.pedestrian || addr.street,
        addr.suburb || addr.neighbourhood || addr.residential,
        addr.city || addr.town || addr.county || 'Delhi NCR',
        addr.postcode,
      ].filter(Boolean);

      return parts.length > 0
        ? parts.join(', ')
        : data.display_name?.slice(0, 80) || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } catch {
      return `Near Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
  }

  async searchPlaces(query: string): Promise<GeocodeResult[]> {
    if (!query.trim() || query.length < 3) return [];
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=json&addressdetails=1&limit=5&countrycodes=in`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Kabadidealer-Partner-App/1.0',
        },
      });
      if (!res.ok) return [];
      const items = await res.json();
      return items.map((it: any) => ({
        displayName: it.display_name,
        address: it.address || {},
        coords: [parseFloat(it.lon), parseFloat(it.lat)],
      }));
    } catch {
      return [];
    }
  }
}

export const mapService = new DealerLeafletMapService();
