import React, { useState } from 'react';
import { X, Printer, Send, Copy, Check, Download, Share2 } from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { createWhatsAppUrl, generateReceiptMessage } from '../utils/whatsapp';

export const ThermalReceiptModal: React.FC = () => {
  const { activeThermalReceipt, closeThermalReceipt, triggerPrintReceipt, settings, markPaymentWhatsAppSent } = useISP();
  const [copied, setCopied] = useState(false);

  if (!activeThermalReceipt) return null;

  const { payment, customer } = activeThermalReceipt;

  const handlePrint = () => {
    triggerPrintReceipt(payment, customer);
  };

  const handleCopyText = async () => {
    const text = generateReceiptMessage(payment, customer, settings);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleWhatsApp = () => {
    markPaymentWhatsAppSent(payment.id);
    const msg = generateReceiptMessage(payment, customer, settings);
    const url = createWhatsAppUrl(customer.phone, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans"
      onClick={closeThermalReceipt}
    >
      <div 
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-800 overflow-hidden my-6 flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <Printer className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Thermal 80mm Receipt Slip</h3>
              <p className="text-[11px] text-slate-400">POS-80 standard formatting for {customer.name}</p>
            </div>
          </div>
          <button
            onClick={closeThermalReceipt}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Header Banner */}
        <div className="bg-slate-950/80 px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">Receipt: <span className="font-mono font-bold text-emerald-400">{payment.receiptNo}</span></span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 text-slate-950 rounded-xl font-bold shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Print 80mm</span>
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
              title="Dispatch via WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handleCopyText}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Copy receipt text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Scrollable Visual Thermal Receipt Slip (80mm width paper preview) */}
        <div className="p-6 bg-[#060a14] flex justify-center max-h-[65vh] overflow-y-auto">
          <div className="w-[320px] bg-white border border-slate-200 shadow-2xl p-4 font-mono text-[11px] leading-tight text-slate-950 selection:bg-emerald-100 rounded-sm">
            {/* Top Paper Tear Line */}
            <div className="text-center text-[10px] text-slate-400 select-none pb-2 border-b border-dashed border-slate-300">
              - - - - - - - - - 80mm THERMAL SLIP - - - - - - - - -
            </div>

            {/* ISP Header */}
            <div className="text-center py-2.5 border-b border-slate-900">
              <div className="text-sm font-black uppercase tracking-wide text-slate-950">{settings.ispName}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">{settings.tagline}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">{settings.address}</div>
              <div className="text-[10px] text-slate-800 font-semibold mt-0.5">
                Helpline: {settings.supportPhone || settings.phone}
              </div>
              {settings.gstOrTaxNo && (
                <div className="text-[10px] text-slate-700 mt-0.5">GSTIN: {settings.gstOrTaxNo}</div>
              )}
            </div>

            {/* Title */}
            <div className="text-center py-1.5 font-bold uppercase tracking-wider text-xs border-b border-slate-900 bg-slate-50">
              CASH COLLECTION RECEIPT
            </div>

            {/* Receipt Meta */}
            <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>Receipt No:</span>
                <span className="font-bold">{payment.receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span>{new Date(payment.date).toLocaleString([], { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier / Desk:</span>
                <span>{payment.collectedBy}</span>
              </div>
            </div>

            {/* Subscriber Particulars */}
            <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>Subscriber:</span>
                <span className="font-bold">{customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Subscriber ID:</span>
                <span className="font-bold">{customer.subscriberId}</span>
              </div>
              <div className="flex justify-between">
                <span>Activation No:</span>
                <span className="font-bold">{customer.activationNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>+91 {customer.phone}</span>
              </div>
              <div className="flex justify-between">
                <span>Area / Sector:</span>
                <span>{customer.area}</span>
              </div>
            </div>

            {/* Itemized Line Items Table */}
            <div className="py-2 space-y-1 border-b border-slate-900">
              <div className="flex justify-between font-bold border-b border-slate-200 pb-1">
                <span>PARTICULARS</span>
                <span>AMOUNT</span>
              </div>
              <div className="pt-1">
                <div className="font-bold">{customer.planName}</div>
                <div className="text-[10px] text-slate-600 pl-1">
                  Speed: {customer.speedMbps} Mbps FTTH
                </div>
                <div className="text-[10px] text-slate-600 pl-1">
                  Validity: {payment.validFrom} to {payment.validTo}
                </div>
              </div>
              <div className="flex justify-between pt-1 font-semibold">
                <span>Plan Monthly Fee:</span>
                <span>{settings.currencySymbol}{payment.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>GST (Inclusive):</span>
                <span>₹0.00</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="py-2.5 border-b border-slate-900 bg-slate-50 px-1 my-1">
              <div className="flex justify-between items-center text-sm font-extrabold">
                <span>TOTAL AMOUNT:</span>
                <span>{settings.currencySymbol}{payment.amount.toLocaleString()}.00</span>
              </div>
              <div className="text-[9px] text-slate-500 uppercase mt-0.5">
                (Indian Rupees Only)
              </div>
            </div>

            {/* Settlement Status */}
            <div className="py-2 space-y-1 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-bold text-slate-800">CASH (Physical Drawer)</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Validity Extended Till:</span>
                <span className="font-bold text-emerald-800">{payment.validTo}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Account Balance:</span>
                <span>{settings.currencySymbol}0.00 (Cleared)</span>
              </div>
            </div>

            {/* Barcode Simulation */}
            <div className="py-3 text-center">
              <div className="inline-block tracking-widest font-mono text-base font-bold select-none text-slate-800">
                ||| | |||| | ||||| || | |||| ||
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 tracking-wider font-mono">
                *{payment.receiptNo}*
              </div>
            </div>

            {/* Footer Notes */}
            <div className="pt-2 text-[10px] text-center space-y-1 text-slate-600 border-t border-dashed border-slate-300">
              <p className="italic">{settings.receiptFooter || 'Thank you for your prompt payment!'}</p>
              <p className="font-bold text-slate-900">*** KEEP SLIP FOR YOUR RECORDS ***</p>
              <div className="text-[9px] text-slate-400 select-none pt-2">
                [ ✂ - - - - - - - - - TEAR HERE - - - - - - - - - ]
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            ESC/POS 80mm format for direct thermal printing
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={closeThermalReceipt}
              className="px-3.5 py-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 rounded-xl font-bold shadow-md hover:brightness-110 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 stroke-[2.2]" />
              <span>Print Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
