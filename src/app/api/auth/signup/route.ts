import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_SHARING', 'DORMITORY'] as const;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png'] as const;
const ID_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;

interface SignupBody {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  preferredRoomType?: string;
  preferredSharing?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profilePhotoUrl?: string;
  idDocumentUrl?: string;
}

function validUpload(dataUrl: string, mimeTypes: readonly string[]) {
  const escapedTypes = mimeTypes.map((type) => type.replace('/', '\\/')).join('|');
  const match = new RegExp(`^data:(${escapedTypes});base64,([A-Za-z0-9+/=]+)$`).exec(dataUrl);
  if (!match) return false;
  const base64 = match[2];
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding < MAX_UPLOAD_BYTES;
}

export async function POST(request: Request) {
  try {
    const body: SignupBody = await request.json();
    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim();
    const password = body.password;
    const emergencyContactName = body.emergencyContactName?.trim();
    const emergencyContactPhone = body.emergencyContactPhone?.trim();
    const profilePhotoUrl = body.profilePhotoUrl;
    const idDocumentUrl = body.idDocumentUrl;

    if (
      !fullName || !email || !phone || !password || !body.preferredRoomType || !body.preferredSharing ||
      typeof profilePhotoUrl !== 'string' || typeof idDocumentUrl !== 'string'
    ) {
      return NextResponse.json(
        { success: false, error: 'Complete all required fields and upload both your profile photo and Aadhaar copy.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (!validUpload(profilePhotoUrl, PROFILE_PHOTO_TYPES)) {
      return NextResponse.json({ success: false, error: 'Profile photo must be a JPG or PNG smaller than 2 MB.' }, { status: 400 });
    }
    if (!validUpload(idDocumentUrl, ID_DOCUMENT_TYPES)) {
      return NextResponse.json({ success: false, error: 'Aadhaar copy must be a JPG, PNG, or PDF smaller than 2 MB.' }, { status: 400 });
    }
    if (!(ROOM_TYPES as readonly string[]).includes(body.preferredRoomType)) {
      return NextResponse.json({ success: false, error: 'Select a valid preferred room type.' }, { status: 400 });
    }
    const preferredSharing = Number(body.preferredSharing);
    if (!Number.isInteger(preferredSharing) || preferredSharing < 1 || preferredSharing > 20) {
      return NextResponse.json({ success: false, error: 'Select a valid sharing preference.' }, { status: 400 });
    }

    const property = await prisma.property.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!property) {
      return NextResponse.json({ success: false, error: 'Hostel registration is temporarily unavailable.' }, { status: 503 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const tenant = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: fullName,
          email,
          phone,
          passwordHash,
          role: 'TENANT',
          isActive: true,
        },
      });

      return tx.tenant.create({
        data: {
          name: fullName,
          fullName,
          email,
          phone,
          userId: user.id,
          propertyId: property.id,
          status: 'ACTIVE',
          approvalStatus: 'PENDING',
          preferredRoomType: body.preferredRoomType as (typeof ROOM_TYPES)[number],
          preferredSharing,
          emergencyContactName: emergencyContactName || null,
          emergencyContactPhone: emergencyContactPhone || null,
          profilePhotoUrl,
          idDocumentUrl,
        },
        select: { id: true, name: true, approvalStatus: true },
      });
    }, { maxWait: 10000, timeout: 20000 });

    return NextResponse.json(
      { success: true, message: 'Signup submitted for Owner approval.', data: tenant },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'An account already exists with this email or phone number.' },
        { status: 409 }
      );
    }
    console.error('[POST /api/auth/signup] Error:', error);
    return NextResponse.json({ success: false, error: 'Unable to submit signup request.' }, { status: 500 });
  }
}
