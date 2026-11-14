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
          error: "Query parameter 'tenantId' is required. Example: /api/tenant/invoices?tenantId=clx...",
        },
        { status: 400 }
      );
    }
    if (tenantId.trim() !== user.tenantProfile.id) {
      return NextResponse.json({ success: false, error: 'You may only access your own invoices.' }, { status: 403 });
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId.trim() },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: `Tenant with ID '${tenantId}' not found.` },
        { status: 404 }
      );
    }

    // Fetch all invoices for the tenant sorted by billing period / createdAt descending
    const invoices = await prisma.rentInvoice.findMany({
      where: { tenantId: tenant.id },
      orderBy: [
        { billingYear: 'desc' },
        { billingMonth: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    const now = new Date();

    // Map each invoice with accurate computed status (UNPAID, PAID, OVERDUE)
    const formattedInvoices = invoices.map((invoice) => {
      let computedStatus = invoice.status;
      if (invoice.status === 'UNPAID' && now > new Date(invoice.dueDate)) {
        computedStatus = 'OVERDUE';
      }

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        billingMonth: invoice.billingMonth,
        billingYear: invoice.billingYear,
        rentAmount: invoice.rentAmount,
        electricityAmount: invoice.electricityAmount ?? invoice.electricityCharges,
        waterCharges: invoice.waterCharges,
        maintenanceCharges: invoice.maintenanceCharges,
        otherCharges: invoice.otherCharges,
        discountAmount: invoice.discountAmount,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        status: computedStatus,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        paymentMethod: invoice.paymentMethod,
        paymentReceiptUrl: invoice.paymentReceiptUrl,
        transactionReference: invoice.transactionReference,
        property: invoice.property,
        createdAt: invoice.createdAt,
      };
    });

    return NextResponse.json(
      {
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
        },
        count: formattedInvoices.length,
        invoices: formattedInvoices,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/tenant/invoices] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while fetching tenant invoices.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
