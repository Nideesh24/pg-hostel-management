import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedOwner, isOwnerOfProperty } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const owner = await getAuthenticatedOwner();
    if (!owner) {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    if (!propertyId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Query parameter 'propertyId' is required. Example: /api/owner/occupancy?propertyId=clx...",
        },
        { status: 400 }
      );
    }
    if (!isOwnerOfProperty(owner, propertyId)) {
      return NextResponse.json({ success: false, error: 'You do not manage this property.' }, { status: 403 });
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true, address: true, city: true },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: `Property with ID '${propertyId}' not found.` },
        { status: 404 }
      );
    }

    // Fetch all rooms with nested beds, tenant, and user profile
    const rooms = await prisma.room.findMany({
      where: { propertyId },
      orderBy: [
        { floor: 'asc' },
        { roomNumber: 'asc' },
      ],
      include: {
        beds: {
          orderBy: { bedNumber: 'asc' },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                fullName: true,
                phone: true,
                email: true,
                status: true,
                checkInDate: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Compute live occupancy statistics
    let totalBeds = 0;
    let occupiedBeds = 0;
    let vacantBeds = 0;
    let maintenanceBeds = 0;

    for (const room of rooms) {
      for (const bed of room.beds) {
        totalBeds++;
        if (bed.status === 'OCCUPIED') {
          occupiedBeds++;
        } else if (bed.status === 'VACANT' || bed.status === 'AVAILABLE') {
          vacantBeds++;
        } else if (bed.status === 'MAINTENANCE') {
          maintenanceBeds++;
        }
      }
    }

    const occupancyRate = totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(2)) : 0;

    return NextResponse.json(
      {
        success: true,
        property,
        summary: {
          totalRooms: rooms.length,
          totalBeds,
          occupiedBeds,
          vacantBeds,
          maintenanceBeds,
          occupancyRate: `${occupancyRate}%`,
        },
        data: rooms,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/owner/occupancy] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while fetching occupancy data.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
