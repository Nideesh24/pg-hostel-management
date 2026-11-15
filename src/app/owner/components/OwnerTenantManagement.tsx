'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Eye, Loader2, UserCheck, UserRoundX } from 'lucide-react';
import { RoomData } from './OccupancyGrid';

interface SignupRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferredRoomType: string | null;
  preferredSharing: number | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  profilePhotoUrl: string | null;
  idDocumentUrl: string | null;
}

interface TenantSummary {
  id: string;
  name: string;
  status: string;
  email: string;
  phone: string;
  bed: { bedNumber: string; room: { roomNumber: string } } | null;
}

interface TenantDetails extends TenantSummary {
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

interface OwnerTenantManagementProps {
  propertyId: string;
  rooms: RoomData[];
  refreshKey: number;
  onRefresh: () => void | Promise<void>;
}

export function OwnerTenantManagement({ propertyId, rooms, refreshKey, onRefresh }: OwnerTenantManagementProps) {
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [bedSelections, setBedSelections] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<TenantDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [vacatingId, setVacatingId] = useState<string | null>(null);
  const [vacateConfirmation, setVacateConfirmation] = useState<{
    tenantId: string;
    tenantName: string;
    pendingDues: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableBeds = useMemo(
    () =>
      rooms.flatMap((room) =>
        room.beds
          .filter((bed) => bed.status === 'VACANT' || bed.status === 'AVAILABLE')
          .map((bed) => ({
            id: bed.id,
            label: `Room ${room.roomNumber} · Bed ${bed.bedNumber} · ₹${Number(bed.rentAmount).toLocaleString('en-IN')}/mo`,
          }))
      ),
    [rooms]
  );

  const loadRecords = useCallback(async () => {
    if (!propertyId) return;
    try {
      setError(null);
      const [requestResponse, tenantResponse] = await Promise.all([
        fetch(`/api/owner/signups?propertyId=${encodeURIComponent(propertyId)}`, { cache: 'no-store' }),
        fetch(`/api/owner/tenants?propertyId=${encodeURIComponent(propertyId)}`, { cache: 'no-store' }),
      ]);
      const [requestData, tenantData] = await Promise.all([requestResponse.json(), tenantResponse.json()]);
      if (!requestResponse.ok || !requestData.success) throw new Error(requestData.error || 'Unable to load signup requests.');
      if (!tenantResponse.ok || !tenantData.success) throw new Error(tenantData.error || 'Unable to load tenant records.');
      setRequests(requestData.requests);
      setTenants(tenantData.tenants);
      setBedSelections((current) => {
        const next = { ...current };
        for (const signup of requestData.requests as SignupRequest[]) {
          if (!next[signup.id] || !availableBeds.some((bed) => bed.id === next[signup.id])) {
            next[signup.id] = availableBeds[0]?.id || '';
          }
        }
        return next;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load tenant requests.');
    }
  }, [propertyId, availableBeds]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords, refreshKey]);

  const reviewRequest = async (tenantId: string, action: 'APPROVE' | 'REJECT') => {
    setBusyId(tenantId);
    setError(null);
    try {
      const response = await fetch('/api/owner/signups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, action, bedId: bedSelections[tenantId] }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to update signup request.');
      await onRefresh();
      await loadRecords();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Unable to update signup request.');
    } finally {
      setBusyId(null);
    }
  };

  const viewDetails = async (tenantId: string) => {
    setLoadingDetails(true);
    setError(null);
    try {
      const response = await fetch(`/api/owner/tenants/${tenantId}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load tenant details.');
      setDetails(data.tenant);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'Unable to load tenant details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const vacateTenant = async (tenantId: string, force = false) => {
    setVacatingId(tenantId);
    setError(null);
    try {
      const response = await fetch(`/api/owner/tenants/${encodeURIComponent(tenantId)}/vacate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(force ? { force: true } : {}),
      });
      const data = await response.json();
      if (data.requiresConfirmation) {
        const tenant = tenants.find((record) => record.id === tenantId);
        setVacateConfirmation({
          tenantId,
          tenantName: tenant?.name || 'this tenant',
          pendingDues: Number(data.pendingDues),
        });
        return;
      }
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to vacate tenant.');

      setVacateConfirmation(null);
      await onRefresh();
      await loadRecords();
    } catch (vacateError) {
      setError(vacateError instanceof Error ? vacateError.message : 'Unable to vacate tenant.');
    } finally {
      setVacatingId(null);
    }
  };

  const confirmVacate = () => {
    if (!vacateConfirmation) return;
    void vacateTenant(vacateConfirmation.tenantId, vacateConfirmation.pendingDues !== null);
  };

  return (
    <div className="space-y-6">
      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle className="h-4 w-4" />{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pending Sign-Up Requests</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Assign an available bed when approving an applicant.</p>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">{requests.length} pending</span>
        </div>

        {requests.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">No pending signup requests.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((signup) => (
              <article key={signup.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-[1fr_1.2fr_auto] lg:items-center dark:border-slate-700">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{signup.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{signup.email} · {signup.phone}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Preference: {signup.preferredRoomType || 'Any'} / {signup.preferredSharing || 'Any'} sharing
                  </p>
                  {signup.emergencyContactName && <p className="text-xs text-slate-500 dark:text-slate-400">Emergency: {signup.emergencyContactName} · {signup.emergencyContactPhone}</p>}
                  {(signup.profilePhotoUrl || signup.idDocumentUrl) && (
                    <div className="mt-3 flex flex-wrap items-start gap-3">
                      {signup.profilePhotoUrl && <a href={signup.profilePhotoUrl} target="_blank" rel="noreferrer" aria-label={`View ${signup.name}'s profile photo`}><img src={signup.profilePhotoUrl} alt={`${signup.name} profile`} className="h-20 w-20 rounded-lg border border-slate-200 object-cover dark:border-slate-700" /></a>}
                      {signup.idDocumentUrl && (
                        signup.idDocumentUrl.startsWith('data:application/pdf')
                          ? <a href={signup.idDocumentUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">View Aadhaar PDF</a>
                          : <a href={signup.idDocumentUrl} target="_blank" rel="noreferrer" aria-label={`View ${signup.name}'s ID document`}><img src={signup.idDocumentUrl} alt={`${signup.name} ID document`} className="h-20 w-28 rounded-lg border border-slate-200 object-contain dark:border-slate-700" /></a>
                      )}
                    </div>
                  )}
                </div>
                <select
                  aria-label={`Assign bed to ${signup.name}`}
                  value={bedSelections[signup.id] || ''}
                  onChange={(event) => setBedSelections((current) => ({ ...current, [signup.id]: event.target.value }))}
                  disabled={availableBeds.length === 0}
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-800 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm"
                >
                  <option value="">No available beds</option>
                  {availableBeds.map((bed) => <option key={bed.id} value={bed.id}>{bed.label}</option>)}
                </select>
                <div className="flex gap-2">
                  <button disabled={busyId === signup.id || !bedSelections[signup.id]} onClick={() => reviewRequest(signup.id, 'APPROVE')} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    {busyId === signup.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
                  </button>
                  <button disabled={busyId === signup.id} onClick={() => reviewRequest(signup.id, 'REJECT')} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300">
                    <UserRoundX className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tenant Records & KYC</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">View submitted personal details and identity documents.</p>
        </div>
        {tenants.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">No approved tenants yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500 dark:text-slate-400"><tr><th className="pb-2">Tenant</th><th className="pb-2">Email / Phone</th><th className="pb-2">Room / Bed</th><th className="pb-2">Status</th><th className="pb-2 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">{tenant.name}</td>
                    <td className="py-3 text-xs text-slate-600 dark:text-slate-300">{tenant.email}<br />{tenant.phone}</td>
                    <td className="py-3 text-xs text-slate-600 dark:text-slate-300">{tenant.bed ? `${tenant.bed.room.roomNumber} / ${tenant.bed.bedNumber}` : 'Not assigned'}</td>
                    <td className="py-3 text-xs"><span className={`rounded-full px-2 py-1 font-semibold ${tenant.status === 'CHECKED_OUT' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : tenant.status === 'NOTICE_PERIOD' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'}`}>{tenant.status.replace(/_/g, ' ')}</span></td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => viewDetails(tenant.id)} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Eye className="h-3.5 w-3.5" /> View</button>
                        {tenant.status !== 'CHECKED_OUT' && (
                          <button
                            type="button"
                            disabled={vacatingId === tenant.id}
                            onClick={() => {
                              setError(null);
                              setVacateConfirmation({ tenantId: tenant.id, tenantName: tenant.name, pendingDues: null });
                            }}
                            className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                          >
                            {vacatingId === tenant.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Vacate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {loadingDetails && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}
      {details && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
          <section className="my-auto max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6 dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between">
              <div><h2 className="text-xl font-bold text-slate-900 dark:text-white">{details.fullName || details.name}</h2><p className="text-sm text-slate-500 dark:text-slate-400">{details.email} · {details.phone}</p></div>
              <button onClick={() => setDetails(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close tenant details">×</button>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-slate-500">Date of birth</dt><dd className="mt-1 text-slate-900 dark:text-white">{details.dateOfBirth ? new Date(details.dateOfBirth).toLocaleDateString() : 'Not provided'}</dd></div>
              <div><dt className="text-xs text-slate-500">Occupation / College</dt><dd className="mt-1 text-slate-900 dark:text-white">{details.occupationOrCollege || 'Not provided'}</dd></div>
              <div><dt className="text-xs text-slate-500">Emergency contact</dt><dd className="mt-1 text-slate-900 dark:text-white">{details.emergencyContactName || 'Not provided'} {details.emergencyContactPhone && `· ${details.emergencyContactPhone}`}</dd></div>
              <div><dt className="text-xs text-slate-500">ID reference</dt><dd className="mt-1 text-slate-900 dark:text-white">{details.idReferenceNumber || 'Not provided'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Permanent home address</dt><dd className="mt-1 whitespace-pre-wrap text-slate-900 dark:text-white">{details.permanentHomeAddress || 'Not provided'}</dd></div>
            </dl>
            {details.profilePhotoUrl && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">Profile Photo</h3>
                <a href={details.profilePhotoUrl} target="_blank" rel="noreferrer">
                  <img src={details.profilePhotoUrl} alt={`${details.name} profile photo`} className="h-32 w-32 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                </a>
              </div>
            )}
            <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-700">
              <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Uploaded ID Document</h3>
              {!details.idDocumentUrl ? <p className="text-sm text-slate-500">No document uploaded.</p> : (
                <>
                  {details.idDocumentUrl.startsWith('data:application/pdf') ? <iframe title="Tenant ID document" src={details.idDocumentUrl} className="h-80 w-full rounded-lg border border-slate-200 dark:border-slate-700" /> : <img src={details.idDocumentUrl} alt="Tenant identity document" className="max-h-80 max-w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700" />}
                  <a href={details.idDocumentUrl} download={`${details.name.replace(/[^a-z0-9]/gi, '-')}-id-document`} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Download ID copy</a>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end"><button onClick={() => setDetails(null)} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"><UserCheck className="h-4 w-4" /> Done</button></div>
          </section>
        </div>
      )}
      {vacateConfirmation && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="vacate-tenant-title"
            className="w-[95vw] max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 id="vacate-tenant-title" className="text-lg font-bold text-slate-900 dark:text-white">
              {vacateConfirmation.pendingDues === null ? 'Confirm tenant checkout' : 'Unpaid rent warning'}
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {vacateConfirmation.pendingDues === null
                ? `Vacate ${vacateConfirmation.tenantName}? The assigned bed will become available.`
                : `This tenant has ₹${vacateConfirmation.pendingDues.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in pending rent. Vacate anyway?`}
            </p>
            {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={vacatingId === vacateConfirmation.tenantId}
                onClick={() => setVacateConfirmation(null)}
                className="min-h-[44px] rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={vacatingId === vacateConfirmation.tenantId}
                onClick={confirmVacate}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
              >
                {vacatingId === vacateConfirmation.tenantId && <Loader2 className="h-4 w-4 animate-spin" />}
                {vacateConfirmation.pendingDues === null ? 'Continue' : 'Vacate anyway'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
