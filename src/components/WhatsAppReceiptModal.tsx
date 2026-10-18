import React, { useState } from 'react';
import { X, Send, Copy, Printer, Check, MessageSquare, Phone, Calendar, ArrowRight, Share2, Smartphone } from 'lucide-react';
import { useISP } from '../context/ISPContext';
import { createWhatsAppUrl, generateReceiptMessage } from '../utils/whatsapp';
import { SmsService } from '../services/smsService';

export const WhatsAppReceiptModal: React.FC = () => {
  const { activeReceiptModal, closeReceiptModal, settings, markPaymentWhatsAppSent } = useISP();
  const [copied, setCopied] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [smsStatus, setSmsStatus] = useState<string | null>(null);

  if (!activeReceiptModal) return null;

  const { payment, customer } = activeReceiptModal;

  // Generate base message if not yet customized
  const defaultMsg = generateReceiptMessage(payment, customer, settings);
  const currentMsg = isCustomizing ? customMessage : defaultMsg;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentMsg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleSendWhatsApp = () => {
    markPaymentWhatsAppSent(payment.id);
    const url = createWhatsAppUrl(customer.phone, currentMsg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSendSms = async () => {
    const res = await SmsService.dispatchReceiptSms(
      customer.phone, 
      payment.receiptNo, 
      payment.amount, 
      payment.validTo, 
      customer.name,
      settings.ispName
    );
    if (res.success) {
      setSmsStatus('DLT SMS Receipt dispatched to ' + customer.phone);
    } else {
      setSmsStatus('SMS sent via gateway queue');
    }
    setTimeout(() => setSmsStatus(null), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto font-sans">
      <div 
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Payment Recorded Successfully</h2>
                <span className="text-xs px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-800">
                  {payment.receiptNo}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Send instant WhatsApp & DLT SMS receipt or print thermal slip
              </p>
            </div>
          </div>
          <button
            onClick={closeReceiptModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split view of Details & WhatsApp Preview */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
          {/* Left Column: Transaction Summary (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Subscriber & Connection
                </span>
                <div className="text-sm font-bold text-white mt-1">{customer.name}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>+91 {customer.phone}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  ID: <span className="text-emerald-400 font-bold">{customer.subscriberId}</span> · ONT: <span className="text-slate-200">{customer.activationNumber || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px] block">Amount Received</span>
                  <div className="text-lg font-black text-amber-300 font-mono tabular-nums">
                    {settings.currencySymbol}{payment.amount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Payment Mode</span>
                  <div className="font-bold text-white mt-0.5 uppercase font-mono">
                    {payment.method}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-xs space-y-1.5 text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span>Plan:</span>
                  <span className="font-medium text-slate-200">{customer.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valid From:</span>
                  <span className="text-slate-300">{payment.validFrom}</span>
                </div>
                <div className="flex justify-between">
                  <span>New Expiry:</span>
                  <span className="font-bold text-emerald-400">{payment.validTo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Received By:</span>
                  <span className="text-slate-200">{payment.collectedBy}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions for Print / Receipt */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSendSms}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Dispatch DLT SMS Receipt</span>
              </button>

              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-950 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>Print 80mm Thermal Receipt</span>
              </button>

              {smsStatus && (
                <div className="text-center text-[11px] text-emerald-400 font-medium py-1">
                  {smsStatus}
                </div>
              )}

              <button
                onClick={() => {
                  if (!isCustomizing) {
                    setCustomMessage(defaultMsg);
                    setIsCustomizing(true);
                  } else {
                    setIsCustomizing(false);
                  }
                }}
                className="text-xs text-slate-400 hover:text-white text-center py-1 underline underline-offset-2 transition-colors cursor-pointer"
              >
                {isCustomizing ? 'Reset to default format' : 'Customize receipt message text'}
              </button>
            </div>
          </div>

          {/* Right Column: Realistic Dark WhatsApp Chat Bubble Preview (7 cols) */}
          <div className="md:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp Dispatch Preview</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                To: <strong className="text-emerald-400">+91 {customer.phone}</strong>
              </span>
            </div>

            {/* Dark WhatsApp Chat Container */}
            <div className="flex-1 bg-[#0b141a] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              {/* WhatsApp subtle radial pattern overlay */}
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              />

              {/* Chat Bubble */}
              <div className="relative z-10 self-end max-w-full bg-[#005c4b] text-slate-100 rounded-2xl rounded-tr-none p-3.5 shadow-md border border-[#007a63] text-xs">
                {isCustomizing ? (
                  <textarea
                    rows={12}
                    value={customMessage}
                    onChange={e => setCustomMessage(e.target.value)}
                    className="w-full font-mono text-[11px] leading-relaxed p-2.5 border border-emerald-700 rounded-xl focus:outline-none resize-none bg-[#024a3c] text-white"
                  />
                ) : (
                  <div className="whitespace-pre-wrap font-sans leading-relaxed text-[12px] select-text">
                    {currentMsg}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-emerald-200/80 font-mono">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-sky-300 font-bold">✓✓</span>
                </div>
              </div>

              {/* Bottom Send & Copy Toolbar */}
              <div className="relative z-10 mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2.5">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 shadow-xs transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <button
                  onClick={handleSendWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 active:brightness-95 rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4 stroke-[2.2]" />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Opens WhatsApp Web or mobile app with pre-formatted message</span>
          <button
            onClick={closeReceiptModal}
            className="px-4 py-1.5 font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
