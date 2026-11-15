import { NextResponse } from 'next/server';
import { getAuthenticatedUser, isOwnerOfProperty } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const propertyId = new URL(request.url).searchParams.get('propertyId')?.trim() || '';
    if (!propertyId || !isOwnerOfProperty(user, propertyId)) {
      return NextResponse.json({ success: false, error: 'Select a property you manage.' }, { status: 403 });
    }

    const tenants = await prisma.tenant.findMany({
      where: { propertyId, approvalStatus: 'APPROVED' },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        status: true,
        email: true,
        phone: true,
        profilePhotoUrl: true,
        idDocumentUrl: true,
        bed: { select: { bedNumber: true, room: { select: { roomNumber: true } } } },
      },
    });
    return NextResponse.json({ success: true, tenants });
  } catch (error) {
    console.error('[GET /api/owner/tenants] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to load tenant records.' }, { status: 500 });
  }
}
