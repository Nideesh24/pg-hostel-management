'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { X, UserPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { RoomData, BedData } from './OccupancyGrid';
import { PasswordInput } from '@/components/PasswordInput';

interface TenantOnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rooms: RoomData[];
  preSelectedBedId?: string | null;
  propertyId?: string;
}

export const TenantOnboardModal: React.FC<TenantOnboardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rooms,
  preSelectedBedId,
  propertyId,
}) => {
  // Collect all vacant beds across all rooms
  const vacantBeds = useMemo(
    () =>
      rooms.flatMap((room) =>
        room.beds
          .filter((bed) => bed.status === 'VACANT' || bed.status === 'AVAILABLE')
          .map((bed) => ({
            bedId: bed.id,
            bedNumber: bed.bedNumber,
            roomNumber: room.roomNumber,
            floor: room.floor,
            rentAmount: bed.rentAmount,
          }))
      ),
    [rooms]
  );

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    monthlyRent: '',
    bedId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) return;
    wasOpen.current = true;

    const selectedBed = vacantBeds.find((bed) => bed.bedId === preSelectedBedId) || vacantBeds[0];
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      monthlyRent: selectedBed ? String(selectedBed.rentAmount) : '',
      bedId: selectedBed?.bedId || '',
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [preSelectedBedId, isOpen, vacantBeds]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim() || !formData.password) {
      setErrorMessage('Please fill in Name, Phone, Email, and Password.');
      return;
    }

    if (!formData.bedId || !propertyId) {
      setErrorMessage('Please select a vacant bed to allocate.');
      return;
    }

    if (!Number.isFinite(Number(formData.monthlyRent)) || Number(formData.monthlyRent) <= 0) {
      setErrorMessage('Enter a valid monthly rent greater than zero.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          password: formData.password,
          monthlyRent: Number(formData.monthlyRent),
          bedId: formData.bedId,
          propertyId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to onboard tenant.');
      }

      setSuccessMessage(`Tenant '${formData.name}' successfully added!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl transition-all sm:p-6 dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Add New Tenant</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Create a login and assign an available bed.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close add tenant dialog"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Tenant Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoComplete="name"
              className="min-h-[44px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                autoComplete="tel"
                className="min-h-[44px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="tenant@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                autoComplete="email"
                className="min-h-[44px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Password *</label>
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Monthly Rent (₹) *</label>
              <input
                type="number"
                min="1"
                required
                placeholder="6500"
                value={formData.monthlyRent}
                onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                className="min-h-[44px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Bed Allocation Selection */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Select Vacant Bed Slot *
            </label>
            {vacantBeds.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                No vacant beds available in this property. Please add a room or mark a bed vacant.
              </div>
            ) : (
              <select
                required
                value={formData.bedId}
                onChange={(e) => {
                  const bedId = e.target.value;
                  const selectedBed = vacantBeds.find((bed) => bed.bedId === bedId);
                  setFormData((prev) => ({
                    ...prev,
                    bedId,
                    monthlyRent: selectedBed ? String(selectedBed.rentAmount) : prev.monthlyRent,
                  }));
                }}
                className="min-h-[44px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500 sm:text-sm"
              >
                <option value="">Select a bed slot...</option>
                {vacantBeds.map((b) => (
                  <option key={b.bedId} value={b.bedId}>
                    Room {b.roomNumber} (Floor {b.floor}) — Bed {b.bedNumber} (₹
                    {Number(b.rentAmount).toLocaleString('en-IN')}/mo)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Modal Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || vacantBeds.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Onboarding...</span>
                </>
              ) : (
                <span>Complete Onboarding</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
