import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Sparkles } from 'lucide-react';
import { useDealerAuth } from '../context/DealerAuthContext';

export const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated } = useDealerAuth();

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          navigate('/');
        } else {
          navigate('/login');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-between p-6 select-none">
      <div className="w-full flex justify-end">
        <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
          Partner Collector Portal
        </span>
      </div>

      <div className="flex flex-col items-center text-center space-y-4 max-w-xs">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-emerald-600 flex items-center justify-center text-white shadow-2xl ring-8 ring-emerald-500/20 animate-pulse">
            <Truck className="w-12 h-12" />
          </div>
          <div className="absolute -top-2 -right-2 bg-amber-400 text-slate-900 p-1.5 rounded-full shadow">
            <Sparkles className="w-4 h-4 fill-slate-900" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Kabadidealer</h1>
          <p className="text-xs text-emerald-400 font-bold mt-1">
            Partner App for Scrap Buyers & Collectors
          </p>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Accept doorstep scrap pickup bookings, navigate to customers, and settle scrap weighment instantly.
        </p>
      </div>

      <div className="w-full max-w-xs flex flex-col items-center space-y-2">
        <div className="w-8 h-1 bg-emerald-500/50 rounded-full overflow-hidden">
          <div className="w-full h-full bg-emerald-400 animate-pulse"></div>
        </div>
        <span className="text-[10px] text-slate-500">v1.0.0 · Partner Edition</span>
      </div>
    </div>
  );
};
