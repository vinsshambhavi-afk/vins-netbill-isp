import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  User, 
  ArrowRight, 
  Wifi, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  UserCheck,
  Smartphone,
  Flame,
  Check
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { SmsService, SmsDispatchLog } from '../services/smsService';

export const LoginModal: React.FC = () => {
  const { 
    isLoginModalOpen, 
    closeLoginModal, 
    loginWithOtp, 
    sendOtpToOperator, 
    currentUser, 
    settings,
    operators 
  } = useISP();

  const [phoneNumber, setPhoneNumber] = useState(
    currentUser?.phone || (settings.phone ? settings.phone.replace(/\D/g, '') : '9876512340')
  );

  const cleanDigits = phoneNumber.replace(/\D/g, '');
  const matchedOperator = operators.find(op => 
    op.phone.replace(/\D/g, '').endsWith(cleanDigits.slice(-10))
  );

  const [adminName, setAdminName] = useState(
    matchedOperator ? matchedOperator.name : (currentUser?.name || 'Rajesh Kumar')
  );

  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dispatchedSms, setDispatchedSms] = useState<SmsDispatchLog | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [countdown, setCountdown] = useState(0);

  React.useEffect(() => {
    if (matchedOperator) {
      setAdminName(matchedOperator.name);
    }
  }, [matchedOperator]);

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isLoginModalOpen) return null;

  const handleSendSmsOtp = async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError(null);
    setIsSendingSms(true);

    const resolvedName = matchedOperator ? matchedOperator.name : (adminName.trim() || 'Administrator');
    const res = sendOtpToOperator(digits, resolvedName);

    const smsRes = await SmsService.dispatchSmsOtp(digits, res.otp, resolvedName);
    setIsSendingSms(false);
    setDispatchedSms(smsRes.log);
    setOtpCode(res.otp);
    setCountdown(30);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!otpCode || otpCode.length < 4) {
      setError('Please enter the verification code sent via SMS');
      return;
    }

    const resolvedName = matchedOperator ? matchedOperator.name : (adminName.trim() || 'Administrator');
    const preferredRole = matchedOperator ? matchedOperator.role : 'admin';

    const result = loginWithOtp(digits, otpCode.trim(), resolvedName, preferredRole);
    if (!result.success) {
      setError(result.error || 'Authentication failed. Please check OTP.');
    } else {
      closeLoginModal();
    }
  };

  const isMatchedCollector = matchedOperator && matchedOperator.role !== 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans">
      <div 
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800 overflow-hidden my-6 transform transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-amber-400/40 bg-slate-950 flex items-center justify-center shrink-0">
              <img 
                src="/vinsnetbill_logo.jpg" 
                alt="VinsNetBill Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-bold text-white">Mobile SMS Login</h2>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/40 font-mono">
                  DLT SMS
                </span>
              </div>
              <p className="text-xs text-slate-400">VinsNetBill Cloud Terminal</p>
            </div>
          </div>
          {currentUser && (
            <button
              onClick={closeLoginModal}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Form */}
        <div className="p-6 text-xs">
          {error && (
            <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* SMS Delivered Notification */}
          {dispatchedSms && (
            <div className="mb-4 p-3.5 bg-slate-950 text-white border border-emerald-500/40 rounded-xl text-xs space-y-2 shadow-md animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>SMS Code Delivered ({dispatchedSms.carrier})</span>
                </div>
                <span className="text-[10px] bg-slate-900 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                  DLT: VINSBL
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-200 bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                📩 {dispatchedSms.message}
              </div>
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => setOtpCode(dispatchedSms.otp)}
                  className="text-amber-400 hover:text-amber-300 font-bold text-[11px] underline cursor-pointer"
                >
                  Auto-fill {dispatchedSms.otp}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Mobile Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Mobile Phone Number *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-semibold text-slate-500 font-mono">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  placeholder="98765 12340"
                  value={phoneNumber}
                  onChange={e => {
                    setPhoneNumber(e.target.value);
                    setError(null);
                    setDispatchedSms(null);
                  }}
                  className="w-full pl-12 pr-3 py-2.5 text-sm font-mono bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
                />
              </div>
              {matchedOperator && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>
                    Recognized: <strong>{matchedOperator.name}</strong> ({matchedOperator.role === 'admin' ? 'Administrator' : 'Cash Collector'})
                  </span>
                </div>
              )}
            </div>

            {/* 2. Admin Name */}
            {!isMatchedCollector && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Admin Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={adminName}
                    onChange={e => {
                      setAdminName(e.target.value);
                      setError(null);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            {/* 3. SMS OTP Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  SMS Verification Code *
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  6-Digit OTP
                </span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={e => {
                      setOtpCode(e.target.value.replace(/\D/g, ''));
                      setError(null);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 text-sm font-mono tracking-widest bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendSmsOtp}
                  disabled={isSendingSms || countdown > 0}
                  className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:brightness-110 active:brightness-95 rounded-xl flex items-center gap-1.5 shrink-0 transition-all shadow-md disabled:opacity-60 cursor-pointer"
                  title="Send OTP via SMS"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isSendingSms 
                      ? 'Sending...' 
                      : countdown > 0 
                        ? `(${countdown}s)` 
                        : dispatchedSms 
                          ? 'Resend' 
                          : 'Send SMS'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 hover:brightness-110 active:brightness-95 rounded-xl shadow-lg shadow-emerald-950/50 transition-all mt-3 cursor-pointer"
            >
              <span>
                {isMatchedCollector ? 'Verify SMS & Log In as Cash Collector' : 'Verify SMS & Log In as Admin'}
              </span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
