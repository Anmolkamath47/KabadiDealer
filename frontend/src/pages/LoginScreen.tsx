import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerAuth } from '../context/DealerAuthContext';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithPhone } = useDealerAuth();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = phone.replace(/\D/g, '');

    if (cleanNumber.length < 10) {
      setError('Please enter a valid 10-digit partner mobile number');
      return;
    }

    setError(null);
    setIsAuthenticating(true);

    try {
      const fullPhone = `+91${cleanNumber.slice(-10)}`;
      const startTime = Date.now();

      // Authenticate directly with phone number
      const authPromise = loginWithPhone(fullPhone);

      // Display the app logo loading state for ~1.8 seconds (under 5 seconds)
      const [res] = await Promise.all([
        authPromise,
        new Promise((resolve) => setTimeout(resolve, 1800)),
      ]);

      if (!res.dealer?.isProfileCompleted || res.isNewDealer) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setIsAuthenticating(false);
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.message ||
          err.message ||
          'Failed to sign in. Please check your connection and try again.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto p-5 shadow-2xl relative">
      <div className="pt-8">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-white p-0.5 flex items-center justify-center shadow-md overflow-hidden border border-slate-100">
            <img src="/logo.png" alt="Scrapwala Dealer Partner" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Scrapwala Dealer Partner</h1>
            <p className="text-xs font-semibold text-emerald-600">Partner & Driver App</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-black text-slate-900">Partner Login</h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter your registered mobile number to open your scrap collector dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Dealer Mobile Number
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center space-x-1.5 text-slate-500 border-r border-slate-200 pr-2">
                <span className="text-sm font-bold">🇮🇳 +91</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter 10-digit mobile number"
                maxLength={12}
                disabled={isAuthenticating}
                className="w-full pl-24 pr-4 py-3.5 bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl text-base font-bold text-slate-900 outline-none transition shadow-xs disabled:opacity-50"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-rose-600 font-semibold mt-1.5">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isAuthenticating || !phone}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center space-x-2 transition shadow-md mt-4"
          >
            <span>{isAuthenticating ? 'Signing In...' : 'Continue to Partner Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="pb-4 pt-8 text-center border-t border-slate-200/80">
        <div className="flex items-center justify-center space-x-2 text-slate-500 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Official Scrap Partner Network · Fair Pricing</span>
        </div>
      </div>

      {/* Fullscreen Logo Loading Overlay (< 5 seconds) */}
      {isAuthenticating && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center select-none">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-3xl bg-white p-2 flex items-center justify-center shadow-2xl ring-8 ring-emerald-500/30 overflow-hidden">
              <img
                src="/logo.png"
                alt="Scrapwala Dealer Partner"
                className="w-full h-full object-contain rounded-2xl animate-pulse"
              />
            </div>
            <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-900 p-1.5 rounded-full shadow">
              <Sparkles className="w-3.5 h-3.5 fill-slate-900" />
            </div>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white mb-1">Scrapwala Dealer Partner</h2>
          <p className="text-xs text-emerald-300 font-semibold mb-6">
            Opening your collector portal...
          </p>

          {/* Animated progress bar */}
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-400 rounded-full animate-pulse w-full" />
          </div>

          <span className="text-[11px] text-slate-400 font-mono mt-3">
            +91 {phone.replace(/\D/g, '').slice(-10)}
          </span>
        </div>
      )}
    </div>
  );
};
