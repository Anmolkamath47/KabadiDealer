import React from 'react';
import { Bell, X } from 'lucide-react';
import { useDealerOrder } from '../../context/DealerOrderContext';

export const Toast: React.FC = () => {
  const { toastMessage, clearToast } = useDealerOrder();

  if (!toastMessage) return null;

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-sm">
      <div className="bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between space-x-3 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <p className="text-xs font-semibold text-slate-100 leading-snug">{toastMessage}</p>
        </div>
        <button
          onClick={clearToast}
          className="text-slate-400 hover:text-white transition p-1 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
