import { NextResponse } from 'next/server';
import { getAuthenticatedUser, isOwnerOfProperty } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png'];
const ID_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

function isValidUpload(dataUrl: string, mimeTypes: string[]) {
  const escapedTypes = mimeTypes.map((type) => type.replace('/', '\\/')).join('|');
  const match = new RegExp(`^data:(${escapedTypes});base64,([A-Za-z0-9+/=]+)$`).exec(dataUrl);
  if (!match) return false;
  const base64 = match[2];
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding < MAX_UPLOAD_BYTES;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const { tenantId } = await context.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        bed: { include: { room: { select: { roomNumber: true } } } },
      },
    });
    if (!tenant || !isOwnerOfProperty(user, tenant.propertyId)) {
      return NextResponse.json({ success: false, error: 'Tenant record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        fullName: tenant.fullName,
        email: tenant.email,
        phone: tenant.phone,
        dateOfBirth: tenant.dateOfBirth,
        permanentHomeAddress: tenant.permanentHomeAddress,
        emergencyContactName: tenant.emergencyContactName,
        emergencyContactPhone: tenant.emergencyContactPhone,
        occupationOrCollege: tenant.occupationOrCollege,
        idReferenceNumber: tenant.idReferenceNumber,
        idDocumentUrl: tenant.idDocumentUrl,
        profilePhotoUrl: tenant.profilePhotoUrl,
        bed: tenant.bed ? { bedNumber: tenant.bed.bedNumber, roomNumber: tenant.bed.room.roomNumber } : null,
      },
    });
  } catch (error) {
    console.error('[GET /api/owner/tenants/[tenantId]] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to load tenant details.' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const { tenantId } = await context.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, propertyId: true },
    });
    if (!tenant || !isOwnerOfProperty(user, tenant.propertyId)) {
      return NextResponse.json({ success: false, error: 'Tenant record not found.' }, { status: 404 });
    }

    const body = await request.json();
    const data: { profilePhotoUrl?: string; idDocumentUrl?: string; idProofDocumentUrl?: string } = {};
    if (typeof body.profilePhotoUrl === 'string') {
      if (!isValidUpload(body.profilePhotoUrl, PROFILE_PHOTO_TYPES)) {
        return NextResponse.json({ success: false, error: 'Profile photo must be a JPG or PNG smaller than 2 MB.' }, { status: 400 });
      }
      data.profilePhotoUrl = body.profilePhotoUrl;
    }
    if (typeof body.idDocumentUrl === 'string') {
      if (!isValidUpload(body.idDocumentUrl, ID_DOCUMENT_TYPES)) {
        return NextResponse.json({ success: false, error: 'ID document must be a JPG, PNG, or PDF smaller than 2 MB.' }, { status: 400 });
      }
      data.idDocumentUrl = body.idDocumentUrl;
      data.idProofDocumentUrl = body.idDocumentUrl;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'Provide a profile photo or ID document to update.' }, { status: 400 });
    }

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data,
      select: { id: true, profilePhotoUrl: true, idDocumentUrl: true },
    });
    return NextResponse.json({ success: true, tenant: updated });
  } catch (error) {
    console.error('[PATCH /api/owner/tenants/[tenantId]] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error while updating tenant documents.',
    }, { status: 500 });
  }
}
