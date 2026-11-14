'use client';

import React from 'react';
import {
  Bed,
  Users,
  Phone,
  Wifi,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  ClockAlert,
  Building2,
  Calendar,
} from 'lucide-react';
import { TenantTabType } from './TenantBottomNav';

export interface TenantHomeData {
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string;
    checkInDate: string;
    property?: {
      name: string;
      address: string;
      contactNumber?: string;
    };
  };
  stayDetails: {
    hasBedAllocated: boolean;
    bed?: {
      bedNumber: string;
      status: string;
      rentAmount: number | string;
    } | null;
    room?: {
      roomNumber: string;
      floor: number;
      sharingType: number;
      roomType: string;
      baseRent: number | string;
      hasAC?: boolean;
      hasAttachedBathroom?: boolean;
    } | null;
    roommates: Array<{
      id: string;
      name: string;
      phone: string;
      bedNumber: string;
      checkInDate: string;
    }>;
  };
  latestInvoice?: {
    id: string;
    invoiceNumber: string;
    month: number;
    year: number;
    totalAmount: number;
    status: 'PAID' | 'UNPAID' | 'OVERDUE' | string;
    dueDate: string;
  } | null;
}

interface HomeTabProps {
  data: TenantHomeData;
  onChangeTab: (tab: TenantTabType) => void;
  onPayRentClick: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ data, onChangeTab, onPayRentClick }) => {
  const { tenant, stayDetails, latestInvoice } = data;
  const isPaid = latestInvoice?.status === 'PAID';
  const isOverdue = latestInvoice?.status === 'OVERDUE';

  const roomNumber = stayDetails.room?.roomNumber || '—';
  const bedNumber = stayDetails.bed?.bedNumber || '—';
  const propertyName = tenant.property?.name || 'OM MURUGAA MENS HOSTEL';

  return (
    <div className="grid grid-cols-1 gap-5 px-4 pt-6 lg:grid-cols-12">
      {/* 1. Header Greeting Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs lg:col-span-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Welcome back
            </span>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {tenant.name}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <span>{propertyName}</span>
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xs dark:bg-slate-700">
            <Bed className="h-5 w-5" />
          </div>
        </div>

        {/* Room & Bed Allocation Pill */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800">
          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">Allocated Bed</span>
            <div className="font-mono font-bold text-slate-900 dark:text-white">
              Room {roomNumber} • Bed {bedNumber}
            </div>
          </div>
          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
            {stayDetails.room?.sharingType
              ? `${stayDetails.room.sharingType} Sharing`
              : stayDetails.hasBedAllocated ? 'Assigned' : 'Not assigned'}
          </span>
        </div>
      </div>

      {/* 2. Quick Rent Status Banner */}
      <div
        className={`rounded-2xl border p-4.5 shadow-xs transition-all lg:col-span-6 ${
          isPaid
            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
            : isOverdue
            ? 'border-rose-200 bg-rose-50/70 text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
            : 'border-slate-200 bg-slate-900 text-white dark:border-slate-700 dark:bg-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isPaid ? (
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            ) : (
              <ClockAlert
                className={`h-5 w-5 ${isOverdue ? 'text-rose-600' : 'text-amber-400'}`}
              />
            )}
            <div>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider ${
                  isPaid ? 'text-emerald-700 dark:text-emerald-300' : isOverdue ? 'text-rose-700 dark:text-rose-300' : 'text-slate-400'
                }`}
              >
                Monthly Rent Status
              </span>
              <div className="text-sm font-bold">
                {isPaid
                  ? 'All Dues Cleared'
                  : latestInvoice
                  ? `₹${latestInvoice.totalAmount.toLocaleString('en-IN')} Due`
                  : 'No invoice yet'}
              </div>
            </div>
          </div>

          {!isPaid && latestInvoice && (
            <button
              onClick={onPayRentClick}
              className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 active:scale-95"
            >
              Pay Now
            </button>
          )}

          {isPaid && (
            <button
              onClick={() => onChangeTab('bills')}
              className="text-xs font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300"
            >
              View Receipt
            </button>
          )}
        </div>
      </div>

      {/* 3. Roommates Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Your Roommates</h2>
          </div>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Room {roomNumber}
          </span>
        </div>

        <div className="mt-3.5 space-y-2.5">
          {stayDetails.roommates.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
              No other roommates currently assigned to this room.
            </div>
          ) : (
            stayDetails.roommates.map((rm) => (
              <div
                key={rm.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {rm.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{rm.name}</div>
                    <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      Bed {rm.bedNumber}
                    </div>
                  </div>
                </div>

                <a
                  href={`tel:${rm.phone}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  title="Call Roommate"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Quick Help & Wi-Fi Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              <Wifi className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">Hostel High-Speed Wi-Fi</div>
              <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                SSID: <span className="font-bold text-slate-700 dark:text-slate-200">Sunrise_5G_Floor{stayDetails.room?.floor || 1}</span>
              </div>
            </div>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            Active
          </span>
        </div>
      </div>
    </div>
  );
};
