import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, CheckSquare, Square, Users } from 'lucide-react';
import { useISP } from '../context/ISPContext';

export const ClearSubscribersModal: React.FC = () => {
  const { isClearSubscribersOpen, closeClearSubscribers, clearAllSubscribers, customers, payments } = useISP();
  const [alsoClearPayments, setAlsoClearPayments] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  if (!isClearSubscribersOpen) return null;

  const handleConfirm = () => {
    clearAllSubscribers(alsoClearPayments);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans">
      <div 
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-900/40 bg-slate-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold shadow-md">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Clear All Subscribers</h3>
              <p className="text-[11px] text-rose-400">Clean slate for manual data entry</p>
            </div>
          </div>
          <button
            onClick={closeClearSubscribers}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-rose-950/50 border border-rose-800/80 rounded-2xl text-xs text-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-white">Wipe Sample Subscriber Directory?</strong>
              <p className="mt-0.5 leading-relaxed text-rose-300/90 text-[11px]">
                This will remove all <strong className="font-bold text-white">{customers.length} subscribers</strong> currently registered in the system so you can add your own real broadband accounts from scratch.
              </p>
            </div>
          </div>

          <div 
            onClick={() => setAlsoClearPayments(!alsoClearPayments)}
            className="p-3.5 border border-slate-800 hover:border-slate-700 rounded-xl bg-slate-950 cursor-pointer flex items-center justify-between transition-colors text-xs"
          >
            <div>
              <strong className="text-white block font-semibold">Also Clear Payment Records ({payments.length} items)</strong>
              <span className="text-slate-400 text-[11px]">Reset collection logs and receipts to zero as well</span>
            </div>
            <div className="text-rose-400 shrink-0 ml-3">
              {alsoClearPayments ? (
                <CheckSquare className="w-5 h-5 text-rose-400" />
              ) : (
                <Square className="w-5 h-5 text-slate-600" />
              )}
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Type <span className="font-mono bg-slate-950 text-rose-400 px-1.5 py-0.5 rounded border border-rose-800 font-bold">CLEAR</span> to confirm:
            </label>
            <input
              type="text"
              placeholder="CLEAR"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value.toUpperCase())}
              className="w-full font-mono text-center tracking-widest text-sm uppercase py-2 px-3 bg-slate-950 border border-slate-700 text-rose-400 rounded-xl focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={closeClearSubscribers}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={confirmText !== 'CLEAR'}
              onClick={handleConfirm}
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
                confirmText === 'CLEAR'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Confirm & Clear All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
