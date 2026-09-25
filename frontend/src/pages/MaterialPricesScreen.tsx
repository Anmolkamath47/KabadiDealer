import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerAuth, prioritizeEWasteRates } from '../context/DealerAuthContext';
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
  Zap,
  Cpu,
  Laptop,
  Smartphone,
  Info,
  ShieldCheck,
} from 'lucide-react';

const COMMON_EWASTE_PRESETS: ScrapRateItem[] = [
  { category: 'E-Waste', name: 'Old Electronics & CPU Boards', unit: 'kg', pricePerKg: 55, minQuantityKg: 1, icon: 'cpu' },
  { category: 'E-Waste', name: 'Broken Laptops & Computers', unit: 'piece', pricePerKg: 250, minQuantityKg: 1, icon: 'laptop' },
  { category: 'E-Waste', name: 'Old Mobile Phones & Tablets', unit: 'piece', pricePerKg: 120, minQuantityKg: 1, icon: 'smartphone' },
  { category: 'E-Waste', name: 'Inverter & UPS Batteries', unit: 'kg', pricePerKg: 95, minQuantityKg: 1, icon: 'battery' },
  { category: 'E-Waste', name: 'Electronic Wires & Chargers', unit: 'kg', pricePerKg: 45, minQuantityKg: 1, icon: 'zap' },
];

export const MaterialPricesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { dealer, updateProfile } = useDealerAuth();

  const [rates, setRates] = useState<ScrapRateItem[]>(() => {
    const list = dealer?.scrapRates || [];
    // Ensure E-Waste is strictly prioritized first
    const prioritized = prioritizeEWasteRates(list);
    // If no E-Waste item was found in dealer rates, include defaults
    const hasEWaste = prioritized.some((item) => item.category === 'E-Waste');
    if (!hasEWaste) {
      return [
        COMMON_EWASTE_PRESETS[0],
        COMMON_EWASTE_PRESETS[1],
        ...prioritized,
      ];
    }
    return prioritized;
  });

  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handlePriceChange = (targetItemName: string, newPriceStr: string) => {
    const val = parseFloat(newPriceStr);
    const updated = rates.map((r) =>
      r.name === targetItemName ? { ...r, pricePerKg: isNaN(val) ? 0 : val } : r
    );
    setRates(updated);
  };

  const handleAddPreset = (preset: ScrapRateItem) => {
    if (rates.some((r) => r.name.toLowerCase() === preset.name.toLowerCase())) {
      alert(`${preset.name} is already in your rate card.`);
      return;
    }
    // Prepend E-Waste preset at the very top of rates
    setRates((prev) => prioritizeEWasteRates([preset, ...prev]));
    setShowAddMenu(false);
  };

  const handleRemoveItem = (itemName: string) => {
    if (rates.length <= 1) {
      alert('You must maintain at least one scrap rate.');
      return;
    }
    setRates((prev) => prev.filter((r) => r.name !== itemName));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Ensure E-Waste is strictly prioritized at index 0 before saving
      const finalizedRates = prioritizeEWasteRates(rates);
      setRates(finalizedRates);

      await dealerOrderService.updateScrapPrices(finalizedRates);
      if (dealer) {
        await updateProfile({ scrapRates: finalizedRates });
      }
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3500);
    } catch {
      alert('Failed to update scrap buying rates.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRates =
    selectedFilter === 'ALL'
      ? rates
      : rates.filter((r) => r.category === selectedFilter);

  const categories = ['ALL', 'E-Waste', ...Array.from(new Set(rates.filter((r) => r.category !== 'E-Waste').map((r) => r.category)))];

  const eWasteCount = rates.filter((r) => r.category === 'E-Waste').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 max-w-md mx-auto flex flex-col justify-between shadow-2xl pb-24">
      <DealerHeader title="Scrap Buying Prices" showBack={false} />

      <main className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Header Action */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5">
              <h2 className="text-base font-extrabold text-slate-900">Manage Scrap Rates</h2>
              <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300 flex items-center space-x-1">
                <Zap className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                <span>E-Waste Priority</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consumers see these rates when booking your shop
            </p>
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

        {/* Priority Highlight Notice */}
        <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-amber-300/80 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-start space-x-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                <span>E-Waste Priority Enabled</span>
                <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-amber-200">
                  TOP RANK
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                Electronic waste is placed first in dealer cards and consumer booking lists for faster pickup matching.
              </p>
            </div>
          </div>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-800 font-bold flex items-center space-x-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Scrap rates updated & broadcast! E-waste priority is live.</span>
          </div>
        )}

        {/* Quick Add Presets Bar */}
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-slate-800 flex items-center space-x-1">
            <span>Material Catalogue</span>
            <span className="text-slate-400 font-normal">({rates.length} items)</span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-xl flex items-center space-x-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add E-Waste</span>
            </button>

            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 space-y-1 animate-fadeIn">
                <div className="px-2 py-1 text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 mb-1">
                  <span>Add High Priority E-Waste</span>
                  <button
                    onClick={() => setShowAddMenu(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
                {COMMON_EWASTE_PRESETS.map((preset, pIdx) => {
                  const alreadyAdded = rates.some((r) => r.name.toLowerCase() === preset.name.toLowerCase());
                  return (
                    <button
                      key={pIdx}
                      disabled={alreadyAdded}
                      onClick={() => handleAddPreset(preset)}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition ${
                        alreadyAdded
                          ? 'opacity-40 cursor-not-allowed bg-slate-50'
                          : 'hover:bg-amber-50/80 text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{preset.name}</div>
                        <div className="text-[10px] text-slate-400">₹{preset.pricePerKg}/{preset.unit}</div>
                      </div>
                      {alreadyAdded ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => {
            const isActive = selectedFilter === cat;
            const isEWasteCat = cat === 'E-Waste';
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-1 ${
                  isActive
                    ? isEWasteCat
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                    : isEWasteCat
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isEWasteCat && <Zap className={`w-3 h-3 ${isActive ? 'fill-white text-white' : 'text-amber-600 fill-amber-500'}`} />}
                <span>{cat === 'E-Waste' ? `E-Waste (${eWasteCount})` : cat}</span>
              </button>
            );
          })}
        </div>

        {/* Rates list */}
        <div className="space-y-2.5">
          {filteredRates.map((item) => {
            const isEWaste = item.category === 'E-Waste';

            return (
              <div
                key={item.name}
                className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                  isEWaste
                    ? 'bg-gradient-to-r from-amber-50/70 to-orange-50/30 border-amber-300 shadow-card hover:border-amber-400 ring-1 ring-amber-400/20'
                    : 'bg-white border-slate-200 shadow-card hover:border-slate-300'
                }`}
              >
                <div className="flex-1 pr-3 min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                    {isEWaste && (
                      <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-black bg-amber-500 text-white flex-shrink-0 shadow-2xs">
                        <Zap className="w-2.5 h-2.5 fill-white" />
                        <span>PRIORITY 1</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-2">
                    <span>Category: <strong className={isEWaste ? 'text-amber-800' : 'text-slate-600'}>{item.category}</strong></span>
                    <span>·</span>
                    <span>Min: {item.minQuantityKg || 1} {item.unit}</span>
                  </div>
                </div>

                {/* Price input & action */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div className={`flex items-center space-x-1.5 border px-2.5 py-1.5 rounded-xl transition ${
                    isEWaste
                      ? 'bg-white border-amber-300 focus-within:border-amber-600 ring-1 ring-amber-300/40'
                      : 'bg-slate-50 border-slate-200 focus-within:border-emerald-600 focus-within:bg-white'
                  }`}>
                    <span className={`text-xs font-bold ${isEWaste ? 'text-amber-700' : 'text-emerald-700'}`}>₹</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={item.pricePerKg}
                      onChange={(e) => handlePriceChange(item.name, e.target.value)}
                      className="w-14 bg-transparent text-right text-xs font-black text-slate-900 outline-none"
                    />
                    <span className="text-[10px] text-slate-400">/{item.unit}</span>
                  </div>

                  {rates.length > 1 && (
                    <button
                      type="button"
                      title="Remove item"
                      onClick={() => handleRemoveItem(item.name)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <DealerBottomNav />
    </div>
  );
};
