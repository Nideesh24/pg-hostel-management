import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser, isOwnerOfProperty } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const body = await request.json();
    const roomId = typeof body.roomId === 'string' ? body.roomId.trim() : '';
    const bedNumber = typeof body.bedNumber === 'string' ? body.bedNumber.trim() : '';
    const rentAmount = Number(body.rentAmount);
    if (!roomId || !bedNumber || !Number.isFinite(rentAmount) || rentAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Room, bed number, and valid monthly rent are required.' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, propertyId: true },
    });
    if (!room) return NextResponse.json({ success: false, error: 'Room not found.' }, { status: 404 });
    if (!isOwnerOfProperty(user, room.propertyId)) {
      return NextResponse.json({ success: false, error: 'You do not manage this property.' }, { status: 403 });
    }

    const bed = await prisma.bed.create({
      data: { roomId, bedNumber, rentAmount, status: 'VACANT' },
    });
    return NextResponse.json({ success: true, data: bed }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'That bed number already exists in this room.' }, { status: 409 });
    }
    console.error('[POST /api/beds] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to create bed.' }, { status: 500 });
  }
}
