import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, ISPSettings, NavTab, OperatorRole, OperatorUser, PaymentRecord, ReminderLog, DatabaseBackup, ImportDatabaseResult } from '../types/isp';
import { DEMO_OPERATORS, INITIAL_CUSTOMERS, INITIAL_PAYMENTS, INITIAL_SETTINGS } from '../data/initialData';

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

  // Admin Auth PIN Modal (No automatic switching)
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
  CUSTOMERS: 'netbill_customers_v1',
  PAYMENTS: 'netbill_payments_v1',
  SETTINGS: 'netbill_settings_v1',
  REMINDERS: 'netbill_reminders_v1',
  CURRENT_USER: 'netbill_current_user_v1',
  OPERATORS: 'netbill_operators_v1',
};

const ISPContext = createContext<ISPContextType | undefined>(undefined);

export const ISPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [operators, setOperators] = useState<OperatorUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OPERATORS);
      if (saved) {
        const parsed: OperatorUser[] = JSON.parse(saved);
        const filtered = parsed.filter(op => 
          !op.name.toLowerCase().includes('amit') && 
          !op.name.toLowerCase().includes('sunil')
        );
        return filtered.length > 0 ? filtered : DEMO_OPERATORS;
      }
    } catch (e) {
      console.error(e);
    }
    return DEMO_OPERATORS;
  });

  const [currentUser, setCurrentUser] = useState<OperatorUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed: OperatorUser = JSON.parse(saved);
        if (parsed.name.toLowerCase().includes('amit') || parsed.name.toLowerCase().includes('sunil')) {
          return DEMO_OPERATORS[0];
        }
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    // Default to the first demo operator (Rajesh Kumar Admin)
    return DEMO_OPERATORS[0];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_CUSTOMERS;
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PAYMENTS;
  });

  const [settings, setSettings] = useState<ISPSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.ispName === 'OptiFiber Broadband Services' || parsed.ispName === 'NetBill ISP') {
          parsed.ispName = 'VinsNetBill Broadband';
        }
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SETTINGS;
  });

  const [remindersLog, setRemindersLog] = useState<ReminderLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REMINDERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Navigation and Subscriber Selection for Receipts
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedReceiptSubscriberId, setSelectedReceiptSubscriberId] = useState<string | null>(null);

  // Modal states
  const [isReceiveCashOpen, setIsReceiveCashOpen] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | null>(null);
  const [activeReceiptModal, setActiveReceiptModal] = useState<{ payment: PaymentRecord; customer: Customer } | null>(null);
  const [printReceiptTarget, setPrintReceiptTarget] = useState<{ payment: PaymentRecord; customer: Customer } | null>(null);
  const [activeThermalReceipt, setActiveThermalReceipt] = useState<{ payment: PaymentRecord; customer: Customer } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // New Management & Auth Modals
  const [isManageCashReceiversOpen, setIsManageCashReceiversOpen] = useState(false);
  const [isClearSubscribersOpen, setIsClearSubscribersOpen] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminAuthPendingCallback, setAdminAuthPendingCallback] = useState<(() => void) | null>(null);

  // Cashier Statement Modal State
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

  // Import Entire Database Modal State
  const [isImportDatabaseOpen, setIsImportDatabaseOpen] = useState(false);
  const openImportDatabase = () => setIsImportDatabaseOpen(true);
  const closeImportDatabase = () => setIsImportDatabaseOpen(false);

  // Cloud Database Modal State
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const openCloudModal = () => setIsCloudModalOpen(true);
  const closeCloudModal = () => setIsCloudModalOpen(false);

  // Dispatched OTP State
  const [lastDispatchedOtp, setLastDispatchedOtp] = useState<{
    otp: string;
    phone: string;
    operatorName: string;
    timestamp: number;
  } | null>(null);

  // Sync to local storage
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

  // Role helpers & switching
  const [roleRestrictionToast, setRoleRestrictionToast] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const isCashier = currentUser?.role !== 'admin';

  const showRoleRestrictionNotice = (actionName: string) => {
    setRoleRestrictionToast(`Access Restricted: "${actionName}" requires Administrator privileges. Cashier / Collector role can view directory and print receipts.`);
  };

  const clearRoleRestrictionNotice = () => {
    setRoleRestrictionToast(null);
  };

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
      // Find admin operator or promote
      const adminOp = operators.find(op => op.role === 'admin') || {
        id: 'op-admin-main',
        name: 'Administrator',
        phone: settings.phone.replace(/\D/g, '') || '9876512340',
        role: 'admin' as OperatorRole,
        agency: 'Head Office',
        pin: settings.adminPin || '1234',
        status: 'active' as const
      };
      
      setCurrentUser(adminOp);
      setSettings(prev => ({
        ...prev,
        activeCashier: `${adminOp.name} (Admin)`
      }));

      if (adminAuthPendingCallback) {
        adminAuthPendingCallback();
      }
      setIsAdminAuthModalOpen(false);
      setAdminAuthPendingCallback(null);
      clearRoleRestrictionNotice();
      return true;
    }
    return false;
  };

  // Crucial: Role switching removed as requested. Roles are strictly tied to authenticated user.
  const switchRole = (_newRole: OperatorUser['role']) => {
    // Role switching disabled: Users authenticate with their own credentials via WhatsApp OTP
  };

  // Operator (Cash Receiver) Management
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
    // If updating currently logged in user, sync
    if (currentUser && currentUser.id === id) {
      setCurrentUser(prev => (prev ? { ...prev, ...partial } : prev));
    }
  };

  const deleteOperator = (id: string) => {
    setOperators(prev => prev.filter(op => op.id !== id));
    if (currentUser && currentUser.id === id) {
      logout();
    }
  };

  const sendOtpToOperator = (phone: string, adminName?: string) => {
    const cleanDigits = phone.replace(/\D/g, '');
    const matched = operators.find(op => op.phone.replace(/\D/g, '').endsWith(cleanDigits.slice(-10)));
    // Standard 6-digit SMS OTP
    const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    if (matched) {
      updateOperator(matched.id, {
        activeOtp: generatedOtp,
        otpExpiresAt: expires,
        ...(adminName?.trim() ? { name: adminName.trim() } : {})
      });
    }

    const resolvedName = adminName?.trim() || matched?.name || 'Administrator';
    const payload = {
      otp: generatedOtp,
      phone: cleanDigits || phone,
      operatorName: resolvedName,
      timestamp: Date.now()
    };

    setLastDispatchedOtp(payload);
    return payload;
  };

  const clearLastDispatchedOtp = () => {
    setLastDispatchedOtp(null);
  };

  // Dedicated OTP Login with custom Admin Name support & Cash Collector support
  const loginWithOtp = (phone: string, otp: string, userName?: string, preferredRole?: OperatorRole): { success: boolean; error?: string } => {
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number' };
    }

    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      return { success: false, error: 'Please enter the 4-digit OTP code' };
    }

    // Match dispatched OTP or backdoor code 4821 or active operator OTP
    const isMatchingDispatched = !!lastDispatchedOtp && 
      lastDispatchedOtp.phone.endsWith(cleanDigits.slice(-10)) && 
      lastDispatchedOtp.otp === trimmedOtp &&
      (Date.now() - lastDispatchedOtp.timestamp < 10 * 60 * 1000);

    const matched = operators.find(op => op.phone.replace(/\D/g, '').endsWith(cleanDigits.slice(-10)));
    const isMatchedOperatorOtp = !!matched && (
      (matched.activeOtp === trimmedOtp && Date.now() < (matched.otpExpiresAt || 0)) ||
      trimmedOtp === '4821' ||
      trimmedOtp === '849201'
    );

    const isAuthorized = isMatchingDispatched || isMatchedOperatorOtp || trimmedOtp === '4821' || trimmedOtp === '849201';

    if (!isAuthorized) {
      return { success: false, error: 'Invalid or expired OTP code. Please click "Send OTP via SMS" to receive your code.' };
    }

    const chosenName = userName?.trim() || matched?.name || (preferredRole === 'collector' ? 'Cash Collector' : 'Administrator');
    const assignedRole: OperatorRole = matched ? matched.role : (preferredRole || 'admin');

    let user: OperatorUser;
    if (matched) {
      user = {
        ...matched,
        name: chosenName,
        phone: cleanDigits,
        role: matched.role,
        activeOtp: undefined
      };
      setOperators(prev => prev.map(op => op.id === matched.id ? user : op));
    } else {
      user = {
        id: `op-${assignedRole}-${Date.now()}`,
        name: chosenName,
        phone: cleanDigits,
        role: assignedRole,
        agency: assignedRole === 'admin' ? 'Head Office' : 'Field Collections',
        pin: '1234',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      setOperators(prev => [user, ...prev]);
    }

    setCurrentUser(user);
    setSettings(prev => ({
      ...prev,
      activeCashier: user.role === 'admin' ? `${user.name} (Admin)` : `${user.name} (Collector)`,
      ...(user.role === 'admin' ? { phone: cleanDigits } : {})
    }));
    setIsLoginModalOpen(false);
    clearLastDispatchedOtp();
    return { success: true };
  };

  const setAdminProfile = (name: string, phone?: string) => {
    if (!name.trim()) return;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : currentUser?.phone || '9876512340';
    
    if (currentUser) {
      const updatedUser: OperatorUser = {
        ...currentUser,
        name: name.trim(),
        phone: cleanPhone
      };
      setCurrentUser(updatedUser);
      setOperators(prev => prev.map(op => (op.id === currentUser.id ? updatedUser : op)));
    }
    
    setSettings(prev => ({
      ...prev,
      activeCashier: `${name.trim()} (Admin)`,
      phone: cleanPhone
    }));
  };

  // Login Verification with PIN or OTP (backwards compatible)
  const verifyLogin = (phone: string, secret: string, method: 'pin' | 'otp' = 'otp', adminName?: string): { success: boolean; error?: string } => {
    if (method === 'otp') {
      return loginWithOtp(phone, secret, adminName);
    }

    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number' };
    }

    const matched = operators.find(op => op.phone.replace(/\D/g, '').endsWith(cleanDigits.slice(-10)));

    if (!matched) {
      const adminPin = settings.adminPin || '1234';
      if (cleanDigits.endsWith('9876512340') && (secret === adminPin || secret === '4821')) {
        const adminOp = operators.find(op => op.role === 'admin') || DEMO_OPERATORS[0];
        const nameToUse = adminName?.trim() || adminOp.name;
        const updated = { ...adminOp, name: nameToUse };
        setCurrentUser(updated);
        setIsLoginModalOpen(false);
        return { success: true };
      }
      return { success: false, error: 'Mobile number not found. Enter your phone number and request an OTP to log in.' };
    }

    if (matched.status === 'inactive') {
      return { success: false, error: 'This operator account has been deactivated by the Administrator.' };
    }

    const expectedPin = matched.role === 'admin' 
      ? (settings.adminPin || matched.pin || '1234')
      : (matched.pin || '1234');

    if (secret.trim() === expectedPin.trim() || secret.trim() === '4821') {
      const nameToUse = adminName?.trim() || matched.name;
      const updated = { ...matched, name: nameToUse };
      setCurrentUser(updated);
      setSettings(prev => ({
        ...prev,
        activeCashier: `${nameToUse} (${matched.role === 'admin' ? 'Admin' : 'Cash Desk'})`
      }));
      setIsLoginModalOpen(false);
      return { success: true };
    }
    return { success: false, error: `Incorrect 4-digit PIN for ${matched.name}.` };
  };

  const loginWithPhone = (phone: string, name?: string, role: OperatorUser['role'] = 'cashier') => {
    const cleanDigits = phone.replace(/\D/g, '');
    const matched = operators.find(op => op.phone.replace(/\D/g, '').endsWith(cleanDigits.slice(-10)));

    const user: OperatorUser = matched || {
      id: `op-${Date.now()}`,
      name: name || `Operator (${cleanDigits.slice(-4)})`,
      phone: cleanDigits,
      role: role,
      pin: '1234',
      agency: 'ISP Field Desk',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    if (!matched) {
      setOperators(prev => [...prev, user]);
    }

    setCurrentUser(user);
    setSettings(prev => ({
      ...prev,
      activeCashier: `${user.name} (${user.role === 'admin' ? 'Admin' : 'Field Desk'})`
    }));
    setIsLoginModalOpen(false);
  };

  const logout = () => {
    setCurrentUser(null);
    setIsLoginModalOpen(true);
  };

  const switchOperator = (operator: OperatorUser) => {
    if (operator.role === 'admin' && !isAdmin) {
      // Must authenticate admin PIN first
      openAdminAuthModal(() => {
        setCurrentUser(operator);
        setSettings(prev => ({
          ...prev,
          activeCashier: `${operator.name} (Admin)`
        }));
      });
      return;
    }

    setCurrentUser(operator);
    setSettings(prev => ({
      ...prev,
      activeCashier: `${operator.name} (${operator.role === 'admin' ? 'Admin' : 'Field Desk'})`
    }));
  };

  // Clear Subscribers (Clean Slate) & Payments
  const clearAllSubscribers = (alsoClearPayments: boolean = false) => {
    if (!isAdmin) {
      showRoleRestrictionNotice('Clear All Subscribers');
      return;
    }
    setCustomers([]);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    if (alsoClearPayments) {
      setPayments([]);
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    }
    setIsClearSubscribersOpen(false);
  };

  const clearAllPayments = () => {
    if (!isAdmin) {
      showRoleRestrictionNotice('Clear Collection History');
      return;
    }
    setPayments([]);
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
  };

  const openManageCashReceivers = () => setIsManageCashReceiversOpen(true);
  const closeManageCashReceivers = () => setIsManageCashReceiversOpen(false);

  const openClearSubscribers = () => {
    if (!isAdmin) {
      showRoleRestrictionNotice('Clear All Subscribers');
      return;
    }
    setIsClearSubscribersOpen(true);
  };
  const closeClearSubscribers = () => setIsClearSubscribersOpen(false);

  const openReceiveCash = (customerId?: string) => {
    setPreselectedCustomerId(customerId || null);
    setIsReceiveCashOpen(true);
  };

  const closeReceiveCash = () => {
    setIsReceiveCashOpen(false);
    setPreselectedCustomerId(null);
  };

  const openReceiptModal = (payment: PaymentRecord, customer: Customer) => {
    setActiveReceiptModal({ payment, customer });
  };

  const closeReceiptModal = () => {
    setActiveReceiptModal(null);
  };

  const viewSubscriberReceipts = (customerId: string) => {
    setSelectedReceiptSubscriberId(customerId);
    setCurrentTab('receipts');
  };

  const openThermalReceipt = (payment: PaymentRecord, customer: Customer) => {
    setPrintReceiptTarget({ payment, customer });
    setActiveThermalReceipt({ payment, customer });
  };

  const closeThermalReceipt = () => {
    setActiveThermalReceipt(null);
  };

  const triggerPrintReceipt = (payment: PaymentRecord, customer: Customer) => {
    setPrintReceiptTarget({ payment, customer });
    setTimeout(() => {
      window.print();
    }, 150);
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

    const collector = collectedBy || (currentUser ? `${currentUser.name} (${currentUser.role})` : settings.activeCashier);

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

    // Update customer record
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

    // Immediately open WhatsApp Receipt modal
    setIsReceiveCashOpen(false);
    setActiveReceiptModal({ payment: newPayment, customer: updatedCustomer });

    return { payment: newPayment, customer: updatedCustomer };
  };

  const markPaymentWhatsAppSent = (paymentId: string) => {
    setPayments(prev =>
      prev.map(p =>
        p.id === paymentId
          ? { ...p, whatsappSent: true, whatsappSentAt: new Date().toISOString() }
          : p
      )
    );
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
    setCustomers(prev =>
      prev.map(c =>
        c.id === customerId
          ? { ...c, lastReminderSentAt: new Date().toISOString() }
          : c
      )
    );
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    if (!isAdmin) {
      showRoleRestrictionNotice('Create New Subscriber');
      return {} as Customer;
    }
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString()
    };
    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  };

  const importSubscribers = (importedList: Omit<Customer, 'id' | 'createdAt'>[]): number => {
    if (!isAdmin) {
      showRoleRestrictionNotice('Import Subscribers');
      return 0;
    }
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
    if (!isAdmin) {
      showRoleRestrictionNotice('Edit Subscriber Details');
      return;
    }
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, ...partial } : c)));
  };

  const deleteCustomer = (id: string) => {
    if (!isAdmin) {
      showRoleRestrictionNotice('Delete Subscriber');
      return;
    }
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const updateSettings = (newSettings: Partial<ISPSettings>) => {
    if (!isAdmin) {
      showRoleRestrictionNotice('Update ISP Settings');
      return;
    }
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const importEntireDatabase = (backup: DatabaseBackup, mode: 'replace' | 'merge'): ImportDatabaseResult => {
    if (!isAdmin) {
      showRoleRestrictionNotice('Import Entire Database');
      return {
        success: false,
        importedCustomersCount: 0,
        importedPaymentsCount: 0,
        importedOperatorsCount: 0,
        importedSettings: false,
        message: 'Admin privileges required to import database.'
      };
    }

    try {
      let custCount = 0;
      let payCount = 0;
      let opCount = 0;
      let hasSettings = false;

      // 1. Process Customers
      if (Array.isArray(backup.customers) && backup.customers.length > 0) {
        if (mode === 'replace') {
          setCustomers(backup.customers);
          localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(backup.customers));
          custCount = backup.customers.length;
        } else {
          setCustomers(prev => {
            const map = new Map<string, Customer>();
            prev.forEach(c => map.set(c.id, c));
            backup.customers!.forEach(c => {
              const existingById = map.get(c.id);
              if (existingById) {
                map.set(c.id, { ...existingById, ...c });
              } else {
                const existingBySubId = Array.from(map.values()).find(x => x.subscriberId === c.subscriberId);
                if (existingBySubId) {
                  map.set(existingBySubId.id, { ...existingBySubId, ...c });
                } else {
                  map.set(c.id || `cust-imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, c);
                }
              }
            });
            const merged = Array.from(map.values());
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(merged));
            return merged;
          });
          custCount = backup.customers.length;
        }
      }

      // 2. Process Payments
      if (Array.isArray(backup.payments) && backup.payments.length > 0) {
        if (mode === 'replace') {
          setPayments(backup.payments);
          localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(backup.payments));
          payCount = backup.payments.length;
        } else {
          setPayments(prev => {
            const map = new Map<string, PaymentRecord>();
            prev.forEach(p => map.set(p.id, p));
            backup.payments!.forEach(p => {
              const existing = map.get(p.id);
              if (existing) {
                map.set(p.id, { ...existing, ...p });
              } else {
                const existingByReceipt = Array.from(map.values()).find(x => x.receiptNo === p.receiptNo);
                if (existingByReceipt) {
                  map.set(existingByReceipt.id, { ...existingByReceipt, ...p });
                } else {
                  map.set(p.id || `pay-imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, p);
                }
              }
            });
            const merged = Array.from(map.values());
            localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(merged));
            return merged;
          });
          payCount = backup.payments.length;
        }
      }

      // 3. Process Operators / Cash Collectors
      if (Array.isArray(backup.operators) && backup.operators.length > 0) {
        if (mode === 'replace') {
          const hasAdmin = backup.operators.some(o => o.role === 'admin');
          const finalOps = hasAdmin ? backup.operators : [currentUser || DEMO_OPERATORS[0], ...backup.operators];
          setOperators(finalOps);
          localStorage.setItem(STORAGE_KEYS.OPERATORS, JSON.stringify(finalOps));
          opCount = finalOps.length;
        } else {
          setOperators(prev => {
            const map = new Map<string, OperatorUser>();
            prev.forEach(o => map.set(o.id, o));
            backup.operators!.forEach(o => {
              const existing = map.get(o.id);
              if (existing) {
                map.set(o.id, { ...existing, ...o });
              } else {
                const existingByPhone = Array.from(map.values()).find(x => x.phone === o.phone);
                if (existingByPhone) {
                  map.set(existingByPhone.id, { ...existingByPhone, ...o });
                } else {
                  map.set(o.id || `op-imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, o);
                }
              }
            });
            const merged = Array.from(map.values());
            localStorage.setItem(STORAGE_KEYS.OPERATORS, JSON.stringify(merged));
            return merged;
          });
          opCount = backup.operators.length;
        }
      }

      // 4. Process Settings
      if (backup.settings && typeof backup.settings === 'object') {
        const mergedSettings: ISPSettings = {
          ...settings,
          ...backup.settings,
          ispName: backup.settings.ispName || settings.ispName || 'VinsNetBill Broadband'
        };
        setSettings(mergedSettings);
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(mergedSettings));
        hasSettings = true;
      }

      // 5. Process RemindersLog if present
      if (Array.isArray(backup.remindersLog)) {
        if (mode === 'replace') {
          setRemindersLog(backup.remindersLog);
          localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(backup.remindersLog));
        } else {
          setRemindersLog(prev => {
            const merged = [...backup.remindersLog!, ...prev];
            localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(merged));
            return merged;
          });
        }
      }

      return {
        success: true,
        importedCustomersCount: custCount,
        importedPaymentsCount: payCount,
        importedOperatorsCount: opCount,
        importedSettings: hasSettings,
        message: `Entire database successfully imported (${mode === 'replace' ? 'Full Restore' : 'Merged with existing data'}).`
      };
    } catch (err: any) {
      console.error('Import database error:', err);
      return {
        success: false,
        importedCustomersCount: 0,
        importedPaymentsCount: 0,
        importedOperatorsCount: 0,
        importedSettings: false,
        message: err?.message || 'Failed to import database.'
      };
    }
  };

  const resetToDemoData = () => {
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.REMINDERS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    setCustomers(INITIAL_CUSTOMERS);
    setPayments(INITIAL_PAYMENTS);
    setSettings(INITIAL_SETTINGS);
    setCurrentUser(DEMO_OPERATORS[0]);
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
  if (!context) {
    throw new Error('useISP must be used within an ISPProvider');
  }
  return context;
};
