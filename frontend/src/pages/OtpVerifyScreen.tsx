import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDealerAuth } from '../context/DealerAuthContext';
import { ArrowLeft, CheckCircle, RotateCw, Sparkles } from 'lucide-react';

export const OtpVerifyScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtpAndLogin, requestOtp } = useDealerAuth();

  const phone = (location.state as any)?.phone || '';
  const demoOtp = (location.state as any)?.demoOtp || '1234';

  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!phone) {
      navigate('/login', { replace: true });
      return;
    }

    inputRefs.current[0]?.focus();
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [phone, navigate]);

  const handleChange = (index: number, value: string) => {
    const cleanDigits = value.replace(/\D/g, '');

    if (!cleanDigits) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    // Handle multiple digits (paste or browser autofill)
    if (cleanDigits.length > 1) {
      const newOtp = [...otp];
      const chars = cleanDigits.slice(0, 4).split('');
      chars.forEach((c, i) => {
        if (index + i < 4) {
          newOtp[index + i] = c;
        }
      });
      setOtp(newOtp);
      const nextFocus = Math.min(index + chars.length, 3);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanDigits.slice(-1);
    setOtp(newOtp);

    if (index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted) {
      const newOtp = ['', '', '', ''];
      pasted.split('').forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);
      const targetFocus = Math.min(pasted.length, 3);
      inputRefs.current[targetFocus]?.focus();
    }
  };

  const handleAutoFillDemo = () => {
    const digits = (demoOtp || '1234').split('').slice(0, 4);
    setOtp(digits);
    setError(null);
    inputRefs.current[3]?.focus();
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      console.error('OTP verification error:', err);
      setError(err.response?.data?.message || err.message || 'Invalid OTP. Please check and try again.');
    } finally {
      setIsSubmitting(false);
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

        <form onSubmit={handleVerify} className="mt-6 space-y-5">
          <div className="flex justify-between gap-2 max-w-xs mx-auto">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={idx === 0 ? 4 : 1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                className="w-14 h-16 text-center text-2xl font-black text-slate-900 bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl outline-none shadow-xs transition"
              />
            ))}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleAutoFillDemo}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Auto-fill Demo Code: {demoOtp || '1234'}</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <p className="text-xs text-rose-600 font-semibold text-center">{error}</p>
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
              onClick={async () => {
                try {
                  await requestOtp(phone);
                  setResendTimer(30);
                  setError(null);
                } catch {
                  setError('Failed to resend OTP.');
                }
              }}
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
