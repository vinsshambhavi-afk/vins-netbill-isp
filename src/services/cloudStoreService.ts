import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Customer, PaymentRecord, OperatorUser, ISPSettings } from '../types/isp';

// Live Render backend URL for cross-origin API requests
const API_BASE_URL = 'https://vinsnetbill-isp.onrender.com';

export interface CloudSyncStatus {
  isConfigured: boolean;
  isConnected: boolean;
  lastSyncedAt: string | null;
  syncedCustomersCount: number;
  syncedPaymentsCount: number;
  syncedOperatorsCount: number;
  isSyncing: boolean;
  errorMessage: string | null;
  mongoDbConfigured?: boolean;
}

export const CloudStoreService = {
  // Push all local data into Firebase Firestore Cloud Store
  async pushAllToCloud(
    customers: Customer[],
    payments: PaymentRecord[],
    operators: OperatorUser[],
    settings: ISPSettings
  ): Promise<{ success: boolean; message: string }> {
    try {
      const batch = writeBatch(db);

      // 1. Sync Settings
      const settingsRef = doc(db, 'settings', 'isp_profile');
      batch.set(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Sync Customers (up to batch limit)
      customers.slice(0, 450).forEach(customer => {
        const custRef = doc(db, 'customers', customer.id);
        batch.set(custRef, {
          ...customer,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      // 3. Sync Payments
      payments.slice(0, 450).forEach(payment => {
        const payRef = doc(db, 'payments', payment.id);
        batch.set(payRef, {
          ...payment,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      // 4. Sync Operators
      operators.forEach(operator => {
        const opRef = doc(db, 'operators', operator.id);
        batch.set(opRef, {
          ...operator,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      await batch.commit();

      return {
        success: true,
        message: `Successfully synchronized ${customers.length} subscribers, ${payments.length} receipts, and ${operators.length} operators to Firestore Cloud Store.`
      };
    } catch (err: any) {
      console.error('Firestore pushAllToCloud error:', err);
      return {
        success: false,
        message: err?.message || 'Failed to sync data to Firestore Cloud Store.'
      };
    }
  },

  // Pull all live data from Firestore Cloud Store
  async pullAllFromCloud(): Promise<{
    success: boolean;
    customers?: Customer[];
    payments?: PaymentRecord[];
    operators?: OperatorUser[];
    settings?: Partial<ISPSettings>;
    message: string;
  }> {
    try {
      // 1. Customers
      const custSnapshot = await getDocs(collection(db, 'customers'));
      const pulledCustomers: Customer[] = [];
      custSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        pulledCustomers.push({
          id: docSnap.id,
          ...data
        } as Customer);
      });

      // 2. Payments
      const paySnapshot = await getDocs(collection(db, 'payments'));
      const pulledPayments: PaymentRecord[] = [];
      paySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        pulledPayments.push({
          id: docSnap.id,
          ...data
        } as PaymentRecord);
      });

      // 3. Operators
      const opSnapshot = await getDocs(collection(db, 'operators'));
      const pulledOperators: OperatorUser[] = [];
      opSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        pulledOperators.push({
          id: docSnap.id,
          ...data
        } as OperatorUser);
      });

      // 4. Settings
      const setSnapshot = await getDocs(collection(db, 'settings'));
      let pulledSettings: Partial<ISPSettings> | undefined = undefined;
      setSnapshot.forEach(docSnap => {
        if (docSnap.id === 'isp_profile') {
          pulledSettings = docSnap.data() as Partial<ISPSettings>;
        }
      });

      return {
        success: true,
        customers: pulledCustomers.length > 0 ? pulledCustomers : undefined,
        payments: pulledPayments.length > 0 ? pulledPayments : undefined,
        operators: pulledOperators.length > 0 ? pulledOperators : undefined,
        settings: pulledSettings,
        message: `Fetched ${pulledCustomers.length} subscribers and ${pulledPayments.length} payments from Cloud Store.`
      };
    } catch (err: any) {
      console.error('Firestore pullAllFromCloud error:', err);
      return {
        success: false,
        message: err?.message || 'Failed to pull data from Firestore Cloud Store.'
      };
    }
  },

  // Direct MongoDB Atlas API sync methods with dual-gateway resilience
  async checkMongoHealth(): Promise<{ success: boolean; database?: string; connected: boolean; counts?: any; error?: string }> {
    try {
      const res = await fetch('/health');
      if (res.ok) return await res.json();
    } catch (_) {}

    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await res.json();
    } catch (e: any) {
      return { success: false, connected: false, error: e?.message || 'MongoDB API unavailable' };
    }
  },

  async pushToMongoApi(
    customers: Customer[],
    payments: PaymentRecord[],
    operators: OperatorUser[],
    settings: ISPSettings
  ): Promise<{ success: boolean; message: string }> {
    // 1. Try direct local backend route first
    try {
      const res = await fetch('/api/mongodb/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers, payments, operators, settings })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (localErr) {
      console.warn('Local MongoDB push endpoint unavailable, trying Render fallback:', localErr);
    }

    // 2. Fallback to Render backend API
    try {
      const res = await fetch(`${API_BASE_URL}/api/mongodb/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers, payments, operators, settings })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to connect to MongoDB proxy' };
    }
  },

  async pullFromMongoApi(): Promise<{
    success: boolean;
    customers?: Customer[];
    payments?: PaymentRecord[];
    operators?: OperatorUser[];
    settings?: Partial<ISPSettings>;
    message: string;
  }> {
    // 1. Try direct local backend route first (fastest, connected directly to MongoDB Atlas)
    try {
      const res = await fetch('/api/mongodb/pull');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.customers)) {
          return data;
        }
      }
    } catch (localErr) {
      console.warn('Local MongoDB pull endpoint unavailable, trying Render fallback:', localErr);
    }

    // 2. Fallback to Render backend API with timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${API_BASE_URL}/api/mongodb/pull`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to pull from MongoDB proxy' };
    }
  },

  // Generate MongoDB Atlas Compatible JSON document export
  generateMongoDbJson(
    customers: Customer[],
    payments: PaymentRecord[],
    operators: OperatorUser[],
    settings: ISPSettings
  ) {
    return {
      _meta: {
        engine: 'MongoDB Atlas / Cloud Document Store',
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      },
      settings_collection: [
        {
          _id: 'vinsnetbill_config',
          ...settings,
          updatedAt: { $date: new Date().toISOString() }
        }
      ],
      subscribers_collection: customers.map((c, i) => ({
        _id: `sub_${c.subscriberId.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i}`,
        ...c,
        indexedAt: { $date: new Date().toISOString() }
      })),
      payments_collection: payments.map((p, i) => ({
        _id: `pay_${p.receiptNo.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i}`,
        ...p,
        indexedAt: { $date: new Date().toISOString() }
      })),
      operators_collection: operators.map(o => ({
        _id: `op_${o.phone}`,
        ...o
      }))
    };
  }
};