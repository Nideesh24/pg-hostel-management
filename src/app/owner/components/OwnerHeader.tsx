'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, Bell, Plus, ShieldCheck, Check } from 'lucide-react';
import { OwnerAccountSettings } from './OwnerAccountSettings';
import { OwnerSharing } from './OwnerSharing';

const GOOGLE_MAPS_URL =
  'https://www.google.com/maps?sca_esv=e5efdb4f23fffd2d&udm&fvr=1&pvq=Cg0vZy8xMW40MzN2ZnZoIhYKEG9tIG11cnVnYSBob3N0ZWwQAhgDiQF9SCG7fqBuSA&lqi=ChBvbSBtdXJ1Z2EgaG9zdGVsSM_u9LGQtICACFoiEAAQARACGAAYAiIQb20gbXVydWdhIGhvc3RlbCoECAMQApIBEXN0dWRlbnRfZG9ybWl0b3J5&vet=10CAAQoqAOahcKEwi4zYeKroSYAxUAAAAAHQAAAAAQCQ..i&cs=0&um=1&ie=UTF-8&fb=1&gl=in&sa=X&ftid=0x3a52617485f67453:0x486ea07ebb21487d';

interface PropertyOption {
  id: string;
  name: string;
  city: string;
  totalBeds: number;
}

interface OwnerHeaderProps {
  properties: PropertyOption[];
  selectedPropertyId: string;
  onSelectProperty: (id: string) => void;
  onOpenOnboardModal: () => void;
  owner: { name: string; email: string };
  onOwnerUpdated: (profile: { name: string; email: string }) => void;
}

export const OwnerHeader: React.FC<OwnerHeaderProps> = ({
  properties,
  selectedPropertyId,
  onSelectProperty,
  onOpenOnboardModal,
  owner,
  onOwnerUpdated,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentProperty =
    properties.find((p) => p.id === selectedPropertyId) || properties[0] || {
      id: 'default',
      name: 'OM MURUGAA MENS HOSTEL',
      city: 'Porur, Chennai, Tamil Nadu',
      totalBeds: 24,
    };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3 lg:px-8">
        {/* Left: Property Selector & Branding */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Image src="/logo.svg" alt="" width={44} height={44} />

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800 sm:px-2.5"
              aria-expanded={dropdownOpen}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span                   className="max-w-[170px] truncate text-xs font-semibold tracking-tight text-slate-900 dark:text-white sm:max-w-none sm:text-base">
                    OM MURUGAA MENS HOSTEL
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700">
                    Live
                  </span>
                </div>
                <p className="hidden text-xs font-normal text-slate-500 dark:text-slate-400 sm:block">{currentProperty.city}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute left-0 z-50 mt-2 w-72 origin-top-left rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900">
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Your Properties
                  </div>
                  {properties.map((property) => (
                    <button
                      key={property.id}
                      onClick={() => {
                        onSelectProperty(property.id);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        property.id === currentProperty.id
                          ? 'bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-white'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{property.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{property.city}</div>
                      </div>
                      {property.id === currentProperty.id && (
                        <Check className="h-4 w-4 text-slate-900 dark:text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Actions, Notifications & Owner Profile */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={onOpenOnboardModal}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 active:scale-[0.99] sm:gap-1.5 sm:px-3.5 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add New Tenant</span><span className="sm:hidden">Add Tenant</span>
          </button>

          <OwnerAccountSettings name={owner.name} email={owner.email} onUpdated={onOwnerUpdated} />
          <OwnerSharing propertyId={selectedPropertyId} />

          <div className="hidden flex-col text-right text-[10px] leading-4 text-slate-500 dark:text-slate-400 xl:flex">
            <a className="hover:underline" href="tel:9791157550">9791157550</a>
            <a className="hover:underline" href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer">View on Google Maps</a>
          </div>

          {/* Notification Button */}
          <button
            type="button"
            className="relative hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 sm:flex"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {/* Owner Profile Badge */}
          <div className="hidden items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50/80 py-1 pl-1 pr-3 dark:border-slate-700 dark:bg-slate-800 md:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white dark:bg-slate-600">
              SN
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <div className="flex items-center gap-1 text-xs font-medium text-slate-900 dark:text-white">
                <span>{owner.name}</span>
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Owner</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
