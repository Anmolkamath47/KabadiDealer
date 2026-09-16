import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerAuth } from '../../context/DealerAuthContext';
import { Truck, Power, User, MapPin } from 'lucide-react';
import { getDealerInitial } from '../../utils/avatarUtils';

interface DealerHeaderProps {
  title?: string;
  showBack?: boolean;
}

export const DealerHeader: React.FC<DealerHeaderProps> = ({ title, showBack = false }) => {
  const navigate = useNavigate();
  const { dealer, isAuthenticated, toggleOnlineStatus } = useDealerAuth();

  const handleToggle = () => {
    if (dealer) {
      toggleOnlineStatus(!dealer.isOnline);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs text-slate-900">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {showBack ? (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
              title="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-base font-bold text-slate-900 line-clamp-1">{title || 'Scrapify Dealer Partner'}</h1>
          </div>
        ) : (
          <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
            <button
              onClick={() => navigate('/')}
              className="flex-shrink-0 flex items-center space-x-2 focus:outline-none"
            >
              <img
                src="/logo.png"
                alt="Scrapify Dealer Partner"
                className="w-8 h-8 rounded-lg object-contain bg-white shadow-xs border border-slate-100 p-0.5"
              />
              <span className="font-extrabold text-emerald-700 tracking-tight text-lg hidden sm:inline">
                Scrapify Dealer Partner
              </span>
            </button>

            {/* Online / Offline status toggle pill */}
            {isAuthenticated && dealer && (
              <button
                onClick={handleToggle}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                  dealer.isOnline
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    dealer.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                ></span>
                <span>{dealer.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
              </button>
            )}
          </div>
        )}

        {/* Profile icon */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 border border-slate-200 text-emerald-700 flex items-center justify-center font-black text-sm hover:bg-slate-200 transition shadow-xs"
              title="Dealer Profile"
            >
              {dealer?.profileImage ? (
                <img
                  src={dealer.profileImage}
                  alt={dealer.businessName || 'Dealer'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>
                  {getDealerInitial(dealer)}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full transition shadow-xs"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
