import React, { useState } from 'react';
import { useDealerAuth } from '../../context/DealerAuthContext';
import { consumerSimulatorService } from '../../services/consumerSimulatorService';
import { Radio, ChevronDown, ChevronUp, Sparkles, Send } from 'lucide-react';

export const ConsumerRequestSimulatorDrawer: React.FC = () => {
  const { dealer } = useDealerAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!dealer) return null;

  const handleSimulate = async () => {
    setIsTriggering(true);
    setMsg('Sending incoming scrap pickup request...');
    try {
      const res = await consumerSimulatorService.triggerIncomingBooking(dealer.dealerId);
      setMsg(`✅ Incoming booking triggered! OTP code is: ${res.otpCode}`);
      setTimeout(() => setMsg(null), 8000);
    } catch (err: any) {
      setMsg(`❌ Error: ${err.message || 'Failed'}`);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="fixed bottom-16 right-3 z-40 max-w-xs w-full">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 flex items-center justify-between text-xs font-bold transition"
        >
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400">Customer Request Simulator</span>
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </button>

        {isOpen && (
          <div className="p-3.5 space-y-2.5 text-xs">
            <p className="text-[11px] text-slate-400 leading-snug">
              Simulates an urgent customer scrap booking with siren alert, distance, and 4-digit OTP.
            </p>

            {msg && (
              <div className="p-2 bg-slate-950 rounded-xl text-emerald-300 font-mono text-[11px] border border-slate-800">
                {msg}
              </div>
            )}

            <button
              onClick={handleSimulate}
              disabled={isTriggering || !dealer.isOnline}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 py-2.5 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition shadow-md"
            >
              <Send className="w-4 h-4" />
              <span>{isTriggering ? 'Dispatching Alert...' : 'Trigger Incoming Booking Alert'}</span>
            </button>

            {!dealer.isOnline && (
              <p className="text-[10px] text-amber-400 text-center font-semibold">
                ⚠️ You must turn ONLINE in the top header to receive booking alerts.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
