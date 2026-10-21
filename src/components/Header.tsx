import React, { useState, useRef, useEffect } from 'react';
import { 
  Wifi, 
  Plus, 
  ReceiptText, 
  BellRing, 
  Users, 
  HandCoins, 
  Settings as SettingsIcon, 
  BarChart3, 
  ChevronDown, 
  RefreshCw, 
  LogOut,
  ShieldCheck,
  Check,
  Receipt,
  UserCheck,
  Database,
  Flame,
  Smartphone
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { NavTab } from '../types/isp';

export type { NavTab };

interface HeaderProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab }) => {
  const { 
    openReceiveCash, 
    customers, 
    currentUser, 
    openLoginModal, 
    logout,
    isAdmin,
    openImportDatabase,
    openCloudModal
  } = useISP();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsProfileDropdownOpen(false);
      }
    }

    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileDropdownOpen]);

  // Auto close dropdown when switching tabs (e.g. Cash, Reminders, Dashboard)
  useEffect(() => {
    setIsProfileDropdownOpen(false);
  }, [currentTab]);

  // Calculate urgent reminders count for indicator
  const todayDueCount = customers.filter(c => c.status === 'due_today' || c.status === 'overdue').length;

  return (
    <header className="bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 text-white sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Brand Wordmark & Logo */}
          <div 
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0 group"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-amber-500/40 shadow-lg shadow-amber-950/50 shrink-0 bg-slate-900 flex items-center justify-center transition-transform group-hover:scale-105">
              <img 
                src="/vinsnetbill_logo.jpg" 
                alt="VinsNetBill Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white whitespace-nowrap leading-tight flex items-center">
                <span>VinsNet</span><span className="text-emerald-400 font-black">Bill</span>
              </span>
              <span className="text-[10px] font-bold text-amber-400/90 tracking-widest uppercase -mt-0.5 font-mono">
                ISP Cloud Terminal
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1.5">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${currentTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentTab('collections')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                currentTab === 'collections'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <HandCoins className={`w-4 h-4 ${currentTab === 'collections' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>Cash Register</span>
            </button>

            <button
              onClick={() => setCurrentTab('reminders')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer relative ${
                currentTab === 'reminders'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <BellRing className={`w-4 h-4 ${currentTab === 'reminders' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>Reminders</span>
              {todayDueCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-slate-950 rounded-full tabular-nums">
                  {todayDueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('subscribers')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                currentTab === 'subscribers'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Users className={`w-4 h-4 ${currentTab === 'subscribers' ? 'text-sky-400' : 'text-slate-400'}`} />
              <span>Subscribers</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setCurrentTab('collectors')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  currentTab === 'collectors'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <UserCheck className={`w-4 h-4 ${currentTab === 'collectors' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>Collectors</span>
              </button>
            )}

            <button
              onClick={() => setCurrentTab('receipts')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                currentTab === 'receipts'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <ReceiptText className={`w-4 h-4 ${currentTab === 'receipts' ? 'text-purple-400' : 'text-slate-400'}`} />
              <span>Receipt History</span>
            </button>

            <button
              onClick={() => setCurrentTab('settings')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                currentTab === 'settings'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <SettingsIcon className={`w-4 h-4 ${currentTab === 'settings' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>Settings</span>
            </button>
          </nav>

          {/* Zone 3: Profile Dropdown + Cloud Pill + Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {currentUser && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Operator profile & session"
                >
                  <div className={`w-6 h-6 rounded-full text-slate-950 flex items-center justify-center font-bold text-[11px] ${
                    isAdmin ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}>
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left leading-tight">
                    <div className="font-bold text-white max-w-[120px] truncate">{currentUser.name}</div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 py-1 z-50 divide-y divide-slate-800/80 animate-in fade-in zoom-in-95"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    <div className="p-3 bg-slate-950/60">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white text-xs">{currentUser.name}</div>
                          <div className="font-mono text-[11px] text-slate-400 mt-0.5">+91 {currentUser.phone}</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {isAdmin ? 'Admin' : 'Collector'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{currentUser.agency || 'ISP Desk'}</div>
                    </div>

                    <div className="p-1">
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            openImportDatabase();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-300 hover:bg-slate-800/80 rounded-xl text-left transition-colors font-semibold"
                        >
                          <Database className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Import Entire Database (JSON)</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          openCloudModal();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-300 hover:bg-slate-800/80 rounded-xl text-left transition-colors font-semibold"
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>Cloud Store (Firebase & MongoDB)</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          openLoginModal();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/80 rounded-xl text-left transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                        <span>Switch Account / Sign In with SMS OTP</span>
                      </button>
                    </div>

                    <div className="p-1">
                      <button
                        onClick={() => {
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-xl text-left font-medium transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        <span>Log Out of VinsNetBill</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cloud Store Pill Button */}
            <button
              type="button"
              onClick={openCloudModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-amber-300 text-xs font-bold border border-amber-500/40 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Firebase Cloud Database & MongoDB Store - Click to Sync"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="hidden sm:inline text-slate-200">Cloud</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>

            <button
              onClick={() => openReceiveCash()}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 hover:brightness-110 active:brightness-95 rounded-xl shadow-lg shadow-emerald-950/50 transition-all whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Receive Cash</span>
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Subnav */}
        <div className="lg:hidden flex items-center justify-between gap-1.5 py-2.5 border-t border-slate-800/80 overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold text-xs transition-colors ${
                currentTab === 'dashboard' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentTab('collections')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold text-xs transition-colors ${
                currentTab === 'collections' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cash
            </button>
            <button
              onClick={() => setCurrentTab('reminders')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold text-xs transition-colors flex items-center gap-1 ${
                currentTab === 'reminders' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              Reminders
              {todayDueCount > 0 && <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 rounded-full">{todayDueCount}</span>}
            </button>
            <button
              onClick={() => setCurrentTab('subscribers')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold text-xs transition-colors ${
                currentTab === 'subscribers' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              Subscribers
            </button>
            {isAdmin && (
              <button
                onClick={() => setCurrentTab('collectors')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold text-xs transition-colors ${
                  currentTab === 'collectors' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
                }`}
              >
                Collectors
              </button>
            )}
            <button
              onClick={() => setCurrentTab('receipts')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold text-xs transition-colors ${
                currentTab === 'receipts' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              Receipts
            </button>
            <button
              onClick={() => setCurrentTab('settings')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold text-xs transition-colors ${
                currentTab === 'settings' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
