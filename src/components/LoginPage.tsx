import React, { useState } from 'react';
import { 
  Wifi, 
  ArrowRight, 
  ShieldCheck, 
  Send,
  User,
  AlertCircle,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  Lock,
  UserCheck,
  Flame,
  Cloud,
  Database,
  Smartphone,
  KeyRound,
  Check,
  Radio,
  Timer
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { FIREBASE_CONFIG } from '../lib/firebase';
import { SmsService, SmsDispatchLog } from '../services/smsService';

export const LoginPage: React.FC = () => {
  const { 
    loginWithOtp,
    sendOtpToOperator, 
    settings, 
    customers,
    operators 
  } = useISP();

  const [phoneNumber, setPhoneNumber] = useState(
    settings.phone ? settings.phone.replace(/\D/g, '') : '9876512340'
  );

  // Check if phone matches any known operator (Admin or Cash Collector)
  const cleanDigits = phoneNumber.replace(/\D/g, '');
  const matchedOperator = operators.find(op => 
    op.phone.replace(/\D/g, '').endsWith(cleanDigits.slice(-10))
  );

  const [adminName, setAdminName] = useState(
    matchedOperator ? matchedOperator.name : (settings.activeCashier ? settings.activeCashier.replace(/\s*\(Admin\)/i, '') : 'Rajesh Kumar')
  );

  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dispatchedSms, setDispatchedSms] = useState<SmsDispatchLog | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'sms' | 'pin'>('sms');
  const [pinCode, setPinCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Update name if matched operator changes
  React.useEffect(() => {
    if (matchedOperator) {
      setAdminName(matchedOperator.name);
    }
  }, [matchedOperator]);

  // Resend countdown timer
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Fast autofill for testing
  const selectDemoAccount = (opPhone: string, opName: string) => {
    setPhoneNumber(opPhone);
    setAdminName(opName);
    setError(null);
    setDispatchedSms(null);
  };

  const handleSendSmsOtp = async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit mobile phone number');
      return;
    }
    setError(null);
    setIsSendingSms(true);

    const resolvedName = matchedOperator ? matchedOperator.name : (adminName.trim() || 'Administrator');
    const res = sendOtpToOperator(digits, resolvedName);

    // Dispatch SMS via configured SMS Service
    const smsResult = await SmsService.dispatchSmsOtp(digits, res.otp, resolvedName);
    setDispatchedSms(smsResult.log);
    setCountdown(30);

    // Provide OTP in state for smooth verification
    setOtpCode(res.otp);

    setTimeout(() => {
      setIsSendingSms(false);
    }, 300);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit mobile phone number');
      return;
    }

    const resolvedName = matchedOperator ? matchedOperator.name : (adminName.trim() || 'Administrator');
    const preferredRole = matchedOperator ? matchedOperator.role : 'admin';

    if (loginMethod === 'pin') {
      if (pinCode.trim() !== (settings.adminPin || '1234') && pinCode.trim() !== (matchedOperator?.pin || '1234')) {
        setError('Incorrect PIN code. Default Admin PIN is 1234.');
        return;
      }
      const fakeOtp = sendOtpToOperator(digits, resolvedName).otp;
      loginWithOtp(digits, fakeOtp, resolvedName, preferredRole);
      return;
    }

    if (!otpCode.trim()) {
      setError('Please enter the 6-digit SMS verification code or click "Send SMS OTP"');
      return;
    }

    const result = loginWithOtp(digits, otpCode.trim(), resolvedName, preferredRole);
    if (!result.success) {
      setError(result.error || 'Authentication failed. Please verify your SMS OTP code.');
    }
  };

  const isMatchedCollector = matchedOperator && matchedOperator.role !== 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060913] via-[#0b1329] to-[#02050f] text-slate-100 flex flex-col justify-center py-8 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-4xl px-4">
        {/* Top Firebase & SMS Gateway Badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3.5 shadow-lg shadow-black/40 backdrop-blur-md">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span>Firebase Cloud Store</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] text-slate-300 font-mono">SMS OTP Gateway: Active</span>
          </div>

          <div className="flex items-center justify-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-amber-500/40 shadow-2xl shadow-amber-950/50 bg-slate-950 flex items-center justify-center shrink-0">
              <img 
                src="/vinsnetbill_logo.jpg" 
                alt="VinsNetBill Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center">
                <span>VinsNet</span><span className="text-emerald-400 font-black">Bill</span>
              </h1>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/90 flex items-center gap-1.5">
                <span>SMS Authentication Terminal</span>
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {settings.ispName} · Mobile Number Sign In with SMS OTP Verification
          </p>
        </div>

        {/* Main Glassmorphism Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800/90 overflow-hidden grid grid-cols-1 md:grid-cols-12 ring-1 ring-white/10">
          {/* Left Column: Cloud Data Architecture & Features */}
          <div className="md:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 p-6 sm:p-7 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800/80 text-white">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  SMS Gateway Verification
                </span>
                <h2 className="text-xl font-bold text-white mt-1">
                  Mobile Login Terminal
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Sign in instantly with your verified mobile number and 6-digit SMS OTP code dispatched via Telecom DLT SMS gateway.
                </p>
              </div>

              {/* Architecture highlights */}
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-slate-200 block font-semibold">Telecom SMS Gateway</strong>
                    <span className="text-slate-400 text-[11px] leading-snug">
                      6-digit one-time password dispatched straight to mobile carrier network.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-slate-200 block font-semibold">Firebase Cloud Store</strong>
                    <span className="text-slate-400 text-[11px] leading-snug">
                      High-availability cloud persistence for subscribers, collections & handover receipts.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-slate-200 block font-semibold">Role-Based Access Control</strong>
                    <span className="text-slate-400 text-[11px] leading-snug">
                      Automatic detection for Administrators and authorized field cash collectors.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Demo Switcher - ONLY authorized active profiles */}
            <div className="pt-5 border-t border-slate-800 mt-6 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Quick Login Profile:
              </span>
              <div className="flex flex-col gap-1.5">
                {operators.map(op => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => selectDemoAccount(op.phone, op.name)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-colors border text-left ${
                      cleanDigits.endsWith(op.phone.slice(-10))
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="font-semibold">{op.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({op.role === 'admin' ? 'Administrator' : 'Cash Collector'})</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">+91 {op.phone}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: SMS Form */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-slate-900/40">
            <div>
              {/* Header inside form */}
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Mobile SMS Login</span>
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 font-bold rounded-full border border-emerald-500/30">
                      SMS Ready
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Receive your 6-digit OTP code directly via SMS text message.
                  </p>
                </div>

                {/* Login Method Toggle */}
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('sms')}
                    className={`px-2.5 py-1 rounded font-bold transition-colors ${
                      loginMethod === 'sms'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SMS OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('pin')}
                    className={`px-2.5 py-1 rounded font-bold transition-colors ${
                      loginMethod === 'pin'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    PIN
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Dispatched SMS Delivered Notification Card */}
              {dispatchedSms && (
                <div className="mb-4 p-3.5 bg-gradient-to-r from-slate-950 to-slate-900 border border-emerald-500/40 rounded-xl text-xs space-y-2 shadow-lg animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Carrier SMS Delivered ({dispatchedSms.carrier})</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                      DLT: VINSBL
                    </span>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200">
                    <span className="text-amber-400 font-bold">📩 Message: </span>
                    {dispatchedSms.message}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>Delivered to: <strong>+91 {phoneNumber}</strong></span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(dispatchedSms.otp)}
                      className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 cursor-pointer"
                    >
                      Fill Code: {dispatchedSms.otp}
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* 1. Mobile Phone Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mobile Phone Number *
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 flex items-center gap-1 text-xs font-semibold text-amber-400 font-mono">
                      <span>🇮🇳</span>
                      <span>+91</span>
                      <span className="text-slate-600">|</span>
                    </div>
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
                      className="w-full pl-20 pr-4 py-2.5 text-sm font-mono bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-inner"
                    />
                  </div>

                  {matchedOperator ? (
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/50">
                      <UserCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>
                        Recognized Staff: <strong className="text-white">{matchedOperator.name}</strong> ({matchedOperator.role === 'admin' ? 'Administrator' : 'Cash Collector'})
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      New mobile number? You'll be registered as an Administrator for this terminal.
                    </span>
                  )}
                </div>

                {/* 2. Admin Name if not matched */}
                {!isMatchedCollector && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Admin / Profile Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rajesh Kumar"
                        value={adminName}
                        onChange={e => {
                          setAdminName(e.target.value);
                          setError(null);
                        }}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* 3. SMS OTP or PIN Code Input */}
                {loginMethod === 'sms' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        SMS Verification Code *
                      </label>
                      <span className="text-[11px] text-amber-400 font-mono">
                        6-Digit SMS Code
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          maxLength={6}
                          required
                          placeholder="Enter 6-digit SMS OTP"
                          value={otpCode}
                          onChange={e => {
                            setOtpCode(e.target.value.replace(/\D/g, ''));
                            setError(null);
                          }}
                          className="w-full pl-9 pr-4 py-2.5 text-base font-mono tracking-widest bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSendSmsOtp}
                        disabled={isSendingSms || countdown > 0}
                        className="px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors shadow-md disabled:opacity-60 cursor-pointer"
                        title="Send SMS verification code to phone"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {isSendingSms 
                            ? 'Sending...' 
                            : countdown > 0 
                              ? `Resend (${countdown}s)` 
                              : dispatchedSms 
                                ? 'Resend SMS' 
                                : 'Send SMS OTP'}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Terminal Security PIN *
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        maxLength={8}
                        required
                        placeholder="Enter 4-digit PIN (default 1234)"
                        value={pinCode}
                        onChange={e => {
                          setPinCode(e.target.value);
                          setError(null);
                        }}
                        className="w-full pl-9 pr-4 py-2.5 text-base font-mono tracking-widest bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 hover:brightness-110 active:brightness-95 rounded-xl shadow-lg shadow-amber-950/40 transition-all cursor-pointer mt-4"
                >
                  <span>
                    {isMatchedCollector 
                      ? 'Verify SMS Code & Sign In' 
                      : 'Verify SMS Code & Sign In as Admin'}
                  </span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </div>

            {/* Bottom Notice */}
            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Firestore Cloud Active
              </span>
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                DLT Gateway Configured
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
