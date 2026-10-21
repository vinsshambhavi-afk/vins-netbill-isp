import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Banknote, 
  QrCode, 
  Users, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  HandCoins, 
  BellRing, 
  Filter, 
  Layers, 
  BarChart3,
  CheckCircle2,
  Clock,
  Wifi,
  Download,
  Flame,
  Cloud,
  ShieldCheck,
  Printer,
  Sparkles,
  Activity,
  ArrowRight
} from 'lucide-react';
import { useISP } from '../context/ISPContext';

interface MonthData {
  monthKey: string;     // e.g. "2026-05"
  monthLabel: string;   // e.g. "May 2026"
  shortLabel: string;   // e.g. "May '26"
  cash: number;
  digital: number;
  total: number;
  receiptCount: number;
}

export const DashboardView: React.FC = () => {
  const { 
    payments, 
    customers, 
    settings, 
    openReceiveCash,
    openCloudModal,
    openCashierStatement,
    openThermalReceipt
  } = useISP();

  const [timeRange, setTimeRange] = useState<'6m' | '12m' | 'all'>('6m');
  const [chartMode, setChartMode] = useState<'stacked' | 'grouped'>('stacked');

  // Compute Monthly Trends from payments ledger
  const monthlyData: MonthData[] = useMemo(() => {
    const map = new Map<string, { cash: number; digital: number; count: number }>();

    payments.forEach(payment => {
      if (!payment.date) return;
      const d = new Date(payment.date);
      if (isNaN(d.getTime())) return;

      const yearMonth = payment.date.substring(0, 7); // "YYYY-MM"
      const current = map.get(yearMonth) || { cash: 0, digital: 0, count: 0 };

      if (payment.method === 'Cash') {
        current.cash += payment.amount;
      } else {
        current.digital += payment.amount;
      }
      current.count += 1;
      map.set(yearMonth, current);
    });

    const sortedKeys = Array.from(map.keys()).sort();

    const formatted: MonthData[] = sortedKeys.map(key => {
      const [year, month] = key.split('-');
      const dateObj = new Date(Number(year), Number(month) - 1, 1);
      const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const shortLabel = dateObj.toLocaleDateString('en-US', { month: 'short' });
      const stats = map.get(key)!;

      return {
        monthKey: key,
        monthLabel,
        shortLabel: `${shortLabel} '${year.slice(-2)}`,
        cash: stats.cash,
        digital: stats.digital,
        total: stats.cash + stats.digital,
        receiptCount: stats.count
      };
    });

    if (timeRange === '6m') {
      return formatted.slice(-6);
    } else if (timeRange === '12m') {
      return formatted.slice(-12);
    }
    return formatted;
  }, [payments, timeRange]);

  // Current and Previous Month Calculations for MoM Trends
  const currentDate = new Date();
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthStats = useMemo(() => {
    let cash = 0;
    let digital = 0;
    let count = 0;

    payments.forEach(p => {
      if (p.date && p.date.startsWith(currentMonthKey)) {
        if (p.method === 'Cash') {
          cash += p.amount;
        } else {
          digital += p.amount;
        }
        count += 1;
      }
    });

    return { cash, digital, total: cash + digital, count };
  }, [payments, currentMonthKey]);

  const prevMonthStats = useMemo(() => {
    let total = 0;
    payments.forEach(p => {
      if (p.date && p.date.startsWith(prevMonthKey)) {
        total += p.amount;
      }
    });
    return total;
  }, [payments, prevMonthKey]);

  const currentMonthTotal = currentMonthStats.total;
  const currentMonthCash = currentMonthStats.cash;
  const currentMonthDigital = currentMonthStats.digital;
  const prevMonthTotal = prevMonthStats;

  const momGrowth = prevMonthTotal > 0 
    ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 
    : 0;

  // Pending Renewals & Subscribers Dues
  const { pendingRenewalsTotal, dueCustomersCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    customers.forEach(c => {
      if (c.status === 'due_soon' || c.status === 'due_today' || c.status === 'overdue') {
        total += c.monthlyFee;
        count += 1;
      }
    });
    return { pendingRenewalsTotal: total, dueCustomersCount: count };
  }, [customers]);

  // Collections by Area
  const areaCollections = useMemo(() => {
    const areaMap = new Map<string, { total: number; cash: number; digital: number; count: number }>();
    
    payments.forEach(p => {
      const cust = customers.find(c => c.id === p.customerId);
      const area = cust?.area || 'Sector General';
      const cur = areaMap.get(area) || { total: 0, cash: 0, digital: 0, count: 0 };
      
      cur.total += p.amount;
      if (p.method === 'Cash') cur.cash += p.amount;
      else cur.digital += p.amount;
      cur.count += 1;
      areaMap.set(area, cur);
    });

    return Array.from(areaMap.entries())
      .map(([area, stats]) => ({ area, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [payments, customers]);

  // Broadband Plan Breakdown
  const planDistribution = useMemo(() => {
    const planMap = new Map<string, number>();
    customers.forEach(c => {
      const plan = c.planName || 'Standard 100M';
      planMap.set(plan, (planMap.get(plan) || 0) + 1);
    });
    return Array.from(planMap.entries())
      .map(([plan, count]) => ({ plan, count }))
      .sort((a, b) => b.count - a.count);
  }, [customers]);

  // Recent Transactions for feed
  const recentPayments = useMemo(() => {
    return payments.slice(0, 5);
  }, [payments]);

  // Export CSV Summary
  const handleExportSummary = () => {
    const headers = ['Month', 'Cash Collections', 'Digital / UPI', 'Total Volume', 'Receipts Count'];
    const rows = monthlyData.map(m => [
      m.monthLabel,
      m.cash,
      m.digital,
      m.total,
      m.receiptCount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VinsNetBill-Revenue-Trends-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Modern Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload as MonthData;
      const cashVal = dataItem.cash || 0;
      const digitalVal = dataItem.digital || 0;
      const totalVal = dataItem.total || 0;
      const cashPercent = totalVal > 0 ? Math.round((cashVal / totalVal) * 100) : 0;
      const digitalPercent = totalVal > 0 ? Math.round((digitalVal / totalVal) * 100) : 0;

      return (
        <div className="bg-slate-950/95 backdrop-blur-md text-white rounded-xl p-3.5 text-xs shadow-2xl border border-slate-800 min-w-[210px] space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white text-sm">{dataItem.monthLabel}</span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              {dataItem.receiptCount} receipts
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500"></span>
                Cash Received:
              </span>
              <span className="font-mono font-bold tabular-nums">
                {settings.currencySymbol}{cashVal.toLocaleString()} ({cashPercent}%)
              </span>
            </div>

            <div className="flex items-center justify-between text-sky-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500 inline-block shadow-sm shadow-sky-500"></span>
                UPI / Digital:
              </span>
              <span className="font-mono font-bold tabular-nums">
                {settings.currencySymbol}{digitalVal.toLocaleString()} ({digitalPercent}%)
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-white text-sm">
            <span>Total Collections:</span>
            <span className="font-mono tabular-nums text-amber-300">
              {settings.currencySymbol}{totalVal.toLocaleString()}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const monthlyTarget = 150000;
  const targetAchievedPct = Math.min(100, Math.round((currentMonthTotal / monthlyTarget) * 100));

  return (
    <div className="space-y-6">
      {/* Modern Executive Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-slate-800/90 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                Firebase Cloud Store Connected
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                99.98% Network Live
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{settings.ispName} Executive Dashboard</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              High-throughput cash billing terminal, real-time DLT SMS verification, and automated subscriber lifecycle management.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportSummary}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => openCloudModal()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-300 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Cloud Store</span>
            </button>

            <button
              onClick={() => openReceiveCash()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 hover:brightness-110 active:brightness-95 rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <HandCoins className="w-4 h-4 stroke-[2.5]" />
              <span>Receive Cash</span>
            </button>
          </div>
        </div>

        {/* Target Progress Bar Strip */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Monthly Revenue Goal:</span>
            <strong className="text-white font-mono">{settings.currencySymbol}{monthlyTarget.toLocaleString()}</strong>
            <span className="text-emerald-400 font-bold font-mono">({targetAchievedPct}% Achieved)</span>
          </div>

          <div className="flex-1 max-w-md h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              style={{ width: `${targetAchievedPct}%` }}
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Strip (Modern Dark Glass Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monthly Collections */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Monthly Collections</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight font-mono tabular-nums">
            {settings.currencySymbol}{currentMonthTotal.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            {momGrowth >= 0 ? (
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold flex items-center border border-emerald-500/20">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{momGrowth.toFixed(1)}%
              </span>
            ) : (
              <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded font-bold flex items-center border border-rose-500/20">
                <ArrowDownRight className="w-3.5 h-3.5" />
                {momGrowth.toFixed(1)}%
              </span>
            )}
            <span className="text-slate-400">vs prev month ({settings.currencySymbol}{prevMonthTotal.toLocaleString()})</span>
          </div>
        </div>

        {/* Card 2: Cash in Hand */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Physical Cash in Hand</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-300 tracking-tight font-mono tabular-nums">
            {settings.currencySymbol}{currentMonthCash.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{currentMonthTotal > 0 ? Math.round((currentMonthCash / currentMonthTotal) * 100) : 0}% of collections</span>
            <span className="font-semibold text-emerald-400">Cash Register Ready</span>
          </div>
        </div>

        {/* Card 3: Pending Renewal Dues */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Pending Renewal Dues</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-400 tracking-tight font-mono tabular-nums">
            {settings.currencySymbol}{pendingRenewalsTotal.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{dueCustomersCount} subscribers due / overdue</span>
            <span className="text-rose-400 font-bold">Action Needed</span>
          </div>
        </div>

        {/* Card 4: Subscribers Base */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Subscribers Base</span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wifi className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight font-mono tabular-nums">
            {customers.length}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{customers.filter(c => c.status === 'active').length} active fiber lines</span>
            <span className="text-emerald-400 font-bold font-mono">100% FTTH</span>
          </div>
        </div>
      </div>

      {/* Main Monthly Collection Trends Chart Card */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        {/* Chart Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <span>Revenue Performance (Cash vs UPI Digital)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparative revenue volume segmented by physical field cash collection vs digital QR / UPI
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Chart Mode Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setChartMode('stacked')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  chartMode === 'stacked'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Stacked</span>
              </button>
              <button
                onClick={() => setChartMode('grouped')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  chartMode === 'grouped'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </button>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTimeRange('6m')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === '6m'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                6M
              </button>
              <button
                onClick={() => setTimeRange('12m')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === '12m'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                12M
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Legend Quick Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-1">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block shadow-xs"></span>
              <span className="font-semibold text-slate-200">Cash Received</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-sky-500 inline-block shadow-xs"></span>
              <span className="font-semibold text-slate-200">UPI / QR Payment</span>
            </div>
          </div>

          <div className="text-slate-400 font-mono text-[11px]">
            Average monthly collection:{' '}
            <strong className="text-white tabular-nums">
              {settings.currencySymbol}
              {monthlyData.length > 0 
                ? Math.round(monthlyData.reduce((s, m) => s + m.total, 0) / monthlyData.length).toLocaleString() 
                : 0}
            </strong>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-80 w-full pt-2">
          {monthlyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No collection data recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                barSize={chartMode === 'stacked' ? 36 : 18}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis 
                  dataKey="shortLabel" 
                  tickLine={false} 
                  axisLine={{ stroke: '#475569' }}
                  tick={{ fill: '#94A3B8', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  dy={8}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={{ stroke: '#475569' }}
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(val) => `${settings.currencySymbol}${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`}
                  dx={-4}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1E293B', opacity: 0.4 }} />
                
                {/* Cash Bar */}
                <Bar 
                  dataKey="cash" 
                  name="Cash Received" 
                  stackId={chartMode === 'stacked' ? 'a' : undefined} 
                  fill="#10B981" 
                  radius={chartMode === 'stacked' ? [0, 0, 4, 4] : [4, 4, 0, 0]} 
                />

                {/* Digital / UPI Bar */}
                <Bar 
                  dataKey="digital" 
                  name="Digital / UPI" 
                  stackId={chartMode === 'stacked' ? 'a' : undefined} 
                  fill="#0EA5E9" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Secondary Analytics Grid: Locality Breakdown, Recent Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Locality Collections (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Sector & Area Collection Volume</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Collection volume segmented by residential zone
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {areaCollections.length} Sectors
            </span>
          </div>

          <div className="space-y-3.5">
            {areaCollections.map((item, idx) => {
              const maxTotal = areaCollections[0]?.total || 1;
              const barPercent = Math.min(100, Math.round((item.total / maxTotal) * 100));
              const cashPercent = item.total > 0 ? Math.round((item.cash / item.total) * 100) : 0;

              return (
                <div key={item.area} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      {idx + 1}. {item.area}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono text-[11px]">
                        Cash {cashPercent}% · Digital {100 - cashPercent}%
                      </span>
                      <span className="font-bold text-white font-mono tabular-nums">
                        {settings.currencySymbol}{item.total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                    <div 
                      style={{ width: `${(item.cash / item.total) * barPercent}%` }} 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      title={`Cash: ${settings.currencySymbol}${item.cash}`}
                    />
                    <div 
                      style={{ width: `${(item.digital / item.total) * barPercent}%` }} 
                      className="bg-sky-500 h-full transition-all duration-300"
                      title={`Digital: ${settings.currencySymbol}${item.digital}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Recent Verified Receipts (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Recent Cash Receipts</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time collection transactions
              </p>
            </div>
            <span className="text-[10px] text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded font-mono font-bold border border-emerald-800">
              Live Feed
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {recentPayments.map(p => {
              const cust = customers.find(c => c.id === p.customerId);
              return (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{cust?.name || 'Customer'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({p.receiptNo})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                        p.method === 'Cash' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' : 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                      }`}>
                        {p.method}
                      </span>
                      <span>{p.collectedBy}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-white font-mono text-sm">
                      {settings.currencySymbol}{p.amount.toLocaleString()}
                    </div>
                    {cust && (
                      <button
                        onClick={() => openThermalReceipt(p, cust)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
                      >
                        Print 80mm
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Overall Ledger Total:</span>
            <span className="font-bold text-white font-mono">{payments.length} Receipts</span>
          </div>
        </div>
      </div>
    </div>
  );
};
