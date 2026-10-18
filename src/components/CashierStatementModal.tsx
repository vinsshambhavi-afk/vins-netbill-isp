import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Banknote, 
  QrCode, 
  Users, 
  Search, 
  Download, 
  Printer, 
  Send, 
  MessageSquare, 
  ChevronDown, 
  Check, 
  X, 
  FileText, 
  TrendingUp, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  Sparkles, 
  DollarSign, 
  ArrowRight
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { PaymentRecord, OperatorUser } from '../types/isp';
import { createCashierStatementWhatsAppUrl } from '../utils/whatsapp';

interface CashierStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOperatorId?: string | null;
}

type DatePreset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'custom' | 'all';

export const CashierStatementModal: React.FC<CashierStatementModalProps> = ({
  isOpen,
  onClose,
  initialOperatorId
}) => {
  const { 
    operators, 
    payments, 
    customers, 
    currentUser, 
    isAdmin, 
    settings,
    openReceiptModal,
    openThermalReceipt
  } = useISP();

  // If cashier is logged in (not admin), lock to their profile
  const defaultOperatorId = initialOperatorId || (currentUser?.role !== 'admin' ? (currentUser?.id || 'rajesh-admin') : (operators[0]?.id || 'rajesh-admin'));
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(defaultOperatorId);

  // Sync if initialOperatorId changes
  React.useEffect(() => {
    if (initialOperatorId) {
      setSelectedOperatorId(initialOperatorId);
    } else if (currentUser && currentUser.role !== 'admin') {
      setSelectedOperatorId(currentUser.id);
    }
  }, [initialOperatorId, currentUser]);

  // Date filters
  const [preset, setPreset] = useState<DatePreset>('today');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'All' | 'Cash' | 'UPI'>('All');
  const [activeTab, setActiveTab] = useState<'itemized' | 'daily'>('itemized');

  // Selected operator object
  const selectedOperator = useMemo(() => {
    return operators.find(op => op.id === selectedOperatorId) || operators[0] || null;
  }, [operators, selectedOperatorId]);

  // Quick preset dates helper
  const applyPreset = (newPreset: DatePreset) => {
    setPreset(newPreset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (newPreset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (newPreset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (newPreset === 'last7') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      setStartDate(d7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (newPreset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(todayStr);
    } else if (newPreset === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (newPreset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(todayStr);
    }
  };

  // Filter payments for this cashier + date range
  const filteredPayments = useMemo(() => {
    if (!selectedOperator) return [];

    const opName = selectedOperator.name.toLowerCase();

    return payments.filter(p => {
      // 1. Cashier match
      const pCollected = (p.collectedBy || '').toLowerCase();
      const isMatch = pCollected.includes(opName) || opName.includes(pCollected);
      if (!isMatch) return false;

      // 2. Date match
      const pDate = p.date.substring(0, 10);
      if (startDate && pDate < startDate) return false;
      if (endDate && pDate > endDate) return false;

      // 3. Method match
      if (methodFilter !== 'All' && p.method !== methodFilter) return false;

      // 4. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.receiptNo.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          p.subscriberId.toLowerCase().includes(q) ||
          p.customerPhone.includes(q)
        );
      }

      return true;
    });
  }, [payments, selectedOperator, startDate, endDate, methodFilter, searchQuery]);

  // Aggregate Metrics
  const cashierTotal = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  const cashTotal = useMemo(() => {
    return filteredPayments.filter(p => p.method === 'Cash').reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  const upiTotal = useMemo(() => {
    return filteredPayments.filter(p => p.method === 'UPI').reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  const otherTotal = cashierTotal - cashTotal - upiTotal;

  // Daily Summary Breakdown Map
  const dailySummaries = useMemo(() => {
    const map = new Map<string, { date: string; cash: number; upi: number; other: number; total: number; count: number }>();

    filteredPayments.forEach(p => {
      const d = p.date.substring(0, 10);
      const curr = map.get(d) || { date: d, cash: 0, upi: 0, other: 0, total: 0, count: 0 };
      if (p.method === 'Cash') curr.cash += p.amount;
      else if (p.method === 'UPI') curr.upi += p.amount;
      else curr.other += p.amount;
      curr.total += p.amount;
      curr.count += 1;
      map.set(d, curr);
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredPayments]);

  if (!isOpen) return null;

  const targetAmount = selectedOperator?.dailyTarget || 0;
  const targetPct = targetAmount > 0 ? Math.min(100, Math.round((cashierTotal / targetAmount) * 100)) : 0;

  const periodText = startDate === endDate 
    ? startDate 
    : `${startDate} to ${endDate}`;

  const handleShareWhatsApp = () => {
    if (!selectedOperator) return;
    const url = createCashierStatementWhatsAppUrl(
      selectedOperator.phone,
      {
        cashierName: selectedOperator.name,
        cashierPhone: selectedOperator.phone,
        ispName: settings.ispName,
        periodText,
        totalAmount: cashierTotal,
        cashAmount: cashTotal,
        upiAmount: upiTotal,
        otherAmount: cashierTotal - cashTotal - upiTotal,
        receiptCount: filteredPayments.length,
        cashReceiptCount: filteredPayments.filter(p => p.method === 'Cash').length,
        currencySymbol: settings.currencySymbol
      }
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleExportCSV = () => {
    const headers = ['Receipt No', 'Date Time', 'Customer', 'Subscriber ID', 'Phone', 'Amount', 'Payment Mode', 'Validity Till', 'Cashier'];
    const rows = filteredPayments.map(p => [
      p.receiptNo,
      `"${new Date(p.date).toLocaleString()}"`,
      `"${p.customerName.replace(/"/g, '""')}"`,
      p.subscriberId,
      p.customerPhone,
      p.amount,
      p.method,
      p.validTo,
      `"${p.collectedBy}"`
    ]);

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `Statement_${(selectedOperator?.name || 'cashier').replace(/\s+/g, '_')}_${startDate}_to_${endDate}.csv`;
    link.click();
  };

  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans">
      <div 
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-800 overflow-hidden my-4 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-slate-950 text-white p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden ring-1 ring-emerald-500/30 bg-slate-900 shrink-0 flex items-center justify-center">
              <img 
                src="/vinsnetbill_logo.jpg" 
                alt="VinsNetBill Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                  Cash Collection Statement
                </span>
                <span className="text-xs text-slate-400 font-mono">Custom Date Range</span>
              </div>
              <h2 className="text-xl font-black text-white mt-0.5">
                {selectedOperator?.name || 'Cashier'} Collection Summary
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 text-xs font-bold rounded-xl shadow-md hover:brightness-110 transition-all cursor-pointer"
              title="Send formatted statement via WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Print Handover Report */}
            <button
              type="button"
              onClick={handlePrintStatement}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Print formal handover document"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Slip</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Export statement to CSV spreadsheet"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 shrink-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
            {/* 1. Cashier Selector */}
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Cashier / Collector
              </label>
              {isAdmin ? (
                <div className="relative">
                  <select
                    value={selectedOperatorId}
                    onChange={e => setSelectedOperatorId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-white focus:outline-none focus:border-emerald-500 appearance-none shadow-sm pr-8 cursor-pointer"
                  >
                    {operators.map(op => (
                      <option key={op.id} value={op.id}>
                        {op.name} ({op.role === 'admin' ? 'Admin' : 'Cash Collector'}) {op.assignedArea ? `· ${op.assignedArea}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 flex items-center justify-between text-xs sm:text-sm font-bold text-white shadow-sm">
                  <span>{selectedOperator?.name}</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded font-mono border border-emerald-800">
                    My Statement
                  </span>
                </div>
              )}
            </div>

            {/* 2. Date Presets */}
            <div className="md:col-span-8 flex flex-col justify-end">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Date Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'last7', label: 'Last 7 Days' },
                    { id: 'thisMonth', label: 'This Month' },
                    { id: 'lastMonth', label: 'Last Month' },
                    { id: 'all', label: 'All Time' },
                    { id: 'custom', label: 'Custom' }
                  ] as const
                ).map(btn => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => applyPreset(btn.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      preset === btn.id
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Date Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-800/80 items-center">
            <div className="sm:col-span-6 flex items-center gap-2">
              <div className="flex-1">
                <span className="text-[11px] text-slate-400 block mb-1">From Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setPreset('custom');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-medium text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="pt-4 text-slate-500">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <span className="text-[11px] text-slate-400 block mb-1">To Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setPreset('custom');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-medium text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="sm:col-span-6 flex items-center justify-between gap-3 pt-3 sm:pt-0">
              <div className="text-xs text-slate-400 font-mono">
                Period: <strong className="text-white font-bold">{periodText}</strong>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Total Receipts: <strong className="text-emerald-400 font-bold">{filteredPayments.length}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Key Metrics KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Collected */}
            <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>Total Collected</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-300 font-mono tabular-nums">
                {settings.currencySymbol}{cashierTotal.toLocaleString()}
              </div>
              <div className="mt-1 text-[11px] text-emerald-400 font-medium font-mono">
                {dailySummaries.reduce((a, b) => a + b.count, 0)} bills generated
              </div>
            </div>

            {/* Cash in Hand */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Physical Cash</span>
                <Banknote className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-400 font-mono tabular-nums">
                {settings.currencySymbol}{cashTotal.toLocaleString()}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                In physical drawer
              </div>
            </div>

            {/* UPI Digital Collected */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>UPI / QR Digital</span>
                <QrCode className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-sky-300 font-mono tabular-nums">
                {settings.currencySymbol}{upiTotal.toLocaleString()}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Direct to bank UPI
              </div>
            </div>

            {/* Performance Target / Average Ticket */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Collection Target</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black text-white font-mono tabular-nums">
                {targetAmount > 0 ? `${targetPct}%` : 'N/A'}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-mono">
                {targetAmount > 0 
                  ? `Goal: ${settings.currencySymbol}${targetAmount.toLocaleString()}` 
                  : `Avg: ${settings.currencySymbol}${filteredPayments.length > 0 ? Math.round(cashierTotal / filteredPayments.length) : 0}/bill`}
              </div>
            </div>
          </div>

          {/* Sub Navigation: Itemized Receipts vs Daily Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('itemized')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'itemized'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 hover:bg-slate-850 text-slate-400 border border-slate-800'
                }`}
              >
                Itemized Receipts ({filteredPayments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('daily')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'daily'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 hover:bg-slate-850 text-slate-400 border border-slate-800'
                }`}
              >
                Daily Summary Breakdown ({dailySummaries.length} days)
              </button>
            </div>

            {/* Search and Method Filters */}
            {activeTab === 'itemized' && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search receipt #, subscriber..."
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48 sm:w-64"
                  />
                </div>

                <select
                  value={methodFilter}
                  onChange={e => setMethodFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-200 cursor-pointer"
                >
                  <option value="All">All Modes</option>
                  <option value="Cash">Cash Only</option>
                  <option value="UPI">UPI Only</option>
                </select>
              </div>
            )}
          </div>

          {/* TAB 1: Itemized Table */}
          {activeTab === 'itemized' && (
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/80 shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3.5">Date & Time</th>
                      <th className="py-3 px-3.5">Receipt #</th>
                      <th className="py-3 px-3.5">Subscriber Name & ID</th>
                      <th className="py-3 px-3.5">Plan / Validity</th>
                      <th className="py-3 px-3.5">Mode</th>
                      <th className="py-3 px-3.5 text-right">Amount</th>
                      <th className="py-3 px-3.5 text-center">Receipt Slips</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                          <p className="font-bold text-slate-300">No collections found for this date range</p>
                          <p className="text-xs text-slate-500 mt-1">Try selecting "This Month" or "All Time" to view past collections.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map(p => {
                        const cust = customers.find(c => c.id === p.customerId);
                        const dateObj = new Date(p.date);
                        return (
                          <tr key={p.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px]">
                              <div className="font-semibold text-white">
                                {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="py-3 px-3.5 font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {p.receiptNo}
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="font-bold text-white truncate max-w-[160px]">
                                {cust?.name || 'Customer'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {cust?.subscriberId} · {cust?.phone}
                              </div>
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="text-slate-200 truncate max-w-[140px] font-medium">
                                {cust?.planName || 'Broadband'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {cust?.speedMbps ? `${cust.speedMbps} Mbps · ` : ''}{cust?.monthlyFee ? `${settings.currencySymbol}${cust.monthlyFee}/mo` : 'Active'}
                              </div>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              {p.method === 'Cash' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  <Banknote className="w-3 h-3 text-emerald-400" /> Cash
                                </span>
                              ) : p.method === 'UPI' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
                                  <QrCode className="w-3 h-3 text-sky-400" /> UPI
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                                  Bank
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-right font-black text-amber-300 font-mono tabular-nums text-sm">
                              {settings.currencySymbol}{p.amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => cust && openReceiptModal(p, cust)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                                  title="View Receipt Details"
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cust && openThermalReceipt(p, cust)}
                                  className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 rounded-lg text-[11px] font-bold border border-emerald-800 transition-colors cursor-pointer"
                                  title="Print 80mm Thermal Slip"
                                >
                                  Thermal
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Daily Breakdown Summary */}
          {activeTab === 'daily' && (
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/80 shadow-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Receipts Count</th>
                    <th className="py-3 px-4 text-right">Physical Cash</th>
                    <th className="py-3 px-4 text-right">UPI Digital</th>
                    <th className="py-3 px-4 text-right">Other</th>
                    <th className="py-3 px-4 text-right font-bold text-white">Day Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {dailySummaries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No daily records in this date range.
                      </td>
                    </tr>
                  ) : (
                    dailySummaries.map(d => (
                      <tr key={d.date} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          {new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">
                            {d.count} bills
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                          {settings.currencySymbol}{d.cash.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-sky-400">
                          {settings.currencySymbol}{d.upi.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          {settings.currencySymbol}{d.other.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-amber-300 text-sm">
                          {settings.currencySymbol}{d.total.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 border-t-2 border-slate-700 font-bold text-white font-mono">
                    <td className="py-3.5 px-4 font-bold">Period Total</td>
                    <td className="py-3.5 px-4 text-center">
                      {dailySummaries.reduce((a, b) => a + b.count, 0)} bills
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">
                      {settings.currencySymbol}{cashTotal.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-sky-400 font-bold">
                      {settings.currencySymbol}{upiTotal.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400">
                      {settings.currencySymbol}{otherTotal.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-amber-300 text-base">
                      {settings.currencySymbol}{cashierTotal.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{selectedOperator?.name}</span>
            <span>·</span>
            <span>Mobile: <strong className="text-slate-300 font-mono">+91 {selectedOperator?.phone}</strong></span>
            {selectedOperator?.assignedArea && (
              <>
                <span>·</span>
                <span>Area: <strong className="text-slate-300">{selectedOperator.assignedArea}</strong></span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-4 py-2 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 rounded-xl font-bold flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer shadow-md"
            >
              <Send className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Share via WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Printable Cashier Handover Statement (Formatted for Print) */}
      <div id="printable-statement" className="hidden print:block font-sans text-black p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider">{settings.ispName || 'VinsNetBill Broadband'}</h1>
            <p className="text-xs text-slate-700">{settings.tagline}</p>
            <p className="text-xs text-slate-600">{settings.address}</p>
            <p className="text-xs font-semibold">Support: {settings.supportPhone || settings.phone}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold uppercase tracking-wide">CASHIER HANDOVER STATEMENT</div>
            <div className="text-xs text-slate-600">Generated: {new Date().toLocaleString()}</div>
            <div className="text-xs font-semibold text-slate-900 mt-1">Period: {periodText}</div>
          </div>
        </div>

        {/* Cashier Info Card */}
        <div className="bg-slate-100 p-3 rounded mb-4 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-500 block">Cashier Name:</span>
            <strong className="text-sm">{selectedOperator?.name}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Mobile Number:</span>
            <strong>+91 {selectedOperator?.phone}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Area / Agency:</span>
            <strong>{selectedOperator?.assignedArea || selectedOperator?.agency || 'All Zones'}</strong>
          </div>
        </div>

        {/* Collection Totals Summary */}
        <div className="grid grid-cols-4 gap-2 mb-4 text-center">
          <div className="border border-slate-300 p-2 rounded">
            <div className="text-[10px] uppercase text-slate-500">Total Collected</div>
            <div className="text-lg font-black">{settings.currencySymbol}{cashierTotal.toLocaleString()}</div>
          </div>
          <div className="border border-slate-300 p-2 rounded">
            <div className="text-[10px] uppercase text-slate-500">Physical Cash</div>
            <div className="text-lg font-bold">{settings.currencySymbol}{cashTotal.toLocaleString()}</div>
          </div>
          <div className="border border-slate-300 p-2 rounded">
            <div className="text-[10px] uppercase text-slate-500">UPI Digital</div>
            <div className="text-lg font-bold">{settings.currencySymbol}{upiTotal.toLocaleString()}</div>
          </div>
          <div className="border border-slate-300 p-2 rounded">
            <div className="text-[10px] uppercase text-slate-500">Total Bills</div>
            <div className="text-lg font-bold">{filteredPayments.length}</div>
          </div>
        </div>

        {/* Daily Breakdown for Handover */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-1">Daily Reconciliation</h3>
          <table className="w-full text-left text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-200">
                <th className="p-1.5 border">Date</th>
                <th className="p-1.5 border text-center">Bills</th>
                <th className="p-1.5 border text-right">Cash Amount</th>
                <th className="p-1.5 border text-right">UPI Amount</th>
                <th className="p-1.5 border text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {dailySummaries.map(d => (
                <tr key={d.date}>
                  <td className="p-1.5 border">{d.date}</td>
                  <td className="p-1.5 border text-center">{d.count}</td>
                  <td className="p-1.5 border text-right">{settings.currencySymbol}{d.cash.toLocaleString()}</td>
                  <td className="p-1.5 border text-right">{settings.currencySymbol}{d.upi.toLocaleString()}</td>
                  <td className="p-1.5 border text-right font-bold">{settings.currencySymbol}{d.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Handover Sign-off */}
        <div className="grid grid-cols-2 gap-12 pt-12 text-xs border-t border-slate-400 mt-8">
          <div>
            <div className="border-b border-black w-48 mb-1"></div>
            <p className="font-semibold">Cashier Signature</p>
            <p className="text-[10px] text-slate-500">{selectedOperator?.name} (+91 {selectedOperator?.phone})</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="border-b border-black w-48 mb-1"></div>
            <p className="font-semibold">Authorized Admin / Receiver Signature</p>
            <p className="text-[10px] text-slate-500">Verified & Reconciled</p>
          </div>
        </div>
      </div>
    </div>
  );
};
