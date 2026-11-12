import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerAuth } from '../context/DealerAuthContext';
import { DealerLocationPickerMap } from '../components/map/DealerLocationPickerMap';
import { mapService } from '../services/mapService';
import { getDealerInitial } from '../utils/avatarUtils';
import { reconcileCityCoordinates } from '../utils/geoUtils';
import {
  MapPin,
  Locate,
  Navigation,
  User,
  Camera,
  Check,
  ArrowRight,
  Sparkles,
  Truck,
  Upload,
  ShieldCheck,
  Building2,
  Mail,
  Compass,
} from 'lucide-react';

const VEHICLE_OPTIONS = [
  { id: 'Electric Scrap Loader', label: 'E-Rickshaw Loader', desc: 'Eco-friendly, best for congested lanes' },
  { id: '3-Wheeler Auto Loader', label: '3-Wheeler Auto (Ape)', desc: 'Ideal for 300-800 kg scrap capacity' },
  { id: 'Tata Ace Mini Truck', label: 'Mini Truck (Tata Ace)', desc: 'High capacity 1-2 Ton commercial pickup' },
  { id: '2-Wheeler with Cart', label: '2-Wheeler with Cart', desc: 'Quick doorstep paper & light scrap' },
];

export const DealerOnboardingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { dealer, updateProfile, updateLocation } = useDealerAuth();

  // Wizard Step: 1 = Hub Location & Radius, 2 = Business Profile & Vehicle
  const [step, setStep] = useState<1 | 2>(1);

  // --- Location & Radius State ---
  const [coords, setCoords] = useState<[number, number]>(() => {
    return dealer?.location?.coordinates || [77.2150, 28.6250];
  });
  const [addressText, setAddressText] = useState(
    dealer?.location?.address &&
      dealer.location.address !== 'Location not configured - Update in Settings'
      ? dealer.location.address
      : 'Main Scrap Yard, Sector 12, Industrial Area, New Delhi'
  );
  const [landmark, setLandmark] = useState(dealer?.location?.landmark || '');
  const [radiusKm, setRadiusKm] = useState<number>(dealer?.activeRadiusKm || 8);
  const [locationMode, setLocationMode] = useState<'choice' | 'map'>('choice');
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  // --- Profile & Vehicle State ---
  const [businessName, setBusinessName] = useState(
    dealer?.businessName && dealer.businessName !== 'Scrap Collector'
      ? dealer.businessName
      : ''
  );
  const [contactPerson, setContactPerson] = useState(
    dealer?.contactPerson && dealer.contactPerson !== 'Partner Dealer'
      ? dealer.contactPerson
      : ''
  );
  const [email, setEmail] = useState(dealer?.email || '');
  const [vehicleType, setVehicleType] = useState(dealer?.vehicleType || 'Electric Scrap Loader');
  const [vehicleNumber, setVehicleNumber] = useState(dealer?.vehicleNumber || '');
  const [profileImage, setProfileImage] = useState<string>(dealer?.profileImage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derive initial DP letter from businessName or contactPerson
  const initialLetter = getDealerInitial({ businessName, contactPerson });

  // Live GPS locator
  const handleUseLiveLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newCoords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setCoords(newCoords);
        try {
          const resolvedAddress = await mapService.reverseGeocode(
            pos.coords.latitude,
            pos.coords.longitude
          );
          setAddressText(resolvedAddress);
        } catch {
          setAddressText(`Hub Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        }
        setIsLocatingGPS(false);
        setLocationMode('map');
      },
      () => {
        setIsLocatingGPS(false);
        alert('Could not retrieve your live location. Please mark on map manually.');
        setLocationMode('map');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Image upload handling with compression
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 260;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setProfileImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Step 1: Proceed to Profile
  const handleConfirmLocationStep = () => {
    if (!addressText.trim()) {
      alert('Please enter or verify your operating hub address.');
      return;
    }
    setStep(2);
  };

  // Step 2: Save Profile & Complete Onboarding
  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setErrorMessage('Please enter your business or scrap depot name');
      return;
    }
    if (!contactPerson.trim()) {
      setErrorMessage('Please enter the contact person or driver name');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Update location coordinates & address
      const healedCoords = reconcileCityCoordinates(addressText.trim(), coords);
      await updateLocation(healedCoords, addressText.trim(), landmark.trim() || undefined);

      // 2. Update dealer profile with vehicle, hub name, photo, and completion flag
      await updateProfile({
        businessName: businessName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim() || undefined,
        vehicleType,
        vehicleNumber: vehicleNumber.trim() || 'Pending Registration',
        profileImage: profileImage || undefined,
        activeRadiusKm: radiusKm,
        isProfileCompleted: true,
      });

      // 3. Navigate to Partner Dashboard
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to save partner profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between max-w-md mx-auto shadow-2xl relative">
      {/* Header Bar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white">Partner Dealer Setup</h1>
              <p className="text-[11px] text-slate-400">Step {step} of 2</p>
            </div>
          </div>

          {/* Stepper Pill */}
          <div className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
            {step === 1 ? 'Location & Radius' : 'Hub & Identity'}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: step === 1 ? '50%' : '100%' }}
          ></div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {/* ================= STEP 1: HUB LOCATION & SERVICE RADIUS ================= */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                Where is your scrap depot located?
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Pin your operating warehouse or shop on the real map to receive nearby scrap pickup leads.
              </p>
            </div>

            {/* Choice Cards (if not already opened map) */}
            {locationMode === 'choice' && (
              <div className="space-y-3 pt-2">
                {/* Option 1: Live GPS Location */}
                <div
                  onClick={handleUseLiveLocation}
                  className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 hover:from-emerald-500 hover:to-teal-600 text-white p-5 rounded-3xl cursor-pointer shadow-xl transition transform active:scale-[0.98] border border-emerald-400/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 max-w-[240px]">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                        <Locate className={`w-6 h-6 ${isLocatingGPS ? 'animate-spin' : ''}`} />
                      </div>
                      <h3 className="text-base font-extrabold">Use Live GPS Location</h3>
                      <p className="text-xs text-emerald-100 leading-relaxed">
                        Detect your current depot or shop with high accuracy in one tap.
                      </p>
                    </div>
                    <span className="text-xs bg-white/20 font-bold px-3 py-1 rounded-full text-white backdrop-blur-xs">
                      {isLocatingGPS ? 'Locating...' : 'Instant'}
                    </span>
                  </div>
                </div>

                {/* Option 2: Mark on Map */}
                <div
                  onClick={() => setLocationMode('map')}
                  className="bg-slate-900 hover:bg-slate-800/80 text-white border-2 border-slate-800 hover:border-emerald-500/80 p-5 rounded-3xl cursor-pointer shadow-lg transition transform active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 max-w-[240px]">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-extrabold">Mark on Real Map</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Drag the pin on satellite or street view and adjust your operational pickup coverage.
                      </p>
                    </div>
                    <span className="text-xs bg-slate-800 font-bold px-3 py-1 rounded-full text-emerald-400 border border-slate-700">
                      Real Map
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Map Picker Section */}
            {locationMode === 'map' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                    <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Operating Depot Location & Coverage</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleUseLiveLocation}
                    className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center space-x-1"
                  >
                    <Locate className="w-3 h-3" />
                    <span>Re-detect GPS</span>
                  </button>
                </div>

                <DealerLocationPickerMap
                  initialCoords={coords}
                  radiusKm={radiusKm}
                  onLocationChange={(newCoords) => setCoords(newCoords)}
                  onAddressResolved={(addr) => setAddressText(addr)}
                  heightClass="h-72 sm:h-80"
                />

                {/* Service Radius Slider */}
                <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <Compass className="w-4 h-4 text-emerald-400" />
                      <span>Service Area Radius</span>
                    </label>
                    <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                      {radiusKm} km coverage
                    </span>
                  </div>

                  <input
                    type="range"
                    min={2}
                    max={25}
                    step={1}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />

                  <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                    <span>2 km (Local)</span>
                    <span>10 km (Sub-city)</span>
                    <span>25 km (Regional Hub)</span>
                  </div>
                </div>

                {/* Address Form Inputs */}
                <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Scrap Depot / Yard Operating Address
                    </label>
                    <textarea
                      rows={2}
                      value={addressText}
                      onChange={(e) => setAddressText(e.target.value)}
                      placeholder="Shop/Depot no., Street, Industrial Area, Locality"
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 focus:bg-slate-800 rounded-2xl text-xs font-semibold text-white outline-none transition resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Nearby Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Near Metro Station / Behind Recycling Yard"
                      className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 focus:bg-slate-800 rounded-xl text-xs font-semibold text-white outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmLocationStep}
                  disabled={!addressText.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center space-x-2 transition shadow-lg"
                >
                  <span>Confirm Location & Next: Partner Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 2: BUSINESS IDENTITY & VEHICLE ================= */}
        {step === 2 && (
          <form onSubmit={handleCompleteOnboarding} className="space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                Complete Partner Profile
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Add your business name, driver contact, and vehicle details for scrap pickup dispatch.
              </p>
            </div>

            {/* Profile Picture Upload & Dynamic Letter DP (NO emoji avatars) */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 text-center space-y-4">
              <div className="relative w-24 h-24 mx-auto">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Partner Avatar"
                    className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-xl"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-700 to-emerald-900 text-white flex items-center justify-center text-4xl font-black shadow-2xl border-4 border-slate-800 tracking-tight">
                    {initialLetter}
                  </div>
                )}

                {/* Upload Button overlay badge */}
                <label
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center cursor-pointer shadow-md border-2 border-slate-900 transition active:scale-95"
                  title="Upload Photo"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer inline-flex items-center space-x-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Partner / Shop Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>

                {profileImage && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setProfileImage('')}
                      className="text-[11px] font-semibold text-rose-400 hover:underline"
                    >
                      Use first letter DP instead
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-slate-400">
                  {profileImage
                    ? 'Photo uploaded · Click camera to change'
                    : `First letter (${initialLetter}) will be displayed as your partner DP`}
                </p>
              </div>
            </div>

            {/* Profile Inputs */}
            <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Business / Hub Name <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Arun Scrap Traders & Recycling Hub"
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 focus:bg-slate-800 rounded-xl text-xs font-bold text-white outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Contact Person / Collector Name <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Arun Kumar"
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 focus:bg-slate-800 rounded-xl text-xs font-bold text-white outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Email Address <span className="text-slate-500 font-normal">(Optional, for invoices)</span></span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. arun.kabadi@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 focus:bg-slate-800 rounded-xl text-xs font-medium text-white outline-none transition"
                />
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-3">
              <label className="block text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Pickup Vehicle Fleet</span>
              </label>

              <div className="grid grid-cols-1 gap-2">
                {VEHICLE_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setVehicleType(opt.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      vehicleType === opt.id
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-xs'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{opt.label}</div>
                      <div className="text-[10px] text-slate-400">{opt.desc}</div>
                    </div>
                    {vehicleType === opt.id && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Vehicle Registration Number (Optional)
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. DL 1R 8892"
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 focus:bg-slate-800 rounded-xl text-xs font-mono font-bold text-white outline-none transition uppercase"
                />
              </div>
            </div>

            {/* Operating Hub Location Summary */}
            <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-2xl flex items-start space-x-2.5">
              <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 text-left">
                <div className="text-xs font-bold text-emerald-300">
                  Confirmed Hub ({radiusKm} km service coverage)
                </div>
                <div className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{addressText}</div>
              </div>
            </div>

            {errorMessage && (
              <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-semibold p-3 rounded-2xl">
                {errorMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={isSaving || !businessName.trim() || !contactPerson.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center space-x-2 transition shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Completing Setup...' : 'Complete & Start Receiving Leads'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Security Badges */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 text-center">
        <div className="flex items-center justify-center space-x-1.5 text-slate-400 text-[11px] font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Verified Partner Network · Automated Scrap Dispatch</span>
        </div>
      </div>
    </div>
  );
};
