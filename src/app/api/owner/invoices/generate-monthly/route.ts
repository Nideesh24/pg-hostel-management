import { NextResponse } from 'next/server';
import { getAuthenticatedOwner, isOwnerOfProperty } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface GenerateMonthlyInvoicesBody {
  month: number; // 1 - 12
  year?: number; // defaults to current year
  dueDate: string; // ISO string e.g. "2026-11-05"
  propertyId?: string; // optional: restrict generation to a specific PG property
}

export async function POST(request: Request) {
  try {
    const owner = await getAuthenticatedOwner();
    if (!owner) {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const body: GenerateMonthlyInvoicesBody = await request.json();
    const { month, year, dueDate, propertyId } = body;
    if (propertyId?.trim() && !isOwnerOfProperty(owner, propertyId.trim())) {
      return NextResponse.json({ success: false, error: 'You do not manage this property.' }, { status: 403 });
    }

    // Validate Month
    const parsedMonth = parseInt(String(month), 10);
    if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid 'month' is required (number between 1 and 12).",
        },
        { status: 400 }
      );
    }

    // Validate Year (default to current year)
    const currentYear = new Date().getFullYear();
    const parsedYear = year ? parseInt(String(year), 10) : currentYear;
    if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return NextResponse.json(
        { success: false, error: 'Valid billing year is required.' },
        { status: 400 }
      );
    }

    // Validate Due Date
    if (!dueDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment 'dueDate' is required (e.g. '2026-11-05').",
        },
        { status: 400 }
      );
    }

    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid 'dueDate' format. Please provide a valid date string." },
        { status: 400 }
      );
    }

    // Fetch all active tenants with an allocated bed and room
    const activeTenants = await prisma.tenant.findMany({
      where: {
        status: 'ACTIVE',
        bedId: { not: null },
        ...(propertyId?.trim()
          ? { propertyId: propertyId.trim() }
          : { property: { ownerId: owner.id } }),
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

    if (activeTenants.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No active tenants found with allocated beds to generate invoices.',
          generatedCount: 0,
          skippedCount: 0,
          invoices: [],
        },
        { status: 200 }
      );
    }

    // Check for existing invoices for this billing cycle to guarantee idempotency
    const existingInvoices = await prisma.rentInvoice.findMany({
      where: {
        billingMonth: parsedMonth,
        billingYear: parsedYear,
        tenantId: {
          in: activeTenants.map((t) => t.id),
        },
      },
      select: {
        tenantId: true,
      },
    });

    const alreadyBilledTenantIds = new Set(existingInvoices.map((inv) => inv.tenantId));

    // Filter tenants eligible for invoice creation
    const eligibleTenants = activeTenants.filter(
      (tenant) => !alreadyBilledTenantIds.has(tenant.id) && tenant.bed?.room
    );

    if (eligibleTenants.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: `All ${activeTenants.length} active tenants already have invoices generated for ${parsedMonth}/${parsedYear}.`,
          generatedCount: 0,
          skippedCount: activeTenants.length,
          invoices: [],
        },
        { status: 200 }
      );
    }

    // Batch generate invoices within an atomic transaction
    const createdInvoices = await prisma.$transaction(
      eligibleTenants.map((tenant) => {
        const room = tenant.bed!.room;
        // Pulled from room.baseRent as specified
        const rentAmount = Number(room.baseRent);
        const totalAmount = rentAmount;

        const paddedMonth = String(parsedMonth).padStart(2, '0');
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const invoiceNumber = `INV-${parsedYear}${paddedMonth}-${tenant.id.slice(-4).toUpperCase()}-${randomSuffix}`;

        return prisma.rentInvoice.create({
          data: {
            invoiceNumber,
            billingMonth: parsedMonth,
            billingYear: parsedYear,
            rentAmount,
            baseRent: rentAmount,
            totalAmount,
            paidAmount: 0.0,
            status: 'UNPAID',
            dueDate: parsedDueDate,
            tenantId: tenant.id,
            propertyId: tenant.propertyId,
          },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
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
      })
    );

    return NextResponse.json(
      {
        success: true,
        message: `Successfully generated ${createdInvoices.length} invoices for ${parsedMonth}/${parsedYear}.`,
        generatedCount: createdInvoices.length,
        skippedCount: alreadyBilledTenantIds.size,
        invoices: createdInvoices,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/owner/invoices/generate-monthly] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while generating monthly invoices.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
