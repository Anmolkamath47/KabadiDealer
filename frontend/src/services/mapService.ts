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
  location?: [number, number]; // [lat, lng] of maneuver junction
  name?: string;
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

  // Google Maps Style Navigation Vehicle Puck (White Circular Halo Disc + 3D Royal Blue Arrow Pointer)
  buildNavigationArrowIcon(heading: number = 0): L.DivIcon {
    const safeHeading = heading || 0;
    return L.divIcon({
      className: 'nav-puck-marker-wrap',
      html: `
        <div style="width: 58px; height: 58px;" class="relative flex items-center justify-center pointer-events-none">
          <!-- White circular base disc with Google Navigation drop shadow -->
          <div class="absolute w-12 h-12 bg-white/95 rounded-full border border-slate-200/90 shadow-2xl flex items-center justify-center" style="box-shadow: 0 4px 14px rgba(0,0,0,0.3);"></div>
          <!-- Rotating 3D Blue Arrow -->
          <div style="transform: rotate(${safeHeading}deg); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); width: 34px; height: 34px;" class="relative z-10 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4L34 34L20 27L6 34L20 4Z" fill="#1D68FF" stroke="#FFFFFF" stroke-width="2.6" stroke-linejoin="round"/>
              <path d="M20 7L30.5 30L20 24.5L9.5 30L20 7Z" fill="#2563EB"/>
              <path d="M20 7L9.5 30L20 24.5V7Z" fill="#1E40AF" opacity="0.35"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [58, 58],
      iconAnchor: [29, 29],
    });
  }

  // On-Road Turn Direction Callout Bubble (Deep Blue pill with pointer down to the road junction, like [ ↗ US-101 ])
  buildRoadTurnCalloutIcon(roadName: string = 'Main Rd', modifier: string = 'right'): L.DivIcon {
    const isLeft = modifier.toLowerCase().includes('left');
    const isFork = modifier.toLowerCase().includes('fork') || modifier.toLowerCase().includes('slight');

    const arrowSvg = isLeft
      ? `<svg class="w-4 h-4 text-white stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>`
      : isFork
      ? `<svg class="w-4 h-4 text-white stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7 17l9.2-9.2M17 17V7H7" /></svg>`
      : `<svg class="w-4 h-4 text-white stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>`;

    const cleanRoad = roadName.replace(/^(onto|into|towards)\s+/i, '').trim() || 'Turn Ahead';

    return L.divIcon({
      className: 'road-turn-callout-wrap',
      html: `
        <div class="relative flex flex-col items-center pointer-events-none select-none" style="white-space: nowrap; transform: translate(-50%, -100%);">
          <!-- Deep Blue Pill Callout -->
          <div class="bg-[#002FA7] text-white px-3 py-1.5 rounded-2xl shadow-2xl flex items-center space-x-1.5 border border-blue-400/50" style="box-shadow: 0 4px 14px rgba(0, 47, 167, 0.5);">
            ${arrowSvg}
            <span class="font-black text-[11px] tracking-tight text-white drop-shadow-xs">${cleanRoad}</span>
          </div>
          <!-- Speech Pointer Triangle pointing to the road -->
          <div class="w-0 h-0 border-x-[6px] border-x-transparent border-t-[7px] border-t-[#002FA7] -mt-[1px]"></div>
        </div>
      `,
      iconSize: [110, 36],
      iconAnchor: [55, 36],
    });
  }

  // White Curved Maneuver Turn Arrow directly on the road polyline
  buildRoadManeuverArrowIcon(modifier: string = 'right'): L.DivIcon {
    const isLeft = modifier.toLowerCase().includes('left');
    return L.divIcon({
      className: 'road-curve-arrow-wrap',
      html: `
        <div class="relative flex items-center justify-center pointer-events-none" style="width: 28px; height: 28px;">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
            ${
              isLeft
                ? `<path d="M20 22V14C20 10.6863 17.3137 8 14 8H6M6 8L11 3M6 8L11 13" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`
                : `<path d="M8 22V14C8 10.6863 10.6863 8 14 8H22M22 8L17 3M22 8L17 13" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`
            }
          </svg>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  // Traffic Light Indicator at road junctions (🚦)
  buildTrafficSignalIcon(): L.DivIcon {
    return L.divIcon({
      className: 'road-traffic-signal-wrap',
      html: `
        <div class="relative flex items-center justify-center pointer-events-none" style="width: 20px; height: 24px;">
          <div class="bg-slate-950 px-1 py-1 rounded-md border border-slate-700 shadow-md flex flex-col space-y-0.5 items-center">
            <div class="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-xs"></div>
            <div class="w-1.5 h-1.5 rounded-full bg-amber-400 opacity-90"></div>
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-90"></div>
          </div>
        </div>
      `,
      iconSize: [20, 24],
      iconAnchor: [10, 12],
    });
  }

  // Pulsing Arrived Location Beacon (Blue core with soft pulsating concentric radar rings)
  buildArrivalBeaconIcon(): L.DivIcon {
    return L.divIcon({
      className: 'nav-arrival-beacon-wrap',
      html: `
        <div class="relative flex items-center justify-center pointer-events-none" style="width: 70px; height: 70px;">
          <!-- Outer Pulsing Glow -->
          <div class="absolute w-14 h-14 rounded-full bg-blue-500/25 animate-ping" style="animation-duration: 2.2s;"></div>
          <!-- Mid Glow Ring -->
          <div class="absolute w-16 h-16 rounded-full bg-blue-400/20 border border-blue-400/30"></div>
          <!-- Center Solid Dot with White Ring -->
          <div class="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-xl z-10 ring-4 ring-blue-500/30"></div>
        </div>
      `,
      iconSize: [70, 70],
      iconAnchor: [35, 35],
    });
  }

  // Red Destination Map Pin with location text label matching design
  buildRedDestinationPinIcon(label: string = 'Destination'): L.DivIcon {
    const cleanLabel = label.split(',')[0].trim() || 'Destination';
    return L.divIcon({
      className: 'nav-red-destination-pin-wrap',
      html: `
        <div class="relative flex items-center pointer-events-none" style="white-space: nowrap;">
          <div class="relative flex flex-col items-center">
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.35));">
              <path d="M14 0C6.26801 0 0 6.26801 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.26801 21.732 0 14 0Z" fill="#EA4335"/>
              <circle cx="14" cy="13" r="5" fill="#B31412"/>
              <circle cx="14" cy="13" r="2.5" fill="#FFFFFF"/>
            </svg>
            <div class="w-2 h-1 rounded-full bg-slate-900/60 mt-0.5"></div>
          </div>
          ${
            cleanLabel
              ? `<div class="ml-1.5 -mt-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg shadow-lg border border-slate-200/80 text-[11px] font-extrabold text-slate-800 max-w-[170px] truncate leading-tight tracking-tight">${cleanLabel}</div>`
              : ''
          }
        </div>
      `,
      iconSize: [32, 40],
      iconAnchor: [14, 38],
    });
  }

  createCustomerMarker(
    map: L.Map,
    coords?: MapCoordinates,
    title: string = 'Customer Pickup Doorstep'
  ): L.Marker {
    const validCoords = sanitizeCoords(coords);
    const customerIcon = this.buildRedDestinationPinIcon(title);

    const marker = L.marker([validCoords.lat, validCoords.lng], { icon: customerIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; padding: 4px;">
        <strong style="color: #EA4335; font-size: 13px;">📍 ${title}</strong>
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
          location: s.maneuver?.location ? [s.maneuver.location[1], s.maneuver.location[0]] : undefined,
          name: s.name || '',
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
        steps: [
          {
            instruction: 'Head towards customer doorstep',
            distanceMeters: Math.round(directDist * 1000),
            location: [midLat, midLng],
            name: 'Customer Route',
            modifier: 'right',
          },
        ],
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

  // Draw high-visibility Google-style Turn-by-Turn Navigation Route with:
  // 1. Dual-tone traffic polyline (Royal Blue + Orange Congestion Stretch)
  // 2. Road Turn Direction Callout Bubble [ ↗ US-101 ] pinned at the upcoming turn junction
  // 3. White curved maneuver arrow on the polyline
  // 4. Traffic signal indicator at the intersection
  drawNavigationRoute(
    map: L.Map,
    pathCoordinates: [number, number][],
    steps?: RouteStep[]
  ): L.FeatureGroup {
    if (!pathCoordinates || pathCoordinates.length === 0) {
      return L.featureGroup().addTo(map);
    }

    const layers: L.Layer[] = [];

    // 1. Dark high-contrast outer casing border
    const outerCasing = L.polyline(pathCoordinates, {
      color: '#0B286E',
      weight: 9,
      opacity: 0.45,
      lineCap: 'round',
      lineJoin: 'round',
    });
    layers.push(outerCasing);

    // 2. Base vibrant navigation royal blue main line
    const navRouteLine = L.polyline(pathCoordinates, {
      color: '#1D68FF',
      weight: 6.5,
      opacity: 0.98,
      lineCap: 'round',
      lineJoin: 'round',
    });
    layers.push(navRouteLine);

    // 3. Dual-Tone Traffic Congestion Segment (Orange stretch on route like Google Maps Bayshore Pkwy in user image)
    if (pathCoordinates.length >= 6) {
      const startIndex = Math.floor(pathCoordinates.length * 0.45);
      const endIndex = Math.min(pathCoordinates.length - 1, Math.floor(pathCoordinates.length * 0.8));
      const trafficCoords = pathCoordinates.slice(startIndex, endIndex + 1);

      if (trafficCoords.length >= 2) {
        const trafficSegment = L.polyline(trafficCoords, {
          color: '#FF8800',
          weight: 6.5,
          opacity: 0.98,
          lineCap: 'round',
          lineJoin: 'round',
        });
        layers.push(trafficSegment);
      }
    }

    // 4. On-Road Upcoming Turn Callout Bubble & Maneuver Overlays (like [ ↗ US-101 ] in user image)
    const turnStep =
      steps && steps.length > 0
        ? steps.find((s) => s.modifier && s.location) ||
          steps.find((s) => s.location && s.name) ||
          steps[1] ||
          steps[0]
        : null;

    let turnPoint: [number, number] | null = null;
    let turnName = 'Next Road';
    let turnModifier = 'right';

    if (turnStep && turnStep.location) {
      turnPoint = turnStep.location;
      turnName = turnStep.name || turnStep.instruction.replace(/^(turn|head)\s+/i, '').split('onto')[1] || 'Next Road';
      turnModifier = turnStep.modifier || 'right';
    } else if (pathCoordinates.length >= 4) {
      const jIdx = Math.min(pathCoordinates.length - 2, Math.max(1, Math.floor(pathCoordinates.length * 0.3)));
      turnPoint = pathCoordinates[jIdx];
      turnName = steps?.[0]?.name || 'Turn Ahead';
      turnModifier = steps?.[0]?.modifier || 'right';
    }

    if (turnPoint) {
      // 4a. White curved maneuver arrow painted directly along the route line
      const curveArrowMarker = L.marker(turnPoint, {
        icon: this.buildRoadManeuverArrowIcon(turnModifier),
        zIndexOffset: 500,
      });
      layers.push(curveArrowMarker);

      // 4b. Traffic signal icon at corner
      const trafficLightPoint: [number, number] = [
        turnPoint[0] + 0.00008,
        turnPoint[1] + 0.0001,
      ];
      const trafficLightMarker = L.marker(trafficLightPoint, {
        icon: this.buildTrafficSignalIcon(),
        zIndexOffset: 600,
      });
      layers.push(trafficLightMarker);

      // 4c. Deep Blue Turn Direction Callout Bubble [ ↗ US-101 ]
      const calloutMarker = L.marker(turnPoint, {
        icon: this.buildRoadTurnCalloutIcon(turnName, turnModifier),
        zIndexOffset: 1000,
      });
      layers.push(calloutMarker);
    }

    const routeGroup = L.featureGroup(layers).addTo(map);
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
