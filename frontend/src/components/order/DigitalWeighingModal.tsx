import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { FinalWeightItem, SelectedMaterialItem } from '../../types';
import {
  Scale,
  IndianRupee,
  CheckCircle2,
  Plus,
  Minus,
  Camera,
  Upload,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';

interface DigitalWeighingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMaterials: SelectedMaterialItem[];
  onComplete: (finalWeights: FinalWeightItem[], finalTotal: number, scrapPhoto?: string) => void;
  isLoading?: boolean;
}

// Client-side image compression utility (scales down high-res phone camera pics to optimized ~150KB JPEG)
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const DigitalWeighingModal: React.FC<DigitalWeighingModalProps> = ({
  isOpen,
  onClose,
  selectedMaterials,
  onComplete,
  isLoading = false,
}) => {
  // Step 1: WEIGHING, Step 2: PHOTO
  const [step, setStep] = useState<'WEIGHING' | 'PHOTO'>('WEIGHING');
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

  const [scrapPhoto, setScrapPhoto] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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
  const totalWeightKg = weights.reduce((acc, item) => acc + item.actualWeightKg, 0);

  const handleProceedToPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (weights.some((w) => w.actualWeightKg <= 0)) {
      alert('Please enter a valid weighed amount for all scrap items.');
      return;
    }
    setStep('PHOTO');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setPhotoError(null);
    try {
      const compressedDataUrl = await compressImage(file);
      setScrapPhoto(compressedDataUrl);
    } catch (err: any) {
      console.error('Error processing scrap photo:', err);
      setPhotoError('Failed to process image. Please try again.');
    } finally {
      setIsProcessingPhoto(false);
      // Reset input value so re-selecting same file fires onChange
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setScrapPhoto(null);
    setPhotoError(null);
  };

  const handleFinalSubmit = () => {
    if (!scrapPhoto) {
      setPhotoError('Please take or upload a photo of the collected scrap before completing.');
      return;
    }
    onComplete(weights, totalPayout, scrapPhoto);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setStep('WEIGHING');
        onClose();
      }}
      title={step === 'WEIGHING' ? 'Digital Weighing & Settlement' : 'Scrap Photo Verification'}
    >
      {/* Hidden File Inputs for Camera & Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {step === 'WEIGHING' ? (
        <form onSubmit={handleProceedToPhoto} className="space-y-4">
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

          {/* Next Button */}
          <button
            type="submit"
            disabled={isLoading || totalPayout <= 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-md"
          >
            <span>Next: Take Scrap Photo (₹{totalPayout})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        /* STEP 2: SCRAP PHOTO CAPTURE */
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <div className="font-extrabold text-emerald-950">Weighed Scrap Summary</div>
                <div className="text-[11px] text-emerald-700">
                  {weights.length} item(s) · {totalWeightKg} kg total
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Settlement</div>
              <div className="text-base font-black text-emerald-800">₹{totalPayout}</div>
            </div>
          </div>

          {/* Photo Capture Card */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-900 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>Photo of Collected Scrap</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Required for Proof
              </span>
            </label>

            {scrapPhoto ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md bg-slate-950">
                <img
                  src={scrapPhoto}
                  alt="Collected Scrap Preview"
                  className="w-full h-52 object-cover"
                />

                {/* Overlay Badges */}
                <div className="absolute top-2 left-2 bg-emerald-600/90 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 shadow-sm">
                  <Check className="w-3 h-3" />
                  <span>Photo Captured</span>
                </div>

                <div className="absolute top-2 right-2 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-lg text-xs backdrop-blur-md transition flex items-center space-x-1"
                    title="Retake Photo"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold pr-1">Retake</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="bg-rose-600/90 hover:bg-rose-700 text-white p-1.5 rounded-lg text-xs backdrop-blur-md transition"
                    title="Delete Photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-md text-slate-200 px-3 py-1.5 rounded-xl text-[10px] flex items-center justify-between">
                  <span>Timestamp: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-emerald-400 font-semibold">Attached to Receipt</span>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 bg-slate-50/80 text-center transition flex flex-col items-center justify-center space-y-3">
                {isProcessingPhoto ? (
                  <div className="py-6 flex flex-col items-center justify-center space-y-2">
                    <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-slate-500 font-semibold">Compressing photo...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shadow-xs">
                      <Camera className="w-7 h-7" />
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Take Photo of Scrap Loaded
                      </div>
                      <div className="text-[11px] text-slate-500 max-w-xs mt-0.5">
                        Capture the weighed items or loader bags for the customer receipt & order records.
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full pt-1">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Open Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {photoError && (
              <div className="text-xs text-rose-600 font-semibold flex items-center space-x-1.5 bg-rose-50 border border-rose-200 p-2 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{photoError}</span>
              </div>
            )}
          </div>

          {/* Action Buttons: Back to Weighing & Final Complete */}
          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setStep('WEIGHING')}
              className="py-3 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              disabled={isLoading || isProcessingPhoto}
              onClick={handleFinalSubmit}
              className={`flex-1 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-md text-white ${
                scrapPhoto
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isLoading
                  ? 'Settling Payment & Saving...'
                  : `Complete Pickup (Pay ₹${totalPayout})`}
              </span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
