'use client';

import React, { useState } from 'react';
import { BedDouble, UserPlus, Phone, Calendar, Wind, Bath, Filter } from 'lucide-react';

export interface BedData {
  id: string;
  bedNumber: string;
  status: 'VACANT' | 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';
  rentAmount: number | string;
  tenant?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    checkInDate?: string;
  } | null;
}

export interface RoomData {
  id: string;
  roomNumber: string;
  floor: number;
  sharingType: number;
  roomType: string;
  baseRent: number | string;
  hasAttachedBathroom?: boolean;
  hasAC?: boolean;
  hasBalcony?: boolean;
  beds: BedData[];
}

interface OccupancyGridProps {
  rooms: RoomData[];
  isLoading?: boolean;
  onAssignBed: (bed: BedData, room: RoomData) => void;
}

export const OccupancyGrid: React.FC<OccupancyGridProps> = ({
  rooms,
  isLoading,
  onAssignBed,
}) => {
  const [selectedFloor, setSelectedFloor] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VACANT' | 'OCCUPIED'>('ALL');
  const [hoveredBedId, setHoveredBedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  // Extract unique floors
  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  // Filter rooms
  const filteredRooms = rooms
    .filter((room) => selectedFloor === 'ALL' || room.floor === selectedFloor)
    .map((room) => ({
      ...room,
      beds: room.beds.filter((bed) => {
        if (statusFilter === 'ALL') return true;
        if (statusFilter === 'VACANT') return bed.status === 'VACANT' || bed.status === 'AVAILABLE';
        if (statusFilter === 'OCCUPIED') return bed.status === 'OCCUPIED';
        return true;
      }),
    }))
    .filter((room) => room.beds.length > 0);

  // Group rooms by floor
  const roomsByFloor = filteredRooms.reduce<Record<number, RoomData[]>>((acc, room) => {
    if (!acc[room.floor]) acc[room.floor] = [];
    acc[room.floor].push(room);
    return acc;
  }, {});

  const getStatusBadgeStyle = (status: BedData['status']) => {
    switch (status) {
      case 'VACANT':
      case 'AVAILABLE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/50';
      case 'OCCUPIED':
        return 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700';
      case 'MAINTENANCE':
        return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/50';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header & Filter Controls */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Room & Bed Occupancy Grid</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time status of all rooms, beds, and residents across floors.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Floor filter */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <button
              onClick={() => setSelectedFloor('ALL')}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                selectedFloor === 'ALL'
                  ? 'bg-white font-semibold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Floors
            </button>
            {floors.map((fl) => (
              <button
                key={fl}
                onClick={() => setSelectedFloor(fl)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  selectedFloor === fl
                    ? 'bg-white font-semibold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                F{fl}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {(['ALL', 'VACANT', 'OCCUPIED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                  statusFilter === filter
                    ? 'bg-white font-semibold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {filter.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="p-6 space-y-8">
        {Object.keys(roomsByFloor).length === 0 ? (
          <div className="py-12 text-center">
            <BedDouble className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">No rooms match the selected filter.</p>
            <button
              onClick={() => {
                setSelectedFloor('ALL');
                setStatusFilter('ALL');
              }}
              className="mt-2 text-xs text-slate-900 underline underline-offset-4 hover:text-slate-700 dark:text-slate-200 dark:hover:text-white"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          Object.entries(roomsByFloor).map(([floorStr, floorRooms]) => (
            <div key={floorStr} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Floor {floorStr}
                </span>
                <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
                <span className="text-xs text-slate-400 dark:text-slate-500">{floorRooms.length} Room(s)</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {floorRooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                  >
                    {/* Room Meta */}
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            Room {room.roomNumber}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {room.sharingType} Sharing
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                          ₹{Number(room.baseRent).toLocaleString('en-IN')}/mo
                        </p>
                      </div>

                      {/* Amenities Tag Icons */}
                      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                        {room.hasAC && (
                          <span title="AC Enabled" className="text-blue-500">
                            <Wind className="h-3.5 w-3.5" />
                          </span>
                        )}
                        {room.hasAttachedBathroom && (
                          <span title="Attached Washroom" className="text-slate-500">
                            <Bath className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bed Slots Grid */}
                    <div className="mt-3.5 grid grid-cols-1 gap-2">
                      {room.beds.map((bed) => {
                        const isVacant = bed.status === 'VACANT' || bed.status === 'AVAILABLE';
                        const isOccupied = bed.status === 'OCCUPIED';
                        const isHovered = hoveredBedId === bed.id;

                        return (
                          <div
                            key={bed.id}
                            onMouseEnter={() => setHoveredBedId(bed.id)}
                            onMouseLeave={() => setHoveredBedId(null)}
                            className={`group relative flex items-center justify-between rounded-md border p-2.5 text-xs transition-all ${getStatusBadgeStyle(
                              bed.status
                            )}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono font-bold tracking-tight">
                                {bed.bedNumber}
                              </span>

                              {isOccupied && bed.tenant ? (
                                <div className="leading-tight">
                                  <div className="max-w-[130px] truncate font-medium text-slate-900 dark:text-white">
                                    {bed.tenant.name}
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                    <Phone className="h-2.5 w-2.5" />
                                    {bed.tenant.phone}
                                  </div>
                                </div>
                              ) : isVacant ? (
                                <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                                  Vacant Slot
                                </span>
                              ) : (
                                <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                                  Under Maintenance
                                </span>
                              )}
                            </div>

                            {/* Action or Status Tag */}
                            {isVacant ? (
                              <button
                                onClick={() => onAssignBed(bed, room)}
                                className="inline-flex min-h-[44px] items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
                              >
                                <UserPlus className="h-3 w-3" />
                                <span>Assign</span>
                              </button>
                            ) : isOccupied ? (
                              <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                Occupied
                              </span>
                            ) : (
                              <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                Hold
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
