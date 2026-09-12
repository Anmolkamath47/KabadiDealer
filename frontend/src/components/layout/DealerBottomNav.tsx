import React from 'react';
import { NavLink } from 'react-router-dom';
import { Truck, IndianRupee, Clock, User, Navigation } from 'lucide-react';
import { useDealerOrder } from '../../context/DealerOrderContext';

export const DealerBottomNav: React.FC = () => {
  const { activeOrder } = useDealerOrder();
  const hasActiveJob =
    activeOrder &&
    ['ACCEPTED', 'DEALER_EN_ROUTE', 'ARRIVED', 'OTP_PENDING', 'OTP_VERIFIED'].includes(
      activeOrder.status
    );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-sheet text-slate-500">
      <div className="max-w-md mx-auto flex items-center justify-around py-2 px-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 rounded-lg text-xs font-semibold transition ${
              isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <Truck className="w-5 h-5 mb-0.5" />
          <span>Duty</span>
        </NavLink>

        {hasActiveJob && (
          <NavLink
            to={`/active-order`}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-3 rounded-lg text-xs font-bold transition relative ${
                isActive ? 'text-emerald-700' : 'text-amber-600 hover:text-amber-700'
              }`
            }
          >
            <div className="relative">
              <Navigation className="w-5 h-5 mb-0.5 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
            </div>
            <span>Active Job</span>
          </NavLink>
        )}

        <NavLink
          to="/prices"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 rounded-lg text-xs font-semibold transition ${
              isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <IndianRupee className="w-5 h-5 mb-0.5" />
          <span>My Rates</span>
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 rounded-lg text-xs font-semibold transition ${
              isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <Clock className="w-5 h-5 mb-0.5" />
          <span>History</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 rounded-lg text-xs font-semibold transition ${
              isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};
