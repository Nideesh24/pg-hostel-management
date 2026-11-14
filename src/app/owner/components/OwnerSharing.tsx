'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Copy, Link2, Loader2, Plus, Shield, UserRoundX } from 'lucide-react';

interface OwnerInviteRecord {
  id: string;
  token: string;
  invitedEmail: string | null;
  status: 'LINK_CREATED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REVOKED';
  applicantName: string | null;
  applicantEmail: string | null;
  applicantPhone: string | null;
  expiresAt: string;
}

interface CoOwnerRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  inviteId: string;
}

export function OwnerSharing({ propertyId }: { propertyId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [invites, setInvites] = useState<OwnerInviteRecord[]>([]);
  const [coOwners, setCoOwners] = useState<CoOwnerRecord[]>([]);
  const [isPrimaryOwner, setIsPrimaryOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);
  const [latestLink, setLatestLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!propertyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/owner/invites?propertyId=${encodeURIComponent(propertyId)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load shared-owner access.');
      setInvites(data.invites);
      setCoOwners(data.coOwners);
      setIsPrimaryOwner(data.isPrimaryOwner);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load shared-owner access.');
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  const createInvite = async () => {
    setIsCreating(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/owner/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to create an owner invite.');
      setLatestLink(data.invite.link);
      try {
        await navigator.clipboard.writeText(data.invite.link);
        setNotice('Invite link created and copied to clipboard.');
      } catch {
        setNotice('Invite link created. Use Copy Link to copy it.');
      }
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create an owner invite.');
    } finally {
      setIsCreating(false);
    }
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/owner-invite/${token}`);
      setNotice('Invite link copied to clipboard.');
      setError(null);
    } catch {
      setError('Clipboard access is unavailable. Select and copy the invite link manually.');
    }
  };

  const updateInvite = async (inviteId: string, action: 'APPROVE' | 'REJECT' | 'REVOKE') => {
    setBusyInvite(inviteId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/owner/invites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to update owner access.');
      setNotice(data.message);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update owner access.');
    } finally {
      setBusyInvite(null);
    }
  };

  const pending = invites.filter((invite) => invite.status === 'PENDING_APPROVAL');
  const linkCreated = invites.filter((invite) => invite.status === 'LINK_CREATED');

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
        <Shield className="h-4 w-4" />
        <span>Shared Ownership</span>
      </button>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="owner-sharing-title" className="my-auto max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-slate-700 dark:bg-zinc-900">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 id="owner-sharing-title" className="text-lg font-bold text-slate-900 dark:text-white">Shared Ownership / Co-Owners</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Invite trusted people to manage this property.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close shared ownership" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">×</button>
            </div>
            {error && <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
            {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</div>}
            {isLoading ? <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading access records…</div> : (
              <div className="space-y-6">
                {isPrimaryOwner && (
                  <section className="rounded-xl border border-slate-200 bg-stone-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div><h3 className="font-semibold text-slate-900 dark:text-white">Owner Invite Link</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Links expire after seven days and can be used once.</p></div>
                      <button type="button" disabled={isCreating} onClick={createInvite} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Generate Owner Invite Link
                      </button>
                    </div>
                    {latestLink && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input readOnly aria-label="Generated owner invite link" value={latestLink} className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" /><button type="button" onClick={() => void copyLink(latestLink.split('/').pop() || '')} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"><Copy className="h-4 w-4" />Copy Link</button></div>}
                    {linkCreated.length > 0 && <div className="mt-3 space-y-2">{linkCreated.map((invite) => <div key={invite.id} className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center"><span className="text-slate-600 dark:text-slate-300"><Link2 className="mr-1 inline h-3.5 w-3.5" />{invite.invitedEmail || 'Open invite'} · expires {new Date(invite.expiresAt).toLocaleDateString()}</span><button type="button" onClick={() => void copyLink(invite.token)} className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"><Copy className="h-3.5 w-3.5" />Copy Link</button></div>)}</div>}
                  </section>
                )}

                <section>
                  <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Pending Ownership Requests <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">{pending.length}</span></h3>
                  {pending.length === 0 ? <p className="rounded-lg bg-stone-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">No pending ownership requests.</p> : <div className="space-y-2">{pending.map((invite) => <article key={invite.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:flex-row sm:items-center"><div><p className="font-semibold text-slate-900 dark:text-white">{invite.applicantName}</p><p className="text-xs text-slate-500 dark:text-slate-400">{invite.applicantEmail} · {invite.applicantPhone}</p></div><div className="flex gap-2"><button type="button" disabled={busyInvite === invite.id} onClick={() => void updateInvite(invite.id, 'APPROVE')} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" />Approve Access</button><button type="button" disabled={busyInvite === invite.id} onClick={() => void updateInvite(invite.id, 'REJECT')} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:text-rose-300"><UserRoundX className="h-4 w-4" />Reject</button></div></article>)}</div>}
                </section>

                <section>
                  <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Active Co-Owners</h3>
                  {coOwners.length === 0 ? <p className="rounded-lg bg-stone-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">No active co-owners.</p> : <div className="space-y-2">{coOwners.map((coOwner) => <article key={coOwner.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:flex-row sm:items-center"><div><p className="font-semibold text-slate-900 dark:text-white">{coOwner.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{coOwner.email} · {coOwner.phone || 'No phone'}</p></div><button type="button" disabled={busyInvite === coOwner.inviteId} onClick={() => void updateInvite(coOwner.inviteId, 'REVOKE')} className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:text-rose-300"><UserRoundX className="h-4 w-4" />Revoke Access</button></article>)}</div>}
                </section>
              </div>
            )}
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
