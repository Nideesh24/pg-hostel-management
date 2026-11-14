import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthenticatedUser, SESSION_COOKIE_NAME } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { sessionToken: null, sessionExpiresAt: null },
      });
    }

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/auth/logout] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to log out.' }, { status: 500 });
  }
}
