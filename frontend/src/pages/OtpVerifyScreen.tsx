import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDealerAuth } from '../context/DealerAuthContext';
import { ArrowLeft, CheckCircle, RotateCw } from 'lucide-react';

export const OtpVerifyScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtpAndLogin, loginWithPhone, requestOtp } = useDealerAuth();

  const phone = (location.state as any)?.phone || '';

  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (!phone) {
      navigate('/login', { replace: true });
      return;
    }

    loginWithPhone(phone)
      .then((res) => {
        if (!res.dealer?.isProfileCompleted || res.isNewDealer) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  }, [phone, navigate, loginWithPhone]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submissions

    const fullOtp = otp.join('');

    if (fullOtp.length !== 4) {
      setError('Please enter all 4 digits of the OTP');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await verifyOtpAndLogin(phone, fullOtp);
      if (!res.dealer?.isProfileCompleted || res.isNewDealer) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'Invalid OTP. Please check and try again.';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      await requestOtp(phone);
      setResendTimer(30);
      setError(null);
    } catch {
      setError('Failed to resend OTP.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between max-w-md mx-auto p-5 shadow-2xl">
      <div className="pt-4">
        <button
          onClick={() => navigate('/login')}
          className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="mt-6">
          <h2 className="text-2xl font-black text-slate-900">Verify Partner OTP</h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter the 4-digit code sent to <span className="font-bold text-slate-800">{phone}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="mt-8 space-y-5">
          <div className="flex justify-between gap-2 max-w-xs mx-auto">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-14 h-16 text-center text-2xl font-black text-slate-900 bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl outline-none shadow-xs transition"
              />
            ))}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <p className="text-xs text-rose-700 font-semibold text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || otp.some((d) => !d)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center space-x-2 transition shadow-md"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Verifying...' : 'Verify & Continue'}</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          {resendTimer > 0 ? (
            <p className="text-xs text-slate-500">
              Resend code in <span className="font-bold text-slate-700">{resendTimer}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center justify-center space-x-1 mx-auto"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Resend OTP</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
