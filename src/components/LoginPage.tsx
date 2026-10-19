import React, { useState } from 'react';
import { Shield, Phone, KeyRound, CheckCircle2, AlertCircle, Smartphone, Database, Lock } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (userData: any) => void;
}

const API_BASE_URL = 'https://vinsnetbill-isp.onrender.com';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mobile, setMobile] = useState('8147422496');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!mobile || mobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to dispatch SMS OTP');
      }

      setSuccessMessage('SMS OTP dispatched successfully via Textbee DLT gateway!');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch from backend server');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Invalid or expired OTP');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
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
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              {loading ? 'Sending SMS OTP...' : 'Send 6-Digit SMS OTP'}
              <Phone className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">SMS Verification Code *</label>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-emerald-500">
                <span className="pl-3 pr-2 text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit SMS OTP"
                  className="w-full bg-transparent py-3 pr-3 text-slate-100 focus:outline-none text-lg tracking-widest font-mono"
                  maxLength={6}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 px-1">Check your registered mobile for the verification code.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify SMS Code & Sign In Admin'}
              <CheckCircle2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-200 mt-2"
            >
              Change Mobile Number
            </button>
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