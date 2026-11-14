'use client';

import React from 'react';
import { Users, IndianRupee, ClockAlert, Wrench, ArrowUpRight } from 'lucide-react';

export interface KpiMetrics {
  totalBeds: number;
  occupiedBeds: number;
  occupancyRate: string;
  totalMonthlyRevenue: number;
  collectedRevenue: number;
  pendingDues: number;
  overdueCount: number;
  openComplaints: number;
  urgentComplaints: number;
}

interface KpiStatsProps {
  metrics: KpiMetrics;
  isLoading?: boolean;
}

export const KpiStats: React.FC<KpiStatsProps> = ({ metrics, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-3 h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mb-2 h-8 w-32 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Occupancy Rate',
      value: metrics.occupancyRate,
      subValue: `${metrics.occupiedBeds} of ${metrics.totalBeds} beds occupied`,
      icon: Users,
      trend: `${metrics.totalBeds - metrics.occupiedBeds} vacant`,
      trendPositive: true,
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-800',
    },
    {
      title: 'Monthly Revenue',
      value: `₹${metrics.totalMonthlyRevenue.toLocaleString('en-IN')}`,
      subValue: `₹${metrics.collectedRevenue.toLocaleString('en-IN')} collected this month`,
      icon: IndianRupee,
      trend: 'Billed',
      trendPositive: true,
      badgeColor: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-800',
    },
    {
      title: 'Pending Rent Dues',
      value: `₹${metrics.pendingDues.toLocaleString('en-IN')}`,
      subValue: `${metrics.overdueCount} tenant(s) past due date`,
      icon: ClockAlert,
      trend: metrics.pendingDues > 0 ? 'Action Needed' : 'All Clear',
      trendPositive: metrics.pendingDues === 0,
      badgeColor:
        metrics.pendingDues > 0
          ? 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-900/30 dark:border-rose-800'
          : 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-800',
    },
    {
      title: 'Open Complaints',
      value: `${metrics.openComplaints}`,
      subValue: `${metrics.urgentComplaints} marked urgent`,
      icon: Wrench,
      trend: metrics.openComplaints > 0 ? 'Pending Staff' : 'Resolved',
      trendPositive: metrics.openComplaints === 0,
      badgeColor:
        metrics.openComplaints > 0
          ? 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-800'
          : 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {card.title}
              </span>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-slate-600 transition-colors group-hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:text-white">
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {card.value}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">{card.subValue}</span>
              <span
                className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${card.badgeColor}`}
              >
                {card.trend}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
