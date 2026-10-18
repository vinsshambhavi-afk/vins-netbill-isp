import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Download, 
  Check, 
  AlertCircle, 
  Database, 
  Users, 
  ReceiptText, 
  ShieldCheck, 
  Building, 
  RefreshCw, 
  ArrowRight,
  AlertTriangle,
  FileCode,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { DatabaseBackup, ImportDatabaseResult } from '../types/isp';

export const ImportDatabaseModal: React.FC = () => {
  const { 
    isImportDatabaseOpen, 
    closeImportDatabase, 
    importEntireDatabase, 
    settings,
    customers,
    payments,
    operators
  } = useISP();

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawJsonText, setRawJsonText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedBackup, setParsedBackup] = useState<DatabaseBackup | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportDatabaseResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isImportDatabaseOpen) return null;

  // Validate and parse raw JSON text
  const inspectAndSetJson = (text: string, fileName?: string) => {
    setParseError(null);
    setImportResult(null);

    if (!text.trim()) {
      setParsedBackup(null);
      return;
    }

    try {
      const data = JSON.parse(text);
      if (typeof data !== 'object' || data === null) {
        throw new Error('JSON root must be an object');
      }

      // Check structure
      const hasCustomers = Array.isArray(data.customers);
      const hasPayments = Array.isArray(data.payments);
      const hasSettings = typeof data.settings === 'object' && data.settings !== null;
      const hasOperators = Array.isArray(data.operators);

      if (!hasCustomers && !hasPayments && !hasSettings) {
        throw new Error('Invalid database format: JSON must contain at least "customers", "payments", or "settings" properties.');
      }

      setParsedBackup(data as DatabaseBackup);
      if (fileName) {
        setSelectedFileName(fileName);
      }
    } catch (err: any) {
      setParsedBackup(null);
      setParseError(err?.message || 'Invalid JSON syntax. Please verify file format.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setRawJsonText(content);
      inspectAndSetJson(content, file.name);
    };
    reader.onerror = () => {
      setParseError('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleTemplate = () => {
    const sample: DatabaseBackup = {
      settings: {
        ...settings,
        ispName: 'Sample City Fiber Networks',
        tagline: 'High-Speed Broadband Internet',
        phone: '9876512340',
        supportPhone: '1800-123-4567',
        currencySymbol: '₹',
        address: '100 Telecom Center, Fiber Lane, Bangalore',
        activeCashier: 'Rajesh Kumar (Admin)',
        adminPin: '1234'
      },
      customers: [
        {
          id: 'cust-demo-sample-1',
          subscriberId: 'OPT-2026-901',
          activationNumber: 'ACT-98124-FTTH',
          name: 'Pooja Hegde',
          phone: '9876543210',
          area: 'Sector 14',
          address: 'Flat 402 Green Heights',
          planName: 'Fiber Blast 100 Mbps',
          speedMbps: 100,
          monthlyFee: 699,
          billingDay: 1,
          expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'active',
          balance: 0,
          connectionType: 'FTTH',
          createdAt: new Date().toISOString()
        }
      ],
      payments: [
        {
          id: 'pay-demo-sample-1',
          receiptNo: 'VNB-2026-9001',
          customerId: 'cust-demo-sample-1',
          customerName: 'Pooja Hegde',
          customerPhone: '9876543210',
          subscriberId: 'OPT-2026-901',
          amount: 699,
          date: new Date().toISOString(),
          method: 'Cash',
          validFrom: new Date().toISOString().split('T')[0],
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          collectedBy: 'Rajesh Kumar (Admin)',
          whatsappSent: true
        }
      ],
      operators: operators.length > 0 ? operators : [
        {
          id: 'op-sample-1',
          name: 'Rajesh Kumar',
          phone: '9876512340',
          role: 'admin',
          agency: 'ISP Operations',
          dailyTarget: 25000,
          status: 'active'
        }
      ],
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'VinsNetBill_Sample_Database_Template.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteImport = () => {
    if (!parsedBackup) return;

    setIsProcessing(true);
    setTimeout(() => {
      try {
        const result = importEntireDatabase(parsedBackup, importMode);
        setImportResult(result);
        setIsProcessing(false);
      } catch (err: any) {
        setIsProcessing(false);
        setParseError(err?.message || 'Import execution failed.');
      }
    }, 400);
  };

  const handleClose = () => {
    setParsedBackup(null);
    setParseError(null);
    setRawJsonText('');
    setSelectedFileName(null);
    setImportResult(null);
    closeImportDatabase();
  };

  // Compute metrics for inspected backup
  const backupStats = parsedBackup ? {
    subscribersCount: Array.isArray(parsedBackup.customers) ? parsedBackup.customers.length : 0,
    paymentsCount: Array.isArray(parsedBackup.payments) ? parsedBackup.payments.length : 0,
    operatorsCount: Array.isArray(parsedBackup.operators) ? parsedBackup.operators.length : 0,
    ispName: parsedBackup.settings?.ispName || 'Default Settings',
    totalRevenue: Array.isArray(parsedBackup.payments) 
      ? parsedBackup.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) 
      : 0,
    exportedAt: parsedBackup.exportedAt ? new Date(parsedBackup.exportedAt).toLocaleString() : 'Recent'
  } : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans">
      <div 
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-800 overflow-hidden my-4 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-slate-950 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-slate-950 shadow-md shrink-0">
              <Database className="w-6 h-6 stroke-[2.2] text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                  Database Management
                </span>
                <span className="text-xs text-slate-400 font-mono">JSON Full Restore</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Import Entire Database
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs">
          {/* Success Result View */}
          {importResult?.success ? (
            <div className="p-6 bg-slate-950 border border-emerald-500/40 rounded-2xl text-center space-y-4 animate-in fade-in">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Database Imported Successfully!
                </h3>
                <p className="text-xs sm:text-sm text-emerald-400 mt-1 max-w-md mx-auto">
                  {importResult.message}
                </p>
              </div>

              {/* Statistics of imported items */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto pt-2">
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 shadow-md">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Subscribers</span>
                  <strong className="text-lg text-emerald-400 font-mono">{importResult.importedCustomersCount}</strong>
                </div>
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 shadow-md">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Payments</span>
                  <strong className="text-lg text-amber-300 font-mono">{importResult.importedPaymentsCount}</strong>
                </div>
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 shadow-md">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Staff</span>
                  <strong className="text-lg text-white font-mono">{importResult.importedOperatorsCount}</strong>
                </div>
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 shadow-md">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Settings</span>
                  <strong className="text-lg text-emerald-400 font-mono">{importResult.importedSettings ? 'Updated' : 'Kept'}</strong>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Done & Return to Terminal
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Top Description & Sample Template Download */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs">
                <div className="space-y-0.5">
                  <strong className="text-white font-bold block">
                    Restore or Migrate Your ISP Billing Database
                  </strong>
                  <span className="text-slate-400">
                    Import subscribers ledger, cash collections, receipt history, staff/collectors, and billing settings in a single step.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 rounded-xl font-semibold shadow-xs shrink-0 transition-colors cursor-pointer"
                  title="Download sample JSON file to see structure"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sample JSON Template</span>
                </button>
              </div>

              {/* Error Alert */}
              {parseError && (
                <div className="p-3.5 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Error Reading Database:</strong>
                    <span>{parseError}</span>
                  </div>
                </div>
              )}

              {/* Tab Selector: Upload File vs Paste JSON */}
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'bg-slate-950 hover:bg-slate-850 text-slate-400 border border-slate-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Backup File (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'bg-slate-950 hover:bg-slate-850 text-slate-400 border border-slate-800'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Paste JSON Text</span>
                </button>
              </div>

              {/* Tab 1: Upload File */}
              {activeTab === 'upload' && (
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-950 hover:bg-slate-850 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-900 group-hover:bg-emerald-950 text-slate-400 group-hover:text-emerald-400 flex items-center justify-center mx-auto mb-3 transition-colors border border-slate-800">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-white">
                      {selectedFileName ? (
                        <span className="text-emerald-400 font-mono">{selectedFileName}</span>
                      ) : (
                        <span>Click to browse or drop your <strong className="text-emerald-400 font-mono">.json</strong> backup file</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Accepts standard VinsNetBill JSON database backups or custom formatted exports
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Paste JSON Text */}
              {activeTab === 'paste' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Paste raw JSON string
                  </label>
                  <textarea
                    rows={8}
                    value={rawJsonText}
                    onChange={e => {
                      setRawJsonText(e.target.value);
                      inspectAndSetJson(e.target.value);
                    }}
                    placeholder='{"settings": {...}, "customers": [...], "payments": [...], "operators": [...]}'
                    className="w-full font-mono text-xs p-3 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 text-emerald-300 placeholder-slate-600"
                  />
                </div>
              )}

              {/* Live Inspection & Data Verification Preview */}
              {parsedBackup && backupStats && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Verified Backup Contents
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Exported: <strong className="text-slate-200">{backupStats.exportedAt}</strong>
                    </span>
                  </div>

                  {/* Detected Table Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-md">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-semibold text-slate-300">Subscribers</span>
                      </div>
                      <div className="text-xl font-black text-white font-mono">
                        {backupStats.subscribersCount}
                      </div>
                      <span className="text-[10px] text-slate-500">Ledger accounts</span>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-md">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                        <ReceiptText className="w-3.5 h-3.5 text-purple-400" />
                        <span className="font-semibold text-slate-300">Payments</span>
                      </div>
                      <div className="text-xl font-black text-white font-mono">
                        {backupStats.paymentsCount}
                      </div>
                      <span className="text-[10px] text-amber-300 font-mono">
                        {settings.currencySymbol}{backupStats.totalRevenue.toLocaleString()} rev
                      </span>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-md">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                        <span className="font-semibold text-slate-300">Staff & Agents</span>
                      </div>
                      <div className="text-xl font-black text-white font-mono">
                        {backupStats.operatorsCount}
                      </div>
                      <span className="text-[10px] text-slate-500">Cash collectors</span>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-md">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                        <Building className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-semibold text-slate-300">ISP Profile</span>
                      </div>
                      <div className="text-xs font-bold text-white truncate" title={backupStats.ispName}>
                        {backupStats.ispName}
                      </div>
                      <span className="text-[10px] text-emerald-400">Settings included</span>
                    </div>
                  </div>

                  {/* Mode Selection */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Choose Import Strategy:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label 
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          importMode === 'replace'
                            ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/60'
                            : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-0.5 text-amber-400 focus:ring-amber-400 cursor-pointer"
                        />
                        <div>
                          <strong className="text-xs font-bold text-white block">
                            Full Restore (Replace Database)
                          </strong>
                          <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                            Replaces current records with this backup. Ideal for disaster recovery or complete system restoration.
                          </span>
                        </div>
                      </label>

                      <label 
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          importMode === 'merge'
                            ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/60'
                            : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="mt-0.5 text-emerald-400 focus:ring-emerald-400 cursor-pointer"
                        />
                        <div>
                          <strong className="text-xs font-bold text-white block">
                            Smart Merge (Append & Update)
                          </strong>
                          <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                            Retains existing data, updates matching subscribers/payments, and appends all newly discovered accounts.
                          </span>
                        </div>
                      </label>
                    </div>

                    {importMode === 'replace' && (
                      <div className="flex items-center gap-2 p-2.5 bg-amber-950/60 rounded-xl text-amber-300 text-[11px] mt-2 border border-amber-800/80">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Notice: Current subscribers and receipts will be overwritten by this backup.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!importResult?.success && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!parsedBackup || isProcessing}
              onClick={handleExecuteImport}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md ${
                parsedBackup && !isProcessing
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 hover:brightness-110 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Importing Database...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>
                    Confirm & {importMode === 'replace' ? 'Restore Full Database' : 'Merge Database'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
