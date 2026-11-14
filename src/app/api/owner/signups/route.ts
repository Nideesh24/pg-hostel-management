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

    const requests = await prisma.tenant.findMany({
      where: { propertyId, approvalStatus: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        preferredRoomType: true,
        preferredSharing: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        profilePhotoUrl: true,
        idDocumentUrl: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('[GET /api/owner/signups] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error while loading signup requests.',
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const owner = await getAuthenticatedUser();
    if (!owner || owner.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const body = await request.json();
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const action = body.action;
    if (!tenantId || (action !== 'APPROVE' && action !== 'REJECT')) {
      return NextResponse.json({ success: false, error: 'Tenant and valid action are required.' }, { status: 400 });
    }

    const signup = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        propertyId: true,
        userId: true,
        bedId: true,
        approvalStatus: true,
        profilePhotoUrl: true,
        idDocumentUrl: true,
      },
    });
    if (!signup || !isOwnerOfProperty(owner, signup.propertyId)) {
      return NextResponse.json({ success: false, error: 'Signup request not found.' }, { status: 404 });
    }
    if (signup.approvalStatus !== 'PENDING') {
      return NextResponse.json({ success: false, error: 'This signup request has already been reviewed.' }, { status: 409 });
    }

    const linkedUser = signup.userId
      ? await prisma.user.findUnique({ where: { id: signup.userId }, select: { id: true } })
      : await prisma.user.findUnique({ where: { email: signup.email }, select: { id: true } });

    if (action === 'REJECT') {
      await prisma.$transaction(async (tx) => {
        const rejected = await tx.tenant.updateMany({
          where: { id: signup.id, approvalStatus: 'PENDING' },
          data: { approvalStatus: 'REJECTED' },
        });
        if (rejected.count !== 1) throw new Error('SIGNUP_ALREADY_REVIEWED');

        if (linkedUser) {
          await tx.user.update({
            where: { id: linkedUser.id },
            data: { approvalStatus: 'REJECTED' },
          });
        }
      }, { maxWait: 10000, timeout: 20000 });
      return NextResponse.json({ success: true, message: 'Signup request rejected.' });
    }

    const bedId = typeof body.bedId === 'string' ? body.bedId.trim() : '';
    if (!bedId) {
      return NextResponse.json({ success: false, error: 'Choose an available bed to approve this signup.' }, { status: 400 });
    }

    if (signup.bedId) {
      return NextResponse.json({ success: false, error: 'This signup request already has a bed allocation.' }, { status: 409 });
    }
    if (!linkedUser) {
      return NextResponse.json({ success: false, error: 'The signup login account could not be found.' }, { status: 409 });
    }

    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
      include: { tenant: { select: { id: true } }, room: { select: { id: true, propertyId: true } } },
    });
    if (!bed || bed.room.propertyId !== signup.propertyId) {
      return NextResponse.json({ success: false, error: 'Choose a bed in the signup property.' }, { status: 400 });
    }
    if ((bed.status !== 'VACANT' && bed.status !== 'AVAILABLE') || bed.tenant) {
      return NextResponse.json({ success: false, error: 'The selected bed is no longer available.' }, { status: 409 });
    }

    const approved = await prisma.$transaction(async (tx) => {
      const claimedBed = await tx.bed.updateMany({
        where: { id: bed.id, status: { in: ['VACANT', 'AVAILABLE'] }, tenant: { is: null } },
        data: { status: 'OCCUPIED' },
      });
      if (claimedBed.count !== 1) throw new Error('BED_UNAVAILABLE');

      const approvedTenant = await tx.tenant.updateMany({
        where: { id: signup.id, approvalStatus: 'PENDING', bedId: null },
        data: {
          name: signup.name,
          fullName: signup.fullName || signup.name,
          userId: linkedUser.id,
          bedId: bed.id,
          approvalStatus: 'APPROVED',
          status: 'ACTIVE',
          checkInDate: new Date(),
          profilePhotoUrl: signup.profilePhotoUrl,
          idDocumentUrl: signup.idDocumentUrl,
        },
      });
      if (approvedTenant.count !== 1) throw new Error('SIGNUP_ALREADY_REVIEWED');

      await tx.user.update({
        where: { id: linkedUser.id },
        data: { role: 'TENANT', approvalStatus: 'APPROVED', isActive: true },
      });

      return { tenantId: signup.id, userId: linkedUser.id, bedId: bed.id, roomId: bed.room.id };
    }, { maxWait: 10000, timeout: 20000 });

    return NextResponse.json({
      success: true,
      message: 'Signup approved and bed assigned.',
      allocation: approved,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error while updating signup request.';
    const knownErrors: Record<string, { status: number; message: string }> = {
      SIGNUP_ALREADY_REVIEWED: { status: 409, message: 'This signup request has already been reviewed.' },
      SIGNUP_ALREADY_ALLOCATED: { status: 409, message: 'This signup request already has a bed allocation.' },
      SIGNUP_USER_NOT_FOUND: { status: 409, message: 'The signup login account could not be found.' },
      BED_NOT_IN_PROPERTY: { status: 400, message: 'Choose a bed in the signup property.' },
      BED_UNAVAILABLE: { status: 409, message: 'The selected bed is no longer available.' },
    };
    const knownError = knownErrors[errorMessage];
    if (knownError) {
      return NextResponse.json({ success: false, error: knownError.message, details: errorMessage }, { status: knownError.status });
    }

    console.error('[PATCH /api/owner/signups] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage, details: errorMessage }, { status: 500 });
  }
}
