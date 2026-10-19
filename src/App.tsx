import React, { useState, useEffect, useRef } from 'react';
import { LoginPage } from './components/LoginPage';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings as SettingsIcon, 
  Cloud, 
  LogOut, 
  Shield 
} from 'lucide-react';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes auto-logout

export default function App() {
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('vins_isp_user');
    const loginTime = localStorage.getItem('vins_isp_login_time');
    
    if (saved && loginTime) {
      const elapsed = Date.now() - parseInt(loginTime, 10);
      if (elapsed < INACTIVITY_TIMEOUT_MS) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.mobile) return parsed;
        } catch (e) {
          console.error('Error parsing user session', e);
        }
      }
    }
    localStorage.removeItem('vins_isp_user');
    localStorage.removeItem('vins_isp_login_time');
    return null;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'subscribers' | 'receipts' | 'settings'>('dashboard');
  const [settings, setSettings] = useState<any>({
    ispName: 'VinsNetBill ISP',
    currency: '₹',
    taxRate: 0
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetInactivityTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (user) {
      localStorage.setItem('vins_isp_login_time', Date.now().toString());
      timerRef.current = setTimeout(() => {
        handleLogout();
        alert('Session expired due to 10 minutes of inactivity. Please log in with your mobile OTP.');
      }, INACTIVITY_TIMEOUT_MS);
    }
  };

  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleUserActivity = () => resetInactivityTimer();

    events.forEach(event => window.addEventListener(event, handleUserActivity));
    resetInactivityTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user]);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    localStorage.setItem('vins_isp_user', JSON.stringify(userData));
    localStorage.setItem('vins_isp_login_time', Date.now().toString());
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vins_isp_user');
    localStorage.removeItem('vins_isp_login_time');
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveTab('dashboard');
  };

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">VinsNetBill</h1>
            <p className="text-xs text-slate-400">ISP Cloud Terminal</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80">
          <button
            onClick={() => { setActiveTab('dashboard'); resetInactivityTimer(); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => { setActiveTab('subscribers'); resetInactivityTimer(); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'subscribers' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Subscribers
          </button>
          <button
            onClick={() => { setActiveTab('receipts'); resetInactivityTimer(); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'receipts' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Receipt History
          </button>
          <button
            onClick={() => { setActiveTab('settings'); resetInactivityTimer(); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'settings' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-medium text-slate-200">{user.name || 'Admin'} (+91 {user.mobile})</span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">VinsNetBill Broadband Executive Dashboard</h2>
                  <p className="text-xs text-slate-400 mt-1">Real-time DLT SMS verification & automatic session security.</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-400 flex items-center gap-2">
                  <Cloud className="w-3.5 h-3.5" />
                  Firebase & Render Live
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <p className="text-xs font-medium text-slate-400">Monthly Collections</p>
                <h3 className="text-2xl font-bold mt-2">₹0</h3>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <p className="text-xs font-medium text-slate-400">Physical Cash in Hand</p>
                <h3 className="text-2xl font-bold mt-2">₹0</h3>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <p className="text-xs font-medium text-slate-400">Pending Renewal Dues</p>
                <h3 className="text-2xl font-bold mt-2">₹0</h3>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <p className="text-xs font-medium text-slate-400">Subscribers Base</p>
                <h3 className="text-2xl font-bold mt-2">0</h3>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscribers' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Subscribers Management</h2>
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No subscribers found in database.</p>
            </div>
          </div>
        )}

        {activeTab === 'receipts' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Receipt History</h2>
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No past receipts found.</p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl">
            <h2 className="text-lg font-bold mb-4">ISP Terminal Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">ISP Business Name</label>
                <input 
                  type="text" 
                  value={settings.ispName}
                  onChange={(e) => setSettings({...settings, ispName: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" 
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}