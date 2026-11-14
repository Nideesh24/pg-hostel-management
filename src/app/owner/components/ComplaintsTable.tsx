'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock, Wrench } from 'lucide-react';

export interface OwnerComplaintItem {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: string;
  createdAt: string;
  tenant: {
    id: string;
    name: string;
    phone: string;
    bed?: {
      bedLabel: string;
      room?: { roomNumber: string } | null;
    } | null;
  };
}

export function ComplaintsTable({
  complaints,
  isLoading,
  onRefresh,
}: {
  complaints: OwnerComplaintItem[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (complaintId: string, status: 'IN_PROGRESS' | 'RESOLVED') => {
    setUpdatingId(complaintId);
    try {
      const res = await fetch('/api/owner/complaints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId, status }),
      });
      if (res.ok) {
        onRefresh();
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Resident Complaints &amp; Maintenance
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Review grievances logged by tenants and update ticket resolution status.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {complaints.length} Total
        </span>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-xs text-slate-500">Loading resident complaints…</p>
      ) : complaints.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-slate-800">
          <Wrench className="mx-auto mb-2 h-5 w-5 text-slate-400" />
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No complaints logged yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((item) => {
            const roomNum = item.tenant?.bed?.room?.roomNumber;
            const bedLabel = item.tenant?.bed?.bedLabel;
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {item.ticketNumber}
                    </span>
                    <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      {item.category}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        item.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : item.status === 'IN_PROGRESS'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{item.description}</p>
                  <p className="pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Raised by <span className="font-semibold text-slate-700 dark:text-slate-200">{item.tenant?.name}</span>
                    {roomNum ? ` · Room ${roomNum}${bedLabel ? ` (${bedLabel})` : ''}` : ''} · {item.tenant?.phone}
                  </p>
                </div>

                {item.status !== 'RESOLVED' && (
                  <div className="flex shrink-0 items-center gap-2">
                    {item.status === 'OPEN' && (
                      <button
                        type="button"
                        disabled={updatingId === item.id}
                        onClick={() => handleStatusChange(item.id, 'IN_PROGRESS')}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>In Progress</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={updatingId === item.id}
                      onClick={() => handleStatusChange(item.id, 'RESOLVED')}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}