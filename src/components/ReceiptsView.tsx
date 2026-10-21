import React, { useState, useMemo } from 'react';
import { 
  ReceiptText, 
  Search, 
  Download, 
  Printer, 
  Send, 
  Copy, 
  Check, 
  Banknote, 
  QrCode, 
  Calendar, 
  Building, 
  User, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  Plus, 
  X, 
  FileText, 
  Clock, 
  Sparkles, 
  Wifi, 
  Phone, 
  ShieldCheck, 
  Filter,
  Flame,
  ArrowRight
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { Customer, PaymentRecord } from '../types/isp';
import { generateReceiptMessage } from '../utils/whatsapp';

export const ReceiptsView: React.FC = () => {
  const { 
    payments, 
    customers, 
    settings, 
    openReceiptModal, 
    triggerPrintReceipt, 
    openThermalReceipt,
    selectedReceiptSubscriberId,
    setSelectedReceiptSubscriberId,
    openReceiveCash,
    openCashierStatement
  } = useISP();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'Cash' | 'UPI' | 'Bank Transfer'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'month' | 'last30'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  // Selected subscriber object if any
  const selectedSubscriber = useMemo(() => {
    if (!selectedReceiptSubscriberId) return null;
    return customers.find(c => c.id === selectedReceiptSubscriberId) || null;
  }, [customers, selectedReceiptSubscriberId]);

  // Date ranges
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.substring(0, 7);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Filtering payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Subscriber filter
      if (selectedReceiptSubscriberId && p.customerId !== selectedReceiptSubscriberId) {
        return false;
      }

      // Method filter
      if (methodFilter !== 'all' && p.method !== methodFilter) {
        return false;
      }

      // Date filter
      if (dateFilter === 'today' && !p.date.startsWith(todayStr)) {
        return false;
      }
      if (dateFilter === 'month' && !p.date.startsWith(currentMonthPrefix)) {
        return false;
      }
      if (dateFilter === 'last30' && p.date < thirtyDaysAgo) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const customer = customers.find(c => c.id === p.customerId);
        const actNo = customer?.activationNumber || '';
        return (
          p.receiptNo.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          p.subscriberId.toLowerCase().includes(q) ||
          p.customerPhone.includes(q) ||
          p.collectedBy.toLowerCase().includes(q) ||
          actNo.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [payments, selectedReceiptSubscriberId, methodFilter, dateFilter, searchQuery, customers, todayStr, currentMonthPrefix, thirtyDaysAgo]);

  // Stats: Cash vs Total Collections
  const cashPayments = useMemo(() => payments.filter(p => p.method === 'Cash'), [payments]);
  const totalCashCollected = useMemo(() => cashPayments.reduce((acc, p) => acc + p.amount, 0), [cashPayments]);
  const totalAllCollected = useMemo(() => payments.reduce((acc, p) => acc + p.amount, 0), [payments]);
  const cashSharePercent = totalAllCollected > 0 ? Math.round((totalCashCollected / totalAllCollected) * 100) : 0;
  const avgCashPayment = cashPayments.length > 0 ? Math.round(totalCashCollected / cashPayments.length) : 0;

  // Selected subscriber cash-specific metrics
  const selectedSubCashStats = useMemo(() => {
    if (!selectedSubscriber) return null;
    const subPayments = payments.filter(p => p.customerId === selectedSubscriber.id);
    const subCash = subPayments.filter(p => p.method === 'Cash');
    const totalCash = subCash.reduce((sum, p) => sum + p.amount, 0);
    const latestPayment = subPayments[0] || null;

    return {
      subPayments,
      subCash,
      totalCash,
      cashCount: subCash.length,
      latestPayment
    };
  }, [selectedSubscriber, payments]);

  // Top plans collected via cash
  const cashByPlan = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    cashPayments.forEach(p => {
      const c = customers.find(cust => cust.id === p.customerId);
      const plan = c?.planName || 'Fiber Standard';
      if (!map[plan]) {
        map[plan] = { count: 0, amount: 0 };
      }
      map[plan].count += 1;
      map[plan].amount += p.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [cashPayments, customers]);

  const handleCopyText = async (payment: PaymentRecord) => {
    const customer = customers.find(c => c.id === payment.customerId) || {
      id: payment.customerId,
      subscriberId: payment.subscriberId,
      activationNumber: 'ACT-00000-FTTH',
      name: payment.customerName,
      phone: payment.customerPhone,
      address: '',
      area: '',
      planName: 'Broadband Plan',
      speedMbps: 100,
      monthlyFee: payment.amount,
      billingDay: 1,
      expiryDate: payment.validTo,
      status: 'active' as const,
      balance: 0,
      connectionType: 'FTTH' as const,
      createdAt: ''
    };
    const msg = generateReceiptMessage(payment, customer, settings);
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedId(payment.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Receipt No',
      'Date Time',
      'Subscriber ID',
      'Activation No',
      'Customer Name',
      'Phone',
      'Payment Mode',
      'Amount',
      'Valid From',
      'Valid To',
      'Collected By',
      'WhatsApp Status'
    ];
    const rows = filteredPayments.map(p => {
      const cust = customers.find(c => c.id === p.customerId);
      return [
        p.receiptNo,
        `"${new Date(p.date).toLocaleString()}"`,
        p.subscriberId,
        cust?.activationNumber || '',
        `"${p.customerName.replace(/"/g, '""')}"`,
        p.customerPhone,
        p.method,
        p.amount,
        p.validFrom,
        p.validTo,
        `"${p.collectedBy.replace(/"/g, '""')}"`,
        p.whatsappSent ? 'Dispatched' : 'Pending'
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VinsNetBill-Receipt-History-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Modern Top Header Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-slate-800/90 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
              <ReceiptText className="w-3.5 h-3.5 text-purple-400" />
              Receipt Ledger & Audit
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {payments.length} Receipts Generated
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Receipt History & Cash Collections</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Audit itemized cash & digital receipts, filter by subscriber, and print 80mm thermal slips.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => openCashierStatement()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Open Cashier Custom Date Statement"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Cashier Statement</span>
          </button>

          {selectedSubscriber && selectedSubCashStats?.latestPayment && (
            <button
              onClick={() => openThermalReceipt(selectedSubCashStats.latestPayment!, selectedSubscriber)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 stroke-[2.2]" />
              <span>Print 80mm Slip</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Modern Subscriber Selector Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Select Subscriber for Itemized Receipts & 80mm Printing:</span>
          </div>

          {selectedReceiptSubscriberId && (
            <button
              onClick={() => setSelectedReceiptSubscriberId(null)}
              className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold self-start sm:self-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Show All Subscribers</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <select
              value={selectedReceiptSubscriberId || ''}
              onChange={e => setSelectedReceiptSubscriberId(e.target.value ? e.target.value : null)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">All Subscribers (Showing all {payments.length} receipts)</option>
              {customers.map(c => {
                const subPayCount = payments.filter(p => p.customerId === c.id).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.subscriberId} (Act: {c.activationNumber || 'N/A'}) · {c.phone} · {c.area} [{subPayCount} receipts]
                  </option>
                );
              })}
            </select>
          </div>

          {/* Quick Shortcut Buttons for Recent Subscribers */}
          <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Quick:</span>
            {customers.slice(0, 4).map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedReceiptSubscriberId(c.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] transition-colors whitespace-nowrap cursor-pointer ${
                  selectedReceiptSubscriberId === c.id
                    ? 'bg-emerald-400 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800'
                }`}
              >
                {c.name.split(' ')[0]} ({c.subscriberId.split('-').pop()})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Subscriber Dossier Card (Displayed when a subscriber is selected) */}
      {selectedSubscriber && selectedSubCashStats && (
        <div className="bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center font-black text-base shadow-md shrink-0">
                {selectedSubscriber.name.charAt(0)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-white">{selectedSubscriber.name}</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    selectedSubscriber.status === 'active' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : selectedSubscriber.status === 'due_today'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {selectedSubscriber.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1 font-mono">
                  <span>ID: <strong className="text-white">{selectedSubscriber.subscriberId}</strong></span>
                  <span>·</span>
                  <span className="text-emerald-400">
                    ONT: {selectedSubscriber.activationNumber || 'N/A'}
                  </span>
                  <span>·</span>
                  <span className="text-slate-300">📞 +91 {selectedSubscriber.phone}</span>
                </div>
              </div>
            </div>

            {/* Subscriber Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedSubCashStats.latestPayment && (
                <>
                  <button
                    onClick={() => openThermalReceipt(selectedSubCashStats.latestPayment!, selectedSubscriber)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                    title="Preview full 80mm thermal receipt before printing"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>80mm Preview</span>
                  </button>

                  <button
                    onClick={() => triggerPrintReceipt(selectedSubCashStats.latestPayment!, selectedSubscriber)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 rounded-xl text-xs font-bold shadow-md hover:brightness-110 transition-all cursor-pointer"
                    title="Send straight to thermal printer"
                  >
                    <Printer className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>Print 80mm</span>
                  </button>
                </>
              )}

              <button
                onClick={() => openReceiveCash(selectedSubscriber.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Receive Cash</span>
              </button>
            </div>
          </div>

          {/* Subscriber Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[11px] block">Plan & Speed</span>
              <span className="font-bold text-white mt-0.5 block truncate">
                {selectedSubscriber.planName}
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">
                {selectedSubscriber.speedMbps} Mbps FTTH
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[11px] block">Total Cash Collected</span>
              <span className="text-sm font-black text-amber-300 mt-0.5 block font-mono tabular-nums">
                {settings.currencySymbol}{selectedSubCashStats.totalCash.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400">
                {selectedSubCashStats.cashCount} cash payments
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[11px] block">Validity Expiry</span>
              <span className="font-bold text-white mt-0.5 block font-mono tabular-nums">
                {selectedSubscriber.expiryDate}
              </span>
              <span className="text-[11px] text-slate-400">
                Fee: {settings.currencySymbol}{selectedSubscriber.monthlyFee}
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[11px] block">Latest Receipt</span>
              {selectedSubCashStats.latestPayment ? (
                <>
                  <span className="font-mono font-bold text-emerald-400 mt-0.5 block truncate">
                    {selectedSubCashStats.latestPayment.receiptNo}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(selectedSubCashStats.latestPayment.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </>
              ) : (
                <span className="text-slate-500 mt-0.5 block">No receipts yet</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Itemized Cash Collections Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Total Cash Volume</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-300 font-mono tabular-nums">
            {settings.currencySymbol}{totalCashCollected.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span className="font-semibold text-emerald-400">{cashPayments.length} receipts</span>
            <span>·</span>
            <span>{cashSharePercent}% of total</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Average Cash Receipt</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-sky-300 font-mono tabular-nums">
            {settings.currencySymbol}{avgCashPayment.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-400 truncate">
            Cashier: <span className="font-semibold text-slate-200">{settings.activeCashier}</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Top Plan by Volume</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-white truncate">
            {cashByPlan[0]?.[0] || 'Broadband Plans'}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
            {cashByPlan[0] ? `${settings.currencySymbol}${cashByPlan[0][1].amount.toLocaleString()} (${cashByPlan[0][1].count} receipts)` : 'No collections'}
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Thermal Printer</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>80mm POS Ready</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Thermal ESC/POS Slip Formatted
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by receipt #, customer name, phone, activation #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto text-xs">
          {/* Mode Filter Pills */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMethodFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                methodFilter === 'all' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({payments.length})
            </button>
            <button
              onClick={() => setMethodFilter('Cash')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                methodFilter === 'Cash' ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Cash ({cashPayments.length})</span>
            </button>
            <button
              onClick={() => setMethodFilter('UPI')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                methodFilter === 'UPI' ? 'bg-sky-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-sky-400'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>UPI</span>
            </button>
          </div>

          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="month">This Month</option>
              <option value="last30">Last 30 Days</option>
            </select>
          </div>

          {(searchQuery || methodFilter !== 'all' || dateFilter !== 'all' || selectedReceiptSubscriberId) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setMethodFilter('all');
                setDateFilter('all');
                setSelectedReceiptSubscriberId(null);
              }}
              className="text-slate-400 hover:text-rose-400 p-2 rounded-lg cursor-pointer"
              title="Clear all filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Receipts Table with Itemized Cash Information */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">{filteredPayments.length} Receipts Listed</span>
            {selectedSubscriber && (
              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                Subscriber: {selectedSubscriber.name}
              </span>
            )}
            {methodFilter === 'Cash' && (
              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
                <Banknote className="w-3 h-3" /> Cash Only
              </span>
            )}
          </div>
          <span className="hidden sm:inline text-slate-500">Click receipt to view itemized breakdown or print 80mm thermal slip</span>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm font-semibold text-slate-300">No matching receipts found</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Receipt #</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Subscriber & ONT</th>
                  <th className="py-3.5 px-4">Mode</th>
                  <th className="py-3.5 px-4">Service Period</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Collector</th>
                  <th className="py-3.5 px-4 text-center">WhatsApp</th>
                  <th className="py-3.5 px-4 text-right">80mm Print & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.map(payment => {
                  const customer: Customer = customers.find(c => c.id === payment.customerId) || {
                    id: payment.customerId,
                    subscriberId: payment.subscriberId,
                    activationNumber: 'ACT-00000-FTTH',
                    name: payment.customerName,
                    phone: payment.customerPhone,
                    address: '',
                    area: '',
                    planName: 'Broadband Plan',
                    speedMbps: 100,
                    monthlyFee: payment.amount,
                    billingDay: 1,
                    expiryDate: payment.validTo,
                    status: 'active' as const,
                    balance: 0,
                    connectionType: 'FTTH' as const,
                    createdAt: ''
                  };
                  const isCopied = copiedId === payment.id;
                  const isExpanded = expandedPaymentId === payment.id;
                  const isCurrentSubscriber = selectedReceiptSubscriberId === customer.id;

                  return (
                    <React.Fragment key={payment.id}>
                      <tr 
                        className={`hover:bg-slate-850/60 transition-colors group ${
                          isExpanded ? 'bg-slate-850/80' : ''
                        } ${isCurrentSubscriber ? 'bg-emerald-950/20' : ''}`}
                      >
                        {/* Receipt No */}
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <button
                            onClick={() => openThermalReceipt(payment, customer)}
                            className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1.5 text-left cursor-pointer"
                            title="Click to view 80mm Thermal Receipt Slip"
                          >
                            <span>{payment.receiptNo}</span>
                          </button>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-4 text-slate-300 tabular-nums font-mono text-[11px]">
                          <div>{new Date(payment.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          <div className="text-[10px] text-slate-500">{new Date(payment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>

                        {/* Subscriber & Activation */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white group-hover:text-emerald-300 transition-colors">{payment.customerName}</span>
                            <button
                              onClick={() => setSelectedReceiptSubscriberId(customer.id)}
                              className="text-[10px] text-slate-500 hover:text-emerald-400 hover:underline cursor-pointer"
                              title="Filter to this subscriber"
                            >
                              [Filter]
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            <span className="text-emerald-400">{payment.subscriberId}</span>
                            <span className="mx-1 text-slate-600">·</span>
                            <span>{customer.activationNumber || 'N/A'}</span>
                          </div>
                        </td>

                        {/* Payment Mode */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full text-xs ${
                            payment.method === 'Cash' 
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800' 
                              : 'bg-sky-950/70 text-sky-300 border border-sky-800'
                          }`}>
                            {payment.method === 'Cash' ? <Banknote className="w-3.5 h-3.5 text-emerald-400" /> : <QrCode className="w-3.5 h-3.5 text-sky-400" />}
                            <span>{payment.method}</span>
                          </span>
                        </td>

                        {/* Itemized Service Period */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-200 truncate max-w-[170px]">
                            {customer.planName} ({customer.speedMbps} Mbps)
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                            {payment.validFrom} → {payment.validTo}
                          </div>
                        </td>

                        {/* Amount Received */}
                        <td className="py-3.5 px-4 text-right font-black text-amber-300 font-mono tabular-nums text-sm">
                          {settings.currencySymbol}{payment.amount.toLocaleString()}
                        </td>

                        {/* Collector */}
                        <td className="py-3.5 px-4 text-slate-300 truncate max-w-[120px]">
                          {payment.collectedBy}
                        </td>

                        {/* WhatsApp Status */}
                        <td className="py-3.5 px-4 text-center">
                          {payment.whatsappSent ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-800 font-semibold">
                              <Check className="w-3 h-3 text-emerald-400" /> Sent
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Thermal 80mm Print */}
                            <button
                              onClick={() => triggerPrintReceipt(payment, customer)}
                              title="Print 80mm Thermal Receipt Slip"
                              className="p-1.5 text-slate-300 hover:text-slate-950 hover:bg-emerald-400 rounded-xl transition-colors border border-slate-700 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* 80mm Preview Modal */}
                            <button
                              onClick={() => openThermalReceipt(payment, customer)}
                              title="Preview 80mm Thermal Receipt"
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-slate-800 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-sky-400" />
                            </button>

                            {/* WhatsApp Dispatch Modal */}
                            <button
                              onClick={() => openReceiptModal(payment, customer)}
                              title="Send WhatsApp Receipt"
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded-xl transition-colors border border-emerald-900/40 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>

                            {/* Copy Receipt Text */}
                            <button
                              onClick={() => handleCopyText(payment)}
                              title="Copy receipt message"
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-slate-800 cursor-pointer"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {/* Expand Itemized Breakdown */}
                            <button
                              onClick={() => setExpandedPaymentId(isExpanded ? null : payment.id)}
                              title="Toggle itemized bill breakdown"
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Itemized Cash Breakdown Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-slate-800">
                          <td colSpan={9} className="p-4 pl-12">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-xs">Itemized Cash Collection Breakdown</span>
                                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800 font-bold">
                                    {payment.receiptNo}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <button
                                    onClick={() => triggerPrintReceipt(payment, customer)}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg hover:bg-emerald-500/30 font-semibold cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print Thermal Slip (80mm)</span>
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                {/* Bill Line Items */}
                                <div className="space-y-2 md:col-span-2">
                                  <div className="flex justify-between font-semibold text-slate-400 border-b border-slate-800 pb-1">
                                    <span>Description / Line Item</span>
                                    <span>Amount</span>
                                  </div>
                                  <div className="flex justify-between text-slate-200">
                                    <span>1. Broadband Internet ({customer.planName} - {customer.speedMbps} Mbps)</span>
                                    <span className="font-mono font-bold text-white">{settings.currencySymbol}{payment.amount.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-400 text-[11px] pl-3 font-mono">
                                    <span>Service Duration: {payment.validFrom} to {payment.validTo}</span>
                                    <span>1 Month</span>
                                  </div>
                                  <div className="flex justify-between text-slate-400 text-[11px] pl-3">
                                    <span>Taxes (GST/Composite Scheme)</span>
                                    <span className="font-mono">₹0.00 (Included)</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-white border-t border-slate-800 pt-2 text-sm">
                                    <span>Total Cash Received:</span>
                                    <span className="text-amber-300 font-mono tabular-nums">{settings.currencySymbol}{payment.amount.toLocaleString()}</span>
                                  </div>
                                </div>

                                {/* Terminal Dossier */}
                                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                                  <div className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Terminal Data</div>
                                  <div className="text-slate-300">Subscriber: <strong className="text-white">{customer.name}</strong></div>
                                  <div className="text-slate-300">ID: <span className="font-mono text-emerald-400">{customer.subscriberId}</span></div>
                                  <div className="text-slate-300">Activation No: <span className="font-mono font-bold text-slate-200">{customer.activationNumber || 'N/A'}</span></div>
                                  <div className="text-slate-300">Collector: <span className="text-slate-200">{payment.collectedBy}</span></div>
                                  <div className="text-slate-300">Payment Mode: <strong className="text-emerald-400 uppercase font-mono">{payment.method}</strong></div>
                                  {payment.notes && <div className="italic text-slate-400 mt-1">Note: {payment.notes}</div>}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
