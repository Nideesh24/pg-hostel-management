'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Download, FileUp, Loader2 } from 'lucide-react';
import { compressImageToDataUrl, MAX_UPLOAD_BYTES, readFileAsDataUrl } from '@/lib/client-uploads';

interface TenantDocumentRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePhotoUrl: string | null;
  idDocumentUrl: string | null;
  bed: { bedNumber: string; room: { roomNumber: string } } | null;
}

type UploadField = 'profilePhotoUrl' | 'idDocumentUrl';

export function TenantDocumentsVault({ propertyId }: { propertyId: string }) {
  const [tenants, setTenants] = useState<TenantDocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/owner/tenants?propertyId=${encodeURIComponent(propertyId)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load tenant documents.');
      setTenants(data.tenants);
      setErrors((current) => ({ ...current, load: '' }));
    } catch (error) {
      setErrors((current) => ({ ...current, load: error instanceof Error ? error.message : 'Unable to load tenant documents.' }));
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  const upload = async (tenantId: string, field: UploadField, file?: File) => {
    if (!file) return;
    const key = `${tenantId}:${field}`;
    setErrors((current) => ({ ...current, [tenantId]: '' }));
    setNotice(null);
    if (file.size >= MAX_UPLOAD_BYTES) {
      setErrors((current) => ({ ...current, [tenantId]: 'Choose a file smaller than 2 MB.' }));
      return;
    }
    if (field === 'profilePhotoUrl' && !['image/jpeg', 'image/png'].includes(file.type)) {
      setErrors((current) => ({ ...current, [tenantId]: 'Profile photos must be JPG or PNG files.' }));
      return;
    }
    if (field === 'idDocumentUrl' && !['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setErrors((current) => ({ ...current, [tenantId]: 'ID documents must be JPG, PNG, or PDF files.' }));
      return;
    }

    setBusy(key);
    try {
      const dataUrl = field === 'profilePhotoUrl'
        ? await compressImageToDataUrl(file)
        : await readFileAsDataUrl(file);
      const response = await fetch(`/api/owner/tenants/${encodeURIComponent(tenantId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: dataUrl }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save the uploaded document.');
      setTenants((current) => current.map((tenant) => tenant.id === tenantId
        ? { ...tenant, profilePhotoUrl: data.tenant.profilePhotoUrl, idDocumentUrl: data.tenant.idDocumentUrl }
        : tenant));
      setNotice('Tenant document updated.');
    } catch (error) {
      setErrors((current) => ({ ...current, [tenantId]: error instanceof Error ? error.message : 'Unable to save the uploaded document.' }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tenant Photos & ID Documents</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review and manage tenant identity documents. Uploads are limited to 2 MB.</p>
      </div>

      {errors.load && <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{errors.load}</div>}
      {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</p>}

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading tenant files…</div>
      ) : tenants.length === 0 ? (
        <p className="rounded-xl bg-stone-50 p-5 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">No approved tenants to display.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tenants.map((tenant) => {
            const photoBusy = busy === `${tenant.id}:profilePhotoUrl`;
            const documentBusy = busy === `${tenant.id}:idDocumentUrl`;
            return (
              <article key={tenant.id} className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900 dark:text-white">{tenant.name}</h3>
                    <p className="break-all text-xs text-slate-500 dark:text-slate-400">{tenant.email}</p>
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{tenant.phone}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-stone-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {tenant.bed ? `${tenant.bed.room.roomNumber} · ${tenant.bed.bedNumber}` : 'No bed'}
                  </span>
                </div>

                {errors[tenant.id] && <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{errors[tenant.id]}</div>}

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                  <div className="min-w-0">
                    <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Profile Photo</p>
                    {tenant.profilePhotoUrl ? (
                      <img src={tenant.profilePhotoUrl} alt={`${tenant.name} profile`} className="h-36 w-full rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                    ) : (
                      <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-stone-50 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">No photo uploaded</div>
                    )}
                    <label className="mt-2 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                      {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                      {tenant.profilePhotoUrl ? 'Replace Photo' : 'Upload Photo'}
                      <input type="file" accept="image/jpeg,image/png" className="sr-only" disabled={Boolean(busy)} onChange={(event) => { void upload(tenant.id, 'profilePhotoUrl', event.target.files?.[0]); event.currentTarget.value = ''; }} />
                    </label>
                  </div>

                  <div className="min-w-0">
                    <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">ID Document Copy</p>
                    {tenant.idDocumentUrl ? (
                      tenant.idDocumentUrl.startsWith('data:application/pdf') ? (
                        <iframe title={`${tenant.name} ID document preview`} src={tenant.idDocumentUrl} className="h-36 w-full rounded-lg border border-slate-200 dark:border-slate-700" />
                      ) : (
                        <a href={tenant.idDocumentUrl} target="_blank" rel="noreferrer">
                          <img src={tenant.idDocumentUrl} alt={`${tenant.name} ID document preview`} className="h-36 w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700" />
                        </a>
                      )
                    ) : (
                      <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-stone-50 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">No ID copy uploaded</div>
                    )}
                    {tenant.idDocumentUrl && <a href={tenant.idDocumentUrl} download={`${tenant.name.replace(/[^a-z0-9]/gi, '-')}-id-document`} className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"><Download className="h-4 w-4" />Download Document</a>}
                    <label className="mt-2 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                      {documentBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                      {tenant.idDocumentUrl ? 'Replace ID Copy' : 'Upload ID Copy'}
                      <input type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" disabled={Boolean(busy)} onChange={(event) => { void upload(tenant.id, 'idDocumentUrl', event.target.files?.[0]); event.currentTarget.value = ''; }} />
                    </label>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
