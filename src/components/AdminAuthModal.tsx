import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, X, AlertCircle, KeyRound, Check } from 'lucide-react';
import { useISP } from '../context/ISPContext';

export const AdminAuthModal: React.FC = () => {
  const { isAdminAuthModalOpen, closeAdminAuthModal, submitAdminAuth, settings } = useISP();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdminAuthModalOpen) {
      setPin('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isAdminAuthModalOpen]);

  if (!isAdminAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      setError('Please enter the 4-digit Admin PIN');
      return;
    }

    const success = submitAdminAuth(pin);
    if (!success) {
      setError('Incorrect Admin PIN. Please check or verify with system administrator.');
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
      <div 
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-800 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-xs">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Admin Authentication</h3>
              <p className="text-[11px] text-indigo-300/80 font-mono">Elevated privileges required</p>
            </div>
          </div>
          <button
            onClick={closeAdminAuthModal}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-850 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 mb-3 shadow-inner">
              <KeyRound className="w-6 h-6 stroke-[2]" />
            </div>
            <h4 className="text-sm font-bold text-white">Enter Admin Security PIN</h4>
            <p className="text-xs text-slate-400 mt-1">
              Switching to Administrator role or executing administrative actions requires the 4-digit Master PIN.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="• • • •"
                  value={pin}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPin(val);
                    setError(null);
                  }}
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-2.5 px-4 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 text-white placeholder-slate-600 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-3 text-xs text-slate-400 hover:text-white font-medium cursor-pointer"
                >
                  {showPin ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
                <span>Default PIN: <strong className="font-mono text-emerald-400">{settings.adminPin || '1234'}</strong></span>
                <span className="text-slate-500">Configured in Settings</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={closeAdminAuthModal}
                className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:brightness-110 active:brightness-95 rounded-xl shadow-lg shadow-indigo-950/60 transition-all cursor-pointer"
              >
                Verify PIN
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
