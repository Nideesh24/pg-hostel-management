'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileUp, Loader2, Trash2 } from 'lucide-react';
import { compressImageToDataUrl, MAX_UPLOAD_BYTES } from '@/lib/client-uploads';

interface TenantProfile {
  id: string;
  fullName: string | null;
  dateOfBirth: string | null;
  permanentHomeAddress: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  occupationOrCollege: string | null;
  idReferenceNumber: string | null;
  profilePhotoUrl: string | null;
  idDocumentUrl: string | null;
}

const EMPTY_PROFILE: TenantProfile = {
  id: '',
  fullName: '',
  dateOfBirth: '',
  permanentHomeAddress: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  occupationOrCollege: '',
  idReferenceNumber: '',
  profilePhotoUrl: null,
  idDocumentUrl: null,
};

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export function TenantProfileKyc() {
  const [profile, setProfile] = useState<TenantProfile>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/tenant/profile', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load your profile.');
        const loaded = data.profile as TenantProfile;
        setProfile({
          ...loaded,
          dateOfBirth: loaded.dateOfBirth ? loaded.dateOfBirth.slice(0, 10) : '',
        });
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load your profile.'))
      .finally(() => setIsLoading(false));
  }, []);

  const update = (field: keyof TenantProfile, value: string | null) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const handleFile = (file?: File) => {
    setError(null);
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type) || file.size >= MAX_FILE_BYTES) {
      setError('Choose a JPG, PNG, or PDF file under 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('Unable to read the selected document.');
        return;
      }
      update('idDocumentUrl', reader.result);
    };
    reader.onerror = () => setError('Unable to read the selected document.');
    reader.readAsDataURL(file);
  };

  const handlePhoto = async (file?: File) => {
    setError(null);
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size >= MAX_UPLOAD_BYTES) {
      setError('Choose a JPG or PNG profile photo under 2 MB.');
      return;
    }
    try {
      update('profilePhotoUrl', await compressImageToDataUrl(file));
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Unable to process the profile photo.');
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch('/api/tenant/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save your profile.');
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Profile & KYC Verification</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Keep your personal details and identity document up to date.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Profile saved.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
          {[
            { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
            { key: 'occupationOrCollege', label: 'Occupation / College', type: 'text' },
            { key: 'emergencyContactName', label: 'Emergency Contact Name', type: 'text' },
            { key: 'emergencyContactPhone', label: 'Emergency Contact Phone', type: 'tel' },
            { key: 'idReferenceNumber', label: 'ID Reference Number', type: 'text' },
          ].map((field) => (
            <label key={field.key} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {field.label}
              <input
                type={field.type}
                value={String(profile[field.key as keyof TenantProfile] || '')}
                onChange={(event) => update(field.key as keyof TenantProfile, event.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm"
              />
            </label>
          ))}
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 md:col-span-2">
            Permanent Home Address
            <textarea
              rows={3}
              value={profile.permanentHomeAddress || ''}
              onChange={(event) => update('permanentHomeAddress', event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm"
            />
          </label>

          <div className="grid gap-4 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700 md:col-span-2 md:grid-cols-2">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tenant Profile Photo</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">JPG or PNG · smaller than 2 MB</p>
                </div>
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  <FileUp className="h-4 w-4" />
                  Upload Photo
                  <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(event) => handlePhoto(event.target.files?.[0])} />
                </label>
              </div>
              {profile.profilePhotoUrl && <div className="mt-3 flex items-start gap-3"><img src={profile.profilePhotoUrl} alt="Tenant profile photo" className="h-24 w-24 rounded-lg border border-slate-200 object-cover dark:border-slate-700" /><button type="button" onClick={() => update('profilePhotoUrl', null)} className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"><Trash2 className="h-3.5 w-3.5" />Remove photo</button></div>}
            </div>
            <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Identity Document</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">JPG, PNG, or PDF · maximum 2 MB</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                <FileUp className="h-4 w-4" />
                Upload ID copy
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="sr-only"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </label>
            </div>
            {profile.idDocumentUrl && (
              <div className="mt-4">
                {profile.idDocumentUrl.startsWith('data:application/pdf') ? (
                  <iframe title="Identity document preview" src={profile.idDocumentUrl} className="h-72 w-full rounded-lg border border-slate-200 dark:border-slate-700" />
                ) : (
                  <img src={profile.idDocumentUrl} alt="Identity document preview" className="max-h-72 max-w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700" />
                )}
                <button type="button" onClick={() => update('idDocumentUrl', null)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline">
                  <Trash2 className="h-3.5 w-3.5" /> Remove document
                </button>
              </div>
            )}
            </div>
          </div>

          <div className="flex justify-end md:col-span-2">
            <button type="submit" disabled={isSaving} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:text-sm">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Profile
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
