'use client';

import React, { useState } from 'react';
import { X, QrCode, CheckCircle2, Loader2, ArrowUpRight, Copy, Check, ShieldCheck } from 'lucide-react';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  tenantName: string;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  invoiceId,
  invoiceNumber,
  totalAmount,
  tenantName,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const upiId = 'sunrisepg@okaxis';

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const dummyReceiptUrl = `https://storage.hostelpg.internal/receipts/${invoiceNumber}-${Date.now()}.png`;

      const res = await fetch(`/api/tenant/invoices/${invoiceId}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentReceiptUrl: dummyReceiptUrl,
          paymentMode: 'UPI',
          transactionReference: `UPI/TXN/${Date.now().toString().slice(-8)}`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record payment.');
      }

      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment simulation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer / Modal */}
      <div className="relative max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-4 shadow-2xl transition-all sm:p-6 dark:border-slate-700 dark:bg-slate-900 sm:rounded-2xl">
        {/* Mobile drag handle */}
        <div className="mx-auto -mt-2 mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Instant UPI Settlement
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Pay Monthly Rent</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close payment dialog"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Amount Pill */}
        <div className="mt-4 rounded-xl bg-slate-900 p-4 text-center text-white shadow-sm dark:bg-slate-800">
          <span className="text-xs text-slate-400 uppercase tracking-wider">Total Amount Due</span>
          <div className="mt-0.5 font-mono text-3xl font-extrabold tracking-tight">
            ₹{totalAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
            Invoice: {invoiceNumber}
          </span>
        </div>

        {/* QR Code Placeholder with simulated SVG QR */}
        <div className="mt-5 flex flex-col items-center">
          <div className="relative flex h-48 w-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-white">
            {/* Visual SVG QR representation */}
            <svg
              className="h-36 w-36 text-slate-800"
              viewBox="0 0 100 100"
              fill="currentColor"
            >
              {/* Corner position markers */}
              <rect x="5" y="5" width="26" height="26" rx="4" fill="currentColor" />
              <rect x="9" y="9" width="18" height="18" rx="2" fill="white" />
              <rect x="13" y="13" width="10" height="10" fill="currentColor" />

              <rect x="69" y="5" width="26" height="26" rx="4" fill="currentColor" />
              <rect x="73" y="9" width="18" height="18" rx="2" fill="white" />
              <rect x="77" y="13" width="10" height="10" fill="currentColor" />

              <rect x="5" y="69" width="26" height="26" rx="4" fill="currentColor" />
              <rect x="9" y="73" width="18" height="18" rx="2" fill="white" />
              <rect x="13" y="77" width="10" height="10" fill="currentColor" />

              {/* Grid patterns */}
              <rect x="36" y="10" width="8" height="8" fill="currentColor" />
              <rect x="48" y="10" width="8" height="8" fill="currentColor" />
              <rect x="36" y="24" width="12" height="8" fill="currentColor" />
              <rect x="52" y="24" width="8" height="8" fill="currentColor" />

              <rect x="10" y="36" width="12" height="8" fill="currentColor" />
              <rect x="26" y="36" width="8" height="8" fill="currentColor" />
              <rect x="10" y="50" width="8" height="12" fill="currentColor" />
              <rect x="22" y="48" width="12" height="8" fill="currentColor" />

              <rect x="40" y="40" width="20" height="20" rx="3" fill="currentColor" />
              <rect x="44" y="44" width="12" height="12" fill="white" />
              <rect x="48" y="48" width="4" height="4" fill="currentColor" />

              <rect x="66" y="36" width="14" height="8" fill="currentColor" />
              <rect x="84" y="36" width="8" height="12" fill="currentColor" />
              <rect x="68" y="48" width="10" height="14" fill="currentColor" />
              <rect x="82" y="52" width="10" height="8" fill="currentColor" />

              <rect x="36" y="66" width="8" height="12" fill="currentColor" />
              <rect x="48" y="68" width="12" height="8" fill="currentColor" />
              <rect x="36" y="82" width="14" height="8" fill="currentColor" />
              <rect x="54" y="80" width="8" height="10" fill="currentColor" />
              <rect x="68" y="68" width="12" height="8" fill="currentColor" />
              <rect x="84" y="68" width="8" height="12" fill="currentColor" />
              <rect x="70" y="80" width="12" height="10" fill="currentColor" />
              <rect x="86" y="84" width="6" height="6" fill="currentColor" />
            </svg>

            <span className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Scan with Any UPI App
            </span>
          </div>

          {/* UPI ID copy pill */}
          <div className="mt-3 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span className="font-mono font-medium">{upiId}</span>
            <button
              onClick={handleCopyUpi}
              className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              title="Copy UPI ID"
            >
              {copiedUpi ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* UPI Apps Row */}
        <div className="mt-4 flex items-center justify-around border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Google Pay
          </span>
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            PhonePe
          </span>
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Paytm UPI
          </span>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-center text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-5 space-y-2">
          <button
            onClick={handleConfirmPayment}
            disabled={isProcessing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying with Bank...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Simulate & Confirm Payment</span>
              </>
            )}
          </button>

          <p className="flex items-center justify-center gap-1 text-center text-[10px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            256-Bit Encrypted Direct Bank Settlement
          </p>
        </div>
      </div>
    </div>
  );
};
