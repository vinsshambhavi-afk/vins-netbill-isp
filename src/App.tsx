import React, { useEffect, useRef } from 'react';
import { ISPProvider, useISP } from './context/ISPContext';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CashRegisterView } from './components/CashRegisterView';
import { MonthlyRemindersView } from './components/MonthlyRemindersView';
import { SubscribersView } from './components/SubscribersView';
import { CashCollectorsView } from './components/CashCollectorsView';
import { ReceiptsView } from './components/ReceiptsView';
import { SettingsView } from './components/SettingsView';

// Modals
import { ReceiveCashModal } from './components/ReceiveCashModal';
import { WhatsAppReceiptModal } from './components/WhatsAppReceiptModal';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { PrintReceipt } from './components/PrintReceipt';
import { ClearSubscribersModal } from './components/ClearSubscribersModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { CashierStatementModal } from './components/CashierStatementModal';
import { ImportDatabaseModal } from './components/ImportDatabaseModal';
import { ImportSubscribersModal } from './components/ImportSubscribersModal';
import { CloudDatabaseModal } from './components/CloudDatabaseModal';
import { LoginModal } from './components/LoginModal';
import { LoginPage } from './components/LoginPage';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes auto-logout

function MainTerminal() {
  const {
    currentUser,
    currentTab,
    setCurrentTab,
    logout,
    loginWithOtp,
    isCashierStatementOpen,
    closeCashierStatement,
    cashierStatementInitialId,
    isCloudModalOpen,
    closeCloudModal,
    refreshFromCloud
  } = useISP();

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetInactivityTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (currentUser) {
      localStorage.setItem('vins_isp_login_time', Date.now().toString());
      timerRef.current = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleUserActivity = () => resetInactivityTimer();

    events.forEach(event => window.addEventListener(event, handleUserActivity));
    resetInactivityTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentUser]);

  const handleLoginSuccess = async (userData: any) => {
    const cleanPhone = (userData?.mobile || userData?.phone || '8147422496').replace(/\D/g, '').slice(-10);
    const resolvedName = userData?.name || (cleanPhone === '8147422496' ? 'VINSADMIN (Administrator)' : 'Admin');
    const role = (userData?.role === 'Admin Master' ? 'admin' : (userData?.role || 'admin'));

    loginWithOtp(cleanPhone, '4821', resolvedName, role);
    localStorage.setItem('vins_isp_user', JSON.stringify({
      ...userData,
      name: resolvedName,
      phone: cleanPhone,
      mobile: cleanPhone,
      role
    }));
    localStorage.setItem('vins_isp_login_time', Date.now().toString());

    // Load cloud records after login and refresh the subscriber list!
    await refreshFromCloud(true);
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* 1. Header Navigation Bar */}
      <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* 2. Main Tab View Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentTab === 'dashboard' && <DashboardView />}
        {currentTab === 'collections' && <CashRegisterView />}
        {currentTab === 'reminders' && <MonthlyRemindersView />}
        {currentTab === 'subscribers' && <SubscribersView />}
        {currentTab === 'collectors' && <CashCollectorsView />}
        {currentTab === 'receipts' && <ReceiptsView />}
        {currentTab === 'settings' && <SettingsView />}
      </main>

      {/* 3. Global Terminals & Modals */}
      <ReceiveCashModal />
      <WhatsAppReceiptModal />
      <ThermalReceiptModal />
      <PrintReceipt />
      <ClearSubscribersModal />
      <AdminAuthModal />
      <CashierStatementModal 
        isOpen={isCashierStatementOpen} 
        onClose={closeCashierStatement} 
        initialOperatorId={cashierStatementInitialId} 
      />
      <ImportDatabaseModal />
      <ImportSubscribersModal />
      <CloudDatabaseModal 
        isOpen={isCloudModalOpen} 
        onClose={closeCloudModal} 
      />
      <LoginModal />
    </div>
  );
}

export default function App() {
  return (
    <ISPProvider>
      <MainTerminal />
    </ISPProvider>
  );
}