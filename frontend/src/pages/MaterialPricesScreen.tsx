import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerAuth } from '../context/DealerAuthContext';
import { dealerOrderService } from '../services/dealerOrderService';
import { DealerHeader } from '../components/layout/DealerHeader';
import { DealerBottomNav } from '../components/layout/DealerBottomNav';
import { ScrapRateItem, ScrapCategory } from '../types';
import {
  IndianRupee,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Save,
  RotateCcw,
} from 'lucide-react';

export const MaterialPricesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { dealer, updateProfile } = useDealerAuth();

  const [rates, setRates] = useState<ScrapRateItem[]>(() => {
    return dealer?.scrapRates || [];
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handlePriceChange = (index: number, newPriceStr: string) => {
    const val = parseFloat(newPriceStr);
    const updated = [...rates];
    updated[index].pricePerKg = isNaN(val) ? 0 : val;
    setRates(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await dealerOrderService.updateScrapPrices(rates);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch {
      alert('Failed to update scrap buying rates.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 max-w-md mx-auto flex flex-col justify-between shadow-2xl pb-24">
      <DealerHeader title="Scrap Buying Prices" showBack={false} />

      <main className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Manage Scrap Rates</h2>
            <p className="text-xs text-slate-500">Consumers see these rates when booking your shop</p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center space-x-1.5 transition shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save All'}</span>
          </button>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-800 font-bold flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Scrap rates updated and broadcast to consumers!</span>
          </div>
        )}

        {/* Rates list */}
        <div className="space-y-2.5">
          {rates.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-card flex items-center justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="text-xs font-bold text-slate-800">{item.name}</div>
                <div className="text-[10px] text-slate-400">
                  Category: {item.category} · Min: {item.minQuantityKg || 1} {item.unit}
                </div>
              </div>

              {/* Price input */}
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 focus-within:border-emerald-600 focus-within:bg-white px-2.5 py-1.5 rounded-xl transition">
                <span className="text-xs font-bold text-emerald-700">₹</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={item.pricePerKg}
                  onChange={(e) => handlePriceChange(idx, e.target.value)}
                  className="w-14 bg-transparent text-right text-xs font-black text-slate-900 outline-none"
                />
                <span className="text-[10px] text-slate-400">/{item.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <DealerBottomNav />
    </div>
  );
};
