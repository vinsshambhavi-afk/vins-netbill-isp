import React, { useState } from 'react';
import { 
  HandCoins, 
  Banknote, 
  QrCode, 
  TrendingUp, 
  Calendar, 
  Download, 
  Search, 
  Printer, 
  Send, 
  Check, 
  Calculator, 
  Plus, 
  ReceiptText,
  DollarSign,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { Customer, PaymentRecord } from '../types/isp';

export const CashRegisterView: React.FC = () => {
  const { payments, customers, settings, openReceiveCash, openReceiptModal, triggerPrintReceipt, openThermalReceipt } = useISP();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'All' | 'Cash' | 'UPI' | 'Bank Transfer'>('All');
  const [showDenominations, setShowDenominations] = useState(false);

  // Cash denomination counts for physical drawer reconciliation
  const [denominations, setDenominations] = useState<Record<number, number>>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0
  });

  // Calculate today's date in local ISO
  const todayStr = new Date().toISOString().split('T')[0];

  // Payments today
  const todayPayments = payments.filter(p => p.date.startsWith(todayStr));

  const todayCashTotal = todayPayments
    .filter(p => p.method === 'Cash')
    .reduce((sum, p) => sum + p.amount, 0);

  const todayUpiTotal = todayPayments
    .filter(p => p.method === 'UPI')
    .reduce((sum, p) => sum + p.amount, 0);

  const todayTotal = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  // Total month to date
  const currentMonthPrefix = todayStr.substring(0, 7);
  const mtdTotal = payments
    .filter(p => p.date.startsWith(currentMonthPrefix))
    .reduce((sum, p) => sum + p.amount, 0);

  // Calculated physical cash in drawer
  const physicalDrawerCalculated = Object.entries(denominations).reduce(
    (total, [note, count]) => total + Number(note) * count,
    0
  );

  const cashDiscrepancy = physicalDrawerCalculated - todayCashTotal;

  // Filtered payments list
  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerPhone.includes(searchQuery) ||
      p.subscriberId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod = methodFilter === 'All' || p.method === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const handleExportCSV = () => {
    const headers = ['Receipt No', 'Date', 'Customer Name', 'Phone', 'Subscriber ID', 'Amount', 'Method', 'Validity From', 'Validity To', 'Collected By'];
    const rows = filteredPayments.map(p => [
      p.receiptNo,
      new Date(p.date).toLocaleString(),
      `"${p.customerName}"`,
      p.customerPhone,
      p.subscriberId,
      p.amount,
      p.method,
      p.validFrom,
      p.validTo,
      `"${p.collectedBy}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VinsNetBill-Cash-Collections-${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDenominationChange = (note: number, value: string) => {
    const count = parseInt(value, 10) || 0;
    setDenominations(prev => ({
      ...prev,
      [note]: Math.max(0, count)
    }));
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Modern Executive Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-slate-800/90 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Cash Terminal
            </span>
            <span className="text-xs text-slate-400">Desk Handover & Reconciliation</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Cash Register & Collections</span>
          </h1>
          <p className="text-xs text-slate-400">
            Monitor real-time cash drawer intake, digital UPI receipts, and physical currency note reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowDenominations(!showDenominations)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-amber-400" />
            <span>{showDenominations ? 'Hide Note Calculator' : 'Note Calculator'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => openReceiveCash()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 hover:brightness-110 active:brightness-95 rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Receive Cash</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Cash Collected */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Physical Cash (Today)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-300 tracking-tight font-mono tabular-nums">
            {settings.currencySymbol}{todayCashTotal.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{todayPayments.filter(p => p.method === 'Cash').length} cash receipts collected</span>
            <span className="font-semibold text-emerald-400">In Drawer</span>
          </div>
        </div>

        {/* Today's UPI / Online */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">UPI & QR (Today)</span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-sky-300 tracking-tight font-mono tabular-nums">
            {settings.currencySymbol}{todayUpiTotal.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{todayPayments.filter(p => p.method !== 'Cash').length} digital receipts</span>
            <span className="font-semibold text-sky-400">Bank Direct</span>
          </div>
        </div>

        {/* Total Today */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Day Volume</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight font-mono tabular-nums">
            {settings.currencySymbol}{todayTotal.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{todayPayments.length} total collections</span>
            <span className="font-semibold text-indigo-400">Today</span>
          </div>
        </div>

        {/* Month to Date */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Month to Date (MTD)</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight font-mono tabular-nums">
            {settings.currencySymbol}{mtdTotal.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Desk: <strong>{settings.activeCashier}</strong></span>
            <span className="font-semibold text-amber-400">MTD Total</span>
          </div>
        </div>
      </div>

      {/* Cash Reconciliation Drawer Panel (Collapsible) */}
      {showDenominations && (
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>Physical Cash Denomination Counter</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Count notes in your physical register drawer to verify against recorded cash receipts
              </p>
            </div>
            <button
              onClick={() => setDenominations({ 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 })}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
            >
              Reset Counts
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[500, 200, 100, 50, 20, 10].map(note => (
              <div key={note} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center space-y-1">
                <span className="text-xs font-black text-amber-400 block font-mono">
                  {settings.currencySymbol}{note}
                </span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={denominations[note] || ''}
                  onChange={e => handleDenominationChange(note, e.target.value)}
                  className="w-full text-center text-sm font-mono font-bold bg-slate-900 border border-slate-700 text-white rounded-lg py-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 block font-mono">
                  = {settings.currencySymbol}{((denominations[note] || 0) * note).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-400 block">Physical Counted:</span>
                <strong className="text-white text-sm font-mono">{settings.currencySymbol}{physicalDrawerCalculated.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Recorded Cash:</span>
                <strong className="text-white text-sm font-mono">{settings.currencySymbol}{todayCashTotal.toLocaleString()}</strong>
              </div>
            </div>

            <div>
              {physicalDrawerCalculated > 0 ? (
                cashDiscrepancy === 0 ? (
                  <span className="px-3 py-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded-lg font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Exact Match (₹0 Discrepancy)</span>
                  </span>
                ) : cashDiscrepancy > 0 ? (
                  <span className="px-3 py-1.5 bg-amber-950/80 text-amber-300 border border-amber-800 rounded-lg font-bold">
                    Surplus: +{settings.currencySymbol}{cashDiscrepancy.toLocaleString()}
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-rose-950/80 text-rose-300 border border-rose-800 rounded-lg font-bold">
                    Shortage: -{settings.currencySymbol}{Math.abs(cashDiscrepancy).toLocaleString()}
                  </span>
                )
              ) : (
                <span className="text-slate-400">Enter note counts to verify drawer balance</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table & Search Controls */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search receipt #, name, phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs self-stretch sm:self-auto overflow-x-auto">
            {(['All', 'Cash', 'UPI', 'Bank Transfer'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setMethodFilter(tab)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  methodFilter === tab
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <ReceiptText className="w-8 h-8 mx-auto text-slate-500" />
            <p className="text-sm font-semibold text-slate-300">No payment receipts found</p>
            <p className="text-xs text-slate-500">Try adjusting your search query or filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Receipt #</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Subscriber</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Validity</th>
                  <th className="py-3.5 px-4">Collector</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPayments.map(payment => {
                  const customer: Customer = customers.find(c => c.id === payment.customerId) || {
                    id: payment.customerId,
                    subscriberId: payment.subscriberId,
                    activationNumber: 'ACT-00000-FTTH',
                    name: payment.customerName,
                    phone: payment.customerPhone,
                    address: '',
                    area: '',
                    planName: 'Broadband',
                    speedMbps: 100,
                    monthlyFee: payment.amount,
                    billingDay: 1,
                    expiryDate: payment.validTo,
                    status: 'active' as const,
                    balance: 0,
                    connectionType: 'FTTH' as const,
                    createdAt: payment.date
                  };

                  return (
                    <tr key={payment.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {payment.receiptNo}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        {new Date(payment.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{payment.customerName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">+91 {payment.customerPhone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          payment.method === 'Cash' 
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80' 
                            : payment.method === 'UPI'
                              ? 'bg-sky-950/80 text-sky-300 border border-sky-800/80'
                              : 'bg-purple-950/80 text-purple-300 border border-purple-800/80'
                        }`}>
                          {payment.method === 'Cash' && <Banknote className="w-3 h-3" />}
                          {payment.method === 'UPI' && <QrCode className="w-3 h-3" />}
                          <span>{payment.method}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-amber-300 tabular-nums text-sm">
                        {settings.currencySymbol}{payment.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {payment.validFrom} to {payment.validTo}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <span className="font-medium">{payment.collectedBy}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openThermalReceipt(payment, customer)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Print 80mm Thermal Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openReceiptModal(payment, customer)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition-colors cursor-pointer"
                          >
                            View Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
