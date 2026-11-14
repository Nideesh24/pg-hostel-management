import { Prisma, RoomType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser, isOwnerOfProperty } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function getRoomType(sharingType: number): RoomType {
  if (sharingType === 1) return 'SINGLE';
  if (sharingType === 2) return 'DOUBLE';
  if (sharingType === 3) return 'TRIPLE';
  if (sharingType === 4) return 'FOUR_SHARING';
  return 'DORMITORY';
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const body = await request.json();
    const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : '';
    const roomNumber = typeof body.roomNumber === 'string' ? body.roomNumber.trim() : '';
    const floor = Number(body.floor);
    const sharingType = Number(body.sharingType);
    const baseRent = Number(body.baseRent);

    if (!propertyId || !roomNumber) {
      return NextResponse.json({ success: false, error: 'Property and room number are required.' }, { status: 400 });
    }
    if (!isOwnerOfProperty(user, propertyId)) {
      return NextResponse.json({ success: false, error: 'You do not manage this property.' }, { status: 403 });
    }
    if (!Number.isInteger(floor) || floor < 0 || !Number.isInteger(sharingType) || sharingType < 1 || sharingType > 20) {
      return NextResponse.json({ success: false, error: 'Enter a valid floor and sharing capacity (1–20).' }, { status: 400 });
    }
    if (!Number.isFinite(baseRent) || baseRent <= 0) {
      return NextResponse.json({ success: false, error: 'Monthly rent must be greater than zero.' }, { status: 400 });
    }

    const bedRent = baseRent / sharingType;
    const room = await prisma.room.create({
      data: {
        propertyId,
        roomNumber,
        floor,
        sharingType,
        roomType: getRoomType(sharingType),
        baseRent,
        beds: {
          create: Array.from({ length: sharingType }, (_, index) => ({
            bedNumber: `${roomNumber}-${String.fromCharCode(65 + index)}`,
            status: 'VACANT',
            rentAmount: bedRent,
          })),
        },
      },
      include: { beds: { orderBy: { bedNumber: 'asc' } } },
    });

    return NextResponse.json({ success: true, data: room }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'That room number already exists.' }, { status: 409 });
    }
    console.error('[POST /api/rooms] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to create room.' }, { status: 500 });
  }
}
