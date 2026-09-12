import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerOrder } from '../context/DealerOrderContext';
import { useDealerAuth } from '../context/DealerAuthContext';
import { DealerLiveMap } from '../components/map/DealerLiveMap';
import { mapService } from '../services/mapService';
import { DigitalWeighingModal } from '../components/order/DigitalWeighingModal';
import { Toast } from '../components/common/Toast';
import { SelectedMaterialItem } from '../types';
import { getVehicleDetails } from '../utils/vehicleUtils';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Truck,
  CheckCircle2,
  KeyRound,
  Scale,
  Sparkles,
  Check,
  AlertCircle,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  Radio,
} from 'lucide-react';

export const ActiveJobScreen: React.FC = () => {
  const navigate = useNavigate();
  const { dealer } = useDealerAuth();
  const {
    activeOrder,
    startTrip,
    sendLiveLocation,
    markArrived,
    verifyOtp,
    completeOrder,
    isLoading,
  } = useDealerOrder();

  const [enteredOtp, setEnteredOtp] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [showWeighingModal, setShowWeighingModal] = useState(false);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);
  const [isGpsTracking, setIsGpsTracking] = useState(false);

  const prevCoordsRef = useRef<[number, number] | null>(null);
  const simIntervalRef = useRef<any>(null);

  const vehicleInfo = getVehicleDetails(dealer?.vehicleType);

  // Background Device GPS Watcher (Real-time tracking)
  useEffect(() => {
    if (!activeOrder || !['ACCEPTED', 'DEALER_EN_ROUTE'].includes(activeOrder.status)) {
      setIsGpsTracking(false);
      return;
    }

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported in this browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setIsGpsTracking(true);
        const newCoords: [number, number] = [pos.coords.longitude, pos.coords.latitude];

        let heading = pos.coords.heading || 0;
        if (!heading && prevCoordsRef.current) {
          heading = mapService.calculateBearing(
            [prevCoordsRef.current[1], prevCoordsRef.current[0]],
            [newCoords[1], newCoords[0]]
          );
        }

        const speed = pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : 24;
        prevCoordsRef.current = newCoords;

        sendLiveLocation(newCoords, heading, speed);
      },
      (err) => {
        console.warn('Geolocation watcher warning:', err.message);
        setIsGpsTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [activeOrder?.orderId, activeOrder?.status]);

  // Automated Road Drive Simulation Loop (for testing & desktop demos)
  useEffect(() => {
    if (isSimulatingDrive && routePoints.length > 0) {
      simIntervalRef.current = setInterval(() => {
        setCurrentRouteIndex((prevIdx) => {
          if (prevIdx >= routePoints.length - 1) {
            setIsSimulatingDrive(false);
            if (simIntervalRef.current) clearInterval(simIntervalRef.current);
            return prevIdx;
          }

          const nextIdx = prevIdx + 1;
          const targetPoint = routePoints[nextIdx]; // [lat, lng]
          const prevPoint = routePoints[Math.max(0, nextIdx - 1)];
          const bearing = mapService.calculateBearing(prevPoint, targetPoint);
          const coords: [number, number] = [targetPoint[1], targetPoint[0]];

          sendLiveLocation(coords, bearing, 28);
          return nextIdx;
        });
      }, 1500);
    } else {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    }

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [isSimulatingDrive, routePoints]);

  if (!activeOrder) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 max-w-md mx-auto flex flex-col items-center justify-center p-6 text-center shadow-2xl">
        <Truck className="w-12 h-12 text-slate-400 mb-3" />
        <h2 className="text-base font-bold text-slate-800">No active pickup job</h2>
        <p className="text-xs text-slate-500 mt-1">When you accept a scrap booking, it will appear here.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-xs"
        >
          Go to Duty Dashboard
        </button>
      </div>
    );
  }

  const handleStartTrip = async () => {
    await startTrip(activeOrder.orderId);
  };

  const handleMarkArrived = async () => {
    await markArrived(activeOrder.orderId);
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...enteredOtp];
    newOtp[index] = val.slice(-1);
    setEnteredOtp(newOtp);
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = enteredOtp.join('');
    if (code.length !== 4) {
      setOtpError('Please enter all 4 digits of the OTP.');
      return;
    }

    setOtpError(null);
    setIsVerifyingOtp(true);
    try {
      await verifyOtp(activeOrder.orderId, code);
      setShowWeighingModal(true);
    } catch (err: any) {
      setOtpError(err.response?.data?.message || err.message || 'Incorrect OTP.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleCompleteSettlement = async (finalWeights: any[], finalTotal: number) => {
    await completeOrder(activeOrder.orderId, finalWeights, finalTotal);
    setShowWeighingModal(false);
  };

  const toggleSimulateDrive = () => {
    setIsSimulatingDrive((prev) => !prev);
  };

  const stepForwardRoad = () => {
    if (routePoints.length === 0) {
      const baseLng = activeOrder.pickupLocation.coordinates[0];
      const baseLat = activeOrder.pickupLocation.coordinates[1];
      sendLiveLocation([baseLng + 0.001, baseLat + 0.001], 45, 22);
      return;
    }
    const stepJump = Math.max(1, Math.floor(routePoints.length / 8));
    const nextIdx = Math.min(routePoints.length - 1, currentRouteIndex + stepJump);
    setCurrentRouteIndex(nextIdx);

    const targetPoint = routePoints[nextIdx];
    const prevPoint = routePoints[Math.max(0, nextIdx - 1)];
    const bearing = mapService.calculateBearing(prevPoint, targetPoint);
    sendLiveLocation([targetPoint[1], targetPoint[0]], bearing, 28);
  };

  const resetRoadSimulation = () => {
    setIsSimulatingDrive(false);
    setCurrentRouteIndex(0);
    if (routePoints.length > 0) {
      const start = routePoints[0];
      sendLiveLocation([start[1], start[0]], 0, 0);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 max-w-md mx-auto flex flex-col justify-between shadow-2xl pb-16 relative">
      <Toast />

      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-extrabold text-slate-900">Job #{activeOrder.orderId}</h1>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                {activeOrder.status}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5">
              <span>{vehicleInfo.emoji} {vehicleInfo.name}</span>
              <span>· Customer: {activeOrder.customerName || 'Customer'}</span>
            </p>
          </div>
        </div>

        <a
          href={`tel:${activeOrder.customerPhone}`}
          className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs transition"
          title="Call Customer"
        >
          <Phone className="w-4 h-4" />
        </a>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* ================= STAGE 1: ACCEPTED & STAGE 2: DEALER_EN_ROUTE (Interactive Live Navigation Map) ================= */}
        {['ACCEPTED', 'DEALER_EN_ROUTE'].includes(activeOrder.status) && (
          <div className="space-y-4">
            {/* Live Navigation Map */}
            <DealerLiveMap
              customerCoords={activeOrder.pickupLocation.coordinates}
              customerAddress={activeOrder.pickupAddress}
              dealerCoords={
                activeOrder.dealerLiveLocation?.coordinates || dealer?.location?.coordinates
              }
              vehicleType={dealer?.vehicleType || 'Electric Scrap Loader'}
              onSendLivePing={(coords: [number, number]) => sendLiveLocation(coords, 45, 25)}
              onRouteCalculated={(route) => {
                setRoutePoints(route.coordinates);
              }}
            />

            {/* Live GPS Status Indicator & Testing Controls */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isGpsTracking ? 'bg-emerald-500 animate-ping' : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-800">
                    {isGpsTracking ? 'Device Real GPS Tracking Active' : 'Live Road GPS Ready'}
                  </span>
                </div>

                <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-500">
                  <Radio className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cross-App Sync</span>
                </div>
              </div>

              {/* Simulation buttons for testing on desktop / non-moving devices */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={toggleSimulateDrive}
                  className={`text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs flex items-center space-x-1.5 ${
                    isSimulatingDrive
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isSimulatingDrive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isSimulatingDrive ? 'Pause Drive' : 'Auto Drive Along Road'}</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={stepForwardRoad}
                    title="Step forward 1 segment"
                    className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-2 rounded-xl transition flex items-center space-x-1"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Advance</span>
                  </button>

                  <button
                    type="button"
                    onClick={resetRoadSimulation}
                    title="Reset to starting hub"
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Action buttons depending on state */}
            {activeOrder.status === 'ACCEPTED' ? (
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Customer Pickup Address:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[200px]">
                    {activeOrder.pickupAddress}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Estimated Scrap Payout:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    ₹{activeOrder.estimatedTotalAmount}
                  </span>
                </div>

                <button
                  onClick={handleStartTrip}
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center space-x-2 transition shadow-md"
                >
                  <Truck className="w-5 h-5" />
                  <span>START TRIP / NAVIGATION (EN ROUTE)</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleMarkArrived}
                disabled={isLoading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-4 px-4 rounded-2xl text-sm flex items-center justify-center space-x-2 transition shadow-lg"
              >
                <MapPin className="w-5 h-5" />
                <span>I HAVE ARRIVED AT DOORSTEP</span>
              </button>
            )}
          </div>
        )}

        {/* ================= STAGE 3: ARRIVED & OTP_PENDING ================= */}
        {(activeOrder.status === 'ARRIVED' || activeOrder.status === 'OTP_PENDING') && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-card space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <KeyRound className="w-7 h-7 animate-pulse" />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Enter Customer Pickup OTP</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ask customer for the 4-digit code displayed on their Kabadiwala app screen.
                </p>
              </div>

              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                <div className="flex justify-center space-x-2.5 max-w-xs mx-auto">
                  {enteredOtp.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      className="w-14 h-16 text-center text-2xl font-black text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 rounded-2xl outline-none transition"
                    />
                  ))}
                </div>

                {otpError && <p className="text-xs text-rose-600 font-semibold">{otpError}</p>}

                <button
                  type="submit"
                  disabled={isVerifyingOtp || enteredOtp.some((d) => !d)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center space-x-2 transition shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>{isVerifyingOtp ? 'Verifying OTP...' : 'VERIFY OTP & START WEIGHING'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= STAGE 4: OTP_VERIFIED (Weighing in Progress) ================= */}
        {activeOrder.status === 'OTP_VERIFIED' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-teal-200 shadow-card space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-200">
                <Scale className="w-7 h-7 animate-bounce" />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-slate-900">OTP Verified! Weigh Scrap</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Weigh customer scrap on your electronic scale and record final weights.
                </p>
              </div>

              <button
                onClick={() => setShowWeighingModal(true)}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-4 px-4 rounded-2xl text-sm flex items-center justify-center space-x-2 transition shadow-lg"
              >
                <Scale className="w-5 h-5" />
                <span>RECORD WEIGHMENT & COMPLETE PICKUP</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STAGE 5: COMPLETED ================= */}
        {activeOrder.status === 'COMPLETED' && (
          <div className="space-y-4 text-center">
            <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-card space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Scrap Pickup Completed!</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Payment settled with customer on site.
                </p>
              </div>

              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                <div className="text-left">
                  <div className="text-xs text-slate-400">Total Payout Paid</div>
                  <div className="text-[11px] text-emerald-400">Cash / UPI Settled</div>
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  ₹{activeOrder.finalTotalAmount || activeOrder.estimatedTotalAmount}
                </div>
              </div>

              <button
                onClick={() => navigate('/')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl text-xs transition shadow-md"
              >
                Back to Duty Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Items Checklist Card */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Customer Scrap Items
          </div>
          <div className="divide-y divide-slate-100">
            {activeOrder.selectedMaterials.map((item: SelectedMaterialItem, idx: number) => (
              <div key={idx} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{item.name}</div>
                  <div className="text-[10px] text-slate-400">
                    Est. {item.estimatedWeightKg} {item.unit} @ ₹{item.pricePerKg}/{item.unit}
                  </div>
                </div>
                <div className="font-extrabold text-emerald-700">₹{item.calculatedAmount}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Digital Scale Weighing Modal */}
      <DigitalWeighingModal
        isOpen={showWeighingModal}
        onClose={() => setShowWeighingModal(false)}
        selectedMaterials={activeOrder.selectedMaterials}
        onComplete={handleCompleteSettlement}
        isLoading={isLoading}
      />
    </div>
  );
};
