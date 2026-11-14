import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png'];

function isValidUpload(dataUrl: string, mimeTypes: string[]) {
  const escapedTypes = mimeTypes.map((type) => type.replace('/', '\\/')).join('|');
  const match = new RegExp(`^data:(${escapedTypes});base64,([A-Za-z0-9+/=]+)$`).exec(dataUrl);
  if (!match) return false;
  const base64 = match[2];
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding < MAX_DOCUMENT_BYTES;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'TENANT' || user.tenantProfile?.approvalStatus !== 'APPROVED') {
      return NextResponse.json({ success: false, error: 'Tenant sign-in is required.' }, { status: 403 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        fullName: true,
        dateOfBirth: true,
        permanentHomeAddress: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        occupationOrCollege: true,
        idReferenceNumber: true,
        idDocumentUrl: true,
        profilePhotoUrl: true,
      },
    });
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant profile not found.' }, { status: 404 });
    return NextResponse.json({ success: true, profile: tenant });
  } catch (error) {
    console.error('[GET /api/tenant/profile] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to load tenant profile.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'TENANT' || user.tenantProfile?.approvalStatus !== 'APPROVED') {
      return NextResponse.json({ success: false, error: 'Tenant sign-in is required.' }, { status: 403 });
    }

    const body = await request.json();
    const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) {
      return NextResponse.json({ success: false, error: 'Enter a valid date of birth.' }, { status: 400 });
    }
    if (typeof body.idDocumentUrl === 'string' && !isValidUpload(body.idDocumentUrl, ALLOWED_DOCUMENT_TYPES)) {
      return NextResponse.json(
        { success: false, error: 'ID document must be a JPG, PNG, or PDF under 2 MB.' },
        { status: 400 }
      );
    }
    if (typeof body.profilePhotoUrl === 'string' && !isValidUpload(body.profilePhotoUrl, ALLOWED_PHOTO_TYPES)) {
      return NextResponse.json(
        { success: false, error: 'Profile photo must be a JPG or PNG under 2 MB.' },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.update({
      where: { userId: user.id },
      data: {
        dateOfBirth,
        permanentHomeAddress: typeof body.permanentHomeAddress === 'string' ? body.permanentHomeAddress.trim() : null,
        emergencyContactName: typeof body.emergencyContactName === 'string' ? body.emergencyContactName.trim() : null,
        emergencyContactPhone: typeof body.emergencyContactPhone === 'string' ? body.emergencyContactPhone.trim() : null,
        occupationOrCollege: typeof body.occupationOrCollege === 'string' ? body.occupationOrCollege.trim() : null,
        idReferenceNumber: typeof body.idReferenceNumber === 'string' ? body.idReferenceNumber.trim() : null,
        ...(typeof body.profilePhotoUrl === 'string' || body.profilePhotoUrl === null
          ? { profilePhotoUrl: body.profilePhotoUrl }
          : {}),
        ...(typeof body.idDocumentUrl === 'string' || body.idDocumentUrl === null
          ? { idDocumentUrl: body.idDocumentUrl, idProofDocumentUrl: body.idDocumentUrl }
          : {}),
      },
      select: { id: true, dateOfBirth: true, idDocumentUrl: true, profilePhotoUrl: true },
    });
    return NextResponse.json({ success: true, profile: tenant });
  } catch (error) {
    console.error('[PATCH /api/tenant/profile] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to save tenant profile.' }, { status: 500 });
  }
}
