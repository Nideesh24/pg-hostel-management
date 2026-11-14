import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? normalizePhone(body.phone) : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!email || !phone || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Enter your registered email, phone number, and a password of at least 8 characters.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenantProfile: { select: { phone: true } } },
    });
    const registeredPhone = user?.phone || user?.tenantProfile?.phone || '';
    if (
      !user ||
      !user.isActive ||
      !['OWNER', 'TENANT'].includes(user.role) ||
      normalizePhone(registeredPhone) !== phone
    ) {
      return NextResponse.json(
        { success: false, error: 'The email and phone number do not match an active account.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, sessionToken: null, sessionExpiresAt: null },
    });

    return NextResponse.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[POST /api/auth/reset-password] Database error:', error);
    } else {
      console.error('[POST /api/auth/reset-password] Error:', error);
    }
    return NextResponse.json({ success: false, error: 'Unable to reset your password.' }, { status: 500 });
  }
}
