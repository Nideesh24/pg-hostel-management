import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAuthenticatedUser, isOwnerOfProperty } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface CreateTenantBody {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  bedId?: string;
  propertyId?: string;
  monthlyRent?: number;
}

export async function POST(request: Request) {
  try {
    const owner = await getAuthenticatedUser();
    if (!owner || owner.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const body: CreateTenantBody = await request.json();
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim();
    const password = body.password;
    const bedId = body.bedId?.trim();
    const propertyId = body.propertyId?.trim();
    const monthlyRent = Number(body.monthlyRent);

    if (!name || !email || !phone || !password || !bedId || !propertyId) {
      return NextResponse.json(
        { success: false, error: 'Name, email, phone, password, property, and bed are required.' },
        { status: 400 }
      );
    }
    if (!isOwnerOfProperty(owner, propertyId)) {
      return NextResponse.json({ success: false, error: 'You do not manage this property.' }, { status: 403 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid email address.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      return NextResponse.json(
        { success: false, error: 'Monthly rent must be greater than zero.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.$transaction(async (tx) => {
      const bed = await tx.bed.findUnique({
        where: { id: bedId },
        include: { tenant: true, room: { select: { propertyId: true } } },
      });

      if (!bed) {
        throw new Error('BED_NOT_FOUND');
      }

      if (bed.room.propertyId !== propertyId) {
        throw new Error('BED_PROPERTY_MISMATCH');
      }

      if ((bed.status !== 'VACANT' && bed.status !== 'AVAILABLE') || bed.tenant) {
        throw new Error('BED_UNAVAILABLE');
      }

      const existingUser = await tx.user.findFirst({
        where: { OR: [{ email }, { phone }] },
        select: { id: true },
      });

      if (existingUser) {
        throw new Error('ACCOUNT_EXISTS');
      }

      const user = await tx.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash,
          role: 'TENANT',
          isActive: true,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          name,
          fullName: name,
          email,
          phone,
          userId: user.id,
          propertyId,
          bedId,
          status: 'ACTIVE',
          approvalStatus: 'APPROVED',
        },
        select: { id: true, name: true, email: true, phone: true, propertyId: true, bedId: true },
      });

      await tx.bed.update({
        where: { id: bedId },
        data: { status: 'OCCUPIED', rentAmount: monthlyRent },
      });

      return tenant;
    }, {
      maxWait: 10000,
      timeout: 20000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return NextResponse.json(
      { success: true, message: `Tenant '${name}' added successfully.`, data: created },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, { error: string; status: number }> = {
        BED_NOT_FOUND: { error: 'Selected bed was not found.', status: 404 },
        BED_PROPERTY_MISMATCH: { error: 'Selected bed does not belong to this property.', status: 400 },
        BED_UNAVAILABLE: { error: 'Selected bed is no longer available.', status: 409 },
        ACCOUNT_EXISTS: { error: 'An account already exists with this email or phone number.', status: 409 },
      };

      const knownError = messages[error.message];
      if (knownError) {
        return NextResponse.json({ success: false, error: knownError.error }, { status: knownError.status });
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json(
          { success: false, error: 'An account already exists with this email or phone number.' },
          { status: 409 }
        );
      }
    }

    console.error('[POST /api/tenants] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while creating tenant.' },
      { status: 500 }
    );
  }
}
