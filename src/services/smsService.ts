export interface SmsGatewayConfig {
  provider: 'telecom_dlt' | 'fast2sms' | 'msg91' | 'twilio' | 'firebase_phone';
  senderId: string;
  apiKey?: string;
  dltTemplateId?: string;
  isLive: boolean;
}

export interface SmsDispatchLog {
  id: string;
  phone: string;
  otp: string;
  message: string;
  timestamp: string;
  status: 'DELIVERED' | 'SENT' | 'PENDING' | 'FAILED';
  carrier: string;
  error?: string;
}

type SmsResult = {
  success: boolean;
  smsText: string;
  log: SmsDispatchLog;
  error?: string;
};

const STORAGE_KEYS = {
  CONFIG: 'vinsnetbill_sms_config_v1',
  LOGS: 'vinsnetbill_sms_logs_v1',
};

const DEFAULT_CONFIG: SmsGatewayConfig = {
  provider: 'telecom_dlt',
  senderId: 'VINSBL',
  // Configure the correct approved template ID in Settings.
  dltTemplateId: '',
  isLive: true,
};

// Keep this as your deployed backend URL. SMS gateway credentials must live
// in backend environment variables, never in frontend code.
const API_BASE_URL = 'https://vinsnetbill-isp.onrender.com';

function cleanMobile(phone: string): string {
  return String(phone ?? '').replace(/\D/g, '').slice(-10);
}

function createLog(
  phone: string,
  message: string,
  status: SmsDispatchLog['status'],
  carrier: string,
  extra: Partial<Pick<SmsDispatchLog, 'otp' | 'error'>> = {},
): SmsDispatchLog {
  return {
    id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    phone,
    otp: extra.otp ?? '',
    message,
    timestamp: new Date().toISOString(),
    status,
    carrier,
    ...(extra.error ? { error: extra.error } : {}),
  };
}

async function postJson(
  path: string,
  payload: Record<string, unknown>,
): Promise<{ response: Response | null; data: any }> {
  // Try same-origin first (useful if a hosting proxy is configured), then
  // the Render backend. Do not send an SMS directly from the browser.
  let response: Response | null = null;

  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    response = null;
  }

  if (!response || !response.ok) {
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      response = null;
    }
  }

  const data = response ? await response.json().catch(() => null) : null;
  return { response, data };
}

export const SmsService = {
  getConfig(): SmsGatewayConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch (error) {
      console.error('Could not read SMS configuration:', error);
    }
    return DEFAULT_CONFIG;
  },

  saveConfig(config: Partial<SmsGatewayConfig>): SmsGatewayConfig {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
    return updated;
  },

  /**
   * Requests an OTP from the backend.
   * The backend should generate/store the OTP and send the approved OTP
   * template. The `otp` parameter is retained for compatibility with
   * existing callers/logging; it is not used to construct a reminder.
   */
  async dispatchSmsOtp(
    phone: string,
    otp: string,
    _recipientName: string,
  ): Promise<SmsResult> {
    const mobile = cleanMobile(phone);
    const smsText = 'OTP request sent through the VINS Bills authentication service.';

    if (mobile.length !== 10) {
      const error = 'Invalid mobile number.';
      const log = createLog(mobile, smsText, 'FAILED', 'Validation', { otp, error });
      this.storeLocalLog(log);
      return { success: false, smsText, log, error };
    }

    try {
      const { response, data } = await postJson('/api/auth/send-otp', {
        mobile,
      });

      if (response?.ok && data?.success) {
        const log = createLog(
          mobile,
          data.message || smsText,
          'SENT',
          'VINS Bills OTP Backend',
          { otp },
        );
        this.storeLocalLog(log);
        return { success: true, smsText: log.message, log };
      }

      const error = data?.message || 'OTP request failed. Check the backend and SMS gateway.';
      const log = createLog(mobile, smsText, 'FAILED', 'VINS Bills OTP Backend', { otp, error });
      this.storeLocalLog(log);
      return { success: false, smsText, log, error };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'OTP backend is unreachable.';
      const log = createLog(mobile, smsText, 'FAILED', 'Network Error', { otp, error: message });
      this.storeLocalLog(log);
      return { success: false, smsText, log, error: message };
    }
  },

  /** Verifies an OTP using the authentication backend. */
  async verifySmsOtp(
    phone: string,
    otp: string,
    _name?: string,
    _role?: string,
  ): Promise<{ success: boolean; error?: string; user?: any }> {
    const mobile = cleanMobile(phone);

    if (mobile.length !== 10 || !otp.trim()) {
      return { success: false, error: 'Enter a valid mobile number and OTP.' };
    }

    try {
      const { response, data } = await postJson('/api/auth/verify-otp', {
        mobile,
        otp: otp.trim(),
      });

      if (response?.ok && data) return data;

      return {
        success: false,
        error: data?.message || 'Verification failed. Incorrect or expired OTP.',
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Backend verification server unreachable.',
      };
    }
  },

  /** Sends a payment receipt through the backend receipt endpoint. */
  async dispatchReceiptSms(
    phone: string,
    receiptNo: string,
    amount: number,
    validTo: string,
    customerName: string,
    ispName: string,
  ): Promise<SmsResult> {
    const mobile = cleanMobile(phone);
    const smsText =
      `Dear ${customerName}, payment of Rs.${amount} received successfully ` +
      `for Receipt #${receiptNo} via Cash. Broadband active till ${validTo}. ` +
      `Thank you for choosing ${ispName}! - VINSBL`;

    if (mobile.length !== 10) {
      const error = 'Invalid mobile number.';
      const log = createLog(mobile, smsText, 'FAILED', 'Validation', { error });
      this.storeLocalLog(log);
      return { success: false, smsText, log, error };
    }

    try {
      const payload = {
        mobile,
        receiptNo,
        subscriber: customerName,
        amount,
        paymentMethod: 'Cash',
        validTo,
        ispName,
      };

      const { response, data } = await postJson('/api/sms/send-receipt', payload);

      if (response?.ok && data?.success) {
        const log = createLog(mobile, smsText, 'SENT', 'VINS Bills Receipt Backend', {
          otp: receiptNo,
        });
        this.storeLocalLog(log);
        return { success: true, smsText, log };
      }

      const error = data?.message || 'SMS receipt gateway failed to send the message.';
      const log = createLog(mobile, smsText, 'FAILED', 'VINS Bills Receipt Backend', {
        otp: receiptNo,
        error,
      });
      this.storeLocalLog(log);
      return { success: false, smsText, log, error };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Receipt SMS backend is unreachable.';
      const log = createLog(mobile, smsText, 'FAILED', 'Network Error', {
        otp: receiptNo,
        error: message,
      });
      this.storeLocalLog(log);
      return { success: false, smsText, log, error: message };
    }
  },

  /**
   * Sends an actual renewal/overdue reminder. This deliberately calls a
   * different backend endpoint from the OTP endpoint.
   */
  async dispatchSmsReminder(
    phone: string,
    message: string,
    recipientName: string,
    reminderType: string,
  ): Promise<SmsResult> {
    const mobile = cleanMobile(phone);
    const smsText = message.trim();

    if (mobile.length !== 10) {
      const error = 'Invalid subscriber mobile number.';
      const log = createLog(mobile, smsText, 'FAILED', 'Validation', { error });
      this.storeLocalLog(log);
      return { success: false, smsText, log, error };
    }

    if (!smsText) {
      const error = 'Reminder message cannot be empty.';
      const log = createLog(mobile, smsText, 'FAILED', 'Validation', { error });
      this.storeLocalLog(log);
      return { success: false, smsText, log, error };
    }

    try {
      const { response, data } = await postJson('/api/sms/send-reminder', {
        mobile,
        message: smsText,
        subscriber: recipientName,
        reminderType,
      });

      if (response?.ok && data?.success) {
        const log = createLog(
          mobile,
          smsText,
          'SENT',
          'VINS Bills Reminder Backend',
        );
        this.storeLocalLog(log);
        return { success: true, smsText, log };
      }

      const error =
        data?.message ||
        'Reminder SMS failed. Confirm that /api/sms/send-reminder is implemented on the backend.';
      const log = createLog(mobile, smsText, 'FAILED', 'VINS Bills Reminder Backend', { error });
      this.storeLocalLog(log);
      return { success: false, smsText, log, error };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Reminder SMS backend is unreachable.';
      const log = createLog(mobile, smsText, 'FAILED', 'Network Error', { error: message });
      this.storeLocalLog(log);
      return { success: false, smsText, log, error: message };
    }
  },

  storeLocalLog(log: SmsDispatchLog): void {
    try {
      const existing: SmsDispatchLog[] = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.LOGS) || '[]',
      );
      localStorage.setItem(
        STORAGE_KEYS.LOGS,
        JSON.stringify([log, ...existing].slice(0, 50)),
      );
    } catch (error) {
      console.error('Could not save SMS log:', error);
    }
  },

  getRecentLogs(): SmsDispatchLog[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
    } catch {
      return [];
    }
  },
};
