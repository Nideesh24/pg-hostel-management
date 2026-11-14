import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role } = body;

    if (role !== 'OWNER' && role !== 'TENANT') {
      return NextResponse.json(
        { success: false, error: 'Only Owner and Tenant sign-in is supported.' },
        { status: 400 }
      );
    }

    if (!email?.trim() || typeof password !== 'string' || password.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // Look up user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        tenantProfile: { select: { id: true, name: true, phone: true, bedId: true, propertyId: true, approvalStatus: true } },
        ownedProperties: { select: { id: true, name: true, city: true } },
        sharedProperties: { select: { property: { select: { id: true, name: true, city: true } } } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No account found with this email address.' },
        { status: 401 }
      );
    }

    if (user.role !== role) {
      return NextResponse.json(
        { success: false, error: `This account is not registered as a ${role.toLowerCase()}.` },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'This account has been deactivated.' },
        { status: 403 }
      );
    }

    if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (user.role !== 'OWNER' && user.role !== 'TENANT') {
      return NextResponse.json(
        { success: false, error: 'Only Owner and Tenant accounts can sign in.' },
        { status: 403 }
      );
    }

    if (user.role === 'TENANT' && user.tenantProfile?.approvalStatus !== 'APPROVED') {
      const error =
        user.tenantProfile?.approvalStatus === 'REJECTED'
          ? 'Your signup request was rejected. Contact OM MURUGAA MENS HOSTEL at 9791157550.'
          : 'Your account is awaiting Owner approval. Contact OM MURUGAA MENS HOSTEL at 9791157550.';
      return NextResponse.json({ success: false, error }, { status: 403 });
    }
    if (user.role === 'OWNER' && user.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Your owner account is awaiting approval.' },
        { status: 403 }
      );
    }

    const sessionToken = randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionToken, sessionExpiresAt },
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: sessionExpiresAt,
    });

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
      tenantProfile: user.tenantProfile,
      ownedProperties: [
        ...user.ownedProperties,
        ...user.sharedProperties.map(({ property }) => property),
      ],
    };

    return NextResponse.json(
      {
        success: true,
        message: `Welcome back, ${user.name}!`,
        user: sessionUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[POST /api/auth/login] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during authentication.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
