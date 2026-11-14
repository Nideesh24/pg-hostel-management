import { NextResponse } from 'next/server';
import { getAuthenticatedTenant } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PaymentMethod } from '@prisma/client';

interface PayInvoiceBody {
  paymentReceiptUrl: string;
  paymentMode?: string;
  transactionReference?: string;
}

function resolvePaymentMethod(mode?: string): PaymentMethod {
  if (!mode) return 'ONLINE';
  const normalized = mode.trim().toUpperCase();
  switch (normalized) {
    case 'UPI':
      return 'UPI';
    case 'CASH':
      return 'CASH';
    case 'BANK_TRANSFER':
    case 'NEFT':
    case 'IMPS':
    case 'RTGS':
      return 'BANK_TRANSFER';
    case 'CARD':
    case 'DEBIT_CARD':
    case 'CREDIT_CARD':
      return 'CARD';
    default:
      return 'ONLINE';
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const user = await getAuthenticatedTenant();
    if (!user?.tenantProfile) {
      return NextResponse.json({ success: false, error: 'Approved tenant sign-in is required.' }, { status: 403 });
    }

    const { invoiceId } = await context.params;

    if (!invoiceId?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID is required in URL path.' },
        { status: 400 }
      );
    }

    const body: PayInvoiceBody = await request.json();
    const { paymentReceiptUrl, paymentMode, transactionReference } = body;

    if (!paymentReceiptUrl?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Field 'paymentReceiptUrl' is required as proof of payment.",
        },
        { status: 400 }
      );
    }

    // Verify invoice exists
    const invoice = await prisma.rentInvoice.findUnique({
      where: { id: invoiceId.trim() },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: `Rent invoice with ID '${invoiceId}' was not found.` },
        { status: 404 }
      );
    }
    if (invoice.tenantId !== user.tenantProfile.id) {
      return NextResponse.json({ success: false, error: 'You may only pay your own invoices.' }, { status: 403 });
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json(
        {
          success: false,
          error: `Invoice ${invoice.invoiceNumber} has already been paid on ${invoice.paidAt?.toISOString() || 'a previous date'}.`,
        },
        { status: 400 }
      );
    }

    const resolvedMethod = resolvePaymentMethod(paymentMode);

    // Update invoice record
    const updatedInvoice = await prisma.rentInvoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAmount: invoice.totalAmount, // Mark fully paid
        paidAt: new Date(),
        paymentMethod: resolvedMethod,
        paymentReceiptUrl: paymentReceiptUrl.trim(),
        transactionReference: transactionReference?.trim() || invoice.transactionReference,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
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

    return NextResponse.json(
      {
        success: true,
        message: `Invoice ${invoice.invoiceNumber} marked as PAID successfully.`,
        data: updatedInvoice,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PATCH /api/tenant/invoices/[invoiceId]/pay] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while processing invoice payment.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
