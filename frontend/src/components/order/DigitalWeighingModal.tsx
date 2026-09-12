import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FinalWeightItem, SelectedMaterialItem } from '../../types';
import { Scale, IndianRupee, CheckCircle2, Plus, Minus } from 'lucide-react';

interface DigitalWeighingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMaterials: SelectedMaterialItem[];
  onComplete: (finalWeights: FinalWeightItem[], finalTotal: number) => void;
  isLoading?: boolean;
}

export const DigitalWeighingModal: React.FC<DigitalWeighingModalProps> = ({
  isOpen,
  onClose,
  selectedMaterials,
  onComplete,
  isLoading = false,
}) => {
  const [weights, setWeights] = useState<FinalWeightItem[]>(() => {
    return selectedMaterials.map((m) => ({
      category: m.category,
      name: m.name,
      unit: m.unit,
      pricePerKg: m.pricePerKg,
      actualWeightKg: m.estimatedWeightKg,
      finalAmount: Math.round(m.estimatedWeightKg * m.pricePerKg),
    }));
  });

  const handleWeightChange = (index: number, newWeightStr: string) => {
    const val = parseFloat(newWeightStr);
    const updated = [...weights];
    const item = updated[index];
    const weight = isNaN(val) ? 0 : Math.max(0, val);
    item.actualWeightKg = weight;
    item.finalAmount = Math.round(weight * item.pricePerKg);
    setWeights(updated);
  };

  const handleStep = (index: number, delta: number) => {
    const updated = [...weights];
    const item = updated[index];
    const newWeight = Math.max(1, item.actualWeightKg + delta);
    item.actualWeightKg = newWeight;
    item.finalAmount = Math.round(newWeight * item.pricePerKg);
    setWeights(updated);
  };

  const totalPayout = weights.reduce((acc, item) => acc + item.finalAmount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (weights.some((w) => w.actualWeightKg <= 0)) {
      alert('Please enter a valid weighed amount for all scrap items.');
      return;
    }
    onComplete(weights, totalPayout);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Digital Weighing & Settlement">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Certified Digital Scale</div>
              <div className="text-[10px] text-slate-500">Enter actual weighed scrap</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500 font-semibold">Total Customer Payout</div>
            <div className="text-lg font-black text-emerald-700">₹{totalPayout}</div>
          </div>
        </div>

        {/* Material Inputs */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {weights.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">{item.name}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold">
                    Rate: ₹{item.pricePerKg}/{item.unit}
                  </div>
                </div>
                <div className="text-right font-extrabold text-slate-900 text-xs">
                  ₹{item.finalAmount}
                </div>
              </div>

              {/* Stepper + Input */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Weighed:</span>
                <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleStep(idx, -1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={item.actualWeightKg}
                    onChange={(e) => handleWeightChange(idx, e.target.value)}
                    className="w-16 bg-transparent text-center text-xs font-black text-slate-900 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 pr-1">{item.unit}</span>
                  <button
                    type="button"
                    onClick={() => handleStep(idx, 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || totalPayout <= 0}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-md"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isLoading ? 'Settling Payment...' : `Complete Pickup (Pay ₹${totalPayout})`}</span>
        </button>
      </form>
    </Modal>
  );
};
