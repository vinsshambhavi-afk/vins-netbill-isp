import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  HandCoins, 
  BellRing, 
  Filter, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Wifi, 
  Phone, 
  MapPin, 
  Calendar,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  ReceiptText,
  Lock,
  ShieldCheck,
  Database,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { Customer, SubscriberStatus, ConnectionType } from '../types/isp';
import { createWhatsAppUrl, generateReminderMessage } from '../utils/whatsapp';

export const SubscribersView: React.FC = () => {
  const { 
    customers, 
    settings, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    openReceiveCash, 
    logReminderSent, 
    openImportModal,
    viewSubscriberReceipts,
    isAdmin,
    isCashier,
    switchRole,
    roleRestrictionToast,
    showRoleRestrictionNotice,
    clearRoleRestrictionNotice,
    openClearSubscribers,
    openAdminAuthModal,
    openImportDatabase
  } = useISP();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for Add/Edit
  const [formData, setFormData] = useState<{
    subscriberId: string;
    activationNumber: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    area: string;
    planName: string;
    speedMbps: number;
    monthlyFee: number;
    billingDay: number;
    expiryDate: string;
    status: SubscriberStatus;
    connectionType: ConnectionType;
    ipAddress: string;
    balance: number;
  }>({
    subscriberId: '',
    activationNumber: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    area: '',
    planName: 'Fiber 100 Mbps',
    speedMbps: 100,
    monthlyFee: 699,
    billingDay: 1,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    connectionType: 'FTTH',
    ipAddress: '',
    balance: 0
  });

  const areas = Array.from(new Set(customers.map(c => c.area))).filter(Boolean);

  const filteredCustomers = customers.filter(customer => {
    if (statusFilter !== 'all' && customer.status !== statusFilter) return false;
    if (areaFilter !== 'all' && customer.area !== areaFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        customer.name.toLowerCase().includes(q) ||
        customer.phone.includes(q) ||
        customer.subscriberId.toLowerCase().includes(q) ||
        (customer.activationNumber && customer.activationNumber.toLowerCase().includes(q)) ||
        customer.area.toLowerCase().includes(q) ||
        customer.planName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    const nextNum = customers.length + 101;
    setFormData({
      subscriberId: `OPT-2026-${nextNum}`,
      activationNumber: `ACT-${Math.floor(10000 + Math.random() * 90000)}-FTTH`,
      name: '',
      phone: '',
      email: '',
      address: '',
      area: areas[0] || 'Central Zone',
      planName: 'Fiber 100 Mbps',
      speedMbps: 100,
      monthlyFee: 699,
      billingDay: 1,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      connectionType: 'FTTH',
      ipAddress: '',
      balance: 0
    });
    setEditingCustomer(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setFormData({
      subscriberId: customer.subscriberId,
      activationNumber: customer.activationNumber || `ACT-${Math.floor(10000 + Math.random() * 90000)}-FTTH`,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address,
      area: customer.area,
      planName: customer.planName,
      speedMbps: customer.speedMbps,
      monthlyFee: customer.monthlyFee,
      billingDay: customer.billingDay,
      expiryDate: customer.expiryDate,
      status: customer.status,
      connectionType: customer.connectionType,
      ipAddress: customer.ipAddress || '',
      balance: customer.balance
    });
    setEditingCustomer(customer);
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, formData);
    } else {
      addCustomer(formData);
    }
    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove subscriber "${name}"?`)) {
      deleteCustomer(id);
    }
  };

  const handleQuickReminder = (customer: Customer) => {
    const text = generateReminderMessage(customer, settings, 'upcoming');
    const url = createWhatsAppUrl(customer.phone, text);
    window.open(url, '_blank', 'noopener,noreferrer');
    logReminderSent(customer.id, 'upcoming', text);
  };

  return (
    <div className="space-y-6">
      {/* Role Restriction Banner */}
      {roleRestrictionToast && (
        <div className="p-4 bg-gradient-to-r from-amber-950/90 to-amber-900/80 border border-amber-500/40 rounded-2xl text-amber-200 text-xs shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Administrator Access Required: </span>
              <span>{roleRestrictionToast}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => openAdminAuthModal()}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Enter Admin PIN</span>
            </button>
            <button
              onClick={clearRoleRestrictionNotice}
              className="p-1.5 text-amber-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modern Top Header / Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-slate-800/90 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              <Users className="w-3 h-3 text-emerald-400" />
              Broadband Subscribers
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {customers.length} Accounts Registered
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Subscriber Directory & CAF Records</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Manage FTTH connections, ONT activation serials, monthly billing cycles, and renewal dates.
          </p>
        </div>

        <div className="relative z-10 flex items-center flex-wrap gap-2.5 self-start lg:self-auto shrink-0">
          {/* Clear All Subscribers */}
          {customers.length > 0 && (
            <button
              onClick={() => {
                if (!isAdmin) {
                  showRoleRestrictionNotice('Clear All Subscribers');
                  return;
                }
                openClearSubscribers();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                isAdmin
                  ? 'text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border-rose-800/60'
                  : 'text-slate-500 bg-slate-900/60 border-slate-800 cursor-not-allowed'
              }`}
              title={isAdmin ? "Wipe subscribers directory for clean slate" : "Admin required to clear"}
            >
              {isAdmin ? <Trash2 className="w-3.5 h-3.5 text-rose-400" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />}
              <span>Clear All</span>
            </button>
          )}

          {/* Import CSV */}
          <button
            onClick={() => {
              if (!isAdmin) {
                showRoleRestrictionNotice('Import Subscribers');
                return;
              }
              openImportModal();
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors shadow-xs cursor-pointer"
            title="Import Subscribers from Excel / CSV"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import CSV</span>
          </button>

          {/* Import Database JSON */}
          <button
            onClick={() => {
              if (!isAdmin) {
                showRoleRestrictionNotice('Import Entire Database');
                return;
              }
              openImportDatabase();
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/60 transition-colors shadow-xs cursor-pointer"
            title="Import Entire Database (JSON)"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import DB (JSON)</span>
          </button>

          {/* Add New Subscriber */}
          <button
            onClick={() => {
              if (!isAdmin) {
                showRoleRestrictionNotice('Add New Subscriber');
                return;
              }
              handleOpenAdd();
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 hover:brightness-110 active:brightness-95 rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Subscriber</span>
          </button>
        </div>
      </div>

      {/* Modern Filter & Search Strip */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name, phone, subscriber ID, activation no, area..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Statuses ({customers.length})</option>
              <option value="active">Active</option>
              <option value="due_today">Due Today</option>
              <option value="due_soon">Due Soon</option>
              <option value="overdue">Overdue</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Area:</span>
            <select
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Areas</option>
              {areas.map(a => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Modern Subscribers Directory Table / Grid */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">
            {filteredCustomers.length} {filteredCustomers.length === 1 ? 'Subscriber' : 'Subscribers'} Matched
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            Instant 1-Click Collection, Thermal Slips & WhatsApp
          </span>
        </div>

        {customers.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Your Subscriber Directory is Clean</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                No broadband accounts in memory. Add your subscribers one-by-one or import from CSV or a JSON backup file.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => {
                  if (!isAdmin) {
                    showRoleRestrictionNotice('Add New Subscriber');
                    return;
                  }
                  handleOpenAdd();
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 rounded-xl shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Create First Subscriber</span>
              </button>
              <button
                onClick={() => {
                  if (!isAdmin) {
                    showRoleRestrictionNotice('Import Subscribers');
                    return;
                  }
                  openImportModal();
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Import from CSV</span>
              </button>
            </div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm font-semibold text-slate-300">No subscribers match your filter criteria</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search keyword or switching the status filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Subscriber & ID</th>
                  <th className="py-3.5 px-4">Phone & Area</th>
                  <th className="py-3.5 px-4">Broadband Plan</th>
                  <th className="py-3.5 px-4 text-right">Monthly Fee</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCustomers.map(customer => {
                  return (
                    <tr key={customer.id} className="hover:bg-slate-850/60 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                          {customer.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono mt-0.5">
                          <span className="text-emerald-400 font-bold">{customer.subscriberId}</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400 font-medium">{customer.activationNumber || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-200 font-semibold">{customer.phone}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {customer.area} {customer.address ? `· ${customer.address}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{customer.planName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {customer.speedMbps} Mbps · {customer.connectionType}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-amber-300 font-mono tabular-nums text-sm">
                        {settings.currencySymbol}{customer.monthlyFee.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300 tabular-nums">
                        {customer.expiryDate}
                      </td>
                      <td className="py-3.5 px-4">
                        {customer.status === 'active' && (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-800/80 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Active
                          </span>
                        )}
                        {customer.status === 'due_today' && (
                          <span className="text-xs font-bold text-amber-300 bg-amber-950/70 px-2.5 py-0.5 rounded-full border border-amber-800/80 inline-flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            Due Today
                          </span>
                        )}
                        {customer.status === 'due_soon' && (
                          <span className="text-xs font-medium text-sky-300 bg-sky-950/70 px-2.5 py-0.5 rounded-full border border-sky-800/80 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                            Due Soon
                          </span>
                        )}
                        {customer.status === 'overdue' && (
                          <span className="text-xs font-bold text-rose-300 bg-rose-950/70 px-2.5 py-0.5 rounded-full border border-rose-800/80 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            Overdue
                          </span>
                        )}
                        {customer.status === 'suspended' && (
                          <span className="text-xs font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            Suspended
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Collect Cash */}
                          <button
                            onClick={() => openReceiveCash(customer.id)}
                            title="Collect Cash / Payment"
                            className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded-xl transition-colors cursor-pointer border border-emerald-900/40"
                          >
                            <HandCoins className="w-4 h-4" />
                          </button>

                          {/* Receipts History */}
                          <button
                            onClick={() => viewSubscriberReceipts(customer.id)}
                            title="View Receipts & 80mm Thermal Slips"
                            className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-950/60 rounded-xl transition-colors cursor-pointer border border-purple-900/40"
                          >
                            <ReceiptText className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Reminder */}
                          <button
                            onClick={() => handleQuickReminder(customer)}
                            title="Send WhatsApp Reminder"
                            className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/60 rounded-xl transition-colors cursor-pointer border border-amber-900/40"
                          >
                            <BellRing className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => {
                              if (!isAdmin) {
                                showRoleRestrictionNotice(`Edit Subscriber "${customer.name}"`);
                                return;
                              }
                              handleOpenEdit(customer);
                            }}
                            title={isAdmin ? "Edit Subscriber" : "Admin role required to edit"}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-800"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (!isAdmin) {
                                showRoleRestrictionNotice(`Delete Subscriber "${customer.name}"`);
                                return;
                              }
                              handleDelete(customer.id, customer.name);
                            }}
                            title={isAdmin ? "Delete Subscriber" : "Admin role required to delete"}
                            className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer border border-rose-900/40"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modern Add / Edit Subscriber Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans">
          <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl border border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
                  <Users className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {editingCustomer ? 'Edit Broadband Subscriber' : 'Add New Broadband Subscriber'}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {editingCustomer ? editingCustomer.subscriberId : 'CAF & ONT Customer Record'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Subscriber ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subscriberId}
                    onChange={e => setFormData({ ...formData, subscriberId: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Activation Number (ONT Serial) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ACT-49102-FTTH"
                    value={formData.activationNumber}
                    onChange={e => setFormData({ ...formData, activationNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    WhatsApp Mobile Number *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-500 font-mono">+91</span>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                      className="w-full pl-11 pr-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Service Area / Zone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Sector 14, Downtown, etc."
                    value={formData.area}
                    onChange={e => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Connection Medium
                  </label>
                  <select
                    value={formData.connectionType}
                    onChange={e => setFormData({ ...formData, connectionType: e.target.value as ConnectionType })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="FTTH">FTTH (Fiber to the Home)</option>
                    <option value="Fiber">Fiber (Direct GPON)</option>
                    <option value="Copper">Copper / Ethernet</option>
                    <option value="Wireless">Wireless Broadband</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Installation Street Address
                  </label>
                  <input
                    type="text"
                    placeholder="Flat / House #, Building, Street"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.planName}
                    onChange={e => setFormData({ ...formData, planName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Bandwidth Speed (Mbps) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.speedMbps}
                    onChange={e => setFormData({ ...formData, speedMbps: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Monthly Fee ({settings.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.monthlyFee}
                    onChange={e => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-950 border border-slate-700 rounded-xl text-amber-300 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Expiry / Next Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as SubscriberStatus })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="due_today">Due Today</option>
                    <option value="due_soon">Due Soon</option>
                    <option value="overdue">Overdue</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Static IP / MAC (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="192.168.1.100"
                    value={formData.ipAddress}
                    onChange={e => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  {editingCustomer ? 'Update Subscriber' : 'Save Subscriber'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
