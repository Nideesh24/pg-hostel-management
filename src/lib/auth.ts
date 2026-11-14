import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE_NAME = 'hostel_session';

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const user = await prisma.user.findUnique({
    where: { sessionToken: token },
    include: {
      tenantProfile: {
        select: {
          id: true,
          name: true,
          phone: true,
          bedId: true,
          propertyId: true,
          approvalStatus: true,
        },
      },
      ownedProperties: {
        select: { id: true, name: true, city: true },
      },
      sharedProperties: {
        select: {
          property: { select: { id: true, name: true, city: true } },
        },
      },
    },
  });

  if (
    !user ||
    !user.isActive ||
    !user.sessionExpiresAt ||
    user.sessionExpiresAt <= new Date()
  ) {
    return null;
  }

  return user;
}

export function isOwnerOfProperty(
  user: {
    ownedProperties: Array<{ id: string }>;
    sharedProperties: Array<{ property: { id: string } }>;
  },
  propertyId: string
) {
  return (
    user.ownedProperties.some((property) => property.id === propertyId) ||
    user.sharedProperties.some(({ property }) => property.id === propertyId)
  );
}

export async function getAuthenticatedOwner() {
  const user = await getAuthenticatedUser();
  return user?.role === 'OWNER' && user.approvalStatus === 'APPROVED' ? user : null;
}

export async function getAuthenticatedTenant() {
  const user = await getAuthenticatedUser();
  return user?.role === 'TENANT' && user.tenantProfile?.approvalStatus === 'APPROVED'
    ? user
    : null;
}
