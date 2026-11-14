'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, BedDouble, Building2, Loader2, Plus, X } from 'lucide-react';
import { RoomData } from './OccupancyGrid';

interface OwnerRoomManagementProps {
  propertyId: string;
  rooms: RoomData[];
  onSuccess: () => void | Promise<void>;
}

export function OwnerRoomManagement({ propertyId, rooms, onSuccess }: OwnerRoomManagementProps) {
  const [dialog, setDialog] = useState<'room' | 'bed' | null>(null);
  const [roomForm, setRoomForm] = useState({ roomNumber: '', floor: '1', sharingType: '2', baseRent: '' });
  const [bedForm, setBedForm] = useState({ roomId: '', bedNumber: '', rentAmount: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!bedForm.roomId && rooms.length > 0) {
      setBedForm((current) => ({ ...current, roomId: rooms[0].id }));
    }
  }, [rooms, bedForm.roomId]);

  const close = () => {
    if (submitting) return;
    setDialog(null);
    setError(null);
  };

  const submitRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...roomForm, propertyId, floor: Number(roomForm.floor), sharingType: Number(roomForm.sharingType), baseRent: Number(roomForm.baseRent) }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to add room.');
      setDialog(null);
      setRoomForm({ roomNumber: '', floor: '1', sharingType: '2', baseRent: '' });
      await onSuccess();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to add room.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitBed = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/beds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bedForm, rentAmount: Number(bedForm.rentAmount) }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to add bed.');
      setDialog(null);
      setBedForm((current) => ({ ...current, bedNumber: '', rentAmount: '' }));
      await onSuccess();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to add bed.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoom = rooms.find((room) => room.id === bedForm.roomId);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => { setDialog('room'); setError(null); }} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
          <Building2 className="h-4 w-4" /> + Add Room
        </button>
        <button onClick={() => { setDialog('bed'); setError(null); }} disabled={rooms.length === 0} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
          <BedDouble className="h-4 w-4" /> + Add Bed
        </button>
      </div>

      {dialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-2 sm:p-4">
          <button aria-label="Close dialog" className="absolute inset-0 bg-slate-950/60" onClick={close} />
          <section className="relative z-10 my-auto max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{dialog === 'room' ? 'Add Room' : 'Add Bed'}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">New inventory will appear in the occupancy grid after saving.</p>
              </div>
              <button onClick={close} aria-label="Close room or bed dialog" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            {error && <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle className="h-4 w-4" />{error}</div>}

            {dialog === 'room' ? (
              <form onSubmit={submitRoom} className="space-y-4">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Room Number
                  <input required value={roomForm.roomNumber} onChange={(event) => setRoomForm({ ...roomForm, roomNumber: event.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Floor
                    <input type="number" min="0" required value={roomForm.floor} onChange={(event) => setRoomForm({ ...roomForm, floor: event.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Room Type / Sharing
                    <select value={roomForm.sharingType} onChange={(event) => setRoomForm({ ...roomForm, sharingType: event.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm">
                      {[1, 2, 3, 4, 5, 6].map((capacity) => <option key={capacity} value={capacity}>{capacity === 1 ? 'Single' : `${capacity} sharing`}</option>)}
                    </select>
                  </label>
                </div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Monthly Room Rent (₹)
                  <input type="number" min="1" required value={roomForm.baseRent} onChange={(event) => setRoomForm({ ...roomForm, baseRent: event.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
                </label>
                <button disabled={submitting} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-base font-semibold text-white disabled:opacity-50 dark:bg-emerald-600 sm:text-sm">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Room & Beds
                </button>
              </form>
            ) : (
              <form onSubmit={submitBed} className="space-y-4">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Room
                  <select required value={bedForm.roomId} onChange={(event) => setBedForm({ ...bedForm, roomId: event.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm">
                    {rooms.map((room) => <option key={room.id} value={room.id}>Room {room.roomNumber} · Floor {room.floor}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Bed Number
                  <input required value={bedForm.bedNumber} onChange={(event) => setBedForm({ ...bedForm, bedNumber: event.target.value })} placeholder={selectedRoom ? `${selectedRoom.roomNumber}-C` : 'Room-B'} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
                </label>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Monthly Rent (₹)
                  <input type="number" min="1" required value={bedForm.rentAmount} onChange={(event) => setBedForm({ ...bedForm, rentAmount: event.target.value })} className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm" />
                </label>
                <button disabled={submitting || !selectedRoom} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-base font-semibold text-white disabled:opacity-50 dark:bg-emerald-600 sm:text-sm">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Bed
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
