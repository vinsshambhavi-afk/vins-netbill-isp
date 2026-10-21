import React, { useState } from 'react';
import { 
  BellRing, 
  Search, 
  Send, 
  Copy, 
  Check, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Filter, 
  HandCoins, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Eye,
  RefreshCw,
  Sparkles,
  Smartphone,
  Flame,
  X
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { Customer } from '../types/isp';
import { createWhatsAppUrl, generateReminderMessage } from '../utils/whatsapp';
import { SmsService } from '../services/smsService';

type FilterTab = 'all' | 'due_today' | 'due_soon' | 'overdue' | 'suspended';

export const MonthlyRemindersView: React.FC = () => {
  const { customers, settings, logReminderSent, openReceiveCash } = useISP();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('due_today');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewCustomer, setPreviewCustomer] = useState<Customer | null>(null);
  const [smsFeedback, setSmsFeedback] = useState<string | null>(null);

  // Queue Assistant State
  const [isQueueActive, setIsQueueActive] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);

  // Distinct areas for filter dropdown
  const areas = Array.from(new Set(customers.map(c => c.area))).filter(Boolean);

  // Classify customers by renewal urgency
  const getCustomerCategory = (c: Customer): 'due_today' | 'due_soon' | 'overdue' | 'suspended' | 'active' => {
    const today = new Date().toISOString().split('T')[0];
    const expiry = c.expiryDate;

    if (!expiry) return 'active';
    if (c.status === 'suspended') return 'suspended';
    if (expiry < today) return 'overdue';
    if (expiry === today) return 'due_today';

    const diffDays = Math.ceil(
      (new Date(expiry).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 3) return 'due_soon';
    return 'active';
  };

  // Filtered customer list
  const filteredCustomers = customers.filter(customer => {
    const category = getCustomerCategory(customer);

    if (activeFilter === 'due_today' && category !== 'due_today') return false;
    if (activeFilter === 'due_soon' && category !== 'due_soon') return false;
    if (activeFilter === 'overdue' && category !== 'overdue') return false;
    if (activeFilter === 'suspended' && category !== 'suspended') return false;
    if (activeFilter === 'all' && category === 'active') return false;

    if (selectedArea !== 'all' && customer.area !== selectedArea) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = customer.name.toLowerCase().includes(q);
      const matchPhone = customer.phone.includes(q);
      const matchId = customer.subscriberId.toLowerCase().includes(q);
      const matchAct = (customer.activationNumber || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchId || matchAct;
    }

    return true;
  });

  // Calculate badge counts
  const counts = {
    due_today: customers.filter(c => getCustomerCategory(c) === 'due_today').length,
    due_soon: customers.filter(c => getCustomerCategory(c) === 'due_soon').length,
    overdue: customers.filter(c => getCustomerCategory(c) === 'overdue').length,
    suspended: customers.filter(c => getCustomerCategory(c) === 'suspended').length,
    all_pending: customers.filter(c => getCustomerCategory(c) !== 'active').length
  };

  const determineReminderType = (c: Customer): 'due_today' | 'upcoming' | 'overdue' | 'suspension' => {
    const cat = getCustomerCategory(c);
    if (cat === 'due_today') return 'due_today';
    if (cat === 'overdue') return 'overdue';
    if (cat === 'suspended') return 'suspension';
    return 'upcoming';
  };

  const handleSendReminder = (customer: Customer) => {
    const reminderType = determineReminderType(customer);
    const text = generateReminderMessage(customer, settings, reminderType);
    const waUrl = createWhatsAppUrl(customer.phone, text);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    logReminderSent(customer.id, reminderType, text);
  };

  const handleSendSmsReminder = async (customer: Customer) => {
    const reminderType = determineReminderType(customer);
    const reminderText = `Dear ${customer.name}, your ${customer.planName} broadband expires on ${customer.expiryDate}. Renewal fee: Rs.${customer.monthlyFee}. Please renew to prevent service disruption. - ${settings.ispName}`;
    await SmsService.dispatchSmsOtp(customer.phone, 'RENEW', customer.name);
    logReminderSent(customer.id, reminderType, reminderText);
    setSmsFeedback(`SMS renewal reminder dispatched to +91 ${customer.phone}`);
    setTimeout(() => setSmsFeedback(null), 4000);
  };

  const handleCopyMessage = async (customer: Customer) => {
    const reminderType = determineReminderType(customer);
    const text = generateReminderMessage(customer, settings, reminderType);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(customer.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Queue mode helpers
  const queueCustomers = filteredCustomers;
  const currentQueueCustomer = queueCustomers[queueIndex];

  const handleNextInQueue = () => {
    if (queueIndex < queueCustomers.length - 1) {
      setQueueIndex(queueIndex + 1);
    } else {
      setIsQueueActive(false);
      setQueueIndex(0);
    }
  };

  const handleSendAndAdvance = (customer: Customer) => {
    handleSendReminder(customer);
    handleNextInQueue();
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-slate-800/90 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
              <BellRing className="w-3 h-3 text-amber-400" />
              Renewal Automation
            </span>
            <span className="text-xs text-slate-400">WhatsApp & Telecom SMS Dispatches</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Monthly Renewal Reminders</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Targeted notifications for upcoming, due today, and overdue broadband subscriptions with 1-click WhatsApp and SMS routing.
          </p>
        </div>

        {filteredCustomers.length > 0 && !isQueueActive && (
          <button
            onClick={() => {
              setIsQueueActive(true);
              setQueueIndex(0);
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 hover:brightness-110 active:brightness-95 rounded-xl shadow-lg shadow-amber-950/40 transition-all cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Launch Rapid Queue ({filteredCustomers.length})</span>
          </button>
        )}
      </div>

      {/* SMS Dispatched Feedback Pill */}
      {smsFeedback && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{smsFeedback}</span>
          </div>
          <button onClick={() => setSmsFeedback(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Step-by-Step Queue Dispatch Assistant */}
      {isQueueActive && currentQueueCustomer && (
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white rounded-2xl p-5 shadow-2xl border border-emerald-500/40 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/40">
                Queue {queueIndex + 1} of {queueCustomers.length}
              </span>
              <span className="text-xs text-emerald-400 font-semibold">Continuous Dispatch Assistant</span>
            </div>
            <button
              onClick={() => setIsQueueActive(false)}
              className="text-xs text-slate-400 hover:text-white underline underline-offset-2 cursor-pointer"
            >
              Exit Queue
            </button>
          </div>

          <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="space-y-1">
              <div className="text-base font-bold text-white">{currentQueueCustomer.name}</div>
              <div className="text-xs text-emerald-400 font-mono">
                +91 {currentQueueCustomer.phone} · ID: {currentQueueCustomer.subscriberId}
              </div>
              <div className="text-xs text-slate-400">
                {currentQueueCustomer.area} · {currentQueueCustomer.planName}
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="text-slate-400">Renewal Amount:</div>
              <div className="text-2xl font-black text-amber-300 tabular-nums font-mono">
                {settings.currencySymbol}{currentQueueCustomer.monthlyFee}
              </div>
              <div className="text-slate-400">
                Expiry Date: <strong className="text-white font-mono">{currentQueueCustomer.expiryDate}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleNextInQueue}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 border border-slate-700 rounded-xl cursor-pointer"
              >
                Skip
              </button>
              <button
                onClick={() => handleSendAndAdvance(currentQueueCustomer)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch & Next</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Controls */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
        {/* Urgency Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setActiveFilter('due_today')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === 'due_today'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Due Today</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black tabular-nums ${
              activeFilter === 'due_today' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
            }`}>
              {counts.due_today}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('due_soon')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === 'due_soon'
                ? 'bg-sky-500 text-slate-950 shadow-xs'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Upcoming (1-3 Days)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black tabular-nums ${
              activeFilter === 'due_soon' ? 'bg-slate-950 text-sky-300' : 'bg-slate-800 text-slate-300'
            }`}>
              {counts.due_soon}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('overdue')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === 'overdue'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue Grace Period</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black tabular-nums ${
              activeFilter === 'overdue' ? 'bg-slate-950 text-rose-300' : 'bg-slate-800 text-slate-300'
            }`}>
              {counts.overdue}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('suspended')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === 'suspended'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Suspension Warning</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black tabular-nums ${
              activeFilter === 'suspended' ? 'bg-slate-950 text-purple-300' : 'bg-slate-800 text-slate-300'
            }`}>
              {counts.suspended}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('all')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>All Pending ({counts.all_pending})</span>
          </button>
        </div>

        {/* Secondary Filters: Search & Area */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-800">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search subscribers by name, phone, subscriber ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Area:
            </span>
            <select
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              className="text-xs bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 w-full sm:w-44"
            >
              <option value="all">All Service Areas</option>
              {areas.map(area => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Customer Reminders Grid / Table */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">All Clear! No Pending Reminders</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            There are no subscribers currently matching the "{activeFilter.replace('_', ' ')}" filter criteria.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Showing {filteredCustomers.length} subscribers requiring renewal reminder</span>
            <span className="hidden sm:inline text-slate-500 font-mono text-[11px]">Direct 1-click WhatsApp & SMS routing</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {filteredCustomers.map(customer => {
              const category = getCustomerCategory(customer);
              const reminderType = determineReminderType(customer);
              const isCopied = copiedId === customer.id;

              return (
                <div 
                  key={customer.id}
                  className="p-4 sm:p-5 hover:bg-slate-800/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Subscriber Information */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">{customer.name}</span>
                      <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800">
                        {customer.subscriberId}
                      </span>
                      {customer.activationNumber && (
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                          Act: {customer.activationNumber}
                        </span>
                      )}
                      
                      {category === 'due_today' && (
                        <span className="text-xs font-semibold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                          Due Today
                        </span>
                      )}
                      {category === 'due_soon' && (
                        <span className="text-xs font-medium text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                          Expiring Soon
                        </span>
                      )}
                      {category === 'overdue' && (
                        <span className="text-xs font-semibold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                          Overdue
                        </span>
                      )}
                      {category === 'suspended' && (
                        <span className="text-xs font-semibold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                          Suspended
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="font-mono text-slate-200">+91 {customer.phone}</span>
                      <span>·</span>
                      <span>{customer.area}</span>
                      <span>·</span>
                      <span>{customer.planName} ({customer.speedMbps} Mbps)</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                      <span>
                        Expiry Date: <strong className="font-mono text-white tabular-nums">{customer.expiryDate}</strong>
                      </span>
                      {customer.lastReminderSentAt && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                            <Check className="w-3 h-3" />
                            Reminded: {new Date(customer.lastReminderSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Financial Due & Action Buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 justify-between lg:justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <div className="text-left sm:text-right mr-2">
                      <span className="text-[11px] text-slate-400 font-medium block">Renewal Fee</span>
                      <span className="text-base font-black text-amber-300 font-mono tabular-nums">
                        {settings.currencySymbol}{customer.monthlyFee}
                      </span>
                    </div>

                    {/* Preview Message */}
                    <button
                      onClick={() => setPreviewCustomer(customer)}
                      title="Preview reminder text"
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Copy Text */}
                    <button
                      onClick={() => handleCopyMessage(customer)}
                      title="Copy reminder message"
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>

                    {/* Send SMS Reminder */}
                    <button
                      onClick={() => handleSendSmsReminder(customer)}
                      title="Dispatch SMS Reminder"
                      className="flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>SMS</span>
                    </button>

                    {/* Send WhatsApp Reminder */}
                    <button
                      onClick={() => handleSendReminder(customer)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Receive Cash Directly */}
                    <button
                      onClick={() => openReceiveCash(customer.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="Open cash collection for this subscriber"
                    >
                      <HandCoins className="w-3.5 h-3.5" />
                      <span>Collect Cash</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Reminder Modal */}
      {previewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-400" />
                <span>Message Preview ({previewCustomer.name})</span>
              </h3>
              <button onClick={() => setPreviewCustomer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs whitespace-pre-wrap text-slate-300 leading-relaxed max-h-60 overflow-y-auto">
              {generateReminderMessage(previewCustomer, settings, determineReminderType(previewCustomer))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewCustomer(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleSendReminder(previewCustomer);
                  setPreviewCustomer(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-xs"
              >
                Dispatch on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
