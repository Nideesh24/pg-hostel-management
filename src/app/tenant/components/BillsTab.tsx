'use client';

import React from 'react';
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  ClockAlert,
  ArrowUpRight,
  ExternalLink,
  Download,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

export interface TenantInvoice {
  id: string;
  invoiceNumber: string;
  billingMonth: number;
  billingYear: number;
  rentAmount: number;
  electricityAmount: number;
  waterCharges?: number;
  maintenanceCharges?: number;
  totalAmount: number;
  paidAmount: number;
  status: 'PAID' | 'UNPAID' | 'OVERDUE' | string;
  dueDate: string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  paymentReceiptUrl?: string | null;
}

interface BillsTabProps {
  invoices: TenantInvoice[];
  isLoading?: boolean;
  onOpenUpiModal: (invoice: TenantInvoice) => void;
}

export const BillsTab: React.FC<BillsTabProps> = ({
  invoices,
  isLoading,
  onOpenUpiModal,
}) => {
  // Find current/latest active invoice (first in list)
  const activeInvoice = invoices[0] || null;
  const isPaid = activeInvoice?.status === 'PAID';
  const isOverdue = activeInvoice?.status === 'OVERDUE';

  const pastInvoices = invoices.slice(1);

  return (
    <div className="space-y-6 px-4 pt-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Bills & Rent Ledger</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Monthly stay dues, itemized utility charges, and payment receipts.
        </p>
      </div>

      {/* 1. Active Monthly Invoice Card */}
      {activeInvoice ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Current Billing Cycle
              </span>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {new Date(activeInvoice.billingYear, activeInvoice.billingMonth - 1).toLocaleDateString(
                  'en-IN',
                  { month: 'long', year: 'numeric' }
                )}
              </div>
            </div>

            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isPaid
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : isOverdue
                  ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                  : 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {activeInvoice.status}
            </span>
          </div>

          {/* Itemized Charge Breakdown */}
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Base Bed Rent</span>
              <span className="font-mono font-medium text-slate-900 dark:text-white">
                ₹{activeInvoice.rentAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Electricity & Utilities</span>
              <span className="font-mono font-medium text-slate-900 dark:text-white">
                ₹{activeInvoice.electricityAmount.toLocaleString('en-IN')}
              </span>
            </div>

            {Boolean(activeInvoice.maintenanceCharges) && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Maintenance Charges</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  ₹{Number(activeInvoice.maintenanceCharges).toLocaleString('en-IN')}
                </span>
              </div>
            )}

            <div className="my-1 h-[1px] bg-slate-100 dark:bg-slate-800" />

            {/* Total Due */}
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Total Amount Due</span>
              <span className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white">
                ₹{activeInvoice.totalAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
              Due Date:{' '}
              {new Date(activeInvoice.dueDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>

          {/* Dynamic UPI Payment Button */}
          {!isPaid ? (
            <button
              onClick={() => onOpenUpiModal(activeInvoice)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.99] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <CreditCard className="h-4 w-4 text-emerald-400" />
              <span>Pay ₹{activeInvoice.totalAmount.toLocaleString('en-IN')} via UPI</span>
            </button>
          ) : (
            <div className="mt-5 flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-3 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold">Paid via {activeInvoice.paymentMethod || 'UPI'}</span>
              </div>
              {activeInvoice.paymentReceiptUrl && (
                <a
                  href={activeInvoice.paymentReceiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-bold text-emerald-800 underline dark:text-emerald-300"
                >
                  Receipt <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
          No active invoice found for your profile.
        </div>
      )}

      {/* 2. Past Invoices History List */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Past Payment History
        </h2>

        {pastInvoices.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            No previous invoices recorded yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {pastInvoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {new Date(inv.billingYear, inv.billingMonth - 1).toLocaleDateString('en-IN', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                    {inv.invoiceNumber}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    ₹{inv.totalAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-1.5">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                      PAID
                    </span>
                    {inv.paymentReceiptUrl && (
                      <a
                        href={inv.paymentReceiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        title="View Receipt"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
