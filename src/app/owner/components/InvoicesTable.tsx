'use client';

import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle,
  Zap,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  billingMonth: number;
  billingYear: number;
  rentAmount: number;
  electricityAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'PAID' | 'UNPAID' | 'OVERDUE' | 'PARTIALLY_PAID';
  dueDate: string;
  paidAt?: string | null;
  tenant?: {
    id: string;
    name: string;
    phone: string;
    bed?: {
      bedNumber: string;
      room?: {
        roomNumber: string;
        floor: number;
      };
    };
  };
}

interface InvoicesTableProps {
  invoices: InvoiceItem[];
  isLoading?: boolean;
  propertyId: string;
  onRefresh: () => void;
}

export const InvoicesTable: React.FC<InvoicesTableProps> = ({
  invoices,
  isLoading,
  propertyId,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal state for adding electricity charge
  const [electricityModal, setElectricityModal] = useState<{
    isOpen: boolean;
    invoice: InvoiceItem | null;
    amount: string;
  }>({
    isOpen: false,
    invoice: null,
    amount: '',
  });

  const getStatusBadge = (status: InvoiceItem['status']) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
      case 'OVERDUE':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
      case 'UNPAID':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600';
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const tenantName = inv.tenant?.name?.toLowerCase() || '';
    const roomNumber = inv.tenant?.bed?.room?.roomNumber?.toLowerCase() || '';
    const invNumber = inv.invoiceNumber.toLowerCase();
    const matchesSearch =
      tenantName.includes(searchTerm.toLowerCase()) ||
      roomNumber.includes(searchTerm.toLowerCase()) ||
      invNumber.includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || inv.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  // Action: Generate Monthly Rent
  const handleGenerateMonthlyRent = async () => {
    setIsGenerating(true);
    setActionError(null);
    setActionSuccess(null);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Default due date to 5th of current or next month
    const dueDate = new Date(currentYear, currentMonth - 1, 5).toISOString();

    try {
      const res = await fetch('/api/owner/invoices/generate-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth,
          year: currentYear,
          dueDate,
          propertyId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate monthly invoices.');
      }

      setActionSuccess(data.message || `Invoices processed for ${currentMonth}/${currentYear}.`);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Error generating invoices.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Action: Mark Paid
  const handleMarkPaid = async (invoiceId: string) => {
    setActionError(null);
    try {
      const res = await fetch('/api/owner/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          action: 'MARK_PAID',
          paymentMethod: 'CASH',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to mark invoice as paid.');
      }

      setActionSuccess('Invoice successfully marked as PAID.');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Action: Save Electricity Charge
  const handleSaveElectricity = async () => {
    if (!electricityModal.invoice || !electricityModal.amount) return;

    setActionError(null);
    try {
      const res = await fetch('/api/owner/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: electricityModal.invoice.id,
          action: 'ADD_ELECTRICITY',
          electricityAmount: Number(electricityModal.amount),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update electricity charge.');
      }

      setElectricityModal({ isOpen: false, invoice: null, amount: '' });
      setActionSuccess('Electricity charges updated successfully.');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header & Action Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Rent & Invoicing Ledger</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track rent collections, electricity add-ons, and payment settlement records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleGenerateMonthlyRent}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span>Generate Monthly Rent</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="mx-6 mt-4 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="ml-2 font-bold text-emerald-900 dark:text-emerald-200">
            ×
          </button>
        </div>
      )}

      {actionError && (
        <div className="mx-6 mt-4 flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-2 font-bold text-rose-900 dark:text-rose-200">
            ×
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-3 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-800/50">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenant, room, or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Status:</span>
          {(['ALL', 'UNPAID', 'PAID', 'OVERDUE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3">Tenant Details</th>
              <th className="px-4 py-3">Room / Bed</th>
              <th className="px-4 py-3 text-right">Base Rent</th>
              <th className="px-4 py-3 text-right">Electricity</th>
              <th className="px-4 py-3 text-right">Total Bill</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal dark:divide-slate-800">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={8} className="px-6 py-4">
                    <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800" />
                  </td>
                </tr>
              ))
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                  <FileText className="mx-auto mb-2 h-7 w-7 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No invoices match your query.</p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Click "Generate Monthly Rent" to produce invoices.</p>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const roomInfo = inv.tenant?.bed?.room;
                const bedNumber = inv.tenant?.bed?.bedNumber;
                const isPaid = inv.status === 'PAID';

                return (
                  <tr key={inv.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                    {/* Tenant */}
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{inv.tenant?.name || 'Unassigned'}</div>
                      <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{inv.invoiceNumber}</div>
                    </td>

                    {/* Room/Bed */}
                    <td className="px-4 py-3.5">
                      {roomInfo ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-800 dark:text-slate-200">Room {roomInfo.roomNumber}</span>
                          <span className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {bedNumber}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Base Rent */}
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                      ₹{inv.rentAmount.toLocaleString('en-IN')}
                    </td>

                    {/* Electricity Dues */}
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                      {inv.electricityAmount > 0 ? (
                        `₹${inv.electricityAmount.toLocaleString('en-IN')}`
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">₹0</span>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ₹{inv.totalAmount.toLocaleString('en-IN')}
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadge(
                          inv.status
                        )}`}
                      >
                        {inv.status}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isPaid && (
                          <>
                            <button
                              onClick={() =>
                                setElectricityModal({
                                  isOpen: true,
                                  invoice: inv,
                                  amount: inv.electricityAmount ? String(inv.electricityAmount) : '',
                                })
                              }
                              title="Add / Update Electricity Charges"
                              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Zap className="h-3 w-3 text-amber-600" />
                              <span>+ Elec</span>
                            </button>

                            <button
                              onClick={() => handleMarkPaid(inv.id)}
                              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span>Mark Paid</span>
                            </button>
                          </>
                        )}
                        {isPaid && (
                          <span className="text-[11px] italic text-slate-400 dark:text-slate-500">Settled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Electricity Modal */}
      {electricityModal.isOpen && electricityModal.invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-2 sm:p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs"
            onClick={() => setElectricityModal({ isOpen: false, invoice: null, amount: '' })}
          />
          <div className="relative my-auto max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Add Electricity Charges</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Invoice #{electricityModal.invoice.invoiceNumber} for{' '}
              {electricityModal.invoice.tenant?.name}
            </p>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Electricity Dues (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 450"
                value={electricityModal.amount}
                onChange={(e) =>
                  setElectricityModal((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="min-h-[44px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500 sm:text-sm"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setElectricityModal({ isOpen: false, invoice: null, amount: '' })}
                className="min-h-[44px] rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveElectricity}
                className="min-h-[44px] rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                Update Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
