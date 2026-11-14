import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedTenant } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedTenant();
    if (!user?.tenantProfile) {
      return NextResponse.json({ success: false, error: 'Approved tenant sign-in is required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Query parameter 'tenantId' is required. Example: /api/tenant/dashboard?tenantId=clx...",
        },
        { status: 400 }
      );
    }
    if (tenantId.trim() !== user.tenantProfile.id) {
      return NextResponse.json({ success: false, error: 'You may only access your own tenant dashboard.' }, { status: 403 });
    }

    // 1. Fetch tenant with assigned bed, room, and property details
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId.trim() },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            contactNumber: true,
            rules: true,
            amenities: true,
          },
        },
        bed: {
          include: {
            room: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: `Tenant with ID '${tenantId}' not found.` },
        { status: 404 }
      );
    }

    // 2. Fetch roommate details if tenant has an assigned room
    let roommates: Array<{
      id: string;
      name: string;
      phone: string;
      bedNumber: string;
      checkInDate: Date;
    }> = [];

    const room = tenant.bed?.room;

    if (room?.id) {
      // Find other beds in the same room that have an active tenant assigned
      const otherBeds = await prisma.bed.findMany({
        where: {
          roomId: room.id,
          id: { not: tenant.bedId ?? undefined },
          status: 'OCCUPIED',
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              phone: true,
              checkInDate: true,
            },
          },
        },
      });

      roommates = otherBeds
        .filter((b) => b.tenant !== null)
        .map((b) => ({
          id: b.tenant!.id,
          name: b.tenant!.name,
          phone: b.tenant!.phone,
          bedNumber: b.bedNumber,
          checkInDate: b.tenant!.checkInDate,
        }));
    }

    // 3. Fetch latest RentInvoice record
    const latestInvoice = await prisma.rentInvoice.findFirst({
      where: { tenantId: tenant.id },
      orderBy: [
        { billingYear: 'desc' },
        { billingMonth: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Determine current invoice status (evaluates dynamically if overdue)
    let dynamicInvoiceStatus = latestInvoice?.status;
    if (
      latestInvoice &&
      latestInvoice.status === 'UNPAID' &&
      new Date() > new Date(latestInvoice.dueDate)
    ) {
      dynamicInvoiceStatus = 'OVERDUE';
    }

    return NextResponse.json(
      {
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone,
          status: tenant.status,
          checkInDate: tenant.checkInDate,
          securityDeposit: tenant.securityDeposit,
          property: tenant.property,
        },
        stayDetails: {
          hasBedAllocated: Boolean(tenant.bed),
          bed: tenant.bed
            ? {
                id: tenant.bed.id,
                bedNumber: tenant.bed.bedNumber,
                status: tenant.bed.status,
                rentAmount: tenant.bed.rentAmount,
              }
            : null,
          room: room
            ? {
                id: room.id,
                roomNumber: room.roomNumber,
                floor: room.floor,
                sharingType: room.sharingType,
                roomType: room.roomType,
                baseRent: room.baseRent,
                hasAttachedBathroom: room.hasAttachedBathroom,
                hasBalcony: room.hasBalcony,
                hasAC: room.hasAC,
              }
            : null,
          roommates,
        },
        latestInvoice: latestInvoice
          ? {
              id: latestInvoice.id,
              invoiceNumber: latestInvoice.invoiceNumber,
              month: latestInvoice.billingMonth,
              year: latestInvoice.billingYear,
              rentAmount: latestInvoice.rentAmount,
              electricityAmount:
                latestInvoice.electricityAmount ?? latestInvoice.electricityCharges,
              totalAmount: latestInvoice.totalAmount,
              paidAmount: latestInvoice.paidAmount,
              status: dynamicInvoiceStatus,
              dueDate: latestInvoice.dueDate,
              paidAt: latestInvoice.paidAt,
              paymentMethod: latestInvoice.paymentMethod,
              paymentReceiptUrl: latestInvoice.paymentReceiptUrl,
            }
          : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/tenant/dashboard] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while fetching tenant dashboard.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
