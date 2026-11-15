import { NextResponse } from 'next/server';
import { getAuthenticatedOwner, isOwnerOfProperty } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const owner = await getAuthenticatedOwner();
    if (!owner) {
      return NextResponse.json({ success: false, error: 'Owner sign-in is required.' }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'A valid request body is required.' }, { status: 400 });
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'A valid request body is required.' }, { status: 400 });
    }

    const forceValue = (body as { force?: unknown }).force;
    if (forceValue !== undefined && typeof forceValue !== 'boolean') {
      return NextResponse.json({ success: false, error: 'The force option must be a boolean.' }, { status: 400 });
    }
    const force = forceValue === true;
    const { id } = await context.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { id: true, propertyId: true, status: true, bedId: true },
    });

    if (!tenant || !isOwnerOfProperty(owner, tenant.propertyId)) {
      return NextResponse.json({ success: false, error: 'Tenant record not found.' }, { status: 404 });
    }
    if (tenant.status === 'CHECKED_OUT') {
      return NextResponse.json({ success: false, error: 'This tenant has already checked out.' }, { status: 409 });
    }

    const invoices = await prisma.rentInvoice.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      select: { totalAmount: true, paidAmount: true },
    });
    const pendingDues = Number(
      invoices
        .reduce((total, invoice) => total + Math.max(0, Number(invoice.totalAmount) - Number(invoice.paidAmount)), 0)
        .toFixed(2)
    );

    if (pendingDues > 0 && !force) {
      return NextResponse.json({ success: false, requiresConfirmation: true, pendingDues }, { status: 409 });
    }

    const checkOutDate = new Date();
    await prisma.$transaction(async (tx) => {
      const updatedTenant = await tx.tenant.updateMany({
        where: {
          id: tenant.id,
          propertyId: tenant.propertyId,
          status: { not: 'CHECKED_OUT' },
          bedId: tenant.bedId,
        },
        data: { status: 'CHECKED_OUT', checkOutDate, bedId: null },
      });
      if (updatedTenant.count !== 1) {
        throw new Error('TENANT_ALREADY_VACATED_OR_CHANGED');
      }

      if (tenant.bedId) {
        await tx.bed.update({
          where: { id: tenant.bedId },
          data: { status: 'VACANT' },
        });
      }
    }, { maxWait: 10000, timeout: 20000 });

    return NextResponse.json({ success: true, message: 'Tenant vacated successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'TENANT_ALREADY_VACATED_OR_CHANGED') {
      return NextResponse.json({ success: false, error: 'Tenant status or bed assignment changed. Refresh and try again.' }, { status: 409 });
    }
    console.error('[PATCH /api/owner/tenants/[id]/vacate] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to vacate tenant.',
    }, { status: 500 });
  }
}
