import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Check, 
  Calendar, 
  Banknote, 
  QrCode, 
  Building, 
  CreditCard, 
  AlertCircle,
  Calculator,
  Clock
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { PaymentMethod } from '../types/isp';

// Date utility to parse various date formats (DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY)
function parseDateString(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  // Check DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    return new Date(year, month, day);
  }
  // Check YYYY-MM-DD or YYYY/MM/DD
  const yyyymmdd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10) - 1;
    const day = parseInt(yyyymmdd[3], 10);
    return new Date(year, month, day);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Calculate validity end date strictly based on subscriber expiry date + days
function addDaysToDateString(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const parsed = parseDateString(dateStr);
  if (!parsed) return dateStr;

  // If subscriber expire date was day 30 or 31 (e.g. Sept 30), 30 days active service inclusive gives e.g. Oct 29 (+30 days)
  const isMonthEnd = parsed.getDate() >= 30;
  const daysOffset = isMonthEnd ? days - 1 : days;
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + daysOffset);
  return formatDateIso(target);
}

export const ReceiveCashModal: React.FC = () => {
  const {
    isReceiveCashOpen,
    closeReceiveCash,
    customers,
    preselectedCustomerId,
    settings,
    recordPayment,
  } = useISP();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [oldBalance, setOldBalance] = useState<number>(0);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [validFrom, setValidFrom] = useState<string>('');
  const [validTo, setValidTo] = useState<string>('');
  const [collectedBy, setCollectedBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Initialize selected customer and fields when modal opens
  useEffect(() => {
    if (!isReceiveCashOpen) return;

    setCollectedBy(settings.activeCashier);
    setError(null);
    setNotes('');

    const targetId = preselectedCustomerId || (customers.length > 0 ? customers[0].id : '');
    setSelectedCustomerId(targetId);
  }, [isReceiveCashOpen, preselectedCustomerId, settings.activeCashier, customers]);

  // When a subscriber is selected, initialize dates based on subscriber's CREATED expire date (NOT receive cash date)
  useEffect(() => {
    if (!selectedCustomerId) return;
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return;

    // 1. Calculate Old Balance from subscriber's current balance
    const rawBalance = customer.balance ?? 0;
    const initialOldBalance = rawBalance < 0 ? Math.abs(rawBalance) : (rawBalance > 0 ? rawBalance : 0);
    setOldBalance(initialOldBalance);

    // 2. Base validity strictly on subscriber's created expiry date (e.g. 2026-09-30)
    // NEVER fall back to today/receive cash date if subscriber has an expiry date!
    let initialFrom = '';
    if (customer.expiryDate && customer.expiryDate.trim()) {
      const parsed = parseDateString(customer.expiryDate);
      initialFrom = parsed ? formatDateIso(parsed) : customer.expiryDate.trim();
    } else {
      initialFrom = formatDateIso(new Date());
    }

    setValidFrom(initialFrom);

    // 3. Calculate New Validity (+30 Days from subscriber created expire date, e.g. 2026-09-30 -> 2026-10-29)
    const initialTo = addDaysToDateString(initialFrom, durationMonths * 30);
    setValidTo(initialTo);

    // 4. Amount = Current Plan Price + Old Balance
    const planPrice = (customer.monthlyFee || 0) * durationMonths;
    setAmount(planPrice + initialOldBalance);
  }, [selectedCustomerId, customers]);

  if (!isReceiveCashOpen) return null;

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const currentPlanPrice = selectedCustomer ? (selectedCustomer.monthlyFee || 0) * durationMonths : 0;
  const totalDueAmount = currentPlanPrice + (Number(oldBalance) || 0);

  // Filter customers for instant search
  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.subscriberId.toLowerCase().includes(q) ||
      (c.activationNumber && c.activationNumber.toLowerCase().includes(q)) ||
      c.area.toLowerCase().includes(q)
    );
  });

  // Handle explicit duration change (e.g. 1 Month, 2 Months, 3 Months)
  const handleDurationChange = (months: number) => {
    setDurationMonths(months);
    const newPlanPrice = (selectedCustomer?.monthlyFee || 0) * months;
    setAmount(newPlanPrice + (Number(oldBalance) || 0));

    // Update validTo from validFrom with new duration (months * 30 days)
    if (validFrom) {
      setValidTo(addDaysToDateString(validFrom, months * 30));
    }
  };

  // Handle old balance manual edit
  const handleOldBalanceChange = (newOld: number) => {
    setOldBalance(newOld);
    setAmount(currentPlanPrice + newOld);
  };

  // Handle manual validFrom change by cashier
  const handleValidFromChange = (newFrom: string) => {
    setValidFrom(newFrom);
    if (newFrom) {
      setValidTo(addDaysToDateString(newFrom, durationMonths * 30));
    }
  };

  // Quick days extensions (+30 Days, +60 Days, +90 Days)
  const applyCustomDays = (days: number) => {
    if (validFrom) {
      setValidTo(addDaysToDateString(validFrom, days));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedCustomer) {
      setError('Please select a subscriber');
      return;
    }
    if (amount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    try {
      recordPayment({
        customerId: selectedCustomerId,
        amount: Number(amount),
        method,
        validFrom,
        validTo,
        notes: notes.trim(),
        collectedBy: collectedBy.trim() || settings.activeCashier,
      });
      // Context closes modal and opens WhatsAppReceiptModal
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans">
      <div 
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center font-bold shadow-md">
              <Banknote className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Receive Cash / Subscription Payment</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Record receipt, advance subscriber validity from expiry date, and generate confirmation
              </p>
            </div>
          </div>
          <button
            onClick={closeReceiveCash}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/80 border border-rose-800 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Subscriber Selector / Search */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Select Subscriber *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, phone, subscriber ID, or area..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick search suggestions if query exists */}
            {searchQuery && (
              <div className="max-h-40 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-950 shadow-xl">
                {filteredCustomers.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center">No matching subscribers found</div>
                ) : (
                  filteredCustomers.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setSearchQuery('');
                      }}
                      className={`p-2.5 text-xs flex items-center justify-between cursor-pointer hover:bg-slate-850 transition-colors ${
                        c.id === selectedCustomerId ? 'bg-emerald-950/60 font-semibold' : ''
                      }`}
                    >
                      <div>
                        <div className="text-white font-medium">
                          {c.name} <span className="text-slate-400 font-mono">({c.subscriberId})</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          {c.phone} · <span className="font-mono text-emerald-400">{c.activationNumber || 'No Act No'}</span> · {c.area}
                        </div>
                      </div>
                      <div className="text-right tabular-nums font-mono">
                        <span className="font-bold text-amber-300">{settings.currencySymbol}{c.monthlyFee}</span>
                        <div className="text-[10px] text-amber-400 font-semibold">Created Exp: {c.expiryDate}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Customer Card */}
          {selectedCustomer && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                    <span className="text-emerald-400 font-bold">{selectedCustomer.subscriberId}</span>
                    <span>·</span>
                    <span>ONT: {selectedCustomer.activationNumber || 'N/A'}</span>
                    <span>·</span>
                    <span>📞 {selectedCustomer.phone}</span>
                    <span>·</span>
                    <span>{selectedCustomer.area}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Monthly Plan</span>
                  <div className="text-base font-black text-amber-300 tabular-nums font-mono">
                    {settings.currencySymbol}{selectedCustomer.monthlyFee}
                    <span className="text-xs font-normal text-slate-500">/mo</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Speed: <strong className="text-white">{selectedCustomer.speedMbps} Mbps</strong> ({selectedCustomer.connectionType})</span>
                <span>Subscriber Created Expiry: <strong className="text-amber-300 font-mono font-bold tabular-nums">{selectedCustomer.expiryDate}</strong></span>
              </div>
            </div>
          )}

          {/* Payment Duration Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Recharge Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 6].map(m => (
                <button
                  type="button"
                  key={m}
                  onClick={() => handleDurationChange(m)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    durationMonths === m
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
                  }`}
                >
                  {m} {m === 1 ? 'Month' : 'Months'}
                </button>
              ))}
            </div>
          </div>

          {/* Old Balance & Plan Price Calculation Breakdown */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>Old Balance & Plan Price Calculation</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Financial Breakdown
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Current Plan Price */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Current Plan Price
                </span>
                <div className="text-base font-bold text-emerald-400 font-mono mt-1">
                  {settings.currencySymbol}{currentPlanPrice}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {settings.currencySymbol}{selectedCustomer?.monthlyFee || 0} × {durationMonths} mo
                </span>
              </div>

              {/* Old Balance (Dues) */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-amber-500/40">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Old Balance (Pending)
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-sm font-bold text-amber-400 font-mono">+ {settings.currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={oldBalance}
                    onChange={e => handleOldBalanceChange(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-2 py-0.5 text-amber-300 font-bold font-mono text-sm focus:outline-none focus:border-amber-400"
                    placeholder="0"
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  Previous pending dues
                </span>
              </div>

              {/* Combined Total Due */}
              <div className="bg-gradient-to-br from-emerald-950/80 to-slate-900 p-3 rounded-xl border border-emerald-500/50">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                  Total Amount Due
                </span>
                <div className="text-base font-black text-white font-mono mt-1">
                  {settings.currencySymbol}{totalDueAmount}
                </div>
                <span className="text-[10px] text-emerald-400/80 font-mono">
                  Plan ({currentPlanPrice}) + Old ({oldBalance})
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Cash', 'UPI', 'Bank Transfer', 'Card'] as PaymentMethod[]).map(m => {
                const isSelected = method === m;
                const isCash = m === 'Cash';
                return (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? isCash 
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md' 
                          : 'bg-sky-500 text-slate-950 border-sky-400 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    {m === 'Cash' && <Banknote className="w-4 h-4" />}
                    {m === 'UPI' && <QrCode className="w-4 h-4" />}
                    {m === 'Bank Transfer' && <Building className="w-4 h-4" />}
                    {m === 'Card' && <CreditCard className="w-4 h-4" />}
                    <span>{m}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Financial Breakdown & Date Extensions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Amount Received ({settings.currencySymbol}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-semibold text-slate-500 font-mono">
                  {settings.currencySymbol}
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold text-amber-300 font-mono bg-slate-950 border border-slate-700 rounded-xl tabular-nums focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Recommended: <strong className="font-mono text-emerald-400">{settings.currencySymbol}{totalDueAmount}</strong> (Full settlement)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Collected By (Agent / Desk)
              </label>
              <input
                type="text"
                value={collectedBy}
                onChange={e => setCollectedBy(e.target.value)}
                placeholder="Cashier Name"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Validity Period Summary & Extension Inputs */}
          <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-300">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  New Validity: <strong className="text-white font-mono">{validFrom}</strong> to <strong className="text-emerald-300 font-mono">{validTo}</strong>
                </span>
              </div>
              <span className="self-start sm:self-auto text-[11px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-lg border border-emerald-800 font-mono">
                +{durationMonths * 30} Days (From Created Expire Date)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Validity Starts (Subscriber Created Expire Date)
                </label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={e => handleValidFromChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Set to subscriber expiry ({selectedCustomer?.expiryDate}), not cash receive date.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  New Validity Ends (Valid To +30 Days)
                </label>
                <input
                  type="date"
                  value={validTo}
                  onChange={e => setValidTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-emerald-500/50 rounded-xl text-emerald-300 font-bold font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Calculated as +30 days from subscriber expiry date.
                </span>
              </div>
            </div>

            {/* Quick Days Selector */}
            <div className="flex items-center flex-wrap gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Quick Duration:
              </span>
              <button
                type="button"
                onClick={() => applyCustomDays(30)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 font-mono font-semibold cursor-pointer transition-colors"
              >
                +30 Days
              </button>
              <button
                type="button"
                onClick={() => applyCustomDays(60)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-mono font-semibold cursor-pointer transition-colors"
              >
                +60 Days
              </button>
              <button
                type="button"
                onClick={() => applyCustomDays(90)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-mono font-semibold cursor-pointer transition-colors"
              >
                +90 Days
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Notes / Receipt Remarks (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Received at door, cash drawer receipt, etc."
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={closeReceiveCash}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 hover:brightness-110 active:brightness-95 rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Record & Open Receipt</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
