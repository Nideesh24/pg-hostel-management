'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Loader2, Settings2, X } from 'lucide-react';
import { PasswordInput } from '@/components/PasswordInput';

interface OwnerAccountSettingsProps {
  name: string;
  email: string;
  onUpdated: (profile: { name: string; email: string }) => void;
}

export function OwnerAccountSettings({ name, email, onUpdated }: OwnerAccountSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name, email, currentPassword: '', newPassword: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const open = () => {
    setForm({ name, email, currentPassword: '', newPassword: '' });
    setError(null);
    setSaved(false);
    setIsOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch('/api/owner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to update account settings.');
      onUpdated({ name: data.user.name, email: data.user.email });
      setForm((current) => ({ ...current, currentPassword: '', newPassword: '' }));
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update account settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <Settings2 className="h-4 w-4" />
        <span>Account Settings</span>
      </button>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="owner-settings-title"
            className="my-auto max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-slate-700 dark:bg-zinc-900"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="owner-settings-title" className="text-lg font-bold text-slate-900 dark:text-white">Account Settings</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update your owner account details.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close account settings" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
            {saved && <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />Account settings saved.</div>}

            <form onSubmit={save} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Full Name
                <input required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email ID
                <input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
              </label>
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Change Password <span className="font-normal text-slate-500">(optional)</span></p>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Current Password
                    <PasswordInput autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    New Password
                    <PasswordInput minLength={8} autoComplete="new-password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  </label>
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 sm:text-sm">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </form>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
