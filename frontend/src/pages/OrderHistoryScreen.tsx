import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerOrder } from '../context/DealerOrderContext';
import { DealerHeader } from '../components/layout/DealerHeader';
import { DealerBottomNav } from '../components/layout/DealerBottomNav';
import { Calendar, Truck, PackageX, ChevronRight } from 'lucide-react';

export const OrderHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { orderHistory, fetchHistory, isLoading } = useDealerOrder();

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
              </div>
            ))}
          </div>
        )}
      </main>

      <DealerBottomNav />
    </div>
  );
};
