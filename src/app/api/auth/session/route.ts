import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (
      !user ||
      (user.role !== 'OWNER' && user.role !== 'TENANT') ||
      (user.role === 'OWNER' && user.approvalStatus !== 'APPROVED')
    ) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    if (user.role === 'TENANT' && user.tenantProfile?.approvalStatus !== 'APPROVED') {
      return NextResponse.json({ success: false, user: null }, { status: 403 });
    }

    const { passwordHash, sessionToken, sessionExpiresAt, sharedProperties, ...sessionUser } = user;
    sessionUser.ownedProperties = [
      ...user.ownedProperties,
      ...sharedProperties.map(({ property }) => property),
    ];
    return NextResponse.json({ success: true, user: sessionUser });
  } catch (error) {
    console.error('[GET /api/auth/session] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to load session.' }, { status: 500 });
  }
}
