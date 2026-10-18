import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  RotateCcw, 
  MessageSquare, 
  Building, 
  CreditCard, 
  Check, 
  Download, 
  Sparkles, 
  Phone, 
  FileText, 
  Users, 
  KeyRound, 
  Trash2, 
  ShieldCheck, 
  Send, 
  UserCheck, 
  ArrowRight, 
  Database, 
  Upload, 
  Flame, 
  Cloud
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { DEFAULT_TEMPLATES } from '../utils/whatsapp';

export const SettingsView: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    resetToDemoData, 
    customers, 
    payments,
    currentUser,
    operators,
    setAdminProfile,
    openClearSubscribers,
    clearAllPayments,
    isAdmin,
    setCurrentTab,
    openImportDatabase,
    openCloudModal
  } = useISP();

  const [formData, setFormData] = useState(settings);
  const [adminNameInput, setAdminNameInput] = useState(currentUser?.name || (settings.activeCashier ? settings.activeCashier.replace(/\s*\(Admin\)/i, '') : 'Rajesh Kumar'));
  const [adminPhoneInput, setAdminPhoneInput] = useState(currentUser?.phone || (settings.phone ? settings.phone.replace(/\D/g, '') : '9876512340'));
  const [activeTemplateTab, setActiveTemplateTab] = useState<
    'cashReceipt' | 'dueTodayReminder' | 'upcomingReminder' | 'overdueReminder' | 'suspensionReminder'
  >('cashReceipt');
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminNameInput.trim()) {
      setAdminProfile(adminNameInput.trim(), adminPhoneInput.trim());
    }
    updateSettings({
      ...formData,
      activeCashier: `${adminNameInput.trim()} (Admin)`,
      phone: adminPhoneInput.trim() || formData.phone
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const insertVariable = (tag: string) => {
    const currentTemplate = formData.templates[activeTemplateTab];
    const newTemplate = currentTemplate + ` {{${tag}}}`;
    setFormData({
      ...formData,
      templates: {
        ...formData.templates,
        [activeTemplateTab]: newTemplate
      }
    });
  };

  const handleResetTemplate = () => {
    setFormData({
      ...formData,
      templates: {
        ...formData.templates,
        [activeTemplateTab]: DEFAULT_TEMPLATES[activeTemplateTab]
      }
    });
  };

  const handleExportAllJSON = () => {
    const backup = {
      settings: formData,
      customers,
      payments,
      operators,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vinsnetbill_database_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const availableTags = [
    'customer_name',
    'subscriber_id',
    'activation_number',
    'phone',
    'receipt_no',
    'amount',
    'payment_mode',
    'date',
    'valid_from',
    'valid_to',
    'expiry_date',
    'plan_name',
    'speed',
    'balance',
    'collected_by',
    'isp_name',
    'support_phone',
    'upi_id'
  ];

  return (
    <div className="space-y-6">
      {/* Modern Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-slate-800/90 shadow-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
              <SettingsIcon className="w-3.5 h-3.5 text-amber-400" />
              Terminal Settings & Configuration
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Business ID & Message Dispatch
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>System Settings & Operations</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Configure ISP business identity, admin credentials, cloud synchronization, and customized WhatsApp & SMS billing templates.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 shrink-0">
          {savedFeedback && (
            <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/40 flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400" /> Changes Saved!
            </span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 hover:brightness-110 active:brightness-95 rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer whitespace-nowrap"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Business Profile, Cash Receivers & Data (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Administrator Profile Card */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Administrator Profile</h3>
                <p className="text-[11px] text-slate-400">Master executive name and mobile number</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Administrator Full Name *
                </label>
                <input
                  type="text"
                  value={adminNameInput}
                  onChange={e => setAdminNameInput(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400 font-semibold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Displayed on 80mm receipts, bills, and terminal header.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Admin Login Mobile Phone *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-semibold text-slate-500 font-mono">+91</span>
                  <input
                    type="tel"
                    value={adminPhoneInput}
                    onChange={e => setAdminPhoneInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="98765 12340"
                    className="w-full pl-11 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cash Collectors & Field Staff Quick Card */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Cash Collectors & Field Staff</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {operators.filter(op => op.role !== 'admin').length} registered field agents
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentTab('collectors')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Register cash collectors with mobile numbers, assign field zones & collection routes, and dispatch instant login OTPs directly to their WhatsApp.
            </p>
          </div>

          {/* ISP Business Profile & Admin PIN */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Building className="w-4 h-4 text-emerald-400" />
              ISP Business Profile & Admin Security
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  ISP / Network Brand Name *
                </label>
                <input
                  type="text"
                  value={formData.ispName}
                  onChange={e => setFormData({ ...formData, ispName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Support Helpline *
                  </label>
                  <input
                    type="text"
                    value={formData.supportPhone}
                    onChange={e => setFormData({ ...formData, supportPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={formData.currencySymbol}
                    onChange={e => setFormData({ ...formData, currencySymbol: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-amber-300 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Master Admin Security PIN */}
              <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-1.5">
                <label className="block font-bold text-indigo-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>Master Administrator PIN *</span>
                  </span>
                  <span className="text-[10px] text-indigo-400 font-normal">Privilege Guard</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.adminPin || '1234'}
                  onChange={e => setFormData({ ...formData, adminPin: e.target.value.replace(/\D/g, '') })}
                  placeholder="1234"
                  className="w-full px-3 py-2 bg-slate-950 border border-indigo-500/50 rounded-xl focus:ring-1 focus:ring-indigo-400 font-mono font-bold tracking-widest text-white"
                />
                <span className="text-[10px] text-slate-400 block">
                  Required when switching from Cashier to Admin role.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Active Cashier / Desk Label
                </label>
                <input
                  type="text"
                  value={formData.activeCashier}
                  onChange={e => setFormData({ ...formData, activeCashier: e.target.value })}
                  placeholder="e.g. Suresh (Counter 1)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  UPI ID (VPA) for Reminders
                </label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={e => setFormData({ ...formData, upiId: e.target.value })}
                  placeholder="name@okhdfcbank"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  GST / Tax Registration Number
                </label>
                <input
                  type="text"
                  value={formData.gstOrTaxNo}
                  onChange={e => setFormData({ ...formData, gstOrTaxNo: e.target.value })}
                  placeholder="07AAAAA0000A1Z5"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Business Address (Printed on Receipts)
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Cloud Store & Database Synchronization Card */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-5 shadow-xl space-y-3.5 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-sm">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Firebase & MongoDB Cloud Store</h3>
                  <p className="text-[11px] text-amber-300 font-mono">Real-time sync & persistent storage</p>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Store and sync subscribers, payment receipts, and staff accounts to Google Cloud Firestore or connect your external MongoDB Atlas cluster.
            </p>

            <button
              type="button"
              onClick={openCloudModal}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-slate-950" />
              <span>Open Cloud Store Manager</span>
            </button>
          </div>

          {/* Clean Slate & Data Operations */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3.5">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2.5">
              Clean Slate & Data Operations
            </h3>
            <div className="flex flex-col gap-2.5 text-xs">
              <button
                type="button"
                onClick={openClearSubscribers}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-rose-900/60 text-rose-300 bg-rose-950/60 hover:bg-rose-900/70 font-semibold transition-colors cursor-pointer"
                title="Wipe all subscribers so you can create your own subscribers"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear All Subscribers (Clean Slate)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete all recorded cash collections and receipts?')) {
                    clearAllPayments();
                  }
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-700 text-slate-300 bg-slate-950 hover:bg-slate-850 font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Clear Payment Collection History</span>
              </button>

              <button
                type="button"
                onClick={openImportDatabase}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-indigo-700/60 bg-indigo-950/60 hover:bg-indigo-900/70 text-indigo-200 font-bold transition-colors shadow-xs cursor-pointer"
                title="Restore or merge database from a JSON backup file"
              >
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>Import Entire Database (JSON)</span>
              </button>

              <button
                type="button"
                onClick={handleExportAllJSON}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-850 text-slate-300 font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Backup Entire Database (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Restore default sample subscribers, payments and settings?')) {
                    resetToDemoData();
                  }
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-800 text-slate-400 bg-slate-950/50 hover:bg-slate-850 font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Restore Sample Demo Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: WhatsApp & SMS Templates Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  WhatsApp & SMS Dispatch Templates
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Format the exact text dispatched for cash receipts and renewal notifications
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetTemplate}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-2 cursor-pointer"
              >
                Reset This Template
              </button>
            </div>

            {/* Template Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTemplateTab('cashReceipt')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTemplateTab === 'cashReceipt'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                🧾 Cash Receipt
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplateTab('dueTodayReminder')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTemplateTab === 'dueTodayReminder'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                ⚡ Due Today
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplateTab('upcomingReminder')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTemplateTab === 'upcomingReminder'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                📅 Upcoming (3 Days)
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplateTab('overdueReminder')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTemplateTab === 'overdueReminder'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                ⚠️ Overdue Warning
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplateTab('suspensionReminder')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTemplateTab === 'suspensionReminder'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                🛑 Suspension Notice
              </button>
            </div>

            {/* Variable Tag Helper Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-400">
                Click to insert dynamic variable tag into message:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable(tag)}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-950 hover:bg-emerald-950/80 hover:text-emerald-300 text-slate-300 rounded-lg border border-slate-800 hover:border-emerald-800 transition-colors cursor-pointer"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Editor Box */}
            <div>
              <textarea
                rows={14}
                value={formData.templates[activeTemplateTab]}
                onChange={e =>
                  setFormData({
                    ...formData,
                    templates: {
                      ...formData.templates,
                      [activeTemplateTab]: e.target.value
                    }
                  })
                }
                className="w-full font-mono text-xs leading-relaxed p-4 bg-slate-950 border border-slate-800 rounded-2xl text-emerald-300 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Supports WhatsApp formatting: *bold*, _italics_, ~strikethrough~</span>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 rounded-xl shadow-md cursor-pointer"
              >
                Save Templates
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
