import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerAuth } from '../context/DealerAuthContext';
import { reconcileCityCoordinates } from '../utils/geoUtils';
import L from 'leaflet';
import {
  ArrowLeft,
  MapPin,
  Locate,
  CheckCircle,
  Navigation,
  Search,
  X,
  Plus,
  Minus,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export const LocationSetupScreen: React.FC = () => {
  const navigate = useNavigate();
  const { dealer, updateLocation } = useDealerAuth();

  const [coords, setCoords] = useState<[number, number]>(() => {
    return dealer?.location?.coordinates || [77.2150, 28.6250];
  });
  const [address, setAddress] = useState(
    dealer?.location?.address &&
      dealer.location.address !== 'Location not configured - Update in Settings'
      ? dealer.location.address
      : ''
  );
  const [landmark, setLandmark] = useState(dealer?.location?.landmark || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const debounceTimerRef = useRef<any>(null);
  const searchDebounceRef = useRef<any>(null);

  // Reverse Geocoding helper using OpenStreetMap Nominatim
  const performReverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      setIsGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const street =
          addr.road ||
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          '';
        const locality =
          addr.suburb ||
          addr.city_district ||
          addr.neighbourhood ||
          '';
        const city =
          addr.city ||
          addr.town ||
          addr.county ||
          addr.state_district ||
          '';
        const state = addr.state || '';
        const postcode = addr.postcode || '';

        const addressParts = [street, locality, city, state, postcode].filter(
          (part, idx, arr) => part && arr.indexOf(part) === idx
        );

        if (addressParts.length > 0) {
          const formatted = addressParts.join(', ');
          setAddress(formatted);
        } else if (data.display_name) {
          setAddress(data.display_name.split(',').slice(0, 4).join(', '));
        }

        const landmarkSuggestion = [locality, city].filter(Boolean).join(', ');
        if (landmarkSuggestion && !landmark) {
          setLandmark(landmarkSuggestion);
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    } finally {
      setIsGeocoding(false);
    }
  }, [landmark]);

  // Initialize Interactive Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const [lng, lat] = coords;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([lat, lng], 15);

      L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 21,
      }).addTo(map);

      // On map drag end -> update center coordinates and trigger reverse geocode
      map.on('moveend', () => {
        const center = map.getCenter();
        const newLng = Math.round(center.lng * 100000) / 100000;
        const newLat = Math.round(center.lat * 100000) / 100000;
        setCoords([newLng, newLat]);

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          performReverseGeocode(newLat, newLng);
        }, 700);
      });

      // On map click -> fly to location and place pin
      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        map.flyTo([clickLat, clickLng], map.getZoom(), { duration: 0.5 });
      });

      mapInstanceRef.current = map;

      // Invalidate size to ensure crisp rendering
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  // Automatic real GPS detection on initial load if location unconfigured
  useEffect(() => {
    if (!dealer?.location?.address || dealer.location.address === 'Location not configured - Update in Settings') {
      handleUseCurrentGPS(true);
    }
  }, []);

  // Use Current GPS Location handler
  const handleUseCurrentGPS = (isSilentOnFail = false) => {
    if (!navigator.geolocation) {
      if (!isSilentOnFail) alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords([lng, lat]);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1 });
        }
        performReverseGeocode(lat, lng);
        setIsLocatingGps(false);
      },
      (err) => {
        console.warn('Geolocation failed:', err.message);
        setIsLocatingGps(false);
        if (!isSilentOnFail) {
          alert('Could not access live GPS. Please enable location permissions or search your area.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Search Nominatim Address Queries
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!val.trim() || val.trim().length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            val.trim()
          )}&limit=5&countrycodes=in`,
          {
            headers: { 'Accept-Language': 'en' },
          }
        );
        const data = await res.json();
        setSearchResults(data || []);
        setShowDropdown(true);
      } catch (err) {
        console.warn('Search geocoding error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 450);
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setCoords([lng, lat]);
    setAddress(result.display_name.split(',').slice(0, 4).join(', '));
    setShowDropdown(false);
    setSearchQuery('');

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1 });
    }
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleSave = async () => {
    if (!address.trim()) {
      alert('Please enter your scrap shop or depot address');
      return;
    }
    setIsSaving(true);
    try {
      const healedCoords = reconcileCityCoordinates(address.trim(), coords);
      await updateLocation(healedCoords, address.trim(), landmark.trim());
      navigate('/');
    } catch {
      alert('Failed to update location');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 max-w-md mx-auto flex flex-col justify-between shadow-2xl pb-6">
      {/* Top Header */}
      <div className="p-4 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center space-x-3 sticky top-0 z-30">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-900">Dealer Operating Location</h1>
          <p className="text-[11px] text-slate-500">Used for customer proximity matching</p>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Live Search Bar with Suggestions Dropdown */}
        <div className="relative z-20">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              placeholder="Search locality, market, or city..."
              className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none transition shadow-xs"
            />
            {isSearching ? (
              <Loader2 className="w-4 h-4 absolute right-3 text-emerald-600 animate-spin" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowDropdown(false);
                }}
                className="absolute right-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          {/* Search Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto z-50 divide-y divide-slate-100">
              {searchResults.map((item) => (
                <button
                  key={item.place_id}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left p-3 hover:bg-slate-50 flex items-start space-x-2.5 transition text-xs"
                >
                  <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-800 line-clamp-2 leading-relaxed">
                    {item.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Real Interactive Leaflet Map Container */}
        <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Center Pin Marker */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none flex flex-col items-center">
            <div className="w-10 h-10 bg-emerald-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white animate-bounce">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="w-2.5 h-2.5 bg-slate-900 rounded-full opacity-30 blur-xs mt-0.5"></div>
          </div>

          {/* Floating Instructions & Status Pill */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <div className="bg-white/95 backdrop-blur text-[11px] text-slate-800 px-3 py-1 rounded-full shadow-sm border border-slate-200 flex items-center space-x-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                {isGeocoding
                  ? 'Fetching address...'
                  : `${coords[1].toFixed(4)}° N, ${coords[0].toFixed(4)}° E`}
              </span>
            </div>

            <div className="bg-white/95 backdrop-blur text-[10px] text-slate-600 px-2.5 py-1 rounded-full shadow-sm border border-slate-200 font-medium">
              Drag or tap to relocate
            </div>
          </div>

          {/* Map Controls (Zoom In/Out + GPS Recenter) */}
          <div className="absolute bottom-3 right-3 z-10 flex flex-col space-y-1.5">
            <button
              type="button"
              onClick={handleZoomIn}
              className="bg-white/95 hover:bg-slate-50 text-slate-700 p-2 rounded-xl shadow-md border border-slate-200 transition"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="bg-white/95 hover:bg-slate-50 text-slate-700 p-2 rounded-xl shadow-md border border-slate-200 transition"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleUseCurrentGPS(false)}
              disabled={isLocatingGps}
              className="bg-white/95 hover:bg-slate-50 text-emerald-700 p-2.5 rounded-xl shadow-md border border-slate-200 flex items-center justify-center transition"
              title="Locate Me (Live GPS)"
            >
              {isLocatingGps ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <Locate className="w-4 h-4 text-emerald-600" />
              )}
            </button>
          </div>
        </div>

        {/* Use Current GPS Location Action Button */}
        <button
          type="button"
          onClick={() => handleUseCurrentGPS(false)}
          disabled={isLocatingGps}
          className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-emerald-700 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow-xs"
        >
          {isLocatingGps ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Detecting Current Location...</span>
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 text-emerald-600" />
              <span>Use Current GPS Location</span>
            </>
          )}
        </button>

        {/* Address Inputs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Shop / Scrap Yard Address
              </label>
              {isGeocoding && (
                <span className="text-[10px] text-emerald-600 flex items-center space-x-1 font-medium">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  <span>Auto-detecting...</span>
                </span>
              )}
            </div>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Shop 12, Main Recycling Market, Sector 14, Delhi"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 rounded-xl text-xs text-slate-900 outline-none transition resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Landmark / Area (Optional)
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Near Metro Station / Behind Petrol Pump"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 rounded-xl text-xs text-slate-900 outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="p-4 bg-white border-t border-slate-200">
        <button
          onClick={handleSave}
          disabled={isSaving || !address.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-md"
        >
          <CheckCircle className="w-4 h-4" />
          <span>{isSaving ? 'Saving Location...' : 'Save Operating Location'}</span>
        </button>
      </div>
    </div>
  );
};
