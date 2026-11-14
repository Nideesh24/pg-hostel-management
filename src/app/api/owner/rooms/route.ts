import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RoomType } from '@prisma/client';
import { getAuthenticatedOwner, isOwnerOfProperty } from '@/lib/auth';

interface CreateRoomBody {
  propertyId: string;
  roomNumber: string;
  floor: number;
  sharingType: number; // e.g. 1, 2, 3, 4
  baseRent: number;
  hasAttachedBathroom?: boolean;
  hasBalcony?: boolean;
  hasAC?: boolean;
}

function resolveRoomType(sharingType: number): RoomType {
  switch (sharingType) {
    case 1:
      return 'SINGLE';
    case 2:
      return 'DOUBLE';
    case 3:
      return 'TRIPLE';
    case 4:
      return 'FOUR_SHARING';
    default:
      return 'DORMITORY';
  }
}

export async function POST(request: Request) {
  try {
    const owner = await getAuthenticatedOwner();
    if (!owner) {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const body: CreateRoomBody = await request.json();
    const {
      propertyId,
      roomNumber,
      floor,
      sharingType,
      baseRent,
      hasAttachedBathroom = true,
      hasBalcony = false,
      hasAC = false,
    } = body;

    // Validate inputs
    if (!propertyId?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Property ID (propertyId) is required.' },
        { status: 400 }
      );
    }
    if (!isOwnerOfProperty(owner, propertyId)) {
      return NextResponse.json({ success: false, error: 'You do not manage this property.' }, { status: 403 });
    }

    if (!roomNumber?.toString().trim()) {
      return NextResponse.json(
        { success: false, error: 'Room number (roomNumber) is required.' },
        { status: 400 }
      );
    }

    const parsedFloor = Number(floor);
    if (isNaN(parsedFloor)) {
      return NextResponse.json(
        { success: false, error: 'Floor must be a valid number.' },
        { status: 400 }
      );
    }

    const parsedSharingType = parseInt(String(sharingType), 10);
    if (isNaN(parsedSharingType) || parsedSharingType <= 0) {
      return NextResponse.json(
        { success: false, error: 'Sharing type (sharingType) must be a positive integer (e.g. 1, 2, 3).' },
        { status: 400 }
      );
    }

    const parsedBaseRent = Number(baseRent);
    if (isNaN(parsedBaseRent) || parsedBaseRent < 0) {
      return NextResponse.json(
        { success: false, error: 'Base rent (baseRent) must be a valid non-negative number.' },
        { status: 400 }
      );
    }

    // Verify Property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: `Property with ID '${propertyId}' not found.` },
        { status: 404 }
      );
    }

    // Check for duplicate room in the same property
    const existingRoom = await prisma.room.findUnique({
      where: {
        propertyId_roomNumber: {
          propertyId,
          roomNumber: String(roomNumber).trim(),
        },
      },
    });

    if (existingRoom) {
      return NextResponse.json(
        {
          success: false,
          error: `Room '${roomNumber}' already exists in this property.`,
        },
        { status: 409 }
      );
    }

    const normalizedRoomNumber = String(roomNumber).trim();
    const bedRent = parsedBaseRent / parsedSharingType;

    // Prepare Bed slots: e.g. "101-A", "101-B", "101-C"
    const bedsData = Array.from({ length: parsedSharingType }).map((_, index) => {
      const bedSuffix = String.fromCharCode(65 + index); // 65 = 'A'
      return {
        bedNumber: `${normalizedRoomNumber}-${bedSuffix}`,
        status: 'VACANT' as const,
        rentAmount: bedRent,
      };
    });

    // Create Room with nested Beds in an atomic operation
    const room = await prisma.room.create({
      data: {
        propertyId,
        roomNumber: normalizedRoomNumber,
        floor: parsedFloor,
        sharingType: parsedSharingType,
        roomType: resolveRoomType(parsedSharingType),
        baseRent: parsedBaseRent,
        hasAttachedBathroom,
        hasBalcony,
        hasAC,
        beds: {
          create: bedsData,
        },
      },
      include: {
        beds: {
          orderBy: { bedNumber: 'asc' },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Room ${normalizedRoomNumber} and ${parsedSharingType} bed slots created successfully.`,
        data: room,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/owner/rooms] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while creating room.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
