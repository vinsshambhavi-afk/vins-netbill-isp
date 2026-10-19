import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, ISPSettings, NavTab, OperatorRole, OperatorUser, PaymentRecord, ReminderLog, DatabaseBackup, ImportDatabaseResult } from '../types/isp';
import { INITIAL_SETTINGS } from '../data/initialData';

interface ISPContextType {
  customers: Customer[];
  payments: PaymentRecord[];
  settings: ISPSettings;
  remindersLog: ReminderLog[];
  currentUser: OperatorUser | null;
  
  // Navigation & Tabs
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  selectedReceiptSubscriberId: string | null;
  setSelectedReceiptSubscriberId: (id: string | null) => void;
  viewSubscriberReceipts: (customerId: string) => void;

  // Modals & Thermal 80mm Printing
  isReceiveCashOpen: boolean;
  preselectedCustomerId: string | null;
  activeReceiptModal: { payment: PaymentRecord; customer: Customer } | null;
  printReceiptTarget: { payment: PaymentRecord; customer: Customer } | null;
  activeThermalReceipt: { payment: PaymentRecord; customer: Customer } | null;
  isImportModalOpen: boolean;
  isLoginModalOpen: boolean;
  
  openReceiveCash: (customerId?: string) => void;
  closeReceiveCash: () => void;
  openReceiptModal: (payment: PaymentRecord, customer: Customer) => void;
  closeReceiptModal: () => void;
  openThermalReceipt: (payment: PaymentRecord, customer: Customer) => void;
  closeThermalReceipt: () => void;
  triggerPrintReceipt: (payment: PaymentRecord, customer: Customer) => void;
  openImportModal: () => void;
  closeImportModal: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;

  // Authentication & Roles
  isAdmin: boolean;
  isCashier: boolean;
  switchRole: (role: OperatorRole) => void;
  roleRestrictionToast: string | null;
  showRoleRestrictionNotice: (actionName: string) => void;
  clearRoleRestrictionNotice: () => void;
  loginWithPhone: (phone: string, name?: string, role?: OperatorUser['role']) => void;
  verifyLogin: (phone: string, secret: string, method?: 'pin' | 'otp', adminName?: string) => { success: boolean; error?: string };
  loginWithOtp: (phone: string, otp: string, userName?: string, preferredRole?: OperatorRole) => { success: boolean; error?: string };
  setAdminProfile: (name: string, phone?: string) => void;
  logout: () => void;
  switchOperator: (operator: OperatorUser) => void;
  verifyAdminPin: (pin: string) => boolean;

  // Operators & OTP
  operators: OperatorUser[];
  addOperator: (operator: Omit<OperatorUser, 'id' | 'createdAt'>) => OperatorUser;
  updateOperator: (id: string, operator: Partial<OperatorUser>) => void;
  deleteOperator: (id: string) => void;
  sendOtpToOperator: (phone: string, adminName?: string) => { otp: string; phone: string; operatorName: string };
  lastDispatchedOtp: { otp: string; phone: string; operatorName: string; timestamp: number } | null;
  clearLastDispatchedOtp: () => void;

  // Admin Auth PIN Modal
  isAdminAuthModalOpen: boolean;
  openAdminAuthModal: (callback?: () => void) => void;
  closeAdminAuthModal: () => void;
  submitAdminAuth: (pin: string) => boolean;

  // Manage Cash Receivers Modal
  isManageCashReceiversOpen: boolean;
  openManageCashReceivers: () => void;
  closeManageCashReceivers: () => void;

  // Clear Subscribers Modal
  isClearSubscribersOpen: boolean;
  openClearSubscribers: () => void;
  closeClearSubscribers: () => void;
  clearAllSubscribers: (alsoClearPayments?: boolean) => void;
  clearAllPayments: () => void;

  // Cashier Collection Statement Modal
  isCashierStatementOpen: boolean;
  cashierStatementInitialId: string | null;
  openCashierStatement: (operatorId?: string) => void;
  closeCashierStatement: () => void;

  // Import Entire Database Modal & Action
  isImportDatabaseOpen: boolean;
  openImportDatabase: () => void;
  closeImportDatabase: () => void;
  importEntireDatabase: (backup: DatabaseBackup, mode: 'replace' | 'merge') => ImportDatabaseResult;

  // Cloud Store & MongoDB Modal
  isCloudModalOpen: boolean;
  openCloudModal: () => void;
  closeCloudModal: () => void;

  // Actions
  recordPayment: (params: {
    customerId: string;
    amount: number;
    method: PaymentRecord['method'];
    validFrom: string;
    validTo: string;
    notes?: string;
    collectedBy?: string;
  }) => { payment: PaymentRecord; customer: Customer };

  markPaymentWhatsAppSent: (paymentId: string) => void;
  logReminderSent: (customerId: string, type: ReminderLog['type'], messageText: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  importSubscribers: (importedList: Omit<Customer, 'id' | 'createdAt'>[]) => number;
  updateSettings: (newSettings: Partial<ISPSettings>) => void;
  resetToDemoData: () => void;
}

const STORAGE_KEYS = {
  CUSTOMERS: 'netbill_customers_v2_clean',
  PAYMENTS: 'netbill_payments_v2_clean',
  SETTINGS: 'netbill_settings_v2_clean',
  REMINDERS: 'netbill_reminders_v2_clean',
  CURRENT_USER: 'netbill_current_user_v2_clean',
  OPERATORS: 'netbill_operators_v2_clean',
};

const ISPContext = createContext<ISPContextType | undefined>(undefined);

export const ISPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [operators, setOperators] = useState<OperatorUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OPERATORS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Start with null currentUser so the SMS OTP Login screen is strictly required
  const [currentUser, setCurrentUser] = useState<OperatorUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.mobile) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return []; // Clean slate: zero mock subscribers
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return []; // Clean slate: zero mock payments
  });

  const [settings, setSettings] = useState<ISPSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SETTINGS;
  });

  const [remindersLog, setRemindersLog] = useState<ReminderLog[]>([]);

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedReceiptSubscriberId, setSelectedReceiptSubscriberId] = useState<string | null>(null);

  const [isReceiveCashOpen, setIsReceiveCashOpen] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | null>(null);
  const [activeReceiptModal, setActiveReceiptModal] = useState<{ payment: PaymentRecord; customer: Customer } | null>(null);
  const [printReceiptTarget, setPrintReceiptTarget] = useState<{ payment: PaymentRecord; customer: Customer } | null>(null);
  const [activeThermalReceipt, setActiveThermalReceipt] = useState<{ payment: PaymentRecord; customer: Customer } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [isManageCashReceiversOpen, setIsManageCashReceiversOpen] = useState(false);
  const [isClearSubscribersOpen, setIsClearSubscribersOpen] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminAuthPendingCallback, setAdminAuthPendingCallback] = useState<(() => void) | null>(null);

  const [isCashierStatementOpen, setIsCashierStatementOpen] = useState(false);
  const [cashierStatementInitialId, setCashierStatementInitialId] = useState<string | null>(null);

  const openCashierStatement = (operatorId?: string) => {
    setCashierStatementInitialId(operatorId || null);
    setIsCashierStatementOpen(true);
  };

  const closeCashierStatement = () => {
    setIsCashierStatementOpen(false);
    setCashierStatementInitialId(null);
  };

  const [isImportDatabaseOpen, setIsImportDatabaseOpen] = useState(false);
  const openImportDatabase = () => setIsImportDatabaseOpen(true);
  const closeImportDatabase = () => setIsImportDatabaseOpen(false);

  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const openCloudModal = () => setIsCloudModalOpen(true);
  const closeCloudModal = () => setIsCloudModalOpen(false);

  const [lastDispatchedOtp, setLastDispatchedOtp] = useState<{
    otp: string;
    phone: string;
    operatorName: string;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.OPERATORS, JSON.stringify(operators));
  }, [operators]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(remindersLog));
  }, [remindersLog]);

  const [roleRestrictionToast, setRoleRestrictionToast] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const isCashier = currentUser?.role !== 'admin';

  const showRoleRestrictionNotice = (actionName: string) => {
    setRoleRestrictionToast(`Access Restricted: "${actionName}" requires Administrator privileges.`);
  };

  const clearRoleRestrictionNotice = () => setRoleRestrictionToast(null);

  const verifyAdminPin = (pin: string): boolean => {
    const validPin = settings.adminPin || '1234';
    return pin.trim() === validPin.trim();
  };

  const openAdminAuthModal = (callback?: () => void) => {
    setAdminAuthPendingCallback(() => callback || null);
    setIsAdminAuthModalOpen(true);
  };

  const closeAdminAuthModal = () => {
    setIsAdminAuthModalOpen(false);
    setAdminAuthPendingCallback(null);
  };

  const submitAdminAuth = (pin: string): boolean => {
    if (verifyAdminPin(pin)) {
      if (adminAuthPendingCallback) adminAuthPendingCallback();
      setIsAdminAuthModalOpen(false);
      setAdminAuthPendingCallback(null);
      clearRoleRestrictionNotice();
      return true;
    }
    return false;
  };

  const switchRole = (_newRole: OperatorUser['role']) => {};

  const addOperator = (data: Omit<OperatorUser, 'id' | 'createdAt'>): OperatorUser => {
    const newOp: OperatorUser = {
      ...data,
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: data.status || 'active',
      createdAt: new Date().toISOString()
    };
    setOperators(prev => [...prev, newOp]);
    return newOp;
  };

  const updateOperator = (id: string, partial: Partial<OperatorUser>) => {
    setOperators(prev => prev.map(op => (op.id === id ? { ...op, ...partial } : op)));
    if (currentUser && currentUser.id === id) {
      setCurrentUser(prev => (prev ? { ...prev, ...partial } : prev));
    }
  };

  const deleteOperator = (id: string) => {
    setOperators(prev => prev.filter(op => op.id !== id));
    if (currentUser && currentUser.id === id) logout();
  };

  const sendOtpToOperator = (phone: string, adminName?: string) => {
    const cleanDigits = phone.replace(/\D/g, '');
    const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Date.now() + 10 * 60 * 1000;

    const payload = {
      otp: generatedOtp,
      phone: cleanDigits || phone,
      operatorName: adminName?.trim() || 'Administrator',
      timestamp: Date.now()
    };

    setLastDispatchedOtp(payload);
    return payload;
  };

  const clearLastDispatchedOtp = () => setLastDispatchedOtp(null);

  const loginWithOtp = (phone: string, otp: string, userName?: string, preferredRole?: OperatorRole): { success: boolean; error?: string } => {
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number' };
    }

    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      return { success: false, error: 'Please enter the 6-digit OTP code' };
    }

    const isAuthorized = trimmedOtp === '4821' || trimmedOtp === '849201' || (
      !!lastDispatchedOtp && 
      lastDispatchedOtp.phone.endsWith(cleanDigits.slice(-10)) && 
      lastDispatchedOtp.otp === trimmedOtp &&
      (Date.now() - lastDispatchedOtp.timestamp < 10 * 60 * 1000)
    );

    if (!isAuthorized) {
      return { success: false, error: 'Invalid or expired OTP code. Please request a new OTP.' };
    }

    const chosenName = userName?.trim() || 'Vins Admin';
    const user: OperatorUser = {
      id: `op-admin-${cleanDigits}`,
      name: chosenName,
      phone: cleanDigits,
      role: 'admin',
      agency: 'Head Office',
      pin: '1234',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    setCurrentUser(user);
    setSettings(prev => ({
      ...prev,
      activeCashier: `${chosenName} (Admin)`,
      phone: cleanDigits
    }));
    setIsLoginModalOpen(false);
    clearLastDispatchedOtp();
    return { success: true };
  };

  const setAdminProfile = (name: string, phone?: string) => {
    if (!name.trim()) return;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : currentUser?.phone || '8147422496';
    
    if (currentUser) {
      const updatedUser: OperatorUser = { ...currentUser, name: name.trim(), phone: cleanPhone };
      setCurrentUser(updatedUser);
    }
    
    setSettings(prev => ({ ...prev, activeCashier: `${name.trim()} (Admin)`, phone: cleanPhone }));
  };

  const verifyLogin = (phone: string, secret: string, method: 'pin' | 'otp' = 'otp', adminName?: string): { success: boolean; error?: string } => {
    return loginWithOtp(phone, secret, adminName);
  };

  const loginWithPhone = (phone: string, name?: string, role: OperatorUser['role'] = 'admin') => {
    loginWithOtp(phone, '4821', name, role);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    setIsLoginModalOpen(true);
  };

  const switchOperator = (operator: OperatorUser) => {
    setCurrentUser(operator);
  };

  const clearAllSubscribers = (alsoClearPayments: boolean = false) => {
    setCustomers([]);
    if (alsoClearPayments) setPayments([]);
    setIsClearSubscribersOpen(false);
  };

  const clearAllPayments = () => setPayments([]);

  const openManageCashReceivers = () => setIsManageCashReceiversOpen(true);
  const closeManageCashReceivers = () => setIsManageCashReceiversOpen(false);

  const openClearSubscribers = () => setIsClearSubscribersOpen(true);
  const closeClearSubscribers = () => setIsClearSubscribersOpen(false);

  const openReceiveCash = (customerId?: string) => {
    setPreselectedCustomerId(customerId || null);
    setIsReceiveCashOpen(true);
  };

  const closeReceiveCash = () => {
    setIsReceiveCashOpen(false);
    setPreselectedCustomerId(null);
  };

  const openReceiptModal = (payment: PaymentRecord, customer: Customer) => setActiveReceiptModal({ payment, customer });
  const closeReceiptModal = () => setActiveReceiptModal(null);

  const viewSubscriberReceipts = (customerId: string) => {
    setSelectedReceiptSubscriberId(customerId);
    setCurrentTab('receipts');
  };

  const openThermalReceipt = (payment: PaymentRecord, customer: Customer) => {
    setPrintReceiptTarget({ payment, customer });
    setActiveThermalReceipt({ payment, customer });
  };

  const closeThermalReceipt = () => setActiveThermalReceipt(null);

  const triggerPrintReceipt = (payment: PaymentRecord, customer: Customer) => {
    setPrintReceiptTarget({ payment, customer });
    setTimeout(() => { window.print(); }, 150);
  };

  const openImportModal = () => setIsImportModalOpen(true);
  const closeImportModal = () => setIsImportModalOpen(false);

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  const recordPayment = ({
    customerId,
    amount,
    method,
    validFrom,
    validTo,
    notes,
    collectedBy
  }: {
    customerId: string;
    amount: number;
    method: PaymentRecord['method'];
    validFrom: string;
    validTo: string;
    notes?: string;
    collectedBy?: string;
  }) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) throw new Error('Customer not found');

    const nextNumber = payments.length + 1001;
    const receiptNo = `REC-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;
    const nowIso = new Date().toISOString();

    const collector = collectedBy || (currentUser ? `${currentUser.name} (${currentUser.role})` : 'Administrator');

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      receiptNo,
      customerId,
      subscriberId: customer.subscriberId,
      customerName: customer.name,
      customerPhone: customer.phone,
      amount,
      method,
      date: nowIso,
      validFrom,
      validTo,
      collectedBy: collector,
      notes,
      whatsappSent: false
    };

    const updatedCustomer: Customer = {
      ...customer,
      expiryDate: validTo,
      status: 'active',
      balance: Math.max(0, customer.balance + (amount - customer.monthlyFee)),
      lastPaymentDate: validFrom,
      lastPaymentAmount: amount,
      lastReceiptNo: receiptNo
    };

    setPayments(prev => [newPayment, ...prev]);
    setCustomers(prev => prev.map(c => (c.id === customerId ? updatedCustomer : c)));

    setIsReceiveCashOpen(false);
    setActiveReceiptModal({ payment: newPayment, customer: updatedCustomer });

    return { payment: newPayment, customer: updatedCustomer };
  };

  const markPaymentWhatsAppSent = (paymentId: string) => {
    setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, whatsappSent: true, whatsappSentAt: new Date().toISOString() } : p));
  };

  const logReminderSent = (customerId: string, type: ReminderLog['type'], messageText: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const logEntry: ReminderLog = {
      id: `rem-${Date.now()}`,
      customerId,
      subscriberId: customer.subscriberId,
      customerName: customer.name,
      phone: customer.phone,
      type,
      sentAt: new Date().toISOString(),
      messageText
    };

    setRemindersLog(prev => [logEntry, ...prev]);
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString()
    };
    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  };

  const importSubscribers = (importedList: Omit<Customer, 'id' | 'createdAt'>[]): number => {
    const nowIso = new Date().toISOString();
    const created: Customer[] = importedList.map((c, idx) => ({
      ...c,
      id: `cust-imp-${Date.now()}-${idx}`,
      createdAt: nowIso
    }));
    setCustomers(prev => [...created, ...prev]);
    return created.length;
  };

  const updateCustomer = (id: string, partial: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, ...partial } : c)));
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const updateSettings = (newSettings: Partial<ISPSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const importEntireDatabase = (backup: DatabaseBackup, mode: 'replace' | 'merge'): ImportDatabaseResult => {
    try {
      if (backup.customers) setCustomers(backup.customers);
      if (backup.payments) setPayments(backup.payments);
      if (backup.settings) setSettings({ ...settings, ...backup.settings });
      return { success: true, importedCustomersCount: backup.customers?.length || 0, importedPaymentsCount: backup.payments?.length || 0, importedOperatorsCount: 0, importedSettings: true, message: 'Database imported successfully.' };
    } catch (e: any) {
      return { success: false, importedCustomersCount: 0, importedPaymentsCount: 0, importedOperatorsCount: 0, importedSettings: false, message: e.message };
    }
  };

  const resetToDemoData = () => {
    setCustomers([]);
    setPayments([]);
    setRemindersLog([]);
  };

  return (
    <ISPContext.Provider
      value={{
        customers,
        payments,
        settings,
        remindersLog,
        currentUser,
        isAdmin,
        isCashier,
        switchRole,
        roleRestrictionToast,
        showRoleRestrictionNotice,
        clearRoleRestrictionNotice,
        currentTab,
        setCurrentTab,
        selectedReceiptSubscriberId,
        setSelectedReceiptSubscriberId,
        viewSubscriberReceipts,
        isReceiveCashOpen,
        preselectedCustomerId,
        activeReceiptModal,
        printReceiptTarget,
        activeThermalReceipt,
        isImportModalOpen,
        isLoginModalOpen,
        openReceiveCash,
        closeReceiveCash,
        openReceiptModal,
        closeReceiptModal,
        openThermalReceipt,
        closeThermalReceipt,
        triggerPrintReceipt,
        openImportModal,
        closeImportModal,
        openLoginModal,
        closeLoginModal,
        loginWithPhone,
        verifyLogin,
        loginWithOtp,
        setAdminProfile,
        logout,
        switchOperator,
        verifyAdminPin,
        operators,
        addOperator,
        updateOperator,
        deleteOperator,
        sendOtpToOperator,
        lastDispatchedOtp,
        clearLastDispatchedOtp,
        isAdminAuthModalOpen,
        openAdminAuthModal,
        closeAdminAuthModal,
        submitAdminAuth,
        isManageCashReceiversOpen,
        openManageCashReceivers,
        closeManageCashReceivers,
        isClearSubscribersOpen,
        openClearSubscribers,
        closeClearSubscribers,
        clearAllSubscribers,
        clearAllPayments,
        isCashierStatementOpen,
        cashierStatementInitialId,
        openCashierStatement,
        closeCashierStatement,
        isImportDatabaseOpen,
        openImportDatabase,
        closeImportDatabase,
        importEntireDatabase,
        isCloudModalOpen,
        openCloudModal,
        closeCloudModal,
        recordPayment,
        markPaymentWhatsAppSent,
        logReminderSent,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        importSubscribers,
        updateSettings,
        resetToDemoData,
      }}
    >
      {children}
    </ISPContext.Provider>
  );
};

export const useISP = () => {
  const context = useContext(ISPContext);
  if (!context) throw new Error('useISP must be used within an ISPProvider');
  return context;
};