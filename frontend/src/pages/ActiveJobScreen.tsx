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
import { orderChatService, OrderChatMessage } from '../services/orderChatService';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Truck,
  CheckCircle2,
  KeyRound,
  Scale,
  Check,
  Star,
  MessageSquare,
  Camera,
  Eye,
  X,
  Send,
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
  const [previewPhoto, setPreviewPhoto] = useState<boolean>(false);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<OrderChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [hasUnreadMessage, setHasUnreadMessage] = useState<boolean>(false);
  const [latestCustomerMsg, setLatestCustomerMsg] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const prevCoordsRef = useRef<[number, number] | null>(null);

  const vehicleInfo = getVehicleDetails(dealer?.vehicleType);

  // Real-time Chat Subscription
  useEffect(() => {
    if (!activeOrder?.orderId) return;
    const unsubscribe = orderChatService.subscribe(activeOrder.orderId, (msgs) => {
      setChatMessages(msgs);
      const customerMsgs = msgs.filter((m) => m.sender === 'consumer');
      if (customerMsgs.length > 0) {
        const lastMsg = customerMsgs[customerMsgs.length - 1];
        setLatestCustomerMsg(lastMsg.text);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [activeOrder?.orderId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isChatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // Background Device GPS Watcher (Real-time tracking)
  useEffect(() => {
    if (!activeOrder || !['ACCEPTED', 'DEALER_EN_ROUTE'].includes(activeOrder.status)) {
      return;
    }

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported in this browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
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

  const handleCompleteSettlement = async (finalWeights: any[], finalTotal: number, scrapPhoto?: string) => {
    await completeOrder(activeOrder.orderId, finalWeights, finalTotal, scrapPhoto);
    setShowWeighingModal(false);
  };

  const handleSendDealerMessage = (textToSend?: string) => {
    const txt = (textToSend || chatInput).trim();
    if (!txt || !activeOrder?.orderId) return;
    try {
      const senderName = dealer?.contactPerson || dealer?.businessName || 'Dealer Partner';
      orderChatService.sendMessage(activeOrder.orderId, 'dealer', senderName, txt);
      setChatInput('');
    } catch (err) {
      console.warn('Failed to send dealer chat message:', err);
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

        <div className="flex items-center space-x-2">
          {/* Chat with Customer button */}
          <button
            type="button"
            onClick={() => {
              setIsChatOpen(true);
              setHasUnreadMessage(false);
            }}
            className="relative w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shadow-xs transition cursor-pointer"
            title="Chat with Customer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-700" />
            {hasUnreadMessage && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-white animate-pulse"></span>
            )}
          </button>

          {/* Call Customer button */}
          <a
            href={`tel:${activeOrder.customerPhone}`}
            className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs transition cursor-pointer"
            title="Call Customer"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Customer Message Notification Banner */}
      {latestCustomerMsg && (
        <div className="bg-slate-900 text-white px-4 py-2.5 border-b border-slate-800 shadow-xs flex items-center justify-between z-20">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div className="truncate text-xs">
              <span className="font-bold text-slate-200">{activeOrder.customerName || 'Customer'}: </span>
              <span className="text-emerald-300">"{latestCustomerMsg}"</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsChatOpen(true);
              setHasUnreadMessage(false);
            }}
            className="ml-2 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] transition cursor-pointer flex-shrink-0 uppercase tracking-wide"
          >
            Reply
          </button>
        </div>
      )}

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
            />

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
                  Ask customer for the 4-digit code displayed on their Scrapwala app screen.
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

              {/* Collected Scrap Photo Proof Card */}
              {activeOrder.scrapPhoto && (
                <div className="bg-white border-2 border-emerald-200 rounded-2xl p-3.5 text-left space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>Collected Scrap Photo</span>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      Verified Proof
                    </span>
                  </div>

                  <div
                    onClick={() => setPreviewPhoto(true)}
                    className="relative h-44 rounded-xl overflow-hidden cursor-pointer group bg-slate-950 border border-slate-200 shadow-2xs"
                  >
                    <img
                      src={activeOrder.scrapPhoto}
                      alt="Collected Scrap"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition flex items-center justify-center">
                      <span className="bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center space-x-1.5 opacity-90 group-hover:opacity-100 transition shadow-md">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Tap to View Full Photo</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Rating & Review Section */}
              {activeOrder.rating ? (
                <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border-2 border-amber-200 p-4 rounded-2xl text-left space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
                        Customer Rating & Review
                      </span>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                      Verified Customer
                    </span>
                  </div>

                  {/* Stars Display */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-5 h-5 ${
                            s <= activeOrder.rating!.score
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-extrabold text-slate-900">
                      {activeOrder.rating.score}.0 / 5.0
                    </span>
                  </div>

                  {/* Feedback Comment */}
                  {activeOrder.rating.feedback && (
                    <div className="bg-white/90 p-3 rounded-xl border border-amber-100/80 text-xs text-slate-700 italic flex items-start space-x-2">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="font-medium">"{activeOrder.rating.feedback}"</span>
                    </div>
                  )}

                  {/* Tags */}
                  {activeOrder.rating.tags && activeOrder.rating.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeOrder.rating.tags.map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md"
                        >
                          ✓ {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-2xl text-center space-y-2">
                  <div className="flex items-center justify-center space-x-1 text-xs font-bold text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping mr-1"></span>
                    <span>Waiting for Customer Rating...</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    The customer is reviewing their pickup experience. Your feedback will appear here in real time.
                  </p>
                </div>
              )}

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

      {/* Full Photo Preview Modal */}
      {previewPhoto && activeOrder.scrapPhoto && (
        <div
          onClick={() => setPreviewPhoto(false)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative"
          >
            <div className="p-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2 text-xs font-bold">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Collected Scrap Proof</span>
              </div>
              <button
                onClick={() => setPreviewPhoto(false)}
                className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative max-h-[70vh] overflow-hidden bg-black flex items-center justify-center">
              <img
                src={activeOrder.scrapPhoto}
                alt="Collected Scrap Full View"
                className="w-full max-h-[70vh] object-contain"
              />
            </div>

            <div className="p-3 bg-slate-800 text-slate-300 text-xs flex items-center justify-between">
              <span>Order #{activeOrder.orderId}</span>
              <span className="text-emerald-400 font-bold">
                ₹{activeOrder.finalTotalAmount || activeOrder.estimatedTotalAmount} Paid
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dealer In-App Chat Modal with Customer */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-black text-sm flex items-center justify-center uppercase select-none shadow-inner flex-shrink-0">
                  {(activeOrder.customerName || 'Customer').trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {activeOrder.customerName || 'Customer'}
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-semibold truncate">
                    Pickup Customer · Order #{activeOrder.orderId}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                {activeOrder.customerPhone && (
                  <a
                    href={`tel:${activeOrder.customerPhone}`}
                    className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition shadow-xs"
                    title="Call Customer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Message List */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 bg-slate-50 min-h-[220px]">
              {chatMessages.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-8">
                  No messages yet. Send a quick update to the customer below.
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === 'dealer' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        msg.sender === 'dealer'
                          ? 'bg-emerald-600 text-white rounded-tr-xs shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 px-1">
                      {msg.formattedTime || new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Dealer Response Chips */}
            <div className="p-2.5 bg-white border-t border-slate-100 flex items-center space-x-1.5 overflow-x-auto text-[11px] select-none">
              {[
                'Reaching in 5 mins 🛵',
                'I am at your gate / entrance 🚪',
                'Please keep scrap packed & ready 📦',
                'Please share the 4-digit OTP 🔑',
                'Certified digital scale is ready ⚖️',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendDealerMessage(chip)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium whitespace-nowrap cursor-pointer transition active:scale-95 border border-slate-200"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendDealerMessage();
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Reply to customer..."
                className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-3.5 py-2 text-xs text-slate-800 outline-hidden focus:border-emerald-500 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
