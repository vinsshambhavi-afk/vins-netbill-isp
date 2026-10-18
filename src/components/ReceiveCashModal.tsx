import React, { useState, useEffect } from 'react';
import { X, Search, Check, Calendar, Banknote, QrCode, Building, CreditCard, AlertCircle } from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { PaymentMethod } from '../types/isp';

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

  // When selectedCustomerId changes, calculate dates and amounts
  useEffect(() => {
    if (!selectedCustomerId) return;
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return;

    // Determine start date
    const today = new Date().toISOString().split('T')[0];
    const customerExpiry = customer.expiryDate;
    const startDate = customerExpiry && customerExpiry > today ? customerExpiry : today;
    setValidFrom(startDate);

    // Calculate end date based on durationMonths
    const end = new Date(startDate);
    end.setMonth(end.getMonth() + durationMonths);
    setValidTo(end.toISOString().split('T')[0]);

    // Amount = monthly fee * duration
    setAmount(customer.monthlyFee * durationMonths);
  }, [selectedCustomerId, durationMonths, customers]);

  if (!isReceiveCashOpen) return null;

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

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

  const handleDurationChange = (months: number) => {
    setDurationMonths(months);
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
      // Context will close this modal and open WhatsAppReceiptModal
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
                Record receipt, advance subscriber validity, and generate WhatsApp & 80mm thermal confirmation
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
                        <div className="text-[10px] text-slate-500">Exp: {c.expiryDate}</div>
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
                <span>Current Expiry: <strong className="text-slate-300 font-mono tabular-nums">{selectedCustomer.expiryDate}</strong></span>
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

          {/* Validity Period Summary */}
          <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                New Validity: <strong className="text-white font-mono">{validFrom}</strong> to <strong className="text-emerald-300 font-mono">{validTo}</strong>
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-lg border border-emerald-800 font-mono">
              +{durationMonths * 30} Days
            </span>
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
