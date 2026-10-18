import React, { useState } from 'react';
import { ISPProvider } from './context/ISPContext';
import { Header, NavTab } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CashRegisterView } from './components/CashRegisterView';
import { MonthlyRemindersView } from './components/MonthlyRemindersView';
import { SubscribersView } from './components/SubscribersView';
import { ReceiptsView } from './components/ReceiptsView';
import { SettingsView } from './components/SettingsView';
import { ReceiveCashModal } from './components/ReceiveCashModal';
import { WhatsAppReceiptModal } from './components/WhatsAppReceiptModal';
import { PrintReceipt } from './components/PrintReceipt';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { LoginModal } from './components/LoginModal';
import { ImportSubscribersModal } from './components/ImportSubscribersModal';

import { LoginPage } from './components/LoginPage';
import { CashCollectorsView } from './components/CashCollectorsView';
import { ClearSubscribersModal } from './components/ClearSubscribersModal';
import { CashierStatementModal } from './components/CashierStatementModal';
import { ImportDatabaseModal } from './components/ImportDatabaseModal';
import { CloudDatabaseModal } from './components/CloudDatabaseModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { useISP } from './context/ISPContext';

function AppContent() {
  const { 
    currentUser, 
    currentTab, 
    setCurrentTab,
    isCashierStatementOpen,
    closeCashierStatement,
    cashierStatementInitialId,
    isCloudModalOpen,
    closeCloudModal
  } = useISP();

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col font-sans relative selection:bg-amber-400 selection:text-slate-950">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/[0.03] rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none -z-10"></div>

      <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && <DashboardView />}
        {currentTab === 'collections' && <CashRegisterView />}
        {currentTab === 'reminders' && <MonthlyRemindersView />}
        {currentTab === 'subscribers' && <SubscribersView />}
        {currentTab === 'collectors' && <CashCollectorsView />}
        {currentTab === 'receipts' && <ReceiptsView />}
        {currentTab === 'settings' && <SettingsView />}
      </main>

      {/* Global Action Modals, Security Modals & Print Component */}
      <ReceiveCashModal />
      <WhatsAppReceiptModal />
      <ThermalReceiptModal />
      <PrintReceipt />
      <LoginModal />
      <ImportSubscribersModal />
      <ImportDatabaseModal />
      <CloudDatabaseModal 
        isOpen={isCloudModalOpen} 
        onClose={closeCloudModal} 
      />
      <ClearSubscribersModal />
      <AdminAuthModal />
      <CashierStatementModal 
        isOpen={isCashierStatementOpen} 
        onClose={closeCashierStatement} 
        initialOperatorId={cashierStatementInitialId} 
      />

      {/* Modern Executive Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold text-slate-300">VinsNetBill ISP Terminal</span>
            <span>·</span>
            <span>Broadband Cash Collection & DLT SMS Billing Engine</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>Firebase Cloud Store</span>
            <span>·</span>
            <span>80mm Thermal Slip</span>
            <span>·</span>
            <span>Telecom DLT SMS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ISPProvider>
      <AppContent />
    </ISPProvider>
  );
}
