import React, { useState, useEffect } from 'react';
import { Shield, Phone, KeyRound, CheckCircle2, AlertCircle, Smartphone, Database, Lock, RotateCw, Send } from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { SmsService } from '../services/smsService';

interface LoginPageProps {
  onLoginSuccess: (userData: any) => void;
}

const API_BASE_URL = 'https://vinsnetbill-isp.onrender.com';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { loginWithOtp, sendOtpToOperator, operators } = useISP();
  const [mobile, setMobile] = useState('8147422496');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const cleanDigits = mobile.replace(/\D/g, '').slice(-10);
  const matchedOperator = operators.find(op => 
    op.phone.replace(/\D/g, '').endsWith(cleanDigits)
  );

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!cleanDigits || cleanDigits.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    const resolvedName = matchedOperator ? matchedOperator.name : (cleanDigits === '8147422496' ? 'VINSADMIN (Administrator)' : 'Admin');
    
    // Always trigger local dispatch in ISP context so OTP validation works reliably
    const localDispatch = sendOtpToOperator(cleanDigits, resolvedName);

    try {
      const smsRes = await SmsService.dispatchSmsOtp(cleanDigits, localDispatch.otp, resolvedName);
      setLoading(false);

      if (smsRes.success) {
        setSuccessMessage(`SMS OTP dispatched successfully via TextBee gateway to +91 ${cleanDigits}! Valid for 10 minutes.`);
        setStep('otp');
        // CRITICAL: NEVER auto-fetch or auto-fill OTP into the input field!
        setOtp('');
        setCountdown(30);
      } else {
        // CRITICAL: Failed SMS requests CANNOT appear successful!
        setError(`SMS Delivery Notice: ${smsRes.error || 'Failed to dispatch SMS'}. For Admin access, you may verify using your registered Admin Master PIN.`);
        setStep('otp');
        setOtp('');
        setCountdown(10);
      }
    } catch (err: any) {
      setLoading(false);
      setError(`SMS Gateway Error: ${err.message || 'Unable to connect to SMS service'}. You can still log in using your Admin PIN.`);
      setStep('otp');
      setOtp('');
      setCountdown(10);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    const resolvedName = matchedOperator ? matchedOperator.name : (cleanDigits === '8147422496' ? 'VINSADMIN (Administrator)' : 'Admin');
    const localDispatch = sendOtpToOperator(cleanDigits, resolvedName);

    try {
      const smsRes = await SmsService.dispatchSmsOtp(cleanDigits, localDispatch.otp, resolvedName);
      setLoading(false);

      if (smsRes.success) {
        setSuccessMessage('Fresh 6-digit SMS OTP re-sent successfully!');
        // CRITICAL: NEVER auto-fetch or auto-fill OTP on resend!
        setOtp('');
        setCountdown(30);
      } else {
        // Failed SMS requests CANNOT appear successful!
        setError(`Failed to resend SMS: ${smsRes.error || 'SMS gateway unreachable or daily quota reached'}. You can authenticate using your Admin PIN.`);
        setOtp('');
        setCountdown(10);
      }
    } catch (err: any) {
      setLoading(false);
      setError(`Failed to resend SMS: ${err.message || 'Network error'}. You can authenticate using your Admin PIN.`);
      setOtp('');
      setCountdown(10);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length < 4) {
      setError('Please enter the verification code received via SMS or your 4-digit Admin PIN');
      return;
    }

    setLoading(true);
    let verifiedUser: any = null;

    try {
      // 1. Try local verify route first
      let res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanDigits, otp: trimmedOtp })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: cleanDigits, otp: trimmedOtp })
        }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.success && data?.user) {
          verifiedUser = data.user;
        }
      }
    } catch (err: any) {
      console.warn('Backend verify-otp error:', err.message);
    }

    // Fallback: verify via ISPContext loginWithOtp
    const resolvedName = matchedOperator ? matchedOperator.name : (cleanDigits === '8147422496' ? 'VINSADMIN (Administrator)' : 'Admin');
    const role = matchedOperator ? matchedOperator.role : 'admin';
    const contextResult = loginWithOtp(cleanDigits, trimmedOtp, resolvedName, role);

    setLoading(false);

    if (verifiedUser || contextResult.success) {
      const finalUser = verifiedUser || {
        id: `op-admin-${cleanDigits}`,
        name: resolvedName,
        phone: cleanDigits,
        mobile: cleanDigits,
        role: role === 'admin' ? 'Admin Master' : 'Cash Collector'
      };
      onLoginSuccess(finalUser);
    } else {
      setError(contextResult.error || 'Invalid or expired OTP code / PIN. Please check your code or click Resend.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-400 mb-3 border border-emerald-500/20 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">VinsNetBill</h1>
          <p className="text-sm text-slate-400 mt-1">SMS AUTHENTICATION TERMINAL</p>
          <p className="text-xs text-slate-500 mt-0.5 text-center">VinsNetBill Broadband • Mobile Number Sign In with SMS OTP Verification</p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
              <Smartphone className="w-3.5 h-3.5" /> SMS Gateway
            </div>
            <p className="text-[11px] text-slate-400">10-digit DLT compliant dispatched via Textbee.</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
              <Database className="w-3.5 h-3.5" /> Cloud Store
            </div>
            <p className="text-[11px] text-slate-400">High-reliability cloud persistence & Render API.</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
              <Lock className="w-3.5 h-3.5" /> Secure Access
            </div>
            <p className="text-[11px] text-slate-400">Role-based admin verification & encrypted sync.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Mobile Phone Number *</label>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-emerald-500">
                <span className="pl-3 pr-2 text-slate-500 text-sm font-medium">+91</span>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter 10-digit number"
                  className="w-full bg-transparent py-3 pr-3 text-slate-100 focus:outline-none text-sm font-mono"
                  maxLength={10}
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 px-1">
                <span>Recognized Staff: <strong className="text-slate-300">VINSADMIN (Administrator)</strong></span>
                <span className="text-emerald-400">DLT Gateway Configured</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-900/30 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Sending SMS OTP...' : 'Send 6-Digit SMS OTP'}
              <Phone className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-400">SMS Verification Code *</label>
                <span className="text-[11px] text-slate-400 font-mono">Sent to +91 {cleanDigits}</span>
              </div>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-emerald-500">
                <span className="pl-3 pr-2 text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    setError(null);
                  }}
                  placeholder="Enter 6-digit SMS OTP"
                  className="w-full bg-transparent py-3 pr-3 text-slate-100 focus:outline-none text-lg tracking-widest font-mono"
                  maxLength={6}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 px-1">Check your registered mobile for the verification code.</p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-900/30 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Verify SMS Code & Sign In Admin'}
              <CheckCircle2 className="w-4 h-4" />
            </button>

            {/* Resend OTP and Change Mobile Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || countdown > 0}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 disabled:text-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                title="Resend SMS OTP"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend SMS OTP'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
              >
                Change Mobile Number
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Secured by DLT Registered ISP Gateway</span>
          <span className="text-emerald-400 font-medium">● Online</span>
        </div>
      </div>
    </div>
  );
};