import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAuthenticatedOwner } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request) {
  try {
    const owner = await getAuthenticatedOwner();
    if (!owner) {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Enter a full name and valid email address.' }, { status: 400 });
    }

    const data: Prisma.UserUpdateInput = { name, email };
    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json({ success: false, error: 'New password must be at least 8 characters.' }, { status: 400 });
      }
      if (!currentPassword || !owner.passwordHash || !(await bcrypt.compare(currentPassword, owner.passwordHash))) {
        return NextResponse.json({ success: false, error: 'Your current password is incorrect.' }, { status: 403 });
      }
      data.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: owner.id },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, avatarUrl: true },
    });
    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'That email address is already in use.' }, { status: 409 });
    }
    console.error('[PATCH /api/owner/profile] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to update owner account.' }, { status: 500 });
  }
}
