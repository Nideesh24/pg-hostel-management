'use client';

import React from 'react';
import { Home, Receipt, AlertCircle, UserRound } from 'lucide-react';

export type TenantTabType = 'home' | 'bills' | 'complaints' | 'profile';

interface TenantBottomNavProps {
  activeTab: TenantTabType;
  onChangeTab: (tab: TenantTabType) => void;
  hasUnpaidBill?: boolean;
  openComplaintsCount?: number;
}

export const TenantBottomNav: React.FC<TenantBottomNavProps> = ({
  activeTab,
  onChangeTab,
  hasUnpaidBill = false,
  openComplaintsCount = 0,
}) => {
  const tabs = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: Home,
      badge: false,
    },
    {
      id: 'bills' as const,
      label: 'Bills & Rent',
      icon: Receipt,
      badge: hasUnpaidBill,
      badgeColor: 'bg-rose-500',
    },
    {
      id: 'complaints' as const,
      label: 'Complaints',
      icon: AlertCircle,
      badge: openComplaintsCount > 0,
      badgeContent: openComplaintsCount > 0 ? String(openComplaintsCount) : undefined,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'profile' as const,
      label: 'Profile & KYC',
      icon: UserRound,
      badge: false,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto w-full max-w-7xl border-t border-slate-200/90 bg-white/95 px-4 py-2 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center py-1 transition-all ${
                isActive
                  ? 'scale-105 font-semibold text-slate-900 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />

                {tab.badge && (
                  <span
                    className={`absolute -top-1 -right-2 flex h-2.5 w-2.5 items-center justify-center rounded-full ${tab.badgeColor} ring-2 ring-white dark:ring-slate-900`}
                  />
                )}
              </div>

              <span className="mt-1 text-[11px] tracking-tight">{tab.label}</span>

              {isActive && (
                <span className="absolute -bottom-1 h-1 w-6 rounded-full bg-slate-900 dark:bg-white" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
