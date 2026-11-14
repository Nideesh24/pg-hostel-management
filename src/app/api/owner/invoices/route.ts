import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedOwner, isOwnerOfProperty } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/owner/invoices?propertyId=...
export async function GET(request: NextRequest) {
  try {
    const owner = await getAuthenticatedOwner();
    if (!owner) {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    if (propertyId?.trim() && !isOwnerOfProperty(owner, propertyId.trim())) {
      return NextResponse.json({ success: false, error: 'You do not manage this property.' }, { status: 403 });
    }

    const invoices = await prisma.rentInvoice.findMany({
      where: {
        ...(propertyId?.trim()
          ? { propertyId: propertyId.trim() }
          : { property: { ownerId: owner.id } }),
      },
      orderBy: [
        { billingYear: 'desc' },
        { billingMonth: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            bed: {
              select: {
                bedNumber: true,
                room: {
                  select: {
                    roomNumber: true,
                    floor: true,
                  },
                },
              },
            },
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

    const now = new Date();

    const formatted = invoices.map((inv) => {
      let status = inv.status;
      if (inv.status === 'UNPAID' && now > new Date(inv.dueDate)) {
        status = 'OVERDUE';
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        billingMonth: inv.billingMonth,
        billingYear: inv.billingYear,
        rentAmount: Number(inv.rentAmount),
        electricityAmount: Number(inv.electricityAmount ?? inv.electricityCharges ?? 0),
        waterCharges: Number(inv.waterCharges ?? 0),
        maintenanceCharges: Number(inv.maintenanceCharges ?? 0),
        totalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.paidAmount ?? 0),
        status,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        paymentMethod: inv.paymentMethod,
        tenant: inv.tenant,
        property: inv.property,
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: formatted.length,
        invoices: formatted,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/owner/invoices] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while fetching invoices.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/owner/invoices (Mark Paid or Add Electricity)
export async function PATCH(request: Request) {
  try {
    const owner = await getAuthenticatedOwner();
    if (!owner) {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    const body = await request.json();
    const { invoiceId, action, electricityAmount, paymentMethod } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID (invoiceId) is required.' },
        { status: 400 }
      );
    }

    const invoice = await prisma.rentInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found.' },
        { status: 404 }
      );
    }
    if (!isOwnerOfProperty(owner, invoice.propertyId)) {
      return NextResponse.json({ success: false, error: 'You do not manage this invoice.' }, { status: 403 });
    }

    if (action === 'MARK_PAID') {
      const updated = await prisma.rentInvoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidAmount: invoice.totalAmount,
          paidAt: new Date(),
          paymentMethod: paymentMethod || 'CASH',
        },
      });

      return NextResponse.json({ success: true, message: 'Invoice marked as PAID', data: updated });
    }

    if (action === 'ADD_ELECTRICITY') {
      const additionalElec = Number(electricityAmount) || 0;
      const newTotal = Number(invoice.rentAmount) + additionalElec + Number(invoice.maintenanceCharges || 0);

      const updated = await prisma.rentInvoice.update({
        where: { id: invoiceId },
        data: {
          electricityCharges: additionalElec,
          electricityAmount: additionalElec,
          totalAmount: newTotal,
        },
      });

      return NextResponse.json({ success: true, message: 'Electricity charge updated', data: updated });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Supported: 'MARK_PAID', 'ADD_ELECTRICITY'." },
      { status: 400 }
    );
  } catch (error) {
    console.error('[PATCH /api/owner/invoices] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update invoice.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
