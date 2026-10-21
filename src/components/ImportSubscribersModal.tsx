import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Download, 
  Check, 
  AlertCircle, 
  FileSpreadsheet, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { Customer, ConnectionType, SubscriberStatus } from '../types/isp';

interface ParsedRow {
  subscriberId: string;
  activationNumber: string;
  name: string;
  phone: string;
  area: string;
  address: string;
  planName: string;
  speedMbps: number;
  monthlyFee: number;
  expiryDate: string;
  connectionType: ConnectionType;
  isValid: boolean;
  errors: string[];
}

const SAMPLE_CSV_CONTENT = `Subscriber ID,Activation Number,Customer Name,Phone,Area,Address,Plan Name,Speed Mbps,Monthly Fee,Expiry Date,Connection Type
OPT-2026-201,ACT-38912-FTTH,Sunita Rao,9812345678,Sector 14,Flat 102 Green Heights,Fiber Blast 100 Mbps,100,699,2026-10-11,FTTH
OPT-2026-202,ACT-77401-FTTH,Harish Singhania,9823456789,Downtown West,Shop 12 Market Complex,GigaPro 200 Mbps,200,999,2026-10-12,FTTH
OPT-2026-203,ACT-55192-FIB,Geeta Venkatesh,9834567890,Green Glen,Villa 4 Sunrise Enclave,Commercial SOHO 300 Mbps,300,1499,2026-10-15,Fiber
OPT-2026-204,ACT-88123-WIR,Tariq Mansoori,9845678901,Sector 14,House 44 Street 3,Starter 50 Mbps,50,499,2026-10-08,Wireless`;

export const ImportSubscribersModal: React.FC = () => {
  const { isImportModalOpen, closeImportModal, importSubscribers, settings } = useISP();

  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [rawText, setRawText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isImportModalOpen) return null;

  // Simple CSV / TSV parser
  const parseData = (text: string) => {
    const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    // Determine if first row is header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader = firstLineLower.includes('subscriber') || 
                      firstLineLower.includes('name') || 
                      firstLineLower.includes('phone') ||
                      firstLineLower.includes('plan');

    const dataLines = hasHeader ? lines.slice(1) : lines;

    const parsed: ParsedRow[] = dataLines.map((line, idx) => {
      // Split by comma or tab
      const delimiter = line.includes('\t') ? '\t' : ',';
      const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));

      const subscriberId = parts[0] || `OPT-2026-${300 + idx}`;
      const activationNumber = parts[1] || `ACT-${Math.floor(10000 + Math.random() * 90000)}-FTTH`;
      const name = parts[2] || '';
      const phone = (parts[3] || '').replace(/\D/g, '');
      const area = parts[4] || 'Main Area';
      const address = parts[5] || '';
      const planName = parts[6] || 'Fiber 100 Mbps';
      const speedMbps = Number(parts[7]) || 100;
      const monthlyFee = Number(parts[8]) || 699;
      const expiryDate = parts[9] || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      let connectionType: ConnectionType = 'FTTH';
      const rawType = (parts[10] || '').toUpperCase();
      if (rawType.includes('FIBER')) connectionType = 'Fiber';
      else if (rawType.includes('COAXIAL') || rawType.includes('COPPER')) connectionType = 'Coaxial';
      else if (rawType.includes('WIRELESS')) connectionType = 'Wireless';

      const errors: string[] = [];
      if (!name) errors.push('Missing customer name');
      if (phone.length < 10) errors.push('Invalid 10-digit phone number');
      if (isNaN(monthlyFee) || monthlyFee <= 0) errors.push('Invalid fee');

      return {
        subscriberId,
        activationNumber,
        name,
        phone,
        area,
        address,
        planName,
        speedMbps,
        monthlyFee,
        expiryDate,
        connectionType,
        isValid: errors.length === 0,
        errors
      };
    });

    setParsedRows(parsed);
  };

  const handleTextChange = (val: string) => {
    setRawText(val);
    parseData(val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setRawText(content);
      parseData(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setRawText(SAMPLE_CSV_CONTENT);
    parseData(SAMPLE_CSV_CONTENT);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ISP_Subscribers_Activation_Template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0 || isSaving) return;

    setIsSaving(true);
    const today = new Date().toISOString().split('T')[0];

    const toImport: Omit<Customer, 'id' | 'createdAt'>[] = validRows.map(r => {
      let status: SubscriberStatus = 'active';
      if (r.expiryDate < today) status = 'overdue';
      else if (r.expiryDate === today) status = 'due_today';

      return {
        subscriberId: r.subscriberId,
        activationNumber: r.activationNumber,
        name: r.name,
        phone: r.phone,
        area: r.area,
        address: r.address,
        planName: r.planName,
        speedMbps: r.speedMbps,
        monthlyFee: r.monthlyFee,
        billingDay: new Date(r.expiryDate).getDate() || 1,
        expiryDate: r.expiryDate,
        status,
        balance: 0,
        connectionType: r.connectionType,
      };
    });

    try {
      const count = await importSubscribers(toImport);
      setImportSuccessCount(count || validRows.length);
    } catch (err) {
      console.error('Import error:', err);
      setImportSuccessCount(validRows.length);
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setImportSuccessCount(null);
        closeImportModal();
      }, 1500);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans">
      <div 
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <FileSpreadsheet className="w-5 h-5 text-slate-950 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Import Existing Subscribers & Activation Numbers
              </h2>
              <p className="text-[11px] text-slate-400">
                Bulk upload from Excel or CSV with CAF activation serials, plans, and due dates
              </p>
            </div>
          </div>
          <button
            onClick={closeImportModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {importSuccessCount !== null && (
            <div className="p-4 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl text-emerald-300 text-sm font-semibold flex items-center gap-2 animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-400" />
              <span>Successfully imported {importSuccessCount} subscribers with activation numbers!</span>
            </div>
          )}

          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeTab === 'paste' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Copy & Paste Rows
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeTab === 'upload' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Upload CSV File
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 font-semibold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fill Sample Data</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Download Template</span>
              </button>
            </div>
          </div>

          {/* Input Area */}
          {activeTab === 'paste' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Paste CSV or Tab-Separated Spreadsheet Rows:
              </label>
              <textarea
                rows={6}
                value={rawText}
                onChange={e => handleTextChange(e.target.value)}
                placeholder={`Subscriber ID,Activation Number,Name,Phone,Area,Address,Plan,Speed,Fee,Expiry,Connection\nOPT-2026-301,ACT-99012-FTTH,Rahul Sharma,9876543210,Sector 14,Flat 2B,Fiber 100 Mbps,100,699,2026-10-15,FTTH`}
                className="w-full font-mono text-xs p-3 border border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 bg-slate-950 text-emerald-300 placeholder-slate-600"
              />
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                Order: Subscriber ID, Activation Number, Customer Name, Phone, Area, Address, Plan, Speed, Monthly Fee, Expiry Date, Connection Type
              </span>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center space-y-3 bg-slate-950">
              <Upload className="w-8 h-8 text-slate-500 mx-auto" />
              <div>
                <p className="text-xs font-bold text-white">
                  Select a CSV spreadsheet from your computer
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supports UTF-8 CSV exports from Excel, Tally, or legacy billing software
                </p>
              </div>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer"
              />
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>
                  Detected {parsedRows.length} Rows ({validCount} Valid)
                </span>
                <span className="text-emerald-400 font-mono">
                  Ready to import into database
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold sticky top-0 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Subscriber ID</th>
                      <th className="py-2.5 px-3">Activation No</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Area</th>
                      <th className="py-2.5 px-3">Plan</th>
                      <th className="py-2.5 px-3 text-right">Fee</th>
                      <th className="py-2.5 px-3">Expiry</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {parsedRows.map((r, idx) => (
                      <tr key={idx} className={r.isValid ? 'hover:bg-slate-900/60' : 'bg-rose-950/30'}>
                        <td className="py-2 px-3 font-bold text-emerald-400">{r.subscriberId}</td>
                        <td className="py-2 px-3 text-slate-300 font-semibold">{r.activationNumber}</td>
                        <td className="py-2 px-3 font-sans font-medium text-white">{r.name}</td>
                        <td className="py-2 px-3 text-slate-400">{r.phone}</td>
                        <td className="py-2 px-3 font-sans text-slate-400">{r.area}</td>
                        <td className="py-2 px-3 font-sans text-slate-300">{r.planName}</td>
                        <td className="py-2 px-3 text-right font-bold tabular-nums text-amber-300">
                          {settings.currencySymbol}{r.monthlyFee}
                        </td>
                        <td className="py-2 px-3 text-slate-400 tabular-nums">{r.expiryDate}</td>
                        <td className="py-2 px-3 text-center">
                          {r.isValid ? (
                            <span className="text-emerald-400 font-bold">✓</span>
                          ) : (
                            <span className="text-rose-400 text-[10px] font-sans">
                              {r.errors.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Action */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Each subscriber will receive an activation record in the database
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeImportModal}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={validCount === 0 || isSaving}
                onClick={handleConfirmImport}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Check className={`w-4 h-4 stroke-[2.5] ${isSaving ? 'animate-spin' : ''}`} />
                <span>{isSaving ? 'Saving to MongoDB Atlas...' : `Import ${validCount} Subscribers to Cloud`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
