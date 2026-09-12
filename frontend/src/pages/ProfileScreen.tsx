import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Truck,
  MapPin,
  Star,
  Package,
  Power,
  Edit2,
  CheckCircle2,
  PhoneCall,
  ShieldCheck,
  LogOut,
  ChevronRight,
  TrendingUp,
  Scale,
  Camera,
  Mail,
  Upload,
} from 'lucide-react';
import { useDealerAuth } from '../context/DealerAuthContext';
import { DealerHeader } from '../components/layout/DealerHeader';
import { DealerBottomNav } from '../components/layout/DealerBottomNav';
import { LogoutModal } from '../components/common/LogoutModal';
import { Modal } from '../components/common/Modal';
import { getDealerInitial } from '../utils/avatarUtils';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { dealer, toggleOnlineStatus, updateProfile, logout } = useDealerAuth();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Edit form state
  const [businessName, setBusinessName] = useState(dealer?.businessName || '');
  const [contactPerson, setContactPerson] = useState(dealer?.contactPerson || '');
  const [email, setEmail] = useState(dealer?.email || '');
  const [vehicleType, setVehicleType] = useState(dealer?.vehicleType || 'Three-Wheeler Auto');
  const [vehicleNumber, setVehicleNumber] = useState(dealer?.vehicleNumber || '');
  const [profileImage, setProfileImage] = useState(dealer?.profileImage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!dealer) return null;

  const firstLetter = getDealerInitial(dealer);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 250;
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        businessName: businessName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim() || undefined,
        vehicleType,
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        profileImage: profileImage || undefined,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowEditModal(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to update profile', error);
    } finally {
      setIsSaving(false);
    }
  };

  const rating = dealer.rating || 5.0;
  const totalReviews = dealer.totalRatings || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-24">
      <DealerHeader />

      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center space-x-3.5">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                {dealer.profileImage ? (
                  <img
                    src={dealer.profileImage}
                    alt={dealer.businessName}
                    className="w-full h-full object-cover rounded-2xl border-2 border-emerald-500"
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-700 to-emerald-900 text-white flex items-center justify-center text-2xl font-black shadow-md border-2 border-emerald-500">
                    {firstLetter}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center space-x-1.5">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {dealer.businessName || 'Partner Account'}
                  </h2>
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {dealer.contactPerson &&
                    dealer.contactPerson !== 'Partner Collector' &&
                    dealer.contactPerson !== 'Partner Dealer' &&
                    dealer.contactPerson.toLowerCase() !== dealer.businessName?.toLowerCase() && (
                      <span className="font-semibold text-slate-700">{dealer.contactPerson} · </span>
                    )}
                  ID: <span className="font-mono text-slate-700">{dealer.dealerId}</span>
                </p>
                <p className="text-xs text-emerald-700 font-medium flex items-center mt-1">
                  <Phone className="w-3 h-3 mr-1 text-slate-400" />
                  {dealer.phone}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setBusinessName(dealer.businessName);
                setContactPerson(
                  dealer.contactPerson &&
                    dealer.contactPerson !== 'Partner Collector' &&
                    dealer.contactPerson !== 'Partner Dealer'
                    ? dealer.contactPerson
                    : ''
                );
                setEmail(dealer.email || '');
                setVehicleType(dealer.vehicleType || 'Three-Wheeler Auto');
                setVehicleNumber(dealer.vehicleNumber || '');
                setProfileImage(dealer.profileImage || '');
                setShowEditModal(true);
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
              title="Edit Profile"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Status Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${dealer.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-sm font-semibold text-slate-700">
                Status: <span className={dealer.isOnline ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>{dealer.isOnline ? 'Online & Available' : 'Offline'}</span>
              </span>
            </div>

            <button
              onClick={() => toggleOnlineStatus(!dealer.isOnline)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                dealer.isOnline
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{dealer.isOnline ? 'Go Offline' : 'Go Online'}</span>
            </button>
          </div>
        </div>

        {/* Lifetime Performance Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center flex flex-col items-center shadow-card">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-1.5">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <span className="text-lg font-black text-slate-900">{rating}</span>
            <span className="text-[11px] text-slate-500 font-medium">Dealer Rating</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center flex flex-col items-center shadow-card">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-lg font-black text-slate-900">{totalReviews}</span>
            <span className="text-[11px] text-slate-500 font-medium">Ratings Count</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center flex flex-col items-center shadow-card">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-1.5">
              <TrendingUp className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-lg font-black text-slate-900">{dealer.activeRadiusKm || 15} km</span>
            <span className="text-[11px] text-slate-500 font-medium">Duty Radius</span>
          </div>
        </div>

        {/* Vehicle & Logistics Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center">
              <Truck className="w-4 h-4 mr-2 text-emerald-600" />
              Pickup Vehicle Details
            </h3>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-md border border-emerald-200">
              Verified
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Vehicle Type</span>
              <span className="font-semibold text-slate-800">{dealer.vehicleType || 'Three-Wheeler Auto'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Registration No.</span>
              <span className="font-mono font-bold text-emerald-700">{dealer.vehicleNumber || 'Not registered'}</span>
            </div>
          </div>
        </div>

        {/* Operating Base & Location */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-rose-500" />
              Operating Base Station
            </h3>
            <button
              onClick={() => navigate('/location')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center"
            >
              Update <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
            <p className="font-medium text-slate-800">
              {dealer.location?.address || 'Location not configured - Update in Settings'}
            </p>
            {dealer.location?.landmark && (
              <p className="text-slate-500">Landmark: {dealer.location.landmark}</p>
            )}
            <div className="flex items-center justify-between pt-1.5 text-[11px] text-slate-500 font-mono">
              <span>Lat: {dealer.location?.coordinates?.[1]?.toFixed(4)}</span>
              <span>Lng: {dealer.location?.coordinates?.[0]?.toFixed(4)}</span>
              <span className="text-emerald-700 font-bold">{dealer.activeRadiusKm || 15} km Radius</span>
            </div>
          </div>
        </div>

        {/* Quick Rate Card Shortcut */}
        <div
          onClick={() => navigate('/prices')}
          className="bg-emerald-50 border border-emerald-200 hover:border-emerald-300 p-4 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-xs group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950 group-hover:text-emerald-800 transition-colors">
                Material Scrap Buying Rates
              </h4>
              <p className="text-xs text-emerald-700/80">
                Manage per-kg buying prices for paper, plastics & metals
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-emerald-700 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Support & Helpline */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 shadow-card text-left flex items-center space-x-2.5 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Partner Support</span>
              <span className="text-[10px] text-slate-500">Toll Free 24x7</span>
            </div>
          </button>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-3 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-left flex items-center space-x-2.5 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-rose-700 block">Logout App</span>
              <span className="text-[10px] text-rose-500">End duty session</span>
            </div>
          </button>
        </div>

        {/* App Version Info */}
        <div className="text-center py-2">
          <p className="text-[11px] text-slate-400">
            Kabadidealer Partner App • v1.0.0 (Production Build)
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Secured end-to-end with Kabadiwala Real-time Dispatch Network
          </p>
        </div>
      </main>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Partner Profile"
      >
        <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
          {/* Avatar Upload in Edit Modal */}
          <div className="flex items-center space-x-3.5 pb-2 border-b border-slate-800">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Partner Avatar"
                  className="w-full h-full object-cover border border-emerald-500 rounded-2xl"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-800 text-white flex items-center justify-center text-xl font-black shadow-md border border-slate-700">
                  {getDealerInitial({ businessName, contactPerson })}
                </div>
              )}
              <label
                className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center cursor-pointer shadow-md border border-slate-900"
                title="Change Photo"
              >
                <Camera className="w-2.5 h-2.5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-0.5">
              <label className="text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer inline-flex items-center space-x-1">
                <Upload className="w-3 h-3" />
                <span>Change Photo</span>
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
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Remove photo (use first letter DP)
                  </button>
                </div>
              )}
              <p className="text-[10px] text-slate-400">
                {profileImage ? 'Custom photo set' : 'Using first letter of name as DP'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Business / Scrap Center Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. GreenEarth Scrap Hub"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Contact Person / Driver</label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Email Address (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ramesh.scrap@gmail.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Vehicle Type</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="Three-Wheeler Auto">Three-Wheeler Auto (Tempo)</option>
              <option value="Electric Loader (E-Rickshaw)">Electric Loader (E-Rickshaw)</option>
              <option value="Mini Truck (Tata Ace / Mahindra)">Mini Truck (Tata Ace / Mahindra)</option>
              <option value="Two Wheeler / Cycle Cart">Two Wheeler / Cycle Cart</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Vehicle Registration Number</label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 uppercase font-mono tracking-wider focus:outline-none focus:border-emerald-500"
              placeholder="e.g. DL 1AA 8899"
              required
            />
          </div>

          {saveSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Partner details updated successfully!</span>
            </div>
          )}

          <div className="flex space-x-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-900/40 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Support Modal */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="Partner Support & Helpdesk"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
            <span className="font-bold block text-sm">Emergency Operational Hotline</span>
            <p className="text-slate-300 font-mono text-base font-bold">1800-KABADI-HELP (1800-522-234)</p>
            <p className="text-[11px] text-slate-400">Operating hours: 07:00 AM - 09:00 PM (All 7 Days)</p>
          </div>

          <div className="space-y-2 text-slate-300">
            <p className="font-bold text-slate-200">Common Guidelines:</p>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
              <li>Always verify the 4-digit Customer Pickup OTP before loading scrap.</li>
              <li>Ensure digital scale is zeroed and certified before recording weighments.</li>
              <li>Toggle your status to <strong className="text-rose-400">Offline</strong> whenever taking breaks or vehicle maintenance.</li>
              <li>Payouts are immediately logged into your lifetime ledger summary.</li>
            </ul>
          </div>

          <button
            onClick={() => setShowHelpModal(false)}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
          >
            Close Helpdesk
          </button>
        </div>
      </Modal>

      {/* Logout Confirmation */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={logout}
      />

      <DealerBottomNav />
    </div>
  );
};
