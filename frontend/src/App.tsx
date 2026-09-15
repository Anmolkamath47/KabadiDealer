import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDealerAuth } from './context/DealerAuthContext';

// Pages
import { SplashScreen } from './pages/SplashScreen';
import { LoginScreen } from './pages/LoginScreen';
import { OtpVerifyScreen } from './pages/OtpVerifyScreen';
import { DealerOnboardingScreen } from './pages/DealerOnboardingScreen';
import { LocationSetupScreen } from './pages/LocationSetupScreen';
import { HomeScreen } from './pages/HomeScreen';
import { MaterialPricesScreen } from './pages/MaterialPricesScreen';
import { ActiveJobScreen } from './pages/ActiveJobScreen';
import { OrderHistoryScreen } from './pages/OrderHistoryScreen';
import { ProfileScreen } from './pages/ProfileScreen';

// Modals
import { IncomingRequestModal } from './components/order/IncomingRequestModal';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowIncompleteProfile?: boolean }> = ({
  children,
  allowIncompleteProfile = false,
}) => {
  const { isAuthenticated, isLoading, dealer } = useDealerAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading Scrapify Dealer Patner App...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowIncompleteProfile && dealer && dealer.isProfileCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

// Public Route Wrapper (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, dealer } = useDealerAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    if (dealer && dealer.isProfileCompleted === false) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  const { isAuthenticated } = useDealerAuth();
  const location = useLocation();

  const isAuthPage = ['/login', '/otp-verify', '/splash'].includes(location.pathname);

  return (
    <div className="relative min-h-screen bg-slate-100 text-slate-900 font-sans">
      <Routes>
        <Route path="/splash" element={<SplashScreen />} />
        
        {/* Auth Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginScreen />
            </PublicRoute>
          }
        />
        <Route
          path="/otp-verify"
          element={
            <PublicRoute>
              <OtpVerifyScreen />
            </PublicRoute>
          }
        />

        {/* Onboarding Route */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute allowIncompleteProfile={true}>
              <DealerOnboardingScreen />
            </ProtectedRoute>
          }
        />

        {/* Protected Partner Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomeScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/location"
          element={
            <ProtectedRoute>
              <LocationSetupScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prices"
          element={
            <ProtectedRoute>
              <MaterialPricesScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/active-order"
          element={
            <ProtectedRoute>
              <ActiveJobScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <OrderHistoryScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileScreen />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Incoming Pickup Booking Siren Alert Modal */}
      <IncomingRequestModal />
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;
