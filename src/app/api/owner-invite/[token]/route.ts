import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const invite = await prisma.ownerInvite.findUnique({
      where: { token },
      select: {
        status: true,
        invitedEmail: true,
        expiresAt: true,
        property: { select: { name: true } },
      },
    });
    if (!invite || invite.status !== 'LINK_CREATED' || invite.expiresAt <= new Date()) {
      return NextResponse.json({ success: false, error: 'This owner invite link is invalid, expired, or already used.' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      invite: { invitedEmail: invite.invitedEmail, expiresAt: invite.expiresAt, propertyName: invite.property.name },
    });
  } catch (error) {
    console.error('[GET /api/owner-invite/[token]] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to validate this invite link.' }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const applicantName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const applicantEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const applicantPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!applicantName || !applicantPhone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail) || password.length < 8) {
      return NextResponse.json({ success: false, error: 'Enter your name, valid email, phone number, and a password of at least 8 characters.' }, { status: 400 });
    }

    const invite = await prisma.ownerInvite.findUnique({
      where: { token },
      select: { id: true, status: true, invitedEmail: true, expiresAt: true },
    });
    if (!invite || invite.status !== 'LINK_CREATED' || invite.expiresAt <= new Date()) {
      return NextResponse.json({ success: false, error: 'This owner invite link is invalid, expired, or already used.' }, { status: 404 });
    }
    if (invite.invitedEmail && invite.invitedEmail !== applicantEmail) {
      return NextResponse.json({ success: false, error: 'Use the email address this invite was sent to.' }, { status: 403 });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: applicantEmail }, { phone: applicantPhone }] },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'An account already uses this email or phone number.' }, { status: 409 });
    }

    const applicantPasswordHash = await bcrypt.hash(password, 10);
    const submitted = await prisma.ownerInvite.updateMany({
      where: { id: invite.id, status: 'LINK_CREATED', expiresAt: { gt: new Date() } },
      data: {
        status: 'PENDING_APPROVAL',
        applicantName,
        applicantEmail,
        applicantPhone,
        applicantPasswordHash,
      },
    });
    if (submitted.count !== 1) {
      return NextResponse.json({ success: false, error: 'This owner invite has already been used.' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      message: 'Your ownership request has been submitted. You can log in once the primary owner approves your access.',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'An account already uses this email or phone number.' }, { status: 409 });
    }
    console.error('[POST /api/owner-invite/[token]] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to submit your ownership request.' }, { status: 500 });
  }
}
