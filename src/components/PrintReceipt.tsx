import React from 'react';
import { useISP } from '../context/ISPContext';

export const PrintReceipt: React.FC = () => {
  const { activeReceiptModal, printReceiptTarget, activeThermalReceipt, settings } = useISP();

  const target = printReceiptTarget || activeThermalReceipt || activeReceiptModal;
  if (!target) return null;

  const { payment, customer } = target;

  return (
    <div 
      id="printable-receipt" 
      className="hidden print:block font-mono text-[11px] text-black w-[80mm] max-w-[80mm] mx-auto p-1 leading-tight select-none"
    >
      {/* Header */}
      <div className="text-center pb-2 border-b border-black">
        <h1 className="text-xs font-black uppercase tracking-wider">{settings.ispName}</h1>
        <p className="text-[10px]">{settings.tagline}</p>
        <p className="text-[9px] mt-0.5">{settings.address}</p>
        <p className="text-[10px] font-bold">Helpline: {settings.supportPhone || settings.phone}</p>
        {settings.gstOrTaxNo && <p className="text-[9px]">GSTIN: {settings.gstOrTaxNo}</p>}
      </div>

      <div className="text-center py-1.5 border-b border-black font-extrabold text-[11px] uppercase tracking-wide">
        CASH COLLECTION RECEIPT (80mm)
      </div>

      {/* Metadata */}
      <div className="py-2 space-y-1 text-[10px] border-b border-dashed border-black">
        <div className="flex justify-between">
          <span>Receipt No:</span>
          <span className="font-bold">{payment.receiptNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Date & Time:</span>
          <span>{new Date(payment.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier/Agent:</span>
          <span className="font-bold truncate max-w-[170px]">{payment.collectedBy}</span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="py-2 space-y-1 text-[10px] border-b border-dashed border-black">
        <div className="flex justify-between">
          <span>Subscriber:</span>
          <span className="font-bold truncate max-w-[170px]">{customer.name}</span>
        </div>
        <div className="flex justify-between">
          <span>Subscriber ID:</span>
          <span className="font-bold">{customer.subscriberId}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Activation No:</span>
          <span className="font-bold">{customer.activationNumber || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span>Mobile:</span>
          <span>{customer.phone}</span>
        </div>
        {customer.area && (
          <div className="flex justify-between">
            <span>Area/Zone:</span>
            <span>{customer.area}</span>
          </div>
        )}
      </div>

      {/* Itemized Charges */}
      <div className="py-2 space-y-1 text-[10px] border-b border-dashed border-black">
        <div className="flex justify-between font-bold border-b border-black pb-0.5">
          <span>ITEM / PLAN DESCRIPTION</span>
          <span>AMOUNT</span>
        </div>
        <div className="flex justify-between pt-0.5">
          <span>{customer.planName} ({customer.speedMbps}M)</span>
          <span className="font-bold">{settings.currencySymbol}{payment.amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[9px] text-gray-700">
          <span>Period: {payment.validFrom} to {payment.validTo}</span>
        </div>
        <div className="flex justify-between text-[9px] text-gray-700">
          <span>Taxes (GST/VAT)</span>
          <span>0.00 (Incl)</span>
        </div>
      </div>

      {/* Amount Total */}
      <div className="py-2 border-b border-black">
        <div className="flex justify-between items-center text-xs font-black">
          <span>TOTAL CASH RECEIVED:</span>
          <span>{settings.currencySymbol}{payment.amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[9px] mt-0.5">
          <span>Payment Mode:</span>
          <span className="font-bold">CASH (Drawer Collected)</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span>Extended Expiry:</span>
          <span className="font-bold">{payment.validTo}</span>
        </div>
        <div className="flex justify-between text-[9px] text-gray-700">
          <span>Balance Due:</span>
          <span>{settings.currencySymbol}0.00</span>
        </div>
      </div>

      {/* Barcode representation */}
      <div className="py-2 text-center text-xs tracking-widest font-bold">
        ||| | |||| | ||||| || | |||| ||
        <div className="text-[8px] font-mono tracking-normal">*{payment.receiptNo}*</div>
      </div>

      {/* Footer */}
      <div className="pt-2 text-[9px] space-y-1 text-center">
        <p className="italic">{settings.receiptFooter || 'Thank you for choosing VinsNetBill Broadband!'}</p>
        <p className="font-bold">*** COMPUTER GENERATED 80mm RECEIPT ***</p>
        <p className="text-[8px] pt-1 border-t border-dashed border-black">
          [ ✂ - - - - - - - - - - - - - - - - - - - - - - ]
        </p>
      </div>
    </div>
  );
};
