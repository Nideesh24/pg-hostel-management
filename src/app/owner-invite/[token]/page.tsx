'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { PasswordInput } from '@/components/PasswordInput';

const HOSTEL_NAME = 'OM MURUGAA MENS HOSTEL';

export default function OwnerInvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [invitedEmail, setInvitedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });

  useEffect(() => {
    if (!token) return;
    fetch(`/api/owner-invite/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'This owner invite link is invalid or expired.');
        const email = data.invite.invitedEmail || '';
        setInvitedEmail(email);
        setForm((current) => ({ ...current, email }));
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to validate this invite link.'))
      .finally(() => setIsLoading(false));
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/owner-invite/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to submit your ownership request.');
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit your ownership request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-stone-50 px-3 py-8 dark:bg-slate-950 sm:px-6">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-zinc-900">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/logo.svg" alt="" width={48} height={48} priority />
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white sm:text-base">{HOSTEL_NAME}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Request Shared Owner Access</p>
          </div>
        </div>

        {error && <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-500 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Checking invite link…</div>
        ) : submitted ? (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            Your ownership request has been submitted. You can log in once the primary owner approves your access.
          </div>
        ) : !error ? (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Submit your details to request shared ownership access. The primary owner must approve your account before you can sign in.</p>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Full Name
              <input required autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email ID
              <input required type="email" autoComplete="email" readOnly={Boolean(invitedEmail)} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 read-only:bg-stone-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:read-only:bg-slate-700 sm:text-sm" />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Phone Number
              <input required type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Create Password
              <PasswordInput required minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Confirm Password
              <PasswordInput required minLength={8} autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
            <button type="submit" disabled={isSubmitting} className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 sm:text-sm">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Request Shared Owner Access
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
