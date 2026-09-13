import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerOrder } from '../context/DealerOrderContext';
import { DealerHeader } from '../components/layout/DealerHeader';
import { DealerBottomNav } from '../components/layout/DealerBottomNav';
import { Calendar, Truck, PackageX, ChevronRight, Star, MessageSquare, Camera, Eye, X } from 'lucide-react';
import { DealerOrder } from '../types';

export const OrderHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { orderHistory, fetchHistory, isLoading } = useDealerOrder();
  const [selectedPhotoOrder, setSelectedPhotoOrder] = useState<DealerOrder | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 max-w-md mx-auto flex flex-col justify-between shadow-2xl pb-20">
      <DealerHeader title="Pickup History" showBack={false} />

      <main className="p-4 space-y-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-extrabold text-slate-900">Completed Pickups</h2>
          <span className="text-xs text-slate-500 font-semibold">{orderHistory.length} pickups</span>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500">Loading completed jobs...</p>
          </div>
        ) : orderHistory.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3 mt-4 shadow-card">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <PackageX className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No completed pickups yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Completed scrap collections and digital weighment receipts will be listed here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orderHistory.map((order) => (
              <div
                key={order.orderId}
                className="bg-white p-4 rounded-3xl border border-slate-200 hover:border-slate-300 transition shadow-card space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Customer: {order.customerName || 'Customer'}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>·</span>
                      <span className="font-mono">#{order.orderId}</span>
                    </div>
                  </div>

                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                    {order.status}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                  <div className="truncate max-w-[200px] text-slate-600">
                    {(order.finalWeights && order.finalWeights.length > 0
                      ? order.finalWeights
                      : order.selectedMaterials
                    ).map((m: any) => `${m.name} (${m.actualWeightKg || m.estimatedWeightKg}${m.unit})`).join(', ')}
                  </div>
                  <div className="font-extrabold text-emerald-700 flex-shrink-0">
                    ₹{order.finalTotalAmount || order.estimatedTotalAmount}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 truncate">
                  📍 {order.pickupAddress}
                </div>

                {/* Scrap Collection Photo Proof */}
                {order.scrapPhoto && (
                  <div
                    onClick={() => setSelectedPhotoOrder(order)}
                    className="bg-slate-50 border border-slate-200 hover:border-emerald-300 rounded-2xl p-2.5 flex items-center justify-between cursor-pointer transition group shadow-2xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-200">
                        <img
                          src={order.scrapPhoto}
                          alt="Collected Scrap"
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                          <Camera className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Collected Scrap Photo</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Tap to view verified scrap proof
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 group-hover:bg-emerald-600 group-hover:text-white px-2 py-1 rounded-lg flex items-center space-x-1 transition">
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </span>
                  </div>
                )}

                {/* Customer Rating & Review Card */}
                {order.rating ? (
                  <div className="bg-amber-50/60 border border-amber-200/70 p-2.5 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1">
                        <div className="flex items-center space-x-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= order.rating!.score
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-extrabold text-amber-950 ml-1 text-xs">
                          {order.rating.score}.0
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-full">
                        Customer Review
                      </span>
                    </div>

                    {order.rating.feedback && (
                      <p className="text-xs text-slate-700 italic flex items-start space-x-1.5 pl-0.5">
                        <MessageSquare className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>"{order.rating.feedback}"</span>
                      </p>
                    )}

                    {order.rating.tags && order.rating.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {order.rating.tags.map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="text-[9px] font-bold bg-white text-emerald-800 border border-emerald-200/80 px-1.5 py-0.5 rounded-md shadow-2xs"
                          >
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1 pl-1">
                    <Star className="w-3 h-3 text-slate-300" />
                    <span>No customer rating submitted yet</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Full Scrap Photo Modal */}
      {selectedPhotoOrder && selectedPhotoOrder.scrapPhoto && (
        <div
          onClick={() => setSelectedPhotoOrder(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative"
          >
            <div className="p-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2 text-xs font-bold">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Scrap Proof · #{selectedPhotoOrder.orderId}</span>
              </div>
              <button
                onClick={() => setSelectedPhotoOrder(null)}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative max-h-[65vh] overflow-hidden bg-black flex items-center justify-center">
              <img
                src={selectedPhotoOrder.scrapPhoto}
                alt="Collected Scrap Full View"
                className="w-full max-h-[65vh] object-contain"
              />
            </div>

            <div className="p-3.5 bg-slate-800 text-slate-300 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="text-white">Customer: {selectedPhotoOrder.customerName}</span>
                <span className="text-emerald-400 text-sm">
                  ₹{selectedPhotoOrder.finalTotalAmount || selectedPhotoOrder.estimatedTotalAmount} Paid
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                📍 {selectedPhotoOrder.pickupAddress}
              </div>
            </div>
          </div>
        </div>
      )}

      <DealerBottomNav />
    </div>
  );
};
