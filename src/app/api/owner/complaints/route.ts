import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedOwner } from '@/lib/auth';
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
      return NextResponse.json({ success: false, error: 'propertyId is required.' }, { status: 400 });
    }

    const complaints = await prisma.complaint.findMany({
      where: { propertyId: propertyId.trim() },
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            phone: true,
            bed: {
              select: {
                bedLabel: true,
                room: { select: { roomNumber: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, complaints }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/owner/complaints] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load complaints.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const owner = await getAuthenticatedOwner();
    if (!owner) {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const { complaintId, status, resolutionNotes } = await request.json();

    if (!complaintId || !status) {
      return NextResponse.json({ success: false, error: 'complaintId and status are required.' }, { status: 400 });
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status,
        resolutionNotes: resolutionNotes?.trim() || undefined,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, complaint: updated }, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/owner/complaints] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to update complaint status.' },
      { status: 500 }
    );
  }
}