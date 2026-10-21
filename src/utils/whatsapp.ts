import { Customer, ISPSettings, PaymentRecord } from '../types/isp';

export const cleanPhoneNumber = (phone: string, defaultCountryCode = '91'): string => {
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // If already starts with country code or standard 10-12 digits
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }
  return digits;
};

export const createWhatsAppUrl = (phone: string, message: string): string => {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
};

export const createOtpWhatsAppUrl = (phone: string, otp: string, ispName: string): string => {
  const cleanPhone = cleanPhoneNumber(phone);
  const text = `🔐 *${ispName || 'VinsNetBill ISP'} - Login Verification*\n\nYour one-time login OTP is: *${otp}*\n\n⏱ Valid for 10 minutes.\n⚠️ Do not share this code with anyone.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};

export const createCollectorInviteWhatsAppUrl = (phone: string, collectorName: string, ispName: string, area?: string): string => {
  const cleanPhone = cleanPhoneNumber(phone);
  const text = `👋 Hello *${collectorName}*,\n\nYou have been registered as an authorized *Cash Collector* for *${ispName || 'VinsNetBill ISP'}*${area ? ` (Area: ${area})` : ''}.\n\n📱 Log in using your mobile number: *+91 ${phone}*\nRequest your OTP via WhatsApp on the login screen to access the cash register and print customer thermal receipts.\n\nThank you!`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};

export interface TemplateVariables {
  customer_name?: string;
  subscriber_id?: string;
  activation_number?: string;
  plan_name?: string;
  speed?: string | number;
  amount?: string | number;
  currency?: string;
  receipt_no?: string;
  payment_date?: string;
  payment_method?: string;
  valid_from?: string;
  valid_to?: string;
  expiry_date?: string;
  due_date?: string;
  balance?: string | number;
  collected_by?: string;
  isp_name?: string;
  support_phone?: string;
  upi_id?: string;
  notes?: string;
}

export const interpolateTemplate = (template: string, vars: TemplateVariables): string => {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value !== undefined ? String(value) : '');
  }
  return result;
};

export const DEFAULT_TEMPLATES = {
  cashReceipt: `🧾 *PAYMENT RECEIPT - CASH RECEIVED*
*{{isp_name}}*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customer_name}}*,
Thank you! We have received your payment in *{{payment_method}}*.

📋 *Receipt No:* {{receipt_no}}
👤 *Subscriber ID:* {{subscriber_id}}
🔢 *Activation No:* {{activation_number}}
📶 *Plan:* {{plan_name}}
💰 *Amount Received:* {{currency}}{{amount}}
🗓 *Date:* {{payment_date}}
✅ *Validity Active Till:* {{valid_to}}
💳 *Outstanding Balance:* {{currency}}{{balance}}
👨‍💼 *Received By:* {{collected_by}}

━━━━━━━━━━━━━━━━━━━━
🌐 Enjoy unlimited uninterrupted internet!
📞 Support: {{support_phone}}
_Thank you for choosing {{isp_name}}!_`,

  upcomingReminder: `📅 *INTERNET BILL REMINDER*
*{{isp_name}}*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customer_name}}*,

This is a gentle reminder that your internet recharge for plan *{{plan_name}}* is expiring in *3 days*.

👤 *Subscriber ID:* {{subscriber_id}}
💰 *Monthly Renewal Fee:* {{currency}}{{amount}}
🗓 *Due Expiry Date:* {{due_date}}

To avoid any interruption in your broadband connection, please renew your subscription.

📲 *Pay via UPI:* {{upi_id}}
💵 Or contact us for cash collection at your door.
📞 Helpline: {{support_phone}}
_Thank you!_`,

  dueTodayReminder: `⚡ *INTERNET RENEWAL DUE TODAY*
*{{isp_name}}*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customer_name}}*,

Your broadband subscription expires *TODAY ({{due_date}})*.

👤 *Subscriber ID:* {{subscriber_id}}
📶 *Plan:* {{plan_name}}
💰 *Amount Due:* {{currency}}{{amount}}

Please renew today to maintain uninterrupted high-speed internet service.

📲 *Instant UPI Pay:* {{upi_id}}
💵 Cash collection agent is available in your area.
📞 Call / WhatsApp support: {{support_phone}}`,

  overdueReminder: `⚠️ *OVERDUE PAYMENT NOTICE*
*{{isp_name}}*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customer_name}}*,

Your broadband subscription for *{{subscriber_id}}* is currently *OVERDUE*. Your plan expired on *{{due_date}}*.

💰 *Pending Amount:* {{currency}}{{amount}}
📶 *Plan:* {{plan_name}}

Grace period is currently active. Please clear the pending dues immediately to avoid automatic service disconnection.

📲 *Pay UPI:* {{upi_id}}
💵 Reply here to schedule immediate cash pickup.
📞 Urgent Assistance: {{support_phone}}`,

  suspensionReminder: `🛑 *FINAL NOTICE: SERVICE SUSPENSION*
*{{isp_name}}*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customer_name}}*,

Your internet service for Subscriber ID *{{subscriber_id}}* is scheduled for disconnection due to non-payment of {{currency}}{{amount}}.

To reactivate your high-speed internet without reconnection charges, please pay immediately.

📲 *UPI ID:* {{upi_id}}
📞 Immediate reconnection help: {{support_phone}}`
};

export const generateReceiptMessage = (
  payment: PaymentRecord,
  customer: Customer,
  settings: ISPSettings
): string => {
  const vars: TemplateVariables = {
    customer_name: customer.name,
    subscriber_id: customer.subscriberId,
    activation_number: customer.activationNumber || 'N/A',
    plan_name: customer.planName,
    speed: customer.speedMbps,
    amount: payment.amount,
    currency: settings.currencySymbol,
    receipt_no: payment.receiptNo,
    payment_date: new Date(payment.date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }),
    payment_method: payment.method,
    valid_from: payment.validFrom,
    valid_to: payment.validTo,
    balance: Math.max(0, -customer.balance),
    collected_by: payment.collectedBy,
    isp_name: settings.ispName,
    support_phone: settings.supportPhone || settings.phone,
    upi_id: settings.upiId,
    notes: payment.notes || ''
  };

  return interpolateTemplate(settings.templates.cashReceipt || DEFAULT_TEMPLATES.cashReceipt, vars);
};

export const generateReminderMessage = (
  customer: Customer,
  settings: ISPSettings,
  reminderType: 'upcoming' | 'due_today' | 'overdue' | 'suspension'
): string => {
  let template = settings.templates.dueTodayReminder;
  if (reminderType === 'upcoming') {
    template = settings.templates.upcomingReminder || DEFAULT_TEMPLATES.upcomingReminder;
  } else if (reminderType === 'due_today') {
    template = settings.templates.dueTodayReminder || DEFAULT_TEMPLATES.dueTodayReminder;
  } else if (reminderType === 'overdue') {
    template = settings.templates.overdueReminder || DEFAULT_TEMPLATES.overdueReminder;
  } else if (reminderType === 'suspension') {
    template = settings.templates.suspensionReminder || DEFAULT_TEMPLATES.suspensionReminder;
  }

  const vars: TemplateVariables = {
    customer_name: customer.name,
    subscriber_id: customer.subscriberId,
    activation_number: customer.activationNumber || 'N/A',
    plan_name: customer.planName,
    speed: customer.speedMbps,
    amount: customer.monthlyFee,
    currency: settings.currencySymbol,
    due_date: new Date(customer.expiryDate).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }),
    expiry_date: customer.expiryDate,
    balance: Math.abs(customer.balance),
    isp_name: settings.ispName,
    support_phone: settings.supportPhone || settings.phone,
    upi_id: settings.upiId
  };

  return interpolateTemplate(template, vars);
};

export const createCashierStatementWhatsAppUrl = (
  phone: string,
  data: {
    cashierName: string;
    cashierPhone?: string;
    ispName: string;
    periodText: string;
    totalAmount: number;
    cashAmount: number;
    upiAmount: number;
    otherAmount: number;
    receiptCount: number;
    cashReceiptCount: number;
    currencySymbol: string;
  }
): string => {
  const text = `📊 *CASH COLLECTION STATEMENT*
🏢 *${data.ispName || 'VinsNetBill ISP'}*
━━━━━━━━━━━━━━━━━━━━
👤 *Cashier / Collector:* ${data.cashierName}
${data.cashierPhone ? `📱 *Phone:* +91 ${data.cashierPhone}\n` : ''}🗓 *Period:* ${data.periodText}
━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL COLLECTED:* ${data.currencySymbol}${data.totalAmount.toLocaleString()}
💵 *Physical Cash:* ${data.currencySymbol}${data.cashAmount.toLocaleString()} (${data.cashReceiptCount} bills)
📱 *UPI / QR Online:* ${data.currencySymbol}${data.upiAmount.toLocaleString()}
🏦 *Bank / Other:* ${data.currencySymbol}${data.otherAmount.toLocaleString()}
🧾 *Total Receipts Issued:* ${data.receiptCount}
━━━━━━━━━━━━━━━━━━━━
Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
_Handover Statement - Verified_`;
  return createWhatsAppUrl(phone, text);
};
