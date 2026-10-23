
import React, { useMemo, useState } from 'react';
import { useISP } from '../context/ISPContext';
import { SmsService } from '../services/smsService';

type ReminderType = 'due' | 'overdue' | 'expiring';

export const MonthlyRemindersView: React.FC = () => {
  const {
    customers,
    settings,
    logReminderSent,
  } = useISP();

  const [search, setSearch] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    customerId: string;
    message: string;
    success: boolean;
  } | null>(null);

  const getReminderType = (expiryDate: string): ReminderType => {
    const expiry = new Date(expiryDate);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const days = Math.ceil(
      (expiry.getTime() - today.getTime()) / 86400000
    );

    if (days < 0) return 'overdue';
    if (days <= 3) return 'due';
    return 'expiring';
  };

  const getReminderMessage = (
    customer: any,
    type: ReminderType
  ): string => {
    const ispName = settings?.ispName || 'VINS ENTERPRISES';
    const fee = Number(customer.monthlyFee || 0);
    const expiry = customer.expiryDate || 'the current expiry date';

    if (type === 'overdue') {
      return `Dear ${customer.name}, your broadband connection expired on ${expiry}. Outstanding renewal fee: Rs.${fee}. Please renew your connection to restore/continue service. - ${ispName}`;
    }

    if (type === 'due') {
      return `Dear ${customer.name}, your broadband connection expires on ${expiry}. Renewal fee: Rs.${fee}. Please renew soon to avoid service interruption. - ${ispName}`;
    }

    return `Dear ${customer.name}, your broadband plan expires on ${expiry}. Renewal fee: Rs.${fee}. Please renew on time. - ${ispName}`;
  };

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (customers || []).filter((customer: any) => {
      const expiry = new Date(customer.expiryDate);
      const validExpiry = !Number.isNaN(expiry.getTime());

      if (!validExpiry) return false;

      const isActiveOrDue =
        customer.status !== 'inactive' &&
        customer.status !== 'disconnected';

      const matchesSearch =
        !query ||
        String(customer.name || '').toLowerCase().includes(query) ||
        String(customer.phone || '').includes(query) ||
        String(customer.subscriberId || '').toLowerCase().includes(query);

      return isActiveOrDue && matchesSearch;
    }).sort((a: any, b: any) => {
      return (
        new Date(a.expiryDate).getTime() -
        new Date(b.expiryDate).getTime()
      );
    });
  }, [customers, search]);

  const handleSendSmsReminder = async (customer: any) => {
    if (sendingId) return;

    setSendingId(customer.id);
    setFeedback(null);

    const reminderType = getReminderType(customer.expiryDate);
    const reminderText = getReminderMessage(customer, reminderType);

    try {
      // IMPORTANT:
      // Use the reminder method, never dispatchSmsOtp().
      const result = await SmsService.dispatchSmsReminder(
        customer.phone,
        reminderText,
        customer.name,
        reminderType
      );

      if (!result.success) {
        throw new Error(
          result.error || 'The reminder SMS could not be sent.'
        );
      }

      logReminderSent(
        customer.id,
        reminderType as any,
        reminderText
      );

      setFeedback({
        customerId: customer.id,
        message: `Reminder SMS accepted for ${customer.name}.`,
        success: true,
      });
    } catch (error) {
      console.error('Overdue reminder SMS error:', error);

      setFeedback({
        customerId: customer.id,
        message:
          error instanceof Error
            ? error.message
            : 'Reminder SMS failed. Check the backend configuration.',
        success: false,
      });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Monthly Reminders
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Send broadband renewal and overdue reminders to subscribers.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label
          htmlFor="reminder-search"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Search subscribers
        </label>

        <input
          id="reminder-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, phone, or subscriber ID..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">
            Subscribers ({filteredCustomers.length})
          </h2>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No subscribers found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCustomers.map((customer: any) => {
              const type = getReminderType(customer.expiryDate);
              const isOverdue = type === 'overdue';
              const isSending = sendingId === customer.id;

              return (
                <div
                  key={customer.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {customer.name}
                      </h3>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          isOverdue
                            ? 'bg-red-100 text-red-700'
                            : type === 'due'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {isOverdue
                          ? 'Overdue'
                          : type === 'due'
                            ? 'Expiring soon'
                            : 'Upcoming'}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {customer.phone}
                      {customer.subscriberId
                        ? ` · ID: ${customer.subscriberId}`
                        : ''}
                    </p>

                    {feedback?.customerId === customer.id && (
  <p
    role="status"
    className={`mt-2 text-sm ${
      feedback?.success
        ? 'text-green-700'
        : 'text-red-700'
    }`}
  >
    {feedback?.message}
  </p>
)}
                  </div>

                  <button
                    type="button"
                    disabled={isSending || sendingId !== null}
                    onClick={() => handleSendSmsReminder(customer)}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSending
                      ? 'Sending...'
                      : 'Send SMS Reminder'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">
        SMS delivery depends on your configured backend and approved
        messaging template. A successful API response does not necessarily
        confirm delivery to the subscriber.
      </p>
    </div>
  );
};

export default MonthlyRemindersView;
