import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getAuthenticatedOwner, isOwnerOfProperty } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const owner = await getAuthenticatedOwner();
    if (!owner) {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const propertyId = new URL(request.url).searchParams.get('propertyId')?.trim() || '';
    const property = propertyId
      ? await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, ownerId: true } })
      : null;
    if (!property || !isOwnerOfProperty(owner, propertyId)) {
      return NextResponse.json({ success: false, error: 'Select a property you manage.' }, { status: 403 });
    }

    const [invites, coOwners] = await Promise.all([
      property.ownerId === owner.id
        ? prisma.ownerInvite.findMany({
            where: { propertyId },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              token: true,
              invitedEmail: true,
              note: true,
              status: true,
              applicantName: true,
              applicantEmail: true,
              applicantPhone: true,
              expiresAt: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      prisma.propertyCoOwner.findMany({
        where: { propertyId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          ownerInviteId: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      isPrimaryOwner: property.ownerId === owner.id,
      invites,
      coOwners: coOwners.map(({ user, ownerInviteId }) => ({ ...user, inviteId: ownerInviteId })),
    });
  } catch (error) {
    console.error('[GET /api/owner/invites] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to load shared-owner access.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const owner = await getAuthenticatedOwner();
    if (!owner) {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const body = await request.json();
    const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : '';
    const invitedEmail = typeof body.invitedEmail === 'string' ? body.invitedEmail.trim().toLowerCase() : '';
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    const property = propertyId
      ? await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, ownerId: true } })
      : null;

    if (!property || property.ownerId !== owner.id) {
      return NextResponse.json({ success: false, error: 'Only the primary owner can create invite links.' }, { status: 403 });
    }
    if (invitedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitedEmail)) {
      return NextResponse.json({ success: false, error: 'Enter a valid invited email address.' }, { status: 400 });
    }

    const token = randomBytes(32).toString('hex');
    const invite = await prisma.ownerInvite.create({
      data: {
        token,
        invitedEmail: invitedEmail || null,
        note: note || null,
        expiresAt: new Date(Date.now() + INVITE_LIFETIME_MS),
        propertyId,
        createdById: owner.id,
      },
      select: { id: true, token: true, invitedEmail: true, note: true, expiresAt: true, createdAt: true },
    });

    return NextResponse.json({
      success: true,
      invite: { ...invite, link: new URL(`/owner-invite/${token}`, request.url).toString() },
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/owner/invites] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to create owner invite link.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const owner = await getAuthenticatedOwner();
    if (!owner) {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const body = await request.json();
    const inviteId = typeof body.inviteId === 'string' ? body.inviteId.trim() : '';
    const action = body.action;
    if (!inviteId || !['APPROVE', 'REJECT', 'REVOKE'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invite and valid action are required.' }, { status: 400 });
    }

    const invite = await prisma.ownerInvite.findUnique({
      where: { id: inviteId },
      select: {
        id: true,
        propertyId: true,
        status: true,
        expiresAt: true,
        applicantName: true,
        applicantEmail: true,
        applicantPhone: true,
        applicantPasswordHash: true,
        applicantUserId: true,
        property: { select: { ownerId: true } },
      },
    });
    if (!invite || invite.property.ownerId !== owner.id) {
      return NextResponse.json({ success: false, error: 'Invite not found.' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      if (invite.status !== 'PENDING_APPROVAL' || invite.expiresAt <= new Date()) {
        return NextResponse.json({ success: false, error: 'This ownership request is no longer available.' }, { status: 409 });
      }
      if (!invite.applicantName || !invite.applicantEmail || !invite.applicantPhone || !invite.applicantPasswordHash) {
        return NextResponse.json({ success: false, error: 'The application is incomplete.' }, { status: 409 });
      }

      const existing = await prisma.user.findFirst({
        where: { OR: [{ email: invite.applicantEmail }, { phone: invite.applicantPhone }] },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ success: false, error: 'An account already uses this email or phone number.' }, { status: 409 });
      }

      await prisma.$transaction(async (tx) => {
        const claimed = await tx.ownerInvite.updateMany({
          where: { id: invite.id, status: 'PENDING_APPROVAL', expiresAt: { gt: new Date() } },
          data: { status: 'APPROVED' },
        });
        if (claimed.count !== 1) throw new Error('INVITE_ALREADY_REVIEWED');

        const coOwner = await tx.user.create({
          data: {
            name: invite.applicantName!,
            email: invite.applicantEmail!,
            phone: invite.applicantPhone!,
            passwordHash: invite.applicantPasswordHash!,
            role: 'OWNER',
            approvalStatus: 'APPROVED',
            isActive: true,
          },
          select: { id: true },
        });

        await tx.propertyCoOwner.create({
          data: {
            propertyId: invite.propertyId,
            userId: coOwner.id,
            grantedById: owner.id,
            ownerInviteId: invite.id,
          },
        });
        await tx.ownerInvite.update({
          where: { id: invite.id },
          data: { applicantUserId: coOwner.id, applicantPasswordHash: null },
        });
      }, { maxWait: 10000, timeout: 20000 });

      return NextResponse.json({ success: true, message: 'Shared owner access approved.' });
    }

    if (action === 'REJECT') {
      if (invite.status !== 'PENDING_APPROVAL') {
        return NextResponse.json({ success: false, error: 'Only pending requests can be rejected.' }, { status: 409 });
      }
      const rejected = await prisma.ownerInvite.updateMany({
        where: { id: invite.id, status: 'PENDING_APPROVAL' },
        data: { status: 'REVOKED', applicantPasswordHash: null },
      });
      if (rejected.count !== 1) {
        return NextResponse.json({ success: false, error: 'This ownership request has already been reviewed.' }, { status: 409 });
      }
      return NextResponse.json({ success: true, message: 'Ownership request rejected.' });
    }

    const applicantUserId = invite.applicantUserId;
    if (invite.status !== 'APPROVED' || !applicantUserId) {
      return NextResponse.json({ success: false, error: 'This invite does not have active access.' }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.ownerInvite.update({
        where: { id: invite.id },
        data: { status: 'REVOKED' },
      });
      await tx.propertyCoOwner.deleteMany({ where: { ownerInviteId: invite.id } });

      const [ownedCount, sharedCount] = await Promise.all([
        tx.property.count({ where: { ownerId: applicantUserId } }),
        tx.propertyCoOwner.count({ where: { userId: applicantUserId } }),
      ]);
      if (ownedCount === 0 && sharedCount === 0) {
        await tx.user.update({
          where: { id: applicantUserId },
          data: { isActive: false, sessionToken: null, sessionExpiresAt: null },
        });
      }
    }, { maxWait: 10000, timeout: 20000 });

    return NextResponse.json({ success: true, message: 'Shared owner access revoked.' });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVITE_ALREADY_REVIEWED') {
      return NextResponse.json({ success: false, error: 'This ownership request has already been reviewed.' }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'An account already uses this email or phone number.' }, { status: 409 });
    }
    console.error('[PATCH /api/owner/invites] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to update shared-owner access.' }, { status: 500 });
  }
}
