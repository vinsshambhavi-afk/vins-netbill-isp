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

const STORAGE_KEYS = {
  CONFIG: 'vinsnetbill_sms_config_v1',
  LOGS: 'vinsnetbill_sms_logs_v1',
};

const DEFAULT_CONFIG: SmsGatewayConfig = {
  provider: 'telecom_dlt',
  senderId: 'VINSBL',
  dltTemplateId: '14071688920192831',
  isLive: true
};

const API_BASE_URL = 'https://vinsnetbill-isp.onrender.com';
const TEXTBEE_URL = 'https://api.textbee.dev/api/v1/gateway/devices/6ad4dff65291071e5721b8b2/send-sms';
const TEXTBEE_API_KEY = 'txb_4iSwwT7OdkmJjL30zspttKp1e8riGa1j';

export const SmsService = {
  getConfig(): SmsGatewayConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CONFIG;
  },

  saveConfig(config: Partial<SmsGatewayConfig>): SmsGatewayConfig {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
    return updated;
  },

  // Dispatches an SMS verification OTP via Render backend API with Textbee gateway
  async dispatchSmsOtp(phone: string, otp: string, recipientName: string): Promise<{
    success: boolean;
    smsText: string;
    log: SmsDispatchLog;
    error?: string;
  }> {
    const config = this.getConfig();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const formattedPhone = '+91' + cleanPhone;
    const smsText = `Your VinsNetBill ISP verification code is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone. - Telecom DLT: ${config.senderId}`;

    // 1. Try local backend route first, then Render backend
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      let apiRes = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanPhone }),
        signal: controller.signal
      }).catch(() => null);

      if (!apiRes || !apiRes.ok) {
        apiRes = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: cleanPhone }),
          signal: controller.signal
        }).catch(() => null);
      }
      clearTimeout(timeoutId);

      if (apiRes) {
        const data = await apiRes.json().catch(() => null);

        if (apiRes.ok && data?.success) {
          const log: SmsDispatchLog = {
            id: `sms-${Date.now()}`,
            phone: cleanPhone,
            otp,
            message: smsText,
            timestamp: new Date().toISOString(),
            status: 'DELIVERED',
            carrier: 'Textbee DLT Gateway'
          };
          this.storeLocalLog(log);
          return { success: true, smsText, log };
        }

        // If backend returned explicit error message from Textbee (e.g. limit reached)
        if (data && !data.success) {
          const errorMsg = data.message || 'SMS Gateway Error';
          const log: SmsDispatchLog = {
            id: `sms-${Date.now()}`,
            phone: cleanPhone,
            otp,
            message: smsText,
            timestamp: new Date().toISOString(),
            status: 'FAILED',
            carrier: 'Textbee Gateway',
            error: errorMsg
          };
          this.storeLocalLog(log);
          return { success: false, smsText, log, error: errorMsg };
        }
      }
    } catch (apiErr: any) {
      console.warn('Backend SMS API failed or timed out:', apiErr?.message);
    }

    // 2. Direct Textbee Gateway attempt if backend proxy failed
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const tbRes = await fetch(TEXTBEE_URL, {
        method: 'POST',
        headers: {
          'x-api-key': TEXTBEE_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipients: [formattedPhone],
          message: smsText
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const tbData = await tbRes.json().catch(() => null);

      if (tbRes.ok && !tbData?.hasReachedLimit && !tbData?.error) {
        const log: SmsDispatchLog = {
          id: `sms-${Date.now()}`,
          phone: cleanPhone,
          otp,
          message: smsText,
          timestamp: new Date().toISOString(),
          status: 'DELIVERED',
          carrier: 'Textbee Gateway Direct'
        };
        this.storeLocalLog(log);
        return { success: true, smsText, log };
      } else {
        const failureReason = tbData?.message || (tbData?.hasReachedLimit ? 'TextBee daily quota limit of 50 SMS has been reached for today.' : 'SMS Gateway device is currently unreachable.');
        const log: SmsDispatchLog = {
          id: `sms-${Date.now()}`,
          phone: cleanPhone,
          otp,
          message: smsText,
          timestamp: new Date().toISOString(),
          status: 'FAILED',
          carrier: 'Textbee Gateway Direct',
          error: failureReason
        };
        this.storeLocalLog(log);
        return {
          success: false,
          smsText,
          log,
          error: failureReason
        };
      }
    } catch (tbErr: any) {
      const failMsg = tbErr?.name === 'AbortError' ? 'SMS gateway request timed out. Please check network connection.' : (tbErr?.message || 'Failed to reach SMS gateway server.');
      const log: SmsDispatchLog = {
        id: `sms-${Date.now()}`,
        phone: cleanPhone,
        otp,
        message: smsText,
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        carrier: 'Gateway Network Error',
        error: failMsg
      };
      this.storeLocalLog(log);
      return {
        success: false,
        smsText,
        log,
        error: failMsg
      };
    }
  },

  // Verifies SMS OTP via local route or Render backend API
  async verifySmsOtp(phone: string, otp: string, name?: string, role?: string): Promise<{
    success: boolean;
    error?: string;
    user?: any;
  }> {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    try {
      let apiRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanPhone, otp })
      }).catch(() => null);

      if (!apiRes || !apiRes.ok) {
        apiRes = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: cleanPhone, otp })
        }).catch(() => null);
      }

      if (apiRes && apiRes.ok) {
        return await apiRes.json();
      }
      const data = apiRes ? await apiRes.json().catch(() => null) : null;
      return { success: false, error: data?.message || 'Verification failed. Incorrect or expired OTP.' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Backend verification server unreachable.' };
    }
  },

  // Dispatches an official payment receipt via SMS
  async dispatchReceiptSms(
    phone: string,
    receiptNo: string,
    amount: number,
    validTo: string,
    customerName: string,
    ispName: string
  ): Promise<{ success: boolean; smsText: string; log: SmsDispatchLog; error?: string }> {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const smsText = `Dear ${customerName}, payment of Rs.${amount} received successfully for Receipt #${receiptNo} via Cash. Broadband active till ${validTo}. Thank you for choosing ${ispName}! - VINSBL`;

    // Try local backend API first, then Render API
    try {
      let res = await fetch('/api/sms/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: cleanPhone,
          receiptNo,
          subscriber: customerName,
          amount,
          paymentMethod: 'Cash'
        })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${API_BASE_URL}/api/sms/send-receipt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile: cleanPhone,
            receiptNo,
            subscriber: customerName,
            amount,
            paymentMethod: 'Cash'
          })
        }).catch(() => null);
      }

      const data = res ? await res.json().catch(() => null) : null;

      if (res && res.ok && data?.success) {
        const log: SmsDispatchLog = {
          id: `sms-${Date.now()}`,
          phone: cleanPhone,
          otp: receiptNo,
          message: smsText,
          timestamp: new Date().toISOString(),
          status: 'DELIVERED',
          carrier: 'Textbee SMS Gateway'
        };
        this.storeLocalLog(log);
        return { success: true, smsText, log };
      } else {
        const failMsg = data?.message || 'SMS receipt gateway failed to send message.';
        const log: SmsDispatchLog = {
          id: `sms-${Date.now()}`,
          phone: cleanPhone,
          otp: receiptNo,
          message: smsText,
          timestamp: new Date().toISOString(),
          status: 'FAILED',
          carrier: 'Textbee Gateway',
          error: failMsg
        };
        this.storeLocalLog(log);
        return { success: false, smsText, log, error: failMsg };
      }
    } catch (e: any) {
      const failMsg = e?.message || 'Failed to connect to SMS dispatch server.';
      const log: SmsDispatchLog = {
        id: `sms-${Date.now()}`,
        phone: cleanPhone,
        otp: receiptNo,
        message: smsText,
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        carrier: 'Gateway Network Error',
        error: failMsg
      };
      this.storeLocalLog(log);
      return { success: false, smsText, log, error: failMsg };
    }
  },

  storeLocalLog(log: SmsDispatchLog) {
    try {
      const existingLogs: SmsDispatchLog[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
      const updatedLogs = [log, ...existingLogs.slice(0, 49)];
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updatedLogs));
    } catch (e) {
      console.error(e);
    }
  },

  getRecentLogs(): SmsDispatchLog[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
    } catch (e) {
      return [];
    }
  }
};
