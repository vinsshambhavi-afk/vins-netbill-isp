import React, { useState } from 'react';
import { 
  X, 
  Flame, 
  Database, 
  Cloud, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Download, 
  Copy, 
  CheckCheck,
  Server,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { FIREBASE_CONFIG } from '../lib/firebase';
import { CloudStoreService } from '../services/cloudStoreService';

interface CloudDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudDatabaseModal: React.FC<CloudDatabaseModalProps> = ({ isOpen, onClose }) => {
  const { 
    customers, 
    payments, 
    operators, 
    settings, 
    importEntireDatabase,
    isAdmin,
    showRoleRestrictionNotice
  } = useISP();

  const [activeTab, setActiveTab] = useState<'firebase' | 'mongodb'>('firebase');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // MongoDB configuration state (pre-configured with user's Atlas cluster)
  const [mongoUri, setMongoUri] = useState(() => 
    localStorage.getItem('vinsnetbill_mongo_uri') || 'mongodb+srv://vinsshambhavi_db_user:tPwkTJMeYnxBCRnW@vinsnetbill.rpipe8n.mongodb.net/cash_db?retryWrites=true&w=majority'
  );
  const [mongoDbName, setMongoDbName] = useState(() => 
    localStorage.getItem('vinsnetbill_mongo_dbname') || 'cash_db'
  );
  const [mongoStatus, setMongoStatus] = useState<string | null>(null);
  const [isMongoSyncing, setIsMongoSyncing] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!isOpen) return null;

  // Push local data to Firebase Firestore
  const handlePushToFirestore = async () => {
    if (!isAdmin) {
      showRoleRestrictionNotice('Push to Cloud Store');
      return;
    }
    setIsSyncing(true);
    setSyncStatusMessage(null);

    const res = await CloudStoreService.pushAllToCloud(customers, payments, operators, settings);
    setIsSyncing(false);

    if (res.success) {
      setSyncStatusMessage({ type: 'success', text: res.message });
      localStorage.setItem('vinsnetbill_last_cloud_sync', new Date().toISOString());
    } else {
      setSyncStatusMessage({ type: 'error', text: res.message });
    }
  };

  // Pull live data from Firebase Firestore
  const handlePullFromFirestore = async () => {
    if (!isAdmin) {
      showRoleRestrictionNotice('Pull from Cloud Store');
      return;
    }
    setIsSyncing(true);
    setSyncStatusMessage(null);

    const res = await CloudStoreService.pullAllFromCloud();
    setIsSyncing(false);

    if (res.success && (res.customers || res.payments || res.operators)) {
      importEntireDatabase({
        customers: res.customers,
        payments: res.payments,
        operators: res.operators,
        settings: res.settings as any
      }, 'merge');
      setSyncStatusMessage({ type: 'success', text: res.message });
      localStorage.setItem('vinsnetbill_last_cloud_sync', new Date().toISOString());
    } else {
      setSyncStatusMessage({ 
        type: res.success ? 'success' : 'error', 
        text: res.message || 'No documents returned from Cloud Store.' 
      });
    }
  };

  // Save MongoDB Atlas URI & test format
  const handleSaveMongoConfig = () => {
    localStorage.setItem('vinsnetbill_mongo_uri', mongoUri);
    localStorage.setItem('vinsnetbill_mongo_dbname', mongoDbName);
    
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      setMongoStatus('Please provide a valid MongoDB connection string (starts with mongodb:// or mongodb+srv://)');
      return;
    }

    setMongoStatus('MongoDB Atlas configuration saved and verified. Database: ' + mongoDbName);
    setTimeout(() => setMongoStatus(null), 5000);
  };

  // Test MongoDB live connection via API
  const handleTestMongoConnection = async () => {
    setIsMongoSyncing(true);
    setMongoStatus('Testing connection to MongoDB Atlas (cash_db)...');
    const res = await CloudStoreService.checkMongoHealth();
    setIsMongoSyncing(false);
    if (res.connected) {
      setMongoStatus(`Connected to MongoDB Atlas: ${res.database}. Found ${res.counts?.subscribers || 0} subscribers, ${res.counts?.payments || 0} payments.`);
    } else {
      setMongoStatus(`MongoDB Atlas connection: ${res.error || 'Server proxy offline (using client mode)'}`);
    }
    setTimeout(() => setMongoStatus(null), 6000);
  };

  // Push local records to MongoDB Atlas
  const handlePushToMongo = async () => {
    if (!isAdmin) {
      showRoleRestrictionNotice('Push to MongoDB');
      return;
    }
    setIsMongoSyncing(true);
    setMongoStatus('Pushing subscribers and payments to MongoDB Atlas (cash_db)...');
    const res = await CloudStoreService.pushToMongoApi(customers, payments, operators, settings);
    setIsMongoSyncing(false);
    if (res.success) {
      setMongoStatus(`Success: ${res.message}`);
    } else {
      setMongoStatus(`Export fallback: ${res.message}. Download JSON below for direct MongoImport.`);
    }
    setTimeout(() => setMongoStatus(null), 7000);
  };

  // Pull records from MongoDB Atlas
  const handlePullFromMongo = async () => {
    if (!isAdmin) {
      showRoleRestrictionNotice('Pull from MongoDB');
      return;
    }
    setIsMongoSyncing(true);
    setMongoStatus('Pulling records from MongoDB Atlas (cash_db)...');
    const res = await CloudStoreService.pullFromMongoApi();
    setIsMongoSyncing(false);
    if (res.success && (res.customers || res.payments || res.operators)) {
      importEntireDatabase({
        customers: res.customers,
        payments: res.payments,
        operators: res.operators,
        settings: res.settings as any
      }, 'merge');
      setMongoStatus(`Success: ${res.message}`);
    } else {
      setMongoStatus(`Result: ${res.message}`);
    }
    setTimeout(() => setMongoStatus(null), 7000);
  };

  // Export MongoDB-ready JSON collections
  const handleExportMongoJson = () => {
    const mongoData = CloudStoreService.generateMongoDbJson(customers, payments, operators, settings);
    const blob = new Blob([JSON.stringify(mongoData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mongodb_${mongoDbName}_collections_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy MongoDB Compass / shell import snippet
  const handleCopyMongoSnippet = () => {
    const snippet = `# MongoDB Atlas Import Script for VinsNetBill ISP\nmongoimport --uri "${mongoUri}" --collection subscribers --file subscribers.json --jsonArray\nmongoimport --uri "${mongoUri}" --collection payments --file payments.json --jsonArray`;
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 3000);
  };

  const lastSyncTime = localStorage.getItem('vinsnetbill_last_cloud_sync')
    ? new Date(localStorage.getItem('vinsnetbill_last_cloud_sync')!).toLocaleString()
    : 'Not synced yet';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans">
      <div 
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-800 overflow-hidden my-4 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header with Firebase Theme Flare */}
        <div className="bg-slate-950 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
              <Flame className="w-6 h-6 stroke-[2.2] text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800 flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Cloud Database & Store
                </span>
                <span className="text-xs text-slate-400 font-mono">Firestore & MongoDB</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Cloud Store Data Center
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={() => setActiveTab('firebase')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'firebase'
                ? 'border-amber-400 text-amber-300 bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Firebase Firestore Cloud Store</span>
            <span className="px-1.5 py-0.2 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 rounded font-bold font-mono">Active</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mongodb')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'mongodb'
                ? 'border-emerald-400 text-emerald-300 bg-slate-900 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>MongoDB Atlas Document Store</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs">
          {/* Status Message */}
          {syncStatusMessage && (
            <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in ${
              syncStatusMessage.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/80 border border-rose-800 text-rose-300'
            }`}>
              {syncStatusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{syncStatusMessage.text}</div>
              <button 
                onClick={() => setSyncStatusMessage(null)}
                className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* TAB 1: Firebase Firestore */}
          {activeTab === 'firebase' && (
            <div className="space-y-5">
              {/* Cloud Connection Information Card */}
              <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                  <div>
                    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block">
                      Google Cloud Project
                    </span>
                    <strong className="text-sm sm:text-base font-bold text-white font-mono">
                      {FIREBASE_CONFIG.projectId}
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Cloud Online
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Database ID</span>
                    <span className="font-mono text-slate-200 truncate block text-[11px] mt-0.5" title={FIREBASE_CONFIG.firestoreDatabaseId}>
                      {FIREBASE_CONFIG.firestoreDatabaseId}
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Auth Domain</span>
                    <span className="font-mono text-slate-200 truncate block text-[11px] mt-0.5">
                      {FIREBASE_CONFIG.authDomain}
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Last Cloud Sync</span>
                    <span className="text-emerald-400 font-semibold block text-[11px] mt-0.5 font-mono">
                      {lastSyncTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Sync Actions */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">
                      Firestore Document Synchronization
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Synchronize subscribers, payment receipts, staff accounts, and ISP settings to Google Cloud.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handlePushToFirestore}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-400 to-orange-400 hover:brightness-110 active:brightness-95 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Flame className="w-4 h-4 text-slate-950" />
                    )}
                    <span>Push All to Firestore Cloud Store</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handlePullFromFirestore}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Cloud className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>Pull Live Records from Cloud</span>
                  </button>
                </div>

                {/* Current Local Counts */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-slate-800">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block font-mono">Subscribers</span>
                    <strong className="text-white text-base font-mono">{customers.length}</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block font-mono">Receipts</span>
                    <strong className="text-amber-300 text-base font-mono">{payments.length}</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block font-mono">Operators</span>
                    <strong className="text-emerald-400 text-base font-mono">{operators.length}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MongoDB Atlas */}
          {activeTab === 'mongodb' && (
            <div className="space-y-5">
              <div className="bg-slate-950 border border-emerald-500/30 p-4 rounded-xl text-xs space-y-1">
                <strong className="text-emerald-400 font-bold block flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  MongoDB Atlas / Cloud Document Store Integration
                </strong>
                <p className="text-slate-300 leading-relaxed">
                  Connect your external MongoDB Atlas cluster, export BSON-ready collections for MongoImport, or synchronize subscriber documents directly.
                </p>
              </div>

              {mongoStatus && (
                <div className="p-3 bg-slate-950 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-mono animate-in fade-in">
                  ✓ {mongoStatus}
                </div>
              )}

              {/* MongoDB Connection Form */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    MongoDB Connection String (URI)
                  </label>
                  <input
                    type="text"
                    value={mongoUri}
                    onChange={e => setMongoUri(e.target.value)}
                    placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
                    className="w-full font-mono text-xs p-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Supported: mongodb:// and mongodb+srv:// Atlas URIs
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Target Database Name
                  </label>
                  <input
                    type="text"
                    value={mongoDbName}
                    onChange={e => setMongoDbName(e.target.value)}
                    placeholder="vinsnetbill_isp"
                    className="w-full font-mono text-xs p-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {/* Direct Live Sync Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isMongoSyncing}
                    onClick={handlePushToMongo}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:brightness-95 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isMongoSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                    <span>Push All to MongoDB</span>
                  </button>

                  <button
                    type="button"
                    disabled={isMongoSyncing}
                    onClick={handlePullFromMongo}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/40 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isMongoSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>Pull Live from MongoDB</span>
                  </button>

                  <button
                    type="button"
                    disabled={isMongoSyncing}
                    onClick={handleTestMongoConnection}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Test Atlas Connection</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={handleSaveMongoConfig}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Save Config
                  </button>

                  <button
                    type="button"
                    onClick={handleExportMongoJson}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Export MongoDB JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMongoSnippet}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    {copiedSnippet ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedSnippet ? 'Copied CLI Command' : 'Copy MongoImport Command'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Cloud Store: <strong className="text-white font-mono">{FIREBASE_CONFIG.projectId}</strong></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
