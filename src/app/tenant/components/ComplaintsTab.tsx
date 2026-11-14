'use client';

import React, { useState } from 'react';
import {
  Wrench,
  AlertCircle,
  Plus,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  X,
  MessageSquare,
} from 'lucide-react';

export interface TenantComplaint {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  description: string;
  photoUrl?: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | string;
  priority?: string;
  assignedTo?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

interface ComplaintsTabProps {
  tenantId: string;
  complaints: TenantComplaint[];
  isLoading?: boolean;
  onRefresh: () => void;
}

const CATEGORIES = [
  { id: 'PLUMBING', label: 'Plumbing', icon: '🚰' },
  { id: 'ELECTRICAL', label: 'Electrical', icon: '⚡' },
  { id: 'WIFI', label: 'Wi-Fi / Net', icon: '📶' },
  { id: 'CLEANING', label: 'Cleaning', icon: '🧹' },
  { id: 'FOOD', label: 'Mess / Food', icon: '🍽️' },
  { id: 'OTHER', label: 'Other', icon: '🛠️' },
];

export const ComplaintsTab: React.FC<ComplaintsTabProps> = ({
  tenantId,
  complaints,
  isLoading,
  onRefresh,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [category, setCategory] = useState('PLUMBING');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!title.trim() || !description.trim()) {
      setStatusMessage({ type: 'error', text: 'Please fill in title and description.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/tenant/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          category,
          title: title.trim(),
          description: description.trim(),
          photoUrl: photoUrl.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to raise complaint.');
      }

      setStatusMessage({ type: 'success', text: `Ticket ${data.data.ticketNumber} logged!` });
      setTitle('');
      setDescription('');
      setPhotoUrl('');
      setIsFormOpen(false);
      onRefresh();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error creating ticket.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'IN_PROGRESS':
        return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'RESOLVED':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      default:
        return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6 px-4 pt-6">
      {/* Header & Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Complaints & Help</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track and report maintenance issues directly.</p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800 active:scale-95 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span>{isFormOpen ? 'Close' : 'Log Issue'}</span>
        </button>
      </div>

      {/* Inline Feedback Alert */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between rounded-xl border p-3 text-xs ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="ml-2 font-bold">
            ×
          </button>
        </div>
      )}

      {/* 1. Log New Issue Form Drawer */}
      {isFormOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-1 text-sm font-bold text-slate-900 dark:text-white">Describe the Maintenance Issue</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Our PG caretaker and technicians will be notified immediately.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Selector Chips */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Issue Category *
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {CATEGORIES.map((cat) => (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition-all ${
                      category === cat.id
                        ? 'border-slate-900 bg-slate-900 font-semibold text-white shadow-2xs dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Issue Summary *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Geyser not heating water in Room 101"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Details & Location *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Provide details (e.g., washroom geyser power trip switch is loose)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-500"
              />
            </div>

            {/* Optional Photo URL */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Photo URL (Optional)
              </label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://image-link.com/photo.jpg"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <span>Submit Complaint Ticket</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* 2. Active Tickets Feed */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Logged Grievances ({complaints.length})
        </h2>

        {complaints.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            No complaints logged yet. Everything in your room is running smoothly!
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((ticket) => (
              <div
                key={ticket.id}
                className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4.5 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      {ticket.ticketNumber}
                    </span>
                    <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                      {ticket.title}
                    </h3>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                      ticket.status
                    )}`}
                  >
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {ticket.description}
                </p>

                {ticket.photoUrl && (
                  <div className="mt-2">
                    <img
                      src={ticket.photoUrl}
                      alt="Complaint attachment"
                      className="h-24 w-36 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {ticket.assignedTo && (
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Assigned: {ticket.assignedTo}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
