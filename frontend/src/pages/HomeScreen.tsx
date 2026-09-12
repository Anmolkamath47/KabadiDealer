import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerAuth } from '../context/DealerAuthContext';
import { useDealerOrder } from '../context/DealerOrderContext';
import { DealerHeader } from '../components/layout/DealerHeader';
import { DealerBottomNav } from '../components/layout/DealerBottomNav';
import { IncomingRequestModal } from '../components/order/IncomingRequestModal';
import { Toast } from '../components/common/Toast';
import {
  Truck,
  Power,
  MapPin,
  IndianRupee,
  Navigation,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { dealer, toggleOnlineStatus } = useDealerAuth();
  const { activeOrder, fetchActiveOrder } = useDealerOrder();

  useEffect(() => {
    fetchActiveOrder();
  }, []);

  const handleToggleStatus = () => {
    if (dealer) {
      toggleOnlineStatus(!dealer.isOnline);
    }
  };

  const hasActiveJob =
    activeOrder &&
    ['ACCEPTED', 'DEALER_EN_ROUTE', 'ARRIVED', 'OTP_PENDING', 'OTP_VERIFIED'].includes(
      activeOrder.status
    );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between max-w-md mx-auto relative pb-20 shadow-2xl">
      <DealerHeader />
      <Toast />
      <IncomingRequestModal />

      <main className="flex-1 p-4 space-y-4">
        {/* Large Prominent Online / Offline Availability Switch Card */}
        <div
          className={`p-5 rounded-3xl border transition-all duration-300 shadow-card ${
            dealer?.isOnline
              ? 'bg-gradient-to-br from-emerald-50 via-white to-white border-emerald-300 ring-1 ring-emerald-500/20'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition ${
                  dealer?.isOnline
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Power className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-extrabold text-slate-900">
                    {dealer?.isOnline ? 'YOU ARE ONLINE' : 'YOU ARE OFFLINE'}
                  </h2>
                  {dealer?.isOnline && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {dealer?.isOnline
                    ? `Discoverable to nearby customers within ${dealer.activeRadiusKm || 15} km`
                    : 'Turn ON to start receiving pickup requests'}
                </p>
              </div>
            </div>

            {/* Toggle switch */}
            <button
              onClick={handleToggleStatus}
              className={`w-14 h-8 rounded-full transition-colors relative p-1 focus:outline-none ${
                dealer?.isOnline ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white transition-transform shadow-md ${
                  dealer?.isOnline ? 'translate-x-6' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>
        </div>

        {/* Active Pickup Job Banner (if dealer has an accepted order) */}
        {hasActiveJob && (
          <div
            onClick={() => navigate('/active-order')}
            className="bg-emerald-600 text-white p-4 rounded-3xl shadow-lg cursor-pointer flex items-center justify-between transition hover:bg-emerald-700"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center flex-shrink-0">
                <Navigation className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-white">Active Scrap Pickup</span>
                  <span className="text-[10px] bg-white/30 text-white px-2 py-0.5 rounded-full font-bold">
                    {activeOrder.status}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100 truncate mt-0.5">
                  {activeOrder.pickupAddress}
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-xl flex-shrink-0 shadow-xs">
              Navigate →
            </span>
          </div>
        )}

        {/* Operating Base Location Card */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Base Scrap Depot</span>
            </div>
            <button
              onClick={() => navigate('/location')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              Update
            </button>
          </div>

          <p className="text-xs text-slate-800 font-semibold">
            {dealer?.location?.address || 'Location not configured - Update in Settings'}
          </p>

          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
            <span>Vehicle: {dealer?.vehicleType || 'Not specified'}</span>
            <span className="font-mono text-emerald-700 font-semibold">{dealer?.vehicleNumber || 'No plate registered'}</span>
          </div>
        </div>

        {/* Scrap Rates Overview Widget */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Your Scrap Buying Rates</h3>
              <p className="text-[11px] text-slate-500">Exposed to nearby consumers for booking</p>
            </div>
            <button
              onClick={() => navigate('/prices')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center"
            >
              <span>Edit Rates</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {dealer?.scrapRates && dealer.scrapRates.length > 0 ? (
              dealer.scrapRates.slice(0, 4).map((rate, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{rate.name}</div>
                    <div className="text-[10px] text-slate-400">{rate.category}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-black text-emerald-700">₹{rate.pricePerKg}</div>
                    <div className="text-[9px] text-slate-400">/{rate.unit}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 col-span-2 py-2">No scrap rates configured. Tap 'Edit Rates' to add.</p>
            )}
          </div>
        </div>

        {/* Partner Guarantee Badge */}
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center space-x-3 text-xs text-emerald-900">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-[11px] leading-snug">
            All scrap pickups require 4-digit customer OTP verification at doorstep before weighment.
          </p>
        </div>
      </main>

      <DealerBottomNav />
    </div>
  );
};
