import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Phone, 
  MapPin, 
  Target, 
  ShieldCheck, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Send, 
  Search, 
  TrendingUp, 
  Receipt,
  UserCheck,
  Check,
  X,
  FileText,
  Smartphone,
  Sparkles,
  Flame,
  ArrowRight
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { OperatorUser, OperatorRole } from '../types/isp';
import { createCollectorInviteWhatsAppUrl, createOtpWhatsAppUrl } from '../utils/whatsapp';
import { SmsService } from '../services/smsService';

export const CashCollectorsView: React.FC = () => {
  const { 
    operators, 
    addOperator, 
    updateOperator, 
    deleteOperator, 
    sendOtpToOperator,
    currentUser, 
    isAdmin, 
    settings,
    payments,
    openCashierStatement
  } = useISP();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Notice states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<{ url: string; name: string; phone: string } | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<OperatorRole>('collector');
  const [formArea, setFormArea] = useState('');
  const [formTarget, setFormTarget] = useState('15000');
  const [formAgency, setFormAgency] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormRole('collector');
    setFormArea('');
    setFormTarget('15000');
    setFormAgency('');
    setFormStatus('active');
    setFormError(null);
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (op: OperatorUser) => {
    setEditingId(op.id);
    setFormName(op.name);
    setFormPhone(op.phone);
    setFormRole(op.role || 'collector');
    setFormArea(op.assignedArea || '');
    setFormTarget(op.dailyTarget ? String(op.dailyTarget) : '15000');
    setFormAgency(op.agency || '');
    setFormStatus(op.status || 'active');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveCollector = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError('Please enter the collector full name');
      return;
    }

    const cleanPhone = formPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setFormError('Mobile phone must be exactly 10 digits for WhatsApp OTP access');
      return;
    }

    const existingPhone = operators.find(op => op.phone === cleanPhone && op.id !== editingId);
    if (existingPhone) {
      setFormError(`Phone +91 ${cleanPhone} is already assigned to ${existingPhone.name}`);
      return;
    }

    if (editingId) {
      updateOperator(editingId, {
        name: cleanName,
        phone: cleanPhone,
        role: formRole,
        assignedArea: formArea.trim() || undefined,
        dailyTarget: Number(formTarget) || 15000,
        agency: formAgency.trim() || undefined,
        status: formStatus
      });
      setSuccessMessage(`Updated collector profile for "${cleanName}"`);
    } else {
      const newOp = addOperator({
        name: cleanName,
        phone: cleanPhone,
        role: formRole,
        assignedArea: formArea.trim() || undefined,
        dailyTarget: Number(formTarget) || 15000,
        agency: formAgency.trim() || 'ISP Operations',
        status: formStatus
      });

      const inviteUrl = createCollectorInviteWhatsAppUrl(newOp.phone, newOp.name, settings.ispName, newOp.assignedArea);
      setLastInviteUrl({ url: inviteUrl, name: newOp.name, phone: newOp.phone });
      setSuccessMessage(`Successfully registered ${newOp.name} as cash collector! WhatsApp invite ready.`);
    }

    setIsFormOpen(false);
    resetForm();
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from cash collectors?`)) {
      deleteOperator(id);
      setSuccessMessage(`Removed collector ${name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleSendWhatsAppInvite = (op: OperatorUser) => {
    const url = createCollectorInviteWhatsAppUrl(op.phone, op.name, settings.ispName, op.assignedArea);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSendSmsOtp = async (op: OperatorUser) => {
    const res = sendOtpToOperator(op.phone, op.name);
    if (!res || !res.otp) {
      setSuccessMessage(`Could not generate OTP for ${op.name}`);
      return;
    }

    const smsRes = await SmsService.dispatchSmsOtp(op.phone, res.otp, op.name);
    if (smsRes.success) {
      setSuccessMessage(`DLT SMS OTP [${res.otp}] dispatched to +91 ${op.phone} for ${op.name}`);
    } else {
      setSuccessMessage(`SMS service simulated: OTP is [${res.otp}] for +91 ${op.phone}`);
    }
    setTimeout(() => setSuccessMessage(null), 6000);
  };

  // Filtered operators
  const collectorsList = operators.filter(op => {
    if (statusFilter !== 'all' && (op.status || 'active') !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = op.name.toLowerCase().includes(q);
      const matchPhone = op.phone.includes(q);
      const matchArea = (op.assignedArea || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchArea;
    }
    return true;
  });

  const todayDateStr = new Date().toISOString().split('T')[0];
  const getTodayCollectedBy = (name: string) => {
    return payments
      .filter(p => p.date.startsWith(todayDateStr) && p.collectedBy?.toLowerCase().includes(name.toLowerCase()))
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const totalCollectors = operators.filter(op => op.role !== 'admin').length;
  const activeCount = operators.filter(op => op.role !== 'admin' && (op.status || 'active') === 'active').length;

  return (
    <div className="space-y-6">
      {/* Modern Top Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-slate-800/90 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              Field Workforce Operations
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {activeCount} Agents on Duty
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Cash Collectors & Field Agents</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Register cash collectors with mobile numbers, assign field zones, set collection targets, and dispatch login OTPs via SMS and WhatsApp.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => openCashierStatement()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors shadow-xs cursor-pointer"
            title="Generate custom date range statement for any individual cashier"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Cashier Statement</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 hover:brightness-110 active:brightness-95 rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Cash Collector</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Direct WhatsApp Invite Banner after creating collector */}
      {lastInviteUrl && (
        <div className="p-4 bg-gradient-to-r from-emerald-950 to-teal-950 text-white rounded-2xl shadow-xl border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Send WhatsApp Welcome Credentials to {lastInviteUrl.name}
              </h4>
              <p className="text-xs text-emerald-300/80 mt-0.5 font-mono">
                Ready to dispatch terminal login link and mobile access to +91 {lastInviteUrl.phone}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <a
              href={lastInviteUrl.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-lg"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Open WhatsApp</span>
            </a>
            <button
              onClick={() => setLastInviteUrl(null)}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modern KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition-all">
          <span className="text-xs text-slate-400 font-semibold">Total Field Staff</span>
          <div className="text-2xl font-black text-white mt-1 font-mono tabular-nums">{totalCollectors}</div>
          <span className="text-[11px] text-slate-500">Registered collectors</span>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition-all">
          <span className="text-xs text-slate-400 font-semibold">Active on Duty</span>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono tabular-nums">{activeCount}</div>
          <span className="text-[11px] text-emerald-400/80 font-medium">Ready for collections</span>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition-all">
          <span className="text-xs text-slate-400 font-semibold">Collected Today</span>
          <div className="text-2xl font-black text-amber-300 mt-1 font-mono tabular-nums">
            {settings.currencySymbol}
            {payments
              .filter(p => p.date.startsWith(todayDateStr))
              .reduce((sum, p) => sum + p.amount, 0)
              .toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">Day volume</span>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition-all">
          <span className="text-xs text-slate-400 font-semibold">Authentication Engine</span>
          <div className="text-2xl font-black text-white mt-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-sm font-bold text-emerald-300">SMS + WhatsApp</span>
          </div>
          <span className="text-[11px] text-slate-500">Instant OTP route</span>
        </div>
      </div>

      {/* Modern Create / Edit Cash Collector Form (Collapsible/Modal) */}
      {isFormOpen && (
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-emerald-500/40 p-6 shadow-2xl relative animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingId ? 'Edit Cash Collector Details' : 'Register New Cash Collector'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingId ? 'Update collector profile and assigned area' : 'Add an authorized cash receiver with mobile number and instant OTP login access'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveCollector} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Collector Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Varma"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Mobile Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mobile Phone Number (+91) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-semibold text-slate-500 font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98765 43210"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-11 pr-3.5 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Used for SMS & WhatsApp OTP verification
                </span>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Staff Role *
                </label>
                <select
                  value={formRole}
                  onChange={e => setFormRole(e.target.value as OperatorRole)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="collector">Cash Collector (Field Collection Agent)</option>
                  <option value="cashier">Cashier Desk (Counter Operator)</option>
                  <option value="field_agent">Field Technician / Collector</option>
                </select>
              </div>

              {/* Assigned Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Assigned Field Area / Zone
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2" />
                  <input
                    type="text"
                    placeholder="e.g. Sector 14, Indiranagar, North Block"
                    value={formArea}
                    onChange={e => setFormArea(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Daily Collection Target */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Daily Target ({settings.currencySymbol})
                </label>
                <div className="relative">
                  <Target className="w-4 h-4 text-slate-500 absolute left-3 top-2" />
                  <input
                    type="number"
                    placeholder="15000"
                    value={formTarget}
                    onChange={e => setFormTarget(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl text-amber-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Status
                </label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="active">Active (Can collect cash & print receipts)</option>
                  <option value="inactive">Inactive / Suspended</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 rounded-xl shadow-lg transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{editingId ? 'Save Changes' : 'Register Collector'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Directory Section Header & Search */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, phone, or assigned area..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Collectors List */}
        <div className="divide-y divide-slate-800/60">
          {collectorsList.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-300">No cash collectors found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery ? 'No collectors matching your search filter.' : 'Click "Create Cash Collector" above to add your first field collection agent.'}
              </p>
            </div>
          ) : (
            collectorsList.map(op => {
              const isOpAdmin = op.role === 'admin';
              const todayCollected = getTodayCollectedBy(op.name);
              const target = op.dailyTarget || 15000;
              const progressPct = Math.min(100, Math.round((todayCollected / target) * 100));

              return (
                <div key={op.id} className="p-4 sm:p-5 hover:bg-slate-850/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                  {/* Left: Info */}
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-slate-950 shrink-0 shadow-md ${
                      isOpAdmin ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}>
                      {op.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{op.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isOpAdmin 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {isOpAdmin ? 'Admin' : 'Collector'}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          (op.status || 'active') === 'active' 
                            ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800' 
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {(op.status || 'active') === 'active' ? '● Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1 font-mono text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          +91 {op.phone}
                        </span>
                        {op.assignedArea && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            {op.assignedArea}
                          </span>
                        )}
                        {op.agency && (
                          <span className="text-slate-500">· {op.agency}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Collection Progress (for field collectors) */}
                  {!isOpAdmin && (
                    <div className="md:w-56 shrink-0 bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400 font-medium">Today's Intake:</span>
                        <span className="font-black font-mono text-amber-300">
                          {settings.currencySymbol}{todayCollected.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                        <span>Target: {settings.currencySymbol}{target.toLocaleString()}</span>
                        <span>{progressPct}%</span>
                      </div>
                    </div>
                  )}

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Send WhatsApp Invite */}
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppInvite(op)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/70 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      title="Send WhatsApp Welcome & Login Invite"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Send OTP via SMS */}
                    <button
                      type="button"
                      onClick={() => handleSendSmsOtp(op)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                      title="Dispatch SMS OTP directly to collector mobile number"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>SMS OTP</span>
                    </button>

                    {/* View Statement */}
                    <button
                      type="button"
                      onClick={() => openCashierStatement(op.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      title="View custom date cash collection statement for this cashier"
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                      <span>Statement</span>
                    </button>

                    {/* Edit */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleEdit(op)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-800"
                        title="Edit collector details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete */}
                    {isAdmin && currentUser?.id !== op.id && (
                      <button
                        type="button"
                        onClick={() => handleDelete(op.id, op.name)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer border border-rose-900/40"
                        title="Delete collector"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
