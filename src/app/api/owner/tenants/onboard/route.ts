import { NextResponse } from 'next/server';
import { getAuthenticatedUser, isOwnerOfProperty } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface OnboardTenantBody {
  name: string;
  phone: string;
  email: string;
  bedId: string;
  aadhaarNumber?: string;
  securityDeposit?: number;
  checkInDate?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export async function POST(request: Request) {
  try {
    const owner = await getAuthenticatedUser();
    if (!owner || owner.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const body: OnboardTenantBody = await request.json();
    const {
      name,
      phone,
      email,
      bedId,
      aadhaarNumber,
      securityDeposit = 0,
      checkInDate,
      emergencyContactName,
      emergencyContactPhone,
    } = body;

    // Field Validations
    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Tenant name is required.' },
        { status: 400 }
      );
    }

    if (!phone?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Tenant phone number is required.' },
        { status: 400 }
      );
    }

    if (!email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Tenant email is required.' },
        { status: 400 }
      );
    }

    if (!bedId?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Bed ID (bedId) is required for allocation.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    // Verify Bed existence and availability
    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
      include: {
        room: {
          select: {
            id: true,
            roomNumber: true,
            propertyId: true,
          },
        },
        tenant: true,
      },
    });

    if (!bed) {
      return NextResponse.json(
        { success: false, error: `Bed with ID '${bedId}' not found.` },
        { status: 404 }
      );
    }
    if (!isOwnerOfProperty(owner, bed.room.propertyId)) {
      return NextResponse.json({ success: false, error: 'You do not manage this property.' }, { status: 403 });
    }

    if (bed.status === 'OCCUPIED' || bed.tenant) {
      return NextResponse.json(
        {
          success: false,
          error: `Bed ${bed.bedNumber} in Room ${bed.room.roomNumber} is already occupied.`,
        },
        { status: 409 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { phone: normalizedPhone }],
      },
      include: {
        tenantProfile: true,
      },
    });

    if (existingUser?.tenantProfile && existingUser.tenantProfile.status === 'ACTIVE') {
      return NextResponse.json(
        {
          success: false,
          error: `An active tenant profile already exists for this email or phone number.`,
        },
        { status: 409 }
      );
    }

    const parsedDeposit = Number(securityDeposit) >= 0 ? Number(securityDeposit) : 0;
    const resolvedCheckIn = checkInDate ? new Date(checkInDate) : new Date();

    // Execute atomic onboarding transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or link User with TENANT role
      let user = existingUser;
      if (!user) {
        user = await tx.user.create({
          data: {
            name: name.trim(),
            email: normalizedEmail,
            phone: normalizedPhone,
            role: 'TENANT',
          },
          include: { tenantProfile: true },
        });
      } else if (user.role !== 'TENANT' && user.role !== 'ADMIN') {
        user = await tx.user.update({
          where: { id: user.id },
          data: { role: 'TENANT' },
          include: { tenantProfile: true },
        });
      }

      // 2. Create Tenant profile
      const tenant = await tx.tenant.create({
        data: {
          name: name.trim(),
          fullName: name.trim(),
          email: normalizedEmail,
          phone: normalizedPhone,
          status: 'ACTIVE',
          approvalStatus: 'APPROVED',
          userId: user.id,
          propertyId: bed.room.propertyId,
          bedId: bed.id,
          aadhaarNumber: aadhaarNumber?.trim() || null,
          idProofNumber: aadhaarNumber?.trim() || null,
          idProofType: aadhaarNumber ? 'AADHAAR' : null,
          securityDeposit: parsedDeposit,
          depositAmount: parsedDeposit,
          depositPaid: parsedDeposit > 0,
          checkInDate: resolvedCheckIn,
          emergencyContactName: emergencyContactName?.trim() || null,
          emergencyContactPhone: emergencyContactPhone?.trim() || null,
        },
        include: {
          bed: {
            include: {
              room: true,
            },
          },
          property: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 3. Update Bed status to OCCUPIED
      const updatedBed = await tx.bed.update({
        where: { id: bed.id },
        data: {
          status: 'OCCUPIED',
        },
      });

      return { user, tenant, updatedBed };
    }, { maxWait: 10000, timeout: 20000 });

    return NextResponse.json(
      {
        success: true,
        message: `Tenant '${name.trim()}' successfully onboarded and assigned to Bed ${bed.bedNumber}.`,
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/owner/tenants/onboard] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while onboarding tenant.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
