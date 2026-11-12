import React, { useState, useEffect } from 'react';
import { useDealerOrder } from '../../context/DealerOrderContext';
import {
  BellRing,
  Volume2,
  VolumeX,
  MapPin,
  Clock,
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Camera,
  Eye,
  ZoomIn,
} from 'lucide-react';

export const IncomingRequestModal: React.FC = () => {
  const {
    incomingRequest,
    acceptRequest,
    rejectRequest,
    isAlarmPlaying,
    stopAlarm,
    isLoading,
  } = useDealerOrder();

  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState<boolean>(false);

  useEffect(() => {
    if (!incomingRequest) return;

    // Calculate remaining seconds based on expiresAt
    const expiry = new Date(incomingRequest.expiresAt).getTime();
    const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
    setTimeLeft(remaining > 0 ? remaining : 60);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          stopAlarm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingRequest]);

  if (!incomingRequest) return null;

  const handleAccept = async () => {
    await acceptRequest(incomingRequest.orderId);
  };

  const handleReject = async () => {
    await rejectRequest(incomingRequest.orderId, 'Dealer declined request');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-300">
      <div className="bg-white border-2 border-emerald-500 text-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col p-5 space-y-4">
        {/* Urgent Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-700 font-extrabold text-sm tracking-wide">
            <BellRing className="w-5 h-5 animate-bounce text-emerald-600" />
            <span className="uppercase">NEW SCRAP PICKUP ALERT</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={stopAlarm}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 transition"
              title={isAlarmPlaying ? 'Mute Chime' : 'Muted'}
            >
              {isAlarmPlaying ? <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Countdown Badge */}
            <div className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-black text-emerald-700 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{timeLeft}s</span>
            </div>
          </div>
        </div>

        {/* Customer & Distance Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Customer Pickup
              </div>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                {incomingRequest.customerName || 'Customer'}
              </h3>
              <p className="text-xs text-slate-600 flex items-center space-x-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="line-clamp-2">{incomingRequest.pickupAddress}</span>
              </p>
            </div>

            <div className="bg-emerald-100/80 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-xl text-xs font-bold flex-shrink-0 text-center">
              <div>{incomingRequest.distanceKm || 1.8} km</div>
              <div className="text-[10px] text-emerald-700 font-normal">Distance</div>
            </div>
          </div>
        </div>

        {/* Selected Scrap Items list */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Requested Scrap Items</span>
            <span className="text-emerald-700 font-extrabold text-sm">
              Est. Value: ₹{incomingRequest.estimatedTotalAmount}
            </span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 divide-y divide-slate-200">
            {incomingRequest.selectedMaterials.map((item, idx) => (
              <div key={idx} className="pt-1.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">{item.name}</span>
                  <span className="text-[11px] text-slate-500 ml-1.5">
                    ({item.estimatedWeightKg} {item.unit} @ ₹{item.pricePerKg}/{item.unit})
                  </span>
                </div>
                <span className="font-extrabold text-emerald-700">₹{item.calculatedAmount}</span>
              </div>
            ))}
          </div>

          {incomingRequest.notes && (
            <div className="pt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
              <strong>Note:</strong> {incomingRequest.notes}
            </div>
          )}
        </div>

        {/* Customer Uploaded Scrap Photo Card */}
        {incomingRequest.scrapPhoto ? (
          <div className="bg-gradient-to-br from-emerald-50/70 to-slate-50 p-3 rounded-2xl border-2 border-emerald-300 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 font-extrabold text-emerald-900">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Customer Uploaded Scrap Photo</span>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center space-x-1">
                <span>📸 Photo Attached</span>
              </span>
            </div>

            <div
              onClick={() => setShowPhotoLightbox(true)}
              className="relative h-40 rounded-xl overflow-hidden cursor-pointer group bg-slate-900 border border-slate-200 shadow-xs"
              title="Click to view full photo"
            >
              <img
                src={incomingRequest.scrapPhoto}
                alt="Scrap Uploaded by Customer"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition flex items-center justify-center">
                <span className="bg-slate-900/85 backdrop-blur-md text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center space-x-1.5 opacity-90 group-hover:opacity-100 transition shadow-md">
                  <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tap to Inspect Photo</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-dashed border-slate-300 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center space-x-1.5">
              <Camera className="w-3.5 h-3.5 text-slate-400" />
              <span>No scrap photo attached</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Verify on site</span>
          </div>
        )}

        {/* Action Buttons: Accept / Reject */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleReject}
            disabled={isLoading}
            className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Decline</span>
          </button>

          <button
            type="button"
            onClick={handleAccept}
            disabled={isLoading}
            className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center space-x-2 transition shadow-md ring-4 ring-emerald-600/20 cursor-pointer"
          >
            <Check className="w-5 h-5" />
            <span>{isLoading ? 'Accepting...' : 'ACCEPT PICKUP'}</span>
          </button>
        </div>
      </div>

      {/* Full Photo Lightbox Modal */}
      {showPhotoLightbox && incomingRequest.scrapPhoto && (
        <div
          onClick={() => setShowPhotoLightbox(false)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative"
          >
            <div className="p-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2 text-xs font-bold">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Customer Scrap Photo (Order #{incomingRequest.orderId})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoLightbox(false)}
                className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative max-h-[70vh] overflow-hidden bg-black flex items-center justify-center">
              <img
                src={incomingRequest.scrapPhoto}
                alt="Full Scrap View"
                className="w-full max-h-[70vh] object-contain"
              />
            </div>

            <div className="p-3 bg-slate-800 text-slate-300 text-xs flex items-center justify-between">
              <span>{incomingRequest.customerName || 'Customer'}</span>
              <span className="text-emerald-400 font-bold">
                Est. ₹{incomingRequest.estimatedTotalAmount}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
